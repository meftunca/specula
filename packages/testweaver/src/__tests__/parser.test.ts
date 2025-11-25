/**
 * Tests for the TestWeaver parser
 */

import { describe, it, expect, beforeAll } from "vitest";
import * as path from "node:path";
import { scanFile } from "../core/parser.js";
import type { TestSuite } from "../types/ir.js";

// Path to the example Login.tsx component
const loginComponentPath = path.resolve(
  __dirname,
  "../../../../example-app/src/components/Login.tsx"
);

describe("Parser", () => {
  describe("scanFile", () => {
    let suites: TestSuite[];

    beforeAll(() => {
      suites = scanFile(loginComponentPath);
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

      it("should extract expectations", () => {
        expect(suites[0]?.cases[0]?.expectations.length).toBeGreaterThanOrEqual(2);
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
        expect(step?.source?.filePath).toContain("Login.tsx");
        expect(step?.source?.line).toBeGreaterThan(0);
        expect(step?.source?.via).toBe("attribute");
      });
    });
  });
});
