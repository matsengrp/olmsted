import * as types from "../actions/types";

const clonalFamilies = (state = {
  brushSelection: undefined,
  visibleClonalFamilies: [],
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
    } case types.UPDATE_BRUSH_SELECTION: {
      if (action.updatedBrushData[0] == "brush_mean_mut_freq") {
          let sortedBrushRange = action.updatedBrushData[1].slice(0).sort()
          let new_brushSelection = Object.assign({}, state.brushSelection, {
            mean_mut_freq: sortedBrushRange
          });
          return Object.assign({}, state, {
            brushSelection: new_brushSelection
          });
      }
      if (action.updatedBrushData[0] == "brush_n_seqs") {
          let sortedBrushRange = action.updatedBrushData[1].slice(0).sort()
          let new_brushSelection = Object.assign({}, state.brushSelection, {
            n_seqs: sortedBrushRange
          });
          return Object.assign({}, state, {
            brushSelection: new_brushSelection
          });
      }  
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
