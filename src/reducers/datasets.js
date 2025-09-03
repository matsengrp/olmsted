import * as types from "../actions/types";
import { chooseDisplayComponentFromPathname } from "../actions/navigation";

export const getSelectedDatasets = (datasets) => {
  return datasets.filter((dataset) => dataset.loading);
};

const datasets = (state = {

  // TODO: remove
  s3bucket: "live",
  availableDatasets: [],
  selectedDatasets: [], // Array of dataset IDs selected for batch loading
  // TODO: remove
  splash: undefined,
  datapath: undefined, // e.g. "laura-mb-v17" or "kate-qrs-v16"
  displayComponent: chooseDisplayComponentFromPathname(window.location.pathname),
  urlPath: window.location.pathname,
  urlQuery: window.location.search,
  errorMessage: undefined
}, action) => {
  switch (action.type) {
    case types.LOADING_DATASET: {
      const updatedAvailableDatasets = state.availableDatasets.map((dataset) => (dataset.dataset_id === action.dataset_id)
        ? {...dataset, loading: action.loading}
        : dataset);
      return Object.assign({}, state, {availableDatasets: updatedAvailableDatasets });
    } case types.PAGE_CHANGE: {
      return Object.assign({}, state, {
        displayComponent: action.displayComponent,
        datapath: action.datapath,
        errorMessage: action.errorMessage
      });
    }
    case types.DATASETS_RECEIVED: {
      return Object.assign({}, state, {
        s3bucket: action.s3bucket,
        splash: action.splash,
        availableDatasets: action.availableDatasets,
        user: action.user,
        datapath: action.datapath
      });

    // I guess its ok to keep this, but not sure that what its doing here will make any sense or be necessary once all reorg is said and done
    } case types.PROCEED_SANS_MANIFEST: {
      return Object.assign({}, state, {datapath: action.datapath});

    } case types.REMOVE_DATASET: {
      // Filter out the removed dataset from availableDatasets
      const filteredDatasets = state.availableDatasets.filter(
        (dataset) => dataset.dataset_id !== action.dataset_id
      );
      return Object.assign({}, state, {
        availableDatasets: filteredDatasets
      });

    // Not sure what this is...
    } case types.URL: {
      return Object.assign({}, state, {
        urlPath: action.path,
        urlSearch: action.query
      });

    } case types.TOGGLE_DATASET_SELECTION: {
      const selectedDatasets = state.selectedDatasets.includes(action.dataset_id)
        ? state.selectedDatasets.filter(id => id !== action.dataset_id) // Remove if already selected
        : [...state.selectedDatasets, action.dataset_id]; // Add if not selected
      return Object.assign({}, state, { selectedDatasets });

    } case types.CLEAR_DATASET_SELECTIONS: {
      return Object.assign({}, state, { selectedDatasets: [] });

    } default: {
      return state;
    }
  }
};

export default datasets;
