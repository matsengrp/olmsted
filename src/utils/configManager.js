/**
 * Config Manager Utility
 * Handles extraction, application, and validation of visualization settings
 */

import { CHAIN_TYPES } from "../constants/chainTypes";
import { ALL_TABLE_KEYS } from "../constants/tableColumns";

// Current config schema version
export const CONFIG_VERSION = "1.3";

// Reserved keyword for "use application default"
export const DEFAULT_KEYWORD = "<default>";

// Scatterplot signal names that can be persisted
export const SCATTERPLOT_SIGNALS = [
  "facet_col_signal",
  "yField",
  "xField",
  "colorBy",
  "shapeBy",
  "sizeBy",
  "symbolSize",
  "symbolOpacity",
  "filledShapes",
  // Layout
  "plot_height_ratio",
  // Zoom/pan state
  "zoom_level",
  "pan_x",
  "pan_y"
];

// Tree signal names that can be persisted
export const TREE_SIGNALS = [
  "max_leaf_size",
  "leaf_size_by",
  "branch_width_by",
  "branch_color_by",
  "branch_color_scheme",
  "min_color_value",
  "show_labels",
  "fixed_branch_lengths",
  "tree_group_width_ratio",
  "viz_height_ratio",
  "show_alignment",
  "show_mutation_borders",
  "show_controls",
  // Sibling ordering ("ladderize", #331)
  "child_order_by",
  "child_order_desc",
  "show_ordering_tooltip_fields",
  // Alignment zoom/pan state (tree zoom/pan are computed signals, not directly settable)
  "alignment_zoom",
  "alignment_pan"
];

// Default scatterplot settings
export const DEFAULT_SCATTERPLOT_SETTINGS = {
  facet_col_signal: "<none>",
  yField: "mean_mut_freq",
  xField: "unique_seqs_count",
  colorBy: "<none>",
  shapeBy: "<none>",
  sizeBy: "<none>",
  symbolSize: 1,
  symbolOpacity: 0.4,
  filledShapes: false,
  // Layout
  plot_height_ratio: 1.0,
  // Zoom/pan defaults
  zoom_level: 0.9,
  pan_x: 0,
  pan_y: 0
};

// Default tree settings
export const DEFAULT_TREE_SETTINGS = {
  max_leaf_size: 50,
  leaf_size_by: "<none>",
  branch_width_by: "<none>",
  branch_color_by: "parent",
  branch_color_scheme: "redblue",
  min_color_value: 0,
  show_labels: true,
  fixed_branch_lengths: false,
  tree_group_width_ratio: 0.3,
  viz_height_ratio: 0.8,
  show_alignment: true,
  show_mutation_borders: false,
  show_controls: true,
  // Sibling ordering ("ladderize", #331) defaults
  child_order_by: "input",
  child_order_desc: false,
  show_ordering_tooltip_fields: false,
  // Alignment zoom/pan defaults
  alignment_zoom: 1,
  alignment_pan: 0
};

// Default global settings
export const DEFAULT_GLOBAL_SETTINGS = {
  filters: {},
  selectedChain: CHAIN_TYPES.HEAVY
};

// Default lineage (ancestral sequence) settings
export const DEFAULT_LINEAGE_SETTINGS = {
  showEntire: false,
  showBorders: false,
  chain: CHAIN_TYPES.HEAVY
};

// Default table column-layout settings (added in CONFIG_VERSION 1.3): no
// customization - empty visibility overrides, default column order - one
// entry per table in TABLE_KEYS (see src/constants/tableColumns.js).
export const DEFAULT_TABLE_SETTINGS = ALL_TABLE_KEYS.reduce((settings, table) => {
  settings[table] = { visibility: {}, order: [] };
  return settings;
}, {});

/**
 * Resolve a config value, substituting defaults for the reserved keyword
 * @param {*} value - The value from config
 * @param {*} defaultValue - The default to use if value is DEFAULT_KEYWORD
 * @returns {*} The resolved value
 */
export const resolveValue = (value, defaultValue) => {
  if (value === DEFAULT_KEYWORD) {
    return defaultValue;
  }
  return value;
};

/**
 * Generate a unique ID for configs
 * @returns {string} UUID-like string
 */
export const generateConfigId = () => {
  return "config_" + Date.now().toString(36) + "_" + Math.random().toString(36).substr(2, 9);
};

