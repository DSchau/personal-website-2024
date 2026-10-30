// Turns the Lighthouse CI output in .lighthouseci/ into a markdown summary
// (median of each page's runs, failed assertions, report links) for the PR
// comment and job summary written by .github/workflows/lighthouse.yml.
import { existsSync, readFileSync, readdirSync } from "node:fs";

const dir = ".lighthouseci";
const read = (file) => JSON.parse(readFileSync(`${dir}/${file}`, "utf8"));
const median = (values) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];

const runs = new Map();
for (const file of readdirSync(dir).filter((f) => /^lhr-.*\.json$/.test(f))) {
  const lhr = read(file);
  const path = new URL(lhr.requestedUrl).pathname;
  runs.set(path, [...(runs.get(path) ?? []), lhr]);
}

const score = (lhrs, id) => Math.round(median(lhrs.map((l) => l.categories[id].score)) * 100);
const audit = (lhrs, id) => median(lhrs.map((l) => l.audits[id].numericValue));
const scriptBytes = (l) => l.audits["resource-summary"].details.items.find((i) => i.resourceType === "script")?.transferSize ?? 0;
const kb = (bytes) => `${Math.round(bytes / 1024)} KB`;

const links = existsSync(`${dir}/links.json`) ? read("links.json") : {};
const linkFor = (path) => Object.entries(links).find(([url]) => new URL(url).pathname === path)?.[1];

const lines = [
  "## Lighthouse (mobile, median of 3 runs)",
  "",
  "| Page | Perf | LCP | TBT | CLS | JS | Page weight | A11y | Best practices |",
  "| --- | --: | --: | --: | --: | --: | --: | --: | --: |",
];
for (const [path, lhrs] of [...runs].sort(([a], [b]) => a.localeCompare(b))) {
  const report = linkFor(path);
  lines.push(
    `| ${report ? `[${path}](${report})` : path} | ${score(lhrs, "performance")} | ${(audit(lhrs, "largest-contentful-paint") / 1000).toFixed(1)} s | ${Math.round(audit(lhrs, "total-blocking-time"))} ms | ${audit(lhrs, "cumulative-layout-shift").toFixed(3)} | ${kb(median(lhrs.map(scriptBytes)))} | ${kb(audit(lhrs, "total-byte-weight"))} | ${score(lhrs, "accessibility")} | ${score(lhrs, "best-practices")} |`,
  );
}

const failures = existsSync(`${dir}/assertion-results.json`) ? read("assertion-results.json").filter((a) => !a.passed) : [];
const fmt = (v) => (Number.isInteger(v) ? v : v.toFixed(3));
lines.push("");
if (failures.length) {
  lines.push("### Budgets exceeded", "");
  for (const f of failures) {
    lines.push(`- ${f.level === "error" ? "❌" : "⚠️"} \`${new URL(f.url).pathname}\` ${f.auditTitle ?? f.auditId}: ${fmt(f.actual)} (budget ${f.operator} ${fmt(f.expected)})`);
  }
} else {
  lines.push("All budgets met.");
}
lines.push("", "Budgets live in `lighthouserc.cjs`. ⚠️ warnings don't fail the check; ❌ errors do.");

console.log(lines.join("\n"));
