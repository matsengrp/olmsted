// @ts-check
/**
 * Shared helpers for Olmsted Playwright e2e tests.
 *
 * All Vega assertions read live View state through the dev-only registry
 * `window.__OLMSTED_VEGA_VIEWS__` (see src/components/util/VegaChart.js
 * registerViewForTests), never canvas pixels.
 */

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
async function waitForViewData(page, name, dataset, timeout = 30000) {
  await page.waitForFunction(
    ([n, ds]) => {
      const view = window.__OLMSTED_VEGA_VIEWS__ && window.__OLMSTED_VEGA_VIEWS__.get(n);
      return !!(view && view.data(ds) && view.data(ds).length > 0);
    },
    [name, dataset],
    { timeout }
  );
}

/**
 * Count nodes of a given `type` in the named tree view's "nodes" dataset.
 * Used to assert single-rootedness (exactly one "root" node).
 * @returns {Promise<number>}
 */
function nodeTypeCount(page, name, nodeType) {
  return page.evaluate(
    ([n, t]) => {
      const view = window.__OLMSTED_VEGA_VIEWS__ && window.__OLMSTED_VEGA_VIEWS__.get(n);
      if (!view) return -1;
      return view.data("nodes").filter((node) => node.type === t).length;
    },
    [name, nodeType]
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

module.exports = {
  viewDataLength,
  viewSignal,
  waitForViewData,
  nodeTypeCount,
  tableFamilyCount
};