/**
 * Extract current scatterplot settings from Vega view
 * @param {Object} vegaView - The Vega view instance
 * @returns {Object} Current scatterplot settings
 */
export const extractScatterplotSettings = (vegaView) => {
  if (!vegaView) return { ...DEFAULT_SCATTERPLOT_SETTINGS };

  const settings = {};
  SCATTERPLOT_SIGNALS.forEach((signalName) => {
    try {
      const value = vegaView.signal(signalName);
      if (value !== undefined) {
        settings[signalName] = value;
      }
    } catch {
      // Signal doesn't exist, use default
      settings[signalName] = DEFAULT_SCATTERPLOT_SETTINGS[signalName];
    }
  });

  return settings;
};

/**
 * Extract current tree settings from Vega view
 * @param {Object} vegaView - The Vega view instance
 * @returns {Object} Current tree settings
 */
export const extractTreeSettings = (vegaView) => {
  if (!vegaView) return { ...DEFAULT_TREE_SETTINGS };

  const settings = {};
  TREE_SIGNALS.forEach((signalName) => {
    try {
      const value = vegaView.signal(signalName);
      if (value !== undefined) {
        settings[signalName] = value;
      }
    } catch {
      // Signal doesn't exist, use default
      settings[signalName] = DEFAULT_TREE_SETTINGS[signalName];
    }
  });

  return settings;
};

/**
 * Extract global settings from Redux state
 * @param {Object} reduxState - The Redux state
 * @returns {Object} Current global settings
 */
export const extractGlobalSettings = (reduxState) => {
  if (!reduxState || !reduxState.clonalFamilies) {
    return { ...DEFAULT_GLOBAL_SETTINGS };
  }

  return {
    filters: reduxState.clonalFamilies.filters || DEFAULT_GLOBAL_SETTINGS.filters,
    selectedChain: reduxState.clonalFamilies.selectedChain || DEFAULT_GLOBAL_SETTINGS.selectedChain
  };
};

/**
 * Extract lineage (ancestral sequence) settings from Redux state
 * @param {Object} reduxState - The Redux state
 * @returns {Object} Current lineage settings
 */
export const extractLineageSettings = (reduxState) => {
  if (!reduxState || !reduxState.clonalFamilies) {
    return { ...DEFAULT_LINEAGE_SETTINGS };
  }

  return {
    showEntire: reduxState.clonalFamilies.lineageShowEntire ?? DEFAULT_LINEAGE_SETTINGS.showEntire,
    showBorders: reduxState.clonalFamilies.lineageShowBorders ?? DEFAULT_LINEAGE_SETTINGS.showBorders,
    chain: reduxState.clonalFamilies.lineageChain || DEFAULT_LINEAGE_SETTINGS.chain
  };
};

/**
 * Extract current table column-layout settings (visibility/order per table)
 * from Redux state
 * @param {Object} reduxState - The Redux state
 * @returns {Object} Current table settings, keyed by table name
 */
export const extractTableSettings = (reduxState) => {
  if (!reduxState || !reduxState.tableColumns) {
    return { ...DEFAULT_TABLE_SETTINGS };
  }

  const settings = {};
  ALL_TABLE_KEYS.forEach((table) => {
    const tableState = reduxState.tableColumns[table] || DEFAULT_TABLE_SETTINGS[table];
    settings[table] = {
      visibility: tableState.visibility || {},
      order: tableState.order || []
    };
  });
  return settings;
};

/**
 * Extract all current settings
 * @param {Object} scatterplotView - Scatterplot Vega view
 * @param {Object} treeView - Tree Vega view
 * @param {Object} reduxState - Redux state
 * @returns {Object} Complete settings object
 */
export const extractCurrentSettings = (scatterplotView, treeView, reduxState) => {
  return {
    scatterplot: extractScatterplotSettings(scatterplotView),
    tree: extractTreeSettings(treeView),
    global: extractGlobalSettings(reduxState),
    lineage: extractLineageSettings(reduxState),
    tables: extractTableSettings(reduxState)
  };
};

/**
 * Apply scatterplot settings to Vega view
 * @param {Object} vegaView - The Vega view instance
 * @param {Object} settings - Settings to apply
 */
export const applyScatterplotSettings = (vegaView, settings) => {
  if (!vegaView || !settings) return;

  Object.entries(settings).forEach(([signalName, value]) => {
    if (SCATTERPLOT_SIGNALS.includes(signalName)) {
      try {
        const resolvedValue = resolveValue(value, DEFAULT_SCATTERPLOT_SETTINGS[signalName]);
        vegaView.signal(signalName, resolvedValue);
      } catch (error) {
        console.warn(`Failed to set scatterplot signal ${signalName}:`, error);
      }
    }
  });

  vegaView.run();
};

