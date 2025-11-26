/**
 * Tests for the IR Validator
 */

import { describe, it, expect } from "vitest";
import { validateIR } from "../../generators/ir-validator.js";
import type { TestIR } from "../../types/ir.js";

const createValidTestIR = (): TestIR => ({
  version: 1,
  generatedAt: new Date().toISOString(),
  sourceRoot: "/test",
  suites: [
    {
      id: "test-suite",
      context: "test",
      sourceFiles: [{ filePath: "test.tsx", framework: "react", language: "tsx" }],
      cases: [
        {
          id: "test__case",
          context: "test",
          scenario: "case",
          type: "ui",
          definedAt: [{ filePath: "test.tsx", line: 1, column: 1, via: "attribute" }],
          steps: [
            {
              id: "step-1",
              action: "click",
              selector: { type: "testId", value: "button" },
            },
          ],
          expectations: [
            {
              id: "exp-1",
              type: "visible",
              selector: { type: "testId", value: "result" },
            },
          ],
        },
      ],
    },
  ],
});

describe("IR Validator", () => {
  describe("validateIR", () => {
    it("should validate a valid IR without errors", () => {
      const ir = createValidTestIR();
      const result = validateIR(ir);

      expect(result.valid).toBe(true);
      expect(result.errorCount).toBe(0);
    });

    it("should warn about unsupported IR version", () => {
      const ir = createValidTestIR();
      ir.version = 99 as 1;
      const result = validateIR(ir);

      const versionWarning = result.issues.find(
        (i) => i.message.includes("version") && i.severity === "warning"
      );
      expect(versionWarning).toBeDefined();
    });

    it("should report info when IR has no suites", () => {
      const ir = createValidTestIR();
      ir.suites = [];
      const result = validateIR(ir);

      const noSuitesInfo = result.issues.find(
        (i) => i.message.includes("no test suites") && i.severity === "info"
      );
      expect(noSuitesInfo).toBeDefined();
    });

    it("should warn about suite with no test cases", () => {
      const ir = createValidTestIR();
      ir.suites[0]!.cases = [];
      const result = validateIR(ir);

      const noCasesWarning = result.issues.find(
        (i) => i.message.includes("no test cases") && i.severity === "warning"
      );
      expect(noCasesWarning).toBeDefined();
    });

    it("should warn about test case with no steps or expectations", () => {
      const ir = createValidTestIR();
      ir.suites[0]!.cases[0]!.steps = [];
      ir.suites[0]!.cases[0]!.expectations = [];
      const result = validateIR(ir);

      const emptyCase = result.issues.find(
        (i) => i.message.includes("no steps or expectations") && i.severity === "info"
      );
      expect(emptyCase).toBeDefined();
    });

    it("should warn about step with unsupported action", () => {
      const ir = createValidTestIR();
      ir.suites[0]!.cases[0]!.steps[0]!.action = "invalidAction" as any;
      const result = validateIR(ir);

      const unsupportedAction = result.issues.find(
        (i) => i.message.includes("unsupported action") && i.severity === "warning"
      );
      expect(unsupportedAction).toBeDefined();
    });

    it("should warn about step missing value when required", () => {
      const ir = createValidTestIR();
      ir.suites[0]!.cases[0]!.steps[0] = {
        id: "step-1",
        action: "type",
        selector: { type: "testId", value: "input" },
        // value is missing
      };
      const result = validateIR(ir);

      const missingValue = result.issues.find(
        (i) => i.message.includes("missing a value") && i.severity === "warning"
      );
      expect(missingValue).toBeDefined();
    });

    it("should warn about expectation with unsupported type", () => {
      const ir = createValidTestIR();
      ir.suites[0]!.cases[0]!.expectations[0]!.type = "invalidType" as any;
      const result = validateIR(ir);

      const unsupportedType = result.issues.find(
        (i) => i.message.includes("unsupported type") && i.severity === "warning"
      );
      expect(unsupportedType).toBeDefined();
    });

    it("should warn about expectation missing value when required", () => {
      const ir = createValidTestIR();
      ir.suites[0]!.cases[0]!.expectations[0] = {
        id: "exp-1",
        type: "text",
        selector: { type: "testId", value: "message" },
        // value is missing
      };
      const result = validateIR(ir);

      const missingValue = result.issues.find(
        (i) => i.message.includes("missing a value") && i.severity === "warning"
      );
      expect(missingValue).toBeDefined();
    });

    it("should error on step missing selector", () => {
      const ir = createValidTestIR();
      // @ts-ignore - intentionally missing selector
      ir.suites[0]!.cases[0]!.steps[0]!.selector = undefined;
      const result = validateIR(ir);

      expect(result.valid).toBe(false);
      const missingSelector = result.issues.find(
        (i) => i.message.includes("missing a selector") && i.severity === "error"
      );
      expect(missingSelector).toBeDefined();
    });

    it("should not warn about url-contains expectation without selector", () => {
      const ir = createValidTestIR();
      ir.suites[0]!.cases[0]!.expectations = [
        {
          id: "exp-1",
          type: "url-contains",
          value: "/dashboard",
          // no selector needed for URL assertions
        },
      ];
      const result = validateIR(ir);

      const missingSelectorWarning = result.issues.find(
        (i) => i.message.includes("missing a selector") && i.message.includes("url-contains")
      );
      expect(missingSelectorWarning).toBeUndefined();
    });

    it("should validate new action types: select, hover, clear", () => {
      const ir = createValidTestIR();
      ir.suites[0]!.cases[0]!.steps = [
        { id: "step-1", action: "select", selector: { type: "testId", value: "dropdown" }, value: "option1" },
        { id: "step-2", action: "hover", selector: { type: "testId", value: "tooltip" } },
        { id: "step-3", action: "clear", selector: { type: "testId", value: "input" } },
      ];
      const result = validateIR(ir);

      expect(result.valid).toBe(true);
      const actionWarnings = result.issues.filter(
        (i) => i.message.includes("unsupported action")
      );
      expect(actionWarnings).toHaveLength(0);
    });

    it("should count errors and warnings correctly", () => {
      const ir = createValidTestIR();
      // Add an error (missing selector)
      // @ts-ignore
      ir.suites[0]!.cases[0]!.steps[0]!.selector = undefined;
      // Add a warning (missing value for type action)
      ir.suites[0]!.cases[0]!.steps.push({
        id: "step-2",
        action: "type",
        selector: { type: "testId", value: "input" },
        // value missing
      });

      const result = validateIR(ir);

      expect(result.errorCount).toBe(1);
      expect(result.warningCount).toBeGreaterThanOrEqual(1);
      expect(result.valid).toBe(false);
    });
  });
});
