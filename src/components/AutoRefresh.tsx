"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// While a payment is waiting for PayPal's confirmation, re-read the page every few seconds so the
// case turns Settled by itself. It stops as soon as nothing is waiting, and skips ticks while the
// tab is hidden. With `onFocus`, it also re-reads whenever the tab comes back into view, waiting or
// not: that is how the dashboard sees a payment made in the buyer's tab. Only one instance per
// page should set it, or each return to the tab refreshes twice.
export function AutoRefresh({
  active,
  everyMs = 5000,
  onFocus = false,
}: {
  active: boolean;
  everyMs?: number;
  onFocus?: boolean;
}) {
  const router = useRouter();
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => {
      if (!document.hidden) router.refresh();
    }, everyMs);
    return () => clearInterval(timer);
  }, [active, everyMs, router]);

  useEffect(() => {
    if (!onFocus) return;
    // Coming back to a tab fires both events; one refresh is enough.
    let last = 0;
    const refresh = () => {
      if (document.hidden || Date.now() - last < 1000) return;
      last = Date.now();
      router.refresh();
    };
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [onFocus, router]);
  return null;
}
