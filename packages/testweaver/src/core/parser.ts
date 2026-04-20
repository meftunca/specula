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
import type {
  JSXAttribute,
  JSXElement,
  JSXFragment,
  JSXOpeningElement,
  JSXSpreadChild,
  Node,
} from "@babel/types";
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
  STATE: "data-test-state",
  ROUTE: "data-test-route",
  ID: "data-test-id",
  STEP: "data-test-step",
  EXPECT: "data-test-expect",
  /** Extended selector attributes */
  ROLE: "data-test-role",
  LABEL: "data-test-label",
  PLACEHOLDER: "data-test-placeholder",
} as const;

/**
 * Parsed step from DSL
 */
interface ParsedStep {
  action: StepAction;
  value?: string;
}

/**
 * Lowercase aliases for supported step actions
 */
const STEP_ACTION_ALIASES: Record<string, StepAction> = {
  click: "click",
  type: "type",
  change: "change",
  focus: "focus",
  blur: "blur",
  key: "key",
  select: "select",
  hover: "hover",
  clear: "clear",
  custom: "custom",
  waitfor: "waitFor",
  submitcontext: "submitContext",
};

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
  state?: string;
  route?: string;
  componentName?: string;
  location: LocationRef;
  children: ChildElementData[];
}

/**
 * Child element data with DSL attributes
 */
interface ChildElementData {
  testId?: string;
  role?: string;
  label?: string;
  placeholder?: string;
  steps: ParsedStep[];
  expectations: ParsedExpectation[];
  location: LocationRef;
}

type TraversableJsxChild = JSXElement | JSXFragment | JSXSpreadChild;

/**
 * Checks whether a name looks like a React component export.
 */
function isComponentName(name: string): boolean {
  return /^[A-Z][a-zA-Z0-9]*$/.test(name);
}

/**
 * Attempts to infer the owning React component name for a JSX context node.
 */
