import queryString from "query-string";
import * as types from "./types";
import { charonAPIAddress } from "../util/globals";
import { getDatapath, goTo404, chooseDisplayComponentFromPathname } from "./navigation";
import { createStateFromQueryOrJSONs } from "./recomputeReduxState";
import parseParams, { createDatapathForSecondSegment } from "../util/parseParams";
import { timerStart, timerEnd } from "../util/perf";
import { browserBackForward } from "../actions/navigation";

const charonErrorHandler = () => {
  console.warn("Failed to get manifest JSON from server");
  const datapath = window.location.pathname.replace(/^\//, '').replace(/\/$/, '').replace('/', '_');
  dispatch({type: types.PROCEED_SANS_MANIFEST, datapath});
};


export const getTree = (dispatch, tree_id) => {
  const processData = (data, tree_id) => {
    let tree
    try{
      tree = JSON.parse(data);
      // timerEnd("LOADING CLONAL FAMILIES (including JSON.parse)", "clonal families loaded", clonalFamilies.length)
    } catch( err ){
      alert("Failed parsing json for " + tree_id +
      ". This means either the data file wasnt found and index.html was returned or there was an error writing the data file")
      console.log(data.substring(0,100))
    }

    dispatch({
      type: types.TREE_RECEIVED,
      tree_id,
      tree
    });
  };

  const request = new XMLHttpRequest();
  request.onload = () => {
    if (request.readyState === 4 && request.status === 200) {
      processData(request.responseText, tree_id);
    } else {
      charonErrorHandler();
    }
  };

  request.onerror = charonErrorHandler;
  request.open("get", `${charonAPIAddress}/tree.${tree_id}.json`, true); // true for asynchronous

  request.send(null);
  // timerStart("LOADING CLONAL FAMILIES (including JSON.parse)")

};

export const getClonalFamilies = (dispatch, dataset_id) => {
  const processData = (data, dataset_id) => {
    let clonalFamilies = []
    try{
      clonalFamilies = JSON.parse(data);
      // timerEnd("LOADING CLONAL FAMILIES (including JSON.parse)", "clonal families loaded", clonalFamilies.length)
    } catch( err ){
      alert("Failed parsing json for " + dataset_id +
      ". This means either the data file wasnt found and index.html was returned or there was an error writing the data file")
      console.log(data.substring(0,100))
    }
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
  };

  const query = queryString.parse(window.location.search);
  const user = Object.keys(query).indexOf("user") === -1 ? "guest" : query.user;
  const request = new XMLHttpRequest();
  request.onload = () => {
    if (request.readyState === 4 && request.status === 200) {
      processData(request.responseText, dataset_id);
    } else {
      charonErrorHandler();
    }
  };

  request.onerror = charonErrorHandler;
  request.open("get", `${charonAPIAddress}/clones.${dataset_id}.json`, true); // true for asynchronous

  request.send(null);
  // timerStart("LOADING CLONAL FAMILIES (including JSON.parse)")

};

export const getDatasets = (dispatch, s3bucket = "live") => {
  const processData = (data, query) => {
    // console.log("SERVER API REQUEST RETURNED:", datasets);
    var availableDatasets = JSON.parse(data);
    const selectedDatasets = [].concat(query.selectedDatasets);

    availableDatasets = availableDatasets.map(dataset =>
       Object.assign({...dataset, selected: selectedDatasets.includes(dataset.dataset_id)})
    )

    const datapath = chooseDisplayComponentFromPathname(window.location.pathname) === "app" ?
    // getDatapath(window.location.pathname, availableDatasets) :

    window.location.pathname + window.location.search:
      undefined;
    dispatch({
      type: types.DATASETS_RECEIVED,
      s3bucket,
      availableDatasets,
      user: "guest",
      datapath
    });

    dispatch(browserBackForward())

  };

  const query = queryString.parse(window.location.search);
  const user = Object.keys(query).indexOf("user") === -1 ? "guest" : query.user;

  const request = new XMLHttpRequest();
  request.onload = () => {
    if (request.readyState === 4 && request.status === 200) {
      processData(request.responseText, query);
    } else {
      charonErrorHandler();
    }
  };
  request.onerror = charonErrorHandler;
  request.open("get", `${charonAPIAddress}/datasets.json`, true); // true for asynchronous
  request.send(null);
};


const getSegmentName = (datapath, availableDatasets) => {
  /* this code is duplicated too many times. TODO */
  const paramFields = parseParams(datapath, availableDatasets).dataset;
  const fields = Object.keys(paramFields).sort((a, b) => paramFields[a][0] > paramFields[b][0]);
  const choices = fields.map((d) => paramFields[d][1]);
  let level = availableDatasets;
  for (let vi = 0; vi < fields.length; vi++) {
    if (choices[vi]) {
      const options = Object.keys(level[fields[vi]]).filter((d) => d !== "default");
      if (Object.keys(level).indexOf("segment") !== -1 && options.length > 1) {
        return choices[vi];
      }
      // move to the next level in the data set hierarchy
      level = level[fields[vi]][choices[vi]];
    }
  }
  return undefined;
};


const fetchDataAndDispatch = (dispatch, datasets, query, s3bucket) => {
  const apiPath = (jsonType) =>
    `${charonAPIAddress}request=json&path=${datasets.datapath}_${jsonType}.json&s3=${s3bucket}`;

  const promisesOrder = ["meta", "tree", "frequencies"];
  const treeName = getSegmentName(datasets.datapath, datasets.availableDatasets);
  const promises = [
    fetch(apiPath("meta")).then((res) => res.json()),
    fetch(apiPath("tree")).then((res) => res.json()),
    fetch(apiPath("tip-frequencies")).then((res) => res.json())
  ];
  /* add promises according to the URL */
  if (query.tt) { /* SECOND TREE */
    const secondPath = createDatapathForSecondSegment(query.tt, datasets.datapath, datasets.availableDatasets);
    if (secondPath) {
      promisesOrder.push("treeToo");
      promises.push(
        fetch(`${charonAPIAddress}request=json&path=${secondPath}_tree.json&s3=${s3bucket}`)
          .then((res) => res.json())
          // don't need to catch - it'll be handled in the promises.map below
      );
      // promises.push(fetch(secondPath).then((res) => res.json()));
    }
  }
  Promise.all(promises.map((promise) => promise.catch(() => undefined)))
    .then((values) => {
      // all promises have not resolved or rejected (value[x] = undefined upon rejection)
      // you must check for undefined here, they won't go to the following catch
      const data = {JSONs: {}, query, treeName};
      values.forEach((v, i) => {
        if (v) data.JSONs[promisesOrder[i]] = v; // if statement removes undefinds
      });
      // console.log(data);
      if (!(data.JSONs.meta && data.JSONs.tree)) {
        console.error("Tree & Meta JSONs could not be loaded.");
        dispatch(goTo404(`
          Auspice attempted to load JSONs for the dataset "${datasets.datapath.replace(/_/, '/')}", but they couldn't be found.
        `));
        return;
      }
      dispatch({
        type: types.CLEAN_START,
        ...createStateFromQueryOrJSONs(data)
      });
    })
    .catch((err) => {
      // some coding error in handling happened. This is not the rejection of the promise you think it is!
      console.error("Code error. This should not happen.", err);
    });
};

export const loadJSONs = (s3override = undefined) => {
  return (dispatch, getState) => {
    const { datasets, tree } = getState();
    if (tree.loaded) {
      dispatch({type: types.DATA_INVALID});
    }
    const query = queryString.parse(window.location.search);
    const s3bucket = s3override ? s3override : datasets.s3bucket;
    fetchDataAndDispatch(dispatch, datasets, query, s3bucket, false);
  };
};

export const changeS3Bucket = () => {
  return (dispatch, getState) => {
    const {datasets} = getState();
    const newBucket = datasets.s3bucket === "live" ? "staging" : "live";
    // 1. re-fetch the manifest
    getDatasets(dispatch, newBucket);
    // 2. this can *only* be toggled through the app, so we must reload data
    dispatch(loadJSONs(newBucket));
  };
};

// Dead code - commented out to fix webpack warnings
// This function references undefined exports: createTreeTooState and TREE_TOO_DATA
// export const loadTreeToo = (name, path) => (dispatch, getState) => {
//   const { datasets } = getState();
//   const apiCall = `${charonAPIAddress}request=json&path=${path}_tree.json&s3=${datasets.s3bucket}`;
//   fetch(apiCall)
//     .then((res) => res.json())
//     .then((res) => {
//       const newState = createTreeTooState(
//         {treeTooJSON: res, oldState: getState(), segment: name}
//       );
//       dispatch({ type: types.TREE_TOO_DATA, treeToo: newState.treeToo, controls: newState.controls, segment: name});
//     })
//     .catch((err) => {
//       console.error("Error while loading second tree", err);
//     });
// };
