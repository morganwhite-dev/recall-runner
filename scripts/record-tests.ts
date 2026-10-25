// Runs the unit tests and saves what happened to data/test-results.json, which the Test results
// page shows. The page never invents a pass: a test with no entry here is shown as "not run".
// Run: npm run test:record
import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";

const run = spawnSync(
  "node_modules/.bin/tsx",
  ["--test", "--test-reporter=junit", "tests/policy.test.ts", "tests/buyer.test.ts", "tests/dashboard.test.ts"],
  { encoding: "utf8" },
);
const xml = run.stdout;

// Each test is one <testcase name="..."/>; a failing one contains a <failure> child.
const tests: { name: string; file: string; passed: boolean }[] = [];
const re = /<testcase name="([^"]*)"[^>]*file="([^"]*)"\s*(\/>|>([\s\S]*?)<\/testcase>)/g;
for (const m of xml.matchAll(re)) {
  const unescape = (s: string) =>
    s.replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
  tests.push({
    name: unescape(m[1]),
    file: m[2].split("/").pop()!,
    passed: !(m[4] ?? "").includes("<failure"),
  });
}
const duration = Number(/duration_ms (\d+(\.\d+)?)/.exec(xml)?.[1] ?? 0);

if (tests.length === 0) {
  console.error("No test results were parsed; leaving data/test-results.json as it was.");
  process.exit(1);
}
const result = {
  ranAt: new Date().toISOString(),
  durationMs: Math.round(duration),
  total: tests.length,
  failing: tests.filter((t) => !t.passed).length,
  tests,
};
writeFileSync("data/test-results.json", JSON.stringify(result, null, 2) + "\n");
console.log(`${result.total} tests, ${result.failing} failing, ${result.durationMs} ms -> data/test-results.json`);
process.exit(result.failing ? 1 : 0);
