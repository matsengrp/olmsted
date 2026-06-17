/**
 * Client-side data loader that replaces server API calls
 * Uses clientDataStore to load data from browser storage
 */

import * as types from "./types";
import clientDataStore from "../utils/clientDataStore";
import olmstedDB from "../utils/olmstedDB";
import FileProcessor from "../utils/fileProcessor";
import { DATASET_SOURCE } from "../constants/datasetSource";

/* Base path for server-hosted dataset files (formerly in the deleted util/globals.js). */
const dataBaseURL = "/data";

/**
 * Predicate identifying a manifest entry that points at a single
 * consolidated olmsted-cli file (`.json` / `.json.gz`). The wire
 * contract is a single `consolidated_path` field on the entry.
 */
const isConsolidatedEntry = (entry) => Boolean(entry && entry.consolidated_path);

/**
 * Fetch the `/data/datasets.json` manifest once. Returns the parsed
 * array, or null on any failure (network, non-OK status, non-JSON
 * body, non-array shape). The caller decides how to handle the
 * absence of a manifest — the typical answer is "use whatever's in
 * IndexedDB and skip server datasets."
 */
const fetchManifest = async () => {
  try {
    const response = await fetch(`${dataBaseURL}/datasets.json`);
    if (!response.ok) return null;
    const manifest = await response.json();
    return Array.isArray(manifest) ? manifest : null;
  } catch (err) {
    console.warn("Failed to fetch server manifest:", err);
    return null;
  }
};

/**
 * Normalize a dataset record (from IndexedDB) for dispatch. Defaults
 * to upload-style flags but respects any stored values via `??` so
 * server-ingested entries keep their `temporary: false` marker. Also
 * ensures `source` is set (derived from legacy flags for back-compat
 * with records persisted before the source enum landed).
 */
const mapClientDatasetForDispatch = (dataset) => ({
  ...dataset,
  isClientSide: dataset.isClientSide ?? true,
  temporary: dataset.temporary ?? true,
  source: dataset.source ?? (dataset.temporary === false ? DATASET_SOURCE.SERVER_CONSOLIDATED : DATASET_SOURCE.UPLOAD)
});

/**
 * Read IndexedDB datasets and dispatch them as availableDatasets.
 */
const dispatchClientDatasets = async (dispatch, options = {}) => {
  const clientDatasets = await clientDataStore.getAllDatasets();
  const availableDatasets = clientDatasets.map(mapClientDatasetForDispatch);
  dispatch({
    type: types.DATASETS_RECEIVED,
    availableDatasets,
    preserveLoadingStatus: options.preserveLoadingStatus ?? true
  });
};

/**
 * Get tree data from client storage (replaces server getTree)
 * Now loads full tree with sequences on demand (lazy loading)
 * @param {Function} dispatch - Redux dispatch function
 * @param {string} tree_id - Tree identifier
 */
export const getClientTree = async (dispatch, tree_id) => {
  try {
    console.log(`ClientDataLoader: Loading full tree data for ${tree_id} (on demand)`);

    // This loads the complete tree with all sequence data
    const tree = await clientDataStore.getTree(tree_id);

    if (tree) {
      dispatch({
        type: types.TREE_RECEIVED,
        tree_id,
        tree
      });

      const treeSize = JSON.stringify(tree).length;
      console.log(`ClientDataLoader: Loaded tree ${tree_id} (${(treeSize / 1024).toFixed(1)}KB)`);
    } else {
      console.warn("Tree not found in client storage:", tree_id);
      dispatch({
        type: types.TREE_ERROR,
        tree_id,
        error: "Tree not found in client storage"
      });
    }
  } catch (error) {
    console.error("Error loading tree from client storage:", error);
    dispatch({
      type: types.TREE_ERROR,
      tree_id,
      error: error.message
    });
  }
};

/**
 * Get clonal families from client storage (replaces server getClonalFamilies)
 * Now loads lightweight metadata only - trees loaded on demand
 * @param {Function} dispatch - Redux dispatch function
 * @param {string} dataset_id - Dataset identifier
 */
export const getClientClonalFamilies = async (dispatch, dataset_id) => {
  try {
    console.log(`ClientDataLoader: Loading clone families for ${dataset_id} (metadata only)`);

    // This now loads only lightweight clone metadata, not full trees
    const clonalFamilies = await clientDataStore.getClones(dataset_id);

    if (clonalFamilies && clonalFamilies.length > 0) {
      dispatch({
        type: types.CLONAL_FAMILIES_RECEIVED,
        dataset_id,
        clonalFamilies
      });
      dispatch({
        type: types.LOADING_DATASET,
        dataset_id,
        loading: "DONE"
      });

      console.log(
        `ClientDataLoader: Loaded ${clonalFamilies.length} clone families (${(JSON.stringify(clonalFamilies).length / 1024).toFixed(1)}KB)`
      );
    } else {
      console.warn("Clonal families not found in client storage:", dataset_id);
      dispatch({
        type: types.LOADING_DATASET,
        dataset_id,
        loading: "ERROR"
      });
    }
  } catch (error) {
    console.error("Error loading clonal families from client storage:", error);
    dispatch({
      type: types.LOADING_DATASET,
      dataset_id,
      loading: "ERROR"
    });
  }
};

