// @ts-check
const path = require("path");
const { test, expect } = require("@playwright/test");
const {
  viewDataLength,
  viewSignal,
  waitForViewData,
  waitForViewDataLength,
  waitForViewDataLengthBelow,
  nodeTypeCount,
  tableFamilyCount,
  scatterPlotGeometry
} = require("./helpers");

/**
 * End-to-end smoke test (issue #287, Phase 1).
 *
 * Exercises the full pipeline a human walks through in PRE-MERGE-CHECKLIST.md
 * step 5: upload -> scatterplot -> open a family -> subtree focus -> brush.
 * Assertions are on Vega View state (signals/data) via the dev-only registry
 * `window.__OLMSTED_VEGA_VIEWS__` (see VegaChart.js registerViewForTests),
 * never on canvas pixels. Visual regression is out of scope (Phase 2).
 *
 * Ordering note: this deviates from the issue's narrative order (brush is
 * done last, not before opening a family). A brush filters the family table,
 * which would hide the specific family we open by name; running it last keeps
 * each step independent. Coverage is identical.
 *
 * Fixture: tests/e2e/fixtures/pcp-byhand-olmsted-golden.json — 1 dataset,
 * 4 single-rooted clonal families, one of which is a heavy/light pair. See
 * the fixtures README for provenance.
 */

const FIXTURE = path.join(__dirname, "fixtures", "pcp-byhand-olmsted-golden.json");
const DATASET_NAME = "pcp-byhand-example";
// An unpaired family: renders through the single-chain tree path (VegaChart
// name="tree"), avoiding the paired heavy/light split.
const UNPAIRED_FAMILY_ID = "sample-A_family-heavy";

const ROOT_NODE_TYPE = "root"; // NODE_TYPES.ROOT, src/constants/nodeTypes.js

// Generous per-test budget: the dev server cold-starts via babel-node and the
// first webpack compile, then we drive several async Vega dataflow updates.
test.setTimeout(120 * 1000);

