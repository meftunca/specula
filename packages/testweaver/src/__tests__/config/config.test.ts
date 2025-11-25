/**
 * Tests for the TestWeaver configuration module
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import {
  loadConfig,
  mergeConfig,
  defineConfig,
  clearConfigCache,
  DEFAULT_CONFIG,
} from "../../config/config.js";

// Create temp directory for test fixtures
const tempDir = path.resolve(__dirname, "__temp_config_fixtures__");

describe("Config", () => {
  beforeAll(() => {
    fs.mkdirSync(tempDir, { recursive: true });
  });

  afterAll(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  beforeEach(() => {
    clearConfigCache();
  });

  describe("DEFAULT_CONFIG", () => {
    it("should have correct default values", () => {
      expect(DEFAULT_CONFIG.sourceGlobs).toEqual(["src/**/*.tsx", "src/**/*.jsx"]);
      expect(DEFAULT_CONFIG.outputDir).toBe("__generated__");
      expect(DEFAULT_CONFIG.vitestDir).toBe("vitest");
      expect(DEFAULT_CONFIG.e2eDir).toBe("e2e");
      expect(DEFAULT_CONFIG.generators).toHaveLength(2);
    });
  });

  describe("loadConfig", () => {
    it("should load config from explicit path", async () => {
      const configPath = path.join(tempDir, "explicit.config.json");
      fs.writeFileSync(
        configPath,
        JSON.stringify({
          outputDir: "explicit-output",
        })
      );

      const result = await loadConfig(configPath);
      expect(result.config.outputDir).toBe("explicit-output");
      expect(result.filepath).toBe(configPath);
    });

    it("should throw error for invalid explicit config path", async () => {
      await expect(loadConfig("/non/existent/config.json")).rejects.toThrow();
    });

    it("should load testweaver.config.json by explicit path", async () => {
      const configPath = path.join(tempDir, "testweaver.config.json");
      fs.writeFileSync(
        configPath,
        JSON.stringify({
          outputDir: "testweaver-output",
        })
      );

      const result = await loadConfig(configPath);
      expect(result.config.outputDir).toBe("testweaver-output");
    });

    it("should load testgen.config.json by explicit path", async () => {
      const configPath = path.join(tempDir, "testgen.config.json");
      fs.writeFileSync(
        configPath,
        JSON.stringify({
          outputDir: "testgen-output",
        })
      );

      const result = await loadConfig(configPath);
      expect(result.config.outputDir).toBe("testgen-output");
    });

    it("should load config with all properties", async () => {
      const configPath = path.join(tempDir, "full.config.json");
      fs.writeFileSync(
        configPath,
        JSON.stringify({
          outputDir: "custom-output",
          sourceGlobs: ["lib/**/*.tsx"],
          vitestDir: "custom-vitest",
          e2eDir: "custom-e2e",
        })
      );

      const result = await loadConfig(configPath);
      expect(result.config.outputDir).toBe("custom-output");
      expect(result.config.sourceGlobs).toEqual(["lib/**/*.tsx"]);
      expect(result.config.vitestDir).toBe("custom-vitest");
      expect(result.config.e2eDir).toBe("custom-e2e");
    });
  });

  describe("mergeConfig", () => {
    it("should use defaults when no config is provided", () => {
      const resolved = mergeConfig({});
      expect(resolved.sourceGlobs).toEqual(DEFAULT_CONFIG.sourceGlobs);
      expect(resolved.outputDir).toBe(DEFAULT_CONFIG.outputDir);
      expect(resolved.vitestDir).toBe(DEFAULT_CONFIG.vitestDir);
      expect(resolved.e2eDir).toBe(DEFAULT_CONFIG.e2eDir);
    });

    it("should merge loaded config with defaults", () => {
      const loaded = {
        outputDir: "custom-output",
        vitestDir: "custom-vitest",
      };
      const resolved = mergeConfig(loaded);
      expect(resolved.outputDir).toBe("custom-output");
      expect(resolved.vitestDir).toBe("custom-vitest");
      expect(resolved.sourceGlobs).toEqual(DEFAULT_CONFIG.sourceGlobs);
      expect(resolved.e2eDir).toBe(DEFAULT_CONFIG.e2eDir);
    });

    it("should allow CLI options to override config", () => {
      const loaded = {
        outputDir: "config-output",
      };
      const resolved = mergeConfig(loaded, { output: "cli-output" });
      expect(resolved.outputDir).toBe("cli-output");
    });

    it("should handle undefined CLI options", () => {
      const loaded = {
        outputDir: "config-output",
      };
      const resolved = mergeConfig(loaded, { output: undefined });
      expect(resolved.outputDir).toBe("config-output");
    });

    it("should prefer CLI output over loaded config", () => {
      const loaded = {
        outputDir: "config-output",
        vitestDir: "config-vitest",
      };
      const resolved = mergeConfig(loaded, { config: undefined, output: "cli-override" });
      expect(resolved.outputDir).toBe("cli-override");
      expect(resolved.vitestDir).toBe("config-vitest");
    });
  });

  describe("defineConfig", () => {
    it("should return the same config object for type safety", () => {
      const config = {
        outputDir: "test-output",
        sourceGlobs: ["src/**/*.tsx"],
      };
      const result = defineConfig(config);
      expect(result).toEqual(config);
    });
  });
});
