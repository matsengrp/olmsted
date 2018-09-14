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



const getClonalFamiliesPageSelector = () => {
  return createSelector(
    [getBrushedClonalFamilies, getPagination],
    (data, pagination) => {
      return computeClonalFamiliesPage(data, pagination)
    }
  )
}

export default getClonalFamiliesPageSelector
