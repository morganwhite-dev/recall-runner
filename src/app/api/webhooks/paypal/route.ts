import { NextRequest } from "next/server";
import { ensureWebhookTable, pool } from "@/lib/db";
import { verifyWebhookSignature } from "@/lib/paypal";

// PayPal posts events here (refunds, payouts, disputes). We verify the signature with PayPal
// before trusting anything in the body, then record the event once (idempotent on event id).
export async function POST(request: NextRequest) {
  const raw = await request.text();

  let event: { id?: string; event_type?: string };
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

  await ensureWebhookTable();
  await pool.query(
    `insert into webhook_events (paypal_event_id, event_type, verified)
     values ($1, $2, $3) on conflict (paypal_event_id) do nothing`,
    [event.id, event.event_type, verified],
  );

  console.log(`webhook ${event.event_type} verified=${verified}`);
  // Unverified messages are recorded for the spike but rejected so PayPal knows they failed.
  return verified
    ? Response.json({ ok: true })
    : Response.json({ error: "signature not verified" }, { status: 400 });
}

// Phase 0 spike only: lets us confirm events landed. Event ids are not exposed.
export async function GET(request: NextRequest) {
  request.headers.get("user-agent"); // reading request data keeps this route dynamic, not prerendered
  await ensureWebhookTable();
  const { rows } = await pool.query(
    `select event_type, verified, received_at from webhook_events order by received_at desc limit 10`,
  );
  return Response.json({ count: rows.length, recent: rows });
}
