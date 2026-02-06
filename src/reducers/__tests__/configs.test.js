import configs from "../configs";
import * as types from "../../actions/types";
import { mockConfig } from "../../__test-data__/mockState";

describe("configs reducer", () => {
  const initialState = configs(undefined, { type: "INIT" });

  it("returns initial state", () => {
    expect(initialState).toEqual({
      savedConfigs: [],
      activeConfigId: null,
      isModalOpen: false,
      isLoading: false,
      error: null
    });
  });

  describe("CONFIGS_LOADED", () => {
    it("loads configs and clears loading/error", () => {
      const state = configs(
        { ...initialState, isLoading: true, error: "old error" },
        { type: types.CONFIGS_LOADED, configs: [mockConfig] }
      );
      expect(state.savedConfigs).toEqual([mockConfig]);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe("CONFIG_SAVED", () => {
    it("adds a new config to the beginning", () => {
      const state = configs(initialState, {
        type: types.CONFIG_SAVED,
        config: mockConfig
      });
      expect(state.savedConfigs).toHaveLength(1);
      expect(state.savedConfigs[0]).toEqual(mockConfig);
    });

    it("updates existing config in place", () => {
      const stateWithConfig = { ...initialState, savedConfigs: [mockConfig] };
      const updatedConfig = { ...mockConfig, name: "Updated" };
      const state = configs(stateWithConfig, {
        type: types.CONFIG_SAVED,
        config: updatedConfig
      });
      expect(state.savedConfigs).toHaveLength(1);
      expect(state.savedConfigs[0].name).toBe("Updated");
    });
  });

  describe("CONFIG_DELETED", () => {
    it("removes config from savedConfigs", () => {
      const stateWithConfig = { ...initialState, savedConfigs: [mockConfig] };
      const state = configs(stateWithConfig, {
        type: types.CONFIG_DELETED,
        configId: "config-1"
      });
      expect(state.savedConfigs).toHaveLength(0);
    });

    it("clears activeConfigId if deleted config was active", () => {
      const stateWithActive = {
        ...initialState,
        savedConfigs: [mockConfig],
        activeConfigId: "config-1"
      };
      const state = configs(stateWithActive, {
        type: types.CONFIG_DELETED,
        configId: "config-1"
      });
      expect(state.activeConfigId).toBeNull();
    });

    it("preserves activeConfigId if different config deleted", () => {
      const stateWithActive = {
        ...initialState,
        savedConfigs: [mockConfig],
        activeConfigId: "config-1"
      };
      const state = configs(stateWithActive, {
        type: types.CONFIG_DELETED,
        configId: "config-other"
      });
      expect(state.activeConfigId).toBe("config-1");
    });
  });

  describe("CONFIG_APPLIED", () => {
    it("sets activeConfigId", () => {
      const state = configs(initialState, {
        type: types.CONFIG_APPLIED,
        configId: "config-1"
      });
      expect(state.activeConfigId).toBe("config-1");
    });
  });

  describe("CONFIG_MODAL_OPEN / CONFIG_MODAL_CLOSE", () => {
    it("opens modal", () => {
      const state = configs(initialState, { type: types.CONFIG_MODAL_OPEN });
      expect(state.isModalOpen).toBe(true);
    });

    it("closes modal", () => {
      const openState = { ...initialState, isModalOpen: true };
      const state = configs(openState, { type: types.CONFIG_MODAL_CLOSE });
      expect(state.isModalOpen).toBe(false);
    });
  });

  it("returns current state for unknown actions", () => {
    const state = configs(initialState, { type: "UNKNOWN" });
    expect(state).toBe(initialState);
  });
});
