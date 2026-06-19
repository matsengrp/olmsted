// @ts-check
const { test, expect } = require("@playwright/test");
const { viewDataLength, viewSignal, waitForViewData, tableFamilyCount, scatterPlotGeometry } = require("../e2e/helpers");
const { uploadAndExplore, persistResults, measureSignal, alternateOption } = require("./perf-helpers");
const { makeDataset } = require("./makeDataset");

/**
 * Interaction performance test (issue #317).
 *
 * Load timings (perf.spec.js) cover ingest + first render. This covers the
 * laggy-feeling part: interacting with an already-loaded plot. Each interaction
 * sets the relevant Vega signal and measures `view.runAsync()` IN THE BROWSER
 * (performance.now), isolating Vega's recompute+render cost — the actual lag —
 * with no Playwright/event-handler noise. (Brush is the exception: a real drag,
 * since it's fundamentally a gesture.)
 *
 * Two tests, each sized for its dimension:
 *   - scatterplot: many families (points) — settings, zoom, brush.
 *   - tree:        few families but a big tree (nodes) — settings.
 *
 * Report-only: timings print, attach to the report, and write
 * test-results/interaction-{scatterplot,tree}.json. No thresholds.
 */

const SCATTER_FAMILIES = Number(process.env.PERF_FAMILIES) || 2000;
const TREE_NODES = Number(process.env.PERF_NODES_PER_TREE) || 2000;
const TREE_FAMILIES = 20;

test.setTimeout(240 * 1000);

/** Collect uncaught errors and console errors, matching perf.spec.js. */
function collectErrors(page) {
  const errors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (err) => errors.push(String(err)));
  return errors;
}

test(`interactions: scatterplot — ${SCATTER_FAMILIES} families`, async ({ page }, testInfo) => {
  const errors = collectErrors(page);

  await uploadAndExplore(page, testInfo, makeDataset(SCATTER_FAMILIES));
  await expect
    .poll(async () => (await viewDataLength(page, "scatterplot", "source")) ?? -1, { timeout: 120000 })
    .toBe(SCATTER_FAMILIES);

  const xField = await viewSignal(page, "scatterplot", "xField");
  const yField = await viewSignal(page, "scatterplot", "yField");
  const zoomLevel = await viewSignal(page, "scatterplot", "zoom_level");

  // Alternates that exist regardless of fields: swapping x/y is always a valid
  // distinct change. colorBy/facet default to "<none>"; record null (not a
  // no-op identity set) if no other option is available.
  const altColor = await alternateOption(page, "Color by", "<none>");
  const altFacet = await alternateOption(page, "Facet by", "<none>");

  const results = {
    families: SCATTER_FAMILIES,
    changeXFieldMs: await measureSignal(page, "scatterplot", "xField", (await alternateOption(page, "X variable", xField)) || yField),
    changeYFieldMs: await measureSignal(page, "scatterplot", "yField", (await alternateOption(page, "Y variable", yField)) || xField),
    colorByMs: altColor ? await measureSignal(page, "scatterplot", "colorBy", altColor) : null,
    facetMs: altFacet ? await measureSignal(page, "scatterplot", "facet_col_signal", altFacet) : null,
    zoomMs: await measureSignal(page, "scatterplot", "zoom_level", (Number(zoomLevel) || 1) * 2),
    brushMs: null
  };

  // Brush: a real drag (gesture), measured from release to the table settling.
  const { points, cell } = await scatterPlotGeometry(page, "scatterplot");
  if (cell && points.length >= 2) {
    const plot = page.locator("svg.marks").first();
    await plot.scrollIntoViewIfNeeded();
    const box = await plot.boundingBox();
    const total = await tableFamilyCount(page);
    await page.mouse.move(box.x + cell.x + cell.w - 10, box.y + cell.y + cell.h - 15);
    await page.mouse.down();
    await page.mouse.move(box.x + cell.x + 2, box.y + cell.y + 2, { steps: 12 });
    const tBrush = Date.now();
    await page.mouse.up();
    await expect.poll(async () => (await tableFamilyCount(page)) ?? total, { timeout: 30000 }).toBeLessThan(total);
    results.brushMs = Date.now() - tBrush;
  }

  /* eslint-disable-next-line no-console */
  console.log("interaction-scatterplot:");
  /* eslint-disable-next-line no-console */
  console.table(results);
  await persistResults(testInfo, "interaction-scatterplot", results);
  expect(errors).toEqual([]);
});

test(`interactions: tree — ${TREE_FAMILIES} families × ${TREE_NODES}-node trees`, async ({ page }, testInfo) => {
  const errors = collectErrors(page);

  await uploadAndExplore(page, testInfo, makeDataset(TREE_FAMILIES, { nodesPerTree: TREE_NODES }));
  await expect
    .poll(async () => (await viewDataLength(page, "scatterplot", "source")) ?? -1, { timeout: 120000 })
    .toBe(TREE_FAMILIES);
  await page.locator('[data-testid="family-row"]').first().click();
  await waitForViewData(page, "tree", "tree");
  const treeNodeCount = await viewDataLength(page, "tree", "tree");

  // NOTE: tree zoom/pan is a wheel-driven signal scoped INSIDE the tree group,
  // not a top-level signal, so it can't be set via the View API (issue #320).
  // The settings below are top-level bound signals; fixed_branch_lengths and
  // show_alignment are heavy re-layout/re-render, exercising tree-render cost.
  const branchColor = await viewSignal(page, "tree", "branch_color_by");
  const showLabels = await viewSignal(page, "tree", "show_labels");
  const showAlignment = await viewSignal(page, "tree", "show_alignment");
  const fixedBranch = await viewSignal(page, "tree", "fixed_branch_lengths");
  const altBranchColor = await alternateOption(page, "Branch color by", branchColor);

  const results = {
    treeNodeCount,
    branchColorByMs: altBranchColor ? await measureSignal(page, "tree", "branch_color_by", altBranchColor) : null,
    fixedBranchLengthsMs: await measureSignal(page, "tree", "fixed_branch_lengths", !fixedBranch),
    showAlignmentMs: await measureSignal(page, "tree", "show_alignment", !showAlignment),
    showLabelsMs: await measureSignal(page, "tree", "show_labels", !showLabels)
  };

  /* eslint-disable-next-line no-console */
  console.log("interaction-tree:");
  /* eslint-disable-next-line no-console */
  console.table(results);
  await persistResults(testInfo, "interaction-tree", results);
  expect(errors).toEqual([]);
});
