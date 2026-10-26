import { NextRequest } from "next/server";
import { db, webhookEvents } from "@/db";
import { verifyWebhookSignature } from "@/lib/paypal";
import { handleVerifiedEvent, type PayPalEvent } from "@/lib/settle";

// PayPal posts events here (refunds, payouts, disputes). We verify the signature with PayPal
// before trusting anything in the body, record the event once (idempotent on the event id), and
// only then act on it: settle a case, or record that the money did not arrive.
export async function POST(request: NextRequest) {
  const raw = await request.text();

  let event: PayPalEvent;
  try {
    event = JSON.parse(raw);
  } catch {
    return Response.json({ error: "invalid json" }, { status: 400 });
  }
  if (!event.id || !event.event_type) {
    return Response.json(
      { error: "missing event id or type" },
      { status: 400 },
    );
  }

  let verified = false;
  try {
    verified = await verifyWebhookSignature(request.headers, event);
  } catch (err) {
    console.error(
      "webhook verification error:",
      err instanceof Error ? err.message : err,
    );
    return Response.json(
      { error: "verification unavailable" },
      { status: 503 },
    );
  }

  await db
    .insert(webhookEvents)
    .values({
      paypalEventId: event.id,
      eventType: event.event_type,
      verified,
    })
    .onConflictDoNothing({ target: webhookEvents.paypalEventId });

  console.log(`webhook ${event.event_type} verified=${verified}`);
  // Unverified messages are recorded but rejected so PayPal knows they failed.
  if (!verified) {
    return Response.json({ error: "signature not verified" }, { status: 400 });
  }

  // Only a verified event can change a case. Every step is idempotent, so PayPal's retries are
  // safe; if it throws we answer 500 and PayPal sends the event again.
  try {
    const { outcome } = await handleVerifiedEvent(event);
    return Response.json({ ok: true, outcome });
  } catch (err) {
    console.error("webhook handling error:", err instanceof Error ? err.message : err);
    return Response.json({ error: "could not record event" }, { status: 500 });
  }
}
