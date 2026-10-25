"use server";

import { revalidatePath } from "next/cache";
import { approveCampaign } from "@/lib/agent/pipeline";

// The human approval gate. Until the merchant presses this, no case exists and nothing can be
// sent or paid. Approving opens the cases and queues the notices; it moves no money itself.
export async function approveCampaignAction(formData: FormData) {
  const id = String(formData.get("campaignId") ?? "");
  if (!/^[0-9a-f-]{36}$/.test(id)) return;
  await approveCampaign(id);
  revalidatePath("/dashboard");
}
