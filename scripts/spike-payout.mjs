// Phase 0 spike: send a PayPal Payout to a sandbox personal account.
// Run: node --env-file=.env.local scripts/spike-payout.mjs <sandbox-personal-email>
// Prints only statuses and IDs, never credentials.

if (process.env.PAYPAL_ENV !== "sandbox") {
  console.error("Refusing to run: PAYPAL_ENV must be 'sandbox'.");
  process.exit(1);
}

const receiver = process.argv[2];
if (!receiver || !receiver.endsWith("@personal.example.com")) {
  console.error("Pass a sandbox personal email (ends with @personal.example.com).");
  process.exit(1);
}

const BASE = "https://api-m.sandbox.paypal.com";
const basic = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString("base64");

const tokenRes = await fetch(`${BASE}/v1/oauth2/token`, {
  method: "POST",
  headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/x-www-form-urlencoded" },
  body: "grant_type=client_credentials",
});
if (!tokenRes.ok) {
  console.log(`FAIL  OAuth token  HTTP ${tokenRes.status}`);
  process.exit(1);
}
const { access_token: token } = await tokenRes.json();

const stamp = Date.now();
const res = await fetch(`${BASE}/v1/payments/payouts`, {
  method: "POST",
  headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", "PayPal-Request-Id": `spike-payout-${stamp}` },
  body: JSON.stringify({
    sender_batch_header: { sender_batch_id: `spike-${stamp}`, email_subject: "Recall Runner spike payout" },
    items: [
      {
        recipient_type: "EMAIL",
        receiver,
        amount: { value: "1.00", currency: "USD" },
        note: "Recall Runner spike payout",
        sender_item_id: `item-${stamp}`,
      },
    ],
  }),
});
const json = await res.json().catch(() => ({}));
console.log(`${res.ok ? "PASS" : "FAIL"}  Create payout  HTTP ${res.status}${!res.ok ? `  ${json.name ?? ""} ${json.message ?? ""}` : ""}`);
if (!res.ok) process.exit(1);

const batchId = json.batch_header.payout_batch_id;
console.log("      batch id:", batchId, " status:", json.batch_header.batch_status);

await new Promise((r) => setTimeout(r, 4000));
const check = await fetch(`${BASE}/v1/payments/payouts/${batchId}`, { headers: { Authorization: `Bearer ${token}` } });
const checkJson = await check.json().catch(() => ({}));
const item = checkJson.items?.[0];
console.log(`${check.ok ? "PASS" : "FAIL"}  Look up payout  HTTP ${check.status}`);
console.log("      batch status:", checkJson.batch_header?.batch_status, " item status:", item?.transaction_status ?? "n/a", item?.errors?.name ?? "");
