// Gives every seeded order a real PayPal sandbox payment (an order captured with PayPal's test
// card), so refunds and tracking work against real PayPal records. Orders that already have one
// are skipped, so it's safe to re-run.
// Run: npm run paypal:attach   (after npm run db:seed)
import { eq, isNull } from "drizzle-orm";
import { db, orders } from "../src/db";
import { pool } from "../src/lib/db";
import { createCardOrder } from "../src/lib/paypal-client";

async function main() {
  if (process.env.PAYPAL_ENV !== "sandbox") throw new Error("Refusing to run: PAYPAL_ENV must be 'sandbox'");

  const pending = await db.select().from(orders).where(isNull(orders.paypalCaptureId));
  console.log(`${pending.length} orders need a sandbox payment`);

  for (const order of pending) {
    // A fixed request id per order: if this script is interrupted and re-run, PayPal returns the
    // same order instead of charging the test card again.
    const { orderId, captureId } = await createCardOrder(
      order.amountCents,
      `Brightnest Home order ${order.id.slice(0, 8)}`,
      `seed-capture-${order.id}`,
    );
    await db
      .update(orders)
      .set({ paypalOrderId: orderId, paypalCaptureId: captureId })
      .where(eq(orders.id, order.id));
    process.stdout.write(".");
  }
  console.log(`\nDone. Every order now has a real sandbox capture.`);
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
