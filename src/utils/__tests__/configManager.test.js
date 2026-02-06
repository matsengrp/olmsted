import {
  CONFIG_VERSION,
  DEFAULT_KEYWORD,
  SCATTERPLOT_SIGNALS,
  TREE_SIGNALS,
  DEFAULT_SCATTERPLOT_SETTINGS,
  DEFAULT_TREE_SETTINGS,
  DEFAULT_GLOBAL_SETTINGS,
  DEFAULT_LINEAGE_SETTINGS,
  resolveValue,
  generateConfigId,
  extractScatterplotSettings,
  extractTreeSettings,
  extractGlobalSettings,
  extractLineageSettings,
  extractCurrentSettings,
  applyScatterplotSettings,
  applyTreeSettings,
  applyGlobalSettings,
  applyLineageSettings,
  applyConfig,
  createConfig,
  getDefaultConfig,
  validateConfig,
  exportConfigToJson,
  importConfigFromJson
} from "../configManager";
import { mockConfig } from "../../__test-data__/mockState";

describe("constants", () => {
  it("has a config version", () => {
    expect(CONFIG_VERSION).toBeDefined();
    expect(typeof CONFIG_VERSION).toBe("string");
  });

  it("has scatterplot and tree signal arrays", () => {
    expect(SCATTERPLOT_SIGNALS.length).toBeGreaterThan(0);
    expect(TREE_SIGNALS.length).toBeGreaterThan(0);
  });
});

describe("resolveValue", () => {
  it("returns default when value is DEFAULT_KEYWORD", () => {
    expect(resolveValue(DEFAULT_KEYWORD, "fallback")).toBe("fallback");
  });

  it("returns value when not DEFAULT_KEYWORD", () => {
    expect(resolveValue("custom", "fallback")).toBe("custom");
  });

  it("returns falsy values as-is", () => {
    expect(resolveValue(0, 42)).toBe(0);
    expect(resolveValue(false, true)).toBe(false);
  });
});

describe("generateConfigId", () => {
  it("generates unique IDs", () => {
    const id1 = generateConfigId();
    const id2 = generateConfigId();
    expect(id1).not.toBe(id2);
  });

  it("starts with 'config_'", () => {
    expect(generateConfigId()).toMatch(/^config_/);
  });
});

describe("extractScatterplotSettings", () => {
  it("returns defaults when vegaView is null", () => {
    const result = extractScatterplotSettings(null);
    expect(result).toEqual(DEFAULT_SCATTERPLOT_SETTINGS);
  });

  it("extracts signals from mock vega view", () => {
    const mockView = {
      signal: jest.fn((name) => {
        if (name === "xField") return "custom_field";
        return undefined;
      })
    };
    const result = extractScatterplotSettings(mockView);
    expect(result.xField).toBe("custom_field");
  });

  it("falls back to defaults when signal throws", () => {
    const mockView = {
      signal: jest.fn(() => {
        throw new Error("unknown signal");
      })
    };
    const result = extractScatterplotSettings(mockView);
    expect(result.xField).toBe(DEFAULT_SCATTERPLOT_SETTINGS.xField);
  });
});

describe("extractTreeSettings", () => {
  it("returns defaults when vegaView is null", () => {
    expect(extractTreeSettings(null)).toEqual(DEFAULT_TREE_SETTINGS);
  });

  it("extracts signals from mock vega view", () => {
    const mockView = {
      signal: jest.fn((name) => {
        if (name === "show_labels") return false;
        return undefined;
      })
    };
    const result = extractTreeSettings(mockView);
    expect(result.show_labels).toBe(false);
  });
});

describe("extractGlobalSettings", () => {
  it("returns defaults when state is null", () => {
    expect(extractGlobalSettings(null)).toEqual(DEFAULT_GLOBAL_SETTINGS);
  });

  it("returns defaults when clonalFamilies is missing", () => {
    expect(extractGlobalSettings({})).toEqual(DEFAULT_GLOBAL_SETTINGS);
  });

  it("extracts filters and selectedChain from state", () => {
    const state = {
      clonalFamilies: {
        filters: { "sample.locus": ["IGH"] },
        selectedChain: "light"
      }
    };
    const result = extractGlobalSettings(state);
    expect(result.filters).toEqual({ "sample.locus": ["IGH"] });
    expect(result.selectedChain).toBe("light");
  });
});

