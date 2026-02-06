import trees from "../trees";
import * as types from "../../actions/types";
import { mockTree } from "../../__test-data__/mockState";

describe("trees reducer", () => {
  const initialState = trees(undefined, { type: "INIT" });

  it("returns initial state", () => {
    expect(initialState).toEqual({
      selectedTreeIdent: undefined,
      cache: {}
    });
  });

  describe("TREE_RECEIVED", () => {
    it("adds tree to cache", () => {
      const state = trees(initialState, {
        type: types.TREE_RECEIVED,
        tree_id: "tree-1",
        tree: mockTree
      });
      expect(state.cache["tree-1"]).toEqual(mockTree);
    });

    it("preserves existing cache entries", () => {
      const stateWithTree = {
        ...initialState,
        cache: { "tree-0": { ident: "tree-0" } }
      };
      const state = trees(stateWithTree, {
        type: types.TREE_RECEIVED,
        tree_id: "tree-1",
        tree: mockTree
      });
      expect(state.cache["tree-0"]).toBeDefined();
      expect(state.cache["tree-1"]).toBeDefined();
    });
  });

  describe("TREE_ERROR", () => {
    it("stores error in cache for tree_id", () => {
      const state = trees(initialState, {
        type: types.TREE_ERROR,
        tree_id: "tree-1",
        error: "Failed to load"
      });
      expect(state.cache["tree-1"]).toEqual({ error: "Failed to load" });
    });
  });

  describe("UPDATE_SELECTED_TREE", () => {
    it("updates selectedTreeIdent", () => {
      const state = trees(initialState, {
        type: types.UPDATE_SELECTED_TREE,
        tree: "tree-1"
      });
      expect(state.selectedTreeIdent).toBe("tree-1");
    });
  });

  describe("TOGGLE_FAMILY", () => {
    it("resets selectedTreeIdent to undefined", () => {
      const stateWithTree = { ...initialState, selectedTreeIdent: "tree-1" };
      const state = trees(stateWithTree, {
        type: types.TOGGLE_FAMILY,
        family_ident: "family-1"
      });
      expect(state.selectedTreeIdent).toBeUndefined();
    });
  });

  it("returns current state for unknown actions", () => {
    const state = trees(initialState, { type: "UNKNOWN" });
    expect(state).toBe(initialState);
  });
});
