/**
 * Tests for the TestWeaver CLI
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { execSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";

// Paths for testing
const testweaverRoot = path.resolve(__dirname, "../../../");
const fixturesDir = path.resolve(__dirname, "../fixtures");
const testOutputDir = path.resolve(fixturesDir, "__test_generated__");
const invalidFixturePath = path.resolve(fixturesDir, "__invalid_validate__.tsx");
const invalidConfigPath = path.resolve(fixturesDir, "testweaver.invalid.config.json");
const branchFixturePath = path.resolve(fixturesDir, "__duplicate_branch__.tsx");
const branchConfigPath = path.resolve(fixturesDir, "testweaver.branch.config.json");
const stateFixturePath = path.resolve(fixturesDir, "__stateful_branch__.tsx");
const stateConfigPath = path.resolve(fixturesDir, "testweaver.stateful.config.json");

// CLI path
const cliPath = path.resolve(testweaverRoot, "dist/cli/index.js");

// Create a temporary config file for tests
const testConfigPath = path.resolve(fixturesDir, "testweaver.config.json");
const testConfig = {
  sourceGlobs: ["MockLogin.tsx"],
  outputDir: "__test_generated__",
};

const invalidValidateConfig = {
  sourceGlobs: [path.basename(invalidFixturePath)],
  outputDir: "__test_generated__",
};

const branchConfig = {
  sourceGlobs: [path.basename(branchFixturePath)],
  outputDir: "__test_generated__",
};

const stateConfig = {
  sourceGlobs: [path.basename(stateFixturePath)],
  outputDir: "__test_generated__",
};

describe("CLI", () => {
  beforeAll(() => {
    // Build if needed. Full test runs already build before invoking vitest.
    if (!fs.existsSync(cliPath)) {
      execSync("npm run build", { cwd: testweaverRoot });
    }
    
    // Clean up any previous test output
    if (fs.existsSync(testOutputDir)) {
      fs.rmSync(testOutputDir, { recursive: true, force: true });
    }

    // Create test config file
    fs.writeFileSync(testConfigPath, JSON.stringify(testConfig, null, 2));
    fs.writeFileSync(
      invalidFixturePath,
      `
      export function InvalidValidateFixture() {
        return (
          <div data-test-context="invalid" data-test-scenario="broken">
            <button data-test-step="tap" />
          </div>
        );
      }
      `
    );
    fs.writeFileSync(invalidConfigPath, JSON.stringify(invalidValidateConfig, null, 2));
    fs.writeFileSync(
      branchFixturePath,
      `
      export function BranchFlow() {
        return (
          <>
            <section data-test-context="checkout" data-test-scenario="happy-path">
              <button data-test-id="submit-order" data-test-step="click">Submit</button>
            </section>
            <section data-test-context="checkout" data-test-scenario="happy-path">
              <div data-test-id="success-banner" data-test-expect="visible; text:Order complete">
                Order complete
              </div>
            </section>
          </>
        );
      }
      `
    );
    fs.writeFileSync(branchConfigPath, JSON.stringify(branchConfig, null, 2));
    fs.writeFileSync(
      stateFixturePath,
      `
      export function StatefulBranchFlow() {
        return (
          <>
            <section data-test-context="checkout" data-test-scenario="submit-order" data-test-state="success">
              <button data-test-id="submit-order" data-test-step="click">Submit</button>
              <div data-test-id="success-banner" data-test-expect="visible; text:Order complete">Order complete</div>
            </section>
            <section data-test-context="checkout" data-test-scenario="submit-order" data-test-state="error">
              <button data-test-id="submit-order" data-test-step="click">Submit</button>
              <div data-test-id="error-banner" data-test-expect="visible; text:Payment failed">Payment failed</div>
            </section>
          </>
        );
      }
      `
    );
    fs.writeFileSync(stateConfigPath, JSON.stringify(stateConfig, null, 2));
  });

  afterAll(() => {
    // Clean up test output
    if (fs.existsSync(testOutputDir)) {
      fs.rmSync(testOutputDir, { recursive: true, force: true });
    }
    // Clean up test config
    if (fs.existsSync(testConfigPath)) {
      fs.rmSync(testConfigPath);
    }
    if (fs.existsSync(invalidFixturePath)) {
      fs.rmSync(invalidFixturePath);
    }
    if (fs.existsSync(invalidConfigPath)) {
      fs.rmSync(invalidConfigPath);
    }
    if (fs.existsSync(branchFixturePath)) {
      fs.rmSync(branchFixturePath);
    }
    if (fs.existsSync(branchConfigPath)) {
      fs.rmSync(branchConfigPath);
    }
    if (fs.existsSync(stateFixturePath)) {
      fs.rmSync(stateFixturePath);
    }
    if (fs.existsSync(stateConfigPath)) {
      fs.rmSync(stateConfigPath);
    }
  });

  describe("generate command", () => {
    it("should display help for generate command", () => {
      const result = execSync(`node ${cliPath} generate --help`, {
        encoding: "utf-8",
      });

      expect(result).toContain("Generate test files from source files");
      expect(result).toContain("-c, --config <path>");
      expect(result).toContain("-o, --output <dir>");
      expect(result).toContain("-w, --watch");
    });

    it("should generate vitest and playwright test files", () => {
      // Run generate command with test config
      const result = execSync(
        `node ${cliPath} generate --config ${testConfigPath}`,
        {
          cwd: fixturesDir,
          encoding: "utf-8",
        }
      );

      // Check output messages
      expect(result).toContain("[INFO] Loading configuration...");
      expect(result).toContain("[INFO] Scanning source files...");
      expect(result).toContain("[INFO] Found 1 source file(s)");

      // Check that vitest directory was created
      const vitestDir = path.join(testOutputDir, "vitest");
      expect(fs.existsSync(vitestDir)).toBe(true);

      // Check that e2e directory was created
      const e2eDir = path.join(testOutputDir, "e2e");
      expect(fs.existsSync(e2eDir)).toBe(true);
    });

    it("should generate files with auto-generated header", () => {
      const vitestDir = path.join(testOutputDir, "vitest");
      const files = fs.readdirSync(vitestDir);
      
      expect(files.length).toBeGreaterThan(0);
      
      const firstFile = path.join(vitestDir, files[0]!);
      const content = fs.readFileSync(firstFile, "utf-8");
      
      expect(content).toContain("// Auto-generated by TestWeaver. DO NOT EDIT.");
    });

    it("should generate vitest files with correct imports", () => {
      const vitestDir = path.join(testOutputDir, "vitest");
      const files = fs.readdirSync(vitestDir);
      const firstFile = path.join(vitestDir, files[0]!);
      const content = fs.readFileSync(firstFile, "utf-8");

      expect(content).toContain("@testing-library/react");
      expect(content).toContain("@testing-library/jest-dom");
      expect(content).toContain("describe(");
      expect(content).toContain("it(");
    });

    it("should generate playwright files with correct imports", () => {
      const e2eDir = path.join(testOutputDir, "e2e");
      const files = fs.readdirSync(e2eDir);
      const firstFile = path.join(e2eDir, files[0]!);
      const content = fs.readFileSync(firstFile, "utf-8");

      expect(content).toContain("@playwright/test");
      expect(content).toContain("test.describe(");
      expect(content).toContain("test(");
      expect(content).toContain("page.goto");
    });

    it("should not overwrite unchanged files", () => {
      const vitestDir = path.join(testOutputDir, "vitest");
      const files = fs.readdirSync(vitestDir);
      const firstFile = path.join(vitestDir, files[0]!);
      
      // Get initial modification time
      const initialStats = fs.statSync(firstFile);
      const initialMtime = initialStats.mtimeMs;
      
      // Wait a bit to ensure time difference
      const waitTime = 100;
      const startTime = Date.now();
      while (Date.now() - startTime < waitTime) {
        // busy wait
      }
      
      // Run generate again
      execSync(`node ${cliPath} generate --config ${testConfigPath}`, {
        cwd: fixturesDir,
        encoding: "utf-8",
      });
      
      // Get new modification time
      const newStats = fs.statSync(firstFile);
      const newMtime = newStats.mtimeMs;
      
      // File should not have been modified (same content)
      expect(newMtime).toBe(initialMtime);
    });

    it("should merge duplicate context and scenario branches into one generated file", () => {
      execSync(`node ${cliPath} generate --config ${branchConfigPath}`, {
        cwd: fixturesDir,
        encoding: "utf-8",
      });

      const vitestFilePath = path.join(testOutputDir, "vitest", "checkout.happy-path.test.tsx");
      const content = fs.readFileSync(vitestFilePath, "utf-8");

      expect(content).toContain('import { BranchFlow } from "../../__duplicate_branch__.tsx";');
      expect(content).toContain("fireEvent.click(submitOrder());");
      expect(content).toContain('expect(successBanner()).toHaveTextContent("Order complete");');
    });

    it("should generate separate files for state-tagged scenario branches", () => {
      execSync(`node ${cliPath} generate --config ${stateConfigPath}`, {
        cwd: fixturesDir,
        encoding: "utf-8",
      });

      const successFilePath = path.join(testOutputDir, "vitest", "checkout.submit-order.success.test.tsx");
      const errorFilePath = path.join(testOutputDir, "vitest", "checkout.submit-order.error.test.tsx");

      expect(fs.existsSync(successFilePath)).toBe(true);
      expect(fs.existsSync(errorFilePath)).toBe(true);

      const successContent = fs.readFileSync(successFilePath, "utf-8");
      const errorContent = fs.readFileSync(errorFilePath, "utf-8");

      expect(successContent).toContain('it("submit-order (success)", async () => {');
      expect(successContent).toContain('expect(successBanner()).toHaveTextContent("Order complete");');
      expect(errorContent).toContain('it("submit-order (error)", async () => {');
      expect(errorContent).toContain('expect(errorBanner()).toHaveTextContent("Payment failed");');
    });
  });

  describe("version and help", () => {
    it("should display version", () => {
      const result = execSync(`node ${cliPath} --version`, {
        encoding: "utf-8",
      });

      expect(result.trim()).toBe("0.1.0");
    });

    it("should display main help", () => {
      const result = execSync(`node ${cliPath} --help`, {
        encoding: "utf-8",
      });

      expect(result).toContain("testweaver");
      expect(result).toContain("generate");
      expect(result).toContain("scan");
      expect(result).toContain("validate");
    });
  });

  describe("validate command", () => {
    it("should display help for validate command", () => {
      const result = execSync(`node ${cliPath} validate --help`, {
        encoding: "utf-8",
      });

      expect(result).toContain("Validate DSL usage and IR");
      expect(result).toContain("--strict");
      expect(result).toContain("--format <type>");
    });

    it("should print helpful text validation output", () => {
      let output = "";

      try {
        execSync(`node ${cliPath} validate --config ${invalidConfigPath}`, {
          cwd: fixturesDir,
          encoding: "utf-8",
          stdio: "pipe",
        });
      } catch (error) {
        output = String((error as { stdout?: string }).stdout ?? "");
      }

      expect(output).toContain("[ERROR]");
      expect(output).toContain("[invalid-action]");
      expect(output).toContain("suggestion:");
    });

    it("should print JSON validation output when requested", () => {
      let output = "";

      try {
        execSync(`node ${cliPath} validate --config ${invalidConfigPath} --format json`, {
          cwd: fixturesDir,
          encoding: "utf-8",
          stdio: "pipe",
        });
      } catch (error) {
        output = String((error as { stdout?: string }).stdout ?? "");
      }

      const parsed = JSON.parse(output) as {
        valid: boolean;
        errorCount: number;
        messages: Array<{ ruleId: string; suggestion?: string }>;
      };

      expect(parsed.valid).toBe(false);
      expect(parsed.errorCount).toBeGreaterThan(0);
      expect(parsed.messages.some((message) => message.ruleId === "invalid-action")).toBe(true);
      expect(parsed.messages.some((message) => typeof message.suggestion === "string")).toBe(true);
    });
  });
});
