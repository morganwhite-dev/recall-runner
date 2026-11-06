// The agent's funnel for the dashboard: how many recalls it looked at, how many shared enough
// words with the store's products to be worth an AI call, and what the AI plus the fixed rules
// decided. Everything comes from decisions the scan already saved, so reading it makes no AI
// call and no PayPal call.
import { asc, eq } from "drizzle-orm";
import { agentDecisions, campaigns, db, recalls } from "@/db";

export type FunnelRecall = {
  recallNumber: string;
  title: string;
  // For a refused recall, the reason the rules or the AI gave.
  reason?: string;
};

export type Funnel = {
  checked: number; // CPSC recalls the agent looked at
  candidates: number; // recalls that shared enough words with a product to review
  matched: FunnelRecall[]; // recalls that became campaigns
  refused: FunnelRecall[]; // recalls the AI or the rules turned down
  scannedAt: Date | null;
};

// The funnel names products, never companies. Only three recalls have invented brand names
// (src/lib/brand-aliases.ts); the others keep their real ones, and Devpost forbids third-party
// trademarks on screen.
//
// Matched recalls are the aliased ones, so their product wording is safe to show. CPSC titles read
// "<Company> Recalls <Product> Due to <Hazard>" or "<Product> Recalled Due to <Hazard>".
export function matchedLabel(title: string): string {
  const m = /\bRecalls?\s+(.+?)\s+Due to\b/i.exec(title);
  if (m) return m[1].trim();
  return (
    title
      .split(/\s+Due to\b/i)[0]
      .replace(/\s+Recalled$/i, "")
      .trim() || "Recalled product"
  );
}

// Refused recalls may carry a real company or brand anywhere in the title, so they get a plain
// category instead of the CPSC wording.
const CATEGORIES: [RegExp, string][] = [
  [/hand warmer/i, "Rechargeable hand warmers"],
  [/dresser/i, "Dressers"],
  [/battery|charger/i, "Battery chargers or packs"],
];

export function refusedLabel(title: string): string {
  return (
    CATEGORIES.find(([re]) => re.test(title))?.[1] ?? "Another consumer product"
  );
}

// "Brand differs: recall is Gobi Heat, listing is Emberly" out of the stored rule verdict.
function refusalReason(ruleSummaries: string[]): string | undefined {
  const first = ruleSummaries.find((s) => s.includes("disqualified:"));
  if (first) {
    const part = first.split("disqualified:")[1] ?? "";
    return part
      .split(";")[0]
      .replace(/\)\.?$/, "")
      .trim();
  }
  return undefined;
}

export async function loadFunnel(merchantId: string): Promise<Funnel | null> {
  const decisions = await db
    .select()
    .from(agentDecisions)
    .where(eq(agentDecisions.merchantId, merchantId))
    .orderBy(asc(agentDecisions.createdAt));
  const detects = decisions.filter((d) => d.step === "DETECT");
  const detect = detects[detects.length - 1];
  if (!detect) return null;

  const candidateNumbers: string[] = (
    (detect.detail as { candidates?: { recall: string }[] } | null)
      ?.candidates ?? []
  ).map((c) => c.recall);

  // The model's line for a recall starts "Compared recall #<number>"; the rule verdicts for the
  // same recall are saved right after it, up to the next model line.
  const verdicts = new Map<string, string[]>();
  let current: string | null = null;
  for (const d of decisions) {
    if (d.step !== "MATCH") continue;
    if (d.actor === "MODEL") {
      current = /#(\d+)/.exec(d.summary)?.[1] ?? null;
      if (current && !verdicts.has(current)) verdicts.set(current, []);
    } else if (d.actor === "RULE" && current) {
      verdicts.get(current)?.push(d.summary);
    }
  }

  const rows = await db
    .select({ recallNumber: recalls.recallNumber, title: recalls.title })
    .from(campaigns)
    .innerJoin(recalls, eq(campaigns.recallId, recalls.id))
    .where(eq(campaigns.merchantId, merchantId));
  const matchedNumbers = new Set(rows.map((r) => r.recallNumber));

  const allRecalls = await db
    .select({ recallNumber: recalls.recallNumber, title: recalls.title })
    .from(recalls);
  const titleOf = new Map(allRecalls.map((r) => [r.recallNumber, r.title]));

  const matched = rows.map((r) => ({
    recallNumber: r.recallNumber,
    title: matchedLabel(r.title),
  }));
  const refused = candidateNumbers
    .filter((n) => !matchedNumbers.has(n))
    .map((n) => ({
      recallNumber: n,
      title: refusedLabel(titleOf.get(n) ?? ""),
      reason:
        refusalReason(verdicts.get(n) ?? []) ??
        "The AI found none of the store's products to be the recalled one",
    }));

  return {
    checked: allRecalls.length,
    candidates: candidateNumbers.length,
    matched,
    refused,
    scannedAt: detect.createdAt,
  };
}
