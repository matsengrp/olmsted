/**
 * Where a dataset originated. Drives both UI labeling (the Source
 * column) and loader routing (which fetch path to use for clones and
 * trees).
 *
 * Previously this distinction was encoded across two boolean fields
 * (`temporary` and `isClientSide`) whose combinations had to be read
 * carefully — `(temporary: true, isClientSide: true)` meant "user
 * upload", `(temporary: false, isClientSide: true)` meant
 * "server-ingested consolidated", and `(temporary: undefined,
 * isClientSide: false)` meant "legacy split-format manifest entry".
 *
 * The enum is now the load-bearing field. The legacy booleans are
 * preserved (and still set) so that already-persisted IndexedDB
 * records keep working without a schema migration — `sourceOf()`
 * below derives the source from them when an explicit `source` field
 * isn't present.
 */
export const DATASET_SOURCE = {
  /** Uploaded by the user via the splash page. Lives in IndexedDB. */
  UPLOAD: "upload",
  /**
   * Loaded from the server-side `/data/<consolidated_path>.json`
   * during page bootstrap and ingested into IndexedDB. The wire format
   * is an olmsted-cli consolidated JSON (or .json.gz).
   */
  SERVER_CONSOLIDATED: "server-consolidated",
  /**
   * Legacy auspice-shaped server-side dataset: a manifest entry in
   * `/data/datasets.json` with per-clone and per-tree files served
   * lazily from `/data/clones.{id}.json` and `/data/tree.{ident}.json`.
   * Does not live in IndexedDB.
   */
  SERVER_SPLIT: "server-split"
};

/**
 * Resolve a dataset's source. Prefers the explicit `source` field
 * when present; otherwise derives from the legacy `temporary` /
 * `isClientSide` flag combination so existing IndexedDB records and
 * existing manifest entries continue to work.
 *
 * @param {Object} dataset
 * @returns {string} one of DATASET_SOURCE.*
 */
export const sourceOf = (dataset) => {
  if (!dataset) return DATASET_SOURCE.SERVER_SPLIT;
  if (dataset.source) return dataset.source;
  if (dataset.isClientSide && dataset.temporary) return DATASET_SOURCE.UPLOAD;
  if (dataset.isClientSide) return DATASET_SOURCE.SERVER_CONSOLIDATED;
  return DATASET_SOURCE.SERVER_SPLIT;
};

/**
 * Datasets backed by IndexedDB use the client loader. Server-split
 * datasets fall through to the legacy auspice fetch flow.
 *
 * @param {Object} dataset
 * @returns {boolean}
 */
export const isDatasetInIndexedDB = (dataset) => sourceOf(dataset) !== DATASET_SOURCE.SERVER_SPLIT;

/**
 * Whether the dataset should label as "Local" in the UI Source column.
 *
 * @param {Object} dataset
 * @returns {boolean}
 */
export const isUserUpload = (dataset) => sourceOf(dataset) === DATASET_SOURCE.UPLOAD;
