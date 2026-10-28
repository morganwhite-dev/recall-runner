"use client";

import { useEffect, useRef, useState } from "react";

const DURATION_MS = 900;

// A dollar amount that counts from its old value to its new one when it changes (for example when
// PayPal confirms a payment after a refresh). The first value shows at once; with reduced motion
// every change is instant.
export function TweenMoney({
  cents,
  className,
}: {
  cents: number;
  className?: string;
}) {
  const [shown, setShown] = useState(cents);
  const from = useRef(cents);

  useEffect(() => {
    const start = from.current;
    if (start === cents) return;
    const duration = window.matchMedia("(prefers-reduced-motion: reduce)")
      .matches
      ? 0
      : DURATION_MS;
    let t0: number | null = null;
    let frame = 0;
    const tick = (now: number) => {
      t0 ??= now;
      const k = duration === 0 ? 1 : Math.min(1, (now - t0) / duration);
      const value = Math.round(start + (cents - start) * (1 - (1 - k) ** 3));
      from.current = value;
      setShown(value);
      if (k < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [cents]);

  return <span className={className}>${(shown / 100).toFixed(2)}</span>;
}
