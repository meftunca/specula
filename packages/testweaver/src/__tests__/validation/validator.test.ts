/**
 * Tests for the TestWeaver validation module
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import {
  validateFile,
  validateFiles,
  formatValidationResult,
} from "../../validation/validator.js";

// Create temp directory for test fixtures
const tempDir = path.resolve(__dirname, "__temp_validation_fixtures__");

describe("Validation", () => {
  beforeAll(() => {
    fs.mkdirSync(tempDir, { recursive: true });
  });

  afterAll(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe("validateFile", () => {
    it("should return no errors for valid DSL", () => {
      const filePath = path.join(tempDir, "valid.tsx");
      fs.writeFileSync(
        filePath,
        `
        export function ValidComponent() {
          return (
            <div
              data-test-context="valid"
              data-test-scenario="test"
            >
              <input data-test-id="email" data-test-step="type:test@example.com" />
              <button data-test-id="submit" data-test-step="click" />
              <div data-test-id="result" data-test-expect="visible; text:Success" />
            </div>
          );
        }
      `
      );

      const messages = validateFile(filePath);
      const errors = messages.filter((m) => m.severity === "error");
      expect(errors).toHaveLength(0);
    });

    it("should detect invalid action names", () => {
      const filePath = path.join(tempDir, "invalid-action.tsx");
      fs.writeFileSync(
        filePath,
        `
        export function InvalidComponent() {
          return (
            <div data-test-context="test" data-test-scenario="test">
              <input data-test-id="field" data-test-step="tap:value" />
            </div>
          );
        }
      `
      );

      const messages = validateFile(filePath);
      const errors = messages.filter((m) => m.severity === "error");
      expect(errors).toHaveLength(1);
      expect(errors[0]?.message).toContain('Invalid action "tap"');
      expect(errors[0]?.ruleId).toBe("invalid-action");
    });

    it("should detect invalid expectation types", () => {
      const filePath = path.join(tempDir, "invalid-expect.tsx");
      fs.writeFileSync(
        filePath,
        `
        export function InvalidComponent() {
          return (
            <div data-test-context="test" data-test-scenario="test">
              <div data-test-id="result" data-test-expect="invalid-type" />
            </div>
          );
        }
      `
      );

      const messages = validateFile(filePath);
      const errors = messages.filter((m) => m.severity === "error");
      expect(errors).toHaveLength(1);
      expect(errors[0]?.message).toContain('Invalid expectation type "invalid-type"');
      expect(errors[0]?.ruleId).toBe("invalid-expectation");
    });

    it("should warn about duplicate test IDs in same context", () => {
      const filePath = path.join(tempDir, "duplicate-id.tsx");
      fs.writeFileSync(
        filePath,
        `
        export function DuplicateComponent() {
          return (
            <div data-test-context="test" data-test-scenario="test">
              <input data-test-id="field" data-test-step="type:value1" />
              <input data-test-id="field" data-test-step="type:value2" />
            </div>
          );
        }
      `
      );

      const messages = validateFile(filePath);
      const warnings = messages.filter((m) => m.severity === "warning");
      expect(warnings.length).toBeGreaterThanOrEqual(1);
      const dupWarning = warnings.find((w) => w.ruleId === "duplicate-test-id");
      expect(dupWarning).toBeDefined();
      expect(dupWarning?.message).toContain('Duplicate data-test-id "field"');
    });

    it("should warn about steps without test ID", () => {
      const filePath = path.join(tempDir, "step-no-id.tsx");
      fs.writeFileSync(
        filePath,
        `
        export function NoIdComponent() {
          return (
            <div data-test-context="test" data-test-scenario="test">
              <input data-test-step="type:value" />
            </div>
          );
        }
      `
      );

      const messages = validateFile(filePath);
      const warnings = messages.filter((m) => m.severity === "warning");
      expect(warnings.length).toBeGreaterThanOrEqual(1);
      const stepWarning = warnings.find((w) => w.ruleId === "step-missing-id");
      expect(stepWarning).toBeDefined();
    });

    it("should validate multiple actions in a single step", () => {
      const filePath = path.join(tempDir, "multi-action.tsx");
      fs.writeFileSync(
        filePath,
        `
        export function MultiActionComponent() {
          return (
            <div data-test-context="test" data-test-scenario="test">
              <input data-test-id="field" data-test-step="type:hello; click; swipe" />
            </div>
          );
        }
      `
      );

      const messages = validateFile(filePath);
      const errors = messages.filter((m) => m.severity === "error");
      expect(errors).toHaveLength(1);
      expect(errors[0]?.message).toContain('Invalid action "swipe"');
    });

    it("should accept all valid actions", () => {
      const filePath = path.join(tempDir, "all-valid-actions.tsx");
      fs.writeFileSync(
        filePath,
        `
        export function AllActionsComponent() {
          return (
            <div data-test-context="test" data-test-scenario="test">
              <input data-test-id="f1" data-test-step="click" />
              <input data-test-id="f2" data-test-step="type:value" />
              <input data-test-id="f3" data-test-step="change:value" />
              <input data-test-id="f4" data-test-step="focus" />
              <input data-test-id="f5" data-test-step="blur" />
              <input data-test-id="f6" data-test-step="key:Enter" />
              <input data-test-id="f7" data-test-step="waitFor" />
              <input data-test-id="f8" data-test-step="submitContext" />
              <input data-test-id="f9" data-test-step="custom:something" />
            </div>
          );
        }
      `
      );

      const messages = validateFile(filePath);
      const errors = messages.filter((m) => m.severity === "error");
      expect(errors).toHaveLength(0);
    });

    it("should accept all valid expectation types", () => {
      const filePath = path.join(tempDir, "all-valid-expects.tsx");
      fs.writeFileSync(
        filePath,
        `
        export function AllExpectsComponent() {
          return (
            <div data-test-context="test" data-test-scenario="test">
              <div data-test-id="e1" data-test-expect="visible" />
              <div data-test-id="e2" data-test-expect="not-visible" />
              <div data-test-id="e3" data-test-expect="exists" />
              <div data-test-id="e4" data-test-expect="not-exists" />
              <div data-test-id="e5" data-test-expect="text:Hello" />
              <div data-test-id="e6" data-test-expect="exact-text:Hello" />
              <div data-test-id="e7" data-test-expect="value:123" />
              <div data-test-id="e8" data-test-expect="has-class:active" />
              <div data-test-id="e9" data-test-expect="not-has-class:disabled" />
              <div data-test-id="e10" data-test-expect="aria:label" />
              <div data-test-id="e11" data-test-expect="url-contains:/test" />
              <div data-test-id="e12" data-test-expect="url-exact:/test/page" />
              <div data-test-id="e13" data-test-expect="snapshot" />
              <div data-test-id="e14" data-test-expect="custom:something" />
            </div>
          );
        }
      `
      );

      const messages = validateFile(filePath);
      const errors = messages.filter((m) => m.severity === "error");
      expect(errors).toHaveLength(0);
    });
  });

  describe("validateFiles", () => {
    it("should aggregate results from multiple files", () => {
      const file1 = path.join(tempDir, "multi1.tsx");
      const file2 = path.join(tempDir, "multi2.tsx");

      fs.writeFileSync(
        file1,
        `
        export function Comp1() {
          return (
            <div data-test-context="test" data-test-scenario="test">
              <input data-test-id="field" data-test-step="invalid-action" />
            </div>
          );
        }
      `
      );

      fs.writeFileSync(
        file2,
        `
        export function Comp2() {
          return (
            <div data-test-context="test" data-test-scenario="test">
              <div data-test-id="result" data-test-expect="invalid-type" />
            </div>
          );
        }
      `
      );

      const result = validateFiles([file1, file2]);
      expect(result.errorCount).toBe(2);
      expect(result.messages).toHaveLength(2);
      expect(result.valid).toBe(false);
    });

    it("should respect strict mode for warnings", () => {
      const filePath = path.join(tempDir, "strict-mode.tsx");
      fs.writeFileSync(
        filePath,
        `
        export function StrictComp() {
          return (
            <div data-test-context="test" data-test-scenario="test">
              <input data-test-step="type:value" />
            </div>
          );
        }
      `
      );

      // Without strict mode
      const normalResult = validateFiles([filePath], { strict: false });
      expect(normalResult.warningCount).toBeGreaterThanOrEqual(1);
      expect(normalResult.valid).toBe(true);

      // With strict mode
      const strictResult = validateFiles([filePath], { strict: true });
      expect(strictResult.warningCount).toBeGreaterThanOrEqual(1);
      expect(strictResult.valid).toBe(false);
    });
  });

  describe("formatValidationResult", () => {
    it("should format messages correctly", () => {
      const result = validateFiles([]);
      const formatted = formatValidationResult(result);
      expect(formatted).toContain("Validation complete:");
      expect(formatted).toContain("0 error(s)");
    });
  });
});
