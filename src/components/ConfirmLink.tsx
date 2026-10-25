"use client";

import { useEffect, useState, type ReactNode } from "react";

// "Confirm with PayPal". A plain link (the login route redirects off-site, so no client navigation
// or prefetch), with a waiting state so a slow PayPal page doesn't look like a dead button.
export function ConfirmLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: ReactNode;
}) {
  const [busy, setBusy] = useState(false);

  // Coming back with the browser's Back button restores this page as it was; clear the wait.
  useEffect(() => {
    const reset = () => setBusy(false);
    window.addEventListener("pageshow", reset);
    return () => window.removeEventListener("pageshow", reset);
  }, []);

  return (
    <a
      className={className}
      href={href}
      aria-busy={busy}
      aria-disabled={busy}
      onClick={(e) => {
        if (busy) e.preventDefault(); // a second click would start a second sign-in
        else setBusy(true);
      }}
    >
      {busy ? (
        <>
          <span className="spinner" aria-hidden="true" /> Opening PayPal…
        </>
      ) : (
        children
      )}
    </a>
  );
}
