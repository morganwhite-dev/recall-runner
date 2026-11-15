"use client";

import { useEffect } from "react";
import { markOpenedForLink } from "./actions";

// Renders nothing. Once the page is on screen in a real browser, records that the buyer saw it.
export function MarkOpened({
  token,
  caseIds,
}: {
  token: string;
  caseIds: string[];
}) {
  const key = caseIds.join(",");
  useEffect(() => {
    if (!key) return;
    markOpenedForLink(token, key.split(",")).catch(() => {
      // Losing an "opened" mark is harmless; never show the buyer an error for it.
    });
  }, [token, key]);
  return null;
}
