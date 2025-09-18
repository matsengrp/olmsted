import * as types from "../actions/types";

/* eslint-disable default-param-last */
const trees = (
  state = {
    selectedTreeIdent: undefined,
    cache: {}
  },
  action
) => {
  /* eslint-enable default-param-last */
  switch (action.type) {
    case types.TREE_RECEIVED: {
      const updates = {};
      updates[action.tree_id] = action.tree;
      return { ...state, cache: { ...state.cache, ...updates } };
    }
    case types.TREE_ERROR: {
      const updates = {};
      updates[action.tree_id] = { error: action.error };
      return { ...state, cache: { ...state.cache, ...updates } };
    }
    case types.UPDATE_SELECTED_TREE: {
      return { ...state, selectedTreeIdent: action.tree };
    }
    case types.TOGGLE_FAMILY: {
      const updates = {
        selectedTreeIdent: undefined
      };
      return { ...state, ...updates };
    }
    default: {
      return state;
    }
  }
};

export const getSelectedTree = (trees_state) => {
  return trees_state.cache[trees_state.selectedTree];
};

export default trees;
