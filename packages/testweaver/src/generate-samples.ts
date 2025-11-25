/**
 * Generate sample test files from example-app's Login.tsx
 *
 * This script demonstrates the generators by:
 * 1. Parsing the Login.tsx component to extract IR
 * 2. Generating Vitest + RTL test files
 * 3. Generating Playwright E2E test files
 *
 * Usage: npx tsx src/generate-samples.ts
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { scanFile } from "./core/parser.js";
import { generateVitest, generateFileName as generateVitestFileName } from "./generators/vitest-generator.js";
import { generatePlaywright, generateFileName as generatePlaywrightFileName } from "./generators/playwright-generator.js";

// Get the directory name based on how the script is run
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - __dirname may or may not be available depending on runtime
const scriptDir = typeof __dirname !== "undefined" ? __dirname : process.cwd();

// Path to the example Login.tsx component (example-app is at repository root)
const exampleFilePath = path.resolve(
  scriptDir,
  "../../../example-app/src/components/Login.tsx"
);

// Output directories
const vitestOutputDir = path.resolve(scriptDir, "../__generated__/vitest");
const playwrightOutputDir = path.resolve(scriptDir, "../__generated__/e2e");

console.log("TestWeaver Sample Generator");
console.log("=".repeat(50));
console.log(`Source file: ${exampleFilePath}`);
console.log(`Vitest output: ${vitestOutputDir}`);
console.log(`Playwright output: ${playwrightOutputDir}`);
console.log("=".repeat(50));

// Ensure output directories exist
fs.mkdirSync(vitestOutputDir, { recursive: true });
fs.mkdirSync(playwrightOutputDir, { recursive: true });

try {
  // Parse the source file
  console.log("\n1. Parsing source file...");
  const suites = scanFile(exampleFilePath);
  console.log(`   Found ${suites.length} suite(s)`);

  for (const suite of suites) {
    console.log(`\n2. Processing suite "${suite.id}":`);
    console.log(`   Cases: ${suite.cases.length}`);

    for (const testCase of suite.cases) {
      // Generate Vitest file
      console.log(`\n   Generating Vitest test for "${testCase.scenario}"...`);
      const vitestContent = generateVitest(suite);
      const vitestFileName = generateVitestFileName(testCase);
      const vitestFilePath = path.join(vitestOutputDir, vitestFileName);
      fs.writeFileSync(vitestFilePath, vitestContent, "utf-8");
      console.log(`   ✓ Created: ${vitestFilePath}`);

      // Generate Playwright file
      console.log(`   Generating Playwright test for "${testCase.scenario}"...`);
      const playwrightContent = generatePlaywright(suite);
      const playwrightFileName = generatePlaywrightFileName(testCase);
      const playwrightFilePath = path.join(playwrightOutputDir, playwrightFileName);
      fs.writeFileSync(playwrightFilePath, playwrightContent, "utf-8");
      console.log(`   ✓ Created: ${playwrightFilePath}`);
    }
  }

  console.log("\n" + "=".repeat(50));
  console.log("Sample generation complete!");
  console.log("=".repeat(50));

  // Print generated file contents
  console.log("\n--- Vitest Test File ---");
  const vitestFiles = fs.readdirSync(vitestOutputDir);
  for (const file of vitestFiles) {
    const content = fs.readFileSync(path.join(vitestOutputDir, file), "utf-8");
    console.log(`\nFile: ${file}`);
    console.log("-".repeat(40));
    console.log(content);
  }

  console.log("\n--- Playwright Test File ---");
  const playwrightFiles = fs.readdirSync(playwrightOutputDir);
  for (const file of playwrightFiles) {
    const content = fs.readFileSync(path.join(playwrightOutputDir, file), "utf-8");
    console.log(`\nFile: ${file}`);
    console.log("-".repeat(40));
    console.log(content);
  }
} catch (error) {
  console.error("Error generating samples:", error);
  process.exit(1);
}
