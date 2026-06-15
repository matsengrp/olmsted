// @ts-check
const path = require("path");
const { test, expect } = require("@playwright/test");

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

/**
 * Run the named Vega view's dataflow and return a named dataset's length.
 * @returns {Promise<number|null>} length, or null if the view isn't registered
 */
function viewDataLength(page, name, dataset) {
  return page.evaluate(
    async ([n, ds]) => {
      const view = window.__OLMSTED_VEGA_VIEWS__ && window.__OLMSTED_VEGA_VIEWS__.get(n);
      if (!view) return null;
      await view.runAsync();
      return view.data(ds).length;
    },
    [name, dataset]
  );
}

/** Read a top-level signal value from the named Vega view. */
function viewSignal(page, name, signal) {
  return page.evaluate(
    ([n, s]) => {
      const view = window.__OLMSTED_VEGA_VIEWS__ && window.__OLMSTED_VEGA_VIEWS__.get(n);
      return view ? view.signal(s) : null;
    },
    [name, signal]
  );
}

/** Wait until the named view is registered and has data in `dataset`. */
async function waitForViewData(page, name, dataset) {
  await page.waitForFunction(
    ([n, ds]) => {
      const view = window.__OLMSTED_VEGA_VIEWS__ && window.__OLMSTED_VEGA_VIEWS__.get(n);
      return !!(view && view.data(ds) && view.data(ds).length > 0);
    },
    [name, dataset],
    { timeout: 30000 }
  );
}

/** Parse the "Showing N families" footer in the clonal families table. */
async function tableFamilyCount(page) {
  const text = await page
    .getByText(/Showing \d+ families/)
    .first()
    .textContent();
  const match = /Showing (\d+) families/.exec(text || "");
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Walk the scatterplot's Vega scene graph and return, in SVG-relative
 * coordinates, the data-symbol centroids and the bounds of the "cell" group
 * (the plot area). Legend/axis/title marks are excluded so only true data
 * points are returned. Used to drive a real brush gesture over a known subset.
 *
 * @returns {Promise<{points: {x:number,y:number}[], cell: {x,y,w,h}|null}>}
 */
function scatterPlotGeometry(page, name) {
  return page.evaluate((n) => {
    const view = window.__OLMSTED_VEGA_VIEWS__ && window.__OLMSTED_VEGA_VIEWS__.get(n);
    if (!view) return { points: [], cell: null };
    const points = [];
    let cell = null;
    // A "mark" has .marktype and .items (its instances). A group instance's
    // .items are its child marks. Accumulate group-origin offsets so coords
    // come out relative to the SVG origin.
    const isChrome = (mark) => mark.role && /legend|axis|title/.test(mark.role);
    const walk = (mark, ox, oy) => {
      if (isChrome(mark)) return;
      const instances = mark.items || [];
      if (mark.marktype === "symbol") {
        for (const inst of instances) points.push({ x: ox + inst.x, y: oy + inst.y });
      } else if (mark.marktype === "group") {
        for (const inst of instances) {
          const gx = ox + (inst.x || 0);
          const gy = oy + (inst.y || 0);
          if (mark.name === "cell" && !cell) cell = { x: gx, y: gy, w: inst.width, h: inst.height };
          for (const childMark of inst.items || []) walk(childMark, gx, gy);
        }
      }
    };
    walk(view.scenegraph().root, 0, 0);
    return { points, cell };
  }, name);
}

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
  const rootCount = await page.evaluate(
    ([rootType]) => {
      const view = window.__OLMSTED_VEGA_VIEWS__.get("tree");
      return view.data("nodes").filter((n) => n.type === rootType).length;
    },
    [ROOT_NODE_TYPE]
  );
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
  await page.waitForFunction(
    (prev) => {
      const view = window.__OLMSTED_VEGA_VIEWS__.get("tree");
      return view && view.data("nodes").length > 0 && view.data("nodes").length < prev;
    },
    fullTreeNodeCount,
    { timeout: 15000 }
  );
  const focusedNodeCount = await viewDataLength(page, "tree", "nodes");
  expect(focusedNodeCount).toBeLessThan(fullTreeNodeCount);

  // No errors logged during the remount.
  expect(consoleErrors.slice(errorsBeforeFocus)).toEqual([]);

  // Reset to the full tree.
  await page.getByRole("button", { name: /Full Tree/ }).click();
  await page.waitForFunction(
    (target) => {
      const view = window.__OLMSTED_VEGA_VIEWS__.get("tree");
      return view && view.data("nodes").length === target;
    },
    fullTreeNodeCount,
    { timeout: 15000 }
  );

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
  await page.waitForFunction(
    (total) => {
      const el = Array.from(document.querySelectorAll("span")).find((s) => /Showing \d+ families/.test(s.textContent));
      if (!el) return false;
      const n = parseInt(/Showing (\d+) families/.exec(el.textContent)[1], 10);
      return n > 0 && n < total;
    },
    totalFamilies,
    { timeout: 15000 }
  );
  const brushedCount = await tableFamilyCount(page);
  expect(brushedCount).toBeGreaterThan(0);
  expect(brushedCount).toBeLessThan(totalFamilies);
});
