import type { ReactNode } from "react";

// The line drawings used for recalled products on the buyer page, the dashboard and the home page.
// Each is drawn with the parent <svg>'s stroke, plus peach accent shapes (.art-fill) that move a
// little (see "Product art" in globals.css; all motion is off for reduced motion).
// Unknown products get a plain box.
export type ArtKind = "warmer" | "battery" | "dresser" | "box";

export const ART_PATHS: Record<ArtKind, ReactNode> = {
  // Rechargeable hand warmer: soft glow, a heat dial in the middle, steam rising.
  warmer: (
    <>
      <ellipse className="art-fill art-glow" cx="48" cy="60" rx="38" ry="30" />
      <g transform="rotate(-10 32 58)">
        <rect
          x="15"
          y="32"
          width="34"
          height="52"
          rx="17"
          fill="var(--surface)"
        />
        <rect
          x="21"
          y="40"
          width="22"
          height="36"
          rx="11"
          strokeWidth="1.4"
          strokeDasharray="2.5 3.5"
          stroke="var(--accent)"
        />
        <path d="M28 80.5h8" strokeWidth="2" />
      </g>
      <g className="art-nudge">
        <g transform="rotate(9 63 60)">
          <rect
            x="46"
            y="34"
            width="34"
            height="52"
            rx="17"
            fill="var(--surface)"
          />
          <circle cx="63" cy="49" r="4.5" strokeWidth="2" />
          <path d="M63 46.5v3" strokeWidth="1.8" />
          <circle className="art-fill art-led" cx="56" cy="66" r="2.3" />
          <circle
            className="art-fill art-led art-led2"
            cx="63"
            cy="66"
            r="2.3"
          />
          <circle
            className="art-fill art-led art-led3"
            cx="70"
            cy="66"
            r="2.3"
          />
          <path d="M59 82.5h8" strokeWidth="2" />
        </g>
      </g>
      <path
        className="art-steam art-steam1"
        d="M38 26c-3.5-4 3.5-6 0-11"
        strokeWidth="2.2"
      />
      <path
        className="art-steam art-steam2"
        d="M50 26c-3.5-4 3.5-6 0-11"
        strokeWidth="2.2"
      />
      <path
        className="art-steam art-steam3"
        d="M62 26c-3.5-4 3.5-6 0-11"
        strokeWidth="2.2"
      />
    </>
  ),
  // Battery pack: three charge bars lighting in turn, a bolt, a short cable.
  battery: (
    <>
      <rect x="12" y="32" width="60" height="38" rx="10" />
      <path d="M72 44h5a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3h-5" />
      <rect
        className="art-fill art-bar art-bar1"
        x="20"
        y="41"
        width="9"
        height="20"
        rx="3"
      />
      <rect
        className="art-fill art-bar art-bar2"
        x="32"
        y="41"
        width="9"
        height="20"
        rx="3"
      />
      <rect
        className="art-fill art-bar art-bar3"
        x="44"
        y="41"
        width="9"
        height="20"
        rx="3"
      />
      <path className="art-pulse" d="M63 41l-6 10h7l-6 10" strokeWidth="2" />
      <path d="M30 70v7q0 8 10 8h16" strokeWidth="1.6" />
    </>
  ),
  // Eight-drawer dresser: it sways like a tip-over, and the drawers light up one after another.
  dresser: (
    <g className="art-wobble">
      <rect
        className="art-fill art-drawer art-drawer1"
        x="19"
        y="13"
        width="28"
        height="15"
        rx="2"
      />
      <rect
        className="art-fill art-drawer art-drawer2"
        x="49"
        y="30"
        width="28"
        height="15"
        rx="2"
      />
      <rect
        className="art-fill art-drawer art-drawer3"
        x="19"
        y="47"
        width="28"
        height="15"
        rx="2"
      />
      <rect
        className="art-fill art-drawer art-drawer4"
        x="49"
        y="64"
        width="28"
        height="15"
        rx="2"
      />
      <rect x="18" y="12" width="60" height="68" rx="5" />
      <path d="M18 29h60M18 46h60M18 63h60M48 12v68" strokeWidth="1.5" />
      <path
        d="M28 21h9M58 21h9M28 38h9M58 38h9M28 55h9M58 55h9M28 72h9M58 72h9"
        strokeWidth="2.2"
      />
      <path d="M26 80v8M70 80v8" />
    </g>
  ),
  // A plain parcel for products we have no drawing for: the lid lifts a little.
  box: (
    <>
      <path d="M16 36l32 16 32-16v32L48 84 16 68z" />
      <path d="M48 52v32" strokeWidth="1.5" />
      <g className="art-lid">
        <path d="M16 36l32-16 32 16-32 16z" />
        <path className="art-fill" d="M40 24l32 16-8 4-32-16z" />
      </g>
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