/**
 * Apply tree settings to Vega view
 * @param {Object} vegaView - The Vega view instance
 * @param {Object} settings - Settings to apply
 */
export const applyTreeSettings = (vegaView, settings) => {
  if (!vegaView || !settings) return;

  Object.entries(settings).forEach(([signalName, value]) => {
    if (TREE_SIGNALS.includes(signalName)) {
      try {
        const resolvedValue = resolveValue(value, DEFAULT_TREE_SETTINGS[signalName]);
        vegaView.signal(signalName, resolvedValue);
      } catch (error) {
        console.warn(`Failed to set tree signal ${signalName}:`, error);
      }
    }
  });

  vegaView.run();
};

/**
 * Apply global settings via Redux dispatch
 * @param {Function} dispatch - Redux dispatch function
 * @param {Object} settings - Global settings to apply
 * @param {Object} actions - Action creators { setFilter, clearAllFilters, updateSelectedChain }
 */
export const applyGlobalSettings = (dispatch, settings, actions) => {
  if (!dispatch || !settings || !actions) return;

  // Handle filters
  if (settings.filters !== undefined && actions.setFilter && actions.clearAllFilters) {
    // First clear all existing filters
    dispatch(actions.clearAllFilters());

    // Then apply each filter from the config
    const filters = resolveValue(settings.filters, DEFAULT_GLOBAL_SETTINGS.filters);
    if (filters && typeof filters === "object") {
      Object.entries(filters).forEach(([field, values]) => {
        if (Array.isArray(values) && values.length > 0) {
          dispatch(actions.setFilter(field, values));
        }
      });
    }
  }

  // Handle legacy locus field for backward compatibility
  if (settings.locus !== undefined && settings.filters === undefined && actions.setFilter) {
    const locus = settings.locus;
    if (locus && locus !== "All") {
      dispatch(actions.setFilter("sample.locus", [locus]));
    }
  }

  if (settings.selectedChain !== undefined && actions.updateSelectedChain) {
    const resolvedChain = resolveValue(settings.selectedChain, DEFAULT_GLOBAL_SETTINGS.selectedChain);
    dispatch(actions.updateSelectedChain(resolvedChain));
  }
};

/**
 * Apply lineage (ancestral sequence) settings via Redux dispatch
 * @param {Function} dispatch - Redux dispatch function
 * @param {Object} settings - Lineage settings to apply
 * @param {Object} actions - Action creators { updateLineageShowEntire, updateLineageShowBorders, updateLineageChain }
 */
export const applyLineageSettings = (dispatch, settings, actions) => {
  if (!dispatch || !settings || !actions) return;

  if (settings.showEntire !== undefined && actions.updateLineageShowEntire) {
    const resolvedValue = resolveValue(settings.showEntire, DEFAULT_LINEAGE_SETTINGS.showEntire);
    dispatch(actions.updateLineageShowEntire(resolvedValue));
  }

  if (settings.showBorders !== undefined && actions.updateLineageShowBorders) {
    const resolvedValue = resolveValue(settings.showBorders, DEFAULT_LINEAGE_SETTINGS.showBorders);
    dispatch(actions.updateLineageShowBorders(resolvedValue));
  }

  if (settings.chain !== undefined && actions.updateLineageChain) {
    const resolvedChain = resolveValue(settings.chain, DEFAULT_LINEAGE_SETTINGS.chain);
    dispatch(actions.updateLineageChain(resolvedChain));
  }
};

/**
 * Apply table column-layout settings via Redux dispatch. Tables absent from
 * `settings` (e.g. a CONFIG_VERSION 1.2 config saved before tables existed)
 * are left untouched rather than reset, matching how the other settings
 * categories handle configs from before they existed.
 * @param {Function} dispatch - Redux dispatch function
 * @param {Object} settings - Table settings to apply, keyed by table name
 * @param {Object} actions - Action creators { setTableColumnVisibilityMap, setTableColumnOrder }
 */
