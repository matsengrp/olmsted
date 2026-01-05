/**
 * Redux actions for visualization config management
 */

import * as types from "./types";
import olmstedDB from "../utils/olmstedDB";

/**
 * Load all configs from IndexedDB
 * @param {string|undefined} datasetId - Optional filter by dataset
 */
export const loadConfigs = (datasetId = undefined) => async (dispatch) => {
  try {
    await olmstedDB.ready;
    const configs = await olmstedDB.getAllConfigs(datasetId);
    dispatch({
      type: types.CONFIGS_LOADED,
      configs
    });
  } catch (error) {
    console.error("Failed to load configs:", error);
  }
};

/**
 * Save a new config or update existing
 * @param {Object} config - Config object to save
 */
export const saveConfig = (config) => async (dispatch) => {
  try {
    await olmstedDB.ready;
    await olmstedDB.saveConfig(config);
    dispatch({
      type: types.CONFIG_SAVED,
      config
    });
  } catch (error) {
    console.error("Failed to save config:", error);
    throw error;
  }
};

/**
 * Delete a config by ID
 * @param {string} configId - Config ID to delete
 */
export const deleteConfig = (configId) => async (dispatch) => {
  try {
    await olmstedDB.ready;
    await olmstedDB.deleteConfig(configId);
    dispatch({
      type: types.CONFIG_DELETED,
      configId
    });
  } catch (error) {
    console.error("Failed to delete config:", error);
    throw error;
  }
};

/**
 * Mark a config as currently applied
 * @param {string|null} configId - Config ID or null to clear
 */
export const applyConfig = (configId) => ({
  type: types.CONFIG_APPLIED,
  configId
});

/**
 * Open the config modal
 */
export const openConfigModal = () => ({
  type: types.CONFIG_MODAL_OPEN
});

/**
 * Close the config modal
 */
export const closeConfigModal = () => ({
  type: types.CONFIG_MODAL_CLOSE
});
