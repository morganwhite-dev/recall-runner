// Loads data/cpsc-snapshot.json into the recalls table. Safe to re-run: existing recalls are
// updated in place (matched on recall number), new ones are added.
// Run: npm run cpsc:ingest
import { readFileSync } from "node:fs";
import { sql } from "drizzle-orm";
import { db, recalls } from "../src/db";
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
  await db
    .insert(recalls)
    .values(snapshot.recalls)
    .onConflictDoUpdate({
      target: recalls.recallNumber,
      set: {
        title: sql`excluded.title`,
        description: sql`excluded.description`,
        hazards: sql`excluded.hazards`,
        remedyText: sql`excluded.remedy_text`,
        remedyOptions: sql`excluded.remedy_options`,
        retailers: sql`excluded.retailers`,
        manufacturers: sql`excluded.manufacturers`,
        soldOnline: sql`excluded.sold_online`,
        products: sql`excluded.products`,
        url: sql`excluded.url`,
      },
    });

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
