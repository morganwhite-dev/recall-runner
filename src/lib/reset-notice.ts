// What the dashboard says after "Start fresh demo" did not simply start a fresh demo. Pure helpers
// (no database), so they can be unit tested; the reset itself lives in demo-reset.ts.
//
//   cooldownLeftMs:     how long until another reset is allowed
//   resetRedirectPath:  the dashboard address that carries the outcome (?reset=...)
//   resetNoticeFrom:    reads that address back into what the banner should show

export const COOLDOWN_MS = 60_000; // one reset a minute, so a button-masher can't burn PayPal calls

export function cooldownLeftMs(lastResetMs: number, nowMs: number): number {
  return Math.max(0, Math.min(COOLDOWN_MS, lastResetMs + COOLDOWN_MS - nowMs));
}

export type ResetNotice =
  | { kind: "cooldown"; leftMs: number; since: number }
  | { kind: "error" };

// `since` is when the other visitor's reset started (epoch ms). Without it the address says only
// that the reset failed.
export function resetRedirectPath(outcome: { cooldownSince: number } | "error" | "done"): string {
  if (outcome === "done") return "/dashboard";
  if (outcome === "error") return "/dashboard?reset=error";
  return `/dashboard?reset=cooldown&since=${Math.round(outcome.cooldownSince)}`;
}

// Anything unreadable shows no banner, so a hand-edited address can't show a wrong message. An old
// address is safe too: the time left is worked out from `since` and the clock now.
export function resetNoticeFrom(
  reset: unknown,
  since: unknown,
  nowMs: number = Date.now(),
): ResetNotice | null {
  if (reset === "error") return { kind: "error" };
  if (reset !== "cooldown" || typeof since !== "string" || !/^\d{1,15}$/.test(since)) return null;
  const sinceMs = Number(since);
  return { kind: "cooldown", leftMs: cooldownLeftMs(sinceMs, nowMs), since: sinceMs };
}

// "1 second", "45 seconds".
export function secondsLabel(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${s} ${s === 1 ? "second" : "seconds"}`;
}