/**
 * In-flight ingest promises keyed by manifest `dataset_id` (which becomes
 * the persisted `original_dataset_id`). Two concurrent callers ingesting
 * the same entry share one fetch+store pass so we never race in front of
 * `findDatasetByOriginalId` and write two rows for the same source dataset.
 *
 * This matters because `Monitor.componentDidMount` and
 * `App.componentDidMount` both call `getClientDatasets` on initial mount
 * — they fire close enough together that neither sees the other's writes
 * before kicking off ingest.
 */
const inflightIngest = new Map();

/**
 * Fetch a consolidated server-side dataset file (olmsted-cli JSON or .json.gz),
 * route it through the upload pipeline, and store in IndexedDB. Subsequent
 * calls for the same `original_dataset_id` short-circuit. Concurrent calls
 * for the same id share one in-flight promise.
 *
 * @param {Object} entry - Manifest entry with consolidated_path + dataset_id
 * @returns {Promise<Object|null>} The stored dataset record, or null on failure
 */
export const ingestConsolidatedServerDataset = async (entry) => {
  const existingInflight = inflightIngest.get(entry.dataset_id);
  if (existingInflight) return existingInflight;

  const ingestPromise = (async () => {
    try {
      const existing = await olmstedDB.findDatasetByOriginalId(entry.dataset_id);
      if (existing) return existing;

      const url = `${dataBaseURL}/${entry.consolidated_path}`;
      const response = await fetch(url);
      if (!response.ok) {
        console.warn(
          `Failed to fetch consolidated server dataset at ${url}: ${response.status} ${response.statusText}`
        );
        return null;
      }

      const blob = await response.blob();
      const filename = entry.consolidated_path.split("/").pop();
      const file = new File([blob], filename, { type: blob.type });
      const result = await FileProcessor.processFile(file);

      // FileProcessor sets source = UPLOAD; override to SERVER_CONSOLIDATED.
      // `temporary` is flipped to false so the Source column reads "Server".
      // The manifest entry's `name` is authoritative — without overriding,
      // a rename in the manifest that wasn't matched by a rebuild of the
      // consolidated file would store the file's internal name, then
      // reconcile's rename trigger would fire on every load (perpetual
      // re-fetch loop).
      if (result.datasets && result.datasets[0]) {
        result.datasets[0].source = DATASET_SOURCE.SERVER_CONSOLIDATED;
        result.datasets[0].temporary = false;
        if (entry.name) result.datasets[0].name = entry.name;
      }

      // storeProcessedData returns the actual storage dataset_id — which
      // is the existing row's id if the storage-layer dedup short-circuited,
      // not the throwaway from FileProcessor. Patch the returned object so
      // callers that read `.dataset_id` see what's actually in IndexedDB.
      const storedDatasetId = await clientDataStore.storeProcessedData(result);
      result.datasets[0].dataset_id = storedDatasetId;
      return result.datasets[0];
    } catch (error) {
      console.warn(`Failed to ingest consolidated server dataset ${entry.dataset_id}:`, error);
      return null;
    }
  })();

  inflightIngest.set(entry.dataset_id, ingestPromise);
  try {
    return await ingestPromise;
  } finally {
    inflightIngest.delete(entry.dataset_id);
  }
};

/**
 * Ingest the consolidated entries from a manifest sequentially, then
 * re-dispatch once any were stored so newly-arrived datasets surface
 * in the UI without a page reload. Background work — callers don't
 * need to await this.
 */
const ingestAndDispatch = async (consolidatedEntries, dispatch) => {
  let ingestedAny = false;
  for (const entry of consolidatedEntries) {
    // Sequential to avoid hammering the dev server with many parallel
    // fetch+ingest cycles on first page load.
    const stored = await ingestConsolidatedServerDataset(entry);
    if (stored) ingestedAny = true;
  }
  if (ingestedAny) {
    await dispatchClientDatasets(dispatch);
  }
};

