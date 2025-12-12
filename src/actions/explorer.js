import * as _ from "lodash";
import * as types from "./types";
import * as loadData from "./loadData";
import { getClientTree } from "./clientDataLoader";
import * as treesSelector from "../selectors/trees";
import { getPairedClone, getAllClonalFamilies, getCloneChain } from "../selectors/clonalFamilies";

export const pageDown = { type: types.PAGE_DOWN };
export const pageUp = { type: types.PAGE_UP };

export const toggleSort = (attribute) => {
  return { type: types.TOGGLE_SORT, column: attribute };
};

// Second argument specifies whether we would like to
// include just this family in our brush selection
// and therefore in the table since we have clicked it
export const selectFamily = (ident, updateBrushSelection = false) => {
  return (dispatch, getState) => {
    dispatch({ type: types.TOGGLE_FAMILY, family_ident: ident, updateBrushSelection });
    const state = getState();
    const { clonalFamilies, datasets } = state;
    const clonalFamily = clonalFamilies.byIdent[ident];
    const clonalFamilyTrees = clonalFamily ? clonalFamily.trees || [] : [];

    // Check if this is a client-side dataset
    const datasetId = clonalFamily?.dataset_id;
    const dataset = datasets.availableDatasets?.find((d) => d.dataset_id === datasetId);
    const isClientSide = dataset?.isClientSide || dataset?.temporary;

    // Use appropriate loader based on dataset source
    _.forEach(clonalFamilyTrees, (tree) => {
      if (isClientSide) {
        getClientTree(dispatch, tree.ident);
      } else {
        loadData.getTree(dispatch, tree.ident);
      }
    });

    // For paired families, also load the paired clone's trees
    // This ensures light chain data is available for "both" and "light" modes
    // Use getAllClonalFamilies (not filtered by locus) so we can find paired clones
    // even when they're filtered out of the scatterplot
    if (clonalFamily && clonalFamily.is_paired && clonalFamily.pair_id) {
      const allClonalFamilies = getAllClonalFamilies(state);
      const pairedClone = getPairedClone(allClonalFamilies, clonalFamily);
      if (pairedClone) {
        const pairedTrees = pairedClone.trees || [];
        _.forEach(pairedTrees, (tree) => {
          if (isClientSide) {
            getClientTree(dispatch, tree.ident);
          } else {
            loadData.getTree(dispatch, tree.ident);
          }
        });
      }

      // Auto-switch chain selection based on which chain was selected
      // If user selected a light chain clone, switch to "light" mode
      // If user selected a heavy chain clone, switch to "heavy" mode
      const selectedChain = getCloneChain(clonalFamily);
      dispatch({ type: types.UPDATE_SELECTED_CHAIN, chain: selectedChain });
    }
  };
};

export const updateSelectedSeq = (seq) => {
  return { type: types.UPDATE_SELECTED_SEQ, seq: seq };
};

export const updateSelectedTree = (treeIdent, selectedFamily, selectedSeq) => {
  return (dispatch, getState) => {
    const { trees } = getState();
    let deselectSeq = true;
    if (selectedSeq) {
      const newSelectedTree = treesSelector.getTreeFromCache(trees.cache, selectedFamily, treeIdent);
      const selectedSeqInNewTree = _.find(newSelectedTree.nodes, { sequence_id: selectedSeq });

      deselectSeq = !selectedSeqInNewTree;
    }
    if (deselectSeq) {
      dispatch(updateSelectedSeq(undefined));
    }
    // This is how we deselect the currently selected sequence
    dispatch({ type: types.UPDATE_SELECTED_TREE, tree: treeIdent });
  };
};

export const updateSelectingStatus = () => {
  return { type: types.SELECTING_STATUS };
};

export const updateBrushSelection = (dim, attr, data) => {
  const updateBrushData = [dim, attr, data];
  return { type: types.UPDATE_BRUSH_SELECTION, updatedBrushData: updateBrushData };
};

export const filterBrushSelection = (key, value) => {
  return { type: types.FILTER_BRUSH_SELECTION, key, value };
};

export const clearBrushSelection = () => {
  return { type: types.CLEAR_BRUSH_SELECTION };
};

export const updateFacet = (facetByField) => {
  return { type: types.UPDATE_FACET, facetByField };
};

export const filterLocus = (locus) => {
  return { type: types.FILTER_LOCUS, locus };
};

export const resetState = () => {
  return { type: types.RESET_CLONAL_FAMILIES_STATE };
};

// Dataset selection actions for batch updates
export const toggleDatasetSelection = (dataset_id) => {
  return { type: types.TOGGLE_DATASET_SELECTION, dataset_id };
};

export const clearDatasetSelections = () => {
  return { type: types.CLEAR_DATASET_SELECTIONS };
};

export const batchUpdateDatasets = () => {
  return { type: types.BATCH_UPDATE_DATASETS };
};

// Chain selection for paired heavy/light chain data
// Options: 'heavy', 'light', 'both'
export const updateSelectedChain = (chain) => {
  return { type: types.UPDATE_SELECTED_CHAIN, chain };
};

// Track which chain was last clicked (for stacked mode lineage inference)
// Options: 'heavy', 'light'
export const updateLastClickedChain = (chain) => {
  return { type: types.UPDATE_LAST_CLICKED_CHAIN, chain };
};
