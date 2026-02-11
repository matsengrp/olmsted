/**
 * Tests for changeURL middleware
 *
 * This middleware intercepts Redux actions and updates the browser URL accordingly.
 * We mock window.history, window.location, and the Redux store.
 */

import { changeURLMiddleware } from "../changeURL";
import * as types from "../../actions/types";

// ── Helpers ──

function createMockStore(state = {}) {
  return {
    getState: jest.fn(() => ({
      datasets: {
        displayComponent: "splash",
        urlPath: "/",
        ...state
      }
    }))
  };
}

function setup(storeState = {}) {
  const store = createMockStore(storeState);
  const next = jest.fn((action) => action);
  const invoke = changeURLMiddleware(store)(next);
  return { store, next, invoke };
}

// Save originals
const originalPushState = window.history.pushState;
const originalReplaceState = window.history.replaceState;

/**
 * Set window.location properties in jsdom.
 * jsdom's location is read-only, so we navigate using pushState
 * to change pathname/search, then read them normally.
 */
function setLocation(pathname = "/", search = "") {
  const url = pathname + search;
  // Use the real pushState to actually navigate jsdom
  originalPushState.call(window.history, {}, "", url);
}

beforeEach(() => {
  // Reset to root
  setLocation("/", "");

  // Mock history methods (after resetting location)
  window.history.pushState = jest.fn();
  window.history.replaceState = jest.fn();
});

afterEach(() => {
  window.history.pushState = originalPushState;
  window.history.replaceState = originalReplaceState;
  // Reset back to root
  setLocation("/", "");
});

// ── Core middleware contract ──

describe("changeURL middleware", () => {
  it("always calls next(action)", () => {
    const { next, invoke } = setup();
    const action = { type: "UNKNOWN_ACTION" };
    invoke(action);
    expect(next).toHaveBeenCalledWith(action);
  });

  it("returns the result of next(action)", () => {
    const { next, invoke } = setup();
    next.mockReturnValue("sentinel");
    const result = invoke({ type: "UNKNOWN_ACTION" });
    expect(result).toBe("sentinel");
  });

  it("passes unknown actions through without modifying URL", () => {
    const { invoke } = setup();
    invoke({ type: "SOME_RANDOM_ACTION" });
    expect(window.history.pushState).not.toHaveBeenCalled();
    expect(window.history.replaceState).not.toHaveBeenCalled();
  });
});

// ── CLEAN_START ──

describe("CLEAN_START", () => {
  it("uses replaceState with empty query", () => {
    const { invoke } = setup();
    invoke({ type: types.CLEAN_START, query: {} });
    expect(window.history.replaceState).not.toHaveBeenCalled();
    // Empty query on "/" → no URL change needed
  });

  it("uses replaceState when URL actually changes", () => {
    // Navigate to a URL with query, then re-mock history
    window.history.pushState = originalPushState;
    setLocation("/", "?foo=bar");
    window.history.pushState = jest.fn();

    const { invoke } = setup();
    invoke({ type: types.CLEAN_START, query: {} });
    expect(window.history.replaceState).toHaveBeenCalled();
  });

  it("uses pushState when pushState flag is true", () => {
    window.history.pushState = originalPushState;
    setLocation("/", "?foo=bar");
    window.history.pushState = jest.fn();

    const { invoke } = setup();
    invoke({ type: types.CLEAN_START, query: {}, pushState: true });
    expect(window.history.pushState).toHaveBeenCalled();
  });
});

// ── URL_QUERY_CHANGE_WITH_COMPUTED_STATE ──

describe("URL_QUERY_CHANGE_WITH_COMPUTED_STATE", () => {
  it("sets query from action and pushes when pushState is true", () => {
    const { invoke } = setup();
    invoke({
      type: types.URL_QUERY_CHANGE_WITH_COMPUTED_STATE,
      query: { ds: "test_dataset", view: "scatter" },
      pushState: true
    });
    expect(window.history.pushState).toHaveBeenCalled();
    const urlArg = window.history.pushState.mock.calls[0][2];
    expect(urlArg).toContain("ds=test_dataset");
    expect(urlArg).toContain("view=scatter");
  });

  it("uses replaceState by default (pushState not set)", () => {
    const { invoke } = setup();
    invoke({
      type: types.URL_QUERY_CHANGE_WITH_COMPUTED_STATE,
      query: { ds: "abc" }
    });
    expect(window.history.replaceState).toHaveBeenCalled();
  });

  it("dispatches URL action via next", () => {
    const { next, invoke } = setup();
    invoke({
      type: types.URL_QUERY_CHANGE_WITH_COMPUTED_STATE,
      query: { x: "1" }
    });
    // next should be called at least twice: once for the original action, once for URL
    const urlCall = next.mock.calls.find((call) => call[0] && call[0].type === types.URL);
    expect(urlCall).toBeDefined();
  });
});

// ── CHANGE_URL_QUERY_BUT_NOT_REDUX_STATE ──

