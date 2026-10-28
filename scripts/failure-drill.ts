// A real failure, on purpose: proves the failure handling end to end with a real PayPal event.
//
// It pays one old hand-warmers order (past 180 days, so the rules choose a PayPal Payout) to an
// email that has NO PayPal account. In the sandbox that makes PayPal send a real
// PAYMENT.PAYOUTS-ITEM.UNCLAIMED webhook to the live app, which should add a plain-English note to
// that case's timeline ("The payout is unclaimed…") and leave the case on "Waiting on PayPal" (never retried,
// so it can never pay twice). Nothing is faked: the event is PayPal's and its signature is verified.
//
// The amount is whatever the rules decide for that order (the item price, $34.00), in SANDBOX money.
// Run: npm run demo:failure-drill              (shows which case it would use; changes nothing)
//      npm run demo:failure-drill -- --go      (does it for real)
// "Start fresh demo" puts the drill case back to normal.
import { and, desc, eq, like, not } from "drizzle-orm";
import {
  agentDecisions,
  buyers,
  campaigns,
  cases,
  db,
  orders,
  recalls,
  webhookEvents,
} from "../src/db";
import { FEATURED_RECALL } from "../src/lib/demo-config";
import { pool } from "../src/lib/db";
import { executeCase } from "../src/lib/executor";
import { REFUND_WINDOW_DAYS } from "../src/lib/policy";

const DAY_MS = 24 * 60 * 60 * 1000;
const WAIT_MS = 4 * 60 * 1000;

async function main() {
  if (process.env.PAYPAL_ENV !== "sandbox")
    throw new Error("Refusing to run: PAYPAL_ENV must be 'sandbox'");
  const go = process.argv.includes("--go");

  // A fictional buyer's open hand-warmers case on an order older than PayPal's refund window.
  const candidates = await db
    .select({ kase: cases, order: orders, buyer: buyers })
    .from(cases)
    .innerJoin(orders, eq(cases.orderId, orders.id))
    .innerJoin(buyers, eq(orders.buyerId, buyers.id))
    .innerJoin(campaigns, eq(cases.campaignId, campaigns.id))
    .innerJoin(recalls, eq(campaigns.recallId, recalls.id))
    .where(
      and(
        eq(recalls.recallNumber, FEATURED_RECALL),
        eq(campaigns.status, "APPROVED"),
        eq(cases.status, "OPEN"),
        not(like(buyers.email, "%@personal.example.com")), // never the real sandbox buyer
      ),
    );
  const old = candidates.filter(
    (c) =>
      (Date.now() - c.order.effectiveOrderDate.getTime()) / DAY_MS >
      REFUND_WINDOW_DAYS,
  );
  if (old.length === 0) {
    throw new Error(
      "No open, approved hand-warmers case older than 180 days. Press Start fresh demo, then approve the hand-warmers campaign, then run this again.",
    );
  }
  const pick = old[0];
  const age = Math.floor(
    (Date.now() - pick.order.effectiveOrderDate.getTime()) / DAY_MS,
  );
  console.log(
    `Case ${pick.kase.id.slice(0, 8)}: ${pick.buyer.name}, order ${age} days old (rules will choose a PayPal Payout).`,
  );

  if (!go) {
    console.log(
      "Dry run: nothing was changed or sent. Run again with -- --go to do it.",
    );
    return;
  }

  // The payout goes to the email PayPal verified at sign-in. Here we stand one in that has no account.
  const nobody = `failure-drill-${Date.now()}@example.com`;
  await db
    .update(cases)
    .set({ choice: "refund", verifiedEmail: nobody, updatedAt: new Date() })
    .where(eq(cases.id, pick.kase.id));
  const result = await executeCase(pick.kase.id);
  console.log(
    `PayPal accepted the payout request: status ${result.status}, batch ${result.paypalRef ?? "none"}.`,
  );
  if (result.error) throw new Error(result.error);

  console.log(
    `Waiting up to ${WAIT_MS / 60000} minutes for PayPal's "unclaimed" webhook…`,
  );
  const started = Date.now();
  while (Date.now() - started < WAIT_MS) {
    await new Promise((r) => setTimeout(r, 10_000));
    const notes = await db
      .select()
      .from(agentDecisions)
      .where(
        and(
          eq(agentDecisions.caseId, pick.kase.id),
          eq(agentDecisions.step, "SETTLE"),
        ),
      )
      .orderBy(desc(agentDecisions.createdAt));
    if (notes.length > 0) {
      console.log(
        `\nIt worked. The timeline now says:\n  "${notes[0].summary}"`,
      );
      const [k] = await db
        .select()
        .from(cases)
        .where(eq(cases.id, pick.kase.id));
      console.log(
        `The case status is ${k.status} (stays waiting, never retried).`,
      );
      return;
    }
    process.stdout.write(".");
  }
  const recent = await db
    .select()
    .from(webhookEvents)
    .orderBy(desc(webhookEvents.receivedAt))
    .limit(3);
  console.log(
    `\nNo note yet. Latest events received: ${recent.map((e) => `${e.eventType} (verified=${e.verified})`).join(", ") || "none"}.`,
  );
  console.log(
    "PayPal can be slow; check the dashboard timeline in a few minutes.",
  );
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
