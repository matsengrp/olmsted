import * as types from "../actions/types";
import * as _ from "lodash";

const initialState = {
  brushSelecting: false,
  brushSelection: undefined,
  selectedFamily: undefined,
  selectedSeq: {},
  // 2 indexes so that we can access data differently depending on what we need to get to
  byDatasetId: {},
  byIdent: {},
  pagination: {page: 0, per_page: 10, order_by: "n_unique_seqs", desc: true},
  // EH:facet field is no longer required to update the spec but 
  // I am leaving it in store to allow for https://github.com/matsengrp/olmsted/issues/91
  facetByField: "none",
  locus: "igh"
}

const clonalFamilies = (state = _.clone(initialState), action) => {
  switch (action.type) {
    case types.RESET_CLONAL_FAMILIES_STATE: {
      // Want to reset the clonal families state without
      // getting rid of our raw clonal families data
      let reset_state = _.omit(_.clone(initialState), ['byDatasetId', 'byIdent'])
      return Object.assign({}, state, reset_state);
    } case types.CLONAL_FAMILIES_RECEIVED: {
      // have to update both indices here
      let newClonalFamiliesDictEntry = {}
      newClonalFamiliesDictEntry[action.dataset_id] = action.clonalFamilies
      let updatedClonalFamiliesDict = Object.assign({}, state.byDatasetId, newClonalFamiliesDictEntry);
      let updatedByIdent = Object.assign({}, state.byIdent, _.fromPairs(_.map(action.clonalFamilies, (x) => [x.ident, x])));
      return Object.assign({}, state, {
        byDatasetId: updatedClonalFamiliesDict,
        byIdent: updatedByIdent
      });
    } case types.SELECTING_STATUS: {
      return Object.assign({}, state, {
        brushSelecting: !state.brushSelecting
      });
    } case types.FILTER_BRUSH_SELECTION: { 
      let brushDelta = {filter: {fieldName: action.key, range: action.value}}
      let new_brushSelection = Object.assign({}, state.brushSelection, brushDelta);

      let new_pagination = Object.assign({}, state.pagination, {
        page: 0
      });
      // console.log("adding filter", new_brushSelection)
      return Object.assign({}, state, {
        brushSelection: new_brushSelection,
        pagination: new_pagination
      });
    } case types.UPDATE_BRUSH_SELECTION: { 
      // the updatedBrushData is an array of [<axis>, brush_<attr-name>, [range_x0, range_x1]]
      let attr = action.updatedBrushData[1] //.replace("brush_", "")
      let range
      // if no brush selection has been made or if brush has been unselected, range will be undefined
      if (action.updatedBrushData[2] && action.updatedBrushData[2].length) {
        // if we have a range, first slice so that we get a copy (important or weird state bugs crop up with
        // vega), and then sort so that we have range in canonical order
        range = action.updatedBrushData[2].slice(0)
        range = _.sortBy(range)
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
      // console.log("adding brush", new_brushSelection)
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
        selectedFamily: action.family_ident,
        selectedSeq: {},
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
    } case types.UPDATE_FACET: {
      return Object.assign({}, state, {
        facetByField: action.facetByField
      });
    } case types.FILTER_LOCUS: {
      return Object.assign({}, state, {
        locus: action.locus,
      });
    } default: {
      return state;
    }
  }
};

export default clonalFamilies;
