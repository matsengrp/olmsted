import * as types from "../actions/types";
import { chooseDisplayComponentFromPathname } from "../actions/navigation";

export const getSelectedDatasets = (datasets) => {
  return datasets.filter((dataset) => dataset.loading);
};

// eslint-disable-next-line default-param-last
const datasets = (
  state = {
    // TODO: remove
    s3bucket: "live",
    availableDatasets: [],
    selectedDatasets: [], // Array of dataset IDs selected for batch loading
    pendingDatasetLoads: [], // Array of dataset IDs that need to be loaded from URL query string
    // TODO: remove
    splash: undefined,
    datapath: undefined, // e.g. "laura-mb-v17" or "kate-qrs-v16"
    displayComponent: chooseDisplayComponentFromPathname(window.location.pathname),
    urlPath: window.location.pathname,
    urlQuery: window.location.search,
    errorMessage: undefined
  },
  action
) => {
  switch (action.type) {
    case types.LOADING_DATASET: {
      const updatedAvailableDatasets = state.availableDatasets.map((dataset) => dataset.dataset_id === action.dataset_id ? { ...dataset, loading: action.loading } : dataset);
      return { ...state, availableDatasets: updatedAvailableDatasets };
    }
    case types.PAGE_CHANGE: {
      return {
        ...state,
        displayComponent: action.displayComponent,
        datapath: action.datapath,
        errorMessage: action.errorMessage
      };
    }
    case types.DATASETS_RECEIVED: {
      let { availableDatasets } = action;

      // If preserveLoadingStatus is true, merge with existing loading status
      if (action.preserveLoadingStatus && state.availableDatasets.length > 0) {
        const existingDatasets = new Map(state.availableDatasets.map((d) => [d.dataset_id, d]));
        availableDatasets = action.availableDatasets.map((dataset) => {
          const existing = existingDatasets.get(dataset.dataset_id);
          return existing ? { ...dataset, loading: existing.loading } : dataset;
        });
      }

      return {
        ...state,
        s3bucket: action.s3bucket,
        splash: action.splash,
        availableDatasets,
        user: action.user,
        datapath: action.datapath
      };

      // I guess its ok to keep this, but not sure that what its doing here will make any sense or be necessary once all reorg is said and done
    }
    case types.PROCEED_SANS_MANIFEST: {
      return { ...state, datapath: action.datapath };
    }
    case types.REMOVE_DATASET: {
      // Filter out the removed dataset from availableDatasets
      const filteredDatasets = state.availableDatasets.filter((dataset) => dataset.dataset_id !== action.dataset_id);
      return { ...state, availableDatasets: filteredDatasets };

      // Not sure what this is...
    }
    case types.URL: {
      return {
        ...state,
        urlPath: action.path,
        urlSearch: action.query
      };
    }
    case types.TOGGLE_DATASET_SELECTION: {
      const selectedDatasets = state.selectedDatasets.includes(action.dataset_id)
        ? state.selectedDatasets.filter((id) => id !== action.dataset_id) // Remove if already selected
        : [...state.selectedDatasets, action.dataset_id]; // Add if not selected
      return { ...state, selectedDatasets };
    }
    case types.CLEAR_DATASET_SELECTIONS: {
      return { ...state, selectedDatasets: [] };
    }
    case types.CLEAR_PENDING_DATASET_LOADS: {
      return { ...state, pendingDatasetLoads: [] };
    }
    case types.URL_QUERY_CHANGE_WITH_COMPUTED_STATE: {
      return { ...state, pendingDatasetLoads: action.pendingDatasetLoads || state.pendingDatasetLoads };
    }
    default: {
      return state;
    }
  }
};

export default datasets;
