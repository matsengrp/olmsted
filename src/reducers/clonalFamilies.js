import * as types from "../actions/types";
import * as _ from "lodash";
import * as fun from '../components/framework/fun';

const checkInRange = (axis, datum, brushSelection) => {
  return (brushSelection[axis]["range"][0] < datum[brushSelection[axis]["fieldName"]]) && (datum[brushSelection[axis]["fieldName"]] < brushSelection[axis]["range"][1])
}

const checkBrushSelection = (brushSelection, datum) => {
  if(brushSelection["x"] && brushSelection["y"]){
    if(brushSelection["x"]["range"] && brushSelection["y"]["range"]){
      return (checkInRange("x", datum, brushSelection)) && (checkInRange("y", datum, brushSelection))
    }
  }
  return true
}

const applyFilters = (data, brushSelection) => {
  if (brushSelection) {
    let newdata =  _.filter(data, _.partial(checkBrushSelection, brushSelection))
    return newdata
  }
  return data
}

const computeClonalFamiliesPage = (data, pagination) => 
  fun.threadf(data,
    [_.orderBy,  [pagination.order_by], [pagination.desc ? "desc":"asc"]],
    [_.drop,     pagination.page * pagination.per_page],
    [_.take,     pagination.per_page])

const computeAvailableClonalFamilies = (allClonalFamilies, selectedDatasetIds) => {
  let result = allClonalFamilies
  if(selectedDatasetIds.size > 0){ 
    result = _.filter(allClonalFamilies, (family) => {
      return selectedDatasetIds.has(family.dataset.id)}
    ) 
  }
  return result
}
    

const clonalFamilies = (state = {
  selectedDatasets: [],
  brushSelection: undefined,
  selectedFamily: undefined,
  selectedSeq: {},
  brushedClonalFamilies: [],
  availableClonalFamilies: [],
  allClonalFamilies: [],
  pagination: {page: 0, per_page: 10, order_by: "n_seqs", desc: true, last_page: Infinity},
  treeScale: {branch_scale:950, height_scale:10}
}, action) => {
  switch (action.type) {
    case types.CLONAL_FAMILIES_RECEIVED: {
      // cant pass global state including datasets info here 
      let new_pagination = Object.assign({}, state.pagination, {
        last_page: Math.ceil(action.availableClonalFamilies.length/state.pagination.per_page)-1 // use ceil-1 because we start at page 0
      });
      return Object.assign({}, state, {
        brushedClonalFamilies: action.availableClonalFamilies,
        allClonalFamilies: action.availableClonalFamilies,
        availableClonalFamilies: action.availableClonalFamilies,
        pagination: new_pagination
      });
    } case types.TOGGLE_DATASETS: {
      var selectedSet = new Set(state.selectedDatasets)
      action.dataset_ids.forEach( (dataset_id) => {
        selectedSet.has(dataset_id) ? selectedSet.delete(dataset_id) : selectedSet.add(dataset_id)
      })
      let newAvailableClonalFamilies = computeAvailableClonalFamilies(state.allClonalFamilies, selectedSet)
      let updatedSelectedDatasets = Array.from(selectedSet)
      console.log("TOGGLING", updatedSelectedDatasets, newAvailableClonalFamilies.length)
      return Object.assign({}, state, {
        selectedDatasets: updatedSelectedDatasets,
        availableClonalFamilies: newAvailableClonalFamilies
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
      let new_brushSelection = Object.assign({}, state.brushSelection, brushDelta);

      //Compute which families are in the brush selection: brushedFamilies
      // cant pass global state including datasets info here ; this wont work
      let new_brushedFamilies = applyFilters(state.availableClonalFamilies, new_brushSelection)

      //Compute new last page based on selection and update the page to send it back to page 0
      let new_pagination = Object.assign({}, state.pagination, {
        page: 0,
        last_page: Math.ceil(new_brushedFamilies.length/state.pagination.per_page)-1 // use ceil-1 because we start at page 0
      });

      return Object.assign({}, state, {
        brushSelection: new_brushSelection,
        pagination: new_pagination,
        brushedClonalFamilies: new_brushedFamilies
      });
    } case types.PAGE_DOWN: {
      if (state.pagination.page+1 <= state.pagination.last_page){
        let new_pagination = Object.assign({}, state.pagination, {
          page: state.pagination.page + 1
        });
        return Object.assign({}, state, {
          pagination: new_pagination
        });
      }
      return state
    } case types.PAGE_UP: {
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
      let same_column = action.column == state.pagination.order_by
      let new_pagination = Object.assign({}, state.pagination, {
        page: 0,
        order_by: action.column,
        desc: same_column ? !state.pagination.desc : true
      });
      return Object.assign({}, state, {
        pagination: new_pagination
      });
    } case types.AUTOSELECT_FAMILY: {
      let first_page = computeClonalFamiliesPage(state.brushedClonalFamilies, state.pagination)
      console.log("AUTOSELECT_FAMILY", first_page[0].ident)

      return Object.assign({}, state, {
        selectedFamily: first_page[0].ident,
        selectedReconstruction: null,
        selectedSeq: {},
        treeScale: {branch_scale:950, height_scale:10}
      });
    } case types.TOGGLE_FAMILY: {
      console.log("TOGGLE_FAMILY", action.family_id)
      return Object.assign({}, state, {
        selectedFamily: action.family_id,
        selectedReconstruction: null,
        selectedSeq: {},
        treeScale: {branch_scale:950, height_scale:10}
      });
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
    } default: {
      return state;
    }
  }
};

export default clonalFamilies;
