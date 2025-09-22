import * as types from "../actions/types";

export const calcBrowserDimensionsInitialState = () => ({
  width: window.innerWidth,
  height: window.innerHeight,
  docHeight: window.document.body.clientHeight
});

/* eslint-disable default-param-last */
const BrowserDimensions = (
  state = {
    browserDimensions: calcBrowserDimensionsInitialState()
  },
  action
) => {
  /* eslint-enable default-param-last */
  switch (action.type) {
    case types.BROWSER_DIMENSIONS:
      return { ...state, browserDimensions: action.data };
    default:
      return state;
  }
};

export default BrowserDimensions;
