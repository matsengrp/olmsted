import tableColumns from "../tableColumns";
import * as types from "../../actions/types";
import { TABLE_KEYS, ALL_TABLE_KEYS } from "../../constants/tableColumns";

describe("tableColumns reducer", () => {
  const initialState = tableColumns(undefined, { type: "INIT" });

  it("returns an empty visibility/order slice for every known table", () => {
    ALL_TABLE_KEYS.forEach((table) => {
      expect(initialState[table]).toEqual({ visibility: {}, order: [] });
    });
  });

  describe("SET_TABLE_COLUMN_VISIBILITY", () => {
    it("records an explicit visibility override for a column on the given table", () => {
      const state = tableColumns(initialState, {
        type: types.SET_TABLE_COLUMN_VISIBILITY,
        table: TABLE_KEYS.FAMILIES,
        column: "Mut freq",
        visible: false
      });
      expect(state[TABLE_KEYS.FAMILIES].visibility["Mut freq"]).toBe(false);
    });

    it("merges with existing overrides", () => {
      const withOverride = {
        ...initialState,
        [TABLE_KEYS.FAMILIES]: { ...initialState[TABLE_KEYS.FAMILIES], visibility: { "Mut freq": false } }
      };
      const state = tableColumns(withOverride, {
        type: types.SET_TABLE_COLUMN_VISIBILITY,
        table: TABLE_KEYS.FAMILIES,
        column: "V gene",
        visible: true
      });
      expect(state[TABLE_KEYS.FAMILIES].visibility).toEqual({ "Mut freq": false, "V gene": true });
    });

    it("doesn't affect other tables", () => {
      const state = tableColumns(initialState, {
        type: types.SET_TABLE_COLUMN_VISIBILITY,
        table: TABLE_KEYS.DATASET_LOADING,
        column: "Source",
        visible: false
      });
      expect(state[TABLE_KEYS.FAMILIES]).toEqual({ visibility: {}, order: [] });
      expect(state[TABLE_KEYS.DATASET_LOADING].visibility).toEqual({ Source: false });
    });
  });

  describe("SET_TABLE_COLUMN_VISIBILITY_MAP", () => {
    it("replaces the whole visibility map for the given table", () => {
      const state = tableColumns(initialState, {
        type: types.SET_TABLE_COLUMN_VISIBILITY_MAP,
        table: TABLE_KEYS.DATASET_MANAGEMENT,
        visibility: { Subject: false }
      });
      expect(state[TABLE_KEYS.DATASET_MANAGEMENT].visibility).toEqual({ Subject: false });
    });

    it("defaults to an empty object when visibility is missing", () => {
      const state = tableColumns(initialState, {
        type: types.SET_TABLE_COLUMN_VISIBILITY_MAP,
        table: TABLE_KEYS.FAMILIES
      });
      expect(state[TABLE_KEYS.FAMILIES].visibility).toEqual({});
    });
  });

  describe("SET_TABLE_COLUMN_ORDER", () => {
    it("sets the optional column order for the given table", () => {
      const state = tableColumns(initialState, {
        type: types.SET_TABLE_COLUMN_ORDER,
        table: TABLE_KEYS.FAMILIES,
        order: ["Mut freq", "V gene", "CDR3 length"]
      });
      expect(state[TABLE_KEYS.FAMILIES].order).toEqual(["Mut freq", "V gene", "CDR3 length"]);
    });

    it("defaults to an empty array when order is missing", () => {
      const state = tableColumns(initialState, {
        type: types.SET_TABLE_COLUMN_ORDER,
        table: TABLE_KEYS.FAMILIES
      });
      expect(state[TABLE_KEYS.FAMILIES].order).toEqual([]);
    });
  });

  it("ignores unknown action types", () => {
    const state = tableColumns(initialState, { type: "SOMETHING_ELSE" });
    expect(state).toBe(initialState);
  });
});
