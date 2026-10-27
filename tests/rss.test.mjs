import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';
import { getRssString } from '@astrojs/rss';
import { getFeedItems, getFeedOptions, isPublished } from '../src/lib/rss-feed.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const postsDir = path.join(root, 'src/content/posts');
const meta = yaml.load(readFileSync(path.join(root, 'src/assets/meta.yaml'), 'utf8'));
const PROD_SITE = 'https://www.dustinschau.com';
const DEV_SITE = 'http://localhost:4321';

const DRAFT_IDS = [
  'on-gatsby',
  'on-excellence',
  '2023-08-18-the-ai-gap',
  '2026-in-review',
  '2017-07-21-writing-an-open-source-library',
  '2026-10-07-building-a-personal-agent',
  'riley-the-robot'
];

// Mirrors the `posts` collection: glob `**/[^_]*.md`, frontmatter parsed with
// js-yaml (as Astro does), and the id taken from `slug:` or the path with a
// trailing `/index` dropped.
function loadSourcePosts() {
  return readdirSync(postsDir, { recursive: true })
    .map((file) => file.split(path.sep).join('/'))
    .filter((file) => file.endsWith('.md') && !path.posix.basename(file).startsWith('_'))
    .sort()
    .map((file) => {
      const source = readFileSync(path.join(postsDir, file), 'utf8');
      const frontmatter = source.match(/^---\r?\n([\s\S]*?)\r?\n---/);
      assert.ok(frontmatter, `${file} has frontmatter`);
      const { slug, ...data } = yaml.load(frontmatter[1]);
      const id = slug ?? file.replace(/\.md$/, '').replace(/\/index$/, '');
      return { id, file, data };
    });
}

function parseRss(xml) {
  const script = String.raw`
import json, sys
import xml.etree.ElementTree as ET
rss = ET.fromstring(sys.stdin.buffer.read())
channel = rss.find('channel')
def text(el, tag):
    found = el.find(tag)
    return None if found is None else found.text
print(json.dumps({
    'tag': rss.tag,
    'version': rss.get('version'),
    'channelCount': len(rss.findall('channel')),
    'channel': {k: text(channel, k) for k in ('title', 'description', 'link')},
    'items': [{
        'title': text(item, 'title'),
        'link': text(item, 'link'),
        'guid': text(item, 'guid'),
        'description': text(item, 'description'),
        'pubDate': text(item, 'pubDate'),
        'categories': [c.text for c in item.findall('category')],
    } for item in channel.findall('item')],
}))
`;
  return JSON.parse(execFileSync('python3', ['-c', script], { input: xml, encoding: 'utf8' }));
}

async function serialize(posts, site = PROD_SITE) {
  const xml = await getRssString(getFeedOptions({
    title: meta.title,
    description: meta.description,
    site,
    posts
  }));
  return { xml, feed: parseRss(xml) };
}

function post(id, data = {}) {
  return { id, data: { title: id, date: new Date('2024-01-01T00:00:00Z'), tags: [], ...data } };
}

