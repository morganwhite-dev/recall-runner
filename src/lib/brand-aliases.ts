// Devpost forbids third-party trademarks on screen, so three of the real CPSC recalls the demo is
// built on are shown under invented names. This is the ONE place the mapping lives. The recall
// numbers, dates, hazards and remedies stay real; only the brand and company names change.
//
// Two steps:
//   1. ALIASES: brand and company names, applied to any text (all recalls, products, notices...).
//   2. FEATURED_TEXT: retailer names, applied ONLY to the three featured recalls. The other recalls
//      keep their real retailers because the Home page counts how many were sold on Amazon
//      (src/lib/impact.ts). The `retailers` column itself is left as CPSC wrote it for the same
//      reason: nothing shows it on screen or sends it to the AI, but the Amazon count reads it.
//      The `url` field is never renamed, so the link to the real CPSC page keeps working (nothing
//      shows the address as text).
//
// Applied by: scripts/fetch-cpsc.ts and scripts/ingest-recalls.ts (so a re-fetch or re-ingest stays
// renamed) and scripts/rename-brands.ts (renames text already stored in the database). The demo
// catalog in scripts/seed-demo.ts and the eval inputs use the new names directly.
//
// Order matters: the longer, more specific patterns run first.
const ALIASES: [RegExp, string][] = [
  [/recall\.aitjunz@outlook\.com/gi, "recall.oakhollow@example.com"],
  [/hothands\.com/gi, "kindlewarm.example"],
  [/Dongguan Meiying Sen Smart Home Co\., Ltd\./gi, "Lindell Smart Home Co., Ltd."],
  [/The Blue Cactus Company|Blue Cactus Company|Blue Cactus/gi, "Juniper Ridge Power Co."],
  [/Kobayashi/gi, "Marlowe Goods Co."],
  [/Hot ?Hands®?/gi, "Kindlewarm"],
  [/Aitjunz/gi, "Oakhollow"],
  [/Yuyitop/gi, "Fernbrook Home"],
];

// Retailer wording in the featured recalls' text, by recall number. The specific phrases run first;
// FEATURED_RETAILERS then catches any single retailer name left over. Prices and dates are kept.
const FEATURED_TEXT: Record<string, [RegExp, string][]> = {
  "27011": [
    [
      /Bass Pro Shops, Meijer, Target and The Home Depot and other stores nationwide and online, including Amazon\.com/g,
      "major retailers nationwide and online",
    ],
  ],
  "26791": [
    [/; Sold on Amazon/g, "; Sold Online"],
    [/sold on Amazon/g, "sold online"], // how the AI's notes put it
    [/Amazon\.com/g, "a major online marketplace"],
  ],
  "26794": [[/Amazon\.com, Wayfair, TEMU, and Walmart/g, "major online marketplaces"]],
};
const FEATURED_RETAILERS = /\b(?:Amazon(?:\.com)?|Walmart|Wayfair|TEMU|Target|The Home Depot|Bass Pro Shops|Meijer)\b/g;

const featuredText = (recallNumber: string, text: string) => {
  const rules = FEATURED_TEXT[recallNumber];
  if (!rules) return text;
  return rules.reduce((t, [from, to]) => t.replace(from, to), text).replace(FEATURED_RETAILERS, "a major retailer");
};

// The retailer phrases only (no brand names), for rows made from a featured recall's text: the
// notices, the audit trail and saved AI answers. Specific phrases only, never the single-name catch-all.
export function applyFeaturedPhrases(text: string): string {
  return Object.values(FEATURED_TEXT)
    .flat()
    .reduce((t, [from, to]) => t.replace(from, to), text);
}

export function applyBrandAliases(text: string): string {
  // "Co." at the end of a sentence would otherwise read "Co.."
  return ALIASES.reduce((t, [from, to]) => t.replace(from, to), text).replace(/Co\.\.(?!\.)/g, "Co.");
}

// Renames every string inside a plain JSON value (a recall record, a jsonb column).
export function renameBrands<T>(value: T): T {
  return JSON.parse(applyBrandAliases(JSON.stringify(value))) as T;
}

// Renames one recall record: brand names everywhere except `url`, and for the three featured
// recalls their retailer wording in every text field except `retailers` (see the top of this file).
export function renameRecall<
  T extends {
    recallNumber: string;
    title: string;
    description: string;
    hazards: string;
    remedyText: string;
    retailers: string;
    manufacturers: string;
    products: unknown;
  },
>(r: T): T {
  const fix = (t: string) => applyBrandAliases(featuredText(r.recallNumber, t));
  return {
    ...r,
    title: fix(r.title),
    description: fix(r.description),
    hazards: fix(r.hazards),
    remedyText: fix(r.remedyText),
    manufacturers: fix(r.manufacturers),
    retailers: applyBrandAliases(r.retailers),
    products: JSON.parse(fix(JSON.stringify(r.products))),
  };
}

// For text made from a featured recall (notices, audit rows, saved AI answers): both steps.
export const renameDerived = <T>(value: T): T =>
  JSON.parse(applyFeaturedPhrases(applyBrandAliases(JSON.stringify(value)))) as T;

export const hasRealBrand = (text: string) =>
  applyFeaturedPhrases(applyBrandAliases(text)) !== text;
