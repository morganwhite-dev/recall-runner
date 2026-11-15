"use server";

import { loadBuyerPage, markOpened } from "@/lib/buyer";

// Marks the buyer's notices as opened. Called from the browser after the page loads, not while
// the server renders it, so email link scanners that only fetch the page don't count as a read.
// Only cases that belong to this buyer link are touched.
export async function markOpenedForLink(token: string, caseIds: string[]) {
  const page = await loadBuyerPage(token);
  if (!page) return;
  const own = new Set(page.cases.map((c) => c.caseId));
  await markOpened(caseIds.filter((id) => own.has(id)));
}