function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value) && !(value instanceof Date)) {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

test('excludes draft: true and includes draft: false or unset, featured or not', () => {
  const posts = [
    post('draft', { draft: true, featured: true }),
    post('explicitly-published', { draft: false }),
    post('unset'),
    post('featured', { featured: true }),
    post('not-featured', { featured: false })
  ];
  assert.equal(isPublished(posts[0]), false);
  assert.equal(isPublished(posts[1]), true);
  assert.equal(isPublished(posts[2]), true);

  const links = getFeedItems(posts, PROD_SITE).map((item) => item.link);
  assert.deepEqual(new Set(links), new Set([
    `${PROD_SITE}/posts/explicitly-published/`,
    `${PROD_SITE}/posts/unset/`,
    `${PROD_SITE}/posts/featured/`,
    `${PROD_SITE}/posts/not-featured/`
  ]));
  assert.equal(links.length, 4);
});

test('includes every published post without a limit', () => {
  const posts = Array.from({ length: 150 }, (_, i) => post(`post-${i}`, {
    date: new Date(Date.UTC(2000, 0, 1 + i))
  }));
  assert.equal(getFeedItems(posts, PROD_SITE).length, 150);
});

test('current source posts: every published post once, all seven drafts absent', async () => {
  const posts = loadSourcePosts();
  const published = posts.filter((p) => p.data.draft !== true);
  const drafts = posts.filter((p) => p.data.draft === true);

  assert.equal(posts.length, 27);
  assert.equal(published.length, 20);
  assert.deepEqual(drafts.map((p) => p.id).sort(), [...DRAFT_IDS].sort());

  const { feed } = await serialize(posts);
  assert.equal(feed.items.length, 20);

  const expectedLinks = published.map((p) =>
    new URL(p.data.canonicalLink ?? `/posts/${p.id}/`, PROD_SITE).href
  );
  const links = feed.items.map((item) => item.link);
  assert.equal(new Set(links).size, links.length, 'no duplicate items');
  assert.deepEqual([...links].sort(), [...expectedLinks].sort());

  const titles = feed.items.map((item) => item.title);
  for (const draft of drafts) {
    assert.ok(!links.some((link) => link.includes(`/posts/${draft.id}/`)), `${draft.id} link absent`);
    assert.ok(!titles.includes(draft.data.title), `${draft.id} title absent`);
  }
  assert.ok(!links.some((link) => link.includes('2026-in-review')));
  assert.ok(!links.some((link) => link.includes('building-a-personal-agent')));
});

test('current source posts: slug overrides and canonical links are respected', async () => {
  const { feed } = await serialize(loadSourcePosts());
  const links = feed.items.map((item) => item.link);

  // `slug:` frontmatter replaces the directory name
  assert.ok(links.includes(`${PROD_SITE}/posts/getting-started-with-gatsby/`));
  assert.ok(!links.some((link) => link.includes('2017-07-17-getting-started-with-gatsby')));
  assert.ok(links.includes(`${PROD_SITE}/posts/hello-world/`));
  // `<name>.md` and `<dir>/index.md` ids
  assert.ok(links.includes(`${PROD_SITE}/posts/uses/`));
  assert.ok(links.includes(`${PROD_SITE}/posts/2025-in-review/`));
  // external canonical destinations
  assert.ok(links.includes('https://www.gatsbyjs.com/blog/2019-06-17-day-in-the-life-of-a-core-maintainer'));
  assert.ok(links.some((link) => link.startsWith('https://syntax.fm/show/631/')));
});

test('orders items newest first by publication date without mutating input', async () => {
  const posts = deepFreeze([
    post('middle', { date: new Date('2022-06-01T00:00:00Z'), lastModified: '2030-01-01T00:00:00Z' }),
    post('newest', { date: new Date('2024-03-01T00:00:00Z') }),
    post('a-oldest', { date: new Date('2019-01-01T00:00:00Z'), lastModified: '2031-01-01T00:00:00Z' }),
    post('draft-newer', { date: new Date('2025-01-01T00:00:00Z'), draft: true }),
    post('second', { date: new Date('2023-12-31T12:00:00Z') })
  ]);
  const snapshot = JSON.stringify(posts);

  const { feed } = await serialize(posts);
  assert.equal(JSON.stringify(posts), snapshot);
  assert.deepEqual(feed.items.map((item) => item.title), ['newest', 'second', 'middle', 'a-oldest']);
  assert.deepEqual(feed.items.map((item) => item.pubDate), [
    new Date('2024-03-01T00:00:00Z').toUTCString(),
    new Date('2023-12-31T12:00:00Z').toUTCString(),
    new Date('2022-06-01T00:00:00Z').toUTCString(),
    new Date('2019-01-01T00:00:00Z').toUTCString()
  ]);
});

test('current source posts: serialized dates are non-increasing and match frontmatter', async () => {
  const posts = loadSourcePosts();
  const { feed } = await serialize(posts);
  const times = feed.items.map((item) => Date.parse(item.pubDate));
  for (let i = 1; i < times.length; i++) {
    assert.ok(times[i - 1] >= times[i], `item ${i} is not newer than item ${i - 1}`);
  }
  const byTitle = new Map(posts.map((p) => [p.data.title, p]));
  for (const item of feed.items) {
    // RSS dates have second precision
    const source = Math.floor(byTitle.get(item.title).data.date.getTime() / 1000) * 1000;
    assert.equal(Date.parse(item.pubDate), source);
  }
});

test('resolves local links against the configured site and keeps canonical links', () => {
  const posts = [
    post('legacy-slug'),
    post('external', { canonicalLink: 'https://example.com/a/b?x=1&y=2' })
  ];
  for (const site of [PROD_SITE, DEV_SITE, new URL(DEV_SITE)]) {
    const items = getFeedItems(posts, site);
    const origin = new URL(site).origin;
    assert.equal(items.find((i) => i.title === 'legacy-slug').link, `${origin}/posts/legacy-slug/`);
    assert.equal(items.find((i) => i.title === 'external').link, 'https://example.com/a/b?x=1&y=2');
  }
});

test('emits RSS 2.0 with site metadata, optional fields and escaped text', async () => {
  const tricky = 'Ampersands & <angle> "quotes" \'apostrophes\' — café ✨';
  const posts = [
    post('full', {
      title: `Title: ${tricky}`,
      excerpt: `Excerpt: ${tricky}`,
      tags: ['web & css', '<astro>'],
      date: new Date('2024-02-02T00:00:00Z')
    }),
    post('bare', { date: new Date('2024-01-01T00:00:00Z') }),
    post('external', {
      canonicalLink: 'https://example.com/listen?show=1&ep=<2>',
      date: new Date('2023-01-01T00:00:00Z')
    })
  ];
  const { xml, feed } = await serialize(posts);

  assert.equal(feed.tag, 'rss');
  assert.equal(feed.version, '2.0');
  assert.equal(feed.channelCount, 1);
  assert.deepEqual(feed.channel, {
    title: meta.title,
    description: meta.description,
    link: `${PROD_SITE}/`
  });
  assert.ok(!xml.includes('undefined'));
  assert.ok(!xml.includes('<angle>'), 'raw angle brackets are escaped');

  const [full, bare, external] = feed.items;
  assert.equal(full.title, `Title: ${tricky}`);
  assert.equal(full.description, `Excerpt: ${tricky}`);
  assert.deepEqual(full.categories, ['web & css', '<astro>']);
  assert.equal(full.link, `${PROD_SITE}/posts/full/`);
  assert.equal(full.guid, full.link);

  assert.equal(bare.description, null);
  assert.deepEqual(bare.categories, []);

  assert.equal(external.link, new URL('https://example.com/listen?show=1&ep=<2>').href);
  assert.ok(external.link.includes('show=1&ep='));
});

test('the endpoint feeds the posts collection through the shared helper', () => {
  const source = readFileSync(path.join(root, 'src/pages/rss.xml.ts'), 'utf8');
  assert.match(source, /export const prerender = true/);
  assert.match(source, /export const GET\b/);
  assert.match(source, /import rss from '@astrojs\/rss'/);
  assert.match(source, /getCollection\('posts'\)/);
  assert.doesNotMatch(source, /getCollection\('posts',/, 'no extra collection filter');
  assert.match(source, /import \{ getFeedOptions \} from '@\/lib\/rss-feed'/);
  assert.match(source, /rss\(getFeedOptions\(\{[^}]*metayaml\.title[^}]*metayaml\.description[^}]*site[^}]*posts/);
  assert.match(source, /async \(\{ site \}\)/, 'uses the configured site, not the request origin');
  assert.doesNotMatch(source, /request|import\.meta\.env/);
});

test('the shared layout head advertises /rss.xml', () => {
  const source = readFileSync(path.join(root, 'src/layouts/Layout.astro'), 'utf8');
  const head = source.match(/<head>([\s\S]*?)<\/head>/)[1];
  const links = head.split('\n').filter((line) => line.includes('application/rss+xml'));
  assert.equal(links.length, 1);
  const [link] = links;
  assert.match(link.trim(), /^<link [^>]*\/>$/, 'not inside a conditional expression');
  assert.match(link, /rel="alternate"/);
  assert.match(link, /type="application\/rss\+xml"/);
  assert.match(link, /href="\/rss\.xml"/);
});
