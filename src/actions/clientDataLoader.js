/**
 * Client-side data loader that replaces server API calls
 * Uses clientDataStore to load data from browser storage
 */

import * as types from "./types";
import clientDataStore from "../utils/clientDataStore";

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
 * Get datasets list from client storage (replaces server getDatasets)
 * @param {Function} dispatch - Redux dispatch function
 * @param {string} s3bucket - Legacy parameter for server compatibility (ignored)
 */
export const getClientDatasets = async (dispatch, s3bucket = "live") => {
  try {
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
    loadServerDatasets(dispatch);
  } catch (error) {
    console.error("Error loading client datasets:", error);
    // Fallback to server-only loading
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
          } catch (error) {
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
    const { charonAPIAddress } = require("../util/globals");
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
      break;
    case "tree":
      if (identifier) {
        return getClientTree(dispatch, identifier);
      }
      break;
    default:
      console.warn("Unknown data type for smart loading:", dataType);
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
