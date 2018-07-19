import { createSelector } from 'reselect';
import * as _ from 'lodash';

const getClonalFamilies = (state) => state.availableClonalFamilies

const getPagination = (state) => state.pagination

const computeClonalFamiliesPage = (data, pagination) => {
    return _.take(    
            _.drop(
              _.orderBy(data,[pagination.order_by], [pagination.desc ? "desc":"asc"]),
              pagination.page * pagination.per_page
            ),
            pagination.per_page
          )
}

const brushSelection = state => state.brushSelection

// Stubbing for now to always return true; TODO: have this use the brush selection to check whether the datum
// is in brush selection range for both x and y; Also have to write actions and reducers to get this brush
// selection data in to the store and to here
const checkBrushSelection = (brushSelection, datum) => true

const applyFilters = (data, brushSelection) =>
  _.filter(data, _.partial(checkBrushSelection, brushSelection))


const getSelectedClonalFamilies = () => {
  return createSelector(
    [getClonalFamilies, getBrushSelection],
    (data, brushSelection) => {
      return applyFilters(data, brushSelection)})}

const getClonalFamiliesPage = () => {
  return createSelector(
    [getSelectedClonalFamilies, getPagination],
    (data, pagination) => {
      return computeClonalFamiliesPage(data, pagination)
    }
  )
}

export default getClonalFamiliesPage
