# TestWeaver

**Context-Based Automatic Test Generation for React Applications**

TestWeaver is a CLI tool that generates test files automatically from React (TSX/JSX) components using a simple attribute-based DSL. Today it generates **Vitest + React Testing Library** component tests and **Playwright** E2E tests from the same component markup.

> **Current stable scope:** React TSX/JSX + attribute DSL + Vitest + Playwright.
>
> Vue/Svelte support, comment macro DSL, and broader unit/logic generation remain planned roadmap items rather than stable features.

## Features

- 🎯 **DSL-Based Test Generation** - Define tests directly in your component markup using `data-test-*` attributes
- ⚡ **Multiple Test Outputs** - Generate both Vitest (UI/component tests) and Playwright (E2E tests) from the same source
- 🔍 **Rich Selector Support** - Use testId, role, label, or placeholder selectors
- 🎬 **Comprehensive Actions** - Support for click, type, select, hover, clear, keyboard, and more
- ✅ **Flexible Assertions** - Check visibility, text, values, ARIA attributes, CSS classes, URLs, and snapshots
- 🔧 **Configurable** - Customize source patterns, output directories, and generators
- 📊 **Validation** - Built-in DSL validation with helpful error messages
- 👁️ **Watch Mode** - Automatically regenerate tests when source files change
- 🧾 **CI-Friendly Validation Output** - Emit validation results as human-readable text or JSON

## Quick Start

### Installation

```bash
cd packages/testweaver
npm install
npm run build
```

### Basic Usage

```bash
# Generate tests from source files
node dist/cli/index.js generate

# Generate with custom output directory
node dist/cli/index.js generate --output my-tests

# Generate with watch mode
node dist/cli/index.js generate --watch

# Validate DSL usage
node dist/cli/index.js validate

# Validate with strict mode (treat warnings as errors)
node dist/cli/index.js validate --strict

# Validate with JSON output
node dist/cli/index.js validate --format json
```

### Using the test:cli Script

```bash
npm run test:cli
```

## DSL Reference

TestWeaver uses data attributes to define test contexts, steps, and expectations.

### Context Attributes

| Attribute | Description | Example |
|-----------|-------------|---------|
| `data-test-context` | Test suite/context name | `data-test-context="login"` |
| `data-test-scenario` | Test case/scenario name | `data-test-scenario="happy-path"` |
| `data-test-route` | Route for E2E tests | `data-test-route="/login"` |

### Selector Attributes

| Attribute | Description | Example |
|-----------|-------------|---------|
| `data-test-id` | Test ID selector | `data-test-id="email-input"` |
| `data-test-role` | ARIA role selector | `data-test-role="button"` |
| `data-test-label` | Label text selector | `data-test-label="Email"` |
| `data-test-placeholder` | Placeholder selector | `data-test-placeholder="Enter email"` |

### Step Actions

| Action | Description | Example |
|--------|-------------|---------|
| `click` | Click an element | `data-test-step="click"` |
| `type:value` | Type text into an input | `data-test-step="type:user@example.com"` |
| `change:value` | Fire change event | `data-test-step="change:new value"` |
| `select:value` | Select dropdown option | `data-test-step="select:option1"` |
| `focus` | Focus an element | `data-test-step="focus"` |
| `blur` | Blur an element | `data-test-step="blur"` |
| `hover` | Hover over element | `data-test-step="hover"` |
| `clear` | Clear input value | `data-test-step="clear"` |
| `key:KeyName` | Press a keyboard key | `data-test-step="key:Enter"` |
| `waitFor` | Wait for element | `data-test-step="waitFor"` |
| `submitContext` | Submit form | `data-test-step="submitContext"` |

Multiple steps can be combined with semicolons:
```jsx
data-test-step="type:hello; key:Enter"
```

### Expectation Types

| Type | Description | Example |
|------|-------------|---------|
| `visible` | Check element is visible | `data-test-expect="visible"` |
| `not-visible` | Check element is not visible | `data-test-expect="not-visible"` |
| `exists` | Check element exists | `data-test-expect="exists"` |
| `not-exists` | Check element doesn't exist | `data-test-expect="not-exists"` |
| `text:value` | Check text content | `data-test-expect="text:Welcome"` |
| `exact-text:value` | Check exact text | `data-test-expect="exact-text:Hello World"` |
| `value:val` | Check input value | `data-test-expect="value:test@example.com"` |
| `has-class:name` | Check CSS class | `data-test-expect="has-class:active"` |
| `not-has-class:name` | Check no CSS class | `data-test-expect="not-has-class:disabled"` |
| `aria:attr` | Check ARIA attribute exists | `data-test-expect="aria:label"` |
| `aria:attr:value` | Check ARIA attribute value | `data-test-expect="aria:live:polite"` |
| `url-contains:path` | Check URL contains | `data-test-expect="url-contains:/dashboard"` |
| `url-exact:path` | Check exact URL | `data-test-expect="url-exact:/login"` |
| `snapshot` | Take snapshot | `data-test-expect="snapshot"` |

Multiple expectations can be combined:
```jsx
data-test-expect="visible; text:Success; has-class:success-message"
```

## Example Component

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

## Generated Tests

### Vitest Output (login.happy-path.test.tsx)

