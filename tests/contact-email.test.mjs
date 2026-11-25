import assert from "node:assert/strict";
import test from "node:test";

import { normalizeEmail, validateSender } from "../src/lib/contact-email.ts";

function fakeFetch({ dns, gravatar = () => new Response(null, { status: 404 }) } = {}) {
  const urls = [];
  const fetchImpl = async (input) => {
    const url = String(input);
    urls.push(url);
    return url.includes("gravatar") ? gravatar() : dns();
  };
  return { fetchImpl, urls };
}

const mxAnswer = () => Response.json({ Status: 0, Answer: [{ data: "10 mx.example.com." }] });

test("a valid address with no Gravatar is accepted", async () => {
  const { fetchImpl, urls } = fakeFetch({ dns: mxAnswer });

  const result = await validateSender("someone@example.com", fetchImpl);

  assert.deepEqual(result, { ok: true, email: "someone@example.com" });
  assert.equal(urls.some((url) => url.includes("gravatar")), false);
});

test("a valid address is accepted when Gravatar is unavailable", async () => {
  const { fetchImpl, urls } = fakeFetch({
    dns: mxAnswer,
    gravatar: () => {
      throw new Error("gravatar.com is down");
    },
  });

  const result = await validateSender("someone@example.com", fetchImpl);

  assert.equal(result.ok, true);
  assert.equal(urls.some((url) => url.includes("gravatar")), false);
});

test("sender input is trimmed and its domain lowercased before validation", async () => {
  const { fetchImpl, urls } = fakeFetch({ dns: mxAnswer });

  const result = await validateSender("  Ana@Example.COM ", fetchImpl);

  assert.deepEqual(result, { ok: true, email: "Ana@example.com" });
  assert.equal(new URL(urls[0]).searchParams.get("name"), "example.com");
});

test("malformed addresses are rejected with 400 without any lookup", async () => {
  for (const input of ["no-at-sign", "a@b@c.com", "@example.com", "a@", "a@localhost", "a b@example.com", "   "]) {
    const { fetchImpl, urls } = fakeFetch({ dns: mxAnswer });

    const result = await validateSender(input, fetchImpl);

    assert.equal(result.ok, false, input);
    assert.equal(result.status, 400, input);
    assert.equal(urls.length, 0, input);
    assert.equal(normalizeEmail(input), null, input);
  }
});

test("disposable addresses are rejected with 400 without any lookup", async () => {
  const { fetchImpl, urls } = fakeFetch({ dns: mxAnswer });

  const result = await validateSender("x@mailinator.com", fetchImpl);

  assert.equal(result.status, 400);
  assert.equal(urls.length, 0);
});

test("domains without MX records are rejected with 400", async () => {
  for (const body of [{ Status: 3 }, { Status: 0, Answer: [] }]) {
    const { fetchImpl } = fakeFetch({ dns: () => Response.json(body) });

    const result = await validateSender("someone@example.com", fetchImpl);

    assert.equal(result.ok, false);
    assert.equal(result.status, 400);
  }
});

test("DNS lookup failures are reported as upstream errors (502)", async () => {
  const failures = [
    () => {
      throw new TypeError("fetch failed");
    },
    () => new Response("unavailable", { status: 503 }),
    () => new Response("not json", { status: 200 }),
  ];

  for (const dns of failures) {
    const { fetchImpl } = fakeFetch({ dns });

    const result = await validateSender("someone@example.com", fetchImpl);

    assert.equal(result.ok, false);
    assert.equal(result.status, 502);
  }
});
