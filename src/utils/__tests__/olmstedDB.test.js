/**
 * Tests for OlmstedDB (Dexie database) using fake-indexeddb
 *
 * Each test gets a fresh DB instance to avoid cross-test state.
 */

import Dexie from "dexie";

// We can't use the singleton; import the class and create fresh instances.
// The module exports a singleton, so we re-create the class pattern here.
class TestOlmstedDB extends Dexie {
  constructor(name) {
    super(name);

    this.version(1).stores({
      datasets: "dataset_id, name, clone_count",
      clones: "[dataset_id+clone_id], dataset_id, sample_id, name, unique_seqs_count, mean_mut_freq",
      trees: "ident, tree_id, clone_id"
    });

    this.version(2).stores({
      datasets: "dataset_id, name, clone_count",
      clones: "[dataset_id+clone_id], dataset_id, sample_id, name, unique_seqs_count, mean_mut_freq",
      trees: "ident, tree_id, clone_id",
      configs: "id, name, datasetId, createdAt"
    });
  }
}

let db;
let dbCounter = 0;

beforeEach(async () => {
  dbCounter++;
  db = new TestOlmstedDB(`TestOlmstedDB_${dbCounter}`);
  await db.open();
});

afterEach(async () => {
  if (db.isOpen()) {
    db.close();
  }
  await Dexie.delete(db.name);
});

// ── Helper data factories ──

function makeDataset(overrides = {}) {
  return {
    dataset_id: "ds_1",
    name: "Test Dataset",
    clone_count: 3,
    ...overrides
  };
}

function makeClone(overrides = {}) {
  return {
    clone_id: "clone_001",
    dataset_id: "ds_1",
    sample_id: "sample_1",
    name: "Clone 1",
    unique_seqs_count: 10,
    mean_mut_freq: 0.05,
    ...overrides
  };
}

function makeTree(overrides = {}) {
  return {
    ident: "tree_clone_001_ident",
    tree_id: "tree_001",
    clone_id: "clone_001",
    newick: "((A:1,B:1):0.5,C:2);",
    root_node: "root",
    nodes: {
      root: { parent: null, distance: 0, type: "root", multiplicity: 1 },
      A: { parent: "root", distance: 1, type: "leaf", multiplicity: 2 },
      B: { parent: "root", distance: 1, type: "leaf", multiplicity: 1 }
    },
    ...overrides
  };
}

// ── datasets table ──

describe("datasets table", () => {
  it("adds and retrieves a dataset", async () => {
    await db.datasets.put(makeDataset());
    const all = await db.datasets.toArray();
    expect(all).toHaveLength(1);
    expect(all[0].dataset_id).toBe("ds_1");
  });

  it("retrieves datasets ordered by name", async () => {
    await db.datasets.bulkPut([
      makeDataset({ dataset_id: "b", name: "Zebra" }),
      makeDataset({ dataset_id: "a", name: "Alpha" })
    ]);
    const ordered = await db.datasets.orderBy("name").toArray();
    expect(ordered[0].name).toBe("Alpha");
    expect(ordered[1].name).toBe("Zebra");
  });

  it("overwrites dataset with same primary key", async () => {
    await db.datasets.put(makeDataset({ name: "V1" }));
    await db.datasets.put(makeDataset({ name: "V2" }));
    const all = await db.datasets.toArray();
    expect(all).toHaveLength(1);
    expect(all[0].name).toBe("V2");
  });

  it("deletes a dataset by key", async () => {
    await db.datasets.put(makeDataset());
    await db.datasets.delete("ds_1");
    const all = await db.datasets.toArray();
    expect(all).toHaveLength(0);
  });
});

// ── clones table ──

describe("clones table", () => {
  it("adds and retrieves clones by dataset_id", async () => {
    await db.clones.bulkPut([
      makeClone({ clone_id: "c1", dataset_id: "ds_1" }),
      makeClone({ clone_id: "c2", dataset_id: "ds_1" }),
      makeClone({ clone_id: "c3", dataset_id: "ds_2" })
    ]);
    const ds1Clones = await db.clones.where("dataset_id").equals("ds_1").toArray();
    expect(ds1Clones).toHaveLength(2);
  });

  it("uses compound primary key [dataset_id+clone_id]", async () => {
    await db.clones.put(makeClone({ clone_id: "c1", dataset_id: "ds_1", name: "V1" }));
    await db.clones.put(makeClone({ clone_id: "c1", dataset_id: "ds_1", name: "V2" }));
    const all = await db.clones.toArray();
    expect(all).toHaveLength(1);
    expect(all[0].name).toBe("V2");
  });

  it("allows same clone_id in different datasets", async () => {
    await db.clones.bulkPut([
      makeClone({ clone_id: "c1", dataset_id: "ds_1" }),
      makeClone({ clone_id: "c1", dataset_id: "ds_2" })
    ]);
    const all = await db.clones.toArray();
    expect(all).toHaveLength(2);
  });
});

