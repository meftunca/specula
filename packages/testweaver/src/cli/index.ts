#!/usr/bin/env node
/**
 * TestWeaver CLI Entry Point
 *
 * This is the main entry point for the testweaver CLI tool.
 *
 * Commands:
 * - scan: Scan source files and generate IR
 * - generate: Generate test files from IR
 * - validate: Validate DSL usage and IR
 * - watch: Watch for changes and regenerate
 */

import { Command } from "commander";
import * as fs from "node:fs";
import * as path from "node:path";
import { glob } from "glob";
import { watch, type FSWatcher } from "chokidar";
import { scanFile } from "../core/parser.js";
import {
  generateVitest,
  generateVitestFileName,
  generatePlaywright,
  generatePlaywrightFileName,
  validateIR,
  logValidationIssues,
} from "../generators/index.js";
import {
  loadConfig,
  mergeConfig,
} from "../config/config.js";
import {
  validateFiles,
  formatValidationResult,
  formatValidationResultAsJson,
  type ValidationOptions,
  type ValidationOutputFormat,
} from "../validation/validator.js";
import type { TestSuite, TestIR } from "../types/ir.js";

/**
 * Options for the scan command
 */
interface ScanOptions {
  config?: string;
  output?: string;
  silent?: boolean;
}

/**
 * Options for the generate command
 */
interface GenerateOptions {
  config?: string;
  output?: string;
  watch?: boolean;
}

/**
 * Options for the validate command
 */
interface ValidateOptions {
  config?: string;
  ir?: string;
  strict?: boolean;
  format?: ValidationOutputFormat;
}

/**
 * Ensures a directory exists, creating it if necessary
 */
function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Writes content to a file only if it has changed
 * Returns true if file was written, false if content was unchanged
 */
function writeFileIfChanged(filePath: string, content: string): boolean {
  if (fs.existsSync(filePath)) {
    const existing = fs.readFileSync(filePath, "utf-8");
    if (existing === content) {
      return false;
    }
  }
  fs.writeFileSync(filePath, content, "utf-8");
  return true;
}

/**
 * Sorts source file references deterministically.
 */
function sortSourceRefs(sourceFiles: TestSuite["sourceFiles"]): TestSuite["sourceFiles"] {
  return [...sourceFiles].sort((a, b) => a.filePath.localeCompare(b.filePath));
}

/**
 * Sorts test cases deterministically.
 */
function sortTestCases(cases: TestSuite["cases"]): TestSuite["cases"] {
  return [...cases].sort((a, b) => {
    if (a.scenario !== b.scenario) {
      return a.scenario.localeCompare(b.scenario);
    }
    return a.id.localeCompare(b.id);
  });
}

/**
 * Consolidates duplicate case ids inside a suite.
 */
function consolidateTestCases(cases: TestSuite["cases"]): TestSuite["cases"] {
  const caseMap = new Map<string, TestSuite["cases"][number]>();

  for (const testCase of sortTestCases(cases)) {
    const existing = caseMap.get(testCase.id);
    if (existing === undefined) {
      caseMap.set(testCase.id, normalizeTestCase(testCase));
    } else {
      caseMap.set(testCase.id, mergeTestCase(existing, testCase));
    }
  }

  return sortTestCases([...caseMap.values()]).map(normalizeTestCase);
}

/**
 * Sorts suites deterministically.
 */
function sortSuites(suites: TestSuite[]): TestSuite[] {
  return [...suites]
    .map((suite) => ({
      ...suite,
      sourceFiles: sortSourceRefs(suite.sourceFiles),
      cases: consolidateTestCases(suite.cases),
    }))
    .sort((a, b) => a.context.localeCompare(b.context));
}

/**
 * Sorts location refs deterministically.
 */
function sortLocationRefs<T extends { filePath: string; line: number; column: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    if (a.filePath !== b.filePath) {
      return a.filePath.localeCompare(b.filePath);
    }
    if (a.line !== b.line) {
      return a.line - b.line;
    }
    return a.column - b.column;
  });
}

