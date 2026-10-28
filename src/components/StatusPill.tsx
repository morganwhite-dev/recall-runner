import type { ReactNode } from "react";
import { Icon } from "./Icon";

// Status is always an icon plus a word, never colour alone. The filled tick is the receipt seal's.
export function StatusPill({ children }: { children: ReactNode }) {
  return (
    <span className="pill">
      <Icon name="done" />
      {children}
    </span>
  );
}
