// Tests for reading the sandbox buyers' PayPal logins from the SANDBOX_BUYERS setting.
// Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseSandboxBuyers } from "../src/lib/sandbox-buyers";

const A = { email: "sb-a@personal.example.com", password: "pw-a" };
const B = { email: "sb-b@personal.example.com", password: "pw-b" };

test("reads every buyer from the JSON setting", () => {
  const all = parseSandboxBuyers({
    SANDBOX_BUYERS: JSON.stringify({ morgan: A, recent: B }),
  });
  assert.deepEqual(all, { morgan: A, recent: B });
});

test("the older two-variable setting still works, as the buyer 'morgan'", () => {
  assert.deepEqual(
    parseSandboxBuyers({
      JUDGE_BUYER_EMAIL: A.email,
      JUDGE_BUYER_PASSWORD: A.password,
    }),
    { morgan: A },
  );
});

test("the JSON setting wins over the older variables for the same key", () => {
  const all = parseSandboxBuyers({
    SANDBOX_BUYERS: JSON.stringify({ morgan: B }),
    JUDGE_BUYER_EMAIL: A.email,
    JUDGE_BUYER_PASSWORD: A.password,
  });
  assert.deepEqual(all.morgan, B);
});

test("broken JSON gives no buyers instead of crashing the page", () => {
  assert.deepEqual(parseSandboxBuyers({ SANDBOX_BUYERS: "{not json" }), {});
});

test("entries missing an email or password are skipped", () => {
  const all = parseSandboxBuyers({
    SANDBOX_BUYERS: JSON.stringify({
      ok: A,
      noPassword: { email: "x@personal.example.com" },
      wrongType: "hello",
    }),
  });
  assert.deepEqual(Object.keys(all), ["ok"]);
});

test("nothing set means no buyers", () => {
  assert.deepEqual(parseSandboxBuyers({}), {});
});

test("backticks around the JSON (as pasted into a host's settings page) are tolerated", () => {
  const all = parseSandboxBuyers({
    SANDBOX_BUYERS: "`" + JSON.stringify({ recent: A }) + "`",
  });
  assert.deepEqual(all, { recent: A });
});
