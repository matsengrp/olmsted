// @ts-check
const path = require("path");
const { test, expect } = require("@playwright/test");
const { viewDataLength, waitForViewData, nodeTypeCount } = require("./helpers");

/**
 * End-to-end test for the paired heavy/light chain tree path (issue #287).
 *
 * The smoke test only covers an unpaired family (single-chain `name="tree"`
 * VegaChart). This exercises the stacked heavy/light view: selecting a paired
 * family, switching the chain selector to "Both chains (stacked)", and
 * asserting both the `tree-heavy` and `tree-light` Vega views render with data.
 *
 * Mechanics worth recording (see src/components/explorer/tree.js):
 * - A paired clone carries `is_paired: true` and a `pair_id`; selecting it
 *   (src/actions/explorer.js selectFamily) auto-loads BOTH the heavy and light
 *   trees into the cache and sets the chain to whichever locus was clicked.
 * - Default chain is "heavy", which renders through the single `name="tree"`
 *   path. The stacked path (`tree-heavy` + `tree-light`) only mounts once the
 *   chain selector is set to "both-stacked" (isStackedMode).
 *
 * Fixture: tests/e2e/fixtures/pcp-paired-olmsted-golden.json — 1 dataset
 * (`pcp-paired-example`), 8 families = 16 single-rooted clones, every family a
 * heavy/light pair. See the fixtures README for provenance.
 */

const FIXTURE = path.join(__dirname, "fixtures", "pcp-paired-olmsted-golden.json");
const DATASET_NAME = "pcp-paired-example";
// A heavy-chain clone (locus igh) from one pair. Clicking it sets chain="heavy"
// and loads its light partner (`...-light`, same pair_id) into the cache.
const HEAVY_FAMILY_ID = "d2_269773-igl-103817-heavy";

const ROOT_NODE_TYPE = "root"; // NODE_TYPES.ROOT, src/constants/nodeTypes.js
const BOTH_STACKED = "both-stacked"; // CHAIN_TYPES.BOTH_STACKED, src/constants/chainTypes.js

// Cold-start (babel-node + first webpack compile) plus several async Vega
// dataflow updates and an on-demand paired-tree load.
test.setTimeout(120 * 1000);

test("paired: select family -> both-stacked -> heavy & light trees render", async ({ page }) => {
  const consoleErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("pageerror", (err) => consoleErrors.push(String(err)));

  // --- 1. Upload the paired fixture and enter the App view ---------------
  await page.goto("/");
  await page.locator('[data-testid="splash-file-input"]').setInputFiles(FIXTURE);

  const datasetRow = page.getByText(DATASET_NAME, { exact: false }).first();
  await expect(datasetRow).toBeVisible({ timeout: 15000 });
  await datasetRow.click();
  await page.getByRole("button", { name: /Explore!/ }).click();

  // Scatterplot mounts with families (same regression guard as the smoke test).
  await expect
    .poll(async () => (await viewDataLength(page, "scatterplot", "source")) ?? -1, {
      message: "scatterplot 'source' data never became non-empty (no paired families loaded?)",
      timeout: 30000
    })
    .toBeGreaterThan(0);

  // --- 2. Open a heavy-chain paired family -> single tree renders --------
  // Selecting a heavy clone defaults the chain to "heavy", so it first renders
  // through the single-chain `name="tree"` path.
  await page.getByText(HEAVY_FAMILY_ID, { exact: true }).first().click();
  await waitForViewData(page, "tree", "nodes");

  // Confirm the chain selector is present (only shown for paired families).
  const chainSelect = page.locator("#chain-select");
  await expect(chainSelect).toBeVisible();

  // --- 3. Switch to "Both chains (stacked)" -> heavy & light both render --
  const errorsBeforeSwitch = consoleErrors.length;
  await chainSelect.selectOption(BOTH_STACKED);

  // The stacked header confirms the both-chains layout mounted.
  await expect(page.getByText(/Heavy Chain \(above\) \/ Light Chain \(below\)/)).toBeVisible({ timeout: 15000 });

  // Both views register and populate from the cache (light tree was preloaded
  // when the family was selected).
  await waitForViewData(page, "tree-heavy", "nodes");
  await waitForViewData(page, "tree-light", "nodes");

  const heavyNodes = await viewDataLength(page, "tree-heavy", "nodes");
  const lightNodes = await viewDataLength(page, "tree-light", "nodes");
  expect(heavyNodes).toBeGreaterThan(1);
  expect(lightNodes).toBeGreaterThan(1);

  // Each chain's tree is independently single-rooted (no synthetic-root path).
  expect(await nodeTypeCount(page, "tree-heavy", ROOT_NODE_TYPE)).toBe(1);
  expect(await nodeTypeCount(page, "tree-light", ROOT_NODE_TYPE)).toBe(1);

  // Both chains' node-level "tree" datasets are populated.
  const heavyTreeLen = await viewDataLength(page, "tree-heavy", "tree");
  const lightTreeLen = await viewDataLength(page, "tree-light", "tree");
  expect(heavyTreeLen).toBeGreaterThan(0);
  expect(lightTreeLen).toBeGreaterThan(0);

  // No errors logged while mounting the stacked heavy/light views.
  expect(consoleErrors.slice(errorsBeforeSwitch)).toEqual([]);
});
