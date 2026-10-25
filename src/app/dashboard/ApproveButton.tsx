"use client";

import { useFormStatus } from "react-dom";
import { approveCampaignAction } from "./actions";
import styles from "./page.module.css";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button className={styles.btn} type="submit" disabled={pending} aria-live="polite">
      {pending ? "Approving: opening cases and drafting notices…" : "Approve campaign"}
    </button>
  );
}

// A form, not an onClick: it works as a normal POST and shows a pending state while the AI drafts.
export function ApproveButton({ campaignId }: { campaignId: string }) {
  return (
    <form action={approveCampaignAction}>
      <input type="hidden" name="campaignId" value={campaignId} />
      <Submit />
    </form>
  );
}
