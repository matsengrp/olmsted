/**
 * Tests for the consolidated server-side dataset ingestion path in
 * clientDataLoader.js. The function fetches a manifest entry's
 * `consolidated_path`, wraps the response as a File, and runs it through
 * the same FileProcessor pipeline as in-browser uploads, then stores
 * the result in IndexedDB via olmstedDB.
 *
 * Tests use fake-indexeddb (via jest.setup.js) and a mocked global fetch.
 */

import fs from "fs";
import path from "path";

// src/util/globals.js pulls in d3-scale (ESM-only) for unrelated color
// constants; mock just the API constant we actually use here.
jest.mock("../../util/globals", () => ({
  dataBaseURL: "/data"
}));

const {
  ingestConsolidatedServerDataset,
  ingestConsolidatedServerDatasets,
  reconcileServerConsolidated,
  getClientDatasets
} = require("../clientDataLoader");
const olmstedDB = require("../../utils/olmstedDB").default;

const FIXTURE_DIR = path.resolve(__dirname, "../../server/__tests__/__fixtures__/server-data");

const readFixture = (name) => fs.readFileSync(path.join(FIXTURE_DIR, name), "utf8");

// Stub Response with the minimal surface the implementation uses: ok, status,
// statusText, json(), blob(). Blob() returns a real Blob (jsdom provides it).
const mockResponse = (text, { ok = true, status = 200, statusText = "OK" } = {}) => ({
  ok,
  status,
  statusText,
  json: async () => JSON.parse(text),
  blob: async () => new Blob([text], { type: "application/json" })
});

