## version 2.7.6 - 2026/06/14
Added:
* Playwright end-to-end test infrastructure (#287). A happy-path smoke test (`tests/e2e/smoke.spec.js`) drives a real browser through upload → scatterplot → brush → table → tree → subtree-focus, asserting on live Vega View state. New `test:e2e` / `test:e2e:ui` scripts; CI runs it (with browser caching) before the Docker build, blocking the image push on failure.
* Dev-only Vega View registry: `VegaChart` gained a `name` prop that registers the View on `window.__OLMSTED_VEGA_VIEWS__` when `NODE_ENV !== "production"`, giving e2e tests access to the View API. Dead-code-eliminated from production bundles (zero shipped bytes).
* `PRE-MERGE-CHECKLIST.md` step 5 now allows skipping the manual browser walk-through for non-render PRs when `npm run test:e2e` passes. `DEVELOPMENT.md` documents the e2e workflow and the Jest-vs-Playwright test-location split.
* Additional e2e fixtures copied from olmsted-cli (`airr`, `pcp`, `pcp-paired`, and `merge` golden Olmsted JSONs) alongside the existing `pcp-byhand` fixture, covering the AIRR / PCP / paired / merge ingest paths.

Changed:
* Split `bin/` into `bin/` (operator-run scripts: AWS deploy/download/invalidate, Docker server launchers) and `scripts/` (build/tooling helpers run by npm and webpack: `build-datasets-manifest.js`, `setup-eslint-plugin.js`, `postbuild.sh`). The manual manifest command is now `node scripts/build-datasets-manifest.js <data-dir>` (was `bin/...`); call sites in `package.json`, `server.js`, and `webpack.config.prod.js` were updated accordingly.

## version 2.7.5 - 2026/05/22
Changed:
* Added `DESIGN.md` (load-bearing architectural decisions as guardrails) and `PRE-MERGE-CHECKLIST.md` (16-step quality gate for PRs). Slimmed the inline Pre-PR checklist in `CLAUDE.md` to a pointer at the new checklist.

## version 2.7.4 - 2026/05/22
Changed:
* Dependency bumps (supersedes dependabot PRs #275, #276, #284, #288, #289, #290, #295): uuid 13 → 14, webpack-dev-server 5.2.3 → 5.2.4, postcss 8.5.8 → 8.5.15, fast-uri 3.1.0 → 3.1.2, @xmldom/xmldom 0.8.12 → 0.8.13, ip-address 10.1.0 → 10.2.0, @babel/plugin-transform-modules-systemjs 7.29.0 → 7.29.4. All patch/minor except uuid (major, but uuid isn't imported anywhere in `src/` — the bump is effectively a lockfile-only change).

## version 2.7.3 - 2026/05/20
Changed:
* Removed the legacy auspice-shaped server dataset path (closes #293). Deleted `src/actions/loadData.js`, `src/util/parseParams.js`, `src/actions/recomputeReduxState.js`, the `/charon/*` Express route, `src/server/getFiles.js`, and the remote-mode S3 globals. Server-side datasets are now exclusively the consolidated olmsted-cli format ingested into IndexedDB on page load.
* Stripped dead Redux state: `s3bucket`, `datapath`, and the `PROCEED_SANS_MANIFEST` / `CLEAN_START` / `DATA_INVALID` action types. `changePage` now sets the new URL pathname directly from `action.path` instead of routing it through the auspice underscore-to-slash rewrite.
* `DATASET_SOURCE.SERVER_SPLIT` is gone; `sourceOf()` resolves to `UPLOAD` or `SERVER_CONSOLIDATED`. The `isDatasetInIndexedDB` branch in dataset loaders is unconditional now (all datasets live in IndexedDB).
* `bin/build-datasets-manifest.js` rewrites `datasets.json` from scratch on each run (no more preserved split-format entries). Dropped `bin/aws_explore.py` and `bin/snapshot_server_data.py`, both of which only made sense in the legacy flow.

## version 2.7.2 - 2026/04/22
Changed:
* Relabeled the tree dropdown from "Ancestral Reconstruction Method" to "Tree".
* `tree.type` → `tree.name`
* Blank fields now display as "<unspecified>"

## version 2.7.1 - 2026/04/21
Changed:
* Dependency bumps: @xmldom/xmldom 0.8.11 → 0.8.12, follow-redirects 1.15.11 → 1.16.0, lodash 4.17.23 → 4.18.1, lodash-es 4.17.23 → 4.18.1, electron 41.0.4 → 41.1.0 (closes several dependabot security advisories)
* Pruned stale Python deps from requirements.txt; only boto3 and pyyaml remain (drops ete3, jsonschema, attrs, lxml, numpy, scipy, botocore, ntpl — shrinks the Docker image and moots the lxml major-bump advisory)
* Repaired the long-broken `dist:electron` build pipeline: modernized `webpack.config.electron.js` (TerserPlugin in place of the removed UglifyJsPlugin; `target: "web"`), added the `version` field electron-builder requires, moved `express` to production dependencies, and fixed runtime regressions (Express 5 route syntax, `sendFile` asar path handling, Redux-based "Manage Datasets" navigation). `npm run dist:electron` now produces a working AppImage.
* Prefixed build-output folders with underscore to match the repo's `**/_*/` gitignore convention: `devel/` → `_devel/`, `releases/` → `_releases/`. `dist/` left as-is pending the eventual Electron removal.
* Reorganized `.gitignore` into tool-suite sub-headers; fixed silently-broken inline comments (gitignore doesn't honor them).
* Refreshed `DEVELOPMENT.md` build documentation: corrected stale path references, expanded the npm scripts table, added a Build Pipeline table mapping each webpack config to its script/output/purpose, and a short Electron status note.

## version 2.7.0 - 2026/04/20
Changed:
* Filters promoted to a top-level section with its own help panel and live "passed filter" banner (turns red when filters exclude everything)
* Section headers renamed: Clonal Families → Clonal Family Scatterplot, Selected Clonal Families → Clonal Family Selection Table, Clonal Family Details → Clonal Family Tree & Alignment
* Active Datasets panel listing loaded datasets above Available Data Fields
* Warning banner when a loaded dataset has no field_metadata (falls back to defaults)
* Union/Intersection toggle ("Show Only Shared Data Fields" / "Show All Data Fields") for the field listing when 2+ datasets are loaded
* Field display-mode legend updated to colored dots (🟢 dropdown, 🟡 tooltip, 🔴 skip)
* Update Visualization button reads "Visualization Up-to-Date" when no changes are pending; selections persist after update
* New Clear Selections button next to Update Visualization
* Clonal Family Tree & Alignment header split: family name, Chain, and Ancestral Reconstruction Method are now labeled fields below the title; Chain is always visible (pinned when unpaired); blank reconstruction methods render as `<unspecified>`
* New "Treat subtree as root" focus mode: regenerates the tree alignment using the subtree root's sequence as naive; cascades into Ancestral Sequences via a new computeLineageDataRelativeTo selector
* Bugfix: synthetic-root forest assembly demotes original roots to `type: "node"`, preventing duplicate stacked naive alignment rows

## version 2.6.0 - 2026/04/01
Changed:
* All visualization controls (dropdowns, tooltips, filters) driven dynamically by field_metadata from olmsted-cli
* Centralized metadata resolution with DEFAULT and BUILTIN field definitions per level (clone, node, branch, mutation)
* Mutation coloring system: AA color scale, continuous heatmap with dynamic domain, color scheme dropdown
* Mutation settings cascade from tree view to lineage view via VegaViewContext
* Available Data Fields summary with display mode indicators after dataset loading
* Collapsible JSON structures in Info modals
* Shared Vega tooltip expression builder for consistent tooltip rendering
* 577 tests across 28 suites

## version 2.5.0 - 2026/03/28
Changed:
* Clone/tree completeness validation with specific error messages replacing fragile checks
* Deduplicated server data loading code into shared helpers
* Extracted DatasetsSection, ClonalFamiliesSection, SelectedFamiliesSection from App component
* Renamed "Unique seqs" to "Unique Seq Count" with AIRR terminology note
* 529 tests across 27 suites

## version 2.4.1 - 2026/03/26
Changed:
* Node.js 18 → 20 LTS
* React 18 → 19, Redux 3 → 5, ESLint 8 → 9 (flat config), Express 4 → 5
* All dependencies updated to latest stable; 19 deprecated packages removed
* --legacy-peer-deps no longer required
* 0 high/critical vulnerabilities (down from 23)

## version 2.4.0 - 2026/03/26
Changed:
* Per-mutation surprise score coloring in tree alignment and lineage views
* Subtree focus: filter visualization to a selected node's descendants with children dropdown
* Graceful handling of datasets with missing fields with auto-defaults and dismissible warning banners
* Forest tree support with synthetic root consensus sequences for disconnected subtrees
* Node depth in tooltips, info panel expand/copy, Delete Selected Datasets button

## version 2.3.0 - 2026/03/16
Changed:
* Upgraded Vega 5→6, Vega-Lite 5→6, react-vega 4→8 to resolve 6 high-severity XSS vulnerabilities
* Added VegaChart wrapper component bridging react-vega v8 API changes
* Scatterplot brush selection uses signal polling workaround for Vega 6 compatibility
* Data updates via View API changesets to preserve zoom/pan/brush state
* Added sample field to scatterplot tooltip
* Applied Prettier formatting across codebase

## version 2.2.9 - 2026/01/08
[PR236](https://github.com/matsengrp/olmsted/pull/236) Changed:
* Configuration management: Save, load, and share visualization settings via Settings menu
* Unified filtering system with multi-select filters for locus, subject, sample, V/J genes, and dataset
* Row starring: Mark important rows in tables for easy tracking across selections
* Row info modals: View complete row metadata via info button
* Sticky navigation header with section tracking and settings access
* Export visualizations: PNG/SVG export for all plots with hide-settings option
* Scatterplot enhancements: Adjustable plot height with draggable divider
* Clickable alignment rows in tree view to open ancestral lineage data
* Table refactoring: Consistent features across all tables
* UI polish: Button icons, hover effects, consistent styling, comprehensive help documentation

## version 2.2.8 - 2025/12/13
[PR235](https://github.com/matsengrp/olmsted/pull/235) Changed:
* Paired sequence data support
* Stacked mode visualization with two tree/alignment diagrams sharing topology
* Control and selection synchronization between paired chain views
* CSV export buttons for table data
* Draggable height divider for tree/alignment visualization
* Unified download/copy button styling with icons

## version 2.2.7 - 2025/12/04
[PR227](https://github.com/matsengrp/olmsted/pull/227) Changed:
* Script for video tutorial/trailer on webapp and CLI usage
* Patch fix to "deploy_to_aws" GitHub action

## version 2.2.6 - 2025/10/27
[PR226](https://github.com/matsengrp/olmsted/pull/226) Changed:
* Deployment and UX improvements

## version 2.2.5 - 2025/09/19
[PR225](https://github.com/matsengrp/olmsted/pull/225) Changed:
* Resolved all ESLint errors
* Migrated React Hot Loader to React Fast Refresh
* Integrated Prettier with ESLint for consistent formatting
* Fixes to GitHub actions CI/CD pipeline
* Updated multer to v2.0.2 for security

## version 2.2.4 - 2025/09/11
[PR220](https://github.com/matsengrp/olmsted/pull/220) Changed:
* Client-side data upload with drag-and-drop interface
* Persistent dataset storage using IndexedDB
* Progress indicators and comprehensive error handling
* Batch dataset operations and management
* React v16→18 and Vega v4→5 upgrades
* Memory management and performance optimizations
* Fixed all npm audit vulnerabilities after upgrade

## version 2.2.3 - 2025/07/21
[PR219](https://github.com/matsengrp/olmsted/pull/219) Changed:
* Fixed npm package vulneratibilities, focused on D3/Vega (reduced to 0)

## version 2.2.2 - 2025/07/17
[PR214](https://github.com/matsengrp/olmsted/pull/214) Changed:
* Fixed npm package vulneratibilities, apart from D3/Vega (reduced to 16)
* Updated 50+ packages

## version 2.2.1 - 2025/07/14
[PR207](https://github.com/matsengrp/olmsted/pull/207) Changed:
* Upgraded Node.js v9.6.x to v18 lts
* Upgraded a couple npm packages for compatibility

## version 2.2.0 - 2025/07/13
[PR206](https://github.com/matsengrp/olmsted/pull/206) Changed:
* Migrated data processing pipeline from Python 2.7 to Python 3.9+
* Updated all Python dependencies for Python 3 compatibility

## version 2.1.1 - 2020/03/27
[PR149](https://github.com/matsengrp/olmsted/pull/149) Changed:
* Browser compatibility: Firefox, Safari, Edge, Chrome

## version 2.1.0 - 2020/03/27
[PR148](https://github.com/matsengrp/olmsted/pull/148) Changed:
* Python dependencies to Dockerfile
* Submodule dependencies

## version 2.0.1 - 2020/02/24
[PR147](https://github.com/matsengrp/olmsted/pull/147) Changed:
* Added Dockerfile
* Docker instructions
* Github actions continuous integration
