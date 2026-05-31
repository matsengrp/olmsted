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
