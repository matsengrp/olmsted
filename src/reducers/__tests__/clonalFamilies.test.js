import clonalFamilies from "../clonalFamilies";
import * as types from "../../actions/types";
import { mockFamily1, mockFamily2 } from "../../__test-data__/mockState";

describe("clonalFamilies reducer", () => {
  const initialState = clonalFamilies(undefined, { type: "INIT" });

  it("returns initial state", () => {
    expect(initialState.brushSelecting).toBe(false);
    expect(initialState.brushSelection).toBeUndefined();
    expect(initialState.selectedFamily).toBeUndefined();
    expect(initialState.pagination).toEqual({
      page: 0,
      per_page: 10,
      order_by: "unique_seqs_count",
      desc: true
    });
    expect(initialState.facetByField).toBe("none");
    expect(initialState.locus).toBe("All");
    expect(initialState.selectedChain).toBe("heavy");
    expect(initialState.starredFamilies).toEqual([]);
    expect(initialState.filters).toEqual({});
  });

  describe("RESET_CLONAL_FAMILIES_STATE", () => {
    it("resets UI state but preserves data indices", () => {
      const stateWithData = {
        ...initialState,
        byDatasetId: { "dataset-1": [mockFamily1] },
        byIdent: { "family-1": mockFamily1 },
        selectedFamily: "family-1",
        brushSelecting: true
      };
      const state = clonalFamilies(stateWithData, {
        type: types.RESET_CLONAL_FAMILIES_STATE
      });
      expect(state.selectedFamily).toBeUndefined();
      expect(state.brushSelecting).toBe(false);
      expect(state.byDatasetId).toEqual({ "dataset-1": [mockFamily1] });
      expect(state.byIdent).toEqual({ "family-1": mockFamily1 });
    });
  });

  describe("CLONAL_FAMILIES_RECEIVED", () => {
    it("adds families to both indices", () => {
      const families = [mockFamily1, mockFamily2];
      const state = clonalFamilies(initialState, {
        type: types.CLONAL_FAMILIES_RECEIVED,
        dataset_id: "dataset-1",
        clonalFamilies: families
      });
      expect(state.byDatasetId["dataset-1"]).toEqual(families);
      expect(state.byIdent["family-1"]).toEqual(mockFamily1);
      expect(state.byIdent["family-2"]).toEqual(mockFamily2);
    });

    it("merges with existing data from other datasets", () => {
      const existingState = {
        ...initialState,
        byDatasetId: { "dataset-0": [{ ident: "f0" }] },
        byIdent: { "f0": { ident: "f0" } }
      };
      const state = clonalFamilies(existingState, {
        type: types.CLONAL_FAMILIES_RECEIVED,
        dataset_id: "dataset-1",
        clonalFamilies: [mockFamily1]
      });
      expect(state.byDatasetId["dataset-0"]).toBeDefined();
      expect(state.byDatasetId["dataset-1"]).toBeDefined();
    });
  });

  describe("SELECTING_STATUS", () => {
    it("toggles brushSelecting", () => {
      const state = clonalFamilies(initialState, {
        type: types.SELECTING_STATUS
      });
      expect(state.brushSelecting).toBe(true);

      const state2 = clonalFamilies(state, {
        type: types.SELECTING_STATUS
      });
      expect(state2.brushSelecting).toBe(false);
    });
  });

  describe("UPDATE_BRUSH_SELECTION", () => {
    it("sets brush selection with x/y ranges and resets page", () => {
      const stateWithPage = { ...initialState, pagination: { ...initialState.pagination, page: 3 } };
      const state = clonalFamilies(stateWithPage, {
        type: types.UPDATE_BRUSH_SELECTION,
        updatedBrushData: ["x", "unique_seqs_count", [5, 20]]
      });
      expect(state.brushSelection.x.fieldName).toBe("unique_seqs_count");
      expect(state.brushSelection.x.range).toEqual([5, 20]);
      expect(state.brushSelection.clicked).toBe(false);
      expect(state.pagination.page).toBe(0);
    });

    it("sorts range into canonical order", () => {
      const state = clonalFamilies(initialState, {
        type: types.UPDATE_BRUSH_SELECTION,
        updatedBrushData: ["y", "mean_mut_freq", [0.5, 0.1]]
      });
      expect(state.brushSelection.y.range).toEqual([0.1, 0.5]);
    });
  });

  describe("CLEAR_BRUSH_SELECTION", () => {
    it("clears brush selection and resets page", () => {
      const stateWithBrush = {
        ...initialState,
        brushSelection: { x: { fieldName: "foo", range: [0, 1] } },
        pagination: { ...initialState.pagination, page: 2 }
      };
      const state = clonalFamilies(stateWithBrush, {
        type: types.CLEAR_BRUSH_SELECTION
      });
      expect(state.brushSelection).toBeUndefined();
      expect(state.pagination.page).toBe(0);
    });
  });

  describe("PAGE_DOWN", () => {
    it("increments page", () => {
      const state = clonalFamilies(initialState, { type: types.PAGE_DOWN });
      expect(state.pagination.page).toBe(1);
    });
  });

  describe("PAGE_UP", () => {
    it("decrements page when above 0", () => {
      const stateOnPage2 = {
        ...initialState,
        pagination: { ...initialState.pagination, page: 2 }
      };
      const state = clonalFamilies(stateOnPage2, { type: types.PAGE_UP });
      expect(state.pagination.page).toBe(1);
    });

    it("does not go below page 0", () => {
      const state = clonalFamilies(initialState, { type: types.PAGE_UP });
      expect(state.pagination.page).toBe(0);
    });
  });

  describe("TOGGLE_SORT", () => {
    it("sorts by new column in descending order", () => {
      const state = clonalFamilies(initialState, {
        type: types.TOGGLE_SORT,
        column: "mean_mut_freq"
      });
      expect(state.pagination.order_by).toBe("mean_mut_freq");
      expect(state.pagination.desc).toBe(true);
      expect(state.pagination.page).toBe(0);
    });

    it("toggles direction when same column clicked", () => {
      const state = clonalFamilies(initialState, {
        type: types.TOGGLE_SORT,
        column: "unique_seqs_count" // same as default
      });
      expect(state.pagination.desc).toBe(false);
    });
  });

  describe("TOGGLE_FAMILY", () => {
    it("selects a family and clears selected seq", () => {
      const state = clonalFamilies(initialState, {
        type: types.TOGGLE_FAMILY,
        family_ident: "family-1"
      });
      expect(state.selectedFamily).toBe("family-1");
      expect(state.selectedSeq).toEqual({});
    });

    it("updates brush selection when updateBrushSelection is true", () => {
      const state = clonalFamilies(initialState, {
        type: types.TOGGLE_FAMILY,
        family_ident: "family-1",
        family_id: "family-1",
        updateBrushSelection: true
      });
      expect(state.brushSelection.clicked).toBe("family-1");
      expect(state.pagination.page).toBe(0);
    });
  });

  describe("UPDATE_SELECTED_SEQ", () => {
    it("updates selected sequence", () => {
      const state = clonalFamilies(initialState, {
        type: types.UPDATE_SELECTED_SEQ,
        seq: { sequence_id: "seq-1" }
      });
      expect(state.selectedSeq).toEqual({ sequence_id: "seq-1" });
    });
  });

  describe("UPDATE_FACET", () => {
    it("updates facet field", () => {
      const state = clonalFamilies(initialState, {
        type: types.UPDATE_FACET,
        facetByField: "has_seed"
      });
      expect(state.facetByField).toBe("has_seed");
    });
  });

  describe("FILTER_LOCUS", () => {
    it("updates locus filter", () => {
      const state = clonalFamilies(initialState, {
        type: types.FILTER_LOCUS,
        locus: "IGH"
      });
      expect(state.locus).toBe("IGH");
    });
  });

  describe("UPDATE_SELECTED_CHAIN", () => {
    it("updates selected chain", () => {
      const state = clonalFamilies(initialState, {
        type: types.UPDATE_SELECTED_CHAIN,
        chain: "light"
      });
      expect(state.selectedChain).toBe("light");
    });
  });

  describe("UPDATE_LINEAGE_*", () => {
    it("updates lineage show entire", () => {
      const state = clonalFamilies(initialState, {
        type: types.UPDATE_LINEAGE_SHOW_ENTIRE,
        showEntire: true
      });
      expect(state.lineageShowEntire).toBe(true);
    });

    it("updates lineage show borders", () => {
      const state = clonalFamilies(initialState, {
        type: types.UPDATE_LINEAGE_SHOW_BORDERS,
        showBorders: true
      });
      expect(state.lineageShowBorders).toBe(true);
    });

    it("updates lineage chain", () => {
      const state = clonalFamilies(initialState, {
        type: types.UPDATE_LINEAGE_CHAIN,
        chain: "light"
      });
      expect(state.lineageChain).toBe("light");
    });
  });

  describe("TOGGLE_STARRED_FAMILY", () => {
    it("adds a family to starred", () => {
      const state = clonalFamilies(initialState, {
        type: types.TOGGLE_STARRED_FAMILY,
        ident: "family-1"
      });
      expect(state.starredFamilies).toContain("family-1");
    });

    it("removes a family from starred", () => {
      const stateWithStarred = {
        ...initialState,
        starredFamilies: ["family-1"]
      };
      const state = clonalFamilies(stateWithStarred, {
        type: types.TOGGLE_STARRED_FAMILY,
        ident: "family-1"
      });
      expect(state.starredFamilies).not.toContain("family-1");
    });
  });

  describe("CLEAR_STARRED_FAMILIES", () => {
    it("clears all starred families", () => {
      const stateWithStarred = {
        ...initialState,
        starredFamilies: ["family-1", "family-2"]
      };
      const state = clonalFamilies(stateWithStarred, {
        type: types.CLEAR_STARRED_FAMILIES
      });
      expect(state.starredFamilies).toEqual([]);
    });
  });

  describe("SET_STARRED_FAMILIES", () => {
    it("sets starred families", () => {
      const state = clonalFamilies(initialState, {
        type: types.SET_STARRED_FAMILIES,
        starredFamilies: ["family-1", "family-2"]
      });
      expect(state.starredFamilies).toEqual(["family-1", "family-2"]);
    });
  });

  describe("SET_FILTER", () => {
    it("adds a filter", () => {
      const state = clonalFamilies(initialState, {
        type: types.SET_FILTER,
        field: "sample.locus",
        values: ["IGH"]
      });
      expect(state.filters["sample.locus"]).toEqual(["IGH"]);
      expect(state.pagination.page).toBe(0);
    });

    it("removes a filter when values is empty", () => {
      const stateWithFilter = {
        ...initialState,
        filters: { "sample.locus": ["IGH"] }
      };
      const state = clonalFamilies(stateWithFilter, {
        type: types.SET_FILTER,
        field: "sample.locus",
        values: []
      });
      expect(state.filters["sample.locus"]).toBeUndefined();
    });
  });

  describe("CLEAR_FILTER", () => {
    it("removes a specific filter", () => {
      const stateWithFilters = {
        ...initialState,
        filters: { "sample.locus": ["IGH"], "has_seed": [true] }
      };
      const state = clonalFamilies(stateWithFilters, {
        type: types.CLEAR_FILTER,
        field: "sample.locus"
      });
      expect(state.filters["sample.locus"]).toBeUndefined();
      expect(state.filters["has_seed"]).toEqual([true]);
    });
  });

  describe("CLEAR_ALL_FILTERS", () => {
    it("removes all filters", () => {
      const stateWithFilters = {
        ...initialState,
        filters: { "sample.locus": ["IGH"], "has_seed": [true] }
      };
      const state = clonalFamilies(stateWithFilters, {
        type: types.CLEAR_ALL_FILTERS
      });
      expect(state.filters).toEqual({});
      expect(state.pagination.page).toBe(0);
    });
  });

  describe("UPDATE_CURRENT_SECTION", () => {
    it("updates current section", () => {
      const state = clonalFamilies(initialState, {
        type: types.UPDATE_CURRENT_SECTION,
        section: "phylogeny"
      });
      expect(state.currentSection).toBe("phylogeny");
    });
  });

  it("returns current state for unknown actions", () => {
    const state = clonalFamilies(initialState, { type: "UNKNOWN" });
    expect(state).toEqual(initialState);
  });
});
