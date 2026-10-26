// Gives the sandbox buyer (the one account that can really sign in with PayPal) one recent order
// of each recalled product, so a single login can try every remedy: refund, replacement and repair.
// Safe to re-run: a product the buyer already has an order for is skipped. Also opens cases (and
// notices) for any campaign that is already approved, so the new orders show up straight away.
// Run: npm run demo:sandbox-orders
import { and, eq, like } from "drizzle-orm";
import {
  buyers,
  campaigns,
  db,
  orderItems,
  orders,
  products,
} from "../src/db";
import { pool } from "../src/lib/db";
import { createCardOrder } from "../src/lib/paypal-client";
import { approveCampaign } from "../src/lib/agent/pipeline";

const DAY_MS = 24 * 60 * 60 * 1000;
// sku, days ago
const WANTED: [string, number][] = [
  ["BH-HW-2P", 45], // refund
  ["BH-RC-BP", 30], // replacement
  ["BH-DR-8", 70], // repair
];

async function main() {
  if (process.env.PAYPAL_ENV !== "sandbox") throw new Error("Refusing to run: PAYPAL_ENV must be 'sandbox'");
  const [sandbox] = await db.select().from(buyers).where(like(buyers.email, "%@personal.example.com"));
  if (!sandbox) throw new Error("No sandbox buyer found; run npm run db:seed first");

  const have = await db
    .select({ sku: products.sku })
    .from(orderItems)
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .innerJoin(products, eq(orderItems.productId, products.id))
    .where(eq(orders.buyerId, sandbox.id));
  const owned = new Set(have.map((h) => h.sku));

  let added = 0;
  for (const [sku, daysAgo] of WANTED) {
    if (owned.has(sku)) {
      console.log(`${sku}: sandbox buyer already has an order, skipped`);
      continue;
    }
    const [product] = await db.select().from(products).where(eq(products.sku, sku));
    const [order] = await db
      .insert(orders)
      .values({
        merchantId: product.merchantId,
        buyerId: sandbox.id,
        amountCents: product.priceCents,
        effectiveOrderDate: new Date(Date.now() - daysAgo * DAY_MS),
        dateIsSimulated: true,
      })
      .returning();
    await db.insert(orderItems).values({
      orderId: order.id,
      productId: product.id,
      quantity: 1,
      unitPriceCents: product.priceCents,
    });
    // A real sandbox payment, so refunds and tracking work against PayPal.
    const { orderId, captureId } = await createCardOrder(
      order.amountCents,
      `Brightnest Home order ${order.id.slice(0, 8)}`,
      `sandbox-order-${order.id}`,
    );
    await db.update(orders).set({ paypalOrderId: orderId, paypalCaptureId: captureId }).where(eq(orders.id, order.id));
    console.log(`${sku}: added an order ${daysAgo} days old with a real sandbox payment`);
    added += 1;
  }

  // Approved campaigns open cases only when approved, so re-run approval (it only adds what's missing).
  const approved = await db.select().from(campaigns).where(and(eq(campaigns.status, "APPROVED")));
  for (const c of approved) await approveCampaign(c.id, "sandbox-orders script");
  console.log(`Done. ${added} order(s) added; re-checked ${approved.length} approved campaign(s).`);
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
