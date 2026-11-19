import { NextRequest } from "next/server";
import {
  SYNC_WINDOW_DAYS,
  fetchCpscRecalls,
  isAuthorized,
  sinceDate,
  scanPendingRecalls,
  upsertRecalls,
} from "@/lib/cpsc-sync";

// Scheduled live pull from the CPSC feed. Called by GitHub Actions with
// `Authorization: Bearer $CRON_SECRET`. New recalls are queued before the bounded draft scan.
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
    const result = await upsertRecalls(records, true);
    const scans = await scanPendingRecalls();
    return Response.json(
      {
        ok: scans.failed === 0,
        scans,
        since,
        fetched: records.length,
        ...result,
      },
      { status: scans.failed ? 503 : 200 },
    );
  } catch (err) {
    console.error(
      "CPSC sync write failed:",
      err instanceof Error ? err.message : err,
    );
    return Response.json({ error: "database write failed" }, { status: 500 });
  }
}
