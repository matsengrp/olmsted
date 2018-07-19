import { createSelector } from 'reselect';
import * as _ from 'lodash';
import * as fun from '../components/framework/fun';

const getClonalFamilies = (state) => state.availableClonalFamilies

const getPagination = (state) => state.pagination

const computeClonalFamiliesPage = (data, pagination) => 
  fun.threadf(data,
    [_.orderBy,  [pagination.order_by], [pagination.desc ? "desc":"asc"]],
    [_.drop,     pagination.page * pagination.per_page],
    [_.take,     pagination.per_page])

const getBrushSelection = state => state.brushSelection

// Stubbing for now to always return true; TODO: have this use the brush selection to check whether the datum
// is in brush selection range for both x and y; Also have to write actions and reducers to get this brush
// selection data in to the store and to here

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
    console.log("BRUSH SELECTION EXISTS: ", brushSelection)
    let result =  _.filter(data, _.partial(checkBrushSelection, brushSelection))
    console.log(result)
    return result
  }
  console.log("BRUSH SELECTION DOES NOT EXIST")
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
