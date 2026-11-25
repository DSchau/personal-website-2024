// Layout regression checks against the built site in dist/ (run `pnpm run build` first).
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: 'tests/layout',
  retries: 0,
  reporter: process.env.CI ? 'github' : 'list',
  // baselines are rendered on Linux (CI); other platforms still run the bounds checks
  ignoreSnapshots: process.platform !== 'linux',
  expect: {
    toHaveScreenshot: { maxDiffPixelRatio: 0.01, animations: 'disabled' },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
