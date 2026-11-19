import assert from "node:assert/strict";
import { test } from "node:test";
import { resetRerunLimitForTests, takeRerunSlot } from "../src/lib/rerun-limit";

test("re-runs are spaced 30 s apart and capped at 12 an hour", () => {
  resetRerunLimitForTests();
  const t0 = 1_000_000;
  assert.equal(takeRerunSlot(t0).ok, true);
  const early = takeRerunSlot(t0 + 10_000);
  assert.equal(early.ok, false);
  if (!early.ok) assert.equal(early.waitSeconds, 20);
  for (let i = 1; i < 12; i++) assert.equal(takeRerunSlot(t0 + i * 31_000).ok, true);
  assert.equal(takeRerunSlot(t0 + 12 * 31_000).ok, false);
  assert.equal(takeRerunSlot(t0 + 3_700_000).ok, true);
});
