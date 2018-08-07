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