test("smoke: upload -> scatterplot -> family -> subtree focus -> brush", async ({ page }) => {
  const consoleErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("pageerror", (err) => consoleErrors.push(String(err)));

  // --- 1. Upload the fixture on the splash page ---------------------------
  await page.goto("/");
  await page.locator('[data-testid="splash-file-input"]').setInputFiles(FIXTURE);

  // The uploaded dataset appears as a row in the management table.
  const datasetRow = page.getByText(DATASET_NAME, { exact: false }).first();
  await expect(datasetRow).toBeVisible({ timeout: 15000 });

  // --- 2. Select the dataset (row click) and enter the App view ----------
  await datasetRow.click();
  await page.getByRole("button", { name: /Explore!/ }).click();

  // --- 3. Scatterplot mounts with the loaded families --------------------
  // Regression guard: if getAvailableClonalFamilies returns [], the scatterplot
  // never mounts, so its view never registers and viewDataLength returns null
  // (coalesced to -1). expect.poll surfaces a clear message instead of a bare
  // wait-for-view timeout.
  await expect
    .poll(async () => (await viewDataLength(page, "scatterplot", "source")) ?? -1, {
      message: "scatterplot 'source' data never became non-empty (getAvailableClonalFamilies returned no families?)",
      timeout: 30000
    })
    .toBeGreaterThan(0);

  const xField = await viewSignal(page, "scatterplot", "xField");
  const yField = await viewSignal(page, "scatterplot", "yField");
  expect(typeof xField).toBe("string");
  expect(xField.length).toBeGreaterThan(0);
  expect(typeof yField).toBe("string");
  expect(yField.length).toBeGreaterThan(0);

  const totalFamilies = await tableFamilyCount(page);
  expect(totalFamilies).toBeGreaterThan(0);

  // --- 4. Open a family -> tree renders ----------------------------------
  await page.getByText(UNPAIRED_FAMILY_ID, { exact: true }).first().click();
  await waitForViewData(page, "tree", "tree");

  const treeLen = await viewDataLength(page, "tree", "tree");
  expect(treeLen).toBeGreaterThan(0);

  // Exactly one root node (fixture is single-rooted; no synthetic-root path).
  const rootCount = await nodeTypeCount(page, "tree", ROOT_NODE_TYPE);
  expect(rootCount).toBe(1);

  const fullTreeNodeCount = await viewDataLength(page, "tree", "nodes");
  expect(fullTreeNodeCount).toBeGreaterThan(1);

  // --- 5. Subtree focus: shrink to a subtree, then restore ---------------
  const errorsBeforeFocus = consoleErrors.length;

  // Select a child node via the "Children of ..." dropdown in the subtree nav.
  const childSelect = page.locator("select").filter({ has: page.locator('option:has-text("Children of")') });
  await childSelect.first().selectOption({ index: 1 });

  await page.getByRole("button", { name: /Focus Subtree/ }).click();

  // The tree remounts (VegaChart key swap, DESIGN.md D8) with fewer nodes.
  await waitForViewDataLengthBelow(page, "tree", "nodes", fullTreeNodeCount);
  const focusedNodeCount = await viewDataLength(page, "tree", "nodes");
  expect(focusedNodeCount).toBeLessThan(fullTreeNodeCount);

  // No errors logged during the remount.
  expect(consoleErrors.slice(errorsBeforeFocus)).toEqual([]);

  // Reset to the full tree.
  await page.getByRole("button", { name: /Full Tree/ }).click();
  await waitForViewDataLength(page, "tree", "nodes", fullTreeNodeCount);

  // --- 6. Brush a subset of scatterplot points -> table narrows ----------
  // Real mouse-drag gesture: the table is driven by a Redux dispatch the
  // scatterplot fires from polling brush_x_field/brush_y_field on mouseUp,
  // so setting the brush signal directly would not update the table.
  const { points: symbols, cell } = await scatterPlotGeometry(page, "scatterplot");
  expect(symbols.length).toBeGreaterThanOrEqual(2);
  expect(cell).not.toBeNull();

  // Vega renders SVG (svg.marks). The scatterplot is the first chart on the
  // page; scroll it into view so the brush press point sits in the viewport.
  // Coordinates from scatterPlotGeometry are relative to this SVG's origin.
  const plot = page.locator("svg.marks").first();
  await plot.scrollIntoViewIfNeeded();
  const box = await plot.boundingBox();
  expect(box).not.toBeNull();

  // Split at the widest horizontal gap so the brush box provably encloses a
  // non-empty strict subset (the leftmost points), regardless of layout.
  symbols.sort((a, b) => a.x - b.x);
  let bestGap = -1;
  let splitIndex = 1;
  for (let i = 1; i < symbols.length; i++) {
    const gap = symbols[i].x - symbols[i - 1].x;
    if (gap > bestGap) {
      bestGap = gap;
      splitIndex = i;
    }
  }
  const splitX = (symbols[splitIndex - 1].x + symbols[splitIndex].x) / 2;

  // Press near the cell's bottom edge (visible below the sticky nav bar, on the
  // plot background and clear of symbols), then drag to the top-left corner.
  // The mousedown must land on the "cell" mark; its move/up events are
  // window-sourced and clamp to the cell, so the box spans the full plot height
  // and selects the points left of splitX.
  await page.mouse.move(box.x + splitX, box.y + cell.y + cell.h - 15);
  await page.mouse.down();
  await page.mouse.move(box.x + cell.x + 2, box.y + cell.y + 2, { steps: 12 });
  await page.mouse.up();

  // Table narrows to a strictly smaller, positive number of families.
  await expect
    .poll(async () => (await tableFamilyCount(page)) ?? totalFamilies, { timeout: 15000 })
    .toBeLessThan(totalFamilies);
  const brushedCount = await tableFamilyCount(page);
  expect(brushedCount).toBeGreaterThan(0);
  expect(brushedCount).toBeLessThan(totalFamilies);
});
