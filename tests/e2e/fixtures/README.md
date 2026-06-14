# End-to-end test fixtures

## `pcp-byhand-olmsted-golden.json`

A small (~60 KB) hand-crafted Olmsted JSON dataset used by the Playwright
smoke test (`tests/e2e/smoke.spec.js`).

### What it is

The consolidated (single-file) Olmsted JSON format consumed by the browser
upload path. Contents:

- **1 dataset**
- **4 clonal families** (`d.clones[datasetId]`), one of which is a paired
  heavy/light pair (`sample-C_family-paired-imbalanced-heavy` /
  `-light`), so the scatterplot/table show multiple families.
- **4 trees**, one per clone, each **single-rooted** (exactly one node with
  `type: "root"`). Intermediate nodes are tagged `"internal"` upstream and
  coalesced to `"node"` on ingest by `fileProcessor.processConsolidatedFormat`.

Single-rootedness matters: the smoke test asserts exactly one root node and
does not exercise the synthetic-root forest-reconciliation path (DESIGN.md D8).

### Where it came from

Copied verbatim from the olmsted-cli repository:

- **Repo**: https://github.com/matsengrp/olmsted-cli
- **Path**: `example-data/pcp-byhand/pcp-byhand-olmsted-golden.json`
- **Upstream commit**: `8d1d315` ("Multi-tree PCP grouping, flexible role
  columns, tree field level (#23) (#25)", 2026-05-12)

The file is committed here (not symlinked) so the test suite runs in a fresh
clone without a sibling olmsted-cli checkout.

### Updating the fixture

Re-copy from the upstream path above and update the commit hash in this
README. If the Olmsted JSON input contract changes (DESIGN.md D9), regenerate
via olmsted-cli rather than hand-editing this file, then re-run
`npm run test:e2e` and adjust any count assertions in `smoke.spec.js`.
