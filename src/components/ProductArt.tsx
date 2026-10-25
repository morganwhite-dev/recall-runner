import type { ReactNode } from "react";

// The line drawings used for recalled products on the buyer page and the dashboard.
// Unknown products get a plain box.
export type ArtKind = "warmer" | "battery" | "dresser" | "box";

export const ART_PATHS: Record<ArtKind, ReactNode> = {
  warmer: (
    <>
      <rect x="22" y="40" width="52" height="40" rx="12" />
      <rect x="30" y="48" width="36" height="24" rx="7" strokeWidth="1.5" strokeDasharray="3 4" />
      <path d="M36 30c-3-4 3-6 0-11M48 30c-3-4 3-6 0-11M60 30c-3-4 3-6 0-11" />
    </>
  ),
  battery: (
    <>
      <rect x="14" y="34" width="58" height="36" rx="9" />
      <path d="M72 45h6a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-6" />
      <path d="M46 42l-7 10h9l-7 10" strokeWidth="2" />
      <path d="M30 70v8q0 6 8 6h14" strokeWidth="1.5" />
    </>
  ),
  box: (
    <>
      <path d="M16 34l32-16 32 16v34L48 84 16 68z" />
      <path d="M16 34l32 16 32-16M48 50v34" strokeWidth="1.5" />
    </>
  ),
  dresser: (
    <>
      <rect x="20" y="14" width="56" height="64" rx="4" />
      <path d="M20 32h56M20 47h56M20 62h56M48 14v64" strokeWidth="1.5" />
      <path d="M30 23h8M58 23h8M30 40h8M58 40h8M30 55h8M58 55h8M30 70h8M58 70h8" />
      <path d="M26 78v8M70 78v8" />
    </>
  ),
};


const ART_BY_SKU: Record<string, ArtKind> = {
  "BH-HW-2P": "warmer",
  "BH-RC-BP": "battery",
  "BH-DR-8": "dresser",
};
export function artFor(sku: string): ArtKind {
  return ART_BY_SKU[sku] ?? "box";
}
