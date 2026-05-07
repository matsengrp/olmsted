# Pre-Merge Quality Checklist

Companion to [DESIGN.md](./DESIGN.md) (load-bearing architectural choices) and
[ARCHITECTURE.md](./ARCHITECTURE.md) (descriptive system documentation).

If you discover this checklist is wrong or incomplete during a PR, update it as part of the PR.

Before any pull request:

1. **Format**: `npm run format`, then `npm run format:check` to verify a clean diff.
2. **Lint**: `npm run lint`. Address every error. Warnings (e.g., `console.log`) should be removed before merge — ESLint is configured to allow `console.warn` and `console.error` only.
3. **Tests**: `npm test` runs the full Jest suite (~30s, ~600 tests). The suite is small enough that there's no benefit to running subsets locally; CI runs it on every push regardless. If you add new behavior, add tests in the colocated `__tests__/` directory (see [DEVELOPMENT.md](./DEVELOPMENT.md#testing)).
4. **Build**: `npm run build` (production webpack). This catches import errors, JSX issues, and dependency mismatches that pure lint/test runs miss because of the Babel-jest transform pipeline. CI builds the Docker image — a local build failure is a guaranteed CI failure.
5. **Browser smoke test**: With `npm start`, exercise the three flows end-to-end in a real browser. The Vega rendering layer is not exercised in headless tests beyond spec parse + headless View; visual regressions and signal-listener bugs only show up here.
   - **Upload**: drop an Olmsted JSON file on the splash page. Confirm the dataset appears in the management table without errors.
   - **Scatterplot + table**: load a dataset, brush-select families, page through the table, sort a column, change facet/locus.
   - **Tree + lineage**: select a family, verify tree renders, click a node, open lineage, toggle subtree-as-root focus and back to full tree.
   - If you can't run the UI for a given change (e.g., pure docs/CI work), say so explicitly in the PR description rather than claiming this step passed.
6. **Background code review** (launch now, read results later): Spawn the `clean-code-reviewer` agent on changed source files in parallel with the rest of this checklist. For PRs with new visualization code, also spawn `plot-reviewer` on changed Vega specs. Read results before merging.
7. **Code standards** (see [CLAUDE.md](./CLAUDE.md)):
   - **Function size**: no function exceeds 50 lines. Refactor before merge.
   - **No inline TODOs**: file a GitHub issue instead. ESLint won't catch this — grep for `TODO|FIXME|HACK` in the diff.
   - **JSDoc** for new public functions and any non-obvious exported helper.
   - **Naming**: camelCase with verb prefixes for functions (`get`, `set`, `handle`, `process`, `validate`).
8. **Constants**: New categorical values (chain types, locus values, node types, color schemes, display labels) belong in `src/constants/`, not as inline string literals in components or specs. See DESIGN.md D7.
9. **Field metadata**: If you add a new clone or node field, register it through the field metadata pipeline rather than reading it directly off objects in components or selectors. See DESIGN.md D6 and `src/utils/fieldDefaults.js` / `src/utils/fieldMetadata.js`. Required fields use the `REQUIRED` sentinel; optional fields need a default in `NODE_FIELD_DEFAULTS` or `CLONE_FIELD_DEFAULTS`.
10. **Vega specs**: If the PR touches anything in `src/components/explorer/vega/`, render the affected spec at least once in the browser at full data volume (not just the unit fixtures). Vega errors at runtime are usually silent in the console — watch for empty marks, broken legends, or missing tooltips. All chart components must render through `VegaChart` (`src/components/util/VegaChart.js`); do not import `react-vega` directly. See DESIGN.md D3.
11. **IndexedDB schema**: If the PR changes the Dexie schema (`src/utils/olmstedDB.js`), increment the version number and add a migration. Test by loading the app with an existing database from the previous version — uncaught migration bugs corrupt user data silently. Document the schema change in the ARCHITECTURE.md "IndexedDB Schema" section and the CHANGELOG.
12. **Performance posture**: The lazy loading strategy (datasets always, clones on selection, trees on demand) and the 10-item LRU cache in `clientDataStore.js` are load-bearing for large datasets. Don't bypass them — e.g., don't pre-load all trees on dataset selection, don't store full tree data in Redux for "convenience". See DESIGN.md D4 and D5.
13. **Documentation sync**: Update each of these only when relevant:
    - **CLAUDE.md** — new patterns, terminology, or lessons learned.
    - **ARCHITECTURE.md** — changes to data flow, Redux store shape, component hierarchy, IndexedDB schema, or Vega integration. ARCHITECTURE.md describes the system as it *is*.
    - **DESIGN.md** — only if the PR introduces or revises a load-bearing architectural decision. DESIGN.md describes guardrails for what future PRs may *not* do without justification.
    - **DEVELOPMENT.md** — changes to setup, scripts, build pipeline, or test conventions.
    - **CHANGELOG.md** — every user-facing change. Match the existing version-block format.
14. **Dependencies**: If the PR adds or upgrades a dependency, run `npm audit` and address any new high/critical findings (or note them in the PR body if they're transitive and already-known). Do not introduce `--legacy-peer-deps`; if a peer dependency conflict surfaces, resolve it via `overrides` in `package.json` and explain in the CHANGELOG why.
15. **Background review results**: Read the agent results from step 6 and address findings. If they cause code changes, re-run steps 1–4 on the final code.
16. **PR description**: After any rebase, re-read the squashed diff and rewrite the PR body to describe the *final* state, not the commit history. Include the CHANGELOG entry's user-facing summary in the body. If you intentionally skipped any step above (e.g., browser smoke test for a docs-only PR), state which and why.
