import assert from "node:assert/strict";
import { test } from "node:test";
import { NextRequest } from "next/server";
import { db } from "../src/db";
import { proxy } from "../src/proxy";

test("unknown buyer links go to the 404 route before the page can stream", async (t) => {
  const token = "a".repeat(43);
  const rows: { token: string }[] = [];
  const lookup = t.mock.method(db, "select", () => ({
    from: () => ({ where: async () => rows }),
  }));
  const request = (value: string) => new NextRequest(`http://localhost/r/${value}`);

  for (const value of ["bogus", "%ZZ", token]) {
    const response = await proxy(request(value));
    assert.equal(response.headers.get("x-middleware-rewrite"), "http://localhost/_not-found");
  }
  assert.equal(lookup.mock.callCount(), 1);

  rows.push({ token });
  assert.equal((await proxy(request(token))).headers.get("x-middleware-next"), "1");
});
