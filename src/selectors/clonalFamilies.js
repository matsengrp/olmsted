import { createSelector, defaultMemoize, createSelectorCreator} from 'reselect';
import * as _ from 'lodash';
import * as fun from '../components/framework/fun';

// create a "selector creator" that uses lodash.isEqual instead of ===
const createDeepEqualSelector = createSelectorCreator(
  defaultMemoize,
  _.isEqual
)

// FILTER CLONAL FAMILIES BY SELECTED DATASETS

const getAllClonalFamilies = (state) => state.clonalFamilies.allClonalFamilies

const getDatasets = (state) => state.datasets.availableDatasets

// #77 at some point instead of the filtering every single family on its dataset.id
// we will probably want to nest the clonal families for each dataset by a key
// so that we can just get all the clonal families for one dataset from one large
// object by doing allClonalFamilies[selected_dataset_id]
const computeAvailableClonalFamilies = (families, datasets) => {
  let selectedDatasetIds = new Set();
  _.forEach(datasets, (dataset) => {
    dataset.selected && selectedDatasetIds.add(dataset.id)
  })
  let availableClonalFamilies = families
  if(selectedDatasetIds.size > 0){ 
    availableClonalFamilies = _.filter(families, (family) => {
      return selectedDatasetIds.has(family.dataset.id)}
    ) 
  }
  return availableClonalFamilies
}

export const getAvailableClonalFamilies = createDeepEqualSelector(
    [getAllClonalFamilies, getDatasets],
    (families, datasets) => computeAvailableClonalFamilies(families, datasets)
)

// FILTER TABLE RESULTS BY BRUSH SELECTION

const getBrushSelection = (state) => state.clonalFamilies.brushSelection

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
    data =  _.filter(data, _.partial(checkBrushSelection, brushSelection))
  }
  return data
}

const getBrushedClonalFamilies = createDeepEqualSelector(
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