/**
 * Deduplicates location refs deterministically.
 */
function dedupeLocationRefs<T extends { filePath: string; line: number; column: number }>(items: T[]): T[] {
  const unique = new Map<string, T>();

  for (const item of items) {
    unique.set(`${item.filePath}:${item.line}:${item.column}`, item);
  }

  return sortLocationRefs([...unique.values()]);
}

/**
 * Sorts source-referenced elements deterministically.
 */
function sortBySourceLocation<T extends { source?: { filePath: string; line: number; column: number } }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const sourceA = a.source;
    const sourceB = b.source;

    if (sourceA === undefined && sourceB === undefined) {
      return 0;
    }
    if (sourceA === undefined) {
      return 1;
    }
    if (sourceB === undefined) {
      return -1;
    }
    if (sourceA.filePath !== sourceB.filePath) {
      return sourceA.filePath.localeCompare(sourceB.filePath);
    }
    if (sourceA.line !== sourceB.line) {
      return sourceA.line - sourceB.line;
    }
    return sourceA.column - sourceB.column;
  });
}

/**
 * Normalizes a test case by sorting its elements and reassigning stable ids.
 */
function normalizeTestCase(testCase: TestSuite["cases"][number]): TestSuite["cases"][number] {
  const steps = sortBySourceLocation(testCase.steps).map((step, index) => ({
    ...step,
    id: `step-${index + 1}`,
  }));

  const expectations = sortBySourceLocation(testCase.expectations).map((expectation, index) => ({
    ...expectation,
    id: `exp-${index + 1}`,
  }));

  return {
    ...testCase,
    definedAt: dedupeLocationRefs(testCase.definedAt),
    steps,
    expectations,
  };
}

/**
 * Merges duplicate test cases coming from separate JSX branches or repeated context blocks.
 */
function mergeTestCase(
  existing: TestSuite["cases"][number],
  incoming: TestSuite["cases"][number]
): TestSuite["cases"][number] {
  const mergedCase: TestSuite["cases"][number] = {
    ...existing,
    type: existing.type === "e2e" || incoming.type === "e2e" ? "e2e" : existing.type,
    definedAt: [...existing.definedAt, ...incoming.definedAt],
    steps: [...existing.steps, ...incoming.steps],
    expectations: [...existing.expectations, ...incoming.expectations],
  };

  const route = existing.route ?? incoming.route;
  if (route !== undefined) {
    mergedCase.route = route;
  }

  const meta = {
    ...(existing.meta ?? {}),
    ...(incoming.meta ?? {}),
  };
  if (Object.keys(meta).length > 0) {
    mergedCase.meta = meta;
  }

  return normalizeTestCase(mergedCase);
}

/**
 * Collects source files from config globs in deterministic order.
 */
async function collectSourceFiles(patterns: string[]): Promise<string[]> {
  const sourceFiles = new Set<string>();

  for (const pattern of patterns) {
    const matches = await glob(pattern, { ignore: ["node_modules/**", "**/node_modules/**"] });
    for (const match of matches) {
      sourceFiles.add(match);
    }
  }

  return [...sourceFiles].sort((a, b) => a.localeCompare(b));
}

/**
 * Scans all source files and merges them into a unified TestIR
 */
function scanAllFiles(sourceFiles: string[]): TestIR {
  const suites: TestSuite[] = [];
  const suiteMap = new Map<string, TestSuite>();

  for (const filePath of [...sourceFiles].sort((a, b) => a.localeCompare(b))) {
    try {
      const fileSuites = scanFile(filePath);
      
      for (const suite of fileSuites) {
        const existing = suiteMap.get(suite.context);
        if (existing !== undefined) {
          // Merge cases from this suite into the existing one.
          for (const newCase of suite.cases) {
            const caseIndex = existing.cases.findIndex(
              (c) => c.id === newCase.id
            );
            if (caseIndex === -1) {
              existing.cases.push(newCase);
            } else {
              existing.cases[caseIndex] = mergeTestCase(existing.cases[caseIndex]!, newCase);
            }
          }
          // Merge sourceFiles
          for (const sourceFile of suite.sourceFiles) {
            const alreadyExists = existing.sourceFiles.some(
              (sf) => sf.filePath === sourceFile.filePath
            );
            if (!alreadyExists) {
              existing.sourceFiles.push(sourceFile);
            }
          }
        } else {
          suiteMap.set(suite.context, suite);
          suites.push(suite);
        }
      }
    } catch (error) {
      console.error(`[ERROR] Failed to parse ${filePath}:`, error);
    }
  }

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    sourceRoot: process.cwd(),
    suites: sortSuites(suites),
  };
}

