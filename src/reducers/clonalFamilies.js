import * as types from "../actions/types";
import * as _ from "lodash";

const initialState = {
  brushSelecting: false,
  brushSelection: undefined,
  selectedFamily: undefined,
  selectedSeq: {},
  allClonalFamilies: [],
  pagination: {page: 0, per_page: 10, order_by: "n_seqs", desc: true},
  treeScale: {branch_scale:950, height_scale:10}
}

const clonalFamilies = (state = {
  loadingClonalFamilies: false,
  brushSelecting: false,
  brushSelection: undefined,
  selectedFamily: undefined,
  selectedSeq: {},
  allClonalFamilies: [],
  pagination: {page: 0, per_page: 10, order_by: "n_seqs", desc: true},
  facetByField: undefined,
  treeScale: {branch_scale:950, height_scale:10}
}, action) => {
  switch (action.type) {
    case types.LOADING_CLONAL_FAMILIES: {
      return Object.assign({}, state, {loadingClonalFamilies: action.isLoading});
    } case types.RESET_CLONAL_FAMILIES_STATE: {
      // Want to reset the clonal families state without
      // getting rid of our raw clonal families data
      let reset_state = _.omit(initialState, 'allClonalFamilies')
      console.log(reset_state)
      return Object.assign({}, state, reset_state);
    } case types.CLONAL_FAMILIES_RECEIVED: {
      return Object.assign({}, state, {
        allClonalFamilies: action.allClonalFamilies
      });
    } case types.SELECTING_STATUS: {
      return Object.assign({}, state, {
        brushSelecting: !state.brushSelecting
      });
    } case types.UPDATE_BRUSH_SELECTION: { 
      // the updatedBrushData is an array of [brush_<attr-name>, [range_x0, range_x1]]
      let attr = action.updatedBrushData[1] //.replace("brush_", "")
      let range
      // if no brush selection has been made or if brush has been unselected, range will be undefined
      if (action.updatedBrushData[2]) {
        // if we have a range, first slice so that we get a copy (important or weird state bugs crop up with
        // vega), and then sort so that we have range in canonical order
        range = action.updatedBrushData[2].slice(0)
        range = _.sortBy(range)
      } else {
        // otherwise leave undefined, to trigger select all in selectors.clonalFamilies.checkBrushSelection
        range = undefined
      }

      // define new brushselection
      let brushDelta = {};
      let axis = action.updatedBrushData[0];
      brushDelta[axis] = {};
      brushDelta[axis]["fieldName"] = attr;
      brushDelta[axis]["range"] = range;
      // brushSelection.clicked is set to the ident of a particular family if 
      // we have clicked to select that family instead of doing a brush selection
      // Set it false here so we can have default brush selection filtering
      brushDelta.clicked = false;
      let new_brushSelection = Object.assign({}, state.brushSelection, brushDelta);

      //Send it back to page 0
      let new_pagination = Object.assign({}, state.pagination, {
        page: 0
      });
      
      return Object.assign({}, state, {
        brushSelection: new_brushSelection,
        pagination: new_pagination
      });
    } case types.PAGE_DOWN: {
      // Note that this DOES NOT check that this page down operation is legal
      // We check that whether it is a legal page down inside the table
      // because the last page is derived from a selector that updates the props of the table
      let new_pagination = Object.assign({}, state.pagination, {
        page: state.pagination.page + 1
      });
      return Object.assign({}, state, {
        pagination: new_pagination
      });     
    } case types.PAGE_UP: {
      // We could move check this into the table to be consistent. Otherwise we can leave it as is.
      if (state.pagination.page-1 >= 0){
        let new_pagination = Object.assign({}, state.pagination, {
          page: state.pagination.page - 1
        });
        return Object.assign({}, state, {
          pagination: new_pagination
        });
      }
      return state
    } case types.TOGGLE_SORT: {
      // We default to descending order when sorting by a new column
      let same_column = action.column == state.pagination.order_by
      let new_pagination = Object.assign({}, state.pagination, {
        page: 0,
        order_by: action.column,
        desc: same_column ? !state.pagination.desc : true
      });
      return Object.assign({}, state, {
        pagination: new_pagination
      });
    } case types.TOGGLE_FAMILY: {
      let updates = {
        selectedFamily: action.family_id,
        selectedReconstruction: null,
        selectedSeq: {},
        treeScale: {branch_scale:950, height_scale:10}
      }
      // action.updateBrushSelection specifies whether we would like to 
      // include just this family in our brush selection
      // and therefore in the table since we have clicked it
      if(action.updateBrushSelection){
        updates.brushSelection = {clicked: action.family_id}
        updates.pagination = Object.assign({}, state.pagination, {page: 0})
      }
      return Object.assign({}, state, updates);
    } case types.UPDATE_SELECTED_SEQ: {
      return Object.assign({}, state, {
        selectedSeq: action.seq,
      });
    } case types.UPDATE_SELECTED_RECONSTRUCTION: {
      return Object.assign({}, state, {
        selectedReconstruction: action.reconstruction,
      });
    } case types.UPDATE_TREE_SCALE: {
      let new_tree_scale = Object.assign({}, state.treeScale, action.val);
      return Object.assign({}, state, {
        treeScale: new_tree_scale
      });
    } case types.UPDATE_FACET: {
      return Object.assign({}, state, {
        facetByField: action.facetByField
      });
    } default: {
      return state;
    }
  }
};

export default clonalFamilies;