describe("ingestConsolidatedServerDataset", () => {
  let originalFetch;

  beforeEach(async () => {
    originalFetch = globalThis.fetch;
    await olmstedDB.ready;
    await olmstedDB.clearAll();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("fetches the consolidated file and stores it in IndexedDB", async () => {
    const consolidatedText = readFixture("consolidated.fixture-consolidated-001.json");
    globalThis.fetch = jest.fn(async () => mockResponse(consolidatedText));

    const entry = {
      dataset_id: "fixture-consolidated-001",
      consolidated_path: "consolidated.fixture-consolidated-001.json"
    };
    const stored = await ingestConsolidatedServerDataset(entry);

    expect(globalThis.fetch).toHaveBeenCalledWith("/data/consolidated.fixture-consolidated-001.json");
    expect(stored).toBeTruthy();
    // The storage layer preserves original_dataset_id so subsequent loads can dedupe.
    expect(stored.original_dataset_id).toBe("fixture-consolidated-001");

    // The dataset is now actually in IndexedDB.
    const all = await olmstedDB.getAllDatasets();
    expect(all).toHaveLength(1);
    expect(all[0].original_dataset_id).toBe("fixture-consolidated-001");
  });

  it("marks server-ingested datasets as SERVER_CONSOLIDATED source", async () => {
    const consolidatedText = readFixture("consolidated.fixture-consolidated-001.json");
    globalThis.fetch = jest.fn(async () => mockResponse(consolidatedText));

    const stored = await ingestConsolidatedServerDataset({
      dataset_id: "fixture-consolidated-001",
      consolidated_path: "consolidated.fixture-consolidated-001.json"
    });

    // `source` is the load-bearing field for Source labeling and loader
    // routing. The legacy booleans are kept in sync for backward compat
    // with already-persisted IndexedDB records.
    expect(stored.source).toBe("server-consolidated");
    expect(stored.isClientSide).toBe(true);
    expect(stored.temporary).toBe(false);

    const all = await olmstedDB.getAllDatasets();
    expect(all[0].source).toBe("server-consolidated");
    expect(all[0].isClientSide).toBe(true);
    expect(all[0].temporary).toBe(false);
  });

  it("short-circuits if the dataset is already in IndexedDB", async () => {
    const consolidatedText = readFixture("consolidated.fixture-consolidated-001.json");
    globalThis.fetch = jest.fn(async () => mockResponse(consolidatedText));

    const entry = {
      dataset_id: "fixture-consolidated-001",
      consolidated_path: "consolidated.fixture-consolidated-001.json"
    };

    // First call ingests, second should not refetch.
    await ingestConsolidatedServerDataset(entry);
    await ingestConsolidatedServerDataset(entry);

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    expect(await olmstedDB.datasets.count()).toBe(1);
  });

  it("returns null and does not throw when the fetch fails", async () => {
    globalThis.fetch = jest.fn(async () => mockResponse("", { ok: false, status: 404, statusText: "Not Found" }));

    const stored = await ingestConsolidatedServerDataset({
      dataset_id: "missing",
      consolidated_path: "missing.json"
    });

    expect(stored).toBeNull();
    expect(await olmstedDB.datasets.count()).toBe(0);
  });

  it("returns null and does not throw when FileProcessor rejects the payload", async () => {
    globalThis.fetch = jest.fn(async () => mockResponse("not valid json at all"));

    const stored = await ingestConsolidatedServerDataset({
      dataset_id: "bogus",
      consolidated_path: "bogus.json"
    });

    expect(stored).toBeNull();
    expect(await olmstedDB.datasets.count()).toBe(0);
  });

  it("serializes concurrent ingest calls for the same dataset_id (no race)", async () => {
    // Without the inflight gate, both ingests would pass `findDatasetByOriginalId`
    // before either had written, then both would store, producing two rows
    // with the same `original_dataset_id` (the production bug
    // Monitor + App double-mount triggers).
    const consolidatedText = readFixture("consolidated.fixture-consolidated-001.json");
    globalThis.fetch = jest.fn(async () => mockResponse(consolidatedText));

    const entry = {
      dataset_id: "fixture-consolidated-001",
      consolidated_path: "consolidated.fixture-consolidated-001.json"
    };
    const [a, b] = await Promise.all([ingestConsolidatedServerDataset(entry), ingestConsolidatedServerDataset(entry)]);

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    expect(await olmstedDB.datasets.count()).toBe(1);
    expect(a).toBeTruthy();
    expect(b).toBeTruthy();
    expect(a.dataset_id).toBe(b.dataset_id);
  });
});

describe("ingestConsolidatedServerDatasets (manifest-driven)", () => {
  let originalFetch;

  beforeEach(async () => {
    originalFetch = globalThis.fetch;
    await olmstedDB.ready;
    await olmstedDB.clearAll();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("ingests entries with consolidated_path; ignores entries without one", async () => {
    const manifestText = readFixture("datasets.json");
    const consolidatedText = readFixture("consolidated.fixture-consolidated-001.json");

    globalThis.fetch = jest.fn(async (url) => {
      if (url.endsWith("datasets.json")) return mockResponse(manifestText);
      if (url.endsWith("consolidated.fixture-consolidated-001.json")) return mockResponse(consolidatedText);
      return mockResponse("", { ok: false, status: 404 });
    });

    await ingestConsolidatedServerDatasets();

    // Only the consolidated entry was ingested; the legacy split entry is
    // dropped on the floor.
    const all = await olmstedDB.getAllDatasets();
    expect(all).toHaveLength(1);
    expect(all[0].original_dataset_id).toBe("fixture-consolidated-001");
  });

  it("no-ops when the manifest fetch fails", async () => {
    globalThis.fetch = jest.fn(async () => mockResponse("", { ok: false, status: 500 }));
    await ingestConsolidatedServerDatasets();
    const all = await olmstedDB.getAllDatasets();
    expect(all).toHaveLength(0);
  });

  it("no-ops when the manifest is not an array", async () => {
    globalThis.fetch = jest.fn(async () => mockResponse(JSON.stringify({ not: "an array" })));
    await ingestConsolidatedServerDatasets();
    const all = await olmstedDB.getAllDatasets();
    expect(all).toHaveLength(0);
  });
});

describe("reconcileServerConsolidated", () => {
  beforeEach(async () => {
    await olmstedDB.ready;
    await olmstedDB.clearAll();
  });

  // Seed a dataset record directly, bypassing FileProcessor. Anything not
  // overridden falls back to the storage-layer defaults the rest of the
  // app expects on a real ingested record.
  const seed = (props) =>
    olmstedDB.datasets.put({
      dataset_id: `local-${Math.random().toString(36).slice(2)}`,
      isClientSide: true,
      ...props
    });

  it("removes server-consolidated entries no longer present in the manifest", async () => {
    await seed({
      original_dataset_id: "stale-001",
      name: "Stale Server Dataset",
      source: "server-consolidated",
      temporary: false
    });
    await seed({
      original_dataset_id: "live-001",
      name: "Live Server Dataset",
      source: "server-consolidated",
      temporary: false
    });

    await reconcileServerConsolidated([{ dataset_id: "live-001", name: "Live Server Dataset" }]);

    const all = await olmstedDB.getAllDatasets();
    expect(all).toHaveLength(1);
    expect(all[0].original_dataset_id).toBe("live-001");
  });

  it("removes server-consolidated entries whose manifest name has changed", async () => {
    // Removal here is the intended trigger for re-ingestion: the subsequent
    // ingest pass will fetch the file fresh because findDatasetByOriginalId
    // no longer matches.
    await seed({
      original_dataset_id: "renamed-001",
      name: "Old Name",
      source: "server-consolidated",
      temporary: false
    });

    await reconcileServerConsolidated([{ dataset_id: "renamed-001", name: "New Name" }]);

    const all = await olmstedDB.getAllDatasets();
    expect(all).toHaveLength(0);
  });

  it("leaves server-consolidated entries with matching name untouched", async () => {
    await seed({
      original_dataset_id: "stable-001",
      name: "Stable Dataset",
      source: "server-consolidated",
      temporary: false
    });

    await reconcileServerConsolidated([{ dataset_id: "stable-001", name: "Stable Dataset" }]);

    const all = await olmstedDB.getAllDatasets();
    expect(all).toHaveLength(1);
    expect(all[0].name).toBe("Stable Dataset");
  });

  it("never touches UPLOAD entries, even when absent from the manifest", async () => {
    await seed({
      original_dataset_id: "user-upload-001",
      name: "User Upload",
      source: "upload",
      temporary: true
    });

    await reconcileServerConsolidated([]);

    const all = await olmstedDB.getAllDatasets();
    expect(all).toHaveLength(1);
    expect(all[0].original_dataset_id).toBe("user-upload-001");
  });

  it("skips records missing original_dataset_id (legacy / malformed)", async () => {
    await seed({
      // no original_dataset_id
      name: "Legacy Server Record",
      source: "server-consolidated",
      temporary: false
    });

    await reconcileServerConsolidated([]);

    const all = await olmstedDB.getAllDatasets();
    expect(all).toHaveLength(1);
    expect(all[0].name).toBe("Legacy Server Record");
  });

  it("deduplicates cached rows sharing an original_dataset_id, keeping the oldest", async () => {
    // Race-induced duplicates: two rows with the same original_dataset_id
    // but different storage dataset_ids (timestamp-prefixed by
    // generateDatasetId). Reconcile keeps the lexicographically-smallest
    // storage id (= oldest timestamp) and deletes the rest.
    await seed({
      dataset_id: "upload-100-aaa",
      original_dataset_id: "dup-001",
      name: "Duplicated Dataset",
      source: "server-consolidated",
      temporary: false
    });
    await seed({
      dataset_id: "upload-200-bbb",
      original_dataset_id: "dup-001",
      name: "Duplicated Dataset",
      source: "server-consolidated",
      temporary: false
    });
    await seed({
      dataset_id: "upload-300-ccc",
      original_dataset_id: "dup-001",
      name: "Duplicated Dataset",
      source: "server-consolidated",
      temporary: false
    });

    await reconcileServerConsolidated([{ dataset_id: "dup-001", name: "Duplicated Dataset" }]);

    const all = await olmstedDB.getAllDatasets();
    expect(all).toHaveLength(1);
    expect(all[0].dataset_id).toBe("upload-100-aaa");
  });

  it("heals datasets whose trees were wiped by the legacy removeDataset cascade", async () => {
    // Recovery for users hit by the pre-fix cascade. The dataset row and
    // its clones are intact, but the trees table has nothing under the
    // namespaced prefix. Reconcile detects this and deletes the dataset
    // so the ingest pass re-fetches it fresh.
    await seed({
      dataset_id: "upload-survivor",
      original_dataset_id: "wiped-001",
      name: "Wiped Trees Dataset",
      source: "server-consolidated",
      temporary: false
    });
    // Seed a clone so the orphan-check sees clones-without-trees.
    await olmstedDB.clones.put({
      dataset_id: "upload-survivor",
      clone_id: "clone-1",
      sample_id: "s1",
      name: "Clone 1",
      unique_seqs_count: 1,
      mean_mut_freq: 0
    });

    await reconcileServerConsolidated([{ dataset_id: "wiped-001", name: "Wiped Trees Dataset" }]);

    const all = await olmstedDB.getAllDatasets();
    expect(all).toHaveLength(0);
  });

  it("leaves intact datasets alone (clones + trees both present)", async () => {
    // Negative case for the orphan-clones heal: a dataset with both
    // clones and trees should not be deleted just because reconcile ran.
    await seed({
      dataset_id: "upload-healthy",
      original_dataset_id: "healthy-001",
      name: "Healthy Dataset",
      source: "server-consolidated",
      temporary: false
    });
    await olmstedDB.clones.put({
      dataset_id: "upload-healthy",
      clone_id: "clone-1",
      sample_id: "s1",
      name: "Clone 1",
      unique_seqs_count: 1,
      mean_mut_freq: 0
    });
    await olmstedDB.trees.put({
      ident: "upload-healthy::tree-1",
      tree_id: "tree-1",
      clone_id: "clone-1",
      nodes: { naive: { type: "root" } }
    });

    await reconcileServerConsolidated([{ dataset_id: "healthy-001", name: "Healthy Dataset" }]);

    const all = await olmstedDB.getAllDatasets();
    expect(all).toHaveLength(1);
    expect(all[0].dataset_id).toBe("upload-healthy");
  });

  it("deduplicates and sweeps in the same pass", async () => {
    // Duplicates AND no-longer-in-manifest. Dedup runs first, then sweep
    // removes the survivor too.
    await seed({
      dataset_id: "upload-100-aaa",
      original_dataset_id: "stale-dup-001",
      name: "Stale Duplicated Dataset",
      source: "server-consolidated",
      temporary: false
    });
    await seed({
      dataset_id: "upload-200-bbb",
      original_dataset_id: "stale-dup-001",
      name: "Stale Duplicated Dataset",
      source: "server-consolidated",
      temporary: false
    });

    await reconcileServerConsolidated([]); // empty manifest

    const all = await olmstedDB.getAllDatasets();
    expect(all).toHaveLength(0);
  });
});

describe("getClientDatasets manifest reconciliation", () => {
  let originalFetch;

  beforeEach(async () => {
    originalFetch = globalThis.fetch;
    await olmstedDB.ready;
    await olmstedDB.clearAll();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("does not delete cached datasets when the manifest fetch fails", async () => {
    // Offline / 500 / CORS → manifest === null. Reconciliation must be
    // skipped entirely; the cached entry survives so the user still has
    // something to look at.
    await olmstedDB.datasets.put({
      dataset_id: "local-stale",
      original_dataset_id: "would-be-stale-001",
      name: "Cached Server Dataset",
      source: "server-consolidated",
      temporary: false,
      isClientSide: true
    });

    globalThis.fetch = jest.fn(async () => mockResponse("", { ok: false, status: 500 }));
    const dispatch = jest.fn();
    await getClientDatasets(dispatch);

    const all = await olmstedDB.getAllDatasets();
    expect(all).toHaveLength(1);
    expect(all[0].original_dataset_id).toBe("would-be-stale-001");
  });
});
