// @ts-check
/**
 * Shared helpers for the Playwright performance specs (perf.spec.js,
 * interactions.spec.js). Kept separate from tests/e2e/helpers.js (View-state
 * readers shared with the e2e suite) — these are perf-run-specific.
 */
const fs = require("fs");
const { expect } = require("@playwright/test");

/**
 * Write a generated dataset to a temp file (before any timing mark). Returns
 * the path plus byte size. A file path also sidesteps Playwright's 50 MB
 * in-memory setInputFiles buffer cap, which large datasets exceed.
 * @returns {{ fixturePath: string, bytes: number }}
 */
function writeFixture(testInfo, ds) {
  const fixturePath = testInfo.outputPath(`${ds.datasetName}.json`);
  fs.writeFileSync(fixturePath, JSON.stringify(ds.dataset));
  return { fixturePath, bytes: fs.statSync(fixturePath).size };
}

/** Upload a generated dataset and enter the App view (scatterplot mounts). */
async function uploadAndExplore(page, testInfo, ds) {
  const { fixturePath } = writeFixture(testInfo, ds);
  await page.goto("/");
  await page.locator('[data-testid="splash-file-input"]').setInputFiles(fixturePath);
  await expect(page.getByText(ds.datasetName, { exact: false }).first()).toBeVisible({ timeout: 120000 });
  await page.getByText(ds.datasetName, { exact: false }).first().click();
  await page.getByRole("button", { name: /Explore!/ }).click();
}

/** Attach a results object to the Playwright report and persist it to test-results/. */
async function persistResults(testInfo, name, results) {
  await testInfo.attach(name, { body: JSON.stringify(results, null, 2), contentType: "application/json" });
  fs.mkdirSync("test-results", { recursive: true });
  fs.writeFileSync(`test-results/${name}.json`, JSON.stringify(results, null, 2));
}

/**
 * Set a Vega signal and measure the resulting runAsync (recompute+render) in ms,
 * in-browser (performance.now) — isolates Vega's cost with no Playwright noise.
 * @returns {Promise<number|null>} ms, or null if the view isn't registered
 */
function measureSignal(page, viewName, signal, value) {
  return page.evaluate(
    async ([n, s, val]) => {
      const v = window.__OLMSTED_VEGA_VIEWS__ && window.__OLMSTED_VEGA_VIEWS__.get(n);
      if (!v) return null;
      await v.runAsync(); // ensure settled before timing
      const t0 = performance.now();
      v.signal(s, val);
      await v.runAsync();
      return Math.round(performance.now() - t0);
    },
    [viewName, signal, value]
  );
}

/**
 * Find a bound <select> by its Vega bind label (e.g. "X variable") and return an
 * option value different from `current`, or null if none. Bindings render in the
 * DOM even when CSS-hidden, so this works regardless of control visibility.
 * Assumes one chart's bindings per page region (labels like "Branch color by"
 * are chart-specific; generic ones are only present when a single chart is up).
 * @returns {Promise<string|null>}
 */
function alternateOption(page, bindLabel, current) {
  return page.evaluate(
    ([label, cur]) => {
      const selects = Array.from(document.querySelectorAll("select"));
      for (const sel of selects) {
        const container = sel.closest(".vega-bind") || sel.parentElement;
        const text = (container && container.textContent) || "";
        if (text.includes(label)) {
          const alt = Array.from(sel.options)
            .map((o) => o.value)
            .find((v) => v !== String(cur));
          if (alt != null) return alt;
        }
      }
      return null;
    },
    [bindLabel, current]
  );
}

module.exports = { writeFixture, uploadAndExplore, persistResults, measureSignal, alternateOption };
