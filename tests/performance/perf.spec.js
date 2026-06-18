// @ts-check
const { test, expect } = require("@playwright/test");
const { viewDataLength, waitForViewData } = require("../e2e/helpers");
const { makeDataset } = require("./makeDataset");

/**
 * Browser-level performance test (issue #317).
 *
 * Generates a large synthetic consolidated dataset in-process, uploads it
 * through the real browser path, and records wall-clock timings for the stages
 * that actually hurt in Olmsted: dataset ingest (JSON parse + IndexedDB write),
 * scatterplot interactivity, and tree render. Measurement uses the dev-only
 * Vega View registry (`window.__OLMSTED_VEGA_VIEWS__`) as the readiness probe —
 * the same seam the e2e tests use, no production instrumentation.
 *
 * Report-only: timings are printed, attached to the report, and written to
 * test-results/perf-results.json. Assertions confirm the dataset was fully
 * exercised (all families ingested, a tree rendered) — there are NO timing
 * thresholds, since shared CI runners are too noisy for absolute gates.
 *
 * Size: PERF_FAMILIES env var (default 500). Bump it locally for stress runs.
 */

const NUM_FAMILIES = Number(process.env.PERF_FAMILIES) || 500;

// Generous: a large ingest + render on a cold dev server.
test.setTimeout(240 * 1000);

test(`perf: ingest -> scatterplot -> tree render (${NUM_FAMILIES} families)`, async ({ page }, testInfo) => {
  const consoleErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("pageerror", (err) => consoleErrors.push(String(err)));

  const { dataset, datasetName } = makeDataset(NUM_FAMILIES);

  // Write the fixture to a temp file (done BEFORE the t0 mark so generation and
  // disk I/O don't count toward ingest). A path also sidesteps Playwright's
  // 50 MB in-memory buffer cap, which large datasets exceed.
  const fs = require("fs");
  const path = require("path");
  const fixturePath = testInfo.outputPath(`${datasetName}.json`);
  fs.writeFileSync(fixturePath, JSON.stringify(dataset));
  const datasetBytes = fs.statSync(fixturePath).size;

  await page.goto("/");

  // --- Ingest: upload -> dataset processed and listed -------------------
  const t0 = Date.now();
  await page.locator('[data-testid="splash-file-input"]').setInputFiles(fixturePath);
  await expect(page.getByText(datasetName, { exact: false }).first()).toBeVisible({ timeout: 120000 });
  const ingestMs = Date.now() - t0;

  // --- Scatterplot interactive: Explore -> view has all families --------
  await page.getByText(datasetName, { exact: false }).first().click();
  const tExplore = Date.now();
  await page.getByRole("button", { name: /Explore!/ }).click();
  await expect
    .poll(async () => (await viewDataLength(page, "scatterplot", "source")) ?? -1, { timeout: 120000 })
    .toBe(NUM_FAMILIES);
  const scatterplotMs = Date.now() - tExplore;

  // --- Tree render: open a family -> tree nodes populated ----------------
  // The families table is virtualized + sorted, so a specific clone_id may not
  // be in the DOM; click whichever family is the first rendered row. All perf
  // clones are single-chain, so this renders through the `name="tree"` path.
  const tFamily = Date.now();
  await page.locator('[data-testid="family-row"]').first().click();
  await waitForViewData(page, "tree", "nodes");
  const treeRenderMs = Date.now() - tFamily;
  const treeNodeCount = await viewDataLength(page, "tree", "nodes");

  // --- Report (no thresholds) -------------------------------------------
  const results = {
    numFamilies: NUM_FAMILIES,
    datasetBytes,
    datasetMB: Number((datasetBytes / (1024 * 1024)).toFixed(2)),
    ingestMs,
    scatterplotMs,
    treeRenderMs,
    treeNodeCount,
    ci: !!process.env.CI
  };

  // eslint-disable-next-line no-console
  console.table(results);
  await testInfo.attach("perf-results", {
    body: JSON.stringify(results, null, 2),
    contentType: "application/json"
  });
  fs.mkdirSync("test-results", { recursive: true });
  fs.writeFileSync(path.join("test-results", "perf-results.json"), JSON.stringify(results, null, 2));

  // Sanity only: the run actually exercised the full dataset and rendered a tree.
  expect(results.numFamilies).toBe(NUM_FAMILIES);
  expect(treeNodeCount).toBeGreaterThan(1);
  expect(consoleErrors).toEqual([]);
});
