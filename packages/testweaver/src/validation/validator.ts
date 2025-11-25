/**
 * TestWeaver Validation Module
 *
 * Provides validation logic for DSL usage and IR.
 * Scans files for errors, invalid actions, missing IDs, and duplicate IDs.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { parse as babelParse } from "@babel/parser";
import traverse from "@babel/traverse";
import type { JSXAttribute, JSXOpeningElement } from "@babel/types";
import type { ExpectType } from "../types/ir.js";

/**
 * Severity levels for validation messages
 */
export type ValidationSeverity = "error" | "warning" | "info";

/**
 * A single validation message
 */
export interface ValidationMessage {
  /** Severity of the message */
  severity: ValidationSeverity;
  /** File path where the issue was found */
  filePath: string;
  /** Line number (1-indexed) */
  line: number;
  /** Column number (1-indexed) */
  column: number;
  /** Human-readable message */
  message: string;
  /** Rule ID for the validation */
  ruleId: string;
}

/**
 * Result of validation
 */
export interface ValidationResult {
  /** All validation messages */
  messages: ValidationMessage[];
  /** Count of errors */
  errorCount: number;
  /** Count of warnings */
  warningCount: number;
  /** Count of info messages */
  infoCount: number;
  /** Whether validation passed (no errors) */
  valid: boolean;
}

/**
 * Options for validation
 */
export interface ValidationOptions {
  /** Treat warnings as errors */
  strict?: boolean | undefined;
  /** Enforce unique test IDs per context */
  enforceUniqueTestIdsPerContext?: boolean | undefined;
}

/**
 * DSL attribute names
 */
const DSL_ATTRS = {
  CONTEXT: "data-test-context",
  SCENARIO: "data-test-scenario",
  ROUTE: "data-test-route",
  ID: "data-test-id",
  STEP: "data-test-step",
  EXPECT: "data-test-expect",
} as const;

/**
 * Valid step actions (lowercase for comparison)
 */
const VALID_STEP_ACTIONS: readonly string[] = [
  "click",
  "type",
  "change",
  "focus",
  "blur",
  "key",
  "custom",
  "waitfor",
  "submitcontext",
];

/**
 * Valid expectation types
 */
const VALID_EXPECT_TYPES: readonly ExpectType[] = [
  "visible",
  "not-visible",
  "exists",
  "not-exists",
  "text",
  "exact-text",
  "value",
  "has-class",
  "not-has-class",
  "aria",
  "url-contains",
  "url-exact",
  "snapshot",
  "custom",
];

/**
 * Gets the string value from a JSX attribute
 */
function getJsxAttributeValue(attr: JSXAttribute): string | undefined {
  if (attr.value === null) {
    return undefined;
  }
  if (attr.value?.type === "StringLiteral") {
    return attr.value.value;
  }
  if (
    attr.value?.type === "JSXExpressionContainer" &&
    attr.value.expression.type === "StringLiteral"
  ) {
    return attr.value.expression.value;
  }
  return undefined;
}

/**
 * Extracts JSX attribute value by name from an opening element
 */
function extractAttribute(
  openingElement: JSXOpeningElement,
  attrName: string
): { value: string; line: number; column: number } | undefined {
  for (const attr of openingElement.attributes) {
    if (
      attr.type === "JSXAttribute" &&
      attr.name.type === "JSXIdentifier" &&
      attr.name.name === attrName
    ) {
      const value = getJsxAttributeValue(attr);
      if (value !== undefined) {
        return {
          value,
          line: attr.loc?.start.line ?? 0,
          column: attr.loc?.start.column ?? 0,
        };
      }
    }
  }
  return undefined;
}

/**
 * Validates a step DSL string and returns any errors
 */
