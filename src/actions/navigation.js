import queryString from "query-string";
import * as types from "./types";

export const chooseDisplayComponentFromPathname = (pathname) => {
  if (pathname.startsWith("/app")) return "app";
  return "splash";
};

/* changes the state of the page and (perhaps) the dataset displayed.
This function is used throughout the app for all navigation to another page,
including browserBackForward (see below).

ARGUMENTS:
(1) path - REQUIRED - the destination path (does not include query)
(2) query - OPTIONAL (default: undefined)
(3) push - OPTIONAL (default: true) - signals that pushState should be used (has no effect on the reducers)
*/
export const changePage =
  ({ path, query = undefined, push = true }) =>
  (dispatch, getState) => {
    if (!path) {
      console.error("changePage called without a path");
      return;
    }
    const { datasets } = getState();
    const d = {
      type: types.PAGE_CHANGE,
      displayComponent: chooseDisplayComponentFromPathname(path),
      path,
      errorMessage: undefined
    };

    // If we were PREVIOUSLY on the app page and we're leaving it, reset
    // the clonal families state.
    if (datasets.displayComponent === "app" && d.displayComponent !== "app") {
      dispatch({ type: types.RESET_CLONAL_FAMILIES_STATE });
    }

    if (query !== undefined) {
      d.query = query;
    }
    if (push) {
      d.pushState = true;
    }
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
export const changePageQuery =
  ({ path, queryToUse, queryToDisplay = false, push = true }) =>
  (dispatch, getState) => {
    const state = getState();
    if (chooseDisplayComponentFromPathname(path) === "app" && queryToUse.selectedDatasets) {
      const queryStringDatasets = new Set([].concat(queryToUse.selectedDatasets));

      // Don't immediately load datasets - wait for datasets to be available first
      // This will be handled by a componentDidUpdate when datasets are loaded

      // Store the requested datasets in Redux state so we can load them later
      dispatch({
        type: types.URL_QUERY_CHANGE_WITH_COMPUTED_STATE,
        ...state,
        pushState: push,
        query: queryToDisplay ? queryToDisplay : queryToUse,
        pendingDatasetLoads: Array.from(queryStringDatasets) // Store for later processing
      });
      return;
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
  if (datasets.urlPath !== window.location.pathname) {
    dispatch(changePage({ path: window.location.pathname }));
  }

  dispatch(changePageQuery({ path: window.location.pathname, queryToUse: queryString.parse(window.location.search) }));
};
