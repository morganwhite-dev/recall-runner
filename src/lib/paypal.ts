// Thin PayPal REST client. Sandbox or live is chosen by PAYPAL_ENV; defaults to sandbox.

const BASE =
  process.env.PAYPAL_ENV === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

// Where buyers sign in with their PayPal account (a web page, not the REST API).
export const PAYPAL_SIGNIN_URL =
  process.env.PAYPAL_ENV === "live"
    ? "https://www.paypal.com/signin/authorize"
    : "https://www.sandbox.paypal.com/signin/authorize";

export function paypalBasicAuth(): string {
  return Buffer.from(
    `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`,
  ).toString("base64");
}

// Swaps the one-time code from "Log in with PayPal" for the signed-in buyer's verified identity.
export async function fetchPayPalIdentity(
  code: string,
  redirectUri: string,
): Promise<Record<string, unknown>> {
  const tokenRes = await fetch(`${BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${paypalBasicAuth()}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  });
  if (!tokenRes.ok)
    throw new Error(`code exchange failed: HTTP ${tokenRes.status}`);
  const { access_token } = (await tokenRes.json()) as { access_token: string };

  const infoRes = await fetch(
    `${BASE}/v1/identity/openidconnect/userinfo?schema=openid`,
    {
      headers: { Authorization: `Bearer ${access_token}` },
    },
  );
  if (!infoRes.ok) throw new Error(`userinfo failed: HTTP ${infoRes.status}`);
  return (await infoRes.json()) as Record<string, unknown>;
}

let cached: { token: string; expiresAt: number } | null = null;

// OAuth tokens last about 9 hours. Cache one so we don't spend rate limit on re-logins.
export async function getAccessToken(): Promise<string> {
  if (cached && Date.now() < cached.expiresAt - 60_000) return cached.token;

  const basic = Buffer.from(
    `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`,
  ).toString("base64");

  const res = await fetch(`${BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok)
    throw new Error(`PayPal token request failed: HTTP ${res.status}`);

  const json = (await res.json()) as {
    access_token: string;
    expires_in: number;
  };
  cached = {
    token: json.access_token,
    expiresAt: Date.now() + json.expires_in * 1000,
  };
  return cached.token;
}

// Asks PayPal whether a webhook message really came from PayPal.
// Needs the raw event body and PayPal's transmission headers.
export async function verifyWebhookSignature(
  headers: Headers,
  event: unknown,
): Promise<boolean> {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) throw new Error("PAYPAL_WEBHOOK_ID is not set");

  const token = await getAccessToken();
  const res = await fetch(`${BASE}/v1/notifications/verify-webhook-signature`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      auth_algo: headers.get("paypal-auth-algo"),
      cert_url: headers.get("paypal-cert-url"),
      transmission_id: headers.get("paypal-transmission-id"),
      transmission_sig: headers.get("paypal-transmission-sig"),
      transmission_time: headers.get("paypal-transmission-time"),
      webhook_id: webhookId,
      webhook_event: event,
    }),
  });
  if (!res.ok) return false;

  const json = (await res.json()) as { verification_status?: string };
  return json.verification_status === "SUCCESS";
}
