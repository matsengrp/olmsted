// @ts-check
const { test, expect } = require("@playwright/test");
const { viewDataLength, waitForViewData, tableFamilyCount, scatterPlotGeometry } = require("../e2e/helpers");
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
 *   - tree:        few families but a big tree (nodes) — zoom, settings.
 *
 * Report-only: timings print, attach to the report, and write
 * test-results/interaction-results.json. No thresholds.
 */

const SCATTER_FAMILIES = Number(process.env.PERF_FAMILIES) || 2000;
const TREE_NODES = Number(process.env.PERF_NODES_PER_TREE) || 2000;
const TREE_FAMILIES = 20;

test.setTimeout(240 * 1000);

/** Read a Vega signal value. */
function getSignal(page, view, signal) {
  return page.evaluate(
    ([n, s]) => {
      const v = window.__OLMSTED_VEGA_VIEWS__ && window.__OLMSTED_VEGA_VIEWS__.get(n);
      return v ? v.signal(s) : null;
    },
    [view, signal]
  );
}

/** Set a signal and measure the resulting runAsync (recompute+render) in ms, in-browser. */
function measureSignal(page, view, signal, value) {
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
    [view, signal, value]
  );
}

/**
 * Find a bound <select> by its Vega bind label (e.g. "X variable") and return
 * an option value different from `current`. Bindings render in the DOM even when
 * CSS-hidden, so this works regardless of control visibility.
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

async function uploadAndExplore(page, testInfo, ds) {
  const fixturePath = testInfo.outputPath(`${ds.datasetName}.json`);
  require("fs").writeFileSync(fixturePath, JSON.stringify(ds.dataset));
  await page.goto("/");
  await page.locator('[data-testid="splash-file-input"]').setInputFiles(fixturePath);
  await expect(page.getByText(ds.datasetName, { exact: false }).first()).toBeVisible({ timeout: 120000 });
  await page.getByText(ds.datasetName, { exact: false }).first().click();
  await page.getByRole("button", { name: /Explore!/ }).click();
}

async function report(testInfo, name, results) {
  /* eslint-disable no-console */
  console.log(`\n${name}:`);
  console.table(results);
  /* eslint-enable no-console */
  await testInfo.attach(name, { body: JSON.stringify(results, null, 2), contentType: "application/json" });
  const fs = require("fs");
  fs.mkdirSync("test-results", { recursive: true });
  fs.writeFileSync(`test-results/${name}.json`, JSON.stringify(results, null, 2));
}

test(`interactions: scatterplot — ${SCATTER_FAMILIES} families`, async ({ page }, testInfo) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));

  await uploadAndExplore(page, testInfo, makeDataset(SCATTER_FAMILIES));
  await expect.poll(async () => (await viewDataLength(page, "scatterplot", "source")) ?? -1, { timeout: 120000 }).toBe(
    SCATTER_FAMILIES
  );

  const xField = await getSignal(page, "scatterplot", "xField");
  const yField = await getSignal(page, "scatterplot", "yField");
  const zoomLevel = await getSignal(page, "scatterplot", "zoom_level");

  const results = {
    families: SCATTER_FAMILIES,
    changeXFieldMs: await measureSignal(page, "scatterplot", "xField", (await alternateOption(page, "X variable", xField)) || yField),
    changeYFieldMs: await measureSignal(page, "scatterplot", "yField", (await alternateOption(page, "Y variable", yField)) || xField),
    colorByMs: await measureSignal(page, "scatterplot", "colorBy", (await alternateOption(page, "Color by", "<none>")) || xField),
    facetMs: await measureSignal(page, "scatterplot", "facet_col_signal", (await alternateOption(page, "Facet by", "<none>")) || "<none>"),
    zoomMs: await measureSignal(page, "scatterplot", "zoom_level", (Number(zoomLevel) || 1) * 2)
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

  await report(testInfo, "interaction-scatterplot", results);
  expect(errors).toEqual([]);
});

test(`interactions: tree — ${TREE_FAMILIES} families × ${TREE_NODES}-node trees`, async ({ page }, testInfo) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));

  await uploadAndExplore(page, testInfo, makeDataset(TREE_FAMILIES, { nodesPerTree: TREE_NODES }));
  await expect.poll(async () => (await viewDataLength(page, "scatterplot", "source")) ?? -1, { timeout: 120000 }).toBe(
    TREE_FAMILIES
  );
  await page.locator('[data-testid="family-row"]').first().click();
  await waitForViewData(page, "tree", "tree");
  const treeNodeCount = await viewDataLength(page, "tree", "tree");

  // NOTE: tree zoom/pan is a wheel-driven signal scoped INSIDE the tree group,
  // not a top-level signal, so it can't be set via the View API (set-signal
  // approach). It needs a real-wheel-event measurement — deferred. The settings
  // below are top-level bound signals; fixed_branch_lengths and show_alignment
  // are heavy re-layout/re-render, so they exercise the same tree-render cost.
  const branchColor = await getSignal(page, "tree", "branch_color_by");
  const showLabels = await getSignal(page, "tree", "show_labels");
  const showAlignment = await getSignal(page, "tree", "show_alignment");
  const fixedBranch = await getSignal(page, "tree", "fixed_branch_lengths");

  const results = {
    treeNodeCount,
    branchColorByMs: await measureSignal(page, "tree", "branch_color_by", (await alternateOption(page, "Branch color by", branchColor)) || branchColor),
    fixedBranchLengthsMs: await measureSignal(page, "tree", "fixed_branch_lengths", !fixedBranch),
    showAlignmentMs: await measureSignal(page, "tree", "show_alignment", !showAlignment),
    showLabelsMs: await measureSignal(page, "tree", "show_labels", !showLabels)
  };

  await report(testInfo, "interaction-tree", results);
  expect(errors).toEqual([]);
});
