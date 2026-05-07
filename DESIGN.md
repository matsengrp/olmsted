# Olmsted Design

Load-bearing architectural decisions for the Olmsted web application.
Where [ARCHITECTURE.md](./ARCHITECTURE.md) describes *what the system is* and
[DEVELOPMENT.md](./DEVELOPMENT.md) describes *how to work in it*, this
document describes *what we will not change without justification*.

These decisions are guardrails. A proposed feature or PR that conflicts
with one should either justify the exception in the PR body or be revised.
ARCHITECTURE.md is the place to look up *how* a decision is implemented;
this document only states the decision and why future work should respect it.

---

## D1. Client-Side Only

The deployed application performs no server-side data processing. The
public instance at olmstedviz.org is static files on S3 + CloudFront; the
Docker image is for self-hosted convenience and serves the same client
bundle. Uploaded data lives in the user's browser (IndexedDB) and is
never transmitted.

This is a privacy and operational simplicity guarantee. Do not add
features that require a backend round-trip for the deployed app. If a
new analysis genuinely needs server compute, it belongs upstream in
[olmsted-cli](https://github.com/matsengrp/olmsted-cli), not in this
repository.

The `npm run start:local` server mode is a development convenience that
reads the *split format* from a local directory; it is not a deployment
target.

## D2. Redux Store as Single Source of Truth, URL as Mirror

Application state lives in Redux. The browser URL mirrors a defined
subset of that state via `changeURLMiddleware`
(`src/middleware/changeURL.js`), enabling deep linking and browser
navigation. The URL is downstream of Redux, never the other way around.

New persistent UI state (selections, filters, view options) goes through
a reducer. Don't store it in component state if it should survive
navigation, and don't read it from the URL outside the middleware.

## D3. Vega Specs Behind a Single Wrapper

All charts are Vega 6 specs rendered through `VegaChart`
(`src/components/util/VegaChart.js`). `VegaChart` owns the
react-vega v8 boundary: data merging at embed time, post-embed updates
via `view.change()` (preserves zoom/pan/brush), and signal listener
registration via `view.addSignalListener()`.

Do not import `react-vega` directly in feature code, and do not bypass
`VegaChart` to call `view.change()` from a component. The wrapper exists
because react-vega v8 removed the v4 API the codebase was built against;
the indirection is what lets us upgrade Vega without rewriting every
chart.

## D4. Persistence: IndexedDB via Dexie + LRU Memory Cache

Datasets persist in IndexedDB (`OlmstedClientStorage` database, managed
through Dexie in `src/utils/olmstedDB.js`). A 10-item LRU memory cache
(`src/utils/clientDataStore.js`) sits in front of IndexedDB for
recently-accessed clones and trees.

Do not invent a parallel storage path. Schema changes increment the
Dexie version and ship with a migration tested against an existing
database. Schema changes are also documented in the ARCHITECTURE.md
"IndexedDB Schema" section.

## D5. Lazy Loading by Default

Dataset metadata is loaded eagerly. Clone metadata is loaded when a
dataset is selected. Tree node data is loaded only when a specific
family is opened. This is what makes thousand-family datasets usable in
the browser.

Don't pre-load tree data "for responsiveness" or "to simplify the
component" — the user pays for that in tab memory and IndexedDB read
volume. New code that consumes tree data should request a single tree
through `getClientTree(...)` and tolerate the async boundary.

## D6. Field Metadata Drives the UI

Visualization controls (scatterplot axis dropdowns, color encodings,
tooltips, table columns) are populated from `field_metadata` shipped in
the Olmsted JSON, mediated by `src/utils/fieldMetadata.js` and the
defaults in `src/constants/fieldDefaults.js`. The `REQUIRED` sentinel
distinguishes mandatory fields (validation error at import) from
optional ones (defaulted at import).

Do not hardcode field names into Vega specs or components when those
fields are dataset-supplied. Adding a new field means registering it in
the field metadata pipeline, not adding another conditional branch in a
component.

## D7. Constants Module, Not Inline Literals

Categorical values that the UI compares against (chain types, loci,
node types, display labels, color scales) live in `src/constants/`.
Inline string literals like `"heavy"`, `"light"`, `"naive"`, `"leaf"`
in components and specs are the reason recent PRs have included
"constants sweep" cleanup work (see PR #280).

When you add a new categorical value, add it to the appropriate constants
file and import it. When you read one, import the constant rather than
hand-typing the string.

## D8. Forest Trees Become a Single Tree at the Selector Boundary

Some upstream pipelines produce forests (multiple disconnected
subtrees). The visualization assumes a single rooted tree. The
`ensureSingleRoot()` / `normalizeTreeNodes()` helpers in
`src/selectors/trees.js` reconcile these by removing empty placeholder
roots, or — for true forests — synthesizing a `__synthetic_root__` with
a consensus sequence. The transformation is recorded in
`data_modifications` and surfaced as a user-visible warning.

Tree-consuming code downstream of these selectors may assume a single
root. Forest reconciliation is not optional and is not the consumer's
responsibility; route new tree consumers through the existing
selectors rather than walking raw `nodes` arrays.

## D9. Olmsted JSON Is the Input Contract

The web app consumes Olmsted JSON only. Conversion from AIRR, PCP, or
other repertoire formats happens in
[olmsted-cli](https://github.com/matsengrp/olmsted-cli) and is out of
scope for this repository. The web app validates structure
(`metadata`, `datasets`, `clones`, `trees`) at import time and refuses
malformed input rather than coping silently.

When the input contract evolves, the change is coordinated with
olmsted-cli and the format documentation, and is reflected in the
CHANGELOG. Don't add ad-hoc fallbacks for "older" or "alternative" JSON
shapes — they accumulate forever.
