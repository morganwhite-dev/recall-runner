import { NextRequest } from "next/server";
import {
  SYNC_WINDOW_DAYS,
  fetchCpscRecalls,
  isAuthorized,
  sinceDate,
  upsertRecalls,
} from "@/lib/cpsc-sync";

// Scheduled live pull from the CPSC feed. Called by GitHub Actions with
// `Authorization: Bearer $CRON_SECRET`. Loads the recalls table only; the agent is not run.
export async function GET(request: NextRequest) {
  if (!isAuthorized(request.headers.get("authorization"))) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const since = sinceDate(SYNC_WINDOW_DAYS);
  let records;
  try {
    records = await fetchCpscRecalls(since);
  } catch (err) {
    console.error(
      "CPSC sync fetch failed:",
      err instanceof Error ? err.message : err,
    );
    return Response.json({ error: "cpsc unavailable" }, { status: 502 });
  }

  try {
    const result = await upsertRecalls(records);
    return Response.json({
      ok: true,
      since,
      fetched: records.length,
      ...result,
    });
  } catch (err) {
    console.error(
      "CPSC sync write failed:",
      err instanceof Error ? err.message : err,
    );
    return Response.json({ error: "database write failed" }, { status: 500 });
  }
}
