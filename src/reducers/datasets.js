import * as types from "../actions/types";
import { chooseDisplayComponentFromPathname } from "../actions/navigation";

export const getSelectedDatasets = (datasets) => {
  return datasets.filter((dataset) => dataset.loading);
};

/* eslint-disable default-param-last */
const datasets = (
  state = {
    availableDatasets: [],
    selectedDatasets: [], // Array of dataset IDs selected for batch loading
    pendingDatasetLoads: [], // Array of dataset IDs that need to be loaded from URL query string
    starredDatasets: [], // Array of dataset IDs that are starred/favorited
    displayComponent: chooseDisplayComponentFromPathname(window.location.pathname),
    urlPath: window.location.pathname,
    urlQuery: window.location.search,
    errorMessage: undefined
  },
  action
) => {
  /* eslint-enable default-param-last */
  switch (action.type) {
    case types.LOADING_DATASET: {
      const updatedAvailableDatasets = state.availableDatasets.map((dataset) =>
        dataset.dataset_id === action.dataset_id ? { ...dataset, loading: action.loading } : dataset
      );
      return { ...state, availableDatasets: updatedAvailableDatasets };
    }
    case types.PAGE_CHANGE: {
      return {
        ...state,
        displayComponent: action.displayComponent,
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
        availableDatasets,
        user: action.user
      };
    }
    case types.REMOVE_DATASET: {
      const filteredDatasets = state.availableDatasets.filter((dataset) => dataset.dataset_id !== action.dataset_id);
      return { ...state, availableDatasets: filteredDatasets };
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
    case types.SET_PENDING_DATASET_LOADS: {
      return { ...state, pendingDatasetLoads: action.datasetIds || [] };
    }
    case types.URL_QUERY_CHANGE_WITH_COMPUTED_STATE: {
      return { ...state, pendingDatasetLoads: action.pendingDatasetLoads || state.pendingDatasetLoads };
    }
    case types.TOGGLE_STARRED_DATASET: {
      const { dataset_id } = action;
      const isStarred = state.starredDatasets.includes(dataset_id);
      const newStarredDatasets = isStarred
        ? state.starredDatasets.filter((id) => id !== dataset_id)
        : [...state.starredDatasets, dataset_id];
      // Persist to sessionStorage
      try {
        sessionStorage.setItem("olmsted_starred_datasets", JSON.stringify(newStarredDatasets));
      } catch (e) {
        console.warn("Failed to persist starred datasets to sessionStorage:", e);
      }
      return { ...state, starredDatasets: newStarredDatasets };
    }
    case types.CLEAR_STARRED_DATASETS: {
      try {
        sessionStorage.removeItem("olmsted_starred_datasets");
      } catch (e) {
        console.warn("Failed to clear starred datasets from sessionStorage:", e);
      }
      return { ...state, starredDatasets: [] };
    }
    case types.SET_STARRED_DATASETS: {
      return { ...state, starredDatasets: action.starredDatasets || [] };
    }
    default: {
      return state;
    }
  }
};

export default datasets;
