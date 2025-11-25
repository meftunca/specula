# TestWeaver - Context-Based Automatic Test Generation System

This repository contains the design specifications and implementation of **TestWeaver**, a context-based automatic test generation system for React / Svelte / Vue / plain HTML projects.

## Overview

The system consists of three main testing layers:

1. **UI / Component Tests**
2. **Unit Tests** (component/logic focused)
3. **E2E (Automation) Tests**

Core concept:

- Use **minimal directives** (data-* attributes and comment macros) in UI code
- Generate an **IR (Intermediate Representation)** from source code
- Generate **test files** for different test types (unit, UI, E2E) from the IR

---

## Project Structure

```
.
├── packages/
│   └── testweaver/           # CLI tool and core library
│       ├── src/
│       │   ├── cli/          # CLI entry point and commands
│       │   ├── config/       # Configuration loading (cosmiconfig)
│       │   ├── validation/   # DSL validation logic
│       │   ├── types/        # Core TypeScript types (IR, Config, Generator)
│       │   ├── core/         # Core parser
│       │   └── generators/   # Test generators (Vitest, Playwright)
│       ├── package.json
│       └── tsconfig.json
│
├── example-app/              # Demo Vite + React application
│   └── src/
│       └── components/       # Example components with DSL attributes
│           ├── Login.tsx     # Login demo with data-test-* attributes
│           └── Search.tsx    # Search demo with data-test-* attributes
│
└── docs (specification files)
    ├── 01-system-overview.md
    ├── 02-dsl-spec.md
    ├── 03-ir-spec.md
    ├── 04-generators-spec.md
    ├── 05-cli-tool-spec.md
    └── 06-implementation-plan.md
```

---

## Quick Start

### Building the CLI Tool

```bash
cd packages/testweaver
npm install
npm run build
```

### Running the CLI

```bash
# Show help
node dist/cli/index.js --help

# Generate tests from source files
node dist/cli/index.js generate

# Generate tests with custom output directory
node dist/cli/index.js generate --output my-tests

# Generate tests with watch mode
node dist/cli/index.js generate --watch

# Validate DSL usage
node dist/cli/index.js validate

# Validate with strict mode (treat warnings as errors)
node dist/cli/index.js validate --strict

# Use a custom config file
node dist/cli/index.js generate --config ./my-config.json
```

### Using the test:cli Script

```bash
cd packages/testweaver
npm run test:cli
```

### Running the Example App

```bash
cd example-app
npm install
npm run dev
```

---

## CLI Commands

### `testweaver generate`

Generate test files from source files with DSL attributes.

**Options:**
- `-c, --config <path>` — Path to config file
- `-o, --output <dir>` — Output directory for generated files
- `-w, --watch` — Watch for changes and regenerate

**Example:**
```bash
# Generate tests from example-app
cd example-app
node ../packages/testweaver/dist/cli/index.js generate
```

**Sample Output:**
```
[INFO] Loading configuration...
[INFO] Scanning source files...
[INFO] Found 4 source file(s)
[INFO] Found 2 test suite(s)
[INFO] Generated: __generated__/vitest/login.happy-path.test.tsx
[INFO] Generated: __generated__/e2e/login.happy-path.spec.ts
[INFO] Generation complete: 2 Vitest file(s), 2 Playwright file(s)
```

### `testweaver validate`

Validate DSL usage and report errors/warnings.

**Options:**
- `-c, --config <path>` — Path to config file
- `--strict` — Treat warnings as errors

**Example:**
```bash
# Validate DSL in source files
node dist/cli/index.js validate

# With strict mode
node dist/cli/index.js validate --strict
```

**Sample Output (with errors):**
```
[INFO] Loading configuration...
[INFO] Scanning source files for validation...
[INFO] Found 1 source file(s)
[INFO] Validating DSL usage...

[ERROR] src/InvalidComponent.tsx:11: Invalid action "tap". Supported: click, type, change, focus, blur, key, custom, waitFor, submitContext
[ERROR] src/InvalidComponent.tsx:15: Invalid action "swipe". Supported: click, type, change, focus, blur, key, custom, waitFor, submitContext
[ERROR] src/InvalidComponent.tsx:19: Invalid expectation type "invalid-type". Supported: visible, not-visible, exists, not-exists, text, exact-text, value, has-class, not-has-class, aria, url-contains, url-exact, snapshot, custom

Validation complete: 3 error(s), 0 warning(s), 0 info message(s)
[ERROR] Validation failed (errors found)
```

**Exit Codes:**
- `0` — Success
- `1` — Errors found (or warnings in strict mode)

---

## Configuration

