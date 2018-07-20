import { createSelector } from 'reselect';
import * as _ from 'lodash';
import * as fun from '../components/framework/fun';

const getClonalFamilies = (state) => state.availableClonalFamilies

const getPagination = (state) => state.pagination

const getBrushSelection = state => state.brushSelection

const computeClonalFamiliesPage = (data, pagination) =>
  fun.threadf(data,
    [_.orderBy,  [pagination.order_by], [pagination.desc ? "desc":"asc"]],
    [_.drop,     pagination.page * pagination.per_page],
    [_.take,     pagination.per_page])

const checkInRange = (key, datum, brushSelection) => {
  return (brushSelection[key][0] < datum[key]) && (datum[key] < brushSelection[key][1])
}

const checkBrushSelection = (brushSelection, datum) => {
  let keys = Object.keys(brushSelection);
  if(brushSelection[keys[0]] && brushSelection[keys[1]]){
      return (checkInRange(keys[0], datum, brushSelection)) && (checkInRange(keys[1], datum, brushSelection))
  }
  return true
}

const applyFilters = (data, brushSelection) => {
  if (brushSelection) {
    return  _.filter(data, _.partial(checkBrushSelection, brushSelection))
  }
  return data
}

const getSelectedClonalFamilies = createSelector(
    [getClonalFamilies, getBrushSelection],
    (data, brushSelection) => {
      return applyFilters(data, brushSelection)
    }
)

const getClonalFamiliesPageSelector = () => {
  return createSelector(
    [getSelectedClonalFamilies, getPagination],
    (data, pagination) => {
      return computeClonalFamiliesPage(data, pagination)
    }
  )
}

export default getClonalFamiliesPageSelector
