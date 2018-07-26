import * as types from "../actions/types";
import * as _ from "lodash";


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
      //Update the page to send it back to page 0
      //TODO: Find a way to limit last page once final updates are made for table (other than maybe through the view)
      let new_pagination = Object.assign({}, state.pagination, {
        page: 0
      });
      // the updatedBrushData is an array of [brush_<attr-name>, [range_x0, range_x1]]
      let attr = action.updatedBrushData[0].replace("brush_", "")
      let range
      // if no brush selection has been made or if brush has been unselected, range will be undefined
      if (action.updatedBrushData[1]) {
        // if we have a range, first slice so that we get a copy (important or weird state bugs crop up with
        // vega), and then sort so that we have range in canonical order
        range = action.updatedBrushData[1].slice(0)
        range = _.sortBy(range)
      } else {
        // otherwise leave undefined, to trigger select all in selectors.clonalFamilies.checkBrushSelection
        range = undefined
      }
      let brushDelta = {}
      brushDelta[attr] = range
      let new_brushSelection = Object.assign({}, state.brushSelection, brushDelta);
      return Object.assign({}, state, {
        brushSelection: new_brushSelection,
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
