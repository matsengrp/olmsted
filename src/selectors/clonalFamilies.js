import { createSelector, defaultMemoize, createSelectorCreator} from 'reselect';
import * as _ from 'lodash';
import * as fun from '../components/framework/fun';
import { timerEnd, timerStart } from '../util/perf';
// create a "selector creator" that uses lodash.isEqual instead of ===
const createDeepEqualSelector = createSelectorCreator(
  defaultMemoize,
  _.isEqual
)

// FILTER CLONAL FAMILIES BY SELECTED DATASETS

const getClonalFamiliesDict = (state) => state.clonalFamilies.clonalFamiliesDict

const getDatasets = (state) => state.datasets.availableDatasets

const getLocusFilter = (state) => state.clonalFamilies.locus

const computeAvailableClonalFamilies = (clonalFamiliesDict, datasets, locus) => {
  var availableClonalFamilies = []
  if(datasets.length > 0){ 
    _.forEach(datasets, (dataset) => {
      if(dataset.loading && dataset.loading == "DONE"){ 
        availableClonalFamilies = availableClonalFamilies.concat(clonalFamiliesDict[dataset.id]) }
    })
  }
  return locus == "ALL" ? availableClonalFamilies : _.filter(availableClonalFamilies, {"sample": {"locus": locus}})
}

export const getAvailableClonalFamilies = createDeepEqualSelector(
    [getClonalFamiliesDict, getDatasets, getLocusFilter],
    (clonalFamiliesDict, datasets, locus) => computeAvailableClonalFamilies(clonalFamiliesDict, datasets, locus)
)

// FILTER TABLE RESULTS BY BRUSH SELECTION

const getBrushSelection = (state) => state.clonalFamilies.brushSelection

const checkInRange = (axis, datum, brushSelection) => {
  return (brushSelection[axis]["range"][0] < datum[brushSelection[axis]["fieldName"]]) && (datum[brushSelection[axis]["fieldName"]] < brushSelection[axis]["range"][1])
}

const checkBrushSelection = (brushSelection, datum) => {
  // Check filter on a specific field
  // This is necessary when we facet and 
  // want to only select from the pane 
  // where "has_seed == true", for example
  // if(brushSelection["filter"] && 
  //   brushSelection["filter"].range !== undefined &&
  //   datum[brushSelection["filter"].fieldName] !== brushSelection["filter"].range){
  //     return false
  // }
  if(brushSelection.filter &&
     brushSelection.filter.fieldName !== "none" && 
    // Using _.at to allow indexing nested fields like dataset.id; reject datum if it does not match filter
     _.at(datum, brushSelection.filter.fieldName).length && _.at(datum, brushSelection.filter.fieldName)[0] !== brushSelection.filter.range){
       return false
  }
  // Check brush selection ranges
  if(brushSelection["x"] && brushSelection["y"]){
    if(brushSelection["x"]["range"] && brushSelection["y"]["range"]){
      return (checkInRange("x", datum, brushSelection)) && (checkInRange("y", datum, brushSelection))
    }
  }
  return true
}

const applyFilters = (data, brushSelection) => {
  if (brushSelection) {
    // If we have clicked a family instead of doing a brush selection, that
    // family's ident should be the value of brushSelection.clicked
    // Otherwise, we should filter as always on the bounds of the brush selection
    data = brushSelection.clicked ? [_.find(data, {"ident": brushSelection.clicked})] :
                                          _.filter(data, _.partial(checkBrushSelection, brushSelection))
  }
  return data
}

export const getBrushedClonalFamilies = createDeepEqualSelector(
  [getAvailableClonalFamilies, getBrushSelection],
  (availableClonalFamilies, brushSelection) => {
    return applyFilters(availableClonalFamilies, brushSelection)
  }
)

const getPagination = (state) => state.clonalFamilies.pagination;

export const getLastPage = createDeepEqualSelector(
  [getPagination, getBrushedClonalFamilies],
  (pagination, brushedClonalFamilies) => {
    return Math.ceil(brushedClonalFamilies.length/pagination.per_page)-1 // use ceil-1 because we start at page 0
  }
)

const computeClonalFamiliesPage = (data, pagination) => 
  fun.threadf(data,
    [_.orderBy,  [pagination.order_by], [pagination.desc ? "desc":"asc"]],
    [_.drop,     pagination.page * pagination.per_page],
    [_.take,     pagination.per_page])

export const getClonalFamiliesPage = createDeepEqualSelector(
    [getBrushedClonalFamilies, getPagination],
    (data, pagination) => {
      return computeClonalFamiliesPage(data, pagination)
    }
)
