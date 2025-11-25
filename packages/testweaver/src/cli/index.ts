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
import { cosmiconfig } from "cosmiconfig";
import { scanFile } from "../core/parser.js";
import {
  generateVitest,
  generateVitestFileName,
  generatePlaywright,
  generatePlaywrightFileName,
} from "../generators/index.js";
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
}

/**
 * Loaded configuration structure
 */
interface LoadedConfig {
  sourceGlobs?: string[];
  outputDir?: string;
  vitestDir?: string;
  e2eDir?: string;
}

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: Required<LoadedConfig> = {
  sourceGlobs: ["src/**/*.tsx", "src/**/*.jsx"],
  outputDir: "__generated__",
  vitestDir: "vitest",
  e2eDir: "e2e",
};

/**
 * Loads configuration using cosmiconfig
 */
async function loadConfig(configPath?: string): Promise<LoadedConfig> {
  const explorer = cosmiconfig("testweaver");

  try {
    const result = configPath !== undefined
      ? await explorer.load(configPath)
      : await explorer.search();

    if (result !== null && result.config !== undefined) {
      return result.config as LoadedConfig;
    }
  } catch (error) {
    if (configPath !== undefined) {
      console.error(`[ERROR] Failed to load config from ${configPath}:`, error);
      throw error;
    }
    // If no config path was specified and search failed, use defaults
  }

  return {};
}

/**
 * Merges loaded config with defaults
 */
function mergeConfig(loaded: LoadedConfig, cliOptions: GenerateOptions): Required<LoadedConfig> {
  return {
    sourceGlobs: loaded.sourceGlobs ?? DEFAULT_CONFIG.sourceGlobs,
    outputDir: cliOptions.output ?? loaded.outputDir ?? DEFAULT_CONFIG.outputDir,
    vitestDir: loaded.vitestDir ?? DEFAULT_CONFIG.vitestDir,
    e2eDir: loaded.e2eDir ?? DEFAULT_CONFIG.e2eDir,
  };
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
 * Scans all source files and merges them into a unified TestIR
 */
function scanAllFiles(sourceFiles: string[]): TestIR {
  const suites: TestSuite[] = [];
  const suiteMap = new Map<string, TestSuite>();

  for (const filePath of sourceFiles) {
    try {
      const fileSuites = scanFile(filePath);
      
      for (const suite of fileSuites) {
        const existing = suiteMap.get(suite.context);
        if (existing !== undefined) {
          // Merge cases from this suite into the existing one, avoiding duplicates
          for (const newCase of suite.cases) {
            const caseExists = existing.cases.some(
              (c) => c.id === newCase.id
            );
            if (!caseExists) {
              existing.cases.push(newCase);
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
    suites,
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
      const vitestContent = generateVitest({
        ...suite,
        cases: [testCase],
      });
      const vitestFileName = generateVitestFileName(testCase);
      const vitestFilePath = path.join(vitestOutDir, vitestFileName);

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
  
  const loadedConfig = await loadConfig(options.config);
  const config = mergeConfig(loadedConfig, options);

  console.log("[INFO] Scanning source files...");

  // Find all source files
  const sourceFiles: string[] = [];
  for (const pattern of config.sourceGlobs) {
    const matches = await glob(pattern, { ignore: ["node_modules/**", "**/node_modules/**"] });
    sourceFiles.push(...matches);
  }

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
  
  const loadedConfig = await loadConfig(options.config);
  const config = mergeConfig(loadedConfig, options);

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
      const allSourceFiles: string[] = [];
      for (const pattern of config.sourceGlobs) {
        const matches = await glob(pattern, { ignore: ["node_modules/**", "**/node_modules/**"] });
        allSourceFiles.push(...matches);
      }
      
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
  .action((options: ValidateOptions) => {
    console.log("[INFO] Validating...");
    console.log("[INFO] Options:", options);
    console.log("[INFO] Validate command not yet implemented");
  });

program.parse();
