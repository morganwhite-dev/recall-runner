// Set PHASE5_PG_BIN to a directory containing initdb and pg_ctl for this integration test.
// It creates its own cluster in a temporary directory and accepts only Unix-socket connections.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { Pool } from "pg";

const bin = process.env.PHASE5_PG_BIN;
test(
  "scan writes, retries and approval protection in PostgreSQL",
  { skip: !bin },
  async (t) => {
    const dir = mkdtempSync(join(tmpdir(), "rr-pg-"));
    const cluster = join(dir, "data");
    t.after(() => rmSync(dir, { recursive: true, force: true }));
    execFileSync(join(bin!, "initdb"), [
      "-D",
      cluster,
      "-A",
      "trust",
      "-U",
      "tester",
      "--no-sync",
    ]);
    // Keep the socket path short enough on macOS.
    const socket = mkdtempSync("/tmp/rr-sock-");
    t.after(() => rmSync(socket, { recursive: true, force: true }));
    execFileSync(join(bin!, "pg_ctl"), [
      "-D",
      cluster,
      "-l",
      join(dir, "pg.log"),
      "-o",
      `-h '' -k ${socket} -p 15439`,
      "-w",
      "start",
    ]);
    const pool = new Pool({
      host: socket,
      port: 15439,
      user: "tester",
      database: "postgres",
    });
    try {
      Object.assign(globalThis, { pool });
      const { upsertRecalls, scanPendingRecalls } =
        await import("../src/lib/cpsc-sync");
      const { scanRecall } = await import("../src/lib/agent/scan-recall");
      for (const file of readdirSync("drizzle")
        .filter((f) => f.endsWith(".sql"))
        .sort())
        await pool.query(readFileSync(join("drizzle", file), "utf8"));
      const {
        rows: [store],
      } = await pool.query(
        "insert into merchants(name) values ('Brightnest Home') returning id",
      );
      await pool.query(
        "insert into products(merchant_id, sku, name, description, category, brand, price_cents) values ($1,'T','Orchard toy','','Toy','Orchard',100)",
        [store.id],
      );
      const record = {
        cpscRecallId: 10,
        recallNumber: "26780",
        recallDate: "2026-11-01",
        title: "Orchard toy",
        description: "",
        hazards: "",
        remedyText: "",
        remedyOptions: ["Refund"],
        retailers: "",
        manufacturers: "",
        soldOnline: true,
        products: [],
        url: "",
      };
      const agent = {
        match: async () => ({
          ok: true as const,
          model: "stub",
          cached: false,
          raw: [
            {
              sku: "T",
              confidence: 0.9,
              disqualifiers: [],
              evidence: [
                {
                  field: "brand" as const,
                  recall_quote: "Orchard",
                  catalog_quote: "Orchard",
                },
              ],
            },
          ],
        }),
        investigate: async () => ({
          byModel: true,
          calls: [],
          plan: {
            summary: "Review toy.",
            affected_skus: ["T"],
            order_refs_reviewed: [],
            risks: [],
            questions_for_merchant: [],
          },
        }),
      };
      const run = (number: string, source: "dashboard" | "cron") =>
        scanRecall(number, source, agent);
      await upsertRecalls([record], true);
      await upsertRecalls([record], true);
      const read = async (query: string) => (await pool.query(query)).rows;
      assert.equal(
        (await read("select * from agent_decisions where step='CPSC_PENDING'"))
          .length,
        1,
      );
      // Force a failure after the draft INSERT. Only the original pending row should survive.
      await pool.query(
        "alter table agent_decisions add constraint fail_plan check (step <> 'PLAN')",
      );
      const failed = await scanPendingRecalls(undefined, run);
      assert.equal(failed.failed, 1);
      assert.deepEqual(await read("select * from campaigns"), []);
      assert.deepEqual(await read("select step from agent_decisions"), [
        { step: "CPSC_PENDING" },
      ]);
      await pool.query("alter table agent_decisions drop constraint fail_plan");
      assert.equal((await scanPendingRecalls(undefined, run)).drafted, 1);
      assert.equal(await run("26780", "cron"), "skipped");
      const [draft] = await read("select * from campaigns");
      assert.equal(draft.status, "DRAFT");
      await pool.query("update campaigns set matched_skus = array['old']");
      const refresh = await scanRecall("26780", "dashboard", {
        ...agent,
        investigate: async () => {
          assert.equal(await run("26780", "dashboard"), "busy");
          return agent.investigate();
        },
      });
      assert.equal(refresh, "draft");
      assert.deepEqual(await read("select id, matched_skus from campaigns"), [
        { id: draft.id, matched_skus: ["T"] },
      ]);
      const protectedResult = await scanRecall("26780", "dashboard", {
        ...agent,
        investigate: async () => {
          await pool.query("update campaigns set status='APPROVED'");
          return agent.investigate();
        },
      });
      assert.equal(protectedResult, "protected");
      assert.equal(await run("26780", "dashboard"), "protected");
      assert.deepEqual(await read("select * from cases"), []);
      assert.deepEqual(await read("select * from notices"), []);
      await upsertRecalls(
        [
          {
            ...record,
            recallNumber: "26781",
            cpscRecallId: 11,
            title: "Clothing",
          },
        ],
        true,
      );
      assert.equal((await scanPendingRecalls(undefined, run)).unmatched, 1);
      assert.equal(await run("26781", "cron"), "skipped");
    } finally {
      await pool.end();
      execFileSync(join(bin!, "pg_ctl"), [
        "-D",
        cluster,
        "-m",
        "fast",
        "-w",
        "stop",
      ]);
    }
  },
);
