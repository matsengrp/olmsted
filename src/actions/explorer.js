
import * as types from "./types"


export const pageDown = {type: types.PAGE_DOWN}
export const pageUp = {type: types.PAGE_UP}

export const toggleSort = (attribute) => {
  return {type: types.TOGGLE_SORT, column: attribute}}

// TODO Right now this is taking the entire family record, but should really just be taking the ident
export const selectFamily = (family) => {
  return {type: types.TOGGLE_FAMILY, family: family}}

