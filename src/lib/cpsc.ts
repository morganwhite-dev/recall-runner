// Helpers for the US Consumer Product Safety Commission (CPSC) recall feed.
// Docs: https://www.saferproducts.gov/RestWebServices/ (free, no key needed).

export const CPSC_API = "https://www.saferproducts.gov/RestWebServices/Recall";

// The shape we store: the fields we need, cleaned up, matching the `recalls` table.
export type RecallRecord = {
  cpscRecallId: number;
  recallNumber: string;
  recallDate: string; // YYYY-MM-DD
  title: string;
  description: string;
  hazards: string;
  remedyText: string;
  remedyOptions: string[]; // Refund, Replace and/or Repair
  retailers: string;
  manufacturers: string;
  soldOnline: boolean;
  products: { name: string; type: string; units: string }[];
  url: string;
};

type Named = { Name?: string };

// The raw API returns lots of fields (images, injury counts, contact details). Keep what we use.
// Everything in here is text written by outsiders, so later code must treat it as untrusted.
export function normalizeRecall(raw: Record<string, unknown>): RecallRecord {
  const names = (list: unknown) =>
    ((list as Named[] | undefined) ?? [])
      .map((x) => (x.Name ?? "").trim())
      .filter(Boolean)
      .join("\n");

  const retailers = names(raw.Retailers);
  const soldAtLabel = String(raw.SoldAtLabel ?? "");
  const options = (
    (raw.RemedyOptions as { Option?: string }[] | undefined) ?? []
  )
    .map((o) => (o.Option ?? "").trim())
    .filter(Boolean);

  return {
    cpscRecallId: Number(raw.RecallID),
    recallNumber: String(raw.RecallNumber),
    recallDate: String(raw.RecallDate).slice(0, 10),
    title: String(raw.Title ?? "").trim(),
    description: String(raw.Description ?? "").trim(),
    hazards: names(raw.Hazards),
    remedyText: names(raw.Remedies),
    remedyOptions: [...new Set(options)],
    retailers,
    manufacturers: names(raw.Manufacturers),
    soldOnline: /\bonline\b|amazon\.com/i.test(`${soldAtLabel}\n${retailers}`),
    products: (
      (raw.Products as Record<string, string>[] | undefined) ?? []
    ).map((p) => ({
      name: (p.Name ?? "").trim(),
      type: (p.Type ?? "").trim(),
      units: (p.NumberOfUnits ?? "").trim(),
    })),
    url: String(raw.URL ?? ""),
  };
}
