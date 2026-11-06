import assert from "node:assert/strict";
import { test } from "node:test";
import { isAuthorized, sinceDate } from "../src/lib/cpsc-sync";

test("isAuthorized fails closed when no secret is configured", () => {
  assert.equal(isAuthorized("Bearer abc", ""), false);
  assert.equal(isAuthorized("Bearer undefined", undefined), false);
});

test("isAuthorized rejects missing or wrong tokens and accepts the right one", () => {
  assert.equal(isAuthorized(null, "s3cret"), false);
  assert.equal(isAuthorized("Bearer nope", "s3cret"), false);
  assert.equal(isAuthorized("s3cret", "s3cret"), false);
  assert.equal(isAuthorized("Bearer s3cret", "s3cret"), true);
});

test("sinceDate steps back the requested number of days", () => {
  assert.equal(sinceDate(30, new Date("2026-11-05T12:00:00Z")), "2026-10-06");
});
