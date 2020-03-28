
import * as types from "./types"
import * as loadData from "../actions/loadData.js"
import * as treesSelector from "../selectors/trees"

export const pageDown = {type: types.PAGE_DOWN}
export const pageUp = {type: types.PAGE_UP}

export const toggleSort = (attribute) => {
  return {type: types.TOGGLE_SORT, column: attribute}}

// Second argument specifies whether we would like to 
// include just this lineage in our brush selection
// and therefore in the table since we have clicked it
export const selectLineage = (ident, updateBrushSelection=false) => {
  return (dispatch, getState) => {
    dispatch({type: types.TOGGLE_LINEAGE, lineage_ident: ident, updateBrushSelection})
    let {trees, clonalLineages} = getState()
    let clonalLineage = clonalLineages.byIdent[ident]
    let clonalLineageTrees = clonalLineage ? (clonalLineage.trees || []) : []
    _.forEach(clonalLineageTrees, (tree) => loadData.getTree(dispatch, tree.ident))}}

export const updateSelectedSeq = (seq) => {
  return {type: types.UPDATE_SELECTED_SEQ, seq: seq}}

export const updateSelectedTree = (treeIdent, selectedLineage, selectedSeq) => {
  return (dispatch, getState) => {
    let {trees} = getState()
    let deselectSeq = true
    if (selectedSeq) {
      let newSelectedTree = treesSelector.getTreeFromCache(trees.cache, selectedLineage, treeIdent)
      let selectedSeqInNewTree = _.find(newSelectedTree.nodes, {"sequence_id": selectedSeq})
      
      deselectSeq = !selectedSeqInNewTree
    }
    if (deselectSeq) {
      dispatch(updateSelectedSeq(undefined))}
    // This is how we deselect the currently selected sequence
    dispatch({type: types.UPDATE_SELECTED_TREE, tree: treeIdent})
  }
}

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
  return {type: types.RESET_CLONAL_LINEAGES_STATE}}