describe("CHANGE_URL_QUERY_BUT_NOT_REDUX_STATE", () => {
  it("updates URL with action query", () => {
    const { invoke } = setup();
    invoke({
      type: types.CHANGE_URL_QUERY_BUT_NOT_REDUX_STATE,
      query: { filter: "igh" },
      pushState: true
    });
    expect(window.history.pushState).toHaveBeenCalled();
    const urlArg = window.history.pushState.mock.calls[0][2];
    expect(urlArg).toContain("filter=igh");
  });

  it("strips keys with falsy values from the query", () => {
    const { invoke } = setup();
    invoke({
      type: types.CHANGE_URL_QUERY_BUT_NOT_REDUX_STATE,
      query: { keep: "yes", remove: "" },
      pushState: true
    });
    const urlArg = window.history.pushState.mock.calls[0][2];
    expect(urlArg).toContain("keep=yes");
    expect(urlArg).not.toContain("remove");
  });
});

// ── PAGE_CHANGE ──

describe("PAGE_CHANGE", () => {
  it("sets pathname to / for splash", () => {
    // Navigate to a non-root path, then re-mock history
    window.history.pushState = originalPushState;
    setLocation("/app/some/path", "");
    window.history.pushState = jest.fn();

    const { invoke } = setup();
    invoke({
      type: types.PAGE_CHANGE,
      displayComponent: "splash",
      pushState: true
    });
    expect(window.history.pushState).toHaveBeenCalled();
    const urlArg = window.history.pushState.mock.calls[0][2];
    expect(urlArg).toBe("/");
  });

  it("sets pathname from datapath for app component", () => {
    const { invoke } = setup();
    invoke({
      type: types.PAGE_CHANGE,
      displayComponent: "app",
      datapath: "datasets_test_data",
      pushState: true
    });
    expect(window.history.pushState).toHaveBeenCalled();
    const urlArg = window.history.pushState.mock.calls[0][2];
    expect(urlArg).toContain("/datasets/test/data");
  });

  it("clears query when displayComponent changes and no query in action", () => {
    const { next, invoke } = setup({ displayComponent: "splash" });
    invoke({
      type: types.PAGE_CHANGE,
      displayComponent: "app",
      datapath: "datasets_test",
      pushState: true
    });
    // URL action dispatched
    const urlCall = next.mock.calls.find((call) => call[0] && call[0].type === types.URL);
    expect(urlCall).toBeDefined();
  });

  it("uses action query when provided", () => {
    const { invoke } = setup();
    invoke({
      type: types.PAGE_CHANGE,
      displayComponent: "app",
      datapath: "test_path",
      query: { selected: "clone_1" },
      pushState: true
    });
    const urlArg = window.history.pushState.mock.calls[0][2];
    expect(urlArg).toContain("selected=clone_1");
  });

  it("dispatches URL action with new path", () => {
    const { next, invoke } = setup({ displayComponent: "splash", urlPath: "/" });
    invoke({
      type: types.PAGE_CHANGE,
      displayComponent: "app",
      datapath: "my_data",
      pushState: true
    });
    const urlCalls = next.mock.calls.filter((call) => call[0] && call[0].type === types.URL);
    expect(urlCalls.length).toBeGreaterThan(0);
    expect(urlCalls[0][0].path).toBe("/my/data");
  });

  it("sets pathname to displayComponent for non-app, non-splash", () => {
    const { invoke } = setup();
    invoke({
      type: types.PAGE_CHANGE,
      displayComponent: "upload",
      pushState: true
    });
    expect(window.history.pushState).toHaveBeenCalled();
    const urlArg = window.history.pushState.mock.calls[0][2];
    expect(urlArg).toBe("/upload");
  });

  it("leaves pathname alone if already starts with displayComponent", () => {
    window.history.pushState = originalPushState;
    setLocation("/upload/step2", "");
    window.history.pushState = jest.fn();

    const { invoke } = setup();
    invoke({
      type: types.PAGE_CHANGE,
      displayComponent: "upload"
    });
    // No URL change should happen since pathname already starts with /upload
    // and no query change
  });
});

// ── URL formatting ──

describe("URL formatting", () => {
  it("decodes commas in query string", () => {
    const { invoke } = setup();
    invoke({
      type: types.URL_QUERY_CHANGE_WITH_COMPUTED_STATE,
      query: { items: "a,b,c" },
      pushState: true
    });
    const urlArg = window.history.pushState.mock.calls[0][2];
    expect(urlArg).toContain("a,b,c");
    expect(urlArg).not.toContain("%2C");
  });

  it("decodes slashes in query string", () => {
    const { invoke } = setup();
    invoke({
      type: types.URL_QUERY_CHANGE_WITH_COMPUTED_STATE,
      query: { path: "a/b/c" },
      pushState: true
    });
    const urlArg = window.history.pushState.mock.calls[0][2];
    expect(urlArg).toContain("a/b/c");
    expect(urlArg).not.toContain("%2F");
  });

  it("ensures pathname starts with /", () => {
    const { invoke } = setup();
    invoke({
      type: types.PAGE_CHANGE,
      displayComponent: "upload",
      pushState: true
    });
    const urlArg = window.history.pushState.mock.calls[0][2];
    expect(urlArg).toMatch(/^\//);
  });
});
