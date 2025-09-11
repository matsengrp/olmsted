import queryString from "query-string";
import * as types from "../actions/types";

/* What is this middleware?
This middleware acts to keep the app state and the URL query state in sync by intercepting actions
and updating the URL accordingly. Thus, in theory, this middleware can be disabled and the app will still work
as expected.

The only modification of redux state by this app is (potentially) an action of type types.URL
which is used to "save" the current page so we can diff against a new one!
*/

// eslint-disable-next-line
export const changeURLMiddleware = (store) => (next) => (action) => {
  const state = store.getState(); // this is "old" state, i.e. before the reducers have updated by this action
  const result = next(action); // send action to other middleware / reducers
  // if (action.dontModifyURL !== undefined) {
  //   console.log("changeURL middleware skipped")
  //   return result;
  // }

  /* starting URL values & flags */
  let query = queryString.parse(window.location.search);
  let {pathname} = window.location;

  /* first switch: query change */

  switch (action.type) {
    case types.CLEAN_START: // fallthrough
    case types.URL_QUERY_CHANGE_WITH_COMPUTED_STATE: // fallthrough
      query = action.query;
      break;
    case types.CHANGE_URL_QUERY_BUT_NOT_REDUX_STATE:
      query = action.query;
      break;
    case types.PAGE_CHANGE:
      if (action.query) {
        query = action.query;
      } else if (action.displayComponent !== state.datasets.displayComponent) {
        query = {};
      }
      break;
    default:
      break;
  }

  /* second switch: path change */
  switch (action.type) {
    case types.PAGE_CHANGE:
      /* desired behaviour depends on the displayComponent selected... */
      if (action.displayComponent === "app") {
        pathname = action.datapath.replace(/_/g, "/");
      } else if (action.displayComponent === "splash") {
        pathname = "/";
      } else if (pathname.startsWith(`/${action.displayComponent}`)) {
        // leave the pathname alone!
      } else {
        pathname = action.displayComponent;
      }
      break;
    default:
      break;
  }

  if (query) {
    // Format url string

    // Get rid of keys with no values
    Object.keys(query).filter((k) => !query[k]).forEach((k) => delete query[k]);
    // Format with no commas or slashes
    let search = queryString.stringify(query).replace(/%2C/g, ',').replace(/%2F/g, '/');
    if (search) {search = "?" + search;}
    if (!pathname.startsWith("/")) {pathname = "/" + pathname;}

    // If url change
    if (pathname !== window.location.pathname || search !== window.location.search) {
      let newURLString = pathname;
      if (search) {newURLString += search;}
      if (action.pushState === true) {
        window.history.pushState({}, "", newURLString);
      } else {
        window.history.replaceState({}, "", newURLString);
      }
      next({type: types.URL, path: pathname, query: search});
    } else if (pathname !== state.datasets.urlPath && action.type === types.PAGE_CHANGE) {
      next({type: types.URL, path: pathname, query: search});
    }
  }

  return result;
};
