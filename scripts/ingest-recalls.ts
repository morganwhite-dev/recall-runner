// Loads data/cpsc-snapshot.json into the recalls table. Safe to re-run: existing recalls are
// updated in place (matched on recall number), new ones are added.
// Run: npm run cpsc:ingest
import { readFileSync } from "node:fs";
import { renameRecall } from "../src/lib/brand-aliases";
import { upsertRecalls } from "../src/lib/cpsc-sync";
import { pool } from "../src/lib/db";
import type { RecallRecord } from "../src/lib/cpsc";

async function main() {
  const snapshot = JSON.parse(
    readFileSync("data/cpsc-snapshot.json", "utf8"),
  ) as {
    fetchedAt: string;
    recalls: RecallRecord[];
  };

  // "Upsert": insert, and if the recall number already exists, overwrite its fields instead.
  // Shared with the live pull (src/lib/cpsc-sync.ts).
  await upsertRecalls(snapshot.recalls.map(renameRecall)); // so an old snapshot ingests renamed too

  const { rows } = await pool.query(
    "select count(*)::int as total, count(*) filter (where sold_online)::int as online from recalls",
  );
  console.log(`Snapshot from ${snapshot.fetchedAt}`);
  console.log(
    `Recalls in database: ${rows[0].total}, sold online: ${rows[0].online}`,
  );
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
