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

const getClonalFamiliesPage = () => {
  return createSelector(
    [getClonalFamilies, getPagination],
    (data, pagination) => {
      return computeClonalFamiliesPage(data, pagination)
    }
  )
}

export default getClonalFamiliesPage
