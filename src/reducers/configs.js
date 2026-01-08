/**
 * Redux reducer for visualization config state management
 */

import * as types from "../actions/types";

const initialState = {
  // Array of saved configs from IndexedDB
  savedConfigs: [],
  // Currently applied config ID (null if using defaults)
  activeConfigId: null,
  // Modal visibility state
  isModalOpen: false,
  // Loading state for async operations
  isLoading: false,
  // Error message if any operation failed
  error: null
};

/* eslint-disable default-param-last */
const configs = (state = initialState, action) => {
  /* eslint-enable default-param-last */
  switch (action.type) {
    case types.CONFIGS_LOADED: {
      return {
        ...state,
        savedConfigs: action.configs,
        isLoading: false,
        error: null
      };
    }

    case types.CONFIG_SAVED: {
      // Add or update config in savedConfigs array
      const existingIndex = state.savedConfigs.findIndex((c) => c.id === action.config.id);
      let updatedConfigs;
      if (existingIndex >= 0) {
        // Update existing
        updatedConfigs = [...state.savedConfigs];
        updatedConfigs[existingIndex] = action.config;
      } else {
        // Add new (prepend to show newest first)
        updatedConfigs = [action.config, ...state.savedConfigs];
      }
      return {
        ...state,
        savedConfigs: updatedConfigs,
        error: null
      };
    }

    case types.CONFIG_DELETED: {
      return {
        ...state,
        savedConfigs: state.savedConfigs.filter((c) => c.id !== action.configId),
        // Clear activeConfigId if deleted config was active
        activeConfigId: state.activeConfigId === action.configId ? null : state.activeConfigId,
        error: null
      };
    }

    case types.CONFIG_APPLIED: {
      return {
        ...state,
        activeConfigId: action.configId,
        error: null
      };
    }

    case types.CONFIG_MODAL_OPEN: {
      return {
        ...state,
        isModalOpen: true
      };
    }

    case types.CONFIG_MODAL_CLOSE: {
      return {
        ...state,
        isModalOpen: false
      };
    }

    default: {
      return state;
    }
  }
};

export default configs;
