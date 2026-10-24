// Hardened PayPal calls for anything that moves money or ships a replacement.
// Three protections:
//   1. Rate limiter: at most 30 calls a minute. PayPal's sandbox blocks an IP for 5 minutes at 50.
//   2. Safe retries: a failed call is retried with the SAME PayPal-Request-Id, so PayPal treats the
//      retry as the same request and cannot refund twice.
//   3. Circuit breaker: if PayPal answers 429 (too many requests), pause all calls for 5 minutes.
// The limiter lives in memory, which is fine because the app runs as one server on Render.
import { BASE, getAccessToken } from "./paypal";

const LIMIT_PER_MINUTE = 30;
const PAUSE_AFTER_429_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 3;

let tokens = LIMIT_PER_MINUTE;
let lastRefill = Date.now();
let pausedUntil = 0;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class PayPalError extends Error {
  constructor(
    message: string,
    public status: number,
    public issue?: string,
    public body?: unknown,
  ) {
    super(message);
  }
}

// Token bucket: the bucket refills at 30 tokens a minute; each call spends one.
async function takeToken() {
  for (;;) {
    const now = Date.now();
    if (now < pausedUntil) {
      throw new PayPalError(
        `PayPal calls are paused after a rate-limit warning until ${new Date(pausedUntil).toISOString()}`,
        429,
        "RATE_LIMIT_PAUSE",
      );
    }
    tokens = Math.min(
      LIMIT_PER_MINUTE,
      tokens + ((now - lastRefill) / 60_000) * LIMIT_PER_MINUTE,
    );
    lastRefill = now;
    if (tokens >= 1) {
      tokens -= 1;
      return;
    }
    await sleep(((1 - tokens) / LIMIT_PER_MINUTE) * 60_000);
  }
}

export async function paypalRequest<T = Record<string, unknown>>(
  path: string,
  options: { method?: string; body?: unknown; requestId?: string } = {},
): Promise<{ status: number; data: T }> {
  const method = options.method ?? "GET";

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    await takeToken();
    const token = await getAccessToken();

    let res: Response;
    try {
      res = await fetch(BASE + path, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          ...(options.requestId
            ? { "PayPal-Request-Id": options.requestId }
            : {}),
        },
        body:
          options.body === undefined ? undefined : JSON.stringify(options.body),
      });
    } catch (err) {
      // Network failure: we don't know if PayPal got it, so retry with the same request id.
      if (attempt < MAX_ATTEMPTS) {
        await sleep(500 * 2 ** attempt);
        continue;
      }
      throw new PayPalError(
        `PayPal ${method} ${path} network error: ${String(err)}`,
        0,
      );
    }

    const data = (await res.json().catch(() => ({}))) as T & {
      name?: string;
      details?: { issue?: string }[];
    };
    if (res.ok) return { status: res.status, data };

    if (res.status === 429) {
      pausedUntil = Date.now() + PAUSE_AFTER_429_MS;
      throw new PayPalError(
        `PayPal rate limit hit on ${method} ${path}`,
        429,
        "RATE_LIMIT_REACHED",
        data,
      );
    }
    if (res.status >= 500 && attempt < MAX_ATTEMPTS) {
      await sleep(500 * 2 ** attempt); // wait 1s, then 2s
      continue;
    }

    const issue = data.details?.[0]?.issue ?? data.name;
    throw new PayPalError(
      `PayPal ${method} ${path} failed: HTTP ${res.status} ${issue ?? ""}`,
      res.status,
      issue,
      data,
    );
  }
  throw new PayPalError(
    `PayPal ${method} ${path} failed after ${MAX_ATTEMPTS} attempts`,
    0,
  );
}

const usd = (cents: number) => (cents / 100).toFixed(2);

// Creates and captures a sandbox order paid by PayPal's test card, with no buyer approval step.
// Used to give seeded demo orders a real PayPal payment.
export async function createCardOrder(
  amountCents: number,
  description: string,
  requestId: string,
) {
  const { data } = await paypalRequest<{
    id: string;
    status: string;
    purchase_units?: { payments?: { captures?: { id: string }[] } }[];
  }>("/v2/checkout/orders", {
    method: "POST",
    requestId,
    body: {
      intent: "CAPTURE",
      purchase_units: [
        {
          amount: { currency_code: "USD", value: usd(amountCents) },
          description,
        },
      ],
      payment_source: {
        card: {
          number: "4111111111111111", // PayPal's published sandbox test card
          expiry: "2030-12",
          security_code: "123",
          name: "Demo Buyer",
          billing_address: {
            address_line_1: "1 Market St",
            admin_area_2: "San Jose",
            admin_area_1: "CA",
            postal_code: "95131",
            country_code: "US",
          },
        },
      },
    },
  });
  const captureId = data.purchase_units?.[0]?.payments?.captures?.[0]?.id;
  if (!captureId)
    throw new PayPalError(
      `Order ${data.id} has no capture (status ${data.status})`,
      200,
    );
  return { orderId: data.id, captureId };
}

// Refunds part or all of a captured payment back to how the buyer paid.
export async function refundCapture(
  captureId: string,
  amountCents: number,
  requestId: string,
  note: string,
) {
  const { data } = await paypalRequest<{ id: string; status: string }>(
    `/v2/payments/captures/${captureId}/refund`,
    {
      method: "POST",
      requestId,
      body: {
        amount: { value: usd(amountCents), currency_code: "USD" },
        note_to_payer: note.slice(0, 255),
      },
    },
  );
  return { refundId: data.id, status: data.status, raw: data };
}

// Sends money to a PayPal account by email. The batch id is our request id, and PayPal rejects a
// reused batch id, so the same payout cannot be sent twice.
export async function sendPayout(
  email: string,
  amountCents: number,
  requestId: string,
  note: string,
) {
  const { data } = await paypalRequest<{
    batch_header: { payout_batch_id: string; batch_status: string };
  }>("/v1/payments/payouts", {
    method: "POST",
    requestId,
    body: {
      sender_batch_header: {
        sender_batch_id: requestId,
        email_subject: "Your recall payment from Brightnest Home",
      },
      items: [
        {
          recipient_type: "EMAIL",
          receiver: email,
          amount: { value: usd(amountCents), currency: "USD" },
          note: note.slice(0, 4000),
          sender_item_id: requestId,
        },
      ],
    },
  });
  return {
    batchId: data.batch_header.payout_batch_id,
    status: data.batch_header.batch_status,
    raw: data,
  };
}

// Adds a replacement shipment's tracking number to the original PayPal order.
export async function addTracking(
  paypalOrderId: string,
  captureId: string,
  trackingNumber: string,
  requestId: string,
) {
  const { data } = await paypalRequest(
    `/v2/checkout/orders/${paypalOrderId}/track`,
    {
      method: "POST",
      requestId,
      body: {
        capture_id: captureId,
        tracking_number: trackingNumber,
        carrier: "OTHER",
        carrier_name_other: "Brightnest Courier",
        notify_payer: false,
      },
    },
  );
  return { trackingNumber, raw: data };
}
