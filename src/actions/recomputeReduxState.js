import queryString from "query-string";
import { numericToCalendar, calendarToNumeric } from "../util/dateHelpers";
import { reallySmallNumber, twoColumnBreakpoint } from "../util/globals";
import { calcBrowserDimensionsInitialState } from "../reducers/browserDimensions";
import { strainNameToIdx, calculateVisiblityAndBranchThickness } from "../util/treeVisibilityHelpers";
import { constructVisibleTipLookupBetweenTrees } from "../util/treeTangleHelpers";
import { calcTipRadii } from "../util/tipRadiusHelpers";
import { getDefaultControlsState } from "../reducers/controls";
import { getValuesAndCountsOfVisibleTraitsFromTree,
  getAllValuesAndCountsOfTraitsFromTree } from "../util/treeCountingHelpers";
import { calcEntropyInView } from "../util/entropy";
import { treeJsonToState } from "../util/treeJsonProcessing";
import { entropyCreateStateFromJsons } from "../util/entropyCreateStateFromJsons";
import { determineColorByGenotypeType, calcNodeColor } from "../util/colorHelpers";
import { calcColorScale } from "../util/colorScale";
import { processFrequenciesJSON, computeMatrixFromRawData } from "../util/processFrequencies";



/* need a (better) way to keep the queryParams all in "sync" */
export const modifyStateViaURLQuery = (state, query) => {
  // console.log("Query incoming: ", query);
  // if (query) {
  //   state.datasets.availableDatasets = query.availableDatasets;
  // }
  // for (const filterKey of Object.keys(query).filter((c) => c.startsWith('f_'))) {
  //   state.filters[filterKey.replace('f_', '')] = query[filterKey].split(',');
  // }
  return state;
};

const restoreQueryableStateToDefaults = (state) => {
  for (const key of Object.keys(state.defaults)) {
    switch (typeof state.defaults[key]) {
      case "string": {
        state[key] = state.defaults[key];
        break;
      }
      case "object": { /* can't use Object.assign, must deep clone instead */
        state[key] = JSON.parse(JSON.stringify(state.defaults[key]));
        break;
      }
      default: {
        console.error("unknown typeof for default state of ", key);
      }
    }
  }


  // console.log("state now", state);
  return state;
};

const modifyStateViaMetadata = (state, metadata) => {
  if (metadata.analysisSlider) {
    state["analysisSlider"] = {key: metadata.analysisSlider, valid: false};
  }
  if (metadata.author_info) {
    // need authors in metadata.filters to include as filter
    // but metadata.author_info is generally required for app functioning
  } else {
    console.error("the meta.json must include author_info");
  }
  if (metadata.filters) {
    metadata.filters.forEach((v) => {
      state.filters[v] = [];
      state.defaults.filters[v] = [];
    });
  } else {
    console.warn("the meta.json did not include any filters");
  }
  if (metadata.defaults) {
    const keysToCheckFor = ["geoResolution", "colorBy", "distanceMeasure", "layout"];
    const expectedTypes = ["string", "string", "string", "string"];

    for (let i = 0; i < keysToCheckFor.length; i += 1) {
      if (metadata.defaults[keysToCheckFor[i]]) {
        if (typeof metadata.defaults[keysToCheckFor[i]] === expectedTypes[i]) { // eslint-disable-line valid-typeof
          /* e.g. if key=geoResoltion, set both state.geoResolution and state.defaults.geoResolution */
          state[keysToCheckFor[i]] = metadata.defaults[keysToCheckFor[i]];
          state.defaults[keysToCheckFor[i]] = metadata.defaults[keysToCheckFor[i]];
        } else {
          console.error("Skipping (meta.json) default for ", keysToCheckFor[i], "as it is not of type ", expectedTypes[i]);
        }
      }
    }
    // TODO: why are these false / False
    if (metadata.defaults.mapTriplicate) {
      // convert string to boolean; default is true; turned off with either false (js) or False (python)
      state["mapTriplicate"] = (metadata.defaults.mapTriplicate === 'false' || metadata.defaults.mapTriplicate === 'False') ? false : true;
    }
  }


  /* if only map or only tree, then panelLayout must be full */
  /* note - this will be overwritten by the URL query */
  if (state.panelsAvailable.indexOf("map") === -1 || state.panelsAvailable.indexOf("tree") === -1) {
    state.panelLayout = "full";
    state.canTogglePanelLayout = false;
  }
  /* annotations in metadata */
  if (!metadata.annotations) {console.error("Metadata needs updating with annotations field. Rerun augur. FATAL.");}
  for (const gene of Object.keys(metadata.annotations)) {
    state.geneLength[gene] = metadata.annotations[gene].end - metadata.annotations[gene].start;
    if (gene !== "nuc") {
      state.geneLength[gene] /= 3;
    }
  }
  return state;
};

