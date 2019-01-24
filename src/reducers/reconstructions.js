import * as types from "../actions/types";
import { chooseDisplayComponentFromPathname } from "../actions/navigation";


const reconstructions = (state = {
  selectedReconstructionIdent: undefined,
  cache: {},
}, action) => {
  switch (action.type) {
    case types.RECONSTRUCTION_RECEIVED: {
      let updates = {};
      updates[action.reconstruction_id] = action.reconstruction
      return Object.assign({}, state, {
        cache: Object.assign({}, state.cache, updates)})
    } case types.UPDATE_SELECTED_RECONSTRUCTION: {
      console.log("UPDATE_SELECTED_RECONSTRUCTION called")
      return Object.assign({}, state, {
        selectedReconstructionIdent: action.reconstruction,
      });
    } case types.TOGGLE_FAMILY: {
      let updates = {
        selectedReconstructionIdent: undefined,
      }
      return Object.assign({}, state, updates);
    } default: {
      return state;
    }
  }
};

export const getSelectedReconstruction = (reconstructions) => {
  return reconstructions.cache[reconstructions.selectedReconstruction];
};

export default reconstructions;
