// Caps paid AI re-runs from the dashboard: one every 30 s and 12 per hour, shared by all visitors.
// In memory on purpose: the demo runs as a single server, and a restart only resets the counter.
const GAP_MS = 30_000;
const PER_HOUR = 12;
const HOUR_MS = 3_600_000;

let starts: number[] = [];

export function takeRerunSlot(now = Date.now()): { ok: true } | { ok: false; waitSeconds: number } {
  starts = starts.filter((t) => now - t < HOUR_MS);
  const last = starts[starts.length - 1];
  if (last !== undefined && now - last < GAP_MS)
    return { ok: false, waitSeconds: Math.ceil((GAP_MS - (now - last)) / 1000) };
  if (starts.length >= PER_HOUR)
    return { ok: false, waitSeconds: Math.ceil((HOUR_MS - (now - starts[0])) / 1000) };
  starts.push(now);
  return { ok: true };
}

export function resetRerunLimitForTests() {
  starts = [];
}
