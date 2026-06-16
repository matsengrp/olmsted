# End-to-end test fixtures

Olmsted JSON datasets used by the Playwright suite under `tests/e2e/`. All are
the consolidated (single-file) `{metadata, datasets, clones, trees}` format
consumed by the browser upload path.

## Files

| File | Size | Datasets | Clones | Trees | Notes |
|------|------|----------|--------|-------|-------|
| `pcp-byhand-olmsted-golden.json` | ~60 KB | 1 | 4 | 4 | Hand-crafted; used by `smoke.spec.js` |
| `pcp-olmsted-golden.json` | ~515 KB | 1 (`pcp-example`) | 28 | 28 | PCP CSV → Olmsted JSON |
| `airr-olmsted-golden.json` | ~846 KB | 1 (`test-input-2020.01.30`) | 8 | 9 | AIRR JSON → Olmsted JSON |
| `pcp-paired-olmsted-golden.json` | ~124 KB | 1 (`pcp-paired-example`) | 8 (16 chains) | 16 | Paired heavy/light PCP |
| `merge-olmsted-golden.json` | ~619 KB | 1 (`dasm2-surprise-20260407`) | 2 | 2 | Merged Olmsted JSON + mutations |

### `pcp-byhand-olmsted-golden.json`

The fixture exercised by the happy-path smoke test (`smoke.spec.js`).

- **1 dataset**, **4 clonal families**, one of which is a paired heavy/light
  pair (`sample-C_family-paired-imbalanced-heavy` / `-light`).
- **4 trees**, one per clone, each **single-rooted** (exactly one node with
  `type: "root"`). Intermediate nodes are tagged `"internal"` upstream and
  coalesced to `"node"` on ingest by `fileProcessor.processConsolidatedFormat`.

Single-rootedness matters: the smoke test asserts exactly one root node and
does not exercise the synthetic-root forest-reconciliation path (DESIGN.md D8).

### `pcp-olmsted-golden.json`

Larger PCP-derived dataset (`pcp-example`, 28 single-chain families). Useful for
exercising the scatterplot/table at a more realistic family count than the
by-hand fixture.

### `airr-olmsted-golden.json`

AIRR-derived dataset (`test-input-2020.01.30`, 8 clones / 9 trees) with subject
and timepoint metadata populated — the only fixture with `subjects_count` and
`timepoints_count` > 0, so it covers the AIRR ingest path and faceting by
subject/timepoint.

### `pcp-paired-olmsted-golden.json`

Paired heavy/light dataset (`pcp-paired-example`, 8 families = 16 chains). Each
family has a `-heavy` and `-light` clone, so it exercises the paired-chain
rendering path end-to-end.

### `merge-olmsted-golden.json`

Output of the olmsted-cli `merge` path (`DASM2 Surprise Analysis`,
`dasm2-surprise-20260407`): an existing Olmsted JSON merged with a mutations
CSV (`input-olmsted.json` + `input-mutations.csv`). Small (2 clones / 2 trees)
but covers the merge ingest path and carries subject metadata
(`subjects_count: 4`).

## Provenance

Copied verbatim from the olmsted-cli repository (not symlinked, so the suite
runs in a fresh clone without a sibling olmsted-cli checkout):

- **Repo**: https://github.com/matsengrp/olmsted-cli
- **Upstream commit**: `4292a64` (2026-06-12)

| Fixture | Upstream path |
|---------|---------------|
| `pcp-byhand-olmsted-golden.json` | `example-data/pcp-byhand/pcp-byhand-olmsted-golden.json` |
| `pcp-olmsted-golden.json` | `example-data/pcp/pcp-olmsted-golden.json` |
| `airr-olmsted-golden.json` | `example-data/airr/airr-olmsted-golden.json` |
| `pcp-paired-olmsted-golden.json` | `example-data/pcp-paired/pcp-paired-olmsted-golden.json` |
| `merge-olmsted-golden.json` | `example-data/merge/merge-olmsted-golden.json` |

## Updating the fixtures

Re-copy from the upstream paths above and update the commit hash here. If the
Olmsted JSON input contract changes (DESIGN.md D9), regenerate via olmsted-cli
rather than hand-editing these files, then re-run `npm run test:e2e` and adjust
any count assertions in the specs.
