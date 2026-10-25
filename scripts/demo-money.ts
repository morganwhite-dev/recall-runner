// End-to-end proof of the money core against the PayPal sandbox. It creates three campaigns
// (one per real recall) and five cases covering every path, then:
//   1. tries to run a case before the merchant approves -> must be blocked
//   2. approves and runs every case -> refund, payout, tracking, repair notice, rejection
//   3. runs the finished cases again -> must NOT call PayPal again (no double pay)
//   4. checks the payout actually landed in the sandbox account
// Run: npm run db:seed && npm run paypal:attach && npm run demo:money
// (Re-seed first each time: a refunded sandbox payment can't be refunded again.)
import { eq, inArray } from "drizzle-orm";
import {
  campaigns,
  cases,
  db,
  merchants,
  paypalActions,
  recalls,
} from "../src/db";
import { pool } from "../src/lib/db";
import { executeCase } from "../src/lib/executor";
import { paypalRequest } from "../src/lib/paypal-client";
import { formatUsd } from "../src/lib/policy";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// recall number, product sku, buyer email, what the buyer chooses, what we expect
const SCENARIOS = [
  [
    "27011",
    "BH-HW-2P",
    "alicia.rivera@example.com",
    "refund",
    "REFUND (45 days, inside the window)",
  ],
  [
    "27011",
    "BH-HW-2P",
    "sb-cpwe353506970@personal.example.com",
    "refund",
    "PAYOUT (200 days, past the window)",
  ],
  [
    "26791",
    "BH-RC-BP",
    "tom.becker@example.com",
    "replacement",
    "TRACKING (replacement ships)",
  ],
  [
    "26794",
    "BH-DR-8",
    "grace.kim@example.com",
    "repair",
    "REPAIR_NOTICE (no money)",
  ],
  [
    "26791",
    "BH-RC-BP",
    "lena.fischer@example.com",
    "refund",
    "REJECT (this recall only offers a replacement)",
  ],
] as const;

async function main() {
  if (process.env.PAYPAL_ENV !== "sandbox")
    throw new Error("Refusing to run: PAYPAL_ENV must be 'sandbox'");

  const [merchant] = await db
    .select()
    .from(merchants)
    .where(eq(merchants.name, "Brightnest Home"));
  await db.delete(campaigns).where(eq(campaigns.merchantId, merchant.id)); // clears old cases and ledger rows

  // One DRAFT campaign per recall.
  const recallRows = await db
    .select()
    .from(recalls)
    .where(inArray(recalls.recallNumber, ["27011", "26791", "26794"]));
  const campaignByRecall = new Map<string, string>();
  for (const r of recallRows) {
    const [c] = await db
      .insert(campaigns)
      .values({ merchantId: merchant.id, recallId: r.id })
      .returning();
    campaignByRecall.set(r.recallNumber, c.id);
  }

  // Find each scenario's order and create its case with the buyer's choice.
  const caseIds: string[] = [];
  for (const [recallNumber, sku, email, choice] of SCENARIOS) {
    const { rows } = await pool.query(
      `select o.id as order_id, p.id as product_id from orders o
         join buyers b on b.id = o.buyer_id
         join order_items i on i.order_id = o.id
         join products p on p.id = i.product_id
       where p.sku = $1 and b.email = $2 order by o.effective_order_date limit 1`,
      [sku, email],
    );
    const [k] = await db
      .insert(cases)
      .values({
        campaignId: campaignByRecall.get(recallNumber)!,
        orderId: rows[0].order_id,
        productId: rows[0].product_id,
        choice,
        // Stand-in for the email PayPal verifies when a real buyer signs in (Phase 4).
        verifiedEmail: email,
      })
      .returning();
    caseIds.push(k.id);
  }

  console.log("\n1. Before the merchant approves:");
  const blocked = await executeCase(caseIds[0]);
  console.log(
    `   ${blocked.error ? `Blocked: ${blocked.error}` : "NOT BLOCKED (this is a bug)"}`,
  );

  await db
    .update(campaigns)
    .set({ status: "APPROVED", approvedAt: new Date() })
    .where(eq(campaigns.merchantId, merchant.id));

  console.log("\n2. After approval, every path:");
  const results = [];
  for (const [i, id] of caseIds.entries()) {
    const r = await executeCase(id);
    results.push(r);
    console.log(`   [${r.decision?.action}] expected ${SCENARIOS[i][4]}`);
    console.log(
      `      rule ${r.decision?.rule}, amount ${formatUsd(r.decision?.amountCents ?? 0)}, status ${r.status}, PayPal ref ${r.paypalRef ?? "none"}`,
    );
    console.log(`      "${r.decision?.rationale}"`);
    if (r.error) console.log(`      ERROR: ${r.error}`);
  }

  console.log("\n3. Running the finished cases again (must not call PayPal):");
  const before = (await db.select().from(paypalActions)).length;
  for (const id of caseIds.slice(0, 4)) {
    const again = await executeCase(id);
    console.log(
      `   ${again.status}: ${again.alreadyDone ? "already done, PayPal not called" : "RAN AGAIN (this is a bug)"}`,
    );
  }
  const after = (await db.select().from(paypalActions)).length;
  console.log(`   PayPal ledger rows: ${before} before, ${after} after`);

  console.log(
    "\n4. Did the payout land? (sandbox payouts take about 20 seconds)",
  );
  const payout = results.find((r) => r.decision?.action === "PAYOUT");
  if (payout?.paypalRef) {
    for (let i = 0; i < 6; i++) {
      await sleep(8000);
      const { data } = await paypalRequest<{
        items?: { transaction_status?: string }[];
      }>(`/v1/payments/payouts/${payout.paypalRef}`);
      const status = data.items?.[0]?.transaction_status;
      console.log(`   payout item status: ${status}`);
      if (status && status !== "PENDING") break;
    }
  }
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.stack : err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
