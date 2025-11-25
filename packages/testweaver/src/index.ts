/**
 * TestWeaver - Context-based automatic test generation
 *
 * This module exports all public APIs for the TestWeaver library.
 */

// Export all types
export * from "./types/index.js";

// Export parser
export { scanFile } from "./core/parser.js";

// Export generators
export {
  generateVitest,
  generateVitestFileName,
  generatePlaywright,
  generatePlaywrightFileName,
} from "./generators/index.js";
