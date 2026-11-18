// Adds the extra sandbox buyers (src/lib/demo-buyers.ts) to the demo store WITHOUT touching anything
// that is already there: no wipe, no reseed. Each buyer gets a real sandbox payment, so the refund
// or payout lands in a PayPal sandbox account. Safe to re-run: a buyer or order that exists is kept.
// Run: npm run demo:add-buyers
import { and, eq } from "drizzle-orm";
import { buyers, campaigns, db, merchants, orderItems, orders, products } from "../src/db";
import { pool } from "../src/lib/db";
import { DEMO_BUYERS } from "../src/lib/demo-buyers";
import { parseSandboxBuyers } from "../src/lib/sandbox-buyers";
import { createCardOrder } from "../src/lib/paypal-client";
import { ensureBuyerLink } from "../src/lib/buyer";
import { approveCampaign } from "../src/lib/agent/pipeline";

const DAY_MS = 24 * 60 * 60 * 1000;

async function main() {
  if (process.env.PAYPAL_ENV !== "sandbox") throw new Error("Refusing to run: PAYPAL_ENV must be 'sandbox'");
  const logins = parseSandboxBuyers(process.env);
  const [merchant] = await db.select().from(merchants).where(eq(merchants.name, "Brightnest Home"));
  if (!merchant) throw new Error("No demo store; run npm run db:seed first");

  for (const d of DEMO_BUYERS) {
    const login = logins[d.key];
    if (!login) {
      console.log(`${d.key}: no login in SANDBOX_BUYERS, skipped`);
      continue;
    }
    const email = d.emailMatchesLogin ? login.email : d.storeEmail!;
    let [buyer] = await db.select().from(buyers).where(eq(buyers.email, email));
    if (!buyer) {
      [buyer] = await db.insert(buyers).values({ name: d.name, email, sandboxKey: d.key }).returning();
      console.log(`${d.key}: added buyer ${d.name}`);
    } else if (buyer.sandboxKey !== d.key) {
      await db.update(buyers).set({ sandboxKey: d.key }).where(eq(buyers.id, buyer.id));
    }

    const [product] = await db
      .select()
      .from(products)
      .where(and(eq(products.merchantId, merchant.id), eq(products.sku, d.sku)));
    if (!product) throw new Error(`No product ${d.sku}`);
    const [has] = await db
      .select({ id: orders.id })
      .from(orders)
      .where(and(eq(orders.buyerId, buyer.id), eq(orders.merchantId, merchant.id)));
    if (has) {
      console.log(`${d.key}: already has an order, kept`);
      continue;
    }
    const [order] = await db
      .insert(orders)
      .values({
        merchantId: merchant.id,
        buyerId: buyer.id,
        amountCents: product.priceCents,
        effectiveOrderDate: new Date(Date.now() - d.daysAgo * DAY_MS),
        dateIsSimulated: true,
      })
      .returning();
    await db.insert(orderItems).values({
      orderId: order.id,
      productId: product.id,
      quantity: 1,
      unitPriceCents: product.priceCents,
      refundedCents: d.refundedCents,
    });
    const { orderId, captureId } = await createCardOrder(
      order.amountCents,
      `Brightnest Home order ${order.id.slice(0, 8)}`,
      `demo-buyer-${order.id}`,
    );
    await db.update(orders).set({ paypalOrderId: orderId, paypalCaptureId: captureId }).where(eq(orders.id, order.id));
    await ensureBuyerLink(buyer.id);
    console.log(`${d.key}: order ${d.daysAgo} days old with a real sandbox payment, link ready`);
    await new Promise((r) => setTimeout(r, 2000)); // PayPal calls are rate limited
  }

  // A campaign that is already approved opens cases only when approved, so re-run approval; it
  // only adds what is missing. A campaign still waiting for approval picks the new orders up later.
  const approved = await db.select().from(campaigns).where(eq(campaigns.status, "APPROVED"));
  for (const c of approved) await approveCampaign(c.id, "demo buyers script");
  console.log(`Re-checked ${approved.length} approved campaign(s).`);
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
