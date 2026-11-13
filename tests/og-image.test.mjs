import assert from "node:assert/strict";
import test from "node:test";

import { ogImageUrl } from "../src/lib/og-image.ts";

const site = new URL("https://dustinschau.com");

test("builds an absolute /api/og.png URL on the site host", () => {
  const url = new URL(ogImageUrl(site, { title: "Hello" }));

  assert.equal(url.origin, "https://dustinschau.com");
  assert.equal(url.pathname, "/api/og.png");
});

test("title, tags and excerpt survive URL-significant characters", () => {
  const title = "Q&A: what's #1? 50% off";
  const excerpt = "Tips & tricks, plus a ?query";
  const params = new URL(ogImageUrl(site, { title, tags: ["react", "C#"], excerpt })).searchParams;

  assert.equal(params.get("title"), title);
  assert.equal(params.get("tags"), "react,C#");
  assert.equal(params.get("excerpt"), excerpt);
});

test("empty tags and excerpts are left out", () => {
  for (const tags of [undefined, [], [""], ["  "]]) {
    const params = new URL(ogImageUrl(site, { title: "T", tags, excerpt: "" })).searchParams;

    assert.equal(params.has("tags"), false, `tags=${JSON.stringify(tags)}`);
    assert.equal(params.has("excerpt"), false);
  }
});

test("falls back to the production origin without a site", () => {
  assert.equal(new URL(ogImageUrl(undefined, { title: "T" })).origin, "https://dustinschau.com");
});
