// Writes the Lighthouse report that .github/workflows/lighthouse.yml posts on
// PRs (and adds to the job summary): a one-line verdict, a table of pages, what
// needs attention and how to fix it, and the remaining metrics folded away.
//
//   node scripts/lighthouse-summary.mjs [dir] [--json out.json] [--baseline main.json]
//
// dir holds the Lighthouse CI results (default .lighthouseci). --json saves this
// run's numbers; runs on main upload that file so PRs can pass it back in as
// --baseline and show what they change. Without a baseline the comparison is
// left out.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";

const { values: options, positionals } = parseArgs({
  allowPositionals: true,
  options: { json: { type: "string" }, baseline: { type: "string" } },
});
const dir = positionals[0] ?? ".lighthouseci";
const read = (file) => JSON.parse(readFileSync(file, "utf8"));
const median = (values) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
const git = (...args) => {
  try {
    return execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return "";
  }
};

// Formatting. Sizes use 1 KB = 1024 bytes, like the budgets in lighthouserc.cjs.
// Numbers and units are joined with non-breaking spaces so cells never wrap.
const nb = (text) => String(text).replaceAll(" ", "\u00a0");
const size = (bytes) => {
  const kb = bytes / 1024;
  if (kb < 1) return "<1 KB";
  return kb < 1024 ? `${Math.round(kb)} KB` : `${Number((kb / 1024).toFixed(2))} MB`;
};
const time = (ms) => (ms < 1000 ? `${Math.round(ms)} ms` : `${(ms / 1000).toFixed(1)} s`);
const seconds = (ms) => `${(ms / 1000).toFixed(1)} s`;
const shift = (value) => (value < 0.0005 ? "0" : value.toFixed(3));
const signed = (n, format) => `${n > 0 ? "+" : "\u2212"}${format(Math.abs(n))}`;
const list = (names) => (names.length < 3 ? names.join(" and ") : `${names.length} pages`);
const capitalize = (text) => text.charAt(0).toUpperCase() + text.slice(1);

// Lighthouse's own colors: scores 90+ are good and under 50 poor; LCP is good
// up to 2.5 s and poor past 4 s.
const scoreDot = (score) => (score >= 90 ? "🟢" : score >= 50 ? "🟡" : "🔴");
const lcpDot = (ms) => (ms <= 2500 ? "🟢" : ms <= 4000 ? "🟡" : "🔴");
const levelDot = { error: "🔴", warn: "🟡", regression: "🟡" };

// --- Results -----------------------------------------------------------------

// Result files are named by timestamp, so this keeps the order pages ran in.
const runs = new Map();
for (const file of readdirSync(dir).filter((f) => /^lhr-.*\.json$/.test(f)).sort()) {
  const lhr = read(`${dir}/${file}`);
  const path = new URL(lhr.requestedUrl).pathname;
  runs.set(path, [...(runs.get(path) ?? []), lhr]);
}
const runCount = Math.max(...[...runs.values()].map((lhrs) => lhrs.length));
const links = existsSync(`${dir}/links.json`) ? read(`${dir}/links.json`) : {};
const assertions = existsSync(`${dir}/assertion-results.json`) ? read(`${dir}/assertion-results.json`) : null;