function validateStepDsl(dsl: string): { valid: boolean; invalidAction?: string } {
  const parts = dsl.split(";").map((s) => s.trim()).filter(Boolean);

  for (const part of parts) {
    const colonIndex = part.indexOf(":");
    const action = colonIndex === -1
      ? part.toLowerCase()
      : part.substring(0, colonIndex).trim().toLowerCase();

    if (!VALID_STEP_ACTIONS.includes(action)) {
      return { valid: false, invalidAction: action };
    }
  }

  return { valid: true };
}

/**
 * Validates an expectation DSL string and returns any errors
 */
function validateExpectDsl(dsl: string): { valid: boolean; invalidType?: string } {
  const parts = dsl.split(";").map((s) => s.trim()).filter(Boolean);

  for (const part of parts) {
    const colonIndex = part.indexOf(":");
    const rawType = colonIndex === -1
      ? part.toLowerCase()
      : part.substring(0, colonIndex).trim().toLowerCase();

    // Normalize the type
    const normalized = rawType.replace(/_/g, "-");

    // Check if it's a valid type or a common alias
    const aliases: Record<string, string> = {
      notvisible: "not-visible",
      notexists: "not-exists",
      exacttext: "exact-text",
      hasclass: "has-class",
      nothasclass: "not-has-class",
      urlcontains: "url-contains",
      urlexact: "url-exact",
    };

    const normalizedNoHyphens = normalized.replace(/-/g, "");
    const isValid =
      VALID_EXPECT_TYPES.includes(normalized as ExpectType) ||
      aliases[normalizedNoHyphens] !== undefined;

    if (!isValid) {
      return { valid: false, invalidType: rawType };
    }
  }

  return { valid: true };
}

/**
 * Context info during validation
 */
interface ContextInfo {
  context: string;
  scenario: string;
  testIds: Map<string, { line: number; column: number }>;
}

/**
 * Validates a single file for DSL issues
 *
 * @param filePath - Path to the file to validate
 * @param options - Validation options
 * @returns Array of validation messages
 */
export function validateFile(
  filePath: string,
  options: ValidationOptions = {}
): ValidationMessage[] {
  const messages: ValidationMessage[] = [];
  const { enforceUniqueTestIdsPerContext = true } = options;

  // Read the file content
  let code: string;
  try {
    code = fs.readFileSync(filePath, "utf-8");
  } catch (error) {
    messages.push({
      severity: "error",
      filePath,
      line: 0,
      column: 0,
      message: `Failed to read file: ${String(error)}`,
      ruleId: "file-read-error",
    });
    return messages;
  }

  // Parse the file with Babel
  let ast: ReturnType<typeof babelParse>;
  try {
    ast = babelParse(code, {
      sourceType: "module",
      plugins: ["jsx", "typescript"],
      errorRecovery: true,
    });
  } catch (error) {
    messages.push({
      severity: "error",
      filePath,
      line: 0,
      column: 0,
      message: `Failed to parse file: ${String(error)}`,
      ruleId: "parse-error",
    });
    return messages;
  }

  // Track contexts for duplicate ID checking
  const contexts: ContextInfo[] = [];

  // Traverse the AST
  traverse(ast, {
    JSXOpeningElement(jsxPath) {
      const node = jsxPath.node;
      
      // Check for context definition
      const contextAttr = extractAttribute(node, DSL_ATTRS.CONTEXT);
      if (contextAttr !== undefined) {
        const scenarioAttr = extractAttribute(node, DSL_ATTRS.SCENARIO);
        contexts.push({
          context: contextAttr.value,
          scenario: scenarioAttr?.value ?? "default",
          testIds: new Map(),
        });
      }

      // Check for test ID
      const testIdAttr = extractAttribute(node, DSL_ATTRS.ID);
      if (testIdAttr !== undefined && contexts.length > 0 && enforceUniqueTestIdsPerContext) {
        // Safe to use non-null assertion since we already checked contexts.length > 0
        const currentContext = contexts[contexts.length - 1]!;
        const existing = currentContext.testIds.get(testIdAttr.value);
        if (existing !== undefined) {
          messages.push({
            severity: "warning",
            filePath,
            line: testIdAttr.line,
            column: testIdAttr.column,
            message: `Duplicate data-test-id "${testIdAttr.value}" in context "${currentContext.context}" scenario "${currentContext.scenario}". First defined at line ${existing.line}.`,
            ruleId: "duplicate-test-id",
          });
        } else {
          currentContext.testIds.set(testIdAttr.value, {
            line: testIdAttr.line,
            column: testIdAttr.column,
          });
        }
      }

      // Validate step DSL
      const stepAttr = extractAttribute(node, DSL_ATTRS.STEP);
      if (stepAttr !== undefined) {
        const result = validateStepDsl(stepAttr.value);
        if (!result.valid) {
          messages.push({
            severity: "error",
            filePath,
            line: stepAttr.line,
            column: stepAttr.column,
            message: `Invalid action "${result.invalidAction ?? "unknown"}". Supported: ${VALID_STEP_ACTIONS.join(", ")}`,
            ruleId: "invalid-action",
          });
        }

        // Check for step without test ID
        if (testIdAttr === undefined) {
          messages.push({
            severity: "warning",
            filePath,
            line: stepAttr.line,
            column: stepAttr.column,
            message: `Step is missing data-test-id. Steps require a selector to target elements.`,
            ruleId: "step-missing-id",
          });
        }
      }

      // Validate expect DSL
      const expectAttr = extractAttribute(node, DSL_ATTRS.EXPECT);
      if (expectAttr !== undefined) {
        const result = validateExpectDsl(expectAttr.value);
        if (!result.valid) {
          messages.push({
            severity: "error",
            filePath,
            line: expectAttr.line,
            column: expectAttr.column,
            message: `Invalid expectation type "${result.invalidType ?? "unknown"}". Supported: ${VALID_EXPECT_TYPES.join(", ")}`,
            ruleId: "invalid-expectation",
          });
        }
      }
    },
  });

  return messages;
}

