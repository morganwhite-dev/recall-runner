import { eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { buyerLinks, db } from "@/db";

// A streamed buyer page has already sent HTTP 200 by the time it can call notFound().
export async function proxy(request: NextRequest) {
  const missing = () => NextResponse.rewrite(new URL("/_not-found", request.url));
  let token: string;
  try {
    token = decodeURIComponent(request.nextUrl.pathname.split("/")[2]);
  } catch {
    return missing();
  }
  // Buyer links are generated from 32 random bytes, encoded as unpadded base64url.
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return missing();

  try {
    const [link] = await db
      .select({ token: buyerLinks.token })
      .from(buyerLinks)
      .where(eq(buyerLinks.token, token));
    return link ? NextResponse.next() : missing();
  } catch {
    // Database trouble must not take buyer pages down here: the page does its own lookup and shows its own error.
    return NextResponse.next();
  }
}

export const config = { matcher: "/r/:token" };
