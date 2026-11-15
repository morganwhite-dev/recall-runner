import type { ReactNode } from "react";
import { Icon } from "./Icon";

// Status is always a check plus a word, never colour alone. A plain rectangle (see .pill).
export function StatusPill({ children }: { children: ReactNode }) {
  return (
    <span className="pill">
      <Icon name="tick" />
      {children}
    </span>
  );
}
