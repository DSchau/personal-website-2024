import assert from "node:assert/strict";
import test from "node:test";

import { isListed, isRoutable } from "../src/lib/post-visibility.ts";

test("drafts get no page and no listing in production", () => {
  assert.equal(isRoutable({ draft: true }, true), false);
  assert.equal(isListed({ draft: true }, true), false);
});

test("drafts render and list in dev", () => {
  assert.equal(isRoutable({ draft: true }, false), true);
  assert.equal(isListed({ draft: true }, false), true);
});

test("unlisted posts keep their page but are never listed", () => {
  for (const prod of [true, false]) {
    assert.equal(isRoutable({ unlisted: true }, prod), true);
    assert.equal(isListed({ unlisted: true }, prod), false);
  }
});

test("plain posts are routable and listed", () => {
  for (const prod of [true, false]) {
    assert.equal(isRoutable({}, prod), true);
    assert.equal(isListed({ draft: false, unlisted: false }, prod), true);
  }
});
