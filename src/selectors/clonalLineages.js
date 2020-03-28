import { createSelector, defaultMemoize, createSelectorCreator} from 'reselect';
import * as _ from 'lodash';
import * as fun from '../components/framework/fun';
import { timerEnd, timerStart } from '../util/perf';
// create a "selector creator" that uses lodash.isEqual instead of ===
const createDeepEqualSelector = createSelectorCreator(
  defaultMemoize,
  _.isEqual
)

// FILTER CLONAL LINEAGES BY SELECTED DATASETS

const getClonalLineagesDict = (state) => state.clonalLineages.byDatasetId

const getDatasets = (state) => state.datasets.availableDatasets

const getLocusFilter = (state) => state.clonalLineages.locus

const computeAvailableClonalLineages = (byDatasetId, datasets, locus) => {
  var availableClonalLineages = []
  if(datasets.length > 0){ 
    _.forEach(datasets, (dataset) => {
      if(dataset.loading && dataset.loading == "DONE"){ 
        availableClonalLineages = availableClonalLineages.concat(byDatasetId[dataset.dataset_id]) }
    })
  }
  return locus == "ALL" ? availableClonalLineages : _.filter(availableClonalLineages, {"sample": {"locus": locus}})
}

export const getAvailableClonalLineages = createDeepEqualSelector(
    [getClonalLineagesDict, getDatasets, getLocusFilter],
    computeAvailableClonalLineages)

// FILTER TABLE RESULTS BY BRUSH SELECTION

const getBrushSelection = (state) => state.clonalLineages.brushSelection

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
    // Using _.at to allow indexing nested fields like dataset.dataset_id; reject datum if it does not match filter
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
    // If we have clicked a lineage instead of doing a brush selection, that
    // lineage's ident should be the value of brushSelection.clicked
    // Otherwise, we should filter as always on the bounds of the brush selection
    data = brushSelection.clicked ? [_.find(data, {"ident": brushSelection.clicked})] :
                                          _.filter(data, _.partial(checkBrushSelection, brushSelection))
  }
  return data
}

export const getBrushedClonalLineages = createDeepEqualSelector(
  [getAvailableClonalLineages, getBrushSelection],
  applyFilters)

const getPagination = (state) => state.clonalLineages.pagination;

export const getLastPage = createDeepEqualSelector(
  [getPagination, getBrushedClonalLineages],
  (pagination, brushedClonalLineages) => {
    return Math.ceil(brushedClonalLineages.length / pagination.per_page) - 1 // use ceil-1 because we start at page 0
  }
)

const computeClonalLineagesPage = (data, pagination) => 
  fun.threadf(data,
    [_.orderBy,  [pagination.order_by], [pagination.desc ? "desc":"asc"]],
    [_.drop,     pagination.page * pagination.per_page],
    [_.take,     pagination.per_page])

export const getClonalLineagesPage = createDeepEqualSelector(
    [getBrushedClonalLineages, getPagination],
    computeClonalLineagesPage)


// selector for selected lineage ident
const getSelectedLineageIdent = (state) => state.clonalLineages.selectedLineage

// selector for clonal lineage record
export const getSelectedLineage = createSelector(
  [getClonalLineagesPage,
   (state) => state.clonalLineages.byIdent[state.clonalLineages.selectedLineage]],
  (page, selected) => {
    return selected ? selected : page[0]
  })


