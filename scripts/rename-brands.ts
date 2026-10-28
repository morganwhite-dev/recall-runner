// Renames the real brand names in data that is already in the database (see src/lib/brand-aliases.ts),
// then re-drafts the buyer-notice AI answers under the new text. Safe to re-run: with nothing left
// to rename it changes nothing.
//
// What it touches: products, notices, the agent's audit trail (agent_decisions) and saved test
// results (eval_runs) are renamed in place. Saved AI answers (llm_cache) are keyed by a hash of the
// real brand are deleted, and the notice drafts are made again so "Start fresh demo" still needs no
// live AI call. The recalls table gets the same rename (ingest does it too); its `url` and
// `retailers` columns are left as they are, see src/lib/brand-aliases.ts.
// Run: npm run db:rename-brands
import { eq, sql } from "drizzle-orm";
import {
  agentDecisions,
  campaigns,
  db,
  evalRuns,
  llmCache,
  notices,
  products,
  recalls,
} from "../src/db";
import { pool } from "../src/lib/db";
import { hasRealBrand, renameDerived, renameRecall } from "../src/lib/brand-aliases";
import { CallBudget } from "../src/lib/agent/llm";
import { draftSlots } from "../src/lib/agent/notice";

async function main() {
  let renamed = 0;

  for (const r of await db.select().from(recalls)) {
    const { title, description, hazards, remedyText, manufacturers, retailers, products: prods } = renameRecall(r);
    const next = { title, description, hazards, remedyText, manufacturers, retailers, products: prods };
    const same = Object.entries(next).every(([k, v]) => JSON.stringify(v) === JSON.stringify(r[k as keyof typeof r]));
    if (same) continue;
    await db.update(recalls).set(next).where(eq(recalls.id, r.id));
    renamed += 1;
  }
  console.log("recalls renamed:", renamed);

  renamed = 0;
  for (const p of await db.select().from(products)) {
    const next = renameDerived({ name: p.name, description: p.description, brand: p.brand });
    if (next.name === p.name && next.description === p.description && next.brand === p.brand) continue;
    await db.update(products).set(next).where(eq(products.id, p.id));
    renamed += 1;
  }
  console.log("products renamed:", renamed);

  renamed = 0;
  for (const n of await db.select().from(notices)) {
    const next = renameDerived({
      subject: n.subject,
      body: n.body,
      hazardQuote: n.hazardQuote,
      remedyQuote: n.remedyQuote,
    });
    if (JSON.stringify(next) === JSON.stringify({ subject: n.subject, body: n.body, hazardQuote: n.hazardQuote, remedyQuote: n.remedyQuote })) continue;
    await db.update(notices).set(next).where(eq(notices.id, n.id));
    renamed += 1;
  }
  console.log("notices renamed:", renamed);

  renamed = 0;
  for (const d of await db.select().from(agentDecisions)) {
    const next = renameDerived({ summary: d.summary, detail: d.detail ?? null });
    if (next.summary === d.summary && JSON.stringify(next.detail) === JSON.stringify(d.detail ?? null)) continue;
    await db.update(agentDecisions).set(next).where(eq(agentDecisions.id, d.id));
    renamed += 1;
  }
  console.log("audit trail rows renamed:", renamed);

  renamed = 0;
  for (const e of await db.select().from(evalRuns)) {
    const next = renameDerived({ name: e.name, detail: e.detail ?? null });
    if (next.name === e.name && JSON.stringify(next.detail) === JSON.stringify(e.detail ?? null)) continue;
    await db.update(evalRuns).set(next).where(eq(evalRuns.id, e.id));
    renamed += 1;
  }
  console.log("saved test results renamed:", renamed);

  const stale = await db.select().from(llmCache);
  let dropped = 0;
  for (const c of stale) {
    if (!hasRealBrand(JSON.stringify(c.output))) continue;
    await db.delete(llmCache).where(eq(llmCache.key, c.key));
    dropped += 1;
  }
  console.log("saved AI answers dropped:", dropped);

  // Re-draw the buyer-notice draft for each campaign exactly as approving it would ask for it.
  const rows = await db
    .select({ campaign: campaigns, recall: recalls })
    .from(campaigns)
    .innerJoin(recalls, eq(campaigns.recallId, recalls.id));
  for (const { campaign, recall } of rows) {
    const [product] = await db
      .select()
      .from(products)
      .where(sql`${products.merchantId} = ${campaign.merchantId} and ${products.sku} = ${campaign.matchedSkus[0]}`);
    const draft = await draftSlots(
      {
        recallNumber: recall.recallNumber,
        title: recall.title,
        hazards: recall.hazards,
        remedyText: recall.remedyText,
        remedyOptions: recall.remedyOptions,
        productName: product?.name ?? "product",
      },
      new CallBudget(2),
    );
    console.log(`notice draft #${recall.recallNumber}:`, draft.byModel ? "AI (saved)" : `template (${draft.fallbackReason})`);
  }
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
