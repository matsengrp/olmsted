import { createSelector } from 'reselect';
import * as _ from 'lodash';
import * as fun from '../components/framework/fun';

const getBrushedClonalFamilies = (state) => state.brushedClonalFamilies

const getPagination = (state) => state.pagination

const computeClonalFamiliesPage = (data, pagination) => 
  fun.threadf(data,
    [_.orderBy,  [pagination.order_by], [pagination.desc ? "desc":"asc"]],
    [_.drop,     pagination.page * pagination.per_page],
    [_.take,     pagination.per_page])



export const getClonalFamiliesPageSelector = () => {
  return createSelector(
    [getBrushedClonalFamilies, getPagination],
    (data, pagination) => {
      return computeClonalFamiliesPage(data, pagination)
    }
  )
}

const getAvailableClonalFamilies = (state) => state.clonalFamilies.availableClonalFamilies

const getAvailableDatasets = (state) => state.datasets.availableDatasets

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
  if(selectedDatasetIds.size > 0){ availableClonalFamilies = _.filter(families, (family) => {
      return selectedDatasetIds.has(family.dataset.id)}
    
    ) 
  }
  return availableClonalFamilies
}

export const availableClonalFamiliesSelector = createSelector(
    [getAvailableClonalFamilies, getAvailableDatasets],
    (families, datasets) => {
      console.log("SEELECTOR")
      return computeAvailableClonalFamilies(families, datasets)
    }
  )
