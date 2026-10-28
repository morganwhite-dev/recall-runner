"use server";

import { redirect } from "next/navigation";
import { resetDemo } from "@/lib/demo-reset";
import { resetRedirectPath } from "@/lib/reset-notice";

// The "Start fresh demo" button. Resets the demo store (sandbox only), then opens the dashboard. If
// another visitor reset it a moment ago, or the reset failed, the dashboard opens with a banner that
// says so (the outcome rides in the address, see reset-notice.ts).
export async function startFreshDemo() {
  let path: string;
  try {
    const result = await resetDemo();
    path = result.reset
      ? resetRedirectPath("done")
      : result.reason === "cooldown"
        ? resetRedirectPath({ cooldownSince: result.since })
        : resetRedirectPath("error");
  } catch (err) {
    console.error("demo reset failed:", err instanceof Error ? err.message : err);
    path = resetRedirectPath("error");
  }
  redirect(path);
}
