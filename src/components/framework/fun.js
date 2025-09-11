import * as _ from 'lodash';


// Threading macros let you thread data through a series of transformations more elegantly.
//
// Consider the following code
//
// const computeClonalFamiliesPage = (data, pagination) =>
//     _.take(
//        _.drop(
//            _.orderBy(data,[pagination.order_by], [pagination.desc ? "desc":"asc"]),
//            pagination.page * pagination.per_page
//        ),
//        pagination.per_page)
//
// Not particularly easy to read if you ask me, because each step is spread across multiple lines
//
// Threading macros let you do this
//
// const computeClonalFamiliesPage = (data, pagination) =>
//   fun.threadf(data,
//     [_.orderBy,  [pagination.order_by], [pagination.desc ? "desc":"asc"]],
//     [_.drop,     pagination.page * pagination.per_page],
//     [_.take,     pagination.per_page])
//
// Think of pushing the data here through a series of transformations,

const _thread = (isThreadFirst, init, ...forms) => forms.reduce((prev, next) => {
  if (Array.isArray(next)) {
    const [head, ...tail] = next;
    return isThreadFirst ? head.apply(this, [prev, ...tail]) : head.apply(this, tail.concat(prev));
  }
  console.log("next is:", next, "prev is:", prev);
  return next.call(this, prev);

}, init);


// Thread first
export const threadf = (init, ...forms) => _thread(true, init, ...forms);

// Thread last
export const threadl = (init, ...forms) => _thread(false, init, ...forms);