/**
 * Validates multiple files
 *
 * @param filePaths - Array of file paths to validate
 * @param options - Validation options
 * @returns Aggregated validation result
 */
export function validateFiles(
  filePaths: string[],
  options: ValidationOptions = {}
): ValidationResult {
  const allMessages: ValidationMessage[] = [];

  for (const filePath of filePaths) {
    const messages = validateFile(filePath, options);
    allMessages.push(...messages);
  }

  const errorCount = allMessages.filter((m) => m.severity === "error").length;
  const warningCount = allMessages.filter((m) => m.severity === "warning").length;
  const infoCount = allMessages.filter((m) => m.severity === "info").length;

  // In strict mode, warnings count as errors
  const effectiveErrorCount = options.strict
    ? errorCount + warningCount
    : errorCount;

  return {
    messages: allMessages,
    errorCount,
    warningCount,
    infoCount,
    valid: effectiveErrorCount === 0,
  };
}

/**
 * Formats validation messages for console output
 *
 * @param result - Validation result to format
 * @returns Formatted string for console output
 */
export function formatValidationResult(result: ValidationResult): string {
  const lines: string[] = [];

  // Sort messages by file, then line
  const sortedMessages = [...result.messages].sort((a, b) => {
    if (a.filePath !== b.filePath) {
      return a.filePath.localeCompare(b.filePath);
    }
    return a.line - b.line;
  });

  for (const message of sortedMessages) {
    const severity = message.severity.toUpperCase().padEnd(5);
    const relativePath = path.relative(process.cwd(), message.filePath);
    lines.push(
      `[${severity}] ${relativePath}:${message.line}: ${message.message}`
    );
  }

  // Add summary
  lines.push("");
  lines.push(
    `Validation complete: ${result.errorCount} error(s), ${result.warningCount} warning(s), ${result.infoCount} info message(s)`
  );

  return lines.join("\n");
}
