
import * as types from "./types"


export const pageDown = {type: types.PAGE_DOWN}
export const pageUp = {type: types.PAGE_UP}

export const toggleSort = (attribute) => {
  return {type: types.TOGGLE_SORT, column: attribute}}

// Second argument specifies whether we would like to 
// include just this family in our brush selection
// and therefore in the table since we have clicked it
export const selectFamily = (id, updateBrushSelection=false) => {
  return {type: types.TOGGLE_FAMILY, family_id: id, updateBrushSelection}}

export const updateSelectedSeq = (seq) => {
  return {type: types.UPDATE_SELECTED_SEQ, seq: seq}}

export const updateSelectedReconstruction = (reconIdent) => {
  return {type: types.UPDATE_SELECTED_RECONSTRUCTION, reconstruction: reconIdent}}

export const updateSelectingStatus = () => {
  return {type: types.SELECTING_STATUS}}

export const updateBrushSelection = (dim, attr, data) => {
    let updateBrushData = [dim, attr, data]
    return {type: types.UPDATE_BRUSH_SELECTION, updatedBrushData: updateBrushData}}

export const filterBrushSelection = (key, value) => {
  return {type: types.FILTER_BRUSH_SELECTION, key, value}}

export const updateFacet = (facetByField) => {
  return {type: types.UPDATE_FACET, facetByField}}

export const filterLocus = (locus) => {
  return {type: types.FILTER_LOCUS, locus}}

export const resetState = () => {
  return {type: types.RESET_CLONAL_FAMILIES_STATE}}