describe("extractLineageSettings", () => {
  it("returns defaults when state is null", () => {
    expect(extractLineageSettings(null)).toEqual(DEFAULT_LINEAGE_SETTINGS);
  });

  it("extracts lineage settings from state", () => {
    const state = {
      clonalFamilies: {
        lineageShowEntire: true,
        lineageShowBorders: true,
        lineageChain: "light"
      }
    };
    const result = extractLineageSettings(state);
    expect(result.showEntire).toBe(true);
    expect(result.showBorders).toBe(true);
    expect(result.chain).toBe("light");
  });
});

describe("extractCurrentSettings", () => {
  it("combines all settings", () => {
    const result = extractCurrentSettings(null, null, null);
    expect(result).toHaveProperty("scatterplot");
    expect(result).toHaveProperty("tree");
    expect(result).toHaveProperty("global");
    expect(result).toHaveProperty("lineage");
  });
});

describe("applyScatterplotSettings", () => {
  it("does nothing when view is null", () => {
    expect(() => applyScatterplotSettings(null, {})).not.toThrow();
  });

  it("sets signals and runs view", () => {
    const mockView = {
      signal: jest.fn(),
      run: jest.fn()
    };
    applyScatterplotSettings(mockView, { xField: "custom" });
    expect(mockView.signal).toHaveBeenCalledWith("xField", "custom");
    expect(mockView.run).toHaveBeenCalled();
  });

  it("ignores signals not in SCATTERPLOT_SIGNALS", () => {
    const mockView = {
      signal: jest.fn(),
      run: jest.fn()
    };
    applyScatterplotSettings(mockView, { unknownSignal: "value" });
    expect(mockView.signal).not.toHaveBeenCalledWith("unknownSignal", "value");
  });

  it("resolves DEFAULT_KEYWORD values", () => {
    const mockView = {
      signal: jest.fn(),
      run: jest.fn()
    };
    applyScatterplotSettings(mockView, { xField: DEFAULT_KEYWORD });
    expect(mockView.signal).toHaveBeenCalledWith("xField", DEFAULT_SCATTERPLOT_SETTINGS.xField);
  });
});

describe("applyTreeSettings", () => {
  it("does nothing when view is null", () => {
    expect(() => applyTreeSettings(null, {})).not.toThrow();
  });

  it("sets tree signals and runs view", () => {
    const mockView = {
      signal: jest.fn(),
      run: jest.fn()
    };
    applyTreeSettings(mockView, { show_labels: false });
    expect(mockView.signal).toHaveBeenCalledWith("show_labels", false);
    expect(mockView.run).toHaveBeenCalled();
  });
});

describe("applyGlobalSettings", () => {
  it("does nothing when dispatch is null", () => {
    expect(() => applyGlobalSettings(null, {}, {})).not.toThrow();
  });

  it("clears filters then applies new ones", () => {
    const dispatch = jest.fn();
    const actions = {
      setFilter: jest.fn((field, values) => ({ type: "SET_FILTER", field, values })),
      clearAllFilters: jest.fn(() => ({ type: "CLEAR_ALL_FILTERS" })),
      updateSelectedChain: jest.fn((chain) => ({ type: "UPDATE_CHAIN", chain }))
    };
    applyGlobalSettings(dispatch, {
      filters: { "sample.locus": ["IGH"] },
      selectedChain: "light"
    }, actions);
    expect(dispatch).toHaveBeenCalledTimes(3); // clearAll + setFilter + updateChain
  });
});

