# Getting Started with TestWeaver

This guide walks you through setting up TestWeaver and generating your first tests.

## Prerequisites

- Node.js 18.0.0 or higher
- npm or yarn
- A React project with TSX/JSX components

## Installation

### From the Repository

```bash
# Clone the repository
git clone https://github.com/your-repo/Specula-test-engine.git
cd Specula-test-engine

# Install dependencies
cd packages/testweaver
npm install

# Build the CLI
npm run build
```

### Using npm (future)

```bash
npm install -D @testweaver/cli
```

## Project Setup

### 1. Create a Configuration File (Optional)

Create a `testweaver.config.json` in your project root:

```json
{
  "outputDir": "__generated__",
  "sourceGlobs": ["src/**/*.tsx", "src/**/*.jsx"],
  "vitestDir": "vitest",
  "e2eDir": "e2e"
}
```

If you don't create a config file, TestWeaver will use sensible defaults.

### 2. Add DSL Attributes to Your Components

Mark up your React components with TestWeaver's DSL attributes:

```tsx
// src/components/Login.tsx
export function Login() {
  return (
    <div
      data-test-context="login"
      data-test-scenario="happy-path"
      data-test-route="/login"
    >
      <input
        data-test-id="email"
        data-test-step="type:user@example.com"
        placeholder="Email"
      />
      <input
        data-test-id="password"
        data-test-step="type:password123"
        type="password"
        placeholder="Password"
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
  );
}
```

### 3. Generate Tests

Run the generate command from your project root:

```bash
# If installed globally or using npm scripts
testweaver generate

# Or using node directly
node path/to/testweaver/dist/cli/index.js generate
```

### 4. Review Generated Files

TestWeaver creates two directories by default:

```
__generated__/
├── vitest/
│   └── login.happy-path.test.tsx
└── e2e/
    └── login.happy-path.spec.ts
```

## Running Your Tests

### Vitest Tests

```bash
# Add vitest to your project
npm install -D vitest @testing-library/react @testing-library/jest-dom

# Run tests
npx vitest run __generated__/vitest/
```

### Playwright Tests

```bash
# Add playwright to your project
npm install -D @playwright/test

# Run tests
npx playwright test __generated__/e2e/
```

## Understanding the Workflow

```
┌─────────────────┐
│  Your Component │
│  with DSL attrs │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  testweaver     │
│   generate      │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌───────┐ ┌───────┐
│ Vitest│ │Playwrt│
│ tests │ │ tests │
└───────┘ └───────┘
```

1. **Add DSL attributes** to your components
2. **Run `testweaver generate`** to scan files and generate tests
3. **Run tests** with your preferred test runner

## Adding More Test Cases

You can add multiple scenarios to the same component:

```tsx
// Error scenario
<div
  data-test-context="login"
  data-test-scenario="invalid-email"
  data-test-route="/login"
>
  <input
    data-test-id="email-error"
    data-test-step="type:invalid-email"
  />
  <button
    data-test-id="submit-error"
    data-test-step="click"
  />
  <div
    data-test-id="error-message"
    data-test-expect="visible; text:Invalid email"
  >
    Invalid email address
  </div>
</div>
```

## Validating Your DSL

Before generating tests, validate your DSL usage:

```bash
testweaver validate
```

This catches common errors like:
- Invalid action names
- Invalid expectation types
- Missing test IDs
- Duplicate IDs

Use `--strict` to treat warnings as errors:

```bash
testweaver validate --strict
```

## Watch Mode

For development, use watch mode to automatically regenerate tests:

```bash
testweaver generate --watch
```

This watches for changes in your source files and regenerates tests when files are modified.

## Next Steps

- Read the [DSL Guide](./dsl-guide.md) for complete attribute reference
- Check [Configuration Reference](./config-reference.md) for all options
- See [Examples](./examples.md) for real-world patterns
