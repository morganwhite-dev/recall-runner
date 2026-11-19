"use server";

import { revalidatePath } from "next/cache";
import { ScanFailure, scanRecall } from "@/lib/agent/scan-recall";
import { takeRerunSlot } from "@/lib/rerun-limit";

export async function rerunRecallAction(
  _previous: { message: string; draft?: string },
  form: FormData,
) {
  const number = form.get("recallNumber");
  if (typeof number !== "string" || !/^\d{5}$/.test(number))
    return { message: "Enter a five-digit CPSC recall number." };
  const slot = takeRerunSlot();
  if (!slot.ok)
    return { message: `Too many scans. Try again in ${slot.waitSeconds} seconds.` };
  let outcome;
  try {
    outcome = await scanRecall(number, "dashboard");
  } catch (error) {
    const reason = error instanceof ScanFailure
      ? error.message
      : "The server could not complete the scan transaction.";
    console.error("Recall scan failed", { recallNumber: number, reason });
    return {
      message: `#${number}: ${reason} No campaign changes were saved.`,
    };
  }
  if (outcome === "draft") {
    revalidatePath("/dashboard");
    return {
      message: `Draft for #${number} is ready for your approval.`,
      draft: number,
    };
  }
  const messages = {
    "no-match": "No verified catalog match. Any previous draft was kept.",
    protected: "This campaign is already approved or closed.",
    busy: "A scan is already running. Try again when it finishes.",
    unknown: "This recall number is not in the synced CPSC feed.",
    skipped: "This recall has already been scanned.",
  };
  return { message: `#${number}: ${messages[outcome]}` };
}