```tsx
// Auto-generated by TestWeaver. DO NOT EDIT.

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { Login } from "src/components/Login.tsx";

describe("login", () => {
  it("happy-path", async () => {
    render(<Login />);

    const email = () => screen.getByTestId("email");
    const password = () => screen.getByTestId("password");
    const submit = () => screen.getByTestId("submit");
    const successMessage = () => screen.getByTestId("success-message");

    // Steps
    fireEvent.change(email(), { target: { value: "user@example.com" } });
    fireEvent.change(password(), { target: { value: "123456" } });
    fireEvent.click(submit());

    // Expectations
    expect(successMessage()).toBeVisible();
    expect(successMessage()).toHaveTextContent("Welcome");
  });
});
```

### Playwright Output (login.happy-path.spec.ts)

```ts
// Auto-generated by TestWeaver. DO NOT EDIT.

import { test, expect } from "@playwright/test";

test.describe("login", () => {
  test("happy-path", async ({ page }) => {
    await page.goto("/login");

    const email = page.locator('[data-test-id="email"]');
    const password = page.locator('[data-test-id="password"]');
    const submit = page.locator('[data-test-id="submit"]');
    const successMessage = page.locator('[data-test-id="success-message"]');

    // Steps
    await email.fill("user@example.com");
    await password.fill("123456");
    await submit.click();

    // Expectations
    await expect(successMessage).toBeVisible();
    await expect(successMessage).toContainText("Welcome");
  });
});
```

## Configuration

TestWeaver uses [cosmiconfig](https://github.com/cosmiconfig/cosmiconfig) for configuration loading.

### Supported Config Files

- `testweaver.config.js` / `.cjs` / `.mjs` / `.ts`
- `testweaver.config.json`
- `testgen.config.js` / `.json`
- `.testweaverrc` / `.testweaverrc.json`

### Configuration Options

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

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `outputDir` | `string` | `"__generated__"` | Base output directory |
| `sourceGlobs` | `string[]` | `["src/**/*.tsx", "src/**/*.jsx"]` | Source file patterns |
| `vitestDir` | `string` | `"vitest"` | Vitest output subdirectory |
| `e2eDir` | `string` | `"e2e"` | E2E output subdirectory |
| `generators` | `GeneratorConfig[]` | See defaults | Generator configurations |

## Architecture

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  Source      │───▶│   Parser     │───▶│     IR       │
│  Files       │    │  (Babel)     │    │ (JSON-like)  │
└──────────────┘    └──────────────┘    └──────────────┘
                                               │
                          ┌────────────────────┴────────────────────┐
                          ▼                                         ▼
                   ┌──────────────┐                          ┌──────────────┐
                   │   Vitest     │                          │  Playwright  │
                   │  Generator   │                          │  Generator   │
                   └──────────────┘                          └──────────────┘
                          │                                         │
                          ▼                                         ▼
                   ┌──────────────┐                          ┌──────────────┐
                   │   .test.tsx  │                          │   .spec.ts   │
                   │    Files     │                          │    Files     │
                   └──────────────┘                          └──────────────┘
```

1. **Parser**: Scans source files using Babel, extracts DSL attributes
2. **IR (Intermediate Representation)**: Framework-agnostic data structure
3. **Generators**: Convert IR to test code for specific frameworks
4. **CLI**: Orchestrates the workflow and handles configuration

## Troubleshooting

### Common Errors

**"Invalid action"**
```
[ERROR] src/Component.tsx:11:18 [invalid-action] Invalid action "tap". Supported: click, type, change, focus, blur, key, select, hover, clear, custom, waitFor, submitContext
  suggestion: Use one of the supported actions or move unsupported behavior into a custom action.
```
Solution: Use one of the supported actions listed in the error message.

**"Invalid expectation type"**
```
[ERROR] src/Component.tsx:15:20 [invalid-expectation] Invalid expectation type "invalid". Supported: visible, not-visible, exists, not-exists, text, exact-text, value, has-class, not-has-class, aria, url-contains, url-exact, snapshot, custom
  suggestion: Use a supported expectation type or encode custom behavior via custom:...
```
Solution: Use a supported expectation type.

**"Step missing selector"**
```
[WARNING] src/Component.tsx:20:10 [step-missing-selector] Step is missing a selector. Add one of: data-test-id, data-test-role, data-test-label, or data-test-placeholder.
  suggestion: Attach a stable selector so generated tests know which element to target.
```
Solution: Add a selector attribute to elements with `data-test-step`.

**"Duplicate test ID"**
```
[WARN] Duplicate data-test-id "submit" in context "login" scenario "happy-path". First defined at line 10.
```
Solution: Use unique test IDs within each context/scenario.

### Best Practices

1. **Unique Test IDs**: Use descriptive, unique test IDs within each context
2. **Single Context per Component**: Keep one `data-test-context` per component for clarity
3. **Meaningful Scenarios**: Use scenario names that describe the test case
4. **ARIA-First**: Prefer ARIA roles and labels for better accessibility testing
5. **Incremental Steps**: Order steps logically to represent user flow

## Status Snapshot

### Stable today

- React `tsx` / `jsx`
- Attribute DSL (`data-test-*`)
- Vitest generator
- Playwright generator
- Validation + watch mode

### Planned next

- Vue / Svelte parser adapters
- Comment macro DSL
- Broader unit / logic generation
- More advanced config and generator customization

## Documentation

For more detailed guides, see the [docs](./docs/) folder:

- [Getting Started](./docs/getting-started.md) - Step-by-step setup guide
- [DSL Guide](./docs/dsl-guide.md) - Complete DSL reference
- [Configuration Reference](./docs/config-reference.md) - All configuration options
- [Examples](./docs/examples.md) - Real-world usage examples

## License

MIT
