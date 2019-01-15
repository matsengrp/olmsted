import * as types from "../actions/types";
import { chooseDisplayComponentFromPathname } from "../actions/navigation";


const reconstructions = (state = {
  selectedReconstructionIdent: undefined,
  cachedReconstructions: {},
}, action) => {
  switch (action.type) {
    case types.RECONSTRUCTION_RECEIVED: {
      let updates = {};
      updates[action.reconstruction_id] = action.reconstruction
      return Object.assign({}, state, {
        cachedReconstructions: Object.assign({}, state.cachedReconstructions, updates)})
    } case types.UPDATE_SELECTED_RECONSTRUCTION: {
      // Impure nonsense!!!
      if (!d[action.reconstruction]) {
        loadData.getReconstruction(dispatch, reconIdent)
      }
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
  return reconstructions.cachedReconstructions[reconstructions.selectedReconstruction];
};

export default reconstructions;
