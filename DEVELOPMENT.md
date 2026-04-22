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

For testing with local data files in split format:

```bash
# Copy example data to data/ directory
cp ../olmsted-cli/example_data/pcp/split_golden_data/* path/to/data/

# Start development server with hot reloading
./bin/olmsted-server-local.sh /path/to/data 3999 dev

# OR: invoke npm scripts manually

# Start with local data
npm run start:local
# Or specify a custom data directory:
BABEL_ENV=dev ./node_modules/.bin/babel-node server.js dev localData data
```

**Note**: Local data mode requires **split format** (separate files for datasets, clones, trees), not the consolidated single-file format used for browser uploads.

---

## Available Scripts

| Command                 | Description                                                                                        |
| ----------------------- | -------------------------------------------------------------------------------------------------- |
| `npm start`             | Start development server with hot reloading                                                        |
| `npm run start:local`   | Start with local data from `data/` directory (see [With Local Data](#with-local-data-server-mode)) |
| `npm run build`         | Full production build — runs `build:client` + `build:server`                                       |
| `npm run build:client`  | Build the production web bundle to `_deploy/dist/`                                                 |
| `npm run build:server`  | Build the production Express server bundle to `server.dist.js`                                     |
| `npm run build:electron`| Build the Electron renderer bundle to `dist/`                                                      |
| `npm run build:start`   | Build and start production server                                                                  |
| `npm run run:electron`  | Build the Electron bundle and launch the packaged app locally                                      |
| `npm run dist:electron` | Package a platform-specific Electron distributable (AppImage on Linux, `.dmg` on macOS) into `_releases/` |
| `npm run lint`          | Run ESLint on src/                                                                                 |
| `npm run format`        | Format code with Prettier                                                                          |
| `npm run format:check`  | Check formatting without modifying files                                                           |
| `npm test`              | Run all Jest tests                                                                                 |
| `npm run test:watch`    | Run tests in watch mode (re-runs on file changes)                                                  |
| `npm run test:coverage` | Run tests with coverage report                                                                     |
| `npm run clean`         | Remove build artifacts                                                                             |

### Build Pipeline

Olmsted has two distribution channels that share the same React source but use different webpack configs. Both go through Babel for JSX/ESNext transpilation.

| Config                        | Used by                     | Output                          | Purpose                            |
| ----------------------------- | --------------------------- | ------------------------------- | ---------------------------------- |
| `webpack.config.dev.js`       | `npm start`                 | `_devel/` (in-memory via HMR)   | Hot-reloading dev server           |
| `webpack.config.prod.js`      | `npm run build:client`      | `_deploy/dist/bundle.js`        | Production web bundle (S3/Docker)  |
| `webpack.config.server.js`    | `npm run build:server`      | `server.dist.js`                | Bundled Express server             |
| `webpack.config.electron.js`  | `npm run build:electron`    | `dist/bundle.js`                | Renderer for the Electron app      |

```bash
# Full production build (web)
npm run build

# Build and immediately serve
npm run build:start

# Build with performance timing
npm run build:start:perf
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

Tests are colocated with source files using the `__tests__/` convention:

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
│   ├── util/
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

| File                    | Purpose                                                                                                                                   |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `jest.config.js`        | Jest config: jsdom env, babel-jest transform, CSS/image mocks, ESM package handling, `setupFilesAfterEnv` for `@testing-library/jest-dom` |
| `jest.setup.js`         | `fake-indexeddb/auto` polyfill, `structuredClone` polyfill for Node 18, sessionStorage fallback, console noise suppression                |
| `__mocks__/fileMock.js` | Stub for image/file imports                                                                                                               |
| `.babelrc` `"test"` env | Avoids loading react-refresh plugin (crashes in Jest)                                                                                     |
| `eslint.config.mjs` test override | Adds Jest globals for `__tests__/` files so ESLint recognizes `describe`, `it`, `expect`, etc.                                  |

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
│   ├── util/                 # Core application utilities
│   ├── css/                  # Stylesheets
│   ├── images/               # Static images
│   └── server/               # Express server code
├── bin/                      # Shell scripts and utilities
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

Output is in `_deploy/dist/`. The `bin/postbuild.sh` script copies the static assets (HTML, CSS, images) alongside the bundle in `_deploy/` so the whole directory can be served as-is.

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
