/**
 * IR Validation Module
 *
 * Validates TestIR before generation to catch issues early and log warnings
 * for unsupported features.
 */

import type {
  TestIR,
  TestSuite,
  TestCase,
  TestStep,
  TestExpectation,
  StepAction,
  ExpectType,
} from "../types/ir.js";

/**
 * Validation issue severity
 */
export type IssueSeverity = "error" | "warning" | "info";

/**
 * Validation issue
 */
export interface ValidationIssue {
  severity: IssueSeverity;
  message: string;
  context?: string;
}

/**
 * Result of IR validation
 */
export interface IRValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
  errorCount: number;
  warningCount: number;
}

/**
 * Supported step actions for generation
 */
const SUPPORTED_STEP_ACTIONS: readonly StepAction[] = [
  "click",
  "type",
  "change",
  "focus",
  "blur",
  "key",
  "select",
  "hover",
  "clear",
  "waitFor",
  "submitContext",
  "custom",
];

/**
 * Supported expectation types for generation
 */
const SUPPORTED_EXPECT_TYPES: readonly ExpectType[] = [
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
 * Validates a single TestStep
 */
function validateStep(step: TestStep, context: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!step.id) {
    issues.push({
      severity: "error",
      message: "Step is missing an ID",
      context,
    });
  }

  if (!step.selector) {
    issues.push({
      severity: "error",
      message: `Step "${step.id}" is missing a selector`,
      context,
    });
  }

  if (!SUPPORTED_STEP_ACTIONS.includes(step.action)) {
    issues.push({
      severity: "warning",
      message: `Step "${step.id}" has unsupported action "${step.action}". Will be treated as custom.`,
      context,
    });
  }

  // Validate that actions requiring a value have one
  const actionsRequiringValue: StepAction[] = ["type", "change", "key", "select"];
  if (actionsRequiringValue.includes(step.action) && step.value === undefined) {
    issues.push({
      severity: "warning",
      message: `Step "${step.id}" with action "${step.action}" is missing a value`,
      context,
    });
  }

  return issues;
}

/**
 * Validates a single TestExpectation
 */
function validateExpectation(expectation: TestExpectation, context: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!expectation.id) {
    issues.push({
      severity: "error",
      message: "Expectation is missing an ID",
      context,
    });
  }

  if (!SUPPORTED_EXPECT_TYPES.includes(expectation.type)) {
    issues.push({
      severity: "warning",
      message: `Expectation "${expectation.id}" has unsupported type "${expectation.type}". Will be treated as custom.`,
      context,
    });
  }

  // Validate that expectations requiring a selector have one (except URL assertions)
  const selectorlessTypes: ExpectType[] = ["url-contains", "url-exact"];
  if (!selectorlessTypes.includes(expectation.type) && !expectation.selector) {
    issues.push({
      severity: "warning",
      message: `Expectation "${expectation.id}" of type "${expectation.type}" is missing a selector`,
      context,
    });
  }

  // Validate that expectations requiring a value have one
  const valuesRequiringTypes: ExpectType[] = [
    "text",
    "exact-text",
    "value",
    "has-class",
    "not-has-class",
    "aria",
    "url-contains",
    "url-exact",
  ];
  if (valuesRequiringTypes.includes(expectation.type) && expectation.value === undefined) {
    issues.push({
      severity: "warning",
      message: `Expectation "${expectation.id}" of type "${expectation.type}" is missing a value`,
      context,
    });
  }

  return issues;
}

/**
 * Validates a single TestCase
 */
function validateTestCase(testCase: TestCase, context: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const caseContext = `${context} > case "${testCase.id}"`;

  if (!testCase.id) {
    issues.push({
      severity: "error",
      message: "TestCase is missing an ID",
      context,
    });
  }

  if (!testCase.context) {
    issues.push({
      severity: "error",
      message: `TestCase "${testCase.id}" is missing a context`,
      context: caseContext,
    });
  }

  if (!testCase.scenario) {
    issues.push({
      severity: "warning",
      message: `TestCase "${testCase.id}" is missing a scenario name, using default`,
      context: caseContext,
    });
  }

  if (testCase.steps.length === 0 && testCase.expectations.length === 0) {
    issues.push({
      severity: "info",
      message: `TestCase "${testCase.id}" has no steps or expectations`,
      context: caseContext,
    });
  }

  // Validate steps
  for (const step of testCase.steps) {
    issues.push(...validateStep(step, caseContext));
  }

  // Validate expectations
  for (const expectation of testCase.expectations) {
    issues.push(...validateExpectation(expectation, caseContext));
  }

  return issues;
}

/**
 * Validates a single TestSuite
 */
function validateTestSuite(suite: TestSuite): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const context = `suite "${suite.id}"`;

  if (!suite.id) {
    issues.push({
      severity: "error",
      message: "TestSuite is missing an ID",
      context: "root",
    });
  }

  if (!suite.context) {
    issues.push({
      severity: "error",
      message: `TestSuite "${suite.id}" is missing a context`,
      context,
    });
  }

  if (suite.cases.length === 0) {
    issues.push({
      severity: "warning",
      message: `TestSuite "${suite.id}" has no test cases`,
      context,
    });
  }

  // Validate cases
  for (const testCase of suite.cases) {
    issues.push(...validateTestCase(testCase, context));
  }

  return issues;
}

/**
 * Validates a complete TestIR
 */
export function validateIR(ir: TestIR): IRValidationResult {
  const issues: ValidationIssue[] = [];

  // Validate version
  if (ir.version !== 1) {
    issues.push({
      severity: "warning",
      message: `IR version ${ir.version} may not be fully supported`,
      context: "root",
    });
  }

  // Validate suites
  if (ir.suites.length === 0) {
    issues.push({
      severity: "info",
      message: "IR contains no test suites",
      context: "root",
    });
  }

  for (const suite of ir.suites) {
    issues.push(...validateTestSuite(suite));
  }

  const errorCount = issues.filter((i) => i.severity === "error").length;
  const warningCount = issues.filter((i) => i.severity === "warning").length;

  return {
    valid: errorCount === 0,
    issues,
    errorCount,
    warningCount,
  };
}

/**
 * Logs validation issues to console
 */
export function logValidationIssues(result: IRValidationResult): void {
  for (const issue of result.issues) {
    const prefix = issue.severity === "error" ? "[ERROR]" :
                   issue.severity === "warning" ? "[WARN]" : "[INFO]";
    const contextStr = issue.context ? ` (${issue.context})` : "";
    console.log(`${prefix} ${issue.message}${contextStr}`);
  }

  if (result.errorCount > 0) {
    console.log(`\nValidation failed with ${result.errorCount} error(s) and ${result.warningCount} warning(s)`);
  } else if (result.warningCount > 0) {
    console.log(`\nValidation passed with ${result.warningCount} warning(s)`);
  }
}
