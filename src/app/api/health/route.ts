import { connection } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";

// Keep-awake target for the GitHub Actions pinger (.github/workflows/keep-awake.yml). A cheap
// database round trip also keeps the Neon compute warm. Returns no data and needs no secret.
export async function GET() {
  await connection(); // run per request, never prerendered
  try {
    await db.execute(sql`select 1`);
    return Response.json(
      { ok: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json({ ok: false }, { status: 503 });
  }
}
