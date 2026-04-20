/**
 * TestWeaver Validation Module
 *
 * This module exports validation utilities for DSL checking.
 */

export {
  validateFile,
  validateFiles,
  formatValidationResult,
  formatValidationResultAsJson,
  type ValidationMessage,
  type ValidationResult,
  type ValidationOptions,
  type ValidationSeverity,
  type ValidationOutputFormat,
} from "./validator.js";
