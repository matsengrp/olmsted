# Olmsted Development Guide

This guide covers development setup, common tasks, and best practices for contributing to Olmsted.

## Table of Contents

- [Quick Start](#quick-start)
- [Prerequisites](#prerequisites)
- [Development Server](#development-server)
- [Available Scripts](#available-scripts)
- [Code Quality](#code-quality)
- [Testing](#testing)
- [Project Structure](#project-structure)
- [Common Development Tasks](#common-development-tasks)
- [Debugging](#debugging)
- [Building for Production](#building-for-production)
- [Common Issues](#common-issues)
- [Getting Help](#getting-help)

---

## Quick Start

```bash
# Clone the repository
git clone https://github.com/matsengrp/olmsted.git
cd olmsted

# Install dependencies
npm install

# Start development server with hot reloading
./bin/olmsted-server-local.sh /path/to/data 3999 dev

# Open in browser
open http://localhost:3999
```

## Prerequisites

- **Node.js**: v20.x LTS (see `engines` in package.json)
- **npm**: >= 9.0.0
- **Git**: For version control

### Verifying Your Environment

```bash
node --version   # Should output v20.x.x
npm --version    # Should output 9.x.x or higher
```

---

## Development Server

### Standard Development Mode

```bash
# Start development server with hot reloading
./bin/olmsted-server-local.sh /path/to/data 3999 dev

# Open in browser
open http://localhost:3999
```

Starts the development server at `http://localhost:3999` with:

- Hot module replacement (React Fast Refresh)
- Source maps for debugging
- Webpack dev middleware

### With Local Data (Server Mode)

The dev server can serve dataset files from a local directory at `/data/*`
instead of relying on the production S3 bucket.

```bash
# Point start:local at any directory containing the server-side files:
npm run start:local <path-to-data-dir>
```

Equivalent long form:

```bash
BABEL_ENV=dev ./node_modules/.bin/babel-node server.js dev localData <path-to-data-dir>
```

**Consolidated format.** Drop any olmsted-cli `.json` or `.json.gz`
file into the data dir (or a subdirectory). The dev server auto-builds
`datasets.json` on startup — scans the dir, parses each consolidated
file, lifts the dataset metadata, and writes a manifest entry with
`consolidated_path` pointing at the file:

```jsonc
[
  {
    "ident": "...",
    "dataset_id": "my-dataset",
    "name": "My dataset",
    "consolidated_path": "consolidated/my-dataset.json.gz"
  }
]
```

On page load the client fetches that file and runs it through the same
ingestion pipeline as in-browser uploads (`FileProcessor.processFile`),
storing the result in IndexedDB. Subsequent loads short-circuit if the
`dataset_id` is already present.

Manual edits to `datasets.json` are NOT needed — restart the server
after dropping a file and the manifest will rebuild from scratch.

For production / deploy time, run the same scanner manually before
uploading:

```bash
node scripts/build-datasets-manifest.js _deploy/data
```

The consolidated single-file shape (`{ metadata, datasets, clones, trees }`)
is the same as what the browser uploader accepts; this is the path for
serving olmsted-cli output directly from the static bucket.

### Snapshotting production data

`bin/aws_download.py` walks the live S3 bucket via HTTP (no credentials
needed for the public bucket) and fetches every object. Use it as a
verbatim before-state to compare against `_deploy/` and identify
orphans:

```bash
python3 bin/aws_download.py -b <bucket> -o <output-dir> [--anonymous]
```

### Deploying a server-side dataset

To publish a new olmsted-cli output as a "server-side" dataset on the
production S3 bucket, the manual flow is three steps:

```bash
# 1. Drop your consolidated olmsted-cli file into _deploy/data/.
#    A subdirectory is fine — the manifest builder records the relative
#    path. .json and .json.gz are both supported.
mkdir -p _deploy/data/consolidated
cp /path/to/my-dataset.json.gz _deploy/data/consolidated/

# 2. Rebuild the manifest from scratch.
node scripts/build-datasets-manifest.js _deploy/data

# 3. Upload to S3 and invalidate CloudFront. The bucket name is the
#    same one the GitHub Actions workflow targets via vars.S3_BUCKET_NAME
#    (typically www.olmstedviz.org).
python3 bin/aws_deploy.py data \
  -b <bucket> \
  --invalidate-cloudfront
```

Datasets in `_deploy/data/` are **not** committed to the repo — test
data files are too large. Run these steps locally with your AWS
credentials, not from CI.

The GitHub Actions "Deploy to AWS" workflow has a `data` scope option,
but it runs against the repo's empty `_deploy/data/` after `npm run build`,
so it is currently a no-op for data uploads. Wiring it up properly
(e.g., pulling datasets from a separate source) is future work.

---

## Available Scripts

| Command                  | Description                                                                                               |
| ------------------------ | --------------------------------------------------------------------------------------------------------- |
| `npm start`              | Start development server with hot reloading                                                               |
| `npm run start:local`    | Start with local data from `data/` directory (see [With Local Data](#with-local-data-server-mode))        |
| `npm run build`          | Full production build — runs `build:client` + `build:server`                                              |
| `npm run build:client`   | Build the production web bundle to `_deploy/dist/`                                                        |
| `npm run build:server`   | Build the production Express server bundle to `server.dist.js`                                            |
| `npm run build:electron` | Build the Electron renderer bundle to `dist/`                                                             |
| `npm run build:start`    | Build and start production server                                                                         |
| `npm run run:electron`   | Build the Electron bundle and launch the packaged app locally                                             |
| `npm run dist:electron`  | Package a platform-specific Electron distributable (AppImage on Linux, `.dmg` on macOS) into `_releases/` |
| `npm run lint`           | Run ESLint on src/                                                                                        |
| `npm run format`         | Format code with Prettier                                                                                 |
| `npm run format:check`   | Check formatting without modifying files                                                                  |
| `npm test`               | Run all Jest tests                                                                                        |
| `npm run test:watch`     | Run tests in watch mode (re-runs on file changes)                                                         |
| `npm run test:coverage`  | Run tests with coverage report                                                                            |
| `npm run test:e2e`       | Run Playwright end-to-end tests (auto-starts the dev server)                                               |
| `npm run test:e2e:ui`    | Run Playwright tests in interactive UI mode                                                                |
| `npm run test:perf`      | Run the browser performance test (report-only; `PERF_FAMILIES` sets dataset size)                          |
| `npm run clean`          | Remove build artifacts                                                                                    |

### Build Pipeline

Olmsted has two distribution channels that share the same React source but use different webpack configs. Both go through Babel for JSX/ESNext transpilation.

| Config                       | Used by                  | Output                        | Purpose                           |
| ---------------------------- | ------------------------ | ----------------------------- | --------------------------------- |
| `webpack.config.dev.js`      | `npm start`              | `_devel/` (in-memory via HMR) | Hot-reloading dev server          |
| `webpack.config.prod.js`     | `npm run build:client`   | `_deploy/dist/bundle.js`      | Production web bundle (S3/Docker) |
| `webpack.config.server.js`   | `npm run build:server`   | `server.dist.js`              | Bundled Express server            |
| `webpack.config.electron.js` | `npm run build:electron` | `dist/bundle.js`              | Renderer for the Electron app     |

```bash
# Full production build (web)
npm run build

# Build and immediately serve
npm run build:start
```

### Electron (Desktop App)

The Electron build wraps the same React app in a Chromium window: `index.js` is an Electron main process that spawns an Express server on `localhost:5000`, serves the bundle + `index.html` out of the packaged asar, and loads that URL in a `BrowserWindow`. `electron-builder` packages the runtime, bundle, and `index.js` into a platform-specific distributable (`.AppImage` on Linux, `.dmg` on macOS) under `_releases/`.

```bash
# Build the renderer + launch the packaged app locally
npm run run:electron

# Build a platform-specific distributable into _releases/
npm run dist:electron
```

**Status**: tested and working as of PR #273. The webpack-based web distribution is the primary build; Electron is likely to be sunset in a follow-up PR in favor of webpack. This commit is the last known good state so a future maintainer can fork from it if they want to revive the desktop build.

---

## Code Quality

### Linting

Olmsted uses ESLint with the Airbnb style guide and Prettier for formatting.

```bash
# Check for linting errors
npm run lint

# Common ESLint rules (see eslint.config.mjs):
# - No console.log (use console.warn or console.error)
# - Unused vars starting with _ are allowed
# - Decorators (@connect) are supported
```

### Formatting

```bash
# Format all source files
npm run format

# Check formatting without modifying
npm run format:check
```

### Code Standards

From CLAUDE.md:

- **Function size**: No function should exceed 50 lines
- **Error handling**: Comprehensive try-catch blocks with specific error messages
- **Naming**: Consistent camelCase with verb prefixes (get, set, handle, process, validate)
- **Documentation**: JSDoc for all public methods and complex functions
- **Indentation**: 2 spaces
- **No inline TODOs**: Do not leave TODO/FIXME/HACK comments in code. File a GitHub issue instead. Inline TODOs are easy to forget and hard to track; issues are searchable, assignable, and closeable

---

## Testing

Olmsted uses [Jest](https://jestjs.io/) with a jsdom environment for unit testing. Tests live in `__tests__/` directories alongside the source files they cover.

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode (re-runs on file changes)
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run a specific test file
npm test -- src/reducers/__tests__/configs.test.js

# Run tests matching a pattern
npm test -- --testPathPattern="selectors"

# See every individual test name
npm test -- --verbose
```

### Test Organization

Olmsted has two test layers, kept in separate locations:

- **Jest unit/integration tests** — colocated with the source they cover in `__tests__/` directories (see below). These own pure-function, component-unit, IndexedDB, middleware, and Vega-spec-parse coverage.
- **Playwright end-to-end tests** — at the top-level `tests/e2e/` directory, alongside the existing non-Jest scaffolding (`tests/performance/`, `tests/test_docker_server.sh`). E2E specs are not unit tests of any single module, so they do not follow the colocated `__tests__/` convention. See [End-to-End Tests (Playwright)](#end-to-end-tests-playwright).

Jest tests are colocated with source files using the `__tests__/` convention:

```
src/
├── reducers/
│   ├── clonalFamilies.js
│   └── __tests__/
│       └── clonalFamilies.test.js
├── selectors/
│   ├── trees.js
│   └── __tests__/
│       └── trees.test.js
├── components/
│   ├── util/                 # reusable UI components (distinct from src/utils/)
│   │   ├── loading.js
│   │   └── __tests__/
│   │       └── loading.test.js
│   ├── tables/
│   │   └── __tests__/
│   │       └── RowInfoModal.test.js
│   └── explorer/
│       ├── __tests__/
│       │   └── naive.test.js
│       └── vega/__tests__/
│           └── naive.test.js
├── middleware/
│   ├── changeURL.js
│   └── __tests__/
│       └── changeURL.test.js
├── utils/
│   ├── olmstedDB.js
│   └── __tests__/
│       ├── olmstedDB.test.js
│       └── clientDataStore.test.js
└── __test-data__/
    └── mockState.js          # Shared mock data (families, trees, datasets)
```

**What's tested:**

- **Pure functions** — reducers, selectors, utilities, and file processors
- **React components** — presentational components and components with internal logic (using `@testing-library/react`)
- **IndexedDB / Dexie** — database CRUD operations and LRU cache logic (using `fake-indexeddb`)
- **Redux middleware** — URL-sync middleware with mocked `window.history` and Redux store
- **Vega specs** — structural validation and runtime compatibility (parse + headless View)

### End-to-End Tests (Playwright)

End-to-end tests live in `tests/e2e/` and drive a real Chromium browser against the dev server, covering the full pipeline the Jest suite can't: file upload → React render → Vega rendering → user interaction.

```bash
# First time only: install the Chromium browser binary
npx playwright install chromium

# Run the e2e suite (auto-starts `npm start` on port 4000 via the webServer config)
npm run test:e2e

# Interactive UI mode (watch, time-travel, pick locators)
npm run test:e2e:ui
```

**What it covers.**

- `tests/e2e/smoke.spec.js` — a single happy-path test: upload the golden fixture, load it into the App view, assert the scatterplot mounted with families, brush a subset and confirm the table narrows, open an unpaired family and assert its tree rendered single-rooted, then focus a subtree and reset to the full tree.
- `tests/e2e/paired-tree.spec.js` — the paired heavy/light path: upload the paired fixture, open a heavy-chain family, switch the chain selector to "Both chains (stacked)", and assert both the `tree-heavy` and `tree-light` Vega views render single-rooted trees with no console errors.

Assertions are made against live Vega **View** state (signals and datasets), never canvas pixels — visual regression is intentionally deferred (issue #287, Phase 2). Shared View-registry helpers (`viewDataLength`, `waitForViewData`, `nodeTypeCount`, `tableFamilyCount`, …) live in `tests/e2e/helpers.js`.

**How it reaches the Vega views.** `VegaChart` accepts a `name` prop that, in non-production builds only, registers the live View on `window.__OLMSTED_VEGA_VIEWS__` (a `Map`). Tests read from that registry via `page.evaluate`. The registry is gated on `process.env.NODE_ENV !== "production"`, so it is dead-code-eliminated from production bundles (verify with `npm run build` then `grep __OLMSTED_VEGA_VIEWS__ _deploy/dist/bundle.js` — no matches).

**The fixtures.** `tests/e2e/fixtures/` holds Olmsted JSON datasets copied from olmsted-cli (`pcp-byhand` drives the smoke test, `pcp-paired` drives the paired test, plus `airr`/`pcp`/`merge` staged for future specs); see `tests/e2e/fixtures/README.md` for provenance and how to update them. They are committed (not symlinked) so the suite runs in a fresh clone.

**CI.** `.github/workflows/build.yml` caches the Playwright browser, installs Chromium, runs `npx playwright test`, and uploads the HTML report as an artifact (`if: always()`), all before the Docker build — so an e2e failure blocks the image push.

### Performance Tests (Playwright)

Browser-level performance measurement lives in `tests/performance/` with its own Playwright config (`playwright.perf.config.js`), so it does **not** run with `npm run test:e2e` and is not wired into the blocking CI build. Run it explicitly:

```bash
npm run test:perf                                  # default 500 families, template tree sizes
PERF_FAMILIES=2000 npm run test:perf               # breadth: more families (ingest + scatterplot)
PERF_FAMILIES=20 PERF_NODES_PER_TREE=3000 npm run test:perf   # depth: big trees (tree render)
```

Two independent size knobs: **`PERF_FAMILIES`** scales family count (drives ingest + scatterplot), and **`PERF_NODES_PER_TREE`** grows every tree to ~N nodes to stress tree rendering (the template's real trees are only 4–30 nodes). For tree-size experiments, pair a small `PERF_FAMILIES` with a large `PERF_NODES_PER_TREE` to keep the dataset manageable while the opened tree is big.

**What it does.** `tests/performance/makeDataset.js` generates a consolidated Olmsted JSON in-process by amplifying a golden fixture (deep-cloning its real clone/tree pairs with fresh IDs — so the synthetic data carries every field the scatterplot/tree need); when `PERF_NODES_PER_TREE` is set, each tree is grown to the target size from real template nodes (valid `stratify` structure). `perf.spec.js` uploads it through the real browser path and records wall-clock timings split into **write** vs **read**, since they matter differently:

- **Write (one-time):** `ingestMs` — upload → processing → IndexedDB `bulkPut`. Paid once per dataset; slow at scale (≈300 ms/MB, dominated by IndexedDB writes, not JS) but off the hot path.
- **Read (per-view, the interactive workflow):** `scatterplotLoadMs` (splash "Explore!" first-load — read clone metadata back + render), `updateVizReadMs` (in-app "Update Visualization" re-read — the recurring read), and `treeReadMs` (open a family — read one tree + render). These are what a user feels while inspecting datasets.

Readiness is probed via the same `window.__OLMSTED_VEGA_VIEWS__` registry the e2e tests use.

**Report-only.** Results are printed (`console.table`), attached to the Playwright report, and written to `test-results/perf-results.json`. There are **no timing thresholds** — shared CI runners are too noisy for absolute gates, so the spec asserts only that the full dataset was ingested and a tree rendered. (The first rendered family row is selected via the `data-testid="family-row"` seam in `table.js`.)

**Interaction latency** (`interactions.spec.js`, same `npm run test:perf` run) covers the laggy-feeling part — interacting with an already-loaded plot. Each interaction sets the relevant Vega signal and measures `view.runAsync()` **in-browser** (`performance.now`), isolating Vega's recompute+render cost (the actual lag). Two tests, each sized for its dimension:

- **Scatterplot** (many families): change `xField` / `yField` / `colorBy` / faceting, `zoom_level`, and a real brush drag (`brushMs`, measured release → table settle).
- **Tree** (a big tree): `branch_color_by`, `fixed_branch_lengths`, `show_alignment`, `show_labels`.

Writes results to `test-results/interaction-scatterplot.json` / `interaction-tree.json`. Valid alternate values for `<select>` settings are read from the rendered bind options. (Tree zoom/pan is a wheel-driven signal scoped inside the tree group — not settable via the View API — so it's not covered by the set-signal approach; `fixed_branch_lengths` / `show_alignment` exercise the same heavy tree re-render.)

### Writing New Tests

When adding tests, follow the existing patterns:

- **Reducers**: Test `(state, action) => newState` for each action type, plus the default/initial state
- **Selectors**: Test exported helper functions directly; test memoized selectors by constructing mock state objects
- **Utilities**: Test pure input/output with edge cases (null, empty, boundary values)
- **React components**: Use `@testing-library/react` (`render`, `screen`, `fireEvent`). Query by accessible roles/labels rather than implementation details. See `loading.test.js` for timer testing with `jest.useFakeTimers()`
- **IndexedDB / Dexie**: Create fresh `Dexie` instances per test (don't import the singleton). Use factory functions (`makeDataset()`, `makeClone()`, `makeTree()`) with spread overrides to reduce duplication. See `olmstedDB.test.js`
- **Redux middleware**: Mock `store.getState()`, `next`, and `window.history`. Use `window.history.pushState` (the real one) to set jsdom's URL before mocking. See `changeURL.test.js`

Import shared mock data from `src/__test-data__/mockState.js` rather than duplicating fixtures across test files.

### Configuration

| File                              | Purpose                                                                                                                                   |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `jest.config.js`                  | Jest config: jsdom env, babel-jest transform, CSS/image mocks, ESM package handling, `setupFilesAfterEnv` for `@testing-library/jest-dom` |
| `jest.setup.js`                   | `fake-indexeddb/auto` polyfill, `structuredClone` polyfill for Node 18, sessionStorage fallback, console noise suppression                |
| `__mocks__/fileMock.js`           | Stub for image/file imports                                                                                                               |
| `.babelrc` `"test"` env           | Avoids loading react-refresh plugin (crashes in Jest)                                                                                     |
| `eslint.config.mjs` test override | Adds Jest globals for `__tests__/` files so ESLint recognizes `describe`, `it`, `expect`, etc.                                            |

**Key dependencies:**

- `@testing-library/react` + `@testing-library/dom` + `@testing-library/jest-dom` — React component testing with DOM matchers (`.toBeInTheDocument()`, etc.)
- `fake-indexeddb` — in-memory IndexedDB polyfill for Dexie tests
- `@testing-library/jest-dom` must be in `setupFilesAfterEnv` (not `setupFiles`) because it extends `expect`, which isn't available until after the test framework loads
- `structuredClone` is not available in Node 18's jsdom — the polyfill in `jest.setup.js` is required for `fake-indexeddb` to work

**Note on ESM packages**: lodash-es and d3-\* are ESM-only and must be excluded from `transformIgnorePatterns` in `jest.config.js` so babel-jest can process them. If you add a new ESM dependency that causes `SyntaxError: Unexpected token export` in tests, add it to the pattern.

---

## Project Structure

```
olmsted/
├── src/
│   ├── index.js              # Application entry point
│   ├── Root.js               # Root component with routing
│   ├── store/                # Redux store configuration
│   ├── reducers/             # Redux reducers (5 total)
│   ├── actions/              # Redux action creators
│   ├── selectors/            # Reselect memoized selectors
│   ├── middleware/           # Redux middleware (URL sync)
│   ├── components/
│   │   ├── explorer/         # Main visualization components
│   │   │   └── vega/         # Vega specification generators
│   │   ├── splash/           # Landing page components
│   │   ├── framework/        # Layout components (nav, etc.)
│   │   ├── config/           # Configuration modal
│   │   ├── tables/           # Shared table components
│   │   └── util/             # Reusable UI components
│   ├── utils/                # Data processing utilities
│   │   ├── olmstedDB.js      # Dexie database schema
│   │   ├── clientDataStore.js # Storage abstraction + caching
│   │   └── fileProcessor.js  # File parsing
│   ├── css/                  # Stylesheets
│   ├── images/               # Static images
│   └── server/               # Express server code
├── bin/                      # Operator-run scripts (AWS deploy, Docker server)
├── scripts/                  # Build/tooling helpers run by npm/webpack
├── data/                     # Local data directory (gitignored)
├── _deploy/                  # Production web bundle output (build)
├── _devel/                   # Dev-mode webpack output (start)
├── dist/                     # Electron renderer bundle (build:electron)
└── _releases/                # Electron-builder packaged distributables (dist:electron)
```

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed documentation of the data flow and component hierarchy.

---

## Common Development Tasks

### Adding a New Visualization

1. **Create Vega spec generator** in `src/components/explorer/vega/`:

```javascript
// src/components/explorer/vega/myVisualization.js

export const generateMyVizSpec = (data, options) => {
  return {
    $schema: "https://vega.github.io/schema/vega/v5.json",
    width: options.width,
    height: options.height,
    data: [{ name: "source", values: data }],
    marks: [
      /* ... */
    ],
    signals: [
      /* ... */
    ]
  };
};
```

2. **Create React wrapper component**:

```javascript
// src/components/explorer/myVisualization.js
import React from "react";
import { connect } from "react-redux";
import Vega from "react-vega";
import { generateMyVizSpec } from "./vega/myVisualization";

@connect((state) => ({
  data: state.myData,
  browserDimensions: state.browserDimensions.browserDimensions
}))
class MyVisualization extends React.Component {
  render() {
    const { data, browserDimensions } = this.props;
    const spec = generateMyVizSpec(data, {
      width: browserDimensions.width * 0.8,
      height: 400
    });
    return <Vega spec={spec} />;
  }
}

export default MyVisualization;
```

3. **Add to app.js** render tree in the appropriate section.

### Modifying Data Processing

The data processing pipeline is in `src/utils/`:

1. **fileProcessor.js** - Parses uploaded JSON files
2. **clientDataStore.js** - Storage abstraction with LRU caching
3. **olmstedDB.js** - Dexie database schema and CRUD operations

To add a new data field:

1. Update the database schema in `olmstedDB.js` (increment version)
2. Update `storeDataset()` to extract the new field
3. Update relevant selectors in `src/selectors/`
4. Update components to display the new field

### Adding Redux State

1. **Create or update reducer** in `src/reducers/`:

```javascript
// Add new action type in src/actions/types.js
export const MY_NEW_ACTION = "MY_NEW_ACTION";

// Handle in reducer
case types.MY_NEW_ACTION: {
  return { ...state, myField: action.value };
}
```

2. **Create action creator** in `src/actions/`:

```javascript
export const myNewAction = (value) => ({
  type: types.MY_NEW_ACTION,
  value
});
```

3. **Connect component** using `@connect` decorator:

```javascript
@connect(
  (state) => ({ myField: state.myReducer.myField }),
  (dispatch) => ({ setMyField: (val) => dispatch(myNewAction(val)) })
)
```

### Working with Selectors

Selectors in `src/selectors/` use Reselect for memoization:

```javascript
import { createSelector } from "reselect";

const getData = (state) => state.myData;
const getFilter = (state) => state.myFilter;

export const getFilteredData = createSelector([getData, getFilter], (data, filter) => {
  // Expensive computation only runs when inputs change
  return data.filter((item) => item.matches(filter));
});
```

---

## Debugging

### Redux DevTools

Install the [Redux DevTools browser extension](https://github.com/reduxjs/redux-devtools). The store is configured to use it in development mode.

**Note**: Large payloads (clonal families) are sanitized in DevTools to prevent performance issues. See `src/store/index.js` for sanitizer configuration.

### Browser Developer Tools

- **React DevTools**: Inspect component hierarchy and props
- **Network tab**: Monitor API calls and data loading
- **Application tab**: Inspect IndexedDB storage (OlmstedClientStorage database)

### Console Logging

The codebase uses `console.log` for development debugging. ESLint is configured to warn (not error) on console statements.

```javascript
// Allowed
console.warn("Warning message");
console.error("Error message");

// Will trigger ESLint warning
console.log("Debug message"); // Remove before committing
```

---

## Building for Production

### Static Build (S3/CDN Deployment)

```bash
npm run build
```

Output is in `_deploy/dist/`. The `scripts/postbuild.sh` script copies the static assets (HTML, CSS, images) alongside the bundle in `_deploy/` so the whole directory can be served as-is.

### Docker Build

```bash
docker build -t olmsted:latest .
./bin/olmsted-server.sh olmsted:latest 3999
```

### AWS Deployment

```bash
# Deploy to S3
python bin/aws_deploy.py --bucket your-bucket

# Invalidate CloudFront cache
python bin/aws_invalidate_cloudfront.py
```

---

## Common Issues

### `npm install` Fails

Ensure you are running Node.js v20.x (`node --version`). Peer dependency conflicts have been resolved via overrides in `package.json`, so `--legacy-peer-deps` should not be needed.

### Hot Reloading Not Working

1. Check that you're running `npm start` (not `npm run build:start`)
2. Verify no syntax errors in your code
3. Try a hard refresh (Cmd+Shift+R / Ctrl+Shift+R)
4. Restart the dev server

### IndexedDB Issues

If the browser database gets corrupted:

1. Open DevTools > Application > IndexedDB
2. Delete the "OlmstedClientStorage" database
3. Refresh the page

### Large Dataset Performance

For datasets with thousands of clonal families:

- The application uses lazy loading (tree data loaded on demand)
- Memory cache is limited to 10 items (configurable in `clientDataStore.js`)
- Consider using the filter panel to reduce visible data

### ESLint Errors on Decorators

Ensure your editor is configured to use the project's ESLint config with Babel parser. The `@connect` decorator syntax requires `@babel/eslint-parser`.

---

## Getting Help

- **GitHub Issues**: [matsengrp/olmsted/issues](https://github.com/matsengrp/olmsted/issues)
- **Architecture Documentation**: [ARCHITECTURE.md](./ARCHITECTURE.md)
- **Data Format Documentation**: [olmsted-cli README](https://github.com/matsengrp/olmsted-cli)

---

_Last updated: 2026-02-11_
