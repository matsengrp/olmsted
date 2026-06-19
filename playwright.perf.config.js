// @ts-check
const { defineConfig, devices } = require("@playwright/test");

/**
 * Playwright configuration for Olmsted performance tests (issue #317).
 *
 * Separate from the e2e config (testDir tests/e2e) so the perf spec does NOT
 * run with `npm run test:e2e` and is not wired into the blocking CI build.
 * Run it explicitly with `npm run test:perf`.
 *
 * Report-only: the spec records ingest/render timings and asserts only that the
 * dataset was fully exercised — no timing thresholds (shared runners are noisy).
 * Reuses the same `npm start` dev server on port 4000 as the e2e config.
 */
const PORT = 4000;
const isCI = !!process.env.CI;

module.exports = defineConfig({
  testDir: "tests/performance",
  forbidOnly: isCI,
  // No retries: a perf run is a measurement, not a pass/fail gate; retrying
  // would just remeasure. A genuine failure (e.g. ingest broke) should surface.
  retries: 0,
  workers: 1,
  reporter: isCI ? [["html", { open: "never" }], ["list"]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "on-first-retry"
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    }
  ],
  webServer: {
    command: `PORT=${PORT} npm start`,
    url: `http://localhost:${PORT}`,
    timeout: 180 * 1000,
    reuseExistingServer: !isCI
  }
});
