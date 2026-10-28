// A PayPal sign-in link can be opened twice (for example after a browser safety warning makes the
// buyer click through and the callback runs again). The second run must never pay or claim
// anything. The only thing it may do is send the buyer on to the success view the first run
// already produced, and only when that is plainly true.

// Where a replayed sign-in should land, or null if it should be treated as expired.
//   - the sign-in must have been used already (a fresh one is not a replay)
//   - it must belong to the same buyer as the link the browser came from
//   - every case it covered must already be finished
export function replayDestination(
  attempt: { buyerId: string | null; usedAt: Date | null },
  linkBuyerId: string | null,
  cases: { id: string; status: string }[],
  finished: readonly string[],
): string | null {
  if (!attempt.usedAt || !attempt.buyerId) return null;
  if (!linkBuyerId || attempt.buyerId !== linkBuyerId) return null;
  if (cases.length === 0) return null;
  if (!cases.every((c) => finished.includes(c.status))) return null;
  return `?done=${cases.map((c) => c.id).join(",")}`;
}