/**
 * Generates test files for a single test suite
 */
function generateTestFilesForSuite(
  suite: TestSuite,
  outputDir: string,
  vitestDir: string,
  e2eDir: string
): { vitestFiles: string[]; e2eFiles: string[] } {
  const vitestOutDir = path.join(outputDir, vitestDir);
  const e2eOutDir = path.join(outputDir, e2eDir);

  try {
    ensureDir(vitestOutDir);
    ensureDir(e2eOutDir);
  } catch (error) {
    console.error("[ERROR] Failed to create output directories:", error);
    return { vitestFiles: [], e2eFiles: [] };
  }

  const vitestFiles: string[] = [];
  const e2eFiles: string[] = [];

  // Generate Vitest tests (one file per test case)
  for (const testCase of suite.cases) {
    try {
      const vitestFileName = generateVitestFileName(testCase);
      const vitestFilePath = path.join(vitestOutDir, vitestFileName);
      const vitestContent = generateVitest({
        ...suite,
        cases: [testCase],
      }, {
        outputFilePath: vitestFilePath,
        sourceRoot: process.cwd(),
      });

      if (writeFileIfChanged(vitestFilePath, vitestContent)) {
        vitestFiles.push(vitestFilePath);
      }

      // Generate Playwright tests (one file per test case)
      const playwrightContent = generatePlaywright({
        ...suite,
        cases: [testCase],
      });
      const playwrightFileName = generatePlaywrightFileName(testCase);
      const playwrightFilePath = path.join(e2eOutDir, playwrightFileName);

      if (writeFileIfChanged(playwrightFilePath, playwrightContent)) {
        e2eFiles.push(playwrightFilePath);
      }
    } catch (error) {
      console.error(`[ERROR] Failed to generate tests for case ${testCase.id}:`, error);
    }
  }

  return { vitestFiles, e2eFiles };
}

/**
 * Generates all test files from the IR
 */
function generateAllTestFiles(
  ir: TestIR,
  outputDir: string,
  vitestDir: string,
  e2eDir: string
): { totalVitest: number; totalE2e: number } {
  // Validate IR before generation
  const validationResult = validateIR(ir);
  
  if (validationResult.warningCount > 0 || validationResult.errorCount > 0) {
    console.log("[INFO] IR validation results:");
    logValidationIssues(validationResult);
    console.log("");
  }

  if (!validationResult.valid) {
    console.error("[ERROR] IR validation failed. Generation may produce incomplete results.");
  }

  let totalVitest = 0;
  let totalE2e = 0;

  for (const suite of ir.suites) {
    const { vitestFiles, e2eFiles } = generateTestFilesForSuite(
      suite,
      outputDir,
      vitestDir,
      e2eDir
    );
    totalVitest += vitestFiles.length;
    totalE2e += e2eFiles.length;

    for (const file of vitestFiles) {
      console.log(`[INFO] Generated: ${file}`);
    }
    for (const file of e2eFiles) {
      console.log(`[INFO] Generated: ${file}`);
    }
  }

  return { totalVitest, totalE2e };
}

/**
 * Main generate function
 */
