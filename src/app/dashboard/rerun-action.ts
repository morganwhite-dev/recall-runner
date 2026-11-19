"use server";

import { revalidatePath } from "next/cache";
import { scanRecall } from "@/lib/agent/scan-recall";

export async function rerunRecallAction(
  _previous: { message: string; draft?: string },
  form: FormData,
) {
  const number = form.get("recallNumber");
  if (typeof number !== "string" || !/^\d{5}$/.test(number))
    return { message: "Enter a five-digit CPSC recall number." };
  let outcome;
  try {
    outcome = await scanRecall(number, "dashboard");
  } catch {
    return {
      message: `The scan for #${number} failed. No campaign changes were saved. Try again.`,
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
