import * as types from "../actions/types";
import { chooseDisplayComponentFromPathname } from "../actions/navigation";

const datasets = (state = {
  s3bucket: "live",
  availableDatasets: undefined,
  splash: undefined,
  datapath: undefined, // e.g. "laura-mb-v17" or "kate-qrs-v16"
  displayComponent: chooseDisplayComponentFromPathname(window.location.pathname),
  urlPath: window.location.pathname,
  urlQuery: window.location.search,
  errorMessage: undefined
}, action) => {
  switch (action.type) {

    case types.DATASETS_RECEIVED: {
      return Object.assign({}, state, {
        s3bucket: action.s3bucket,
        splash: action.splash,
        availableDatasets: action.availableDatasets,
        user: action.user,
        datapath: action.datapath});

    } case types.TOGGLE_DATASET: {
      var toggled = action.dataset;
      console.log("Reducer fired; state: ", state.availableDatasets);
      Object.assign(toggled, {selected: !action.dataset.selected});
      return Object.assign({}, state, {
        availableDatasets: Object.assign(state.availableDatasets, toggled),
        datapath: action.datapath,
        errorMessage: action.errorMessage
      });
    
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
