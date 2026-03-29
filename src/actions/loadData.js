import queryString from "query-string";
import * as types from "./types";
import { charonAPIAddress } from "../util/globals";
import { goTo404, chooseDisplayComponentFromPathname, browserBackForward } from "./navigation";
import { createStateFromQueryOrJSONs } from "./recomputeReduxState";
import parseParams, { createDatapathForSecondSegment } from "../util/parseParams";
// Performance monitoring imports - uncomment to enable performance tracking
// import { timerStart, timerEnd } from "../util/perf";

const charonErrorHandler = (dispatch) => {
  console.warn("Failed to get manifest JSON from server");
  const datapath = window.location.pathname.replace(/^\//, "").replace(/\/$/, "").replace("/", "_");
  dispatch({ type: types.PROCEED_SANS_MANIFEST, datapath });
};

/**
 * Safely parse JSON, showing an alert on failure.
 * @param {string} data - Raw JSON string
 * @param {string} identifier - Label for error messages
 * @param {*} [fallback=null] - Value to return on parse failure
 * @returns {*} Parsed data or fallback
 */
const safeJsonParse = (data, identifier, fallback = null) => {
  try {
    return JSON.parse(data);
  } catch (_err) {
    alert(
      `Failed parsing json for ${identifier}. ` +
        "This means either the data file wasn't found and index.html was returned or there was an error writing the data file"
    );
    console.error(data.substring(0, 100));
    return fallback;
  }
};

/**
 * Fetch JSON from the Charon API via XMLHttpRequest.
 * @param {string} url - Full URL to fetch
 * @param {Function} onSuccess - Callback receiving the response text
 * @param {Function} dispatch - Redux dispatch (for error handling)
 */
const fetchFromCharon = (url, onSuccess, dispatch) => {
  const request = new XMLHttpRequest();
  request.onload = () => {
    if (request.readyState === 4 && request.status === 200) {
      onSuccess(request.responseText);
    } else {
      charonErrorHandler(dispatch);
    }
  };
  request.onerror = () => charonErrorHandler(dispatch);
  request.open("get", url, true);
  request.send(null);
};

export const getTree = (dispatch, tree_id) => {
  fetchFromCharon(
    `${charonAPIAddress}/tree.${tree_id}.json`,
    (data) => {
      const tree = safeJsonParse(data, tree_id);
      dispatch({ type: types.TREE_RECEIVED, tree_id, tree });
    },
    dispatch
  );
};

export const getClonalFamilies = (dispatch, dataset_id) => {
  fetchFromCharon(
    `${charonAPIAddress}/clones.${dataset_id}.json`,
    (data) => {
      const clonalFamilies = safeJsonParse(data, dataset_id, []);
      dispatch({ type: types.CLONAL_FAMILIES_RECEIVED, dataset_id, clonalFamilies });
      dispatch({ type: types.LOADING_DATASET, dataset_id, loading: "DONE" });
    },
    dispatch
  );
};

export const getDatasets = (dispatch, s3bucket = "live") => {
  const query = queryString.parse(window.location.search);

  fetchFromCharon(
    `${charonAPIAddress}/datasets.json`,
    (data) => {
      let availableDatasets = safeJsonParse(data, "datasets", []);
      const selectedDatasets = [].concat(query.selectedDatasets);

      availableDatasets = availableDatasets.map((dataset) => ({
        ...dataset,
        selected: selectedDatasets.includes(dataset.dataset_id)
      }));

      const datapath =
        chooseDisplayComponentFromPathname(window.location.pathname) === "app"
          ? window.location.pathname + window.location.search
          : undefined;
      dispatch({
        type: types.DATASETS_RECEIVED,
        s3bucket,
        availableDatasets,
        user: "guest",
        datapath
      });

      dispatch(browserBackForward());
    },
    dispatch
  );
};

const getSegmentName = (datapath, availableDatasets) => {
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
  if (query.tt) {
    /* SECOND TREE */
    const secondPath = createDatapathForSecondSegment(query.tt, datasets.datapath, datasets.availableDatasets);
    if (secondPath) {
      promisesOrder.push("treeToo");
      promises.push(
        fetch(`${charonAPIAddress}request=json&path=${secondPath}_tree.json&s3=${s3bucket}`).then((res) => res.json())
        // don't need to catch - it'll be handled in the promises.map below
      );
      // promises.push(fetch(secondPath).then((res) => res.json()));
    }
  }
  Promise.all(promises.map((promise) => promise.catch(() => undefined)))
    .then((values) => {
      // all promises have not resolved or rejected (value[x] = undefined upon rejection)
      // you must check for undefined here, they won't go to the following catch
      const data = { JSONs: {}, query, treeName };
      values.forEach((v, i) => {
        if (v) data.JSONs[promisesOrder[i]] = v; // if statement removes undefinds
      });
      // console.log(data);
      if (!(data.JSONs.meta && data.JSONs.tree)) {
        console.error("Tree & Meta JSONs could not be loaded.");
        dispatch(
          goTo404(`
          Olmsted attempted to load JSONs for the dataset "${datasets.datapath.replace(/_/, "/")}", but they couldn't be found.
        `)
        );
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
      dispatch({ type: types.DATA_INVALID });
    }
    const query = queryString.parse(window.location.search);
    const s3bucket = s3override ? s3override : datasets.s3bucket;
    fetchDataAndDispatch(dispatch, datasets, query, s3bucket, false);
  };
};

export const changeS3Bucket = () => {
  return (dispatch, getState) => {
    const { datasets } = getState();
    const newBucket = datasets.s3bucket === "live" ? "staging" : "live";
    // 1. re-fetch the manifest
    getDatasets(dispatch, newBucket);
    // 2. this can *only* be toggled through the app, so we must reload data
    dispatch(loadJSONs(newBucket));
  };
};
