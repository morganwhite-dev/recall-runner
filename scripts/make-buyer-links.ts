// Gives every buyer with an open recall a private link and fills it into their notices.
// Run: npm run buyer:links      (safe to run again: existing links are reused)
//
// New campaigns do this on their own when approved; this catches notices drafted before
// Phase 4 existed and prints the links so you can open them.
import { eq, like } from "drizzle-orm";
import { buyers, cases, db, notices, orders } from "../src/db";
import { buyerUrl, ensureBuyerLink } from "../src/lib/buyer";
import { pool } from "../src/lib/db";

async function main() {
  const rows = await db
    .select({ caseId: cases.id, buyer: buyers })
    .from(cases)
    .innerJoin(orders, eq(cases.orderId, orders.id))
    .innerJoin(buyers, eq(orders.buyerId, buyers.id));

  const byBuyer = new Map<string, { name: string; email: string; caseIds: string[] }>();
  for (const r of rows) {
    const entry = byBuyer.get(r.buyer.id) ?? { name: r.buyer.name, email: r.buyer.email, caseIds: [] };
    entry.caseIds.push(r.caseId);
    byBuyer.set(r.buyer.id, entry);
  }

  const urls = new Map<string, string>(); // case id -> buyer link
  for (const [buyerId, b] of byBuyer) {
    const url = buyerUrl(await ensureBuyerLink(buyerId));
    for (const id of b.caseIds) urls.set(id, url);
    console.log(`${b.name.padEnd(16)} ${String(b.caseIds.length).padStart(2)} recall(s)  ${url}`);
  }

  const pending = await db.select().from(notices).where(like(notices.body, "%{{BUYER_LINK}}%"));
  for (const n of pending) {
    const url = urls.get(n.caseId);
    if (!url) continue;
    await db
      .update(notices)
      .set({ body: n.body.replace("{{BUYER_LINK}}", url) })
      .where(eq(notices.id, n.id));
  }
  console.log(`\nFilled the link into ${pending.length} notice(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
