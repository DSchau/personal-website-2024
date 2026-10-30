// Turns the Lighthouse CI output in .lighthouseci/ (or the directory passed as
// the first argument) into the markdown for the PR comment and job summary
// written by .github/workflows/lighthouse.yml: a verdict, a plain-English
// explanation of every missed budget, a small results table, and the full
// metrics in a collapsed section.
import { existsSync, readFileSync, readdirSync } from "node:fs";

const dir = process.argv[2] ?? ".lighthouseci";
const read = (file) => JSON.parse(readFileSync(`${dir}/${file}`, "utf8"));
const median = (values) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
const nb = (text) => String(text).replaceAll(" ", "\u00a0");
const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

// Files are named by timestamp, so this keeps the order pages were run in.
const runs = new Map();
for (const file of readdirSync(dir).filter((f) => /^lhr-.*\.json$/.test(f)).sort()) {
  const lhr = read(file);
  const path = new URL(lhr.requestedUrl).pathname;
  runs.set(path, [...(runs.get(path) ?? []), lhr]);
}
const runCount = Math.max(...[...runs.values()].map((lhrs) => lhrs.length));

const links = existsSync(`${dir}/links.json`) ? read("links.json") : {};
const reportFor = (path) => Object.entries(links).find(([url]) => new URL(url).pathname === path)?.[1];
const assertions = existsSync(`${dir}/assertion-results.json`) ? read("assertion-results.json") : null;
const misses = (assertions ?? [])
  .filter((a) => !a.passed)
  .map((a) => ({ ...a, path: new URL(a.url).pathname }))
  .sort((a, b) => (a.level === b.level ? 0 : a.level === "error" ? -1 : 1));

// Formatting. Sizes use 1 KB = 1024 bytes, like the budgets in lighthouserc.cjs.
const size = (bytes, mbDigits = 1) => {
  const kb = bytes / 1024;
  if (kb < 1) return "<1 KB";
  if (kb < 1024) return `${Math.round(kb)} KB`;
  return `${mbDigits === null ? Number((kb / 1024).toFixed(2)) : (kb / 1024).toFixed(mbDigits)} MB`;
};
const time = (ms) => (ms < 1000 ? `${Math.round(ms)} ms` : `${(ms / 1000).toFixed(1)} s`);
const cls = (value) => (value === 0 ? "0" : value.toFixed(3));
const pageName = (path) => {
  const post = path.match(/^\/posts\/([^/]+)\/$/);
  return post ? `Blog post (${post[1].split("-").slice(0, 3).join("-")}…)` : path;
};
const pageLink = (path) => {
  const report = reportFor(path);
  return report ? `[${nb(pageName(path))}](${report})` : nb(pageName(path));
};
const fileName = (url, path) => {
  const u = new URL(url);
  const name = decodeURIComponent(u.pathname.split("/").filter(Boolean).pop() ?? u.host);
  const page = runs.get(path)?.[0];
  if (page && u.pathname === path && u.host === new URL(page.requestedUrl).host) return "The page's HTML";
  return page && u.host === new URL(page.requestedUrl).host ? `\`${name}\`` : `\`${name}\` (${u.host})`;
};
const element = (node) => {
  const snippet = node.snippet.length > 60 ? `${node.snippet.slice(0, 59)}…>` : node.snippet;
  // Lighthouse falls back to a CSS selector as the label, which adds nothing.
  const label = node.nodeLabel && !node.snippet.includes(node.nodeLabel) && !node.nodeLabel.includes(" > ") ? ` "${node.nodeLabel.slice(0, 40)}${node.nodeLabel.length > 40 ? "…" : ""}"` : "";
  return `\`${snippet}\`${label}`;
};

// The run whose value is closest to the median, for "what caused it" details.
const closestRun = (path, valueOf, target) =>
  runs.get(path).reduce((best, lhr) => (Math.abs(valueOf(lhr) - target) < Math.abs(valueOf(best) - target) ? lhr : best));
const numeric = (id) => (lhr) => lhr.audits[id].numericValue;
const category = (id) => (lhr) => lhr.categories[id].score;
const scriptBytes = (lhr) => lhr.audits["resource-summary"].details.items.find((i) => i.resourceType === "script")?.transferSize ?? 0;

