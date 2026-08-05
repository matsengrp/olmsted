// Identifiers for the tables that support user-controlled column visibility/order.
// Shared by the Redux tableColumns slice, configManager's `tables` settings
// category, and each table component's connect() wiring.
export const TABLE_KEYS = {
  FAMILIES: "families",
  DATASET_LOADING: "datasetLoading",
  DATASET_MANAGEMENT: "datasetManagement"
};

export const ALL_TABLE_KEYS = Object.values(TABLE_KEYS);