function inferComponentName(
  jsxPath: {
    findParent: (predicate: (parentPath: { node: Node; isFunctionDeclaration: () => boolean; isVariableDeclarator: () => boolean; }) => boolean) => { node: Node } | null;
  }
): string | undefined {
  const componentPath = jsxPath.findParent((parentPath) => {
    const node = parentPath.node;

    if (parentPath.isFunctionDeclaration()) {
      return node.type === "FunctionDeclaration" && node.id != null && isComponentName(node.id.name);
    }

    if (parentPath.isVariableDeclarator()) {
      return (
        node.type === "VariableDeclarator" &&
        node.id.type === "Identifier" &&
        isComponentName(node.id.name)
      );
    }

    return false;
  });

  if (componentPath === null) {
    return undefined;
  }

  const { node } = componentPath;
  if (node.type === "FunctionDeclaration") {
    return node.id?.name;
  }

  if (node.type === "VariableDeclarator" && node.id.type === "Identifier") {
    return node.id.name;
  }

  return undefined;
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
      const action = normalizeStepAction(part);
      if (action !== null) {
        steps.push({ action });
      } else {
        // Unknown action, treat as custom
        steps.push({ action: "custom", value: part });
      }
    } else {
      // Action with value
      const action = normalizeStepAction(part.substring(0, colonIndex).trim());
      const value = part.substring(colonIndex + 1).trim();
      if (action !== null) {
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
 * Normalizes a step action string to a valid StepAction
 */
function normalizeStepAction(action: string): StepAction | null {
  const normalized = action.toLowerCase().replace(/[_-]/g, "");
  return STEP_ACTION_ALIASES[normalized] ?? null;
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
 * Selector attributes extracted from a JSX element
 */
interface SelectorAttrs {
  testId?: string | undefined;
  role?: string | undefined;
  label?: string | undefined;
  placeholder?: string | undefined;
}

/**
 * Creates a Selector from available attributes, preferring testId, then role, then label, then placeholder
 */
function createSelectorFromAttrs(attrs: SelectorAttrs): Selector | undefined {
  if (attrs.testId !== undefined) {
    return {
      type: "testId",
      value: attrs.testId,
    };
  }
  if (attrs.role !== undefined) {
    return {
      type: "role",
      value: attrs.role,
    };
  }
  if (attrs.label !== undefined) {
    return {
      type: "labelText",
      value: attrs.label,
    };
  }
  if (attrs.placeholder !== undefined) {
    return {
      type: "placeholder",
      value: attrs.placeholder,
    };
  }
  return undefined;
}

/**
 * Collects DSL-bearing descendant elements for a context, excluding nested contexts.
 */
function collectContextChildren(
  filePath: string,
  rootElement: JSXElement | JSXFragment
): ChildElementData[] {
  const collected: ChildElementData[] = [];

  const visitEmbeddedJsx = (value: unknown): void => {
    if (value === null || value === undefined) {
      return;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        visitEmbeddedJsx(item);
      }
      return;
    }

    if (typeof value !== "object") {
      return;
    }

    const candidate = value as { type?: string };
    if (candidate.type === "JSXElement" || candidate.type === "JSXFragment" || candidate.type === "JSXSpreadChild") {
      visitNode(candidate as TraversableJsxChild);
      return;
    }

    for (const nestedValue of Object.values(value)) {
      visitEmbeddedJsx(nestedValue);
    }
  };

  const visitNode = (node: TraversableJsxChild): void => {
    if (node.type === "JSXSpreadChild") {
      return;
    }

    if (node.type === "JSXFragment") {
      for (const child of node.children) {
        visitEmbeddedJsx(child);
      }
      return;
    }

    const openingElement = node.openingElement;

    if (extractAttribute(openingElement, DSL_ATTRS.CONTEXT) !== undefined) {
      return;
    }

    const testId = extractAttribute(openingElement, DSL_ATTRS.ID);
    const roleAttr = extractAttribute(openingElement, DSL_ATTRS.ROLE);
    const labelAttr = extractAttribute(openingElement, DSL_ATTRS.LABEL);
    const placeholderAttr = extractAttribute(openingElement, DSL_ATTRS.PLACEHOLDER);
    const stepDsl = extractAttribute(openingElement, DSL_ATTRS.STEP);
    const expectDsl = extractAttribute(openingElement, DSL_ATTRS.EXPECT);

    const hasSelector =
      testId !== undefined ||
      roleAttr !== undefined ||
      labelAttr !== undefined ||
      placeholderAttr !== undefined;

    if (hasSelector || stepDsl !== undefined || expectDsl !== undefined) {
      const childData: ChildElementData = {
        steps: stepDsl !== undefined ? parseStepDsl(stepDsl) : [],
        expectations: expectDsl !== undefined ? parseExpectDsl(expectDsl) : [],
        location: createLocationRef(
          filePath,
          openingElement,
          testId ?? roleAttr ?? labelAttr ?? placeholderAttr ?? stepDsl ?? expectDsl
        ),
      };

      if (testId !== undefined) {
        childData.testId = testId;
      }
      if (roleAttr !== undefined) {
        childData.role = roleAttr;
      }
      if (labelAttr !== undefined) {
        childData.label = labelAttr;
      }
      if (placeholderAttr !== undefined) {
        childData.placeholder = placeholderAttr;
      }

      collected.push(childData);
    }

    for (const child of node.children) {
      visitEmbeddedJsx(child);
    }
  };

  if (rootElement.type === "JSXFragment") {
    for (const child of rootElement.children) {
      visitEmbeddedJsx(child);
    }
    return collected;
  }

  for (const child of rootElement.children) {
    visitEmbeddedJsx(child);
  }

  return collected;
}

/**
 * Generates a stable ID for a test case
 */
function generateCaseId(context: string, scenario: string, state?: string): string {
  return state !== undefined && state.length > 0
    ? `${context}__${scenario}__${state}`
    : `${context}__${scenario}`;
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
      const state = extractAttribute(jsxPath.node, DSL_ATTRS.STATE);
      const route = extractAttribute(jsxPath.node, DSL_ATTRS.ROUTE);

      const contextData: ContextElementData = {
        context,
        location: createLocationRef(filePath, jsxPath.node, `context=${context}`),
        children: [],
      };
      const componentName = inferComponentName(jsxPath);
      if (componentName !== undefined) {
        contextData.componentName = componentName;
      }
      if (scenario !== undefined) {
        contextData.scenario = scenario;
      }
      if (state !== undefined) {
        contextData.state = state;
      }
      if (route !== undefined) {
        contextData.route = route;
      }

      const parentNode = jsxPath.parent;
      if (parentNode?.type === "JSXElement") {
        contextData.children = collectContextChildren(filePath, parentNode);
      }

      contextElements.push(contextData);
    },
  });

  // Build TestSuites from collected data
  const suites: TestSuite[] = [];
  const suiteMap = new Map<string, TestSuite>();

  for (const contextData of contextElements) {
    const { context, scenario, state, route, componentName, location, children } = contextData;

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
      id: generateCaseId(context, scenarioName, state),
      context,
      scenario: scenarioName,
      ...(state !== undefined ? { state } : {}),
      type: route !== undefined ? "e2e" : "ui",
      definedAt: [location],
      steps: [],
      expectations: [],
    };
    if (componentName !== undefined) {
      testCase.meta = {
        componentName,
        importPath: filePath,
      };
    }
    if (route !== undefined) {
      testCase.route = route;
    }

    // Process children to build steps and expectations
    let stepIndex = 0;
    let expectIndex = 0;

    for (const child of children) {
      const { testId, role, label, placeholder, steps, expectations, location: childLocation } = child;
      const selectorAttrs: SelectorAttrs = { testId, role, label, placeholder };
      const selector = createSelectorFromAttrs(selectorAttrs);

      // Build steps
      for (const parsedStep of steps) {
        if (selector === undefined) {
          // Warn about steps without a selector
          console.warn(
            `[TestWeaver] Warning: Step "${parsedStep.action}" at ${childLocation.filePath}:${childLocation.line} ` +
            `is missing a selector (data-test-id, data-test-role, data-test-label, or data-test-placeholder). Steps require a selector to target elements.`
          );
          continue;
        }

        const step: TestStep = {
          id: generateStepId(stepIndex),
          action: parsedStep.action,
          selector,
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

        if (selector !== undefined) {
          expectation.selector = selector;
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
