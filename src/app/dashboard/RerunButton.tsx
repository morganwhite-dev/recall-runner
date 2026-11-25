"use client";

import Link from "next/link";
import { useActionState } from "react";
import styles from "./page.module.css";
import { rerunRecallAction } from "./rerun-action";

export function RerunButton({ recallNumber }: { recallNumber?: string }) {
  const [result, action, pending] = useActionState(rerunRecallAction, {
    message: "",
  });
  return (
    <form action={action}>
      <label>
        CPSC recall number{" "}
        <input
          name="recallNumber"
          className={`recall-no ${styles.recallInput}`}
          defaultValue={recallNumber}
          size={5}
          maxLength={5}
          required
          inputMode="numeric"
          pattern="[0-9]{5}"
          readOnly={pending}
        />
      </label>{" "}
      <button type="submit" className={styles.exportBtn} disabled={pending}>
        Run the AI again
      </button>
      <div role="status">
        {pending
          ? "Checking the catalog and investigating matches…"
          : result.message}
        {!pending &&
          "draft" in result &&
          result.draft &&
          result.draft !== recallNumber && (
            <>
              {" "}
              <Link href={`/dashboard?campaign=${result.draft}`}>
                Review draft
              </Link>
            </>
          )}
      </div>
    </form>
  );
}