TestWeaver supports configuration files for customizing behavior. Configuration is loaded using [cosmiconfig](https://github.com/cosmiconfig/cosmiconfig).

### Supported Config Files

- `testweaver.config.js`
- `testweaver.config.cjs`
- `testweaver.config.mjs`
- `testweaver.config.ts`
- `testweaver.config.json`
- `testgen.config.js`
- `testgen.config.json`
- `.testweaverrc`
- `.testweaverrc.json`

### Example Configuration (testweaver.config.json)

```json
{
  "outputDir": "__generated__",
  "sourceGlobs": ["src/**/*.tsx", "src/**/*.jsx"],
  "vitestDir": "vitest",
  "e2eDir": "e2e",
  "generators": [
    { "name": "vitest", "type": "ui", "outputDir": "__generated__/vitest" },
    { "name": "playwright", "type": "e2e", "outputDir": "__generated__/e2e" }
  ]
}
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `outputDir` | `string` | `"__generated__"` | Base output directory for generated tests |
| `sourceGlobs` | `string[]` | `["src/**/*.tsx", "src/**/*.jsx"]` | Glob patterns for source files to scan |
| `vitestDir` | `string` | `"vitest"` | Subdirectory for Vitest tests |
| `e2eDir` | `string` | `"e2e"` | Subdirectory for E2E tests |
| `generators` | `GeneratorConfig[]` | See defaults | Generator configurations |

### Default Behavior

If no config file is found, the following defaults are used:
- Source files: `src/**/*.tsx` and `src/**/*.jsx`
- Output directory: `__generated__`
- Vitest tests: `__generated__/vitest/`
- E2E tests: `__generated__/e2e/`

---

## DSL Attributes Example

The example app demonstrates how to use TestWeaver DSL attributes:

```tsx
<div
  data-test-context="login"
  data-test-scenario="happy-path"
  data-test-route="/login"
>
  <input
    data-test-id="email"
    data-test-step="type:user@example.com"
  />
  <input
    data-test-id="password"
    data-test-step="type:123456"
  />
  <button
    data-test-id="submit"
    data-test-step="click"
  >
    Login
  </button>
  <div
    data-test-id="success-message"
    data-test-expect="visible; text:Welcome"
  >
    Welcome!
  </div>
</div>
```

### Supported Step Actions

- `click` — Click an element
- `type:value` — Type text into an input
- `change:value` — Fire a change event with value
- `focus` — Focus an element
- `blur` — Blur an element
- `key:KeyName` — Press a key
- `waitFor` — Wait for an element
- `submitContext` — Submit a form

### Supported Expectation Types

- `visible` / `not-visible` — Check visibility
- `exists` / `not-exists` — Check existence
- `text:value` — Check text content contains value
- `exact-text:value` — Check exact text content
- `value:val` — Check input value
- `has-class:name` / `not-has-class:name` — Check CSS class
- `aria:state` — Check ARIA attribute
- `url-contains:path` / `url-exact:path` — Check URL
- `snapshot` — Take a snapshot

---

## Generated Test Examples

### Vitest Test (login.happy-path.test.tsx)

```tsx
// Auto-generated by TestWeaver. DO NOT EDIT.

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { Login } from "src/components/Login.tsx";

describe("login", () => {
  it("happy-path", async () => {
    render(<Login />);

    // Steps
    fireEvent.change(screen.getByTestId("email"), { target: { value: "user@example.com" } });
    fireEvent.change(screen.getByTestId("password"), { target: { value: "123456" } });
    fireEvent.click(screen.getByTestId("submit"));

    // Expectations
    expect(screen.getByTestId("success-message")).toBeVisible();
    expect(screen.getByTestId("success-message")).toHaveTextContent("Welcome");
  });
});
```

### Playwright Test (login.happy-path.spec.ts)

```ts
// Auto-generated by TestWeaver. DO NOT EDIT.

import { test, expect } from "@playwright/test";

test.describe("login", () => {
  test("happy-path", async ({ page }) => {
    await page.goto("/login");

    // Steps
    await page.locator('[data-test-id="email"]').fill("user@example.com");
    await page.locator('[data-test-id="password"]').fill("123456");
    await page.locator('[data-test-id="submit"]').click();

    // Expectations
    await expect(page.locator('[data-test-id="success-message"]')).toBeVisible();
    await expect(page.locator('[data-test-id="success-message"]')).toContainText("Welcome");
  });
});
```

---

## Specification Documents

- `01-system-overview.md` — High-level architecture and flow
- `02-dsl-spec.md` — Attribute and comment-based DSL specification
- `03-ir-spec.md` — IR (Intermediate Representation) schema
- `04-generators-spec.md` — IR → Jest / Vitest / Cypress / Playwright mappings
- `05-cli-tool-spec.md` — CLI tool and configuration format
- `06-implementation-plan.md` — Implementation phases, technologies, and roadmap

These documents provide detailed specifications from initial PoC to production-level implementation.
