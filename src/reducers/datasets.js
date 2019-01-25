import * as types from "../actions/types";
import { chooseDisplayComponentFromPathname } from "../actions/navigation";

export const getSelectedDatasets = (datasets) => {
  return datasets.filter(dataset => dataset.loading);
};

const datasets = (state = {
  
  // TODO: remove
  s3bucket: "live",
  availableDatasets: [],
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
      var updatedAvailableDatasets = state.availableDatasets.map(dataset =>
        (dataset.id === action.dataset_id)
          ? {...dataset, loading: action.loading}
          : dataset
      )
      return Object.assign({}, state, {
        availableDatasets: updatedAvailableDatasets })
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
        datapath: action.datapath});
    
    // I guess its ok to keep this, but not sure that what its doing here will make any sense or be necessary once all reorg is said and done
    } case types.PROCEED_SANS_MANIFEST: {
      return Object.assign({}, state, {datapath: action.datapath});

    // Not sure what this is...
    } case types.URL: {
      return Object.assign({}, state, {
        urlPath: action.path,
        urlSearch: action.query
      });

    } default: {
      return state;
    }
  }
};

export default datasets;