const NAMES = { "/": "Home", "/posts/": "Posts", "/favorites/": "Favorites", "/books/": "Books", "/work/": "Work" };
const pageName = (path) => {
  if (NAMES[path]) return NAMES[path];
  const html = `dist/client${path}index.html`;
  const title = existsSync(html) && readFileSync(html, "utf8").match(/<title>([^<]*)<\/title>/)?.[1];
  if (!title) return path;
  return title
    .replace(/ \| Dustin Schau$/, "")
    .replace(/&(amp|lt|gt|quot|#39|#x27);/g, (_, e) => ({ amp: "&", lt: "<", gt: ">", quot: '"' })[e] ?? "'");
};

const numeric = (id) => (lhr) => lhr.audits[id].numericValue;
const category = (id) => (lhr) => Math.round(lhr.categories[id].score * 100);
const scriptBytes = (lhr) => lhr.audits["resource-summary"].details.items.find((i) => i.resourceType === "script")?.transferSize ?? 0;
const closestRun = (lhrs, valueOf, target) =>
  lhrs.reduce((best, lhr) => (Math.abs(valueOf(lhr) - target) < Math.abs(valueOf(best) - target) ? lhr : best));

// Files are keyed without the host (the local server's port changes every run)
// or Astro's content hashes, so the same file matches across builds.
const sameHost = (lhr, url) => new URL(url).host === new URL(lhr.requestedUrl).host;
const fileKey = (lhr, url) => {
  const u = new URL(url);
  return sameHost(lhr, url) ? u.pathname.replace(/\.[\w-]{8}(?:_[\w-]+)?(\.\w+)$/, "$1") : `${u.host}${u.pathname}`;
};
const fileName = (lhr, url) => {
  const u = new URL(url);
  if (!sameHost(lhr, url)) return `\`${decodeURIComponent(u.pathname.split("/").pop() || u.host)}\` from ${u.host}`;
  if (u.pathname === new URL(lhr.requestedUrl).pathname) return "The page's HTML";
  const name = fileKey(lhr, url).split("/").pop();
  const script = name.match(/^(.+?)_astro_type_script_index_\d+_lang\.js$/);
  return script ? `\`${script[1]}\` script` : `\`${decodeURIComponent(name)}\``;
};
const requests = (lhr) => lhr.audits["network-requests"].details.items.filter((r) => r.url.startsWith("http"));

const pages = [...runs].map(([path, lhrs]) => {
  const of = (valueOf) => median(lhrs.map(valueOf));
  const bytes = of(numeric("total-byte-weight"));
  const files = {};
  for (const r of requests(closestRun(lhrs, numeric("total-byte-weight"), bytes))) {
    const key = fileKey(lhrs[0], r.url);
    files[key] = (files[key] ?? 0) + r.transferSize;
  }
  return {
    path,
    name: pageName(path),
    report: Object.entries(links).find(([url]) => new URL(url).pathname === path)?.[1],
    score: of(category("performance")),
    lcp: of(numeric("largest-contentful-paint")),
    tbt: of(numeric("total-blocking-time")),
    cls: of(numeric("cumulative-layout-shift")),
    bytes,
    js: of(scriptBytes),
    a11y: of(category("accessibility")),
    bp: of(category("best-practices")),
    files,
    lhrs,
  };
});

// --- Context: commit, time, baseline ----------------------------------------

const server = process.env.GITHUB_SERVER_URL ?? "https://github.com";
const repo =
  process.env.GITHUB_REPOSITORY ?? git("remote", "get-url", "origin").match(/github\.com[:/](.+?)(?:\.git)?$/)?.[1];
const event = process.env.GITHUB_EVENT_PATH && existsSync(process.env.GITHUB_EVENT_PATH) ? read(process.env.GITHUB_EVENT_PATH) : {};
// On PRs GITHUB_SHA is a merge commit nobody has seen, so prefer the PR's head.
const sha = event.pull_request?.head?.sha ?? process.env.GITHUB_SHA ?? git("rev-parse", "HEAD");
const createdAt = new Date().toISOString();

if (options.json) {
  const saved = pages.map(({ lhrs, report, ...page }) => page);
  writeFileSync(options.json, `${JSON.stringify({ version: 1, sha, createdAt, pages: saved }, null, 2)}\n`);
}

const baseline = options.baseline && existsSync(options.baseline) ? read(options.baseline) : null;
const basePage = (path) => (baseline?.version === 1 ? baseline.pages.find((p) => p.path === path) : undefined);

// What counts as a real change from main. Below these it's run-to-run noise,
// so the report stays quiet.
const CHANGES = {
  score: { moved: (d) => Math.abs(d) >= 5, worse: (d) => d < 0, text: (d) => `${signed(d, String)} pts` },
  lcp: { moved: (d, b) => Math.abs(d) >= Math.max(500, b * 0.15), worse: (d) => d > 0, text: (d) => signed(d, seconds) },
  bytes: { moved: (d, b) => Math.abs(d) >= Math.max(20 * 1024, b * 0.05), worse: (d) => d > 0, text: (d) => signed(d, size) },
  js: { moved: (d, b) => Math.abs(d) >= Math.max(2 * 1024, b * 0.1), worse: (d) => d > 0 },
  cls: { moved: (d) => d >= 0.01, worse: () => true },
  a11y: { moved: (d) => d <= -1, worse: () => true },
  bp: { moved: (d) => d <= -1, worse: () => true },
};
for (const page of pages) {
  const base = basePage(page.path);
  page.changes = {};
  if (!base) continue;
  for (const [metric, rule] of Object.entries(CHANGES)) {
    const delta = page[metric] - base[metric];
    if (rule.moved(delta, base[metric])) page.changes[metric] = { delta, base: base[metric], worse: rule.worse(delta) };
  }
}

// --- Budgets -----------------------------------------------------------------

const METRIC_OF = {
  "total-byte-weight": "bytes",
  "resource-summary:script.size": "js",
  "cumulative-layout-shift": "cls",
  "total-blocking-time": "tbt",
  "categories:performance": "score",
  "categories:accessibility": "a11y",
  "categories:best-practices": "bp",
};
const misses = (assertions ?? [])
  .filter((a) => !a.passed)
  .map((a) => ({
    ...a,
    path: new URL(a.url).pathname,
    metric: METRIC_OF[a.auditProperty ? `${a.auditId}:${a.auditProperty}` : a.auditId],
  }));
const missFor = (path, metric) => misses.find((m) => m.path === path && m.metric === metric);

// --- What needs attention ----------------------------------------------------

// An element as a short tag: Astro's scoping attributes dropped, and images
// shown by file name rather than a truncated URL.
const element = (node) => {
  const src = node.snippet.match(/^<img\b[^>]*\bsrc="([^"]+)"/)?.[1];
  if (src) {
    const url = new URL(src, "http://x");
    // Lighthouse cuts long URLs short with "…", so fall back to the host.
    if (src.includes("…")) return `an image from ${url.host}`;
    return `\`${decodeURIComponent(url.pathname.split("/").pop())}\``;
  }
  const tag = node.snippet.replace(/\s+data-astro-cid-\w+(="")?/g, "");
  const snippet = tag.length > 60 ? `${tag.slice(0, 59)}…>` : tag;
  // Lighthouse falls back to a CSS selector as the label, which adds nothing.
  const label = node.nodeLabel && !node.snippet.includes(node.nodeLabel) && !node.nodeLabel.includes(" > ");
  return `\`${snippet}\`${label ? ` "${node.nodeLabel.slice(0, 40)}${node.nodeLabel.length > 40 ? "…" : ""}"` : ""}`;
};
const possessive = (name) => (name.endsWith("s") ? `${name}'` : `${name}'s`);

const fixForFile = (lhr, url) => {
  const type = requests(lhr).find((r) => r.url === url)?.resourceType ?? "Other";
  const host = new URL(url).host;
  if (type === "Image" && !sameHost(lhr, url)) return `request smaller images from ${host}, or resize them with \`getImage()\` at build.`;
  if (type === "Image" && !new URL(url).pathname.startsWith("/_astro/")) return "images in `public/` skip the image pipeline: compress them, or move them to `src/` and use `<Image>`.";
  if (type === "Image") return "shrink the source image, or lower the size passed to `<Image>`.";
  if (type === "Script") return "check what the script imports, and load anything not needed right away with a dynamic `import()`.";
  if (type === "Document") return "the HTML itself is large: look for big inline SVGs or components repeated many times.";
  if (type === "Font") return "subset the font, or drop weights the page doesn't use.";
  return sameHost(lhr, url) ? "files in `public/` are served as-is: compress or resize them." : `check whether the page needs the files from ${host} at load.`;
};
const fixFor = (lhr, urls) => [...new Set(urls.map((url) => fixForFile(lhr, url)))].map(capitalize).join(" ");

// Files behind a size problem: what grew since main when there's a baseline,
// otherwise the largest ones.
const sizeCulprits = (page, onlyType) => {
  const lhr = closestRun(page.lhrs, onlyType ? scriptBytes : numeric("total-byte-weight"), onlyType ? page.js : page.bytes);
  const candidates = requests(lhr).filter((r) => !onlyType || r.resourceType === onlyType);
  const base = basePage(page.path);
  if (base) {
    const grown = candidates
      .map((r) => ({ r, before: base.files[fileKey(lhr, r.url)] ?? 0 }))
      .filter(({ r, before }) => r.transferSize - before >= 2 * 1024)
      .sort((a, b) => b.r.transferSize - b.before - (a.r.transferSize - a.before))
      .slice(0, 3);
    if (grown.length) {
      return {
        lead: "What grew:",
        items: grown.map(({ r, before }) =>
          before ? `${fileName(lhr, r.url)}: ${nb(signed(r.transferSize - before, size))}` : `${fileName(lhr, r.url)}: ${nb(size(r.transferSize))}, new`,
        ),
        fix: fixFor(lhr, grown.map(({ r }) => r.url)),
      };
    }
  }
  const largest = [...candidates].sort((a, b) => b.transferSize - a.transferSize).slice(0, 3);
  return {
    lead: onlyType ? "Largest scripts:" : "Largest files:",
    items: largest.map((r) => `${fileName(lhr, r.url)}: ${nb(size(r.transferSize))}`),
    fix: fixFor(lhr, largest.map((r) => r.url)),
  };
};

const lcpCulprit = (page) => {
  const lhr = closestRun(page.lhrs, numeric("largest-contentful-paint"), page.lcp);
  const node = lhr.audits["largest-contentful-paint-element"]?.details?.items?.[0]?.items?.[0]?.node;
  if (!node) return { fix: "Open the full report to see what the page waits on." };
  const image = /^<img/.test(node.snippet);
  return {
    lead: "The largest element on screen:",
    items: [element(node)],
    fix: image
      ? 'Load this image first: `fetchpriority="high"`, never `loading="lazy"`, and a small file.'
      : "It's text, so the wait is usually the HTML, CSS or fonts it depends on; the full report shows what blocks it.",
  };
};

const METRIC_NAMES = {
  "first-contentful-paint": "First paint",
  "largest-contentful-paint": "Load time",
  "total-blocking-time": "Blocking time",
  "cumulative-layout-shift": "Layout shift",
  "speed-index": "Speed index",
};
const scoreCulprits = (page) => {
  const lhr = closestRun(page.lhrs, category("performance"), page.score);
  const costs = lhr.categories.performance.auditRefs
    .filter((ref) => METRIC_NAMES[ref.id] && lhr.audits[ref.id].score !== null)
    .map((ref) => ({ id: ref.id, lost: ref.weight * (1 - lhr.audits[ref.id].score) }))
    .filter((c) => c.lost >= 1)
    .sort((a, b) => b.lost - a.lost)
    .slice(0, 2);
  const shown = (id) => (id === "cumulative-layout-shift" ? shift(lhr.audits[id].numericValue) : nb(time(lhr.audits[id].numericValue)));
  return {
    lead: "Where the points went:",
    items: costs.map((c) => `${METRIC_NAMES[c.id]} ${shown(c.id)}, costing ${Math.round(c.lost)} points`),
    fix:
      costs[0]?.id === "largest-contentful-paint"
        ? lcpCulprit(page).fix
        : costs[0]?.id === "total-blocking-time"
          ? tbtCulprits(page).fix
          : "Open the full report to see what the page waits on.",
  };
};

const tbtCulprits = (page) => {
  const lhr = closestRun(page.lhrs, numeric("total-blocking-time"), page.tbt);
  const busiest = lhr.audits["bootup-time"].details.items.filter((i) => i.url.startsWith("http")).slice(0, 3);
  return {
    lead: "Busiest files:",
    items: busiest.map((i) => `${fileName(lhr, i.url)}: ${nb(time(i.total))} of work`),
    fix: "Move work out of page load: start animations after load and only while they're on screen, and load code that isn't needed right away with a dynamic `import()`.",
  };
};

const clsCulprits = (page) => {
  const lhr = closestRun(page.lhrs, numeric("cumulative-layout-shift"), page.cls);
  const shifts = (lhr.audits["layout-shifts"]?.details?.items ?? []).slice(0, 3);
  const font = shifts.some((s) => (s.subItems?.items ?? []).some((c) => /font/i.test(c.cause ?? "")));
  return {
    lead: shifts.length ? "What moved:" : undefined,
    items: shifts.map((s) => element(s.node)),
    fix: font
      ? "A web font swaps in late: preload it, or use `font-display: optional`."
      : "Something loads without its space reserved: give images and embeds a width and height (or `aspect-ratio`).",
  };
};

const CHECKS = {
  "color-contrast": ["Low text contrast", "Darken the text (or lighten the background) to at least 4.5:1, or 3:1 for large text."],
  "aria-prohibited-attr": ["ARIA label on an element that can't have one", "Give the element a matching `role`, or drop the attribute."],
  "aria-allowed-attr": ["ARIA attribute that doesn't fit the role", "Drop the attribute or change the role."],
  "image-alt": ["Image without alt text", 'Add `alt` text (`alt=""` if it\'s decorative).'],
  "link-name": ["Link without readable text", "Add text inside the link, or an `aria-label`."],
  "button-name": ["Button without a name", "Add text inside the button, or an `aria-label`."],
  label: ["Form field without a label", "Add a `<label>` or an `aria-label`."],
  "heading-order": ["Headings skip a level", "Use headings in order: an h3 needs an h2 above it."],
  "target-size": ["Tap targets too small or close together", "Make them at least 24×24 px, or space them out."],
  "html-has-lang": ["No page language", "Set `lang` on `<html>`."],
  "errors-in-console": ["Errors in the browser console", "Open the full report to see them."],
  "image-aspect-ratio": ["Stretched image", "Match its width and height to the file's proportions."],
  "image-size-responsive": ["Blurry image", "Serve a larger size through `srcset`."],
  deprecations: ["Browser features that are going away", "Open the full report to see which."],
};
const checkCulprits = (page, categoryId) => {
  const lhr = page.lhrs[0];
  const items = [];
  const fixes = new Set();
  for (const ref of lhr.categories[categoryId].auditRefs) {
    const result = lhr.audits[ref.id];
    if (ref.weight === 0 || result.score === null || result.score === 1) continue;
    const [what, fix] = CHECKS[ref.id] ?? ["Another check failed", "Open the full report for the details."];
    fixes.add(fix);
    const nodes = (result.details?.items ?? []).filter((i) => i.node);
    const seen = new Set();
    const unique = nodes.filter((i) => !seen.has(i.node.snippet) && seen.add(i.node.snippet)).slice(0, 2);
    if (!unique.length) items.push(what);
    for (const item of unique) {
      const contrast = item.node.explanation?.match(/contrast of ([\d.]+) \(foreground color: (#\w+), background color: (#\w+)/);
      const more = nodes.filter((i) => i.node.snippet === item.node.snippet).length - 1;
      items.push(
        `${what}: ${element({ ...item.node, nodeLabel: "" })}${contrast ? `, \`${contrast[2]}\` on \`${contrast[3]}\` is ${contrast[1]}:1` : ""}${more ? ` (${more + 1} places)` : ""}`,
      );
    }
  }
  return { lead: "Problems:", items, fix: [...fixes].join(" ") };
};

// One issue per missed budget or regression: a sentence, what caused it, and
// how to fix it. A budget miss that's also a regression is one issue.
const vsMain = (change, format) => (change ? ` (${signed(change.delta, format)} vs main)` : "");
const describe = (page, metric, miss) => {
  const { name } = page;
  const change = page.changes[metric]?.worse ? page.changes[metric] : undefined;
  switch (metric) {
    case "bytes":
      return {
        sentence: miss
          ? `${name} downloads ${size(page.bytes)}, ${size(miss.actual - miss.expected)} over its ${size(miss.expected)} budget${vsMain(change, size)}.`
          : `${name} is ${size(change.delta)} heavier than on main (${size(change.base)} → ${size(page.bytes)}).`,
        ...sizeCulprits(page),
      };
    case "js":
      return {
        sentence: miss
          ? `${name} loads ${size(page.js)} of JavaScript, ${size(miss.actual - miss.expected)} over its ${size(miss.expected)} budget${vsMain(change, size)}.`
          : `${name} loads ${size(change.delta)} more JavaScript than on main (${size(change.base)} → ${size(page.js)}).`,
        ...sizeCulprits(page, "Script"),
      };
    case "cls":
      return {
        sentence: miss
          ? `${name} jumps around while loading: layout shift is ${shift(page.cls)}, over its ${miss.expected} budget.`
          : `${name} jumps around more than on main: layout shift went from ${shift(change.base)} to ${shift(page.cls)}.`,
        ...clsCulprits(page),
      };
    case "tbt":
      return {
        sentence: `${name} keeps the browser busy for ${time(page.tbt)} while loading, over its ${time(miss.expected)} target.`,
        ...tbtCulprits(page),
      };
    case "score":
      return {
        sentence: miss
          ? `${name} scores ${page.score}, under its target of ${Math.round(miss.expected * 100)}${vsMain(change, String)}.`
          : `${possessive(name)} score dropped ${-change.delta} points from main (${change.base} → ${page.score}).`,
        ...scoreCulprits(page),
      };
    case "lcp":
      return {
        sentence: `${name} takes ${seconds(change.delta)} longer to load than on main (${seconds(change.base)} → ${seconds(page.lcp)})${
          page.changes.score?.worse ? `, costing ${-page.changes.score.delta} points of score` : ""
        }.`,
        ...lcpCulprit(page),
      };
    case "a11y":
    case "bp": {
      const label = metric === "a11y" ? "accessibility" : "best practices";
      return {
        sentence: miss
          ? `${name} scores ${page[metric]} for ${label}, under its budget of ${Math.round(miss.expected * 100)}.`
          : `${possessive(name)} ${label} score dropped from ${change.base} to ${page[metric]} since main.`,
        ...checkCulprits(page, metric === "a11y" ? "accessibility" : "best-practices"),
      };
    }
  }
};

const ORDER = { error: 0, regression: 1, warn: 2 };
const issues = [];
for (const page of pages) {
  for (const miss of misses.filter((m) => m.path === page.path && m.metric)) {
    issues.push({ level: miss.level === "error" ? "error" : "warn", page, ...describe(page, miss.metric, miss) });
  }
  for (const [metric, change] of Object.entries(page.changes)) {
    // A slower load explains a lower score, so that's said once, as load time.
    const explained = metric === "score" && page.changes.lcp?.worse;
    if (change.worse && !explained && !missFor(page.path, metric)) issues.push({ level: "regression", page, metric, ...describe(page, metric) });
  }
}
issues.sort((a, b) => ORDER[a.level] - ORDER[b.level]);

// --- Headline ----------------------------------------------------------------

const namesWith = (level) => [...new Set(issues.filter((i) => i.level === level).map((i) => i.page.name))];
const failing = namesWith("error");
const regressed = namesWith("regression");
const warned = namesWith("warn");
const regressionKinds = new Set(issues.filter((i) => i.level === "regression").map((i) => i.metric));
const how =
  [...regressionKinds].every((m) => m === "bytes" || m === "js")
    ? "got heavier than main"
    : [...regressionKinds].every((m) => m === "lcp" || m === "score")
      ? "got slower than main"
      : "regressed vs main";

let headline;
if (!assertions) {
  headline = "⚪ Lighthouse ran, but the budgets weren't checked";
} else if (failing.length) {
  headline = `🔴 ${list(failing)} ${failing.length === 1 ? "is" : "are"} over budget, so this check fails`;
  if (regressed.length) headline += `, and ${list(regressed)} ${how}`;
} else if (regressed.length) {
  headline = `🟡 Within budget, but ${list(regressed)} ${how}`;
} else if (warned.length) {
  headline = `🟡 Passing, but ${list(warned)} ${warned.length === 1 ? "misses its" : "miss their"} speed target`;
} else {
  headline = `🟢 Performance looks good: all ${pages.length} pages within budget${baseline ? ", no regressions vs main" : ""}`;
}

const slowest = pages.reduce((a, b) => (b.lcp > a.lcp ? b : a));
const heaviest = pages.reduce((a, b) => (b.bytes > a.bytes ? b : a));

// --- Markdown ----------------------------------------------------------------

const link = (page) => (page.report ? `[${page.name}](${page.report})` : page.name);
const flag = (path, metric, text) => {
  const miss = missFor(path, metric);
  return nb(miss ? `${levelDot[miss.level === "error" ? "error" : "warn"]} ${text}` : text);
};
const changeCell = (page) => {
  if (!basePage(page.path)) return "new";
  const cells = ["score", "lcp", "bytes"]
    .filter((metric) => page.changes[metric])
    .map((metric) => {
      const { delta, worse } = page.changes[metric];
      const text = nb(`${CHANGES[metric].text(delta)} ${delta > 0 ? "▲" : "▼"}`);
      return worse ? `**${text}**` : text;
    });
  return cells.join("<br>") || "—";
};

const out = [
  "<!-- lighthouse-report -->",
  `### ${headline}`,
  "",
  `Slowest page: ${slowest.name} (${nb(seconds(slowest.lcp))}) · Heaviest: ${heaviest.name} (${nb(size(heaviest.bytes))})`,
  "",
  `| Page | Score | Load time | Size |${baseline ? " vs main |" : ""}`,
  `| :-- | --: | --: | --: |${baseline ? " --: |" : ""}`,
  ...pages.map(
    (p) =>
      `| ${link(p)} | ${nb(`${scoreDot(p.score)} ${p.score}`)} | ${nb(`${lcpDot(p.lcp)} ${seconds(p.lcp)}`)} | ${flag(p.path, "bytes", size(p.bytes))} |${baseline ? ` ${changeCell(p)} |` : ""}`,
  ),
];

if (issues.length) {
  out.push("", "#### What needs attention");
  for (const issue of issues) {
    out.push("", `${levelDot[issue.level]} **${issue.sentence}**${issue.lead && issue.items?.length ? ` ${issue.lead}` : ""}`);
    if (issue.items?.length) out.push("", ...issue.items.map((item) => `- ${item}`));
    out.push("", `**Fix:** ${issue.fix}`);
  }
}

out.push(
  "",
  "<details><summary>More metrics</summary>",
  "",
  "| Page | Blocking time | Layout shift | JavaScript | Accessibility | Best practices |",
  "| :-- | --: | --: | --: | --: | --: |",
  ...pages.map(
    (p) =>
      `| ${p.name} | ${flag(p.path, "tbt", time(p.tbt))} | ${flag(p.path, "cls", shift(p.cls))} | ${flag(p.path, "js", size(p.js))} | ${flag(p.path, "a11y", p.a11y)} | ${flag(p.path, "bp", p.bp)} |`,
  ),
  "",
  "</details>",
  "",
);

const anchor = (href, text) => (href ? `<a href="${href}">${text}</a>` : text);
const repoUrl = repo && `${server}/${repo}`;
const updated = new Date(createdAt).toLocaleString("en-US", {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: "UTC",
});
const runUrl = repoUrl && process.env.GITHUB_RUN_ID && `${repoUrl}/actions/runs/${process.env.GITHUB_RUN_ID}`;
const footer = [
  "Mobile",
  `median of ${runCount} runs`,
  sha && `commit ${anchor(repoUrl && `${repoUrl}/commit/${sha}`, sha.slice(0, 7))}`,
  baseline
    ? `vs main at ${anchor(repoUrl && `${repoUrl}/commit/${baseline.sha}`, baseline.sha.slice(0, 7))}`
    : process.env.GITHUB_EVENT_NAME !== "push" && "no main baseline yet",
  `updated ${anchor(runUrl, `${updated} UTC`)}`,
  repoUrl && sha && anchor(`${repoUrl}/blob/${sha}/lighthouserc.cjs`, "budgets"),
].filter(Boolean);
out.push(`<sub>${footer.join(" · ")}</sub>`, "");

process.stdout.write(out.join("\n"));
