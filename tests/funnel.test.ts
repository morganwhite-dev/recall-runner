// Tests for the dashboard's agent funnel: the "recalls checked" count must be the number the scan
// actually looked at, not the size of the recalls table today. Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { matchedLabel, refusalReason, refusedLabel, scanChecked } from "../src/lib/funnel";

test("a scan that saved its count uses that count", () => {
  assert.equal(scanChecked({ checked: 189, candidates: [] }, "anything"), 189);
});

test("an older scan reads the count from its summary", () => {
  assert.equal(
    scanChecked(
      { candidates: [] },
      "Checked 189 CPSC recalls against 10 products; 6 share enough words to review.",
    ),
    189,
  );
});

test("no saved count and no readable summary gives null, so the caller falls back", () => {
  assert.equal(scanChecked(null, "Something else"), null);
});

test("matched recalls show the product wording, not the company", () => {
  assert.equal(
    matchedLabel(
      "Marlowe Goods Co. Recalls Rechargeable Hand Warmers Due to Risk of Burns",
    ),
    "Rechargeable Hand Warmers",
  );
});

test("refused recalls show a plain category, never the CPSC title", () => {
  assert.equal(
    refusedLabel("RealBrand Inc. Recalls Hand Warmers Due to Fire Hazard"),
    "Rechargeable hand warmers",
  );
  assert.equal(
    refusedLabel("RealBrand Recalls Bicycle Helmets"),
    "Another consumer product",
  );
});

test("refusal reasons never repeat the AI's words, which can name a real brand", () => {
  assert.equal(
    refusalReason([
      "Score capped (disqualified: Brand differs: recall is Gobi Heat, listing is Kindlewarm).",
    ]),
    "A different brand from the store's product",
  );
  assert.equal(
    refusalReason(["Score capped (disqualified: Recall names model X-200, listing is X-100)."]),
    "A different model from the store's product",
  );
  assert.equal(refusalReason(["Score capped (disqualified: something else)."]), "Not the same product the store sells");
  assert.equal(refusalReason(["Accepted at 0.95."]), undefined);
});
