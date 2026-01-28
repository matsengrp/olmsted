import { createSelector, lruMemoize, createSelectorCreator } from "reselect";
import * as _ from "lodash";
import * as fun from "../components/framework/fun";
// create a "selector creator" that uses lodash.isEqual instead of ===
const createDeepEqualSelector = createSelectorCreator(lruMemoize, _.isEqual);

// FILTER CLONAL FAMILIES BY SELECTED DATASETS

const getClonalFamiliesDict = (state) => state.clonalFamilies.byDatasetId;

const getDatasets = (state) => state.datasets.availableDatasets;

const getLocusFilter = (state) => state.clonalFamilies.locus;

const getHighLevelFilters = (state) => state.clonalFamilies.filters;

export const countLoadedClonalFamilies = (datasets) => {
  let clones = 0;
  if (datasets.length > 0) {
    clones += _.filter(datasets, (dataset) => dataset.loading && dataset.loading === "DONE").reduce(
      (count, dataset) => count + dataset.clone_count,
      0
    );
  }
  return clones;
};

/**
 * Apply high-level filters to a list of clonal families.
 * Filters is an object like: { fieldName: [selectedValues], ... }
 * A family passes if ALL filter fields match (AND logic).
 * For each field, the family passes if its value is in the selected values (OR logic within field).
 */
const applyHighLevelFilters = (families, filters, datasets) => {
  if (!filters || Object.keys(filters).length === 0) {
    return families;
  }

  return _.filter(families, (family) => {
    // Check each filter field
    for (const [fieldName, selectedValues] of Object.entries(filters)) {
      if (!selectedValues || selectedValues.length === 0) {
        continue; // No filter for this field
      }

      let familyValue;

      // Handle special field names that need resolution
      if (fieldName === "dataset_name") {
        const dataset = datasets.find((d) => d.dataset_id === family.dataset_id);
        familyValue = dataset ? dataset.name || dataset.dataset_id : family.dataset_id;
      } else if (fieldName === "sample.locus") {
        // Special case-insensitive handling for locus
        familyValue = family.sample && family.sample.locus
          ? family.sample.locus.toUpperCase()
          : undefined;
      } else if (fieldName.includes(".")) {
        // Handle nested fields like "sample.subject_id"
        const fieldValues = _.at(family, fieldName);
        familyValue = fieldValues.length ? fieldValues[0] : undefined;
      } else if (fieldName === "subject_id" || fieldName === "sample_id") {
        // Check top-level first, then nested under sample
        familyValue = family[fieldName] || (family.sample ? family.sample[fieldName] : undefined);
      } else {
        familyValue = family[fieldName];
      }

      // Check if family value is in selected values
      if (!selectedValues.includes(familyValue)) {
        return false;
      }
    }
    return true;
  });
};

const computeAvailableClonalFamilies = (byDatasetId, datasets, filters) => {
  let availableClonalFamilies = [];
  if (datasets.length > 0) {
    _.forEach(datasets, (dataset) => {
      if (dataset.loading && dataset.loading === "DONE") {
        availableClonalFamilies = availableClonalFamilies.concat(byDatasetId[dataset.dataset_id]);
      }
    });
  }

  // Apply high-level filters (including locus filter)
  return applyHighLevelFilters(availableClonalFamilies, filters, datasets);
};

export const getAvailableClonalFamilies = createDeepEqualSelector(
  [getClonalFamiliesDict, getDatasets, getHighLevelFilters],
  computeAvailableClonalFamilies
);

/**
 * Get ALL clonal families without locus filtering.
 * Used for paired clone lookup - we need to find paired clones even when
 * they're filtered out of the scatterplot (e.g., light chain filtered out).
 */
export const getAllClonalFamilies = createDeepEqualSelector(
  [getClonalFamiliesDict, getDatasets],
  (byDatasetId, datasets) => {
    let allClonalFamilies = [];
    if (datasets.length > 0) {
      _.forEach(datasets, (dataset) => {
        if (dataset.loading && dataset.loading === "DONE") {
          allClonalFamilies = allClonalFamilies.concat(byDatasetId[dataset.dataset_id]);
        }
      });
    }
    return allClonalFamilies;
  }
);

// FILTER TABLE RESULTS BY BRUSH SELECTION

const getBrushSelection = (state) => state.clonalFamilies.brushSelection;

const checkInRange = (axis, datum, brushSelection) => {
  return (
    brushSelection[axis]["range"][0] < datum[brushSelection[axis]["fieldName"]] &&
    datum[brushSelection[axis]["fieldName"]] < brushSelection[axis]["range"][1]
  );
};

