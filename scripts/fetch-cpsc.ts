// Downloads recalls from the CPSC API and saves a cleaned snapshot in data/.
// Run: npm run cpsc:fetch            (recalls since 2026-07-01)
//      npm run cpsc:fetch -- 2026-09-01   (a different start date)
import { mkdirSync, writeFileSync } from "node:fs";
import { renameRecall } from "../src/lib/brand-aliases";
import { CPSC_API, normalizeRecall } from "../src/lib/cpsc";

async function main() {
  const since = process.argv[2] ?? "2026-07-01";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(since)) {
    throw new Error("Start date must look like 2026-07-01");
  }

  const res = await fetch(`${CPSC_API}?format=json&RecallDateStart=${since}`);
  if (!res.ok) throw new Error(`CPSC API failed: HTTP ${res.status}`);

  const raw = (await res.json()) as Record<string, unknown>[];
  const recalls = raw
    .map(normalizeRecall)
    .map(renameRecall) // brand names replaced, see src/lib/brand-aliases.ts
    .sort((a, b) => b.recallDate.localeCompare(a.recallDate));

  mkdirSync("data", { recursive: true });
  writeFileSync(
    "data/cpsc-snapshot.json",
    JSON.stringify(
      {
        fetchedAt: new Date().toISOString(),
        source: CPSC_API,
        since,
        count: recalls.length,
        recalls,
      },
      null,
      1,
    ) + "\n",
  );

  console.log(
    `Saved ${recalls.length} recalls since ${since} to data/cpsc-snapshot.json`,
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
