# Configuration Reference

Complete reference for TestWeaver configuration options.

## Configuration Loading

TestWeaver uses [cosmiconfig](https://github.com/cosmiconfig/cosmiconfig) to find and load configuration files.

### Supported File Names

Configuration is searched in the following order:

1. `testweaver.config.js`
2. `testweaver.config.cjs`
3. `testweaver.config.mjs`
4. `testweaver.config.ts`
5. `testweaver.config.json`
6. `testgen.config.js`
7. `testgen.config.json`
8. `.testweaverrc`
9. `.testweaverrc.json`
10. `package.json` (under `testweaver` key)

### Search Path

Configuration is searched starting from the current working directory and up through parent directories.

## Configuration Options

### outputDir

Base output directory for generated test files.

| Type | Default | CLI Override |
|------|---------|--------------|
| `string` | `"__generated__"` | `--output <dir>` |

```json
{
  "outputDir": "test-output"
}
```

### sourceGlobs

Array of glob patterns to find source files.

| Type | Default |
|------|---------|
| `string[]` | `["src/**/*.tsx", "src/**/*.jsx"]` |

```json
{
  "sourceGlobs": [
    "src/components/**/*.tsx",
    "src/features/**/*.tsx",
    "!src/**/*.test.tsx"
  ]
}
```

**Notes:**
- Supports glob negation with `!` prefix
- `node_modules` is automatically excluded
- Matches are case-insensitive on Windows

### vitestDir

Subdirectory within outputDir for Vitest test files.

| Type | Default |
|------|---------|
| `string` | `"vitest"` |

```json
{
  "vitestDir": "unit"
}
```

Results in tests at: `{outputDir}/unit/*.test.tsx`

### e2eDir

Subdirectory within outputDir for Playwright test files.

| Type | Default |
|------|---------|
| `string` | `"e2e"` |

```json
{
  "e2eDir": "playwright"
}
```

Results in tests at: `{outputDir}/playwright/*.spec.ts`

### generators

Array of generator configurations for customizing output.

| Type | Default |
|------|---------|
| `GeneratorConfig[]` | See below |

```json
{
  "generators": [
    {
      "name": "vitest",
      "type": "ui",
      "outputDir": "__generated__/vitest"
    },
    {
      "name": "playwright",
      "type": "e2e",
      "outputDir": "__generated__/e2e"
    }
  ]
}
```

#### GeneratorConfig Properties

| Property | Type | Description |
|----------|------|-------------|
| `name` | `string` | Generator name: "vitest" or "playwright" |
| `type` | `string` | Test type: "ui", "unit", or "e2e" |
| `outputDir` | `string` | Output directory for this generator |

## Configuration Examples

### Minimal Configuration

```json
{
  "outputDir": "__tests__/generated"
}
```

### Full Configuration

```json
{
  "outputDir": "__generated__",
  "sourceGlobs": [
    "src/**/*.tsx",
    "src/**/*.jsx",
    "!src/**/*.stories.tsx",
    "!src/**/*.test.tsx"
  ],
  "vitestDir": "vitest",
  "e2eDir": "e2e",
  "generators": [
    {
      "name": "vitest",
      "type": "ui",
      "outputDir": "__generated__/vitest"
    },
    {
      "name": "playwright",
      "type": "e2e",
      "outputDir": "__generated__/e2e"
    }
  ]
}
```

### JavaScript Configuration

```javascript
// testweaver.config.js
module.exports = {
  outputDir: process.env.TEST_OUTPUT || '__generated__',
  sourceGlobs: [
    'src/components/**/*.tsx',
    'src/pages/**/*.tsx',
  ],
  vitestDir: 'vitest',
  e2eDir: 'playwright',
};
```

### TypeScript Configuration

```typescript
// testweaver.config.ts
import type { Config } from '@testweaver/cli';

const config: Config = {
  outputDir: '__generated__',
  sourceGlobs: ['src/**/*.tsx'],
  vitestDir: 'vitest',
  e2eDir: 'e2e',
};

export default config;
```

### ESM Configuration

```javascript
// testweaver.config.mjs
export default {
  outputDir: '__generated__',
  sourceGlobs: ['src/**/*.tsx', 'src/**/*.jsx'],
  vitestDir: 'vitest',
  e2eDir: 'e2e',
};
```

### Package.json Configuration

```json
{
  "name": "my-app",
  "testweaver": {
    "outputDir": "__generated__",
    "sourceGlobs": ["src/**/*.tsx"]
  }
}
```

## CLI Options

CLI options override configuration file values.

### generate command

```bash
testweaver generate [options]
```

| Option | Description | Example |
|--------|-------------|---------|
| `-c, --config <path>` | Path to config file | `--config ./custom.config.json` |
| `-o, --output <dir>` | Output directory | `--output ./tests` |
| `-w, --watch` | Watch for changes | `--watch` |

### validate command

```bash
testweaver validate [options]
```

| Option | Description | Example |
|--------|-------------|---------|
| `-c, --config <path>` | Path to config file | `--config ./custom.config.json` |
| `--strict` | Treat warnings as errors | `--strict` |

## Environment Variables

Currently, TestWeaver doesn't use environment variables directly, but you can use them in JavaScript configuration files:

```javascript
// testweaver.config.js
module.exports = {
  outputDir: process.env.TESTWEAVER_OUTPUT || '__generated__',
  sourceGlobs: process.env.TESTWEAVER_GLOBS?.split(',') || ['src/**/*.tsx'],
};
```

## Monorepo Configuration

For monorepos, you can have different configurations per package:

```
my-monorepo/
├── packages/
│   ├── web/
│   │   ├── testweaver.config.json  # Web-specific config
│   │   └── src/
│   └── mobile/
│       ├── testweaver.config.json  # Mobile-specific config
│       └── src/
└── testweaver.config.json          # Root fallback config
```

Or use workspaces with shared config:

```json
// Root testweaver.config.json
{
  "sourceGlobs": ["packages/*/src/**/*.tsx"],
  "outputDir": "__generated__"
}
```

## Validation Configuration

When running `testweaver validate`, additional options are available:

```json
{
  "validation": {
    "enforceUniqueTestIds": true,
    "strict": false
  }
}
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enforceUniqueTestIds` | `boolean` | `true` | Warn on duplicate test IDs per context |
| `strict` | `boolean` | `false` | Treat warnings as errors |

## Default Configuration

If no configuration file is found, these defaults are used:

```json
{
  "outputDir": "__generated__",
  "sourceGlobs": ["src/**/*.tsx", "src/**/*.jsx"],
  "vitestDir": "vitest",
  "e2eDir": "e2e",
  "generators": [
    {
      "name": "vitest",
      "type": "ui",
      "outputDir": "__generated__/vitest"
    },
    {
      "name": "playwright",
      "type": "e2e",
      "outputDir": "__generated__/e2e"
    }
  ]
}
```
