// @ts-check
/**
 * Shared helpers for Olmsted Playwright e2e tests.
 *
 * All Vega assertions read live View state through the dev-only registry
 * `window.__OLMSTED_VEGA_VIEWS__` (see src/components/util/VegaChart.js
 * registerViewForTests), never canvas pixels. Every view helper takes
 * `(page, name, ...)` where `name` is the registry key from VegaChart's
 * `name` prop (e.g. "scatterplot", "tree", "tree-heavy").
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

/**
 * Read a top-level signal value from the named Vega view.
 * @returns {Promise<*|null>} the signal value, or null if the view isn't registered
 */
function viewSignal(page, name, signal) {
  return page.evaluate(
    ([n, s]) => {
      const view = window.__OLMSTED_VEGA_VIEWS__ && window.__OLMSTED_VEGA_VIEWS__.get(n);
      return view ? view.signal(s) : null;
    },
    [name, signal]
  );
}

/**
 * Wait until the named view is registered and has data in `dataset`.
 * @returns {Promise<void>}
 */
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
 * Wait until the named view's `dataset` has exactly `count` rows.
 * @returns {Promise<void>}
 */
async function waitForViewDataLength(page, name, dataset, count, timeout = 15000) {
  await page.waitForFunction(
    ([n, ds, target]) => {
      const view = window.__OLMSTED_VEGA_VIEWS__ && window.__OLMSTED_VEGA_VIEWS__.get(n);
      return !!(view && view.data(ds) && view.data(ds).length === target);
    },
    [name, dataset, count],
    { timeout }
  );
}

/**
 * Wait until the named view's `dataset` is non-empty but has fewer than `max` rows.
 * @returns {Promise<void>}
 */
async function waitForViewDataLengthBelow(page, name, dataset, max, timeout = 15000) {
  await page.waitForFunction(
    ([n, ds, limit]) => {
      const view = window.__OLMSTED_VEGA_VIEWS__ && window.__OLMSTED_VEGA_VIEWS__.get(n);
      if (!view || !view.data(ds)) return false;
      const len = view.data(ds).length;
      return len > 0 && len < limit;
    },
    [name, dataset, max],
    { timeout }
  );
}

/**
 * Count nodes of a given `type` in the named tree view's "nodes" dataset.
 * Used to assert single-rootedness (exactly one "root" node).
 * @returns {Promise<number>} the count, or -1 if the view isn't registered
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

/**
 * Parse the "Showing N families" footer in the clonal families table.
 * @returns {Promise<number|null>} the count, or null if the footer is absent
 */
async function tableFamilyCount(page) {
  const text = await page
    .getByText(/Showing \d+ families/)
    .first()
    .textContent();
  const match = /Showing (\d+) families/.exec(text || "");
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Walk a scatterplot view's Vega scene graph and return, in SVG-relative
 * coordinates, the data-symbol centroids and the bounds of the "cell" group
 * (the plot area). Legend/axis/title marks are excluded so only true data
 * points are returned. Used to drive a real brush gesture over a known subset.
 *
 * @returns {Promise<{points: {x:number,y:number}[], cell: {x:number,y:number,w:number,h:number}|null}>}
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

module.exports = {
  viewDataLength,
  viewSignal,
  waitForViewData,
  waitForViewDataLength,
  waitForViewDataLengthBelow,
  nodeTypeCount,
  tableFamilyCount,
  scatterPlotGeometry
};
