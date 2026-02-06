import BrowserDimensions, { calcBrowserDimensionsInitialState } from "../browserDimensions";
import * as types from "../../actions/types";

describe("calcBrowserDimensionsInitialState", () => {
  it("reads dimensions from window", () => {
    const state = calcBrowserDimensionsInitialState();
    expect(state).toHaveProperty("width");
    expect(state).toHaveProperty("height");
    expect(state).toHaveProperty("docHeight");
    expect(typeof state.width).toBe("number");
  });
});

describe("BrowserDimensions reducer", () => {
  it("returns initial state", () => {
    const state = BrowserDimensions(undefined, { type: "UNKNOWN" });
    expect(state).toHaveProperty("browserDimensions");
    expect(state.browserDimensions).toHaveProperty("width");
  });

  it("updates browser dimensions on BROWSER_DIMENSIONS", () => {
    const newDimensions = { width: 1920, height: 1080, docHeight: 2000 };
    const state = BrowserDimensions(undefined, {
      type: types.BROWSER_DIMENSIONS,
      data: newDimensions
    });
    expect(state.browserDimensions).toEqual(newDimensions);
  });

  it("returns current state for unknown action types", () => {
    const currentState = {
      browserDimensions: { width: 800, height: 600, docHeight: 900 }
    };
    const state = BrowserDimensions(currentState, { type: "NONEXISTENT" });
    expect(state).toBe(currentState);
  });
});
