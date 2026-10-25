"use client";

import { useFormStatus } from "react-dom";
import { Icon } from "@/components/Icon";
import { startFreshDemo } from "@/app/demo/actions";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      className="button"
      type="submit"
      disabled={pending}
      aria-live="polite"
    >
      {pending ? (
        "Stocking the demo store… about 20 seconds"
      ) : (
        <>
          Start fresh demo <Icon name="arrow" />
        </>
      )}
    </button>
  );
}

export function StartFreshDemo() {
  return (
    <form action={startFreshDemo}>
      <Submit />
    </form>
  );
}
