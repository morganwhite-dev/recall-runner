import { NextRequest, NextResponse } from "next/server";
import { appOrigin } from "@/lib/origin";
import { PAYPAL_SIGNIN_URL } from "@/lib/paypal";

// Phase 0 spike: send the buyer to PayPal to sign in. A random "state" value is saved in a
// cookie and checked on return, which stops someone else's login being replayed into this browser.

export async function GET(request: NextRequest) {
  const state = crypto.randomUUID();
  const authorize = new URL(PAYPAL_SIGNIN_URL);
  authorize.searchParams.set("client_id", process.env.PAYPAL_CLIENT_ID ?? "");
  authorize.searchParams.set("response_type", "code");
  authorize.searchParams.set("scope", "openid email");
  authorize.searchParams.set(
    "redirect_uri",
    `${appOrigin(request)}/api/auth/paypal/callback`,
  );
  authorize.searchParams.set("state", state);

  const response = NextResponse.redirect(authorize);
  response.cookies.set("paypal_oauth_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/api/auth/paypal",
  });
  return response;
}
