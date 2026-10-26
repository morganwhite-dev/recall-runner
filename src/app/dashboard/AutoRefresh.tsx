"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// While a payment is waiting for PayPal's confirmation, re-read the page every few seconds so the
// case turns Settled by itself. It stops as soon as nothing is waiting.
export function AutoRefresh({ active, everyMs = 5000 }: { active: boolean; everyMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => router.refresh(), everyMs);
    return () => clearInterval(timer);
  }, [active, everyMs, router]);
  return null;
}
