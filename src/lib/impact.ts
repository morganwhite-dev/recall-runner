// The "why this matters" numbers on the Home page. Every figure is counted from the `recalls`
// table (real CPSC recalls), never typed in.
//
//   summarizeImpact: a pure function, recall rows in, numbers out (so it can be unit tested)
//   loadImpact:      reads the rows with Drizzle and calls summarizeImpact
import { cacheLife } from "next/cache";
import { gte } from "drizzle-orm";
import { db, recalls } from "@/db";

// Only recalls on or after this date are counted (YYYY-MM-DD). The Home page prints it too.
export const IMPACT_SINCE = "2026-09-01";

// The columns the counting needs.
export type ImpactRow = {
  title: string;
  description: string;
  hazards: string;
  remedyText: string;
  retailers: string;
  soldOnline: boolean;
  products: unknown;
};

export type Impact = {
  since: string;
  total: number; // recalls since that date
  soldOnline: number; // the recall says the product was sold online
  amazon: number; // the retailers text mentions Amazon
  barcodeListed: number; // the text lists an actual barcode number (UPC, GTIN or EAN)
};

// "Barcode listed" means a barcode word followed closely by a 8 to 14 digit number, for example
// "UPC code 680079015930". Digits may be split by spaces or dashes. Text that only mentions a
// barcode ("printed above the barcode", "send a photo of the UPC") does not count, because it
// gives a store nothing to match on.
const BARCODE_NUMBER =
  /\b(?:upc|gtin|ean|universal product code|bar ?code)\b[^.\n]{0,40}?\b\d(?:[ -]?\d){7,13}\b/i;

export function summarizeImpact(rows: ImpactRow[], since: string): Impact {
  const text = (r: ImpactRow) =>
    [r.title, r.description, r.hazards, r.remedyText, JSON.stringify(r.products ?? "")].join("\n");

  return {
    since,
    total: rows.length,
    soldOnline: rows.filter((r) => r.soldOnline).length,
    amazon: rows.filter((r) => /amazon/i.test(r.retailers)).length,
    barcodeListed: rows.filter((r) => BARCODE_NUMBER.test(text(r))).length,
  };
}

// The slow-changing part: the database read. A failed read throws, so it is not cached.
async function readRows(): Promise<ImpactRow[]> {
  "use cache";
  cacheLife("hours");
  return db
    .select({
      title: recalls.title,
      description: recalls.description,
      hazards: recalls.hazards,
      remedyText: recalls.remedyText,
      retailers: recalls.retailers,
      soldOnline: recalls.soldOnline,
      products: recalls.products,
    })
    .from(recalls)
    .where(gte(recalls.recallDate, IMPACT_SINCE));
}

// Returns null when the query fails or finds nothing, and the Home page then hides the strip.
export async function loadImpact(): Promise<Impact | null> {
  try {
    const impact = summarizeImpact(await readRows(), IMPACT_SINCE);
    return impact.total > 0 ? impact : null;
  } catch {
    return null;
  }
}
