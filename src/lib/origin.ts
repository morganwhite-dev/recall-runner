import type { NextRequest } from "next/server";

// The public address this request came in on. Behind Render's proxy the real host and
// protocol are in the x-forwarded headers, so we read those instead of the internal URL.
export function appOrigin(request: NextRequest): string {
  const host =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}
