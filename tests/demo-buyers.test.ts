// Tests for the extra demo buyers and the toy recall's brand renaming. Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { renameRecall } from "../src/lib/brand-aliases";
import { DEMO_BUYERS, DEMO_PRODUCTS } from "../src/lib/demo-buyers";

test("the toy recall shows an invented brand and no real retailer", () => {
  const r = renameRecall({
    recallNumber: "26780",
    title: "Melissa & Doug Recalls Fire Truck Activity Board Toys; Sold Exclusively at Target",
    description: 'On the bottom, "Melissa & Doug" is embossed on the battery box.',
    hazards: "The fire hose port can come loose.",
    remedyText: "Register at www.melissaanddoug.com/recall for a refund.",
    retailers: "Target",
    manufacturers: "",
    products: [{ name: "Lights & Sounds Fire Truck Activity Board" }],
  });
  // The retailers column is deliberately left as CPSC wrote it (see brand-aliases.ts); nothing shows it.
  const { retailers: _kept, ...shown } = r;
  void _kept;
  const text = JSON.stringify(shown);
  assert.doesNotMatch(text, /Melissa|Doug|Target/);
  assert.match(r.title, /Little Orchard/);
});

test("every buyer scenario has a unique key and a product that exists", () => {
  const skus = new Set(["BH-HW-2P", ...DEMO_PRODUCTS.map((p) => p.sku)]);
  const keys = DEMO_BUYERS.map((b) => b.key);
  assert.equal(new Set(keys).size, keys.length);
  for (const b of DEMO_BUYERS) assert.ok(skus.has(b.sku), `${b.key} buys ${b.sku}`);
});

test("only the changed-email buyer has a store email that differs from the login", () => {
  const odd = DEMO_BUYERS.filter((b) => !b.emailMatchesLogin);
  assert.deepEqual(odd.map((b) => b.key), ["changed"]);
  assert.ok(odd[0].storeEmail?.includes("@"));
});

test("the partly refunded buyer was refunded less than the item price", () => {
  const partly = DEMO_BUYERS.find((b) => b.key === "partly")!;
  const price = 3400; // BH-HW-2P
  assert.ok(partly.refundedCents > 0 && partly.refundedCents < price);
});
