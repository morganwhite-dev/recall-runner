// Tests for the Home page impact numbers: how recalls are counted as online, Amazon, and
// barcode-listed. Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { summarizeImpact, type ImpactRow } from "../src/lib/impact";

const row = (over: Partial<ImpactRow> = {}): ImpactRow => ({
  title: "Acme Recalls Widgets",
  description: "The widgets can overheat.",
  hazards: "Fire hazard",
  remedyText: "Stop using the widgets and contact Acme for a refund.",
  retailers: "Sold at:\nTarget stores nationwide",
  soldOnline: false,
  products: [{ name: "Widget", type: "Toys", units: "About 100" }],
  ...over,
});

const SINCE = "2026-09-01";

test("no recalls gives all zeros, not an error", () => {
  assert.deepEqual(summarizeImpact([], SINCE), {
    since: SINCE,
    total: 0,
    soldOnline: 0,
    amazon: 0,
    barcodeListed: 0,
  });
});

test("online recalls are counted from the sold-online flag", () => {
  const out = summarizeImpact([row({ soldOnline: true }), row({ soldOnline: true }), row()], SINCE);
  assert.equal(out.total, 3);
  assert.equal(out.soldOnline, 2);
});

test("Amazon is any recall whose retailers text mentions Amazon, in any letter case", () => {
  const out = summarizeImpact(
    [
      row({ retailers: "Amazon.com from March 2025 for about $13" }),
      row({ retailers: "AMAZON and Walmart" }),
      row({ retailers: "Walmart" }),
      row({ retailers: "" }),
    ],
    SINCE,
  );
  assert.equal(out.amazon, 2);
});

test("a barcode counts as listed only when a UPC number is written out", () => {
  const out = summarizeImpact(
    [
      row({ description: "Model BSFIREPIT01 (UPC code 680079015930)." }),
      row({ description: "GTIN: 0 68007 90159 30 on the box." }),
    ],
    SINCE,
  );
  assert.equal(out.barcodeListed, 2);
});

test("a barcode that is only mentioned, with no number, does not count", () => {
  const out = summarizeImpact(
    [
      row({ description: "The date code is printed above the barcode." }),
      row({ remedyText: "Send a photo of the 12-digit UPC code printed on the label." }),
      row({ description: "Model number 123456789012 is on the box." }),
    ],
    SINCE,
  );
  assert.equal(out.barcodeListed, 0);
});

test("a barcode number in the product list also counts", () => {
  const out = summarizeImpact(
    [row({ products: [{ name: "Widget UPC 012345678905", type: "Toys", units: "1" }] })],
    SINCE,
  );
  assert.equal(out.barcodeListed, 1);
});