/**
 * Reconcile IndexedDB SERVER_CONSOLIDATED entries against the live
 * manifest. Four operations:
 *
 *   1. Dedup: when multiple cached rows share an `original_dataset_id`
 *      (race-induced from concurrent ingest calls), keep the oldest
 *      and delete the rest. This cleans up duplicates created before
 *      the `inflightIngest` gate landed in `ingestConsolidatedServerDataset`,
 *      and is cheap insurance against any future re-introduction of the
 *      race.
 *   2. Sweep: any cached server-side dataset whose `original_dataset_id`
 *      no longer appears in the manifest is deleted.
 *   3. Refresh-on-rename: any cached server-side dataset whose manifest
 *      entry's `name` differs from the cached `name` is deleted, so the
 *      subsequent ingest pass re-fetches it with the current metadata.
 *   4. Heal-wiped-trees: any cached server-side dataset whose clones are
 *      present but whose trees are absent is deleted. This recovers
 *      users whose trees were collateral-damaged by the pre-fix
 *      `removeDataset` cascade (deleted trees by clone_id rather than
 *      namespaced ident; sibling datasets sharing clone_ids lost their
 *      trees). The ingest pass re-fetches the file fresh.
 *
 * Cached records without `original_dataset_id` (legacy / malformed) are
 * skipped — better to leave them than risk deleting data we can't match.
 *
 * UPLOAD entries are never touched: they're filtered out at the source
 * by `getServerConsolidatedDatasets`. Callers must skip this helper
 * entirely when the manifest fetch failed (manifest === null) so a
 * transient network error doesn't wipe the cache.
 *
 * @param {Array<{dataset_id: string, name?: string}>} manifestEntries
 *   consolidated entries from the manifest (each must have `dataset_id`;
 *   `name` is required for the rename trigger but build-datasets-manifest
 *   always emits it from dataset metadata)
 * @returns {Promise<void>}
 */
export const reconcileServerConsolidated = async (manifestEntries) => {
  const entryByOriginalId = new Map(manifestEntries.map((e) => [e.dataset_id, e]));
  const cached = await olmstedDB.getServerConsolidatedDatasets();

  // Group by original_dataset_id and delete duplicates within each group,
  // keeping the lexicographically-smallest storage dataset_id (which is
  // the timestamp-prefixed value from `generateDatasetId`, so smallest =
  // oldest). The survivors carry forward into the sweep/refresh logic.
  const byOriginalId = new Map();
  for (const ds of cached) {
    if (!ds.original_dataset_id) continue;
    const group = byOriginalId.get(ds.original_dataset_id) ?? [];
    group.push(ds);
    byOriginalId.set(ds.original_dataset_id, group);
  }
  const survivors = [];
  for (const group of byOriginalId.values()) {
    group.sort((a, b) => a.dataset_id.localeCompare(b.dataset_id));
    survivors.push(group[0]);
    for (const dup of group.slice(1)) {
      await clientDataStore.removeDataset(dup.dataset_id);
    }
  }

  for (const ds of survivors) {
    const manifestEntry = entryByOriginalId.get(ds.original_dataset_id);
    const removed = !manifestEntry;
    const renamed = manifestEntry && manifestEntry.name && manifestEntry.name !== ds.name;
    // Short-circuit: only check IndexedDB for the orphan condition when
    // the dataset would otherwise survive (no point doing two extra
    // queries per dataset we're about to delete anyway).
    const treesWiped = !removed && !renamed && (await olmstedDB.hasOrphanedClones(ds.dataset_id));
    if (removed || renamed || treesWiped) {
      await clientDataStore.removeDataset(ds.dataset_id);
    }
  }
};

/**
 * Read /data/datasets.json and ingest any entries with consolidated_path.
 * Kept as an exported helper for tests; the production code path goes
 * through `getClientDatasets` instead, which is non-blocking.
 */
export const ingestConsolidatedServerDatasets = async () => {
  const manifest = await fetchManifest();
  if (!manifest) return;
  const consolidatedEntries = manifest.filter(isConsolidatedEntry);
  for (const entry of consolidatedEntries) {
    await ingestConsolidatedServerDataset(entry);
  }
};

/**
 * Get datasets list from client storage (replaces server getDatasets).
 * Dispatches whatever's in IndexedDB immediately, then ingests any
 * consolidated server datasets in the background and re-dispatches
 * when each arrives.
 *
 * @param {Function} dispatch - Redux dispatch function
 */
export const getClientDatasets = async (dispatch) => {
  try {
    const manifest = await fetchManifest();
    const consolidatedEntries = (manifest || []).filter(isConsolidatedEntry);

    // Reconcile cache with the manifest *before* the initial dispatch so
    // the splash table reflects the live state on first paint. Skipped
    // when the manifest fetch failed (manifest === null) — a transient
    // network error must not wipe cached server-side datasets.
    //
    // The `await` here is load-bearing: the subsequent ingest pass
    // short-circuits on `findDatasetByOriginalId`, so renamed-and-deleted
    // entries must be committed to IndexedDB before ingest runs.
    if (manifest !== null) {
      await reconcileServerConsolidated(consolidatedEntries);
    }

    // Initial dispatch with whatever's now in IndexedDB. Don't wait
    // on consolidated ingest.
    await dispatchClientDatasets(dispatch);

    // Background: fetch + ingest each consolidated dataset, then
    // re-dispatch so the new IndexedDB rows surface in the UI.
    if (consolidatedEntries.length > 0) {
      ingestAndDispatch(consolidatedEntries, dispatch);
    }
  } catch (error) {
    console.error("Error loading client datasets:", error);
    try {
      await dispatchClientDatasets(dispatch);
    } catch (innerError) {
      console.error("Failed to load client datasets:", innerError);
      dispatch({ type: types.DATASETS_RECEIVED, availableDatasets: [] });
    }
  }
};