// What to do about a large file, by where it comes from and what it is.
const fixForFile = (lhr, url) => {
  const request = lhr.audits["network-requests"].details.items.find((r) => r.url === url);
  const type = request?.resourceType ?? "Other";
  const remote = new URL(url).host !== new URL(lhr.requestedUrl).host;
  if (type === "Image" && remote) return `Images from ${new URL(url).host} are used at full size: request a smaller size from the host, or fetch them through \`getImage()\` at build so they're resized to webp.`;
  if (type === "Image" && !new URL(url).pathname.startsWith("/_astro/")) return "Images in `public/` skip the image pipeline: resize or compress them, or move them to `src/` and use `<Image>`.";
  if (type === "Image") return "Images: shrink the source file, or lower the width/height passed to `<Image>`/`getImage()`.";
  if (type === "Script") return "JavaScript: check what the bundle imports, and load anything not needed right away with a dynamic `import()`.";
  if (type === "Document") return "HTML: the page markup itself is large; look for big inline SVGs or components repeated many times.";
  if (type === "Font") return "Fonts: subset the font, or drop weights the page doesn't use.";
  if (type === "Stylesheet") return "CSS: look for large inline styles or rules the page doesn't use.";
  return remote
    ? `Files from ${new URL(url).host}: check whether the page needs them at load.`
    : "Files in `public/` are served untouched: compress or resize them.";
};
const fixes = (lhr, urls) => fixLine([...new Set(urls.map((url) => fixForFile(lhr, url)))].join(" "));
const fixLine = (text) => ["", `**Fix:** ${text.charAt(0).toUpperCase()}${text.slice(1)}`];

