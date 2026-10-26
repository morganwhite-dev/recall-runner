import { and, eq, inArray } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import {
  buyerLinks,
  campaigns,
  cases,
  db,
  loginAttemptItems,
  loginAttempts,
  orders,
  recalls,
} from "@/db";
import { CHOICE_FOR, type RemedyKind } from "@/lib/buyer";
import { appOrigin } from "@/lib/origin";
import { PAYPAL_SIGNIN_URL } from "@/lib/paypal";

const MAX_PICKS = 12;

// "Confirm with PayPal": /api/auth/paypal/login?token=<buyer link>&pick=<case id>:<remedy>[&pick=...]
// One sign-in can settle several of a buyer's recalls, one pick per case. We check every pick
// (the link owns the case, the case is still open, the recall offers that remedy), remember them
// in login_attempts, then send the buyer to PayPal. The random "state" value is also saved in a
// cookie and checked on return, so a login can only finish in the browser that started it.
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const token = params.get("token") ?? "";
  const picks = params
    .getAll("pick")
    .slice(0, MAX_PICKS)
    .map((p) => {
      const [caseId, remedy] = p.split(":");
      return { caseId, remedy: remedy as RemedyKind };
    });

  const back = (query = "") =>
    NextResponse.redirect(`${appOrigin(request)}/r/${encodeURIComponent(token)}${query}`);

  const valid = picks.every(
    (p) => /^[0-9a-f-]{36}$/.test(p.caseId) && p.remedy in CHOICE_FOR,
  );
  if (picks.length === 0 || !valid || new Set(picks.map((p) => p.caseId)).size !== picks.length) {
    return back();
  }

  // Every case must belong to the buyer this link was made for, in an approved campaign, still
  // waiting for a choice.
  const [link] = await db.select().from(buyerLinks).where(eq(buyerLinks.token, token));
  if (!link) return back();
  const rows = await db
    .select({ kase: cases, campaign: campaigns, recall: recalls })
    .from(cases)
    .innerJoin(orders, eq(cases.orderId, orders.id))
    .innerJoin(campaigns, eq(cases.campaignId, campaigns.id))
    .innerJoin(recalls, eq(campaigns.recallId, recalls.id))
    .where(
      and(
        eq(orders.buyerId, link.buyerId),
        inArray(cases.id, picks.map((p) => p.caseId)),
      ),
    );
  if (rows.length !== picks.length) return back();
  for (const p of picks) {
    const row = rows.find((r) => r.kase.id === p.caseId)!;
    const offered = row.recall.remedyOptions.map((o) => o.toLowerCase());
    if (row.campaign.status !== "APPROVED" || row.kase.status !== "OPEN") return back();
    if (!offered.includes(p.remedy)) return back();
  }

  const origin = appOrigin(request);
  const state = crypto.randomUUID();
  await db.insert(loginAttempts).values({ state, buyerId: link.buyerId });
  await db.insert(loginAttemptItems).values(
    picks.map((p) => ({ state, caseId: p.caseId, choice: CHOICE_FOR[p.remedy] })),
  );

  const authorize = new URL(PAYPAL_SIGNIN_URL);
  authorize.searchParams.set("client_id", process.env.PAYPAL_CLIENT_ID ?? "");
  authorize.searchParams.set("response_type", "code");
  authorize.searchParams.set("scope", "openid email");
  authorize.searchParams.set("redirect_uri", `${origin}/api/auth/paypal/callback`);
  authorize.searchParams.set("state", state);

  const response = NextResponse.redirect(authorize);
  const cookie = {
    httpOnly: true,
    secure: origin.startsWith("https"),
    sameSite: "lax" as const,
    maxAge: 600,
    path: "/api/auth/paypal",
  };
  response.cookies.set("paypal_oauth_state", state, cookie);
  // Remember which buyer page to return to; the token is already in the URL they came from.
  response.cookies.set("paypal_return_token", token, cookie);
  return response;
}
