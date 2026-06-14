// @ts-check
const { defineConfig, devices } = require("@playwright/test");

/**
 * Playwright configuration for Olmsted end-to-end tests.
 *
 * Scope (issue #287, Phase 1): a single Chromium project running the
 * happy-path smoke test. Cross-browser matrix and visual regression are
 * deliberately out of scope until a real need surfaces.
 *
 * The dev server is the standard `npm start` (babel-node + webpack-dev-
 * middleware) launched on port 4000 via the PORT env var, which server.js
 * honors ahead of its 3999 default. No local data directory is required:
 * the smoke test uploads its fixture through the browser, matching the
 * client-side-only architecture (DESIGN.md D1).
 *
 * @see https://playwright.dev/docs/test-configuration
 */
const PORT = 4000;
const isCI = !!process.env.CI;

module.exports = defineConfig({
  testDir: "tests/e2e",
  // Fail the build on CI if test.only is accidentally committed.
  forbidOnly: isCI,
  // One retry on CI absorbs the occasional dev-server cold-start flake;
  // locally a failure should fail immediately so it is not masked.
  retries: isCI ? 1 : 0,
  // The dev server is a shared resource (single port); keep tests serial.
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
    // babel-node + the first webpack compile is slow; give it room.
    timeout: 180 * 1000,
    reuseExistingServer: !isCI
  }
});