async function runGenerate(options: GenerateOptions): Promise<void> {
  console.log("[INFO] Loading configuration...");
  
  const { config: loadedConfig, filepath } = await loadConfig(options.config);
  if (filepath !== undefined) {
    console.log(`[INFO] Using config from: ${filepath}`);
  }
  const config = mergeConfig(loadedConfig, { config: options.config, output: options.output });

  console.log("[INFO] Scanning source files...");

  // Find all source files
  const sourceFiles = await collectSourceFiles(config.sourceGlobs);

  if (sourceFiles.length === 0) {
    console.log("[WARN] No source files found matching patterns:", config.sourceGlobs);
    return;
  }

  console.log(`[INFO] Found ${sourceFiles.length} source file(s)`);

  // Scan all files and build IR
  const ir = scanAllFiles(sourceFiles);

  if (ir.suites.length === 0) {
    console.log("[WARN] No test contexts found in source files");
    return;
  }

  console.log(`[INFO] Found ${ir.suites.length} test suite(s)`);

  // Generate test files
  const { totalVitest, totalE2e } = generateAllTestFiles(
    ir,
    config.outputDir,
    config.vitestDir,
    config.e2eDir
  );

  console.log(`[INFO] Generation complete: ${totalVitest} Vitest file(s), ${totalE2e} Playwright file(s)`);
}

/**
 * Watch mode handler
 */
async function runWatch(options: GenerateOptions): Promise<void> {
  console.log("[INFO] Loading configuration for watch mode...");
  
  const { config: loadedConfig, filepath } = await loadConfig(options.config);
  if (filepath !== undefined) {
    console.log(`[INFO] Using config from: ${filepath}`);
  }
  const config = mergeConfig(loadedConfig, { config: options.config, output: options.output });

  // Initial generation
  await runGenerate(options);

  console.log("[INFO] Starting watch mode...");
  console.log("[INFO] Watching for changes in:", config.sourceGlobs);

  // Set up file watcher
  const watcher: FSWatcher = watch(config.sourceGlobs, {
    ignored: ["node_modules/**", "**/node_modules/**", `${config.outputDir}/**`],
    persistent: true,
    ignoreInitial: true,
  });

  // Debounce regeneration
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  const changedFiles = new Set<string>();

  const regenerate = async (): Promise<void> => {
    if (changedFiles.size === 0) {
      return;
    }

    const files = Array.from(changedFiles);
    changedFiles.clear();

    console.log(`[INFO] Regenerating due to changes in: ${files.join(", ")}`);

    try {
      // Rescan all source files to ensure complete context
      // This is safer than just scanning changed files, as test contexts may span multiple files
      const allSourceFiles = await collectSourceFiles(config.sourceGlobs);
      
      const ir = scanAllFiles(allSourceFiles);
      
      if (ir.suites.length > 0) {
        const { totalVitest, totalE2e } = generateAllTestFiles(
          ir,
          config.outputDir,
          config.vitestDir,
          config.e2eDir
        );
        console.log(`[INFO] Regenerated: ${totalVitest} Vitest file(s), ${totalE2e} Playwright file(s)`);
      }
    } catch (error) {
      console.error("[ERROR] Regeneration failed:", error);
    }
  };

  const scheduleRegenerate = (filePath: string): void => {
    changedFiles.add(filePath);
    
    if (debounceTimer !== null) {
      clearTimeout(debounceTimer);
    }
    
    debounceTimer = setTimeout(() => {
      void regenerate();
    }, 300);
  };

  watcher.on("change", (filePath) => {
    console.log(`[INFO] File changed: ${filePath}`);
    scheduleRegenerate(filePath);
  });

  watcher.on("add", (filePath) => {
    console.log(`[INFO] File added: ${filePath}`);
    scheduleRegenerate(filePath);
  });

  watcher.on("unlink", (filePath) => {
    console.log(`[INFO] File removed: ${filePath}`);
    // For now, we don't clean up generated files when source is removed
  });

  watcher.on("error", (error) => {
    console.error("[ERROR] Watch error:", error);
  });

  // Handle graceful shutdown
  process.on("SIGINT", () => {
    console.log("\n[INFO] Stopping watch mode...");
    void watcher.close();
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    console.log("\n[INFO] Stopping watch mode...");
    void watcher.close();
    process.exit(0);
  });
}

