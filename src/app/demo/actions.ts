"use server";

import { redirect } from "next/navigation";
import { resetDemo } from "@/lib/demo-reset";

// The "Start fresh demo" button. Resets the demo store (sandbox only), then opens the dashboard.
export async function startFreshDemo() {
  try {
    await resetDemo();
  } catch (err) {
    console.error("demo reset failed:", err instanceof Error ? err.message : err);
  }
  redirect("/dashboard");
}
