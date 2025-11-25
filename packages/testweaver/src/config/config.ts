/**
 * TestWeaver Configuration Module
 *
 * Handles loading and merging configuration from files and CLI options.
 * Uses cosmiconfig for flexible config file loading.
 */

import { cosmiconfig } from "cosmiconfig";
import type { GeneratorConfig } from "../types/config.js";

/**
 * Loaded configuration structure from config files
 */
export interface LoadedConfig {
  /** Output directory for generated files */
  outputDir?: string;
  /** Glob patterns for source files to scan */
  sourceGlobs?: string[];
  /** Subdirectory for Vitest/unit tests */
  vitestDir?: string;
  /** Subdirectory for E2E tests */
  e2eDir?: string;
  /** Generator configurations */
  generators?: GeneratorConfig[];
}

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG: Required<Omit<LoadedConfig, "generators">> & { generators: GeneratorConfig[] } = {
  sourceGlobs: ["src/**/*.tsx", "src/**/*.jsx"],
  outputDir: "__generated__",
  vitestDir: "vitest",
  e2eDir: "e2e",
  generators: [
    { name: "vitest", type: "ui", outputDir: "__generated__/vitest" },
    { name: "playwright", type: "e2e", outputDir: "__generated__/e2e" },
  ],
};

/**
 * Merged configuration with all required fields
 */
export interface ResolvedConfig {
  sourceGlobs: string[];
  outputDir: string;
  vitestDir: string;
  e2eDir: string;
  generators: GeneratorConfig[];
}

/**
 * CLI options that can override config
 */
export interface ConfigCliOptions {
  config?: string | undefined;
  output?: string | undefined;
}

/**
 * Result from loading configuration
 */
export interface ConfigLoadResult {
  config: LoadedConfig;
  filepath?: string;
}

/**
 * Cosmiconfig explorer instance (cached for reuse)
 */
let explorerInstance: ReturnType<typeof cosmiconfig> | undefined;

/**
 * Gets or creates the cosmiconfig explorer
 */
function getExplorer(): ReturnType<typeof cosmiconfig> {
  if (explorerInstance === undefined) {
    explorerInstance = cosmiconfig("testweaver", {
      searchPlaces: [
        "testweaver.config.js",
        "testweaver.config.cjs",
        "testweaver.config.mjs",
        "testweaver.config.ts",
        "testweaver.config.json",
        "testgen.config.js",
        "testgen.config.cjs",
        "testgen.config.mjs",
        "testgen.config.ts",
        "testgen.config.json",
        ".testweaverrc",
        ".testweaverrc.json",
        ".testweaverrc.js",
        ".testweaverrc.cjs",
        "package.json",
      ],
    });
  }
  return explorerInstance;
}

/**
 * Loads configuration using cosmiconfig
 *
 * @param configPath - Optional explicit path to config file
 * @returns Promise resolving to loaded config and filepath
 */
export async function loadConfig(configPath?: string): Promise<ConfigLoadResult> {
  const explorer = getExplorer();

  try {
    const result = configPath !== undefined
      ? await explorer.load(configPath)
      : await explorer.search();

    if (result !== null && result.config !== undefined) {
      return {
        config: result.config as LoadedConfig,
        filepath: result.filepath,
      };
    }
  } catch (error) {
    if (configPath !== undefined) {
      // If explicit config path was specified, throw the error
      throw new Error(`Failed to load config from ${configPath}: ${String(error)}`);
    }
    // If searching failed, use defaults
  }

  return { config: {} };
}

/**
 * Merges loaded config with defaults and CLI options
 *
 * @param loaded - Config loaded from file
 * @param cliOptions - CLI options that can override config
 * @returns Fully resolved configuration
 */
export function mergeConfig(loaded: LoadedConfig, cliOptions: ConfigCliOptions = {}): ResolvedConfig {
  return {
    sourceGlobs: loaded.sourceGlobs ?? DEFAULT_CONFIG.sourceGlobs,
    outputDir: cliOptions.output ?? loaded.outputDir ?? DEFAULT_CONFIG.outputDir,
    vitestDir: loaded.vitestDir ?? DEFAULT_CONFIG.vitestDir,
    e2eDir: loaded.e2eDir ?? DEFAULT_CONFIG.e2eDir,
    generators: loaded.generators ?? DEFAULT_CONFIG.generators,
  };
}

/**
 * Loads and resolves configuration in one call
 *
 * @param cliOptions - CLI options including config path and overrides
 * @returns Promise resolving to fully resolved configuration
 */
export async function loadAndResolveConfig(cliOptions: ConfigCliOptions = {}): Promise<ResolvedConfig> {
  const { config } = await loadConfig(cliOptions.config);
  return mergeConfig(config, cliOptions);
}

/**
 * Helper function to define config with type safety (for config files)
 */
export function defineConfig(config: LoadedConfig): LoadedConfig {
  return config;
}

/**
 * Clears the cached explorer instance (useful for testing)
 */
export function clearConfigCache(): void {
  explorerInstance = undefined;
}
