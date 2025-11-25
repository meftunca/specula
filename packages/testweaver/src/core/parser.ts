/**
 * TestWeaver Parser
 *
 * Parses React (Vite) source code to extract DSL attributes (data-test-*)
 * and convert them into structured IR objects.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { parse as babelParse } from "@babel/parser";
import traverse from "@babel/traverse";
import type { JSXAttribute, JSXOpeningElement, Node } from "@babel/types";
import type {
  TestSuite,
  TestCase,
  TestStep,
  TestExpectation,
  Selector,
  LocationRef,
  StepAction,
  ExpectType,
  SourceRef,
} from "../types/ir.js";

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
 * Parsed step from DSL
 */
interface ParsedStep {
  action: StepAction;
  value?: string;
}

/**
 * Parsed expectation from DSL
 */
interface ParsedExpectation {
  type: ExpectType;
  value?: string;
}

/**
 * Context element data extracted from JSX
 */
interface ContextElementData {
  context: string;
  scenario?: string;
  route?: string;
  location: LocationRef;
  children: ChildElementData[];
}

/**
 * Child element data with DSL attributes
 */
interface ChildElementData {
  testId?: string;
  steps: ParsedStep[];
  expectations: ParsedExpectation[];
  location: LocationRef;
}

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
): string | undefined {
  for (const attr of openingElement.attributes) {
    if (
      attr.type === "JSXAttribute" &&
      attr.name.type === "JSXIdentifier" &&
      attr.name.name === attrName
    ) {
      return getJsxAttributeValue(attr);
    }
  }
  return undefined;
}

/**
 * Creates a LocationRef from a Babel node
 */
function createLocationRef(
  filePath: string,
  node: Node,
  raw?: string
): LocationRef {
  const locationRef: LocationRef = {
    filePath,
    line: node.loc?.start.line ?? 0,
    column: node.loc?.start.column ?? 0,
    via: "attribute",
  };
  if (raw !== undefined) {
    locationRef.raw = raw;
  }
  return locationRef;
}

/**
 * Parses a step DSL string into structured step objects
 * Examples:
 *   "type:user@example.com" → { action: 'type', value: 'user@example.com' }
 *   "click" → { action: 'click' }
 *   "type:test; click" → [{ action: 'type', value: 'test' }, { action: 'click' }]
 */
function parseStepDsl(dsl: string): ParsedStep[] {
  const steps: ParsedStep[] = [];
  const parts = dsl.split(";").map((s) => s.trim()).filter(Boolean);

  for (const part of parts) {
    const colonIndex = part.indexOf(":");
    if (colonIndex === -1) {
      // Simple action without value
      const action = part.toLowerCase();
      if (isValidStepAction(action)) {
        steps.push({ action });
      } else {
        // Unknown action, treat as custom
        steps.push({ action: "custom", value: part });
      }
    } else {
      // Action with value
      const action = part.substring(0, colonIndex).trim().toLowerCase();
      const value = part.substring(colonIndex + 1).trim();
      if (isValidStepAction(action)) {
        steps.push({ action, value });
      } else {
        // Unknown action, treat as custom
        steps.push({ action: "custom", value: part });
      }
    }
  }

  return steps;
}

/**
 * Checks if a string is a valid step action
 */
function isValidStepAction(action: string): action is StepAction {
  const validActions: StepAction[] = [
    "click",
    "type",
    "change",
    "focus",
    "blur",
    "key",
    "custom",
    "waitFor",
    "submitContext",
  ];
  return validActions.includes(action as StepAction);
}

/**
 * Parses an expectation DSL string into structured expectation objects
 * Examples:
 *   "visible" → { type: 'visible' }
 *   "text:Welcome" → { type: 'text', value: 'Welcome' }
 *   "visible; text:Welcome" → [{ type: 'visible' }, { type: 'text', value: 'Welcome' }]
 */
function parseExpectDsl(dsl: string): ParsedExpectation[] {
  const expectations: ParsedExpectation[] = [];
  const parts = dsl.split(";").map((s) => s.trim()).filter(Boolean);

  for (const part of parts) {
    const colonIndex = part.indexOf(":");
    if (colonIndex === -1) {
      // Simple expectation without value
      const type = normalizeExpectType(part);
      if (type !== null) {
        expectations.push({ type });
      }
    } else {
      // Expectation with value
      const rawType = part.substring(0, colonIndex).trim();
      const value = part.substring(colonIndex + 1).trim();
      const type = normalizeExpectType(rawType);
      if (type !== null) {
        expectations.push({ type, value });
      }
    }
  }

  return expectations;
}

/**
 * Normalizes an expectation type string to an ExpectType
 */
function normalizeExpectType(type: string): ExpectType | null {
  const normalized = type.toLowerCase().replace(/_/g, "-");
  const validTypes: ExpectType[] = [
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
  
  if (validTypes.includes(normalized as ExpectType)) {
    return normalized as ExpectType;
  }
  
  // Handle common aliases
  const aliases: Record<string, ExpectType> = {
    "notvisible": "not-visible",
    "notexists": "not-exists",
    "exacttext": "exact-text",
    "hasclass": "has-class",
    "nothasclass": "not-has-class",
    "urlcontains": "url-contains",
    "urlexact": "url-exact",
  };
  
  return aliases[normalized.replace(/-/g, "")] ?? null;
}

/**
 * Creates a Selector from a data-test-id value
 */
function createSelector(testId: string): Selector {
  return {
    type: "testId",
    value: testId,
  };
}

/**
 * Generates a stable ID for a test case
 */
function generateCaseId(context: string, scenario: string): string {
  return `${context}__${scenario}`;
}

/**
 * Generates a stable ID for a step
 */
function generateStepId(index: number): string {
  return `step-${index + 1}`;
}

/**
 * Generates a stable ID for an expectation
 */
function generateExpectId(index: number): string {
  return `exp-${index + 1}`;
}

/**
 * Determines the language from a file path
 */
function getLanguageFromPath(filePath: string): SourceRef["language"] {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case ".tsx":
      return "tsx";
    case ".jsx":
      return "jsx";
    case ".ts":
      return "ts";
    case ".js":
      return "js";
    case ".vue":
      return "vue";
    case ".svelte":
      return "svelte";
    case ".html":
      return "html";
    default:
      return "tsx"; // Default to tsx for React
  }
}

