import * as types from "../actions/types";
import { ALL_TABLE_KEYS } from "../constants/tableColumns";

// Per-browser persistence for each table's column layout (live working layout;
// the named-config system remains the source of truth for saved layouts).
const sessionKey = (table, suffix) => `olmsted_table_columns_${table}_${suffix}`;

const readSessionJson = (key, fallback) => {
  try {
    const saved = sessionStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch (_e) {
    return fallback;
  }
};

const persistSessionJson = (key, value) => {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn(`Failed to persist table column layout (${key}) to sessionStorage:`, e);
  }
};

// { [table]: { visibility: { [column]: bool }, order: [columnName, ...] } }
const initialState = ALL_TABLE_KEYS.reduce((state, table) => {
  state[table] = {
    visibility: readSessionJson(sessionKey(table, "visibility"), {}),
    order: readSessionJson(sessionKey(table, "order"), [])
  };
  return state;
}, {});

const withTable = (state, table, tableState) => ({ ...state, [table]: tableState });

// eslint-disable-next-line default-param-last
const tableColumns = (state = initialState, action) => {
  switch (action.type) {
    case types.SET_TABLE_COLUMN_VISIBILITY: {
      const { table, column, visible } = action;
      const visibility = { ...state[table]?.visibility, [column]: visible };
      persistSessionJson(sessionKey(table, "visibility"), visibility);
      return withTable(state, table, { ...state[table], visibility });
    }
    case types.SET_TABLE_COLUMN_VISIBILITY_MAP: {
      const { table } = action;
      const visibility = action.visibility || {};
      persistSessionJson(sessionKey(table, "visibility"), visibility);
      return withTable(state, table, { ...state[table], visibility });
    }
    case types.SET_TABLE_COLUMN_ORDER: {
      const { table } = action;
      const order = action.order || [];
      persistSessionJson(sessionKey(table, "order"), order);
      return withTable(state, table, { ...state[table], order });
    }
    default: {
      return state;
    }
  }
};

export default tableColumns;
