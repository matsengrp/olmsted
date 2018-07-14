import * as types from "../actions/types";
import { chooseDisplayComponentFromPathname } from "../actions/navigation";

const clonalFamilies = (state = {
  availableClonalFamilies: [],
}, action) => {
  switch (action.type) {
    case types.CLONAL_FAMILIES_RECEIVED: {
      return Object.assign({}, state, {
        availableClonalFamilies: action.availableClonalFamilies
      });
    } default: {
      return state;
    }
  }
};

export default clonalFamilies;
