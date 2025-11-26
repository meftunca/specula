/**
 * TestWeaver IR (Intermediate Representation) Types
 *
 * These types define the intermediate representation that bridges DSL parsing
 * and test generation. The IR is framework-agnostic and versioned.
 *
 * @see ../../../03-ir-spec.md for the complete specification
 */

/**
 * Top-level IR schema
 */
export interface TestIR {
  /** IR version for backward compatibility */
  version: 1;
  /** ISO timestamp when the IR was generated */
  generatedAt: string;
  /** Project root directory */
  sourceRoot: string;
  /** Collection of test suites */
  suites: TestSuite[];
}

/**
 * TestSuite represents a context (e.g., login, checkout)
 */
export interface TestSuite {
  /** Unique identifier (e.g., "login", "checkout") */
  id: string;
  /** Context name */
  context: string;
  /** Optional description */
  description?: string;
  /** Source files that contribute to this suite */
  sourceFiles: SourceRef[];
  /** Test cases/scenarios within this suite */
  cases: TestCase[];
}

/**
 * Reference to a source file
 */
export interface SourceRef {
  /** File path relative to project root (e.g., "src/components/Login.tsx") */
  filePath: string;
  /** UI framework used in the file */
  framework: Framework;
  /** Programming language/syntax */
  language: Language;
}

/**
 * Supported UI frameworks
 *
 * - `react` - React with JSX/TSX files
 * - `vue` - Vue.js with .vue single-file components
 * - `svelte` - Svelte with .svelte files
 * - `html` - Plain HTML files
 */
export type Framework = "react" | "vue" | "svelte" | "html";

/**
 * Supported languages/file types
 *
 * - `js` - JavaScript
 * - `ts` - TypeScript
 * - `tsx` - TypeScript with JSX
 * - `jsx` - JavaScript with JSX
 * - `html` - HTML markup
 * - `svelte` - Svelte component files
 * - `vue` - Vue single-file components
 */
export type Language = "js" | "ts" | "tsx" | "jsx" | "html" | "svelte" | "vue";

/**
 * Type of test case
 */
export type TestCaseType = "ui" | "unit" | "e2e";

/**
 * TestCase represents a specific scenario within a context
 */
export interface TestCase {
  /** Unique, stable identifier (e.g., "login__happy-path") */
  id: string;
  /** Context name (e.g., "login") */
  context: string;
  /** Scenario name (e.g., "happy-path") */
  scenario: string;
  /** Test type: UI, unit, or E2E */
  type: TestCaseType;
  /** Route for E2E tests (e.g., "/login") */
  route?: string;
  /** Tags for filtering (e.g., ["happy-path", "smoke"]) */
  tags?: string[];
  /** Additional metadata */
  meta?: TestCaseMeta;

  /** Locations where this case is defined in source code */
  definedAt: LocationRef[];
  /** Pattern IDs used (from data-test-from) */
  usesPatterns?: string[];

  /** Test steps (actions) */
  steps: TestStep[];
  /** Test expectations (assertions) */
  expectations: TestExpectation[];
}

/**
 * Metadata for test cases
 */
export interface TestCaseMeta {
  /** React component name for UI tests */
  componentName?: string;
  /** Import path for the component */
  importPath?: string;
  /** Target kind for unit tests */
  targetKind?: "function" | "hook" | "reducer";
  /** Target name for unit tests */
  targetName?: string;
  /** Suite name for E2E tests */
  suiteName?: string;
  /** Retry count for flaky tests */
  retries?: number;
  /** Additional custom metadata */
  [key: string]: unknown;
}

/**
 * Reference to a location in source code
 */
export interface LocationRef {
  /** File path relative to project root */
  filePath: string;
  /** Line number (1-indexed) */
  line: number;
  /** Column number (1-indexed) */
  column: number;
  /** How this location was discovered */
  via: "attribute" | "comment" | "pattern";
  /** Original DSL string (for debugging) */
  raw?: string;
}

/**
 * Available step actions
 */
export type StepAction =
  | "click"
  | "type"
  | "change"
  | "focus"
  | "blur"
  | "key"
  | "select"
  | "hover"
  | "clear"
  | "custom"
  | "waitFor"
  | "submitContext";

/**
 * TestStep represents a user action in a test
 */
export interface TestStep {
  /** Stable identifier (e.g., "step-1") */
  id: string;
  /** Action to perform */
  action: StepAction;
  /** Target element selector */
  selector: Selector;
  /** Value for the action (e.g., text to type, key to press) */
  value?: unknown;
  /** Human-readable description */
  description?: string;
  /** Optional delay in milliseconds (useful for E2E) */
  delayMs?: number;
  /** Framework-specific metadata */
  meta?: Record<string, unknown>;
  /** Source code location reference */
  source?: LocationRef;
}

/**
 * Types of selectors for targeting elements
 */
export type SelectorType =
  | "css"
  | "testId"
  | "role"
  | "labelText"
  | "placeholder"
  | "custom";

/**
 * Selector for targeting elements in tests
 */
export interface Selector {
  /** Type of selector */
  type: SelectorType;
  /** Selector value (e.g., "email" for testId, "[data-test-id=email]" for css) */
  value: string;
  /** Additional options (e.g., { exact: boolean } for text matching) */
  options?: Record<string, unknown>;
}

/**
 * Types of expectations (assertions)
 */
export type ExpectType =
  | "visible"
  | "not-visible"
  | "exists"
  | "not-exists"
  | "text"
  | "exact-text"
  | "value"
  | "has-class"
  | "not-has-class"
  | "aria"
  | "url-contains"
  | "url-exact"
  | "snapshot"
  | "custom";

/**
 * TestExpectation represents an assertion in a test
 */
export interface TestExpectation {
  /** Stable identifier (e.g., "exp-1") */
  id: string;
  /** Type of expectation */
  type: ExpectType;
  /** Target element selector (not required for URL assertions) */
  selector?: Selector;
  /** Expected value (text, URL, aria state, etc.) */
  value?: unknown;
  /** Human-readable description */
  description?: string;
  /** Framework-specific metadata */
  meta?: Record<string, unknown>;
  /** Source code location reference */
  source?: LocationRef;
}