const checkBrushSelection = (brushSelection, datum, datasets = []) => {
  // Check filter on a specific field
  // This is necessary when we facet and
  // want to only select from the pane
  // where "has_seed == true", for example
  if (brushSelection.filter && brushSelection.filter.fieldName !== "none") {
    let fieldValue;

    // Special handling for dataset_name - resolve from dataset_id
    if (brushSelection.filter.fieldName === "dataset_name") {
      const dataset = datasets.find((d) => d.dataset_id === datum.dataset_id);
      fieldValue = dataset ? dataset.name || dataset.dataset_id : datum.dataset_id;
    } else {
      // Using _.at to allow indexing nested fields like dataset.dataset_id
      const fieldValues = _.at(datum, brushSelection.filter.fieldName);
      fieldValue = fieldValues.length ? fieldValues[0] : undefined;
    }

    if (fieldValue !== brushSelection.filter.range) {
      return false;
    }
  }
  // Check brush selection ranges
  if (brushSelection["x"] && brushSelection["y"]) {
    if (brushSelection["x"]["range"] && brushSelection["y"]["range"]) {
      return checkInRange("x", datum, brushSelection) && checkInRange("y", datum, brushSelection);
    }
  }
  return true;
};

const applyFilters = (data, brushSelection, datasets) => {
  if (brushSelection) {
    // If we have clicked a family instead of doing a brush selection, that
    // family's ident should be the value of brushSelection.clicked
    // Otherwise, we should filter as always on the bounds of the brush selection
    const filteredData = brushSelection.clicked
      ? [_.find(data, { ident: brushSelection.clicked })]
      : _.filter(data, (datum) => checkBrushSelection(brushSelection, datum, datasets));
    return filteredData;
  }
  return data;
};

export const getBrushedClonalFamilies = createDeepEqualSelector(
  [getAvailableClonalFamilies, getBrushSelection, getDatasets],
  applyFilters
);

const getPagination = (state) => state.clonalFamilies.pagination;

export const getLastPage = createDeepEqualSelector(
  [getPagination, getBrushedClonalFamilies],
  (pagination, brushedClonalFamilies) => {
    return Math.ceil(brushedClonalFamilies.length / pagination.per_page) - 1; // use ceil-1 because we start at page 0
  }
);

const computeClonalFamiliesPage = (data, pagination) =>
  fun.threadf(
    data,
    [_.orderBy, [pagination.order_by], [pagination.desc ? "desc" : "asc"]],
    [_.drop, pagination.page * pagination.per_page],
    [_.take, pagination.per_page]
  );

export const getClonalFamiliesPage = createDeepEqualSelector(
  [getBrushedClonalFamilies, getPagination],
  computeClonalFamiliesPage
);

// selector for selected family ident
const _getSelectedFamilyIdent = (state) => state.clonalFamilies.selectedFamily;

// selector for clonal family record
export const getSelectedFamily = createSelector(
  [getClonalFamiliesPage, (state) => state.clonalFamilies.byIdent[state.clonalFamilies.selectedFamily]],
  (page, selected) => {
    return selected ? selected : page[0];
  }
);

// PAIRED DATA HELPERS

/**
 * Determine if a clone is heavy or light chain based on locus
 * @param {Object} clone - The clone object
 * @returns {string} 'heavy' or 'light'
 */
export const getCloneChain = (clone) => {
  if (!clone || !clone.sample || !clone.sample.locus) {
    return "heavy"; // default to heavy if unknown
  }
  const locus = clone.sample.locus.toLowerCase();
  // IGH = heavy chain, IGK/IGL = light chain (kappa/lambda)
  return locus === "igh" ? "heavy" : "light";
};

/**
 * Find the paired clone for a given clone (by pair_id)
 * @param {Array} clonalFamilies - Array of all clonal families
 * @param {Object} clone - The clone to find the pair for
 * @returns {Object|null} The paired clone or null if not found
 */
export const getPairedClone = (clonalFamilies, clone) => {
  if (!clone || !clone.is_paired || !clone.pair_id) {
    return null;
  }
  // Find the other clone with the same pair_id but different ident
  return _.find(clonalFamilies, (cf) =>
    cf.pair_id === clone.pair_id && cf.ident !== clone.ident
  ) || null;
};

/**
 * Determine heavy/light clone assignments for paired data
 *
 * This selector consolidates the logic for determining which clone is heavy
 * and which is light, handling the case where the user may have selected
 * either the heavy or light clone from the table.
 *
 * @param {Object} selectedFamily - The currently selected clone/family
 * @param {Object} pairedClone - The paired clone (if it exists)
 * @returns {Object} Object with heavyClone and lightClone properties
 *
 * @example
 * const { heavyClone, lightClone } = getHeavyLightClones(selectedFamily, pairedClone);
 */
export const getHeavyLightClones = (selectedFamily, pairedClone) => {
  if (!selectedFamily) {
    return { heavyClone: null, lightClone: null };
  }

  const selectedFamilyChain = getCloneChain(selectedFamily);
  const selectedIsHeavy = selectedFamilyChain === "heavy";

  return {
    heavyClone: selectedIsHeavy ? selectedFamily : pairedClone,
    lightClone: selectedIsHeavy ? pairedClone : selectedFamily
  };
};
