import { and, eq, gt, isNull } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import {
  agentDecisions,
  buyers,
  campaigns,
  cases,
  db,
  loginAttempts,
  orders,
} from "@/db";
import { emailsMatch, verifiedPayPalEmail } from "@/lib/buyer";
import { executeCase } from "@/lib/executor";
import { appOrigin } from "@/lib/origin";
import { fetchPayPalIdentity } from "@/lib/paypal";

const ATTEMPT_LIFETIME_MS = 10 * 60 * 1000;

// PayPal sends the buyer back here with a one-time code. In order:
//   1. the state in the URL must equal the state in the cookie, and be a fresh, unused attempt
//   2. exchange the code for the PayPal identity (the email PayPal itself has verified)
//   3. that email must equal the email on the order, or nothing happens
//   4. only then record the buyer's choice and let the executor (policy engine + PayPal) act
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
  if (!state || !expected || state !== expected) return to("?result=expired");
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
  if (!attempt) return to("?result=expired");

  const [row] = await db
    .select({ kase: cases, buyer: buyers, campaign: campaigns })
    .from(cases)
    .innerJoin(orders, eq(cases.orderId, orders.id))
    .innerJoin(buyers, eq(orders.buyerId, buyers.id))
    .innerJoin(campaigns, eq(cases.campaignId, campaigns.id))
    .where(eq(cases.id, attempt.caseId));
  if (!row) return to("?result=expired");
  const { kase, buyer, campaign } = row;

  let verified: string | null;
  try {
    const identity = await fetchPayPalIdentity(
      code,
      `${origin}/api/auth/paypal/callback`,
    );
    verified = verifiedPayPalEmail(identity);
  } catch (err) {
    console.error(
      "paypal login error:",
      err instanceof Error ? err.message : err,
    );
    return to(`?result=error&case=${kase.id}`);
  }

  const log = (summary: string, detail: unknown = null) =>
    db.insert(agentDecisions).values({
      merchantId: campaign.merchantId,
      campaignId: campaign.id,
      caseId: kase.id,
      step: "CLAIM",
      actor: "RULE",
      summary,
      detail,
    });

  if (!emailsMatch(buyer.email, verified)) {
    await log(
      verified
        ? "The PayPal account that signed in is not the one on the order. Nothing was sent."
        : "PayPal did not return a verified email for this sign-in. Nothing was sent.",
      { matched: false },
    );
    return to(`?result=mismatch&case=${kase.id}`);
  }

  // Identity confirmed. Record the choice and the verified email, then run the money step.
  await db
    .update(cases)
    .set({
      choice: attempt.choice,
      verifiedEmail: verified,
      updatedAt: new Date(),
    })
    .where(and(eq(cases.id, kase.id), eq(cases.status, "OPEN")));
  await log(
    `The buyer signed in with PayPal and PayPal's verified email matches the order. They chose: ${attempt.choice}.`,
    { matched: true, choice: attempt.choice },
  );

  const result = await executeCase(kase.id);
  if (result.error) {
    console.error("executeCase error:", result.error);
    return to(`?result=error&case=${kase.id}`);
  }
  return to(`?case=${kase.id}`);
}
