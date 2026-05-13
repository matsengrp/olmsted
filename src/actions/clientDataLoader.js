/**
 * Client-side data loader that replaces server API calls
 * Uses clientDataStore to load data from browser storage
 */

import * as types from "./types";
import clientDataStore from "../utils/clientDataStore";
import olmstedDB from "../utils/olmstedDB";
import FileProcessor from "../utils/fileProcessor";
import { charonAPIAddress } from "../util/globals";
import { DATASET_SOURCE } from "../constants/datasetSource";

/**
 * Predicate identifying a manifest entry that points at a single
 * consolidated olmsted-cli file (`.json` / `.json.gz`) under the data
 * root, rather than the legacy split-format (per-dataset clones files
 * + per-tree files). The wire contract is a single `consolidated_path`
 * field on the entry.
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
    const response = await fetch(`${charonAPIAddress}/datasets.json`);
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
 * Map a legacy split-format manifest entry into a dispatched dataset
 * record. The data still lives on the server (lazy-loaded per request
 * via the auspice-shaped Charon endpoints), not in IndexedDB.
 */
const mapServerSplitEntryForDispatch = (entry) => ({
  ...entry,
  isClientSide: false,
  source: DATASET_SOURCE.SERVER_SPLIT
});

/**
 * Read IndexedDB + the supplied split-format manifest entries, combine
 * them into a single availableDatasets list, and dispatch.
 */
const dispatchCombinedDatasets = async (dispatch, splitEntries, options = {}) => {
  const clientDatasets = await clientDataStore.getAllDatasets();
  const availableDatasets = [
    ...clientDatasets.map(mapClientDatasetForDispatch),
    ...splitEntries.map(mapServerSplitEntryForDispatch)
  ];
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
 * Fetch a consolidated server-side dataset file (olmsted-cli JSON or .json.gz),
 * route it through the upload pipeline, and store in IndexedDB. Subsequent
 * calls for the same `original_dataset_id` short-circuit.
 *
 * @param {Object} entry - Manifest entry with consolidated_path + dataset_id
 * @returns {Promise<Object|null>} The stored dataset record, or null on failure
 */
export const ingestConsolidatedServerDataset = async (entry) => {
  try {
    const existing = await olmstedDB.findDatasetByOriginalId(entry.dataset_id);
    if (existing) return existing;

    const url = `${charonAPIAddress}/${entry.consolidated_path}`;
    const response = await fetch(url);
    if (!response.ok) {
      console.warn(`Failed to fetch consolidated server dataset at ${url}: ${response.status} ${response.statusText}`);
      return null;
    }

    const blob = await response.blob();
    const filename = entry.consolidated_path.split("/").pop();
    const file = new File([blob], filename, { type: blob.type });
    const result = await FileProcessor.processFile(file);

    // FileProcessor sets source = UPLOAD; override to SERVER_CONSOLIDATED.
    // `temporary` is flipped to false so the Source column reads "Server".
    // `isClientSide` stays true so app.js routes loading via the IndexedDB
    // loader, not the legacy auspice fetch flow.
    if (result.datasets && result.datasets[0]) {
      result.datasets[0].source = DATASET_SOURCE.SERVER_CONSOLIDATED;
      result.datasets[0].temporary = false;
    }

    await clientDataStore.storeProcessedData(result);
    return result.datasets[0];
  } catch (error) {
    console.warn(`Failed to ingest consolidated server dataset ${entry.dataset_id}:`, error);
    return null;
  }
};

/**
 * Ingest the consolidated entries from a manifest sequentially, then
 * re-dispatch once any were stored so newly-arrived datasets surface
 * in the UI without a page reload. Background work — callers don't
 * need to await this.
 *
 * @param {Array<Object>} consolidatedEntries
 * @param {Array<Object>} splitEntries - passed through to the re-dispatch
 * @param {Function} dispatch
 */
const ingestAndDispatch = async (consolidatedEntries, splitEntries, dispatch) => {
  let ingestedAny = false;
  for (const entry of consolidatedEntries) {
    // Sequential to avoid hammering the dev server with many parallel
    // fetch+ingest cycles on first page load.
    const stored = await ingestConsolidatedServerDataset(entry);
    if (stored) ingestedAny = true;
  }
  if (ingestedAny) {
    await dispatchCombinedDatasets(dispatch, splitEntries);
  }
};

/**
 * Read /data/datasets.json and ingest any entries with consolidated_path.
 * Kept as an exported helper for tests; the production code path goes
 * through `getClientDatasets` instead, which is non-blocking.
 *
 * @returns {Promise<Array>} split-only entries, or [] on any failure
 */
export const ingestConsolidatedServerDatasets = async () => {
  const manifest = await fetchManifest();
  if (!manifest) return [];
  const consolidatedEntries = manifest.filter(isConsolidatedEntry);
  const splitEntries = manifest.filter((d) => !isConsolidatedEntry(d));
  for (const entry of consolidatedEntries) {
    await ingestConsolidatedServerDataset(entry);
  }
  return splitEntries;
};

/**
 * Get datasets list from client storage (replaces server getDatasets).
 * Single manifest fetch, dispatches an initial combined client +
 * server-split list immediately, then ingests consolidated server
 * datasets in the background and re-dispatches when each arrives.
 *
 * @param {Function} dispatch - Redux dispatch function
 * @param {string} _s3bucket - Legacy parameter for server compatibility (ignored)
 */
export const getClientDatasets = async (dispatch, _s3bucket = "live") => {
  try {
    const manifest = (await fetchManifest()) || [];
    const splitEntries = manifest.filter((d) => !isConsolidatedEntry(d));
    const consolidatedEntries = manifest.filter(isConsolidatedEntry);

    // Initial dispatch with whatever's already in IndexedDB + the
    // split-format manifest entries. Don't wait on consolidated ingest.
    await dispatchCombinedDatasets(dispatch, splitEntries);

    // Background: fetch + ingest each consolidated dataset, then
    // re-dispatch so the new IndexedDB rows surface in the UI.
    if (consolidatedEntries.length > 0) {
      ingestAndDispatch(consolidatedEntries, splitEntries, dispatch);
    }
  } catch (error) {
    console.error("Error loading client datasets:", error);
    // Last-resort fallback: dispatch whatever's in IndexedDB alone.
    try {
      await dispatchCombinedDatasets(dispatch, []);
    } catch (innerError) {
      console.error("Failed to load client datasets:", innerError);
      dispatch({ type: types.DATASETS_RECEIVED, availableDatasets: [] });
    }
  }
};

/**
 * Smart data loader that tries client storage first, then server
 * @param {Function} dispatch - Redux dispatch function
 * @param {string} dataType - Type of data ('datasets', 'clones', 'tree')
 * @param {string} identifier - Data identifier (dataset_id or tree_id)
 */
export const loadDataSmart = (dispatch, dataType, identifier = null) => {
  switch (dataType) {
    case "datasets":
      return getClientDatasets(dispatch);
    case "clones":
      if (identifier) {
        return getClientClonalFamilies(dispatch, identifier);
      }
      return null;
    case "tree":
      if (identifier) {
        return getClientTree(dispatch, identifier);
      }
      return null;
    default:
      console.warn("Unknown data type for smart loading:", dataType);
      return null;
  }
};

/**
 * Clear all client-side data
 * @param {Function} dispatch - Redux dispatch function
 */
export const clearClientData = (dispatch) => {
  clientDataStore.clearAllData();
  console.log("Cleared all client-side data");

  // Reload datasets so the UI reflects the now-empty IndexedDB plus
  // whatever's in the server manifest.
  getClientDatasets(dispatch);
};
