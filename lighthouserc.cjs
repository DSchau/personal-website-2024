// Lighthouse CI config for the PR performance gate (.github/workflows/lighthouse.yml).
// Runs Lighthouse's default mobile preset (simulated slow 4G, 4x CPU throttling)
// three times per page against the prerendered output in dist/client, then
// asserts on the median run.

// Performance score and TBT swing a lot on shared CI runners, so they only warn
// for now. Switch this to 'error' once a week or so of PRs show they're stable.
const noisy = "warn";

const pages = [
  { path: "/", performance: 0.9, tbt: 300 },
  { path: "/posts/", performance: 0.9, tbt: 300 },
  // /favorites/ and /books/ get looser budgets until the fixes from #61 land
  { path: "/favorites/", performance: 0.85, tbt: 500 },
  { path: "/books/", performance: 0.85, tbt: 300 },
  { path: "/work/", performance: 0.9, tbt: 300 },
  // the longest post: lots of prose and highlighted code
  { path: "/posts/css-in-js-benefits-drawbacks-and-tooling/", performance: 0.9, tbt: 300 },
];

module.exports = {
  ci: {
    collect: {
      staticDistDir: "./dist/client",
      url: pages.map((page) => page.path),
      numberOfRuns: 3,
    },
    assert: {
      assertMatrix: pages.map((page) => ({
        matchingUrlPattern: `^https?://[^/]+${page.path}$`,
        aggregationMethod: "median",
        assertions: {
          "categories:performance": [noisy, { minScore: page.performance }],
          "total-blocking-time": [noisy, { maxNumericValue: page.tbt }],
          "cumulative-layout-shift": ["error", { maxNumericValue: 0.02 }],
          "resource-summary:script:size": ["error", { maxNumericValue: 30 * 1024 }],
          "total-byte-weight": ["error", { maxNumericValue: 1024 * 1024 }],
          "categories:accessibility": ["error", { minScore: 0.95 }],
          "categories:best-practices": ["error", { minScore: 0.95 }],
        },
      })),
    },
    upload: {
      target: "temporary-public-storage",
    },
  },
};
