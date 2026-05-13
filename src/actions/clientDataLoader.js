/**
 * Client-side data loader that replaces server API calls
 * Uses clientDataStore to load data from browser storage
 */

import * as types from "./types";
import clientDataStore from "../utils/clientDataStore";
import olmstedDB from "../utils/olmstedDB";
import FileProcessor from "../utils/fileProcessor";
import { charonAPIAddress } from "../util/globals";

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
    await clientDataStore.storeProcessedData(result);
    return result.datasets[0];
  } catch (error) {
    console.warn(`Failed to ingest consolidated server dataset ${entry.dataset_id}:`, error);
    return null;
  }
};

/**
 * Read /data/datasets.json and ingest any entries that point at a consolidated
 * olmsted-cli file via `consolidated_path`. Returns the list of split-only
 * manifest entries (those without consolidated_path), so the caller can
 * continue with the legacy split-format flow for them.
 *
 * @returns {Promise<Array>} split-only entries, or [] on any failure
 */
export const ingestConsolidatedServerDatasets = async () => {
  try {
    const response = await fetch(`${charonAPIAddress}/datasets.json`);
    if (!response.ok) return [];
    const manifest = await response.json();
    if (!Array.isArray(manifest)) return [];

    const consolidated = manifest.filter((d) => d.consolidated_path);
    const splitOnly = manifest.filter((d) => !d.consolidated_path);

    for (const entry of consolidated) {
      // Sequential to avoid hammering the same Express dev server with many
      // parallel fetch+ingest cycles on first page load.
      await ingestConsolidatedServerDataset(entry);
    }

    return splitOnly;
  } catch (error) {
    console.warn("Failed to load consolidated server datasets:", error);
    return [];
  }
};

/**
 * Get datasets list from client storage (replaces server getDatasets)
 * @param {Function} dispatch - Redux dispatch function
 * @param {string} _s3bucket - Legacy parameter for server compatibility (ignored)
 */
export const getClientDatasets = async (dispatch, _s3bucket = "live") => {
  try {
    // Ingest any consolidated-format server datasets first. After this, those
    // entries are in IndexedDB and surface naturally through the client list.
    // The returned list is the split-only manifest entries (auspice-shaped),
    // which the existing loadServerDatasets path continues to handle.
    await ingestConsolidatedServerDatasets();

    const clientDatasets = await clientDataStore.getAllDatasets();

    // Process client datasets
    const availableDatasets = clientDatasets.map((dataset) => ({
      ...dataset,
      isClientSide: true, // Mark as client-side for UI distinction
      temporary: true
    }));

    if (availableDatasets.length > 0) {
      // If we have client datasets, dispatch them immediately
      dispatch({
        type: types.DATASETS_RECEIVED,
        availableDatasets,
        preserveLoadingStatus: true // Preserve existing loading status when updating datasets
      });
    }

    // Always attempt to load server datasets in parallel
    // This allows mixing client-side uploaded data with server-side data
    // eslint-disable-next-line no-use-before-define
    loadServerDatasets(dispatch);
  } catch (error) {
    console.error("Error loading client datasets:", error);
    // Fallback to server-only loading
    // eslint-disable-next-line no-use-before-define
    loadServerDatasets(dispatch);
  }
};

/**
 * Load server datasets (original functionality)
 * This allows mixing client-side and server-side data
 */
const loadServerDatasets = async (dispatch) => {
  // Helper function to get client datasets and format them
  const getClientOnlyDatasets = async () => {
    const clientDatasets = await clientDataStore.getAllDatasets();
    return clientDatasets.map((d) => ({
      ...d,
      isClientSide: true,
      temporary: true
    }));
  };

  try {
    // Get client datasets first
    const clientDatasets = await getClientOnlyDatasets();

    // Use the original server loading logic as fallback
    const request = new XMLHttpRequest();

    request.onload = () => {
      if (request.readyState === 4 && request.status === 200) {
        // Check if response is JSON before trying to parse
        const contentType = request.getResponseHeader("content-type");
        const isJson = contentType && contentType.includes("application/json");

        if (isJson || request.responseText.trim().startsWith("[") || request.responseText.trim().startsWith("{")) {
          try {
            const serverDatasets = JSON.parse(request.responseText);

            // Combine client and server datasets
            const combinedDatasets = [...clientDatasets, ...serverDatasets.map((d) => ({ ...d, isClientSide: false }))];

            dispatch({
              type: types.DATASETS_RECEIVED,
              availableDatasets: combinedDatasets
            });

            console.log("Combined datasets loaded:", {
              client: clientDatasets.length,
              server: serverDatasets.length,
              total: combinedDatasets.length
            });
          } catch (_error) {
            // Silently fall back to client-only datasets
            if (clientDatasets.length > 0) {
              dispatch({
                type: types.DATASETS_RECEIVED,
                availableDatasets: clientDatasets,
                preserveLoadingStatus: true
              });
            }
          }
        } else {
          // Response is not JSON (likely HTML error page), use client-only datasets
          dispatch({
            type: types.DATASETS_RECEIVED,
            availableDatasets: clientDatasets,
            preserveLoadingStatus: true
          });
        }
      } else {
        // Server request failed, use client-only datasets
        dispatch({
          type: types.DATASETS_RECEIVED,
          availableDatasets: clientDatasets,
          preserveLoadingStatus: true
        });
      }
    };

    request.onerror = () => {
      // Network error, use client-only datasets
      dispatch({
        type: types.DATASETS_RECEIVED,
        availableDatasets: clientDatasets,
        preserveLoadingStatus: true
      });
    };

    // Load from server API (original endpoint)
    request.open("get", `${charonAPIAddress}/datasets.json`, true);
    request.send(null);
  } catch (error) {
    // If even client dataset loading fails, dispatch empty array
    console.error("Failed to load client datasets:", error);
    dispatch({
      type: types.DATASETS_RECEIVED,
      availableDatasets: []
    });
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

  // Reload datasets to show only server data
  loadServerDatasets(dispatch);
};