const checkAndCorrectErrorsInState = (state, metadata) => {
  /* The one (bigish) problem with this being in the reducer is that
  we can't have any side effects. So if we detect and error introduced by
  a URL QUERY (and correct it in state), we can't correct the URL */

  /* colorBy */
  if (Object.keys(metadata.colorOptions).indexOf(state.colorBy) === -1 && !state["colorBy"].startsWith("gt-")) {
    const availableNonGenotypeColorBys = Object.keys(metadata.colorOptions);
    if (availableNonGenotypeColorBys.indexOf("gt") > -1) {
      availableNonGenotypeColorBys.splice(availableNonGenotypeColorBys.indexOf("gt"), 1);
    }
    console.error("Error detected trying to set colorBy to", state.colorBy, "(valid options are", Object.keys(metadata.colorOptions).join(", "), "). Setting to", availableNonGenotypeColorBys[0]);
    state.colorBy = availableNonGenotypeColorBys[0];
    state.defaults.colorBy = availableNonGenotypeColorBys[0];
  }



  /* distanceMeasure */
  if (["div", "num_date"].indexOf(state["distanceMeasure"]) === -1) {
    state["distanceMeasure"] = "num_date";
    console.error("Error detected. Setting distanceMeasure to ", state["distanceMeasure"]);
  }

 
  /* temporalConfidence */
  if (state.temporalConfidence.exists) {
    if (state.layout !== "rect") {
      state.temporalConfidence.display = false;
      state.temporalConfidence.on = false;
    } else if (state.distanceMeasure === "div") {
      state.temporalConfidence.display = false;
      state.temporalConfidence.on = false;
    }
  }

  /* if colorBy is a genotype then we need to set mutType */
  const maybeMutType = determineColorByGenotypeType(state.colorBy);
  if (maybeMutType) state.mutType = maybeMutType;

  return state;
};


const removePanelIfPossible = (panels, name) => {
  const idx = panels.indexOf(name);
  if (idx !== -1) {
    panels.splice(idx, 1);
  }
};



export const createStateFromQueryOrJSONs = ({
  JSONs = false, /* raw json data - completely nuke existing redux state */
  oldState = false, /* existing redux state (instead of jsons) */
  query = {}
}) => {
  let entropy, controls, metadata, tree;
  /* first task is to create metadata, entropy, controls & tree partial state */
  if (JSONs) {
    if (JSONs.narrative) narrative = JSONs.narrative;
    /* ceate metadata state */
    metadata = JSONs.meta;
    if (Object.prototype.hasOwnProperty.call(metadata, "loaded")) {
      console.error("Metadata JSON must not contain the key \"loaded\". Ignoring.");
    }
    metadata.colorOptions = metadata.color_options;
    delete metadata.color_options;
    metadata.loaded = true;
    /* entropy state */
    entropy = entropyCreateStateFromJsons(JSONs.meta);


    /* new controls state - don't apply query yet (or error check!) */
    controls = getDefaultControlsState();
    controls = modifyStateViaTree(controls, tree, treeToo);
    controls = modifyStateViaMetadata(controls, metadata);
  } else if (oldState) {
    /* revisit this - but it helps prevent bugs */
    controls = {...oldState.controls};
    entropy = {...oldState.entropy};
    
    metadata = {...oldState.metadata};

    controls = restoreQueryableStateToDefaults(controls);
  }

  controls = checkAndCorrectErrorsInState(controls, metadata); /* must run last */









  return {metadata, entropy, controls, query};
};

