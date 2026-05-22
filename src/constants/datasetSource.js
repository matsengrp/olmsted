/**
 * Where a dataset originated. Drives the UI Source column label.
 *
 * The enum is the load-bearing field. Legacy `temporary` / `isClientSide`
 * booleans are still set on persisted IndexedDB records and `sourceOf()`
 * derives the source from them when an explicit `source` field isn't
 * present.
 */
export const DATASET_SOURCE = {
  /** Uploaded by the user via the splash page. Lives in IndexedDB. */
  UPLOAD: "upload",
  /**
   * Loaded from the server-side `/data/<consolidated_path>.json`
   * during page bootstrap and ingested into IndexedDB. The wire format
   * is an olmsted-cli consolidated JSON (or .json.gz).
   */
  SERVER_CONSOLIDATED: "server-consolidated"
};

/**
 * Resolve a dataset's source. Prefers the explicit `source` field
 * when present; otherwise UPLOAD requires `temporary === true`
 * explicitly so records with ambiguous flags fall back to the
 * non-deletable SERVER_CONSOLIDATED classification.
 *
 * @param {Object} dataset
 * @returns {string} one of DATASET_SOURCE.*
 */
export const sourceOf = (dataset) => {
  if (!dataset) return DATASET_SOURCE.SERVER_CONSOLIDATED;
  if (dataset.source) return dataset.source;
  if (dataset.temporary === true) return DATASET_SOURCE.UPLOAD;
  return DATASET_SOURCE.SERVER_CONSOLIDATED;
};

/**
 * Whether the dataset should label as "Local" in the UI Source column.
 *
 * @param {Object} dataset
 * @returns {boolean}
 */
export const isUserUpload = (dataset) => sourceOf(dataset) === DATASET_SOURCE.UPLOAD;
