/**
 * Tests for the TestWeaver parser
 */

import { describe, it, expect, beforeAll, vi } from "vitest";
import * as path from "node:path";
import { scanFile } from "../core/parser.js";
import type { TestSuite } from "../types/ir.js";

// Path to the mock Login component for testing (relative to this test file)
const mockLoginPath = path.resolve(__dirname, "./fixtures/MockLogin.tsx");
const mockEdgeCasesPath = path.resolve(
  __dirname,
  "./fixtures/MockParserEdgeCases.tsx"
);
const mockMultiComponentPath = path.resolve(
  __dirname,
  "./fixtures/MockMultiComponent.tsx"
);
const mockStatefulFlowPath = path.resolve(
  __dirname,
  "./fixtures/MockStatefulFlow.tsx"
);

describe("Parser", () => {
  describe("scanFile", () => {
    let suites: TestSuite[];

    beforeAll(() => {
      suites = scanFile(mockLoginPath);
    });

    it("should extract one TestSuite from Login.tsx", () => {
      expect(suites).toHaveLength(1);
    });

    it("should extract correct context", () => {
      expect(suites[0]?.context).toBe("login");
    });

    it("should extract correct sourceFiles", () => {
      expect(suites[0]?.sourceFiles).toHaveLength(1);
      expect(suites[0]?.sourceFiles[0]?.framework).toBe("react");
      expect(suites[0]?.sourceFiles[0]?.language).toBe("tsx");
    });

    it("should extract one TestCase", () => {
      expect(suites[0]?.cases).toHaveLength(1);
    });

    describe("TestCase", () => {
      it("should have correct id", () => {
        expect(suites[0]?.cases[0]?.id).toBe("login__happy-path");
      });

      it("should have correct scenario", () => {
        expect(suites[0]?.cases[0]?.scenario).toBe("happy-path");
      });

      it("should have route", () => {
        expect(suites[0]?.cases[0]?.route).toBe("/login");
      });

      it("should be type e2e (since it has route)", () => {
        expect(suites[0]?.cases[0]?.type).toBe("e2e");
      });

      it("should extract 3 steps", () => {
        expect(suites[0]?.cases[0]?.steps).toHaveLength(3);
      });

      it("should extract correct step actions and values", () => {
        const steps = suites[0]?.cases[0]?.steps ?? [];

        // Step 1: type:user@example.com on email
        expect(steps[0]?.action).toBe("type");
        expect(steps[0]?.value).toBe("user@example.com");
        expect(steps[0]?.selector.type).toBe("testId");
        expect(steps[0]?.selector.value).toBe("email");

        // Step 2: type:123456 on password
        expect(steps[1]?.action).toBe("type");
        expect(steps[1]?.value).toBe("123456");
        expect(steps[1]?.selector.type).toBe("testId");
        expect(steps[1]?.selector.value).toBe("password");

        // Step 3: click on submit
        expect(steps[2]?.action).toBe("click");
        expect(steps[2]?.value).toBeUndefined();
        expect(steps[2]?.selector.type).toBe("testId");
        expect(steps[2]?.selector.value).toBe("submit");
      });

      it("should extract 2 expectations", () => {
        // MockLogin only has visible and text expectations for success-message
        expect(suites[0]?.cases[0]?.expectations).toHaveLength(2);
      });

      it("should extract visible and text expectations from success-message", () => {
        const expectations = suites[0]?.cases[0]?.expectations ?? [];

        // Find expectations for success-message
        const successExpectations = expectations.filter(
          (e) => e.selector?.value === "success-message"
        );

        expect(successExpectations).toHaveLength(2);

        const visibleExp = successExpectations.find((e) => e.type === "visible");
        expect(visibleExp).toBeDefined();

        const textExp = successExpectations.find((e) => e.type === "text");
        expect(textExp).toBeDefined();
        expect(textExp?.value).toBe("Welcome");
      });

      it("should include LocationRef in steps and expectations", () => {
        const step = suites[0]?.cases[0]?.steps[0];
        expect(step?.source).toBeDefined();
        expect(step?.source?.filePath).toContain("MockLogin.tsx");
        expect(step?.source?.line).toBeGreaterThan(0);
        expect(step?.source?.via).toBe("attribute");
      });

      it("should infer the owning component metadata", () => {
        expect(suites[0]?.cases[0]?.meta?.componentName).toBe("MockLogin");
        expect(suites[0]?.cases[0]?.meta?.importPath).toContain("MockLogin.tsx");
      });
    });

    describe("edge cases", () => {
      let edgeSuites: TestSuite[];

      beforeAll(() => {
        edgeSuites = scanFile(mockEdgeCasesPath);
      });

      it("should extract nested contexts as separate suites without leaking child steps", () => {
        expect(edgeSuites).toHaveLength(2);

        const parentSuite = edgeSuites.find((suite) => suite.context === "search");
        const nestedSuite = edgeSuites.find(
          (suite) => suite.context === "search-filters"
        );

        expect(parentSuite).toBeDefined();
        expect(nestedSuite).toBeDefined();

        const parentStepSelectors = parentSuite?.cases[0]?.steps.map(
          (step) => step.selector.value
        );
        expect(parentStepSelectors).not.toContain("open-filters");

        expect(nestedSuite?.cases[0]?.steps).toHaveLength(1);
        expect(nestedSuite?.cases[0]?.steps[0]?.selector.value).toBe("open-filters");
      });

      it("should normalize special step actions like waitFor and submitContext", () => {
        const parentSuite = edgeSuites.find((suite) => suite.context === "search");
        const actions = parentSuite?.cases[0]?.steps.map((step) => step.action) ?? [];

        expect(actions).toContain("waitFor");
        expect(actions).toContain("submitContext");
      });

      it("should respect selector precedence and fallback order", () => {
        const parentSuite = edgeSuites.find((suite) => suite.context === "search");
        const steps = parentSuite?.cases[0]?.steps ?? [];

        expect(steps[0]?.selector).toEqual({ type: "role", value: "searchbox" });
        expect(steps[2]?.selector).toEqual({ type: "labelText", value: "Apply filters" });
        expect(steps[3]?.selector).toEqual({ type: "placeholder", value: "Search products" });
        expect(steps[4]?.selector).toEqual({ type: "testId", value: "priority-button" });
      });

      it("should keep selector-less URL expectations", () => {
        const parentSuite = edgeSuites.find((suite) => suite.context === "search");
        const expectations = parentSuite?.cases[0]?.expectations ?? [];

        expect(expectations).toHaveLength(1);
        expect(expectations[0]).toMatchObject({
          type: "url-contains",
          value: "/search/results",
        });
        expect(expectations[0]?.selector).toBeUndefined();
      });

      it("should warn and skip steps that do not have any selector", () => {
        const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);

        const warnedSuites = scanFile(mockEdgeCasesPath);
        const parentSuite = warnedSuites.find((suite) => suite.context === "search");
        const selectorValues = parentSuite?.cases[0]?.steps.map(
          (step) => step.selector.value
        ) ?? [];

        expect(warnSpy).toHaveBeenCalledTimes(1);
        expect(selectorValues).not.toContain("");

        warnSpy.mockRestore();
      });

      it("should produce deterministic output for repeated scans", () => {
        const first = scanFile(mockEdgeCasesPath);
        const second = scanFile(mockEdgeCasesPath);

        expect(second).toEqual(first);
      });

      it("should infer the correct component for each exported context owner", () => {
        const multiSuites = scanFile(mockMultiComponentPath);
        const alphaSuite = multiSuites.find((suite) => suite.context === "alpha");
        const betaSuite = multiSuites.find((suite) => suite.context === "beta");

        expect(alphaSuite?.cases[0]?.meta?.componentName).toBe("AlphaPanel");
        expect(betaSuite?.cases[0]?.meta?.componentName).toBe("BetaPanel");
      });

      it("should preserve UI state as separate cases for repeated scenarios", () => {
        const statefulSuites = scanFile(mockStatefulFlowPath);
        const loginSuite = statefulSuites.find((suite) => suite.context === "login");

        expect(loginSuite).toBeDefined();
        expect(loginSuite?.cases).toHaveLength(2);

        const successCase = loginSuite?.cases.find((testCase) => testCase.state === "success");
        const errorCase = loginSuite?.cases.find((testCase) => testCase.state === "error");

        expect(successCase?.id).toBe("login__submit__success");
        expect(errorCase?.id).toBe("login__submit__error");
        expect(successCase?.expectations.map((expectation) => expectation.selector?.value)).toContain("success-banner");
        expect(errorCase?.expectations.map((expectation) => expectation.selector?.value)).toContain("error-banner");
      });
    });
  });
});
