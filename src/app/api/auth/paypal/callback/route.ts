import { and, eq, gt, inArray, isNull } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import {
  agentDecisions,
  buyerLinks,
  buyers,
  campaigns,
  cases,
  db,
  loginAttemptItems,
  loginAttempts,
} from "@/db";
import { emailsMatch, verifiedPayPalEmail } from "@/lib/buyer";
import { executeCase, FINISHED } from "@/lib/executor";
import { appOrigin } from "@/lib/origin";
import { fetchPayPalIdentity } from "@/lib/paypal";
import { replayDestination } from "@/lib/replay";

const ATTEMPT_LIFETIME_MS = 10 * 60 * 1000;

// PayPal sends the buyer back here with a one-time code. In order:
//   1. the state in the URL must equal the state in the cookie, and be a fresh, unused attempt
//   2. exchange the code for the PayPal identity (the email PayPal itself has verified)
//   3. that email must equal the buyer's email on the orders, or nothing happens
//   4. only then record the choices and let the executor (policy engine + PayPal) act on each case
// One sign-in can cover several recalls; the identity is checked once for all of them.
export async function GET(request: NextRequest) {
  const origin = appOrigin(request);
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const expected = request.cookies.get("paypal_oauth_state")?.value;
  const token = request.cookies.get("paypal_return_token")?.value ?? "";

  const to = (query: string) => {
    const res = NextResponse.redirect(
      `${origin}/r/${encodeURIComponent(token)}${query}`,
    );
    // The login is over either way; clear its cookies.
    res.cookies.delete({
      name: "paypal_oauth_state",
      path: "/api/auth/paypal",
    });
    res.cookies.delete({
      name: "paypal_return_token",
      path: "/api/auth/paypal",
    });
    return res;
  };

  if (!token) {
    return new Response(
      "Sign-in could not be verified. Open your recall link and try again.",
      {
        status: 400,
      },
    );
  }
  // A sign-in that was already used and already settled is a replay (the buyer reopened the
  // callback link). It never pays or claims again; it only returns to the success view.
  const replayOrExpired = async () => {
    if (!state) return to("?result=expired");
    const [used] = await db
      .select()
      .from(loginAttempts)
      .where(eq(loginAttempts.state, state));
    if (!used) return to("?result=expired");
    const [link] = await db
      .select({ buyerId: buyerLinks.buyerId })
      .from(buyerLinks)
      .where(eq(buyerLinks.token, token));
    const covered = await db
      .select({ id: cases.id, status: cases.status })
      .from(loginAttemptItems)
      .innerJoin(cases, eq(loginAttemptItems.caseId, cases.id))
      .where(eq(loginAttemptItems.state, state));
    const dest = replayDestination(used, link?.buyerId ?? null, covered, FINISHED);
    return to(dest ?? "?result=expired");
  };

  if (!state || !expected || state !== expected) return replayOrExpired();
  // The buyer closed or declined PayPal's page: nothing to do, show their recalls again.
  if (!code) return to("");

  // Claim the attempt atomically: only the first request with this state gets a row back.
  const [attempt] = await db
    .update(loginAttempts)
    .set({ usedAt: new Date() })
    .where(
      and(
        eq(loginAttempts.state, state),
        isNull(loginAttempts.usedAt),
        gt(loginAttempts.createdAt, new Date(Date.now() - ATTEMPT_LIFETIME_MS)),
      ),
    )
    .returning();
  if (!attempt) return replayOrExpired();

  // Who is signing in, and what they chose for each recall in this one sign-in.
  const [buyer] = attempt.buyerId
    ? await db.select().from(buyers).where(eq(buyers.id, attempt.buyerId))
    : [];
  const items = await db
    .select({ item: loginAttemptItems, kase: cases, campaign: campaigns })
    .from(loginAttemptItems)
    .innerJoin(cases, eq(loginAttemptItems.caseId, cases.id))
    .innerJoin(campaigns, eq(cases.campaignId, campaigns.id))
    .where(eq(loginAttemptItems.state, state));
  if (!buyer || items.length === 0) return to("?result=expired");

  let verified: string | null;
  try {
    const identity = await fetchPayPalIdentity(code, `${origin}/api/auth/paypal/callback`);
    verified = verifiedPayPalEmail(identity);
  } catch (err) {
    console.error("paypal login error:", err instanceof Error ? err.message : err);
    return to("?result=error");
  }

  const log = (kase: { id: string; campaignId: string }, merchantId: string, summary: string, detail: unknown = null) =>
    db.insert(agentDecisions).values({
      merchantId,
      campaignId: kase.campaignId,
      caseId: kase.id,
      step: "CLAIM",
      actor: "RULE",
      summary,
      detail,
    });

  // One identity check covers every case in this sign-in: they all belong to the same buyer.
  if (!emailsMatch(buyer.email, verified)) {
    for (const { kase, campaign } of items) {
      await log(
        kase,
        campaign.merchantId,
        verified
          ? "The PayPal account that signed in is not the one on the order. Nothing was sent."
          : "PayPal did not return a verified email for this sign-in. Nothing was sent.",
        { matched: false },
      );
    }
    return to("?result=mismatch");
  }

  // Identity confirmed. Record each choice and the verified email, then run the money step for
  // each case, one after another (PayPal calls are rate limited).
  const done: string[] = [];
  let problems = 0;
  for (const { item, kase, campaign } of items) {
    await db
      .update(cases)
      .set({ choice: item.choice, verifiedEmail: verified, updatedAt: new Date() })
      .where(and(eq(cases.id, kase.id), inArray(cases.status, ["OPEN", "FAILED"])));
    await log(
      kase,
      campaign.merchantId,
      `The buyer signed in with PayPal and PayPal's verified email matches the order. They chose: ${item.choice}.`,
      { matched: true, choice: item.choice },
    );
    const result = await executeCase(kase.id);
    if (result.error || !FINISHED.includes(result.status)) {
      console.error("executeCase problem:", result.error ?? result.status);
      problems += 1;
    } else {
      done.push(kase.id);
    }
  }
  if (done.length === 0) return to("?result=error");
  return to(`?done=${done.join(",")}${problems ? "&result=partial" : ""}`);
}
