import * as types from "../actions/types";
import { chooseDisplayComponentFromPathname } from "../actions/navigation";


const trees = (state = {
  selectedTreeIdent: undefined,
  cache: {}
}, action) => {
  switch (action.type) {
    case types.TREE_RECEIVED: {
      const updates = {};
      updates[action.tree_id] = action.tree;
      return Object.assign({}, state, {cache: Object.assign({}, state.cache, updates)});
    } case types.TREE_ERROR: {
      const updates = {};
      updates[action.tree_id] = { error: action.error };
      return Object.assign({}, state, {cache: Object.assign({}, state.cache, updates)});
    } case types.UPDATE_SELECTED_TREE: {
      return Object.assign({}, state, {
        selectedTreeIdent: action.tree
      });
    } case types.TOGGLE_FAMILY: {
      const updates = {
        selectedTreeIdent: undefined
      };
      return Object.assign({}, state, updates);
    } default: {
      return state;
    }
  }
};

export const getSelectedTree = (trees) => {
  return trees.cache[trees.selectedTree];
};

export default trees;
