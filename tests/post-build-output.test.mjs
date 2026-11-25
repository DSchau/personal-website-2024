import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

// checks the production build in dist/ (run `pnpm run build` first)
const root = path.join(import.meta.dirname, "..");
const postsDir = path.join(root, "src/content/posts");
const client = path.join(root, "dist/client");
const skip = existsSync(client) ? false : "run pnpm run build first";

// mirrors the posts glob loader: `**/[^_]*.md`, id from `slug:`, else dir/file name
const posts = readdirSync(postsDir, { recursive: true })
  .filter((file) => file.endsWith(".md") && !path.basename(file).startsWith("_"))
  .map((file) => {
    const frontmatter = readFileSync(path.join(postsDir, file), "utf8").match(/^---\n([\s\S]*?)\n---/)?.[1] ?? "";
    const flag = (name) => new RegExp(`^${name}:\\s*true\\s*$`, "m").test(frontmatter);
    const name = path.basename(file) === "index.md" ? path.basename(path.dirname(file)) : path.basename(file, ".md");
    const id = frontmatter.match(/^slug:\s*["']?([^"'\n]+?)["']?\s*$/m)?.[1] ?? name;
    return { id, draft: flag("draft"), unlisted: flag("unlisted") };
  });

const drafts = posts.filter((post) => post.draft).map((post) => post.id);
const unlisted = posts.filter((post) => post.unlisted && !post.draft).map((post) => post.id);
const read = (file) => readFileSync(path.join(client, file), "utf8");
// matches a link to the post with or without a trailing slash
const linksTo = (body, id) => new RegExp(`/posts/${id}(?![\\w-])`).test(body);
const sitemap = () =>
  readdirSync(client)
    .filter((file) => /^sitemap-\d+\.xml$/.test(file))
    .map(read)
    .join("\n");

test("there are drafts and unlisted posts to check", () => {
  assert.ok(drafts.length > 0);
  assert.ok(unlisted.length > 0);
});

test("drafts get no page", { skip }, () => {
  for (const id of drafts) {
    assert.equal(existsSync(path.join(client, "posts", id)), false, id);
  }
});

test("unlisted posts keep their page", { skip }, () => {
  for (const id of unlisted) {
    assert.ok(existsSync(path.join(client, "posts", id, "index.html")), id);
  }
});

test("the sitemap leaves out drafts but keeps unlisted posts", { skip }, () => {
  const xml = sitemap();
  for (const id of drafts) assert.equal(linksTo(xml, id), false, id);
  for (const id of unlisted) assert.ok(linksTo(xml, id), id);
});

test("RSS and /posts list neither drafts nor unlisted posts", { skip }, () => {
  for (const file of ["rss.xml", "posts/index.html"]) {
    const body = read(file);
    for (const id of [...drafts, ...unlisted]) {
      assert.equal(linksTo(body, id), false, `${file}: ${id}`);
    }
  }
});