/**
 * Scans a file and extracts TestSuites from DSL attributes
 *
 * @param filePath - Path to the source file to scan
 * @returns Array of TestSuites extracted from the file
 */
export function scanFile(filePath: string): TestSuite[] {
  // Read the file content
  const code = fs.readFileSync(filePath, "utf-8");

  // Parse the file with Babel
  const ast = babelParse(code, {
    sourceType: "module",
    plugins: ["jsx", "typescript"],
    errorRecovery: true,
  });

  // Collect context elements
  const contextElements: ContextElementData[] = [];

  // First pass: find all context elements
  traverse(ast, {
    JSXOpeningElement(jsxPath) {
      const context = extractAttribute(jsxPath.node, DSL_ATTRS.CONTEXT);
      if (context === undefined) {
        return;
      }

      const scenario = extractAttribute(jsxPath.node, DSL_ATTRS.SCENARIO);
      const route = extractAttribute(jsxPath.node, DSL_ATTRS.ROUTE);

      const contextData: ContextElementData = {
        context,
        location: createLocationRef(filePath, jsxPath.node, `context=${context}`),
        children: [],
      };
      if (scenario !== undefined) {
        contextData.scenario = scenario;
      }
      if (route !== undefined) {
        contextData.route = route;
      }

      // Get the parent JSXElement to traverse its children
      const parentPath = jsxPath.parentPath;
      if (parentPath?.type === "JSXElement") {
        // Traverse children looking for DSL attributes
        parentPath.traverse({
          JSXOpeningElement(childPath) {
            // Skip the context element itself
            if (childPath.node === jsxPath.node) {
              return;
            }

            const testId = extractAttribute(childPath.node, DSL_ATTRS.ID);
            const stepDsl = extractAttribute(childPath.node, DSL_ATTRS.STEP);
            const expectDsl = extractAttribute(childPath.node, DSL_ATTRS.EXPECT);

            // Only collect if there's at least one DSL attribute
            if (testId !== undefined || stepDsl !== undefined || expectDsl !== undefined) {
              const childData: ChildElementData = {
                steps: stepDsl !== undefined ? parseStepDsl(stepDsl) : [],
                expectations: expectDsl !== undefined ? parseExpectDsl(expectDsl) : [],
                location: createLocationRef(
                  filePath,
                  childPath.node,
                  testId ?? stepDsl ?? expectDsl
                ),
              };
              if (testId !== undefined) {
                childData.testId = testId;
              }
              contextData.children.push(childData);
            }
          },
        });
      }

      contextElements.push(contextData);
    },
  });

  // Build TestSuites from collected data
  const suites: TestSuite[] = [];
  const suiteMap = new Map<string, TestSuite>();

  for (const contextData of contextElements) {
    const { context, scenario, route, location, children } = contextData;

    // Get or create the suite for this context
    let suite = suiteMap.get(context);
    if (suite === undefined) {
      suite = {
        id: context,
        context,
        sourceFiles: [
          {
            filePath,
            framework: "react",
            language: getLanguageFromPath(filePath),
          },
        ],
        cases: [],
      };
      suiteMap.set(context, suite);
      suites.push(suite);
    }

    // Build the test case
    const scenarioName = scenario ?? "default";
    const testCase: TestCase = {
      id: generateCaseId(context, scenarioName),
      context,
      scenario: scenarioName,
      type: route !== undefined ? "e2e" : "ui",
      definedAt: [location],
      steps: [],
      expectations: [],
    };
    if (route !== undefined) {
      testCase.route = route;
    }

    // Process children to build steps and expectations
    let stepIndex = 0;
    let expectIndex = 0;

    for (const child of children) {
      const { testId, steps, expectations, location: childLocation } = child;

      // Build steps
      for (const parsedStep of steps) {
        if (testId === undefined) {
          // Skip steps without a test ID (no selector)
          continue;
        }

        const step: TestStep = {
          id: generateStepId(stepIndex),
          action: parsedStep.action,
          selector: createSelector(testId),
          source: childLocation,
        };

        if (parsedStep.value !== undefined) {
          step.value = parsedStep.value;
        }

        testCase.steps.push(step);
        stepIndex++;
      }

      // Build expectations
      for (const parsedExpect of expectations) {
        const expectation: TestExpectation = {
          id: generateExpectId(expectIndex),
          type: parsedExpect.type,
          source: childLocation,
        };

        if (testId !== undefined) {
          expectation.selector = createSelector(testId);
        }

        if (parsedExpect.value !== undefined) {
          expectation.value = parsedExpect.value;
        }

        testCase.expectations.push(expectation);
        expectIndex++;
      }
    }

    suite.cases.push(testCase);
  }

  return suites;
}