/**
 * Main validate function
 */
async function runValidate(options: ValidateOptions): Promise<void> {
  const outputFormat = options.format ?? "text";
  const shouldLogInfo = outputFormat === "text";

  if (shouldLogInfo) {
    console.log("[INFO] Loading configuration...");
  }
  
  const { config: loadedConfig, filepath } = await loadConfig(options.config);
  if (filepath !== undefined && shouldLogInfo) {
    console.log(`[INFO] Using config from: ${filepath}`);
  }
  const config = mergeConfig(loadedConfig, { config: options.config });

  if (shouldLogInfo) {
    console.log("[INFO] Scanning source files for validation...");
  }

  // Find all source files
  const sourceFiles = await collectSourceFiles(config.sourceGlobs);

  if (sourceFiles.length === 0) {
    if (shouldLogInfo) {
      console.log("[WARN] No source files found matching patterns:", config.sourceGlobs);
    } else {
      console.log(formatValidationResultAsJson({
        messages: [],
        errorCount: 0,
        warningCount: 0,
        infoCount: 0,
        valid: true,
      }));
    }
    return;
  }

  if (shouldLogInfo) {
    console.log(`[INFO] Found ${sourceFiles.length} source file(s)`);
    console.log("[INFO] Validating DSL usage...");
  }

  // Validate all files
  const validationOptions: ValidationOptions = {
    strict: options.strict,
    enforceUniqueTestIdsPerContext: true,
  };
  
  const result = validateFiles(sourceFiles, validationOptions);

  // Output results
  if (outputFormat === "json") {
    console.log(formatValidationResultAsJson(result));
  } else {
    console.log("");
    console.log(formatValidationResult(result));
  }

  // Exit with appropriate code
  if (!result.valid) {
    if (options.strict === true && shouldLogInfo) {
      console.log("[ERROR] Validation failed with --strict mode (errors or warnings found)");
    } else if (shouldLogInfo) {
      console.log("[ERROR] Validation failed (errors found)");
    }
    process.exit(1);
  } else {
    if (shouldLogInfo) {
      console.log("[INFO] Validation passed");
    }
    process.exit(0);
  }
}

const program = new Command();

program
  .name("testweaver")
  .description(
    "Context-based automatic test generation CLI tool for React/Vue/Svelte/HTML projects"
  )
  .version("0.1.0");

program
  .command("scan")
  .description("Scan source files and generate IR (Intermediate Representation)")
  .option("-c, --config <path>", "Path to config file")
  .option("-o, --output <file>", "Output file for IR")
  .option("-s, --silent", "Minimize console output")
  .action((options: ScanOptions) => {
    console.log("[INFO] Scanning sources...");
    console.log("[INFO] Options:", options);
    console.log("[INFO] Scan command not yet implemented");
  });

program
  .command("generate")
  .description("Generate test files from source files with DSL attributes")
  .option("-c, --config <path>", "Path to config file")
  .option("-o, --output <dir>", "Output directory for generated files")
  .option("-w, --watch", "Watch for changes and regenerate")
  .action((options: GenerateOptions) => {
    if (options.watch === true) {
      runWatch(options).catch((error: unknown) => {
        console.error("[ERROR] Watch mode failed:", error);
        process.exit(1);
      });
    } else {
      runGenerate(options).catch((error: unknown) => {
        console.error("[ERROR] Generation failed:", error);
        process.exit(1);
      });
    }
  });

program
  .command("validate")
  .description("Validate DSL usage and IR")
  .option("-c, --config <path>", "Path to config file")
  .option("-i, --ir <file>", "Path to IR file")
  .option("--strict", "Treat warnings as errors")
  .option("--format <type>", "Validation output format: text or json", "text")
  .action((options: ValidateOptions) => {
    runValidate(options).catch((error: unknown) => {
      console.error("[ERROR] Validation failed:", error);
      process.exit(1);
    });
  });

program.parse();
