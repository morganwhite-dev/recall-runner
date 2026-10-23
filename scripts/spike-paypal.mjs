// Phase 0 spike: prove the PayPal sandbox calls Recall Runner depends on actually work.
// Run: node --env-file=.env.local scripts/spike-paypal.mjs
// Prints only statuses and IDs, never credentials.

if (process.env.PAYPAL_ENV !== "sandbox") {
  console.error("Refusing to run: PAYPAL_ENV must be 'sandbox'.");
  process.exit(1);
}

const BASE = "https://api-m.sandbox.paypal.com";
const { PAYPAL_CLIENT_ID: id, PAYPAL_CLIENT_SECRET: secret } = process.env;

async function call(label, path, { method = "GET", body, token, requestId } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: token ? `Bearer ${token}` : `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
      ...(requestId ? { "PayPal-Request-Id": requestId } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  const issues = json.details?.map((d) => d.issue).join(", ");
  console.log(`${res.ok ? "PASS" : "FAIL"}  ${label}  HTTP ${res.status}${issues ? `  issue: ${issues}` : ""}${!res.ok && json.name ? `  (${json.name})` : ""}`);
  return { ok: res.ok, status: res.status, json };
}

// 1. OAuth token
const tokenRes = await fetch(`${BASE}/v1/oauth2/token`, {
  method: "POST",
  headers: {
    Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
    "Content-Type": "application/x-www-form-urlencoded",
  },
  body: "grant_type=client_credentials",
});
const tokenJson = await tokenRes.json();
console.log(`${tokenRes.ok ? "PASS" : "FAIL"}  1. OAuth token  HTTP ${tokenRes.status}`);
if (!tokenRes.ok) process.exit(1);
const token = tokenJson.access_token;
console.log("      scopes granted:", (tokenJson.scope || "").split(" ").map((s) => s.split("/").pop()).join(", "));

// 2. Create + capture an order paid by a sandbox test card (no buyer approval step)
const stamp = Date.now();
const order = await call("2. Create order with test card", "/v2/checkout/orders", {
  method: "POST",
  token,
  requestId: `spike-order-${stamp}`,
  body: {
    intent: "CAPTURE",
    purchase_units: [
      {
        reference_id: `spike-${stamp}`,
        amount: { currency_code: "USD", value: "18.00" },
        description: "Recall Runner spike order",
      },
    ],
    payment_source: {
      card: {
        number: "4111111111111111",
        expiry: "2030-12",
        security_code: "123",
        name: "Spike Tester",
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

let captureId = order.json.purchase_units?.[0]?.payments?.captures?.[0]?.id;
console.log("      order status:", order.json.status ?? "n/a", " capture present:", Boolean(captureId));

if (order.ok && !captureId && order.json.id) {
  const cap = await call("2b. Capture order", `/v2/checkout/orders/${order.json.id}/capture`, {
    method: "POST",
    token,
    requestId: `spike-capture-${stamp}`,
  });
  captureId = cap.json.purchase_units?.[0]?.payments?.captures?.[0]?.id;
}

// 3. Refund the capture
if (captureId) {
  await call("3. Refund the capture", `/v2/payments/captures/${captureId}/refund`, {
    method: "POST",
    token,
    requestId: `spike-refund-${stamp}`,
    body: { note_to_payer: "Recall Runner spike refund" },
  });
} else {
  console.log("SKIP  3. Refund (no capture available; see failure above)");
}

console.log("\nPayout and webhook spikes run separately once we have a sandbox personal email and a public URL.");