describe("applyLineageSettings", () => {
  it("does nothing when dispatch is null", () => {
    expect(() => applyLineageSettings(null, {}, {})).not.toThrow();
  });

  it("dispatches lineage actions", () => {
    const dispatch = jest.fn();
    const actions = {
      updateLineageShowEntire: jest.fn((v) => ({ type: "T", v })),
      updateLineageShowBorders: jest.fn((v) => ({ type: "T", v })),
      updateLineageChain: jest.fn((v) => ({ type: "T", v }))
    };
    applyLineageSettings(dispatch, {
      showEntire: true,
      showBorders: true,
      chain: "light"
    }, actions);
    expect(dispatch).toHaveBeenCalledTimes(3);
  });
});

describe("applyConfig", () => {
  it("does nothing when config is null", () => {
    expect(() => applyConfig(null)).not.toThrow();
  });

  it("does nothing when config.settings is missing", () => {
    expect(() => applyConfig({ id: "1" })).not.toThrow();
  });
});

describe("createConfig", () => {
  it("creates config with required fields", () => {
    const config = createConfig("My Config", { scatterplot: {} });
    expect(config.name).toBe("My Config");
    expect(config.id).toMatch(/^config_/);
    expect(config.version).toBe(CONFIG_VERSION);
    expect(config.settings).toEqual({ scatterplot: {} });
    expect(config.createdAt).toBeDefined();
    expect(config.updatedAt).toBeDefined();
  });

  it("includes optional description and datasetId", () => {
    const config = createConfig("C", {}, {
      description: "desc",
      datasetId: "d1"
    });
    expect(config.description).toBe("desc");
    expect(config.datasetId).toBe("d1");
  });
});

describe("getDefaultConfig", () => {
  it("returns a config with all default settings", () => {
    const config = getDefaultConfig();
    expect(config.name).toBe("Default");
    expect(config.settings.scatterplot).toEqual(DEFAULT_SCATTERPLOT_SETTINGS);
    expect(config.settings.tree).toEqual(DEFAULT_TREE_SETTINGS);
    expect(config.settings.global).toEqual(DEFAULT_GLOBAL_SETTINGS);
    expect(config.settings.lineage).toEqual(DEFAULT_LINEAGE_SETTINGS);
  });
});

describe("validateConfig", () => {
  it("validates a correct config", () => {
    const result = validateConfig(mockConfig);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("rejects null config", () => {
    const result = validateConfig(null);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Config is null or undefined");
  });

  it("rejects config without id", () => {
    const result = validateConfig({ name: "t", version: "1", settings: {} });
    expect(result.valid).toBe(false);
  });

  it("rejects config without name", () => {
    const result = validateConfig({ id: "t", version: "1", settings: {} });
    expect(result.valid).toBe(false);
  });

  it("rejects config without version", () => {
    const result = validateConfig({ id: "t", name: "t", settings: {} });
    expect(result.valid).toBe(false);
  });

  it("rejects config without settings", () => {
    const result = validateConfig({ id: "t", name: "t", version: "1" });
    expect(result.valid).toBe(false);
  });
});

describe("exportConfigToJson", () => {
  it("produces valid JSON string", () => {
    const json = exportConfigToJson(mockConfig);
    expect(() => JSON.parse(json)).not.toThrow();
    expect(JSON.parse(json).name).toBe("Test Config");
  });
});

describe("importConfigFromJson", () => {
  it("imports valid JSON and assigns new ID", () => {
    const json = exportConfigToJson(mockConfig);
    const result = importConfigFromJson(json);
    expect(result.error).toBeNull();
    expect(result.config).not.toBeNull();
    expect(result.config.id).not.toBe("config-1"); // new ID assigned
    expect(result.config.name).toBe("Test Config");
  });

  it("rejects invalid JSON", () => {
    const result = importConfigFromJson("not json");
    expect(result.config).toBeNull();
    expect(result.error).toContain("Invalid JSON");
  });

  it("rejects valid JSON that fails validation", () => {
    const result = importConfigFromJson(JSON.stringify({ foo: "bar" }));
    expect(result.config).toBeNull();
    expect(result.error).toBeDefined();
  });
});
