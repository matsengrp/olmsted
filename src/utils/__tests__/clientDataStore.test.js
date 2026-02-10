/**
 * Tests for ClientDataStore — LRU cache wrapper around OlmstedDB
 *
 * We test the cache logic directly by instantiating the class,
 * and mock the underlying olmstedDB module.
 */

// Mock olmstedDB before importing ClientDataStore
jest.mock("../olmstedDB", () => {
  const datasets = [];
  const clones = [];
  const trees = [];

  return {
    __esModule: true,
    default: {
      ready: Promise.resolve(),
      storeDataset: jest.fn(async (data) => data.datasetId),
      getAllDatasets: jest.fn(async () => [...datasets]),
      getCloneMetadata: jest.fn(async () => [...clones]),
      getTreeByIdent: jest.fn(async (ident) => trees.find((t) => t.ident === ident) || null),
      getTreeForClone: jest.fn(async (cloneId) => trees.find((t) => t.clone_id === cloneId) || null),
      removeDataset: jest.fn(async () => {}),
      clearAll: jest.fn(async () => {}),
      getStats: jest.fn(async () => ({ datasets: 0, clones: 0, trees: 0, configs: 0 })),
      getStorageEstimate: jest.fn(async () => ({ used: 0, total: 0 })),
      // Helpers for tests to manipulate mock data
      _datasets: datasets,
      _clones: clones,
      _trees: trees
    }
  };
});

// Mock errors module to avoid import issues
jest.mock("../errors", () => ({
  ValidationError: class ValidationError extends Error {
    constructor(msg) {
      super(msg);
      this.name = "ValidationError";
    }
  },
  DatabaseError: class DatabaseError extends Error {
    constructor(msg) {
      super(msg);
      this.name = "DatabaseError";
    }
  },
  ErrorLogger: {
    info: jest.fn(),
    warn: jest.fn(),
    log: jest.fn()
  },
  validateRequired: jest.fn((val, name) => {
    if (val === null || val === undefined) throw new Error(`${name} is required`);
  }),
  validateType: jest.fn()
}));

// Now import the module under test (will get the mocked olmstedDB)
const { default: clientDataStore } = require("../clientDataStore");
const olmstedDB = require("../olmstedDB").default;

