import datasets from "../datasets";
import * as types from "../../actions/types";
import { mockDataset, mockDataset2 } from "../../__test-data__/mockState";

describe("datasets reducer", () => {
  // jsdom defaults window.location.pathname to "/"
  const initialState = datasets(undefined, { type: "INIT" });

  it("returns initial state with splash display", () => {
    expect(initialState.displayComponent).toBe("splash");
    expect(initialState.availableDatasets).toEqual([]);
    expect(initialState.selectedDatasets).toEqual([]);
    expect(initialState.pendingDatasetLoads).toEqual([]);
    expect(initialState.starredDatasets).toEqual([]);
  });

  describe("LOADING_DATASET", () => {
    it("sets loading status on a dataset", () => {
      const stateWithDatasets = {
        ...initialState,
        availableDatasets: [mockDataset]
      };
      const state = datasets(stateWithDatasets, {
        type: types.LOADING_DATASET,
        dataset_id: "dataset-1",
        loading: "LOADING"
      });
      expect(state.availableDatasets[0].loading).toBe("LOADING");
    });

    it("does not modify other datasets", () => {
      const stateWithDatasets = {
        ...initialState,
        availableDatasets: [mockDataset, mockDataset2]
      };
      const state = datasets(stateWithDatasets, {
        type: types.LOADING_DATASET,
        dataset_id: "dataset-1",
        loading: "LOADING"
      });
      expect(state.availableDatasets[1].loading).toBe("DONE");
    });
  });

  describe("PAGE_CHANGE", () => {
    it("updates displayComponent and datapath", () => {
      const state = datasets(initialState, {
        type: types.PAGE_CHANGE,
        displayComponent: "app",
        datapath: "/app/test"
      });
      expect(state.displayComponent).toBe("app");
      expect(state.datapath).toBe("/app/test");
    });
  });

  describe("DATASETS_RECEIVED", () => {
    it("sets available datasets", () => {
      const state = datasets(initialState, {
        type: types.DATASETS_RECEIVED,
        availableDatasets: [mockDataset],
        s3bucket: "live",
        splash: "default"
      });
      expect(state.availableDatasets).toHaveLength(1);
      expect(state.s3bucket).toBe("live");
    });

    it("preserves loading status when flag is set", () => {
      const stateWithLoaded = {
        ...initialState,
        availableDatasets: [{ ...mockDataset, loading: "DONE" }]
      };
      const state = datasets(stateWithLoaded, {
        type: types.DATASETS_RECEIVED,
        availableDatasets: [{ ...mockDataset, loading: undefined }],
        preserveLoadingStatus: true,
        s3bucket: "live"
      });
      expect(state.availableDatasets[0].loading).toBe("DONE");
    });
  });

  describe("REMOVE_DATASET", () => {
    it("removes dataset by id", () => {
      const stateWithDatasets = {
        ...initialState,
        availableDatasets: [mockDataset, mockDataset2]
      };
      const state = datasets(stateWithDatasets, {
        type: types.REMOVE_DATASET,
        dataset_id: "dataset-1"
      });
      expect(state.availableDatasets).toHaveLength(1);
      expect(state.availableDatasets[0].dataset_id).toBe("dataset-2");
    });
  });

  describe("TOGGLE_DATASET_SELECTION", () => {
    it("adds dataset to selection", () => {
      const state = datasets(initialState, {
        type: types.TOGGLE_DATASET_SELECTION,
        dataset_id: "dataset-1"
      });
      expect(state.selectedDatasets).toContain("dataset-1");
    });

    it("removes dataset from selection if already selected", () => {
      const stateWithSelection = {
        ...initialState,
        selectedDatasets: ["dataset-1"]
      };
      const state = datasets(stateWithSelection, {
        type: types.TOGGLE_DATASET_SELECTION,
        dataset_id: "dataset-1"
      });
      expect(state.selectedDatasets).not.toContain("dataset-1");
    });
  });

  describe("CLEAR_DATASET_SELECTIONS", () => {
    it("clears all selections", () => {
      const stateWithSelection = {
        ...initialState,
        selectedDatasets: ["dataset-1", "dataset-2"]
      };
      const state = datasets(stateWithSelection, {
        type: types.CLEAR_DATASET_SELECTIONS
      });
      expect(state.selectedDatasets).toEqual([]);
    });
  });

  describe("SET_PENDING_DATASET_LOADS", () => {
    it("sets pending loads", () => {
      const state = datasets(initialState, {
        type: types.SET_PENDING_DATASET_LOADS,
        datasetIds: ["dataset-1", "dataset-2"]
      });
      expect(state.pendingDatasetLoads).toEqual(["dataset-1", "dataset-2"]);
    });

    it("defaults to empty array when datasetIds is undefined", () => {
      const state = datasets(initialState, {
        type: types.SET_PENDING_DATASET_LOADS
      });
      expect(state.pendingDatasetLoads).toEqual([]);
    });
  });

  describe("CLEAR_PENDING_DATASET_LOADS", () => {
    it("clears pending loads", () => {
      const stateWithPending = {
        ...initialState,
        pendingDatasetLoads: ["dataset-1"]
      };
      const state = datasets(stateWithPending, {
        type: types.CLEAR_PENDING_DATASET_LOADS
      });
      expect(state.pendingDatasetLoads).toEqual([]);
    });
  });

  describe("TOGGLE_STARRED_DATASET", () => {
    it("stars a dataset", () => {
      const state = datasets(initialState, {
        type: types.TOGGLE_STARRED_DATASET,
        dataset_id: "dataset-1"
      });
      expect(state.starredDatasets).toContain("dataset-1");
    });

    it("unstars a dataset", () => {
      const stateWithStarred = {
        ...initialState,
        starredDatasets: ["dataset-1"]
      };
      const state = datasets(stateWithStarred, {
        type: types.TOGGLE_STARRED_DATASET,
        dataset_id: "dataset-1"
      });
      expect(state.starredDatasets).not.toContain("dataset-1");
    });
  });

  describe("CLEAR_STARRED_DATASETS", () => {
    it("clears all starred datasets", () => {
      const stateWithStarred = {
        ...initialState,
        starredDatasets: ["dataset-1", "dataset-2"]
      };
      const state = datasets(stateWithStarred, {
        type: types.CLEAR_STARRED_DATASETS
      });
      expect(state.starredDatasets).toEqual([]);
    });
  });

  describe("SET_STARRED_DATASETS", () => {
    it("sets starred datasets", () => {
      const state = datasets(initialState, {
        type: types.SET_STARRED_DATASETS,
        starredDatasets: ["dataset-1"]
      });
      expect(state.starredDatasets).toEqual(["dataset-1"]);
    });
  });

  describe("URL", () => {
    it("updates URL path and search", () => {
      const state = datasets(initialState, {
        type: types.URL,
        path: "/app/test",
        query: "?foo=bar"
      });
      expect(state.urlPath).toBe("/app/test");
      expect(state.urlSearch).toBe("?foo=bar");
    });
  });

  it("returns current state for unknown actions", () => {
    const state = datasets(initialState, { type: "UNKNOWN" });
    expect(state).toBe(initialState);
  });
});
