import type { CSSProperties } from "react";

// A number that counts up from 0 when it appears. Pure CSS: --n is a registered integer
// property, the animation moves it from 0 to the real value, and the pseudo-element prints it.
// Without animation support (or with reduced motion) it simply shows the final number.
export function Count({ value, unit = "", className }: { value: number; unit?: string; className?: string }) {
  return (
    <span
      className={className}
      role="img"
      aria-label={`${value}${unit}`}
      style={{ "--v": value, "--unit": `"${unit}"` } as CSSProperties}
    />
  );
}