describe("ClientDataStore", () => {
  beforeEach(() => {
    // Clear caches between tests
    clientDataStore.recentClones.clear();
    clientDataStore.recentTrees.clear();
    jest.clearAllMocks();
  });

  // ── addToCache ──

  describe("addToCache (LRU eviction)", () => {
    it("adds items to cache", () => {
      const cache = new Map();
      clientDataStore.addToCache(cache, "k1", "v1");
      expect(cache.get("k1")).toBe("v1");
    });

    it("evicts oldest entry when cache exceeds maxCacheSize", () => {
      const cache = new Map();
      // Fill to max (10)
      for (let i = 0; i < 10; i++) {
        clientDataStore.addToCache(cache, `k${i}`, `v${i}`);
      }
      expect(cache.size).toBe(10);
      expect(cache.has("k0")).toBe(true);

      // Add one more — should evict k0
      clientDataStore.addToCache(cache, "k10", "v10");
      expect(cache.size).toBe(10);
      expect(cache.has("k0")).toBe(false);
      expect(cache.has("k10")).toBe(true);
    });

    it("evicts entries in FIFO order", () => {
      const cache = new Map();
      for (let i = 0; i < 10; i++) {
        clientDataStore.addToCache(cache, `k${i}`, `v${i}`);
      }
      // Add 3 more
      clientDataStore.addToCache(cache, "a", "a");
      clientDataStore.addToCache(cache, "b", "b");
      clientDataStore.addToCache(cache, "c", "c");

      expect(cache.has("k0")).toBe(false);
      expect(cache.has("k1")).toBe(false);
      expect(cache.has("k2")).toBe(false);
      expect(cache.has("k3")).toBe(true); // still present
      expect(cache.has("c")).toBe(true);
    });
  });

  // ── getTree (cache behaviour) ──

  describe("getTree", () => {
    it("returns tree from DB on cache miss", async () => {
      const mockTree = { ident: "t1", clone_id: "c1", nodes: {} };
      olmstedDB.getTreeByIdent.mockResolvedValueOnce(mockTree);

      const result = await clientDataStore.getTree("t1");
      expect(result).toEqual(mockTree);
      expect(olmstedDB.getTreeByIdent).toHaveBeenCalledWith("t1");
    });

    it("returns tree from cache on second call", async () => {
      const mockTree = { ident: "t1", clone_id: "c1", nodes: {} };
      olmstedDB.getTreeByIdent.mockResolvedValueOnce(mockTree);

      await clientDataStore.getTree("t1");
      const cached = await clientDataStore.getTree("t1");

      expect(cached).toEqual(mockTree);
      // DB should only have been called once
      expect(olmstedDB.getTreeByIdent).toHaveBeenCalledTimes(1);
    });

    it("throws on invalid treeIdent", async () => {
      await expect(clientDataStore.getTree("")).rejects.toThrow("non-empty string");
      await expect(clientDataStore.getTree(null)).rejects.toThrow("non-empty string");
    });

    it("returns null when tree not found", async () => {
      olmstedDB.getTreeByIdent.mockResolvedValueOnce(null);
      olmstedDB.getTreeForClone.mockResolvedValueOnce(null);
      const result = await clientDataStore.getTree("nonexistent");
      expect(result).toBeNull();
    });
  });

  // ── getAllDatasets ──

  describe("getAllDatasets", () => {
    it("delegates to olmstedDB.getAllDatasets", async () => {
      olmstedDB.getAllDatasets.mockResolvedValueOnce([{ dataset_id: "ds_1" }]);
      const result = await clientDataStore.getAllDatasets();
      expect(result).toHaveLength(1);
      expect(olmstedDB.getAllDatasets).toHaveBeenCalled();
    });
  });

  // ── clearAllData ──

  describe("clearAllData", () => {
    it("clears DB and memory caches", async () => {
      clientDataStore.recentClones.set("a", "b");
      clientDataStore.recentTrees.set("c", "d");

      await clientDataStore.clearAllData();

      expect(olmstedDB.clearAll).toHaveBeenCalled();
      expect(clientDataStore.recentClones.size).toBe(0);
      expect(clientDataStore.recentTrees.size).toBe(0);
    });
  });

  // ── clearMemoryCache ──

  describe("clearMemoryCache", () => {
    it("clears only memory caches, not DB", () => {
      clientDataStore.recentClones.set("x", "y");
      clientDataStore.recentTrees.set("z", "w");

      clientDataStore.clearMemoryCache();

      expect(clientDataStore.recentClones.size).toBe(0);
      expect(clientDataStore.recentTrees.size).toBe(0);
      expect(olmstedDB.clearAll).not.toHaveBeenCalled();
    });
  });

  // ── removeDataset ──

  describe("removeDataset", () => {
    it("removes dataset from DB and clears related cache entries", async () => {
      clientDataStore.recentClones.set("ds_1_clone_001", { data: true });
      clientDataStore.recentClones.set("ds_1_clone_002", { data: true });
      clientDataStore.recentClones.set("ds_2_clone_001", { data: true });

      await clientDataStore.removeDataset("ds_1");

      expect(olmstedDB.removeDataset).toHaveBeenCalledWith("ds_1");
      expect(clientDataStore.recentClones.has("ds_1_clone_001")).toBe(false);
      expect(clientDataStore.recentClones.has("ds_1_clone_002")).toBe(false);
      // Other datasets untouched
      expect(clientDataStore.recentClones.has("ds_2_clone_001")).toBe(true);
    });

    it("throws on invalid datasetId", async () => {
      await expect(clientDataStore.removeDataset("")).rejects.toThrow("non-empty string");
    });
  });
});
