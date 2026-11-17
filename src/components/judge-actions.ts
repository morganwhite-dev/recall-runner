"use server";

import { buyerLinks, buyers, db } from "@/db";
import { sandboxLogin } from "@/lib/sandbox-buyers";
import { eq } from "drizzle-orm";

// Returns the sandbox login for the buyer whose page is open, when a visitor presses "Show
// sandbox login". It is read on demand instead of being written into the page, so the page HTML
// never contains an email and password next to a PayPal button (that combination is what browser
// phishing checks look for). The token decides which buyer, so a page can only reveal its own
// login. These are PayPal SANDBOX test accounts with fake money, so showing them is intended.
export async function revealJudgeLogin(token: string): Promise<{
  email: string;
  password: string;
} | null> {
  if (typeof token !== "string" || token.length > 100) return null;
  const [row] = await db
    .select({ key: buyers.sandboxKey })
    .from(buyerLinks)
    .innerJoin(buyers, eq(buyerLinks.buyerId, buyers.id))
    .where(eq(buyerLinks.token, token));
  return sandboxLogin(row?.key);
}
