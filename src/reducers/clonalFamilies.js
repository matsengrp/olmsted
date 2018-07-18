import * as types from "../actions/types";
import { chooseDisplayComponentFromPathname } from "../actions/navigation";

const clonalFamilies = (state = {
  availableClonalFamilies: [],
  pagination: {page: 0, per_page: 10, order_by: "n_seqs", desc: true, last_page: Infinity}
}, action) => {
  switch (action.type) {
    case types.CLONAL_FAMILIES_RECEIVED: {
      let new_pagination = Object.assign({}, state.pagination, {
        last_page: Math.ceil(action.availableClonalFamilies.length/state.pagination.per_page)
      });
      return Object.assign({}, state, {
        availableClonalFamilies: action.availableClonalFamilies,
        pagination: new_pagination
      });
    } case types.PAGE_DOWN: {
      if(state.pagination.page+1 <= state.pagination.last_page){
        let new_pagination = Object.assign({}, state.pagination, {
          page: state.pagination.page += 1
        });
        return Object.assign({}, state, {
          pagination: new_pagination
        });
      }
      return state;
    } case types.PAGE_UP: {
      if(state.pagination.page > 0){
        let new_pagination = Object.assign({}, state.pagination, {
          page: state.pagination.page -= 1
        });
        return Object.assign({}, state, {
          pagination: new_pagination
        });
      }
      return state;
    } case types.TOGGLE_SORT: {
      console.log(action);
      let new_pagination = Object.assign({}, state.pagination, {
        page: 0,
        order_by: action.column,
        desc: !state.pagination.desc
      });
      return Object.assign({}, state, {
        pagination: new_pagination
      });
    } default: {
      return state;
    }
  }
};

export default clonalFamilies;
