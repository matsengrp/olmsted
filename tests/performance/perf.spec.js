// @ts-check
const { test, expect } = require("@playwright/test");
const { viewDataLength, waitForViewData } = require("../e2e/helpers");
const { makeDataset } = require("./makeDataset");

/**
 * Browser-level performance test (issue #317).
 *
 * Generates a large synthetic consolidated dataset in-process, uploads it
 * through the real browser path, and records wall-clock timings split into two
 * groups, because they matter very differently:
 *
 *   WRITE (one-time): ingest — upload -> processing -> IndexedDB bulkPut. Paid
 *     once when a dataset is first loaded; slow at scale but not the hot path.
 *   READ (per-view, the actual workflow): loading a dataset into the scatterplot
 *     via splash "Explore!" (reads clone metadata from IndexedDB), re-reading a
 *     dataset in-app via "Update Visualization" (the recurring read), and opening
 *     a family (reads one tree). This is what a user feels while inspecting, so
 *     it's reported separately.
 *
 * Measurement uses the dev-only Vega View registry (`window.__OLMSTED_VEGA_VIEWS__`)
 * as the readiness probe — the same seam the e2e tests use, no production
 * instrumentation.
 *
 * Report-only: timings are printed, attached to the report, and written to
 * test-results/perf-results.json. Assertions confirm the dataset was fully
 * exercised (all families ingested, a tree rendered) — there are NO timing
 * thresholds, since shared CI runners are too noisy for absolute gates.
 *
 * Size: PERF_FAMILIES env var (default 500). Bump it locally for stress runs.
 */

const NUM_FAMILIES = Number(process.env.PERF_FAMILIES) || 500;
// Optional: grow every tree to ~N nodes to stress tree render (template trees
// are small, 4–30 nodes). For tree-size experiments pair a small PERF_FAMILIES
// with a large PERF_NODES_PER_TREE.
const NODES_PER_TREE = Number(process.env.PERF_NODES_PER_TREE) || 0;

// Generous: a large ingest + render on a cold dev server.
test.setTimeout(240 * 1000);

test(`perf: write (ingest) + read (scatterplot, tree) — ${NUM_FAMILIES} families`, async ({ page }, testInfo) => {
  const consoleErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("pageerror", (err) => consoleErrors.push(String(err)));

  const { dataset, datasetName } = makeDataset(NUM_FAMILIES, { nodesPerTree: NODES_PER_TREE || undefined });

  // Write the fixture to a temp file (done BEFORE the t0 mark so generation and
  // disk I/O don't count toward ingest). A path also sidesteps Playwright's
  // 50 MB in-memory buffer cap, which large datasets exceed.
  const fs = require("fs");
  const path = require("path");
  const fixturePath = testInfo.outputPath(`${datasetName}.json`);
  fs.writeFileSync(fixturePath, JSON.stringify(dataset));
  const datasetBytes = fs.statSync(fixturePath).size;

  await page.goto("/");

  // ============================ WRITE (one-time) ========================
  // Ingest: upload -> processing -> IndexedDB bulkPut of clones + trees,
  // until the dataset appears in the management table.
  const tIngest = Date.now();
  await page.locator('[data-testid="splash-file-input"]').setInputFiles(fixturePath);
  await expect(page.getByText(datasetName, { exact: false }).first()).toBeVisible({ timeout: 120000 });
  const ingestMs = Date.now() - tIngest;

  // ============================ READ (per-view) =========================
  // Dataset load: Explore -> scatterplot interactive. Reads all clone metadata
  // for the dataset back from IndexedDB and renders the scatterplot.
  await page.getByText(datasetName, { exact: false }).first().click();
  const tScatter = Date.now();
  await page.getByRole("button", { name: /Explore!/ }).click();
  await expect
    .poll(async () => (await viewDataLength(page, "scatterplot", "source")) ?? -1, { timeout: 120000 })
    .toBe(NUM_FAMILIES);
  const scatterplotLoadMs = Date.now() - tScatter;

  // Tree read: open a family -> tree nodes populated. Reads one tree from
  // IndexedDB and renders it. The families table is virtualized + sorted, so a
  // specific clone_id may not be in the DOM; click the first rendered row. All
  // perf clones are single-chain, so this renders through the `name="tree"` path.
  const tTree = Date.now();
  await page.locator('[data-testid="family-row"]').first().click();
  // The "tree" dataset is the full stratified tree (all nodes); the "nodes"
  // dataset is filtered to internal+root only, so use "tree" for the true size.
  await waitForViewData(page, "tree", "tree");
  const treeReadMs = Date.now() - tTree;
  const treeNodeCount = await viewDataLength(page, "tree", "tree");

  // Update Visualization re-read: the recurring in-session read (distinct from
  // the splash "Explore!" first-load). In the in-app DatasetLoadingTable,
  // unload the dataset then reselect + reload it; "Update Visualization"
  // (handleBatchUpdate) re-runs getClientClonalFamilies — the same IndexedDB
  // clone read, via the in-app path. Dataset rows expose role=button with
  // aria-label "Select row ..."; toggling one creates the pending change that
  // enables the Update button. (handleBatchUpdate only re-reads datasets that
  // aren't already loaded, so a genuine re-read requires the unload first.)
  const datasetRow = page.getByRole("button", { name: /^Select row/ }).first();
  const updateBtn = page.getByRole("button", { name: /Update Visualization/ });

  await datasetRow.click(); // deselect -> pending unload
  await updateBtn.click(); // apply: unload (scatterplot unmounts)
  await expect(page.getByRole("button", { name: /Up-to-Date/ })).toBeVisible({ timeout: 30000 });

  await datasetRow.click(); // reselect -> pending load
  // Drop the now-stale (unmounted) scatterplot view so the poll below waits for
  // the reload's fresh registration, not the old view's cached data.
  await page.evaluate(() => window.__OLMSTED_VEGA_VIEWS__ && window.__OLMSTED_VEGA_VIEWS__.delete("scatterplot"));
  const tUpdate = Date.now();
  await updateBtn.click(); // apply: reload -> re-read clones
  await expect
    .poll(async () => (await viewDataLength(page, "scatterplot", "source")) ?? -1, { timeout: 120000 })
    .toBe(NUM_FAMILIES);
  const updateVizReadMs = Date.now() - tUpdate;

  // --- Report (no thresholds) -------------------------------------------
  const results = {
    numFamilies: NUM_FAMILIES,
    nodesPerTree: NODES_PER_TREE || "template",
    treeNodeCount,
    datasetMB: Number((datasetBytes / (1024 * 1024)).toFixed(2)),
    write: { ingestMs },
    read: { scatterplotLoadMs, treeReadMs, updateVizReadMs },
    ci: !!process.env.CI
  };

  /* eslint-disable no-console */
  console.log(
    `\nperf: ${results.numFamilies} families, ${results.datasetMB} MB, ` +
      `tree ≈ ${results.nodesPerTree} nodes (rendered ${treeNodeCount})`
  );
  console.log("WRITE (one-time ingest):");
  console.table(results.write);
  console.log("READ (per-view — the interactive workflow):");
  console.table(results.read);
  /* eslint-enable no-console */

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
