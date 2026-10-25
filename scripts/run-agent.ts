// Runs the agent end to end on the demo store and prints what it did.
// Run: npm run db:seed && npm run paypal:attach && npm run agent:run
import { asc, eq } from "drizzle-orm";
import { agentDecisions, campaigns, cases, db, merchants, notices } from "../src/db";
import { pool } from "../src/lib/db";
import { approveCampaign, runScan } from "../src/lib/agent/pipeline";

async function main() {
  const [merchant] = await db.select().from(merchants).where(eq(merchants.name, "Brightnest Home"));
  const started = Date.now();

  const scan = await runScan(merchant.id);
  console.log(`\nSCAN: checked ${scan.checked} recalls, ${scan.candidates} reviewed by the AI`);
  for (const c of scan.campaigns) console.log(`  campaign opened (DRAFT): recall #${c.recallNumber} -> ${c.skus.join(", ")}`);
  for (const r of scan.refused) console.log(`  refused: recall #${r.recallNumber}`);

  for (const c of scan.campaigns) {
    const res = await approveCampaign(c.campaignId);
    console.log(`APPROVED #${c.recallNumber}: ${res.cases} cases, ${res.noticesQueued} notices, drafted by ${res.draftedByModel ? "the AI" : "the template"}`);
  }

  console.log(`\nAUDIT TRAIL (${((Date.now() - started) / 1000).toFixed(0)}s)`);
  const trail = await db.select().from(agentDecisions).where(eq(agentDecisions.merchantId, merchant.id)).orderBy(asc(agentDecisions.createdAt));
  for (const d of trail) console.log(`  [${d.actor.padEnd(5)}] ${d.step.padEnd(11)} ${d.summary.slice(0, 190)}`);

  const [sample] = await db
    .select({ subject: notices.subject, body: notices.body, by: notices.draftedBy })
    .from(notices)
    .innerJoin(cases, eq(notices.caseId, cases.id))
    .innerJoin(campaigns, eq(cases.campaignId, campaigns.id))
    .limit(1);
  if (sample) console.log(`\nSAMPLE NOTICE (${sample.by})\nSubject: ${sample.subject}\n${sample.body}`);
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.stack : err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
