/**
 * TestWeaver Config Module
 *
 * This module exports configuration loading utilities.
 */

export {
  loadConfig,
  mergeConfig,
  loadAndResolveConfig,
  defineConfig,
  clearConfigCache,
  DEFAULT_CONFIG,
  type LoadedConfig,
  type ResolvedConfig,
  type ConfigCliOptions,
  type ConfigLoadResult,
} from "./config.js";
