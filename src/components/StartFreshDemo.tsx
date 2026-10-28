"use client";

import { useFormStatus } from "react-dom";
import { Icon, type IconName } from "@/components/Icon";
import { startFreshDemo } from "@/app/demo/actions";

type Look = {
  label: string; // the button text
  pendingLabel: string;
  icon: IconName;
  className: string;
};

const DEFAULT_LOOK: Look = {
  label: "Start fresh demo",
  pendingLabel: "Stocking the demo store… about 20 seconds",
  icon: "arrow",
  className: "button",
};

function Submit({ look }: { look: Look }) {
  const { pending } = useFormStatus();
  return (
    <button
      className={look.className}
      type="submit"
      disabled={pending}
      aria-live="polite"
    >
      {pending ? (
        look.pendingLabel
      ) : (
        <>
          {look.label} <Icon name={look.icon} />
        </>
      )}
    </button>
  );
}

// The same reset wherever it is offered; "Replay demo" on the dashboard passes its own look.
export function StartFreshDemo({ look }: { look?: Partial<Look> }) {
  return (
    <form action={startFreshDemo}>
      <Submit look={{ ...DEFAULT_LOOK, ...look }} />
    </form>
  );
}