export const applyTableSettings = (dispatch, settings, actions) => {
  if (!dispatch || !settings || !actions) return;

  ALL_TABLE_KEYS.forEach((table) => {
    const tableSettings = settings[table];
    if (!tableSettings) return;

    if (tableSettings.visibility !== undefined && actions.setTableColumnVisibilityMap) {
      const visibility = resolveValue(tableSettings.visibility, DEFAULT_TABLE_SETTINGS[table].visibility);
      dispatch(actions.setTableColumnVisibilityMap(table, visibility || {}));
    }

    if (tableSettings.order !== undefined && actions.setTableColumnOrder) {
      const order = resolveValue(tableSettings.order, DEFAULT_TABLE_SETTINGS[table].order);
      dispatch(actions.setTableColumnOrder(table, order || []));
    }
  });
};

/**
 * Apply complete config to all views
 * @param {Object} config - Config object with settings
 * @param {Object} scatterplotView - Scatterplot Vega view
 * @param {Object} treeView - Tree Vega view
 * @param {Function} dispatch - Redux dispatch function
 * @param {Object} actions - Redux action creators
 */
export const applyConfig = (config, scatterplotView, treeView, dispatch, actions) => {
  if (!config || !config.settings) return;

  const { scatterplot, tree, global, lineage, tables } = config.settings;

  if (scatterplot) {
    applyScatterplotSettings(scatterplotView, scatterplot);
  }

  if (tree) {
    applyTreeSettings(treeView, tree);
  }

  if (global) {
    applyGlobalSettings(dispatch, global, actions);
  }

  if (lineage) {
    applyLineageSettings(dispatch, lineage, actions);
  }

  if (tables) {
    applyTableSettings(dispatch, tables, actions);
  }
};

/**
 * Create a new config object
 * @param {string} name - Config name
 * @param {Object} settings - Settings object
 * @param {Object} options - Additional options { description, datasetId }
 * @returns {Object} Complete config object
 */
export const createConfig = (name, settings, options = {}) => {
  const now = Date.now();
  return {
    id: generateConfigId(),
    name,
    description: options.description || "",
    version: CONFIG_VERSION,
    createdAt: now,
    updatedAt: now,
    datasetId: options.datasetId || null,
    settings
  };
};

/**
 * Get default config
 * @returns {Object} Default config object
 */
export const getDefaultConfig = () => {
  return createConfig("Default", {
    scatterplot: { ...DEFAULT_SCATTERPLOT_SETTINGS },
    tree: { ...DEFAULT_TREE_SETTINGS },
    global: { ...DEFAULT_GLOBAL_SETTINGS },
    lineage: { ...DEFAULT_LINEAGE_SETTINGS },
    tables: { ...DEFAULT_TABLE_SETTINGS }
  });
};

/**
 * Validate config structure
 * @param {Object} config - Config to validate
 * @returns {{ valid: boolean, errors: string[] }} Validation result
 */
export const validateConfig = (config) => {
  const errors = [];

  if (!config) {
    errors.push("Config is null or undefined");
    return { valid: false, errors };
  }

  if (!config.id || typeof config.id !== "string") {
    errors.push("Config must have a valid string id");
  }

  if (!config.name || typeof config.name !== "string") {
    errors.push("Config must have a valid string name");
  }

  if (!config.version) {
    errors.push("Config must have a version");
  }

  if (!config.settings || typeof config.settings !== "object") {
    errors.push("Config must have a settings object");
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

/**
 * Export config as JSON string for download
 * @param {Object} config - Config to export
 * @returns {string} JSON string
 */
export const exportConfigToJson = (config) => {
  return JSON.stringify(config, null, 2);
};

/**
 * Import config from JSON string
 * @param {string} jsonString - JSON string to parse
 * @returns {{ config: Object|null, error: string|null }} Parse result
 */
export const importConfigFromJson = (jsonString) => {
  try {
    const config = JSON.parse(jsonString);
    const validation = validateConfig(config);

    if (!validation.valid) {
      return { config: null, error: validation.errors.join(", ") };
    }

    // Assign a new ID to avoid conflicts
    config.id = generateConfigId();
    config.createdAt = Date.now();
    config.updatedAt = Date.now();

    return { config, error: null };
  } catch (error) {
    return { config: null, error: `Invalid JSON: ${error.message}` };
  }
};

/**
 * Trigger download of config as JSON file
 * @param {Object} config - Config to download
 * @param {string} filename - Filename (without extension)
 */
export const downloadConfig = (config, filename = "olmsted-config") => {
  const jsonString = exportConfigToJson(config);
  const blob = new Blob([jsonString], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}.olmsted-config.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
};