// Plain-English names and fixes for the accessibility and best-practices
// problems this site is likely to hit.
const CHECKS = {
  "color-contrast": ["Text contrast is too low", "darken the text (or lighten the background) to at least 4.5:1, or 3:1 for large text."],
  "aria-prohibited-attr": ["An ARIA attribute is used on an element that can't have it", "give the element a matching `role`, or remove the attribute."],
  "aria-allowed-attr": ["An ARIA attribute doesn't fit the element's role", "remove the attribute or change the role."],
  "image-alt": ["Images have no alt text", 'add `alt` text (`alt=""` for decorative images).'],
  "link-name": ["Links have no readable text", "add text inside the link, or an `aria-label`."],
  "button-name": ["Buttons have no readable name", "add text inside the button, or an `aria-label`."],
  label: ["Form fields have no label", "add a `<label>` or an `aria-label`."],
  "heading-order": ["Headings skip a level", "use headings in order (an h3 needs an h2 above it)."],
  "list": ["Lists contain something other than list items", "only put `<li>` directly inside `<ul>`/`<ol>`."],
  listitem: ["List items are outside a list", "wrap them in a `<ul>` or `<ol>`."],
  "target-size": ["Tap targets are too small or too close together", "make them at least 24×24 px or add spacing."],
  "html-has-lang": ["The page doesn't declare its language", 'set `lang` on `<html>`.'],
  "document-title": ["The page has no title", "pass a `title` to the layout."],
  "errors-in-console": ["The browser console shows errors", "open the report to see them, then fix the failing script or request."],
  "image-aspect-ratio": ["An image is stretched", "make its width and height match the file's proportions."],
  "image-size-responsive": ["Images are lower resolution than the screen needs", "serve a larger size through `srcset`."],
  deprecations: ["The page uses browser features that are being removed", "open the report to see which, and replace them."],
  "inspector-issues": ["Chrome reported problems while loading the page", "open the report to see them."],
  "third-party-cookies": ["A third-party script sets cookies", "check which script and whether it's still needed."],
};
const problemLines = (lhr, categoryId) => {
  const lines = [];
  for (const ref of lhr.categories[categoryId].auditRefs) {
    const result = lhr.audits[ref.id];
    if (ref.weight === 0 || result.score === null || result.score === 1) continue;
    const [what, fix] = CHECKS[ref.id] ?? ["Another check failed", "open the full report for the details."];
    lines.push(`- ${what}:`);
    for (const item of (result.details?.items ?? []).filter((i) => i.node).slice(0, 3)) {
      const contrast = item.node.explanation?.match(/contrast of ([\d.]+) \(foreground color: (#\w+), background color: (#\w+)/);
      lines.push(`  - ${element(item.node)}${contrast ? `: \`${contrast[2]}\` on \`${contrast[3]}\` is ${contrast[1]}:1` : ""}`);
    }
    lines.push(`  - **Fix:** ${fix.charAt(0).toUpperCase()}${fix.slice(1)}`);
  }
  return lines;
};

const METRICS = {
  "first-contentful-paint": "First paint",
  "largest-contentful-paint": "Load time (LCP)",
  "total-blocking-time": "Blocking time (TBT)",
  "cumulative-layout-shift": "Layout shift (CLS)",
  "speed-index": "Speed index",
};

// One explanation per missed budget: a headline sentence, then what caused it
// and how to fix it.
const explain = (miss) => {
  const { path, actual, expected } = miss;
  const page = `**${pageLink(path)}**`;
  const key = miss.auditProperty ? `${miss.auditId}:${miss.auditProperty}` : miss.auditId;
  switch (key) {
    case "total-byte-weight": {
      const lhr = closestRun(path, numeric(key), actual);
      const largest = lhr.audits["total-byte-weight"].details.items.slice(0, 3);
      return [
        `${page} downloads ${nb(size(actual, null))}, ${nb(size(actual - expected))} over the ${nb(size(expected, null))} limit. Largest files:`,
        ...largest.map((file) => `- ${fileName(file.url, path)}: ${nb(size(file.totalBytes, null))}`),
        ...fixes(lhr, largest.map((file) => file.url)),
      ];
    }
    case "resource-summary:script.size": {
      const lhr = closestRun(path, scriptBytes, actual);
      const scripts = lhr.audits["network-requests"].details.items
        .filter((r) => r.resourceType === "Script")
        .sort((a, b) => b.transferSize - a.transferSize)
        .slice(0, 3);
      return [
        `${page} loads ${nb(size(actual))} of JavaScript, ${nb(size(actual - expected))} over the ${nb(size(expected, null))} limit. Largest scripts:`,
        ...scripts.map((r) => `- ${fileName(r.url, path)}: ${nb(size(r.transferSize))}`),
        ...fixes(lhr, scripts.map((r) => r.url)),
      ];
    }
    case "cumulative-layout-shift": {
      const lhr = closestRun(path, numeric(key), actual);
      const shifts = (lhr.audits["layout-shifts"]?.details?.items ?? []).slice(0, 3);
      const causes = shifts.flatMap((s) => s.subItems?.items ?? []).map((c) => c.cause ?? "");
      const fix = causes.some((c) => /font/i.test(c))
        ? "a web font swapped in late; preload it or use `font-display: optional`."
        : "content loads without a reserved size; give images and embeds a width and height (or `aspect-ratio`) so their space is held before they load.";
      return [
        `${page} jumps around while loading: layout shift is ${cls(actual)}, over the ${expected} limit.${shifts.length ? " Elements that moved:" : ""}`,
        ...shifts.map((s) => `- ${element(s.node)}${s.subItems?.items?.length ? ` (${s.subItems.items.map((c) => c.cause.toLowerCase()).join(", ")})` : ""}`),
        ...fixLine(fix),
      ];
    }
    case "total-blocking-time": {
      const lhr = closestRun(path, numeric(key), actual);
      const busiest = lhr.audits["bootup-time"].details.items.filter((i) => i.url.startsWith("http")).slice(0, 3);
      return [
        `${page} keeps the browser busy for ${nb(time(actual))} before it responds to taps, ${nb(time(actual - expected))} over the ${nb(time(expected))} limit. Busiest files:`,
        ...busiest.map((i) => `- ${fileName(i.url, path)}: ${nb(time(i.total))} of work`),
        ...fixLine("move work out of page load: start animations after load and only while on screen (as #60 did for the ocean), and load code that isn't needed right away with a dynamic `import()`."),
      ];
    }
    case "categories:performance": {
      const lhr = closestRun(path, category("performance"), actual);
      const costs = lhr.categories.performance.auditRefs
        .filter((ref) => METRICS[ref.id] && lhr.audits[ref.id].score !== null)
        .map((ref) => ({ ...ref, lost: Math.round(ref.weight * (1 - lhr.audits[ref.id].score)) }))
        .filter((ref) => ref.lost > 0)
        .sort((a, b) => b.lost - a.lost)
        .slice(0, 2);
      const metric = (id) => (id === "cumulative-layout-shift" ? cls(lhr.audits[id].numericValue) : nb(time(lhr.audits[id].numericValue)));
      const lcp = lhr.audits["largest-contentful-paint-element"]?.details?.items?.[0]?.items?.[0]?.node;
      const fix =
        costs[0]?.id === "largest-contentful-paint" && lcp
          ? `the largest thing on screen is ${element(lcp)}; make it smaller, or load it earlier with \`fetchpriority="high"\`.`
          : costs[0]?.id === "total-blocking-time"
            ? "move work out of page load: start animations after load and load code that isn't needed right away with a dynamic `import()`."
            : "open the report for the slowest steps.";
      return [
        `${page} scores ${Math.round(actual * 100)} for performance, ${Math.round((expected - actual) * 100)} below the target of ${Math.round(expected * 100)}. Where the points went:`,
        ...costs.map((ref) => `- ${METRICS[ref.id]}: ${metric(ref.id)}, costing ${plural(ref.lost, "point")}`),
        ...fixLine(fix),
      ];
    }
    case "categories:accessibility":
    case "categories:best-practices": {
      const name = miss.auditProperty === "accessibility" ? "accessibility" : "best practices";
      const lhr = closestRun(path, category(miss.auditProperty), actual);
      return [
        `${page} scores ${Math.round(actual * 100)} for ${name}, ${Math.round((expected - actual) * 100)} below the target of ${Math.round(expected * 100)}. Problems:`,
        ...problemLines(lhr, miss.auditProperty),
      ];
    }
    default:
      return [`${page} missed a budget. Open its report for the details.`];
  }
};

// Verdict first, so the outcome is clear without reading further.
const pagesWith = (level) => new Set(misses.filter((m) => m.level === level).map((m) => m.path)).size;
const errorPages = pagesWith("error");
const warnings = misses.filter((m) => m.level !== "error").length;
// The workflow finds the comment to update by this marker.
const lines = ["<!-- lighthouse-report -->"];
if (!assertions) {
  lines.push("## Lighthouse: budgets weren't checked on this run");
} else if (errorPages) {
  lines.push(`## ❌ Lighthouse: ${plural(errorPages, "page")} over budget, this check fails`);
} else if (warnings) {
  lines.push(`## ⚠️ Lighthouse: this check passes, with ${plural(warnings, "warning")}`);
} else {
  lines.push("## ✅ Lighthouse: all pages within budget");
}

for (const [i, miss] of misses.entries()) {
  const [headline, ...details] = explain(miss);
  if (miss.level !== "error" && misses[i - 1]?.level !== miss.level) lines.push("", "**Warnings** (these don't fail the check):");
  lines.push("", `${miss.level === "error" ? "❌" : "⚠️"} ${headline}`, "", ...details);
}

const status = (path) => {
  const levels = misses.filter((m) => m.path === path).map((m) => m.level);
  return levels.includes("error") ? "❌" : levels.length ? "⚠️" : "✅";
};
const medianOf = (lhrs, valueOf) => median(lhrs.map(valueOf));
const score = (lhrs, id) => Math.round(medianOf(lhrs, category(id)) * 100);

lines.push("", "| Page | Status | Perf score | Load time (LCP) | Page size |", "| --- | :-: | --: | --: | --: |");
for (const [path, lhrs] of runs) {
  lines.push(
    `| ${pageLink(path)} | ${status(path)} | ${score(lhrs, "performance")} | ${nb(time(medianOf(lhrs, numeric("largest-contentful-paint"))))} | ${nb(size(medianOf(lhrs, numeric("total-byte-weight"))))} |`,
  );
}

lines.push(
  "",
  "<details><summary>All metrics</summary>",
  "",
  "| Page | Blocking time (TBT) | Layout shift (CLS) | JavaScript | Accessibility | Best practices |",
  "| --- | --: | --: | --: | --: | --: |",
);
for (const [path, lhrs] of runs) {
  lines.push(
    `| ${pageLink(path)} | ${nb(time(medianOf(lhrs, numeric("total-blocking-time"))))} | ${cls(medianOf(lhrs, numeric("cumulative-layout-shift")))} | ${nb(size(medianOf(lhrs, scriptBytes)))} | ${score(lhrs, "accessibility")} | ${score(lhrs, "best-practices")} |`,
  );
}
const linked = Object.keys(links).length ? " Page names link to the full reports." : "";
lines.push("", `Mobile, median of ${runCount} runs. Limits are in \`lighthouserc.cjs\`.${linked}`, "", "</details>");

console.log(lines.join("\n"));
