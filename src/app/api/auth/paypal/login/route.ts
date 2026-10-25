import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import {
  buyerLinks,
  campaigns,
  cases,
  db,
  loginAttempts,
  orders,
  recalls,
} from "@/db";
import { CHOICE_FOR, type RemedyKind } from "@/lib/buyer";
import { appOrigin } from "@/lib/origin";
import { PAYPAL_SIGNIN_URL } from "@/lib/paypal";

// "Confirm with PayPal": /api/auth/paypal/login?token=<buyer link>&case=<case id>&remedy=<kind>
// We check the link owns the case and the remedy is one the recall offers, remember the click in
// login_attempts, then send the buyer to PayPal. The random "state" value is also saved in a
// cookie and checked on return, so a login can only finish in the browser that started it.
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const token = params.get("token") ?? "";
  const caseId = params.get("case") ?? "";
  const remedy = params.get("remedy") as RemedyKind | null;

  const back = (query = "") =>
    NextResponse.redirect(
      `${appOrigin(request)}/r/${encodeURIComponent(token)}${query}`,
    );

  if (!remedy || !(remedy in CHOICE_FOR) || !/^[0-9a-f-]{36}$/.test(caseId)) {
    return back();
  }

  // The case must belong to the buyer this link was made for, and still be waiting for a choice.
  const [row] = await db
    .select({ kase: cases, campaign: campaigns, recall: recalls })
    .from(buyerLinks)
    .innerJoin(orders, eq(orders.buyerId, buyerLinks.buyerId))
    .innerJoin(cases, eq(cases.orderId, orders.id))
    .innerJoin(campaigns, eq(cases.campaignId, campaigns.id))
    .innerJoin(recalls, eq(campaigns.recallId, recalls.id))
    .where(and(eq(buyerLinks.token, token), eq(cases.id, caseId)));
  if (
    !row ||
    row.campaign.status !== "APPROVED" ||
    row.kase.status !== "OPEN"
  ) {
    return back();
  }
  const offered = row.recall.remedyOptions.map((o) => o.toLowerCase());
  const wanted = { refund: "refund", replace: "replace", repair: "repair" }[
    remedy
  ];
  if (!offered.includes(wanted)) return back();

  const origin = appOrigin(request);
  const state = crypto.randomUUID();
  await db
    .insert(loginAttempts)
    .values({ state, caseId, choice: CHOICE_FOR[remedy] });

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
    secure: origin.startsWith("https"),
    sameSite: "lax",
    maxAge: 600,
    path: "/api/auth/paypal",
  });
  // Remember which buyer page to return to; the token is already in the URL they came from.
  response.cookies.set("paypal_return_token", token, {
    httpOnly: true,
    secure: origin.startsWith("https"),
    sameSite: "lax",
    maxAge: 600,
    path: "/api/auth/paypal",
  });
  return response;
}
