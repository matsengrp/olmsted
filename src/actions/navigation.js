import queryString from "query-string";
import * as types from "./types";
import { getClonalLineages } from "./loadData";
import * as sets from "../util/sets";
// This should be more clearly marked as part of the routing logic
export const chooseDisplayComponentFromPathname = (pathname) => {
  // if (pathname === "/" || pathname === "/all") return "splash";
  if (pathname.startsWith("/app")) return "app";
  return "splash"; // fallthrough
};

export const getDatapath = (path, _) => {
  return path;
};

/* changes the state of the page and (perhaps) the dataset displayed.
This function is used throughout the app for all navigation to another page, (including braowserBackForward - see function below)
The exception is for navigation requests that specify only the query changes, or that have an identical pathname to that selected.
Note that this function is not pure, in that it may change the URL

ARGUMENTS:
(1) path - REQUIRED - the destination path - e.g. "zika" or "flu/..." (does not include query)
(2) query - OPTIONAL (default: undefined) - see below
(3) push - OPTIONAL (default: true) - signals that pushState should be used (has no effect on the reducers)

UNDERSTANDING QUERY (SLIGHTLY CONFUSING)
This function changes the pathname (stored in the datasets reducer) and modifies the URL pathname and query
accordingly in the middleware. But the URL query is not processed further.
Because the datasets reducer has changed, the <App> (or whichever display component we're on) will update.
In <App>, this causes a call to loadJSONs, which will, as part of it's dispatch, use the URL state of query.
In this way, the URL query is "used".
*/
export const changePage = ({path, query = undefined, push = true}) => (dispatch, getState) => {
  if (!path) {console.error("changePage called without a path"); return;}
  const { datasets } = getState();
  const d = {
    type: types.PAGE_CHANGE,
    displayComponent: chooseDisplayComponentFromPathname(path),
    errorMessage: undefined,
    datapath: undefined
  };

  // Set the new datapath if we are changing to the app page
  if (d.displayComponent === "app"){
    d.datapath = getDatapath(path, datasets.availableDatasets)
  }

  // If we were PREVIOUSLY on the app page and change to a different dataset or go 
  // back to splash, we want to reset the clonal lineages state
  if (datasets.displayComponent === "app" && d.datapath !== datasets.datapath){
    dispatch({type: types.RESET_CLONAL_LINEAGES_STATE})
  }

  if (query !== undefined) { d.query = query; }
  if (push) { d.pushState = true; }
  /* check if this is "valid" - we can change it here before it is dispatched */
  dispatch(d);
};

/* a 404 uses the same machinery as changePage, but it's not a thunk */
export const goTo404 = (errorMessage) => ({
  type: types.PAGE_CHANGE,
  displayComponent: "splash",
  errorMessage,
  pushState: true
});

/* modify redux state and URL by specifying a new URL query string. Pathname is not considered, if you want to change that, use "changePage" instead.
Unlike "changePage" the query is processed both by the middleware (i.e. to update the URL) AND by the reducers, to update their state accordingly.
ARGUMENTS:
(1) query - REQUIRED - {object}
(2) push - OPTIONAL (default: true) - signals that pushState should be used (has no effect on the reducers)
*/
export const changePageQuery = ({path, queryToUse, queryToDisplay = false, push = true}) => (dispatch, getState) => {
  const state =  getState();
  if( chooseDisplayComponentFromPathname(path) == "app" && queryToUse.selectedDatasets ){
    let queryStringDatasets = new Set([].concat(queryToUse.selectedDatasets))
    // Tried to check to see that datasets were in the state before requesting them from server but they are 
    // not necessarily loaded when this function is called; instead we should check this in a componentDidUpdate somewhere (Monitor)?
    queryStringDatasets.forEach( (id) => {
      dispatch({
        type: types.LOADING_DATASET,
        dataset_id: id,
        loading: "LOADING"
      });
      getClonalLineages(dispatch, id)
    })
  }
  dispatch({
    type: types.URL_QUERY_CHANGE_WITH_COMPUTED_STATE,
    ...state,
    pushState: push,
    query: queryToDisplay ? queryToDisplay : queryToUse
  });
};

export const browserBackForward = () => (dispatch, getState) => {
  const { datasets } = getState();
  // console.log('DATASETS',queryString.parse(window.location.search));
  /* if the pathname has changed, trigger the changePage action (will trigger new post to load, new dataset to load, etc) */
  // console.log("broswer back/forward detected. From: ", datasets.urlPath, datasets.urlSearch, "to:", window.location.pathname, window.location.search)
  // console.log('PATH', window.location.pathname);
  if (datasets.urlPath !== window.location.pathname) {
    
    dispatch(changePage({path: window.location.pathname}));
  } 

  dispatch(changePageQuery({path: window.location.pathname, queryToUse: queryString.parse(window.location.search)}));
  
};
