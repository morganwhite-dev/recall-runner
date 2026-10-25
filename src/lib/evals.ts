// What the Test results page shows, read from real runs:
//   money and identity tests -> data/test-results.json   (npm run test:record)
//   AI tests                 -> the eval_runs table       (npm run eval)
// A test with no recorded result is shown as "not run", never as passed.
import { readFileSync } from "node:fs";
import { desc, eq } from "drizzle-orm";
import { db, evalRuns } from "@/db";

export type UnitResults = {
  ranAt: string;
  durationMs: number;
  total: number;
  failing: number;
  tests: { name: string; file: string; passed: boolean }[];
};

export function loadUnitResults(): UnitResults | null {
  try {
    return JSON.parse(readFileSync("data/test-results.json", "utf8")) as UnitResults;
  } catch {
    return null;
  }
}

export type AiResults = {
  runGroup: string;
  ranAt: Date;
  model: string | null;
  attempts: number;
  // case number -> how many attempts passed, out of how many
  cases: Record<number, { passed: number; attempts: number }>;
};

// The most recent run of the AI tests (all attempts share one run group).
export async function loadAiResults(): Promise<AiResults | null> {
  const [latest] = await db.select().from(evalRuns).orderBy(desc(evalRuns.createdAt)).limit(1);
  if (!latest) return null;
  const rows = await db.select().from(evalRuns).where(eq(evalRuns.runGroup, latest.runGroup));
  const cases: AiResults["cases"] = {};
  for (const r of rows) {
    const c = (cases[r.caseNo] ??= { passed: 0, attempts: 0 });
    c.attempts += 1;
    if (r.passed) c.passed += 1;
  }
  return {
    runGroup: latest.runGroup,
    ranAt: new Date(latest.runGroup),
    model: latest.model,
    attempts: Math.max(...Object.values(cases).map((c) => c.attempts)),
    cases,
  };
}
