// Phase 0 spike: prove the Neon database is reachable from this machine.
// Run: node --env-file=.env.local scripts/spike-db.mjs
// Prints only a status and the Postgres version, never the connection string.
import pg from "pg";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("FAIL  DATABASE_URL is empty in .env.local");
  process.exit(1);
}

const client = new pg.Client({ connectionString: url });
try {
  await client.connect();
  const { rows } = await client.query("select version() as v, current_database() as db");
  console.log("PASS  Connected to Neon");
  console.log("      database:", rows[0].db);
  console.log("      server:", rows[0].v.split(",")[0]);
} catch (err) {
  console.error("FAIL  Could not connect:", err.code ?? err.name, "-", String(err.message).replace(/postgres(ql)?:\/\/\S+/g, "[redacted]"));
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}
