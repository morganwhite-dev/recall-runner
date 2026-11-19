import assert from "node:assert/strict";
import { test } from "node:test";
import { db } from "../src/db";
import { assessRecall } from "../src/lib/agent/scan-recall";
import { MAX_SYNC_RECALLS, scanPendingRecalls } from "../src/lib/cpsc-sync";

const record = {
  id: "recall",
  cpscRecallId: 1,
  recallNumber: "26780",
  recallDate: "2026-11-01",
  title: "Orchard wooden toy",
  description: "",
  hazards: "",
  remedyText: "",
  remedyOptions: ["Refund"],
  retailers: "",
  manufacturers: "",
  soldOnline: true,
  products: [],
  url: "",
  createdAt: new Date(),
};
const item = {
  sku: "TOY",
  brand: "Orchard",
  name: "Orchard wooden toy",
  category: "toy",
  description: "",
};
const match = {
  sku: "TOY",
  confidence: 0.95,
  evidence: [
    {
      field: "brand" as const,
      recall_quote: "Orchard",
      catalog_quote: "Orchard",
    },
  ],
  disqualifiers: [],
};
const agent = {
  match: async () => ({
    ok: true as const,
    model: "stub",
    cached: false,
    raw: [match],
  }),
  investigate: async () => ({
    byModel: true,
    model: "stub",
    calls: [{ tool: "get_recall_remedy", input: {}, summary: "Read remedy." }],
    plan: {
      summary: "Review the toy.",
      affected_skus: ["TOY"],
      order_refs_reviewed: [],
      risks: [],
      questions_for_merchant: [],
    },
  }),
};

test("a fresh verified match and completed investigation produce review evidence", async () => {
  const result = await assessRecall(record, [item], "store", db, {
    ...agent,
    match: async (...args) => {
      assert.equal(args[3]?.useCache, false);
      return agent.match();
    },
  });
  assert.deepEqual(result.skus, ["TOY"]);
  assert.deepEqual(
    result.evidence.map((e) => e.actor),
    ["MODEL", "RULE", "TOOL", "MODEL"],
  );
});

test("missing model, unverified quote and incomplete investigation cannot produce a draft", async () => {
  await assert.rejects(
    assessRecall(record, [item], "store", db, {
      ...agent,
      match: async () => ({ ok: false, reason: "API_ERROR", message: "stub" }),
    }),
  );
  const refused = await assessRecall(record, [item], "store", db, {
    ...agent,
    match: async () => ({
      ...(await agent.match()),
      raw: [{ ...match, evidence: [] }],
    }),
    investigate: async () => assert.fail("unexpected investigation"),
  });
  assert.deepEqual(refused.skus, []);
  await assert.rejects(
    assessRecall(record, [item], "store", db, {
      ...agent,
      investigate: async () => ({
        ...(await agent.investigate()),
        byModel: false,
      }),
    }),
  );
});

test("cron caps attempted recalls, keeps going after errors and schedules retry", async () => {
  const retries: string[] = [];
  const ids = Array.from({ length: MAX_SYNC_RECALLS + 2 }, (_, i) => String(i));
  const result = await scanPendingRecalls(
    async () => ids,
    async (id, source) => {
      assert.equal(source, "cron");
      if (id === "0") throw Error("stub");
      return id === "1" ? "draft" : "no-match";
    },
    async (id) => {
      retries.push(id);
    },
  );
  assert.deepEqual(result, {
    failed: 1,
    drafted: 1,
    skipped: 0,
    unmatched: MAX_SYNC_RECALLS - 2,
  });
  assert.deepEqual(retries, ["0"]);
});