// ── trees table ──

describe("trees table", () => {
  it("adds and retrieves a tree by ident", async () => {
    await db.trees.put(makeTree());
    const tree = await db.trees.where("ident").equals("tree_clone_001_ident").first();
    expect(tree).toBeDefined();
    expect(tree.newick).toContain("((A:1,B:1)");
  });

  it("stores nodes as an object and retrieves them intact", async () => {
    await db.trees.put(makeTree());
    const tree = await db.trees.where("ident").equals("tree_clone_001_ident").first();
    expect(tree.nodes).toHaveProperty("root");
    expect(tree.nodes).toHaveProperty("A");
    expect(tree.nodes.A.parent).toBe("root");
  });

  it("node object→array conversion round-trips correctly", async () => {
    const original = makeTree();
    await db.trees.put(original);
    const stored = await db.trees.where("ident").equals(original.ident).first();

    // Simulate the conversion done by getTreeByIdent in olmstedDB.js
    const nodesArray = [];
    for (const [nodeId, nodeData] of Object.entries(stored.nodes)) {
      nodesArray.push({
        sequence_id: nodeId,
        parent: nodeData.parent,
        distance: nodeData.distance,
        type: nodeData.type,
        multiplicity: nodeData.multiplicity
      });
    }

    expect(nodesArray).toHaveLength(3);
    const rootNode = nodesArray.find((n) => n.sequence_id === "root");
    expect(rootNode.parent).toBeNull();
    const leafA = nodesArray.find((n) => n.sequence_id === "A");
    expect(leafA.parent).toBe("root");
    expect(leafA.multiplicity).toBe(2);
  });

  it("retrieves tree by clone_id index", async () => {
    await db.trees.put(makeTree());
    const tree = await db.trees.where("clone_id").equals("clone_001").first();
    expect(tree).toBeDefined();
    expect(tree.ident).toBe("tree_clone_001_ident");
  });
});

// ── configs table ──

describe("configs table", () => {
  it("adds and retrieves a config", async () => {
    const config = { id: "cfg_1", name: "My Config", datasetId: "ds_1", createdAt: Date.now() };
    await db.configs.put(config);
    const retrieved = await db.configs.get("cfg_1");
    expect(retrieved.name).toBe("My Config");
  });

  it("filters configs by datasetId", async () => {
    await db.configs.bulkPut([
      { id: "c1", name: "A", datasetId: "ds_1", createdAt: 1 },
      { id: "c2", name: "B", datasetId: "ds_2", createdAt: 2 }
    ]);
    const ds1 = await db.configs.where("datasetId").equals("ds_1").toArray();
    expect(ds1).toHaveLength(1);
    expect(ds1[0].name).toBe("A");
  });

  it("deletes a config", async () => {
    await db.configs.put({ id: "cfg_del", name: "Temp", datasetId: "ds_1", createdAt: 1 });
    await db.configs.delete("cfg_del");
    const result = await db.configs.get("cfg_del");
    expect(result).toBeUndefined();
  });
});

// ── clearAll ──

describe("clearAll", () => {
  it("clears all tables", async () => {
    await db.datasets.put(makeDataset());
    await db.clones.put(makeClone());
    await db.trees.put(makeTree());
    await db.configs.put({ id: "c1", name: "X", datasetId: "ds_1", createdAt: 1 });

    await db.transaction("rw", db.datasets, db.clones, db.trees, db.configs, async () => {
      await db.datasets.clear();
      await db.clones.clear();
      await db.trees.clear();
      await db.configs.clear();
    });

    expect(await db.datasets.count()).toBe(0);
    expect(await db.clones.count()).toBe(0);
    expect(await db.trees.count()).toBe(0);
    expect(await db.configs.count()).toBe(0);
  });
});

// ── Cascade delete (removeDataset pattern) ──

describe("cascade delete pattern", () => {
  it("removes dataset, its clones, and associated trees", async () => {
    await db.datasets.put(makeDataset());
    await db.clones.bulkPut([makeClone({ clone_id: "c1" }), makeClone({ clone_id: "c2" })]);
    await db.trees.bulkPut([makeTree({ ident: "t1", clone_id: "c1" }), makeTree({ ident: "t2", clone_id: "c2" })]);

    // Simulate removeDataset logic
    await db.transaction("rw", db.datasets, db.clones, db.trees, async () => {
      const clones = await db.clones.where("dataset_id").equals("ds_1").toArray();
      const cloneIds = clones.map((c) => c.clone_id);

      await db.datasets.delete("ds_1");
      await db.clones.where("dataset_id").equals("ds_1").delete();
      if (cloneIds.length > 0) {
        await db.trees.where("clone_id").anyOf(cloneIds).delete();
      }
    });

    expect(await db.datasets.count()).toBe(0);
    expect(await db.clones.count()).toBe(0);
    expect(await db.trees.count()).toBe(0);
  });
});
