import { NextRequest } from "next/server";
import { fetchPayPalIdentity } from "@/lib/paypal";
import { appOrigin } from "@/lib/origin";

// Phase 0 spike: PayPal sends the buyer back here with a one-time code. We check the state
// cookie, exchange the code for the buyer's verified PayPal identity, and show the result.
// Nothing is stored. In Phase 4 this identity is compared with the email on the original order.
function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (c) => `&#${c.charCodeAt(0)};`,
  );
}

function page(title: string, body: string, status = 200) {
  return new Response(
    `<!doctype html><meta charset="utf-8"><title>${escapeHtml(title)}</title>
     <body style="font-family:system-ui;max-width:32rem;margin:3rem auto;padding:0 1rem">
     <h1>${escapeHtml(title)}</h1>${body}</body>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const expected = request.cookies.get("paypal_oauth_state")?.value;

  if (!code || !state || !expected || state !== expected) {
    return page(
      "Sign-in could not be verified",
      "<p>The sign-in state did not match. Please try again.</p>",
      400,
    );
  }

  try {
    const identity = await fetchPayPalIdentity(
      code,
      `${appOrigin(request)}/api/auth/paypal/callback`,
    );
    const email = identity.email ?? identity.emails ?? "(no email returned)";
    return page(
      "Signed in with PayPal",
      `<p>PayPal confirmed this buyer.</p>
       <p><strong>Email:</strong> ${escapeHtml(email)}</p>
       <p><strong>Email verified:</strong> ${escapeHtml(identity.email_verified ?? "not reported")}</p>
       <p><strong>Fields PayPal returned:</strong> ${escapeHtml(Object.keys(identity).join(", "))}</p>`,
    );
  } catch (err) {
    console.error(
      "paypal login error:",
      err instanceof Error ? err.message : err,
    );
    return page(
      "Sign-in failed",
      "<p>PayPal sign-in did not complete. Check the server log.</p>",
      502,
    );
  }
}
