// Choosing the PayPal request id for a money step, including when a case is tried again.
//
// PayPal treats two calls with the same request id as ONE request and replays the first answer.
// That is exactly what we want after a crash or a timeout (the first call may have worked, so
// asking again with the same id can never pay twice). It is exactly what we do NOT want after a
// failure PayPal clearly gave us: replaying would just return the same failure. So:
//   - first attempt, or an attempt whose outcome we do not know -> the same id every time
//   - after a definite failure                                  -> a new id (adds -retry<N>)
// "Definite" means PayPal rejected the call with a 4xx answer, or told us afterwards by webhook that
// the money did not arrive. A timeout or a 5xx is NOT definite: the call may have gone through.

export type LedgerRow = {
  status: string;
  httpStatus: number | null;
  response: unknown;
};

export function isDefiniteFailure(row: LedgerRow): boolean {
  if (row.status !== "FAILED") return false;
  if (row.httpStatus !== null && row.httpStatus >= 400 && row.httpStatus < 500) return true;
  const told = (row.response as { failure?: unknown } | null)?.failure;
  return told !== undefined && told !== null;
}

export function requestIdFor(caseId: string, action: string, earlier: LedgerRow[]): string {
  const base = `case-${caseId}-${action.toLowerCase()}`;
  const definite = earlier.filter(isDefiniteFailure).length;
  return definite === 0 ? base : `${base}-retry${definite}`;
}
