/**
 * Test script for the TestWeaver parser
 *
 * Usage: npx tsx src/test-parser.ts
 * Or after build: node dist/test-parser.js
 */

import * as path from "node:path";
import { scanFile } from "./core/parser.js";

// Get the directory name based on how the script is run
// For tsx, we can use __dirname directly; for compiled code, it's available too
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - __dirname may or may not be available depending on runtime
const scriptDir = typeof __dirname !== "undefined" ? __dirname : process.cwd();

// Path to the example Login.tsx component (example-app is at repository root)
const exampleFilePath = path.resolve(
  scriptDir,
  "../../../example-app/src/components/Login.tsx"
);

console.log("TestWeaver Parser Test");
console.log("=".repeat(50));
console.log(`Scanning file: ${exampleFilePath}`);
console.log("=".repeat(50));

try {
  const suites = scanFile(exampleFilePath);

  console.log("\nParsed TestSuites:");
  console.log(JSON.stringify(suites, null, 2));

  console.log("\n" + "=".repeat(50));
  console.log("Summary:");
  console.log(`  Total Suites: ${suites.length}`);

  for (const suite of suites) {
    console.log(`  Suite "${suite.id}":`);
    console.log(`    Cases: ${suite.cases.length}`);
    for (const testCase of suite.cases) {
      console.log(`      - ${testCase.id}:`);
      console.log(`        Steps: ${testCase.steps.length}`);
      console.log(`        Expectations: ${testCase.expectations.length}`);
    }
  }
} catch (error) {
  console.error("Error parsing file:", error);
  process.exit(1);
}
