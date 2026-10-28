// Tests for the "someone just reset the demo" banner helpers. Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  COOLDOWN_MS,
  cooldownLeftMs,
  resetNoticeFrom,
  resetRedirectPath,
  secondsLabel,
} from "../src/lib/reset-notice";

const T0 = 1_800_000_000_000;

test("the time left counts down from a minute and stops at zero", () => {
  assert.equal(cooldownLeftMs(T0, T0), COOLDOWN_MS);
  assert.equal(cooldownLeftMs(T0, T0 + 45_000), 15_000);
  assert.equal(cooldownLeftMs(T0, T0 + COOLDOWN_MS), 0);
  assert.equal(cooldownLeftMs(T0, T0 + 5 * COOLDOWN_MS), 0);
});

test("a reset time in the future (clock skew) never waits longer than the cooldown", () => {
  assert.equal(cooldownLeftMs(T0 + 30_000, T0), COOLDOWN_MS);
});

test("the outcome goes into the dashboard address and comes back out", () => {
  assert.equal(resetRedirectPath("done"), "/dashboard");
  assert.equal(resetRedirectPath("error"), "/dashboard?reset=error");
  const path = resetRedirectPath({ cooldownSince: T0 });
  assert.equal(path, `/dashboard?reset=cooldown&since=${T0}`);
  assert.deepEqual(resetNoticeFrom("cooldown", String(T0), T0 + 20_000), {
    kind: "cooldown",
    leftMs: 40_000,
    since: T0,
  });
  assert.deepEqual(resetNoticeFrom("error", undefined, T0), { kind: "error" });
});

test("an old cooldown address says the wait is over", () => {
  const notice = resetNoticeFrom("cooldown", String(T0), T0 + 3_600_000);
  assert.deepEqual(notice, { kind: "cooldown", leftMs: 0, since: T0 });
});

test("unreadable addresses show no banner", () => {
  assert.equal(resetNoticeFrom(undefined, undefined, T0), null);
  assert.equal(resetNoticeFrom("cooldown", undefined, T0), null);
  assert.equal(resetNoticeFrom("cooldown", "soon", T0), null);
  assert.equal(resetNoticeFrom("cooldown", ["1", "2"], T0), null);
  assert.equal(resetNoticeFrom("whatever", String(T0), T0), null);
});

test("seconds are written in words, singular for one", () => {
  assert.equal(secondsLabel(1_000), "1 second");
  assert.equal(secondsLabel(45_000), "45 seconds");
  assert.equal(secondsLabel(0), "0 seconds");
  assert.equal(secondsLabel(-500), "0 seconds");
});
