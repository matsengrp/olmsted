/**
 * Unit tests for src/server/getFiles.js
 *
 * Covers the file-serving layer used by the Charon API:
 * - validateFilePath rejects traversal and absolute paths (tested
 *   indirectly through getSplashImage / getDatasetJson, which surface
 *   the validation errors).
 * - getDataFile dispatches to res.sendFile for LOCAL_DATA mode and
 *   to remote fetch for staging/live S3 modes.
 *
 * Remote fetch paths are tested by mocking globalThis.fetch.
 */

const path = require("path");
const getFiles = require("../getFiles");
const globals = require("../globals");

const FIXTURE_DIR = path.resolve(__dirname, "__fixtures__/server-data");

const makeRes = () => ({
  sendFile: jest.fn(),
  send: jest.fn(),
  set: jest.fn(),
  status: jest.fn().mockReturnThis(),
  headersSent: false
});

describe("getFiles (local mode)", () => {
  beforeEach(() => {
    globals.setGlobals({ localData: true, localDataPath: FIXTURE_DIR });
  });

  it("getDatasets serves datasets.json from the local data dir", async () => {
    const res = makeRes();
    await getFiles.getDatasets({}, res);
    expect(res.sendFile).toHaveBeenCalledWith(path.join(FIXTURE_DIR, "datasets.json"));
  });

  it("getClonalFamilies serves clones.json from the local data dir", async () => {
    const res = makeRes();
    await getFiles.getClonalFamilies({}, res);
    expect(res.sendFile).toHaveBeenCalledWith(path.join(FIXTURE_DIR, "clones.json"));
  });

  it("getSplashImage serves the requested src under the local data dir", async () => {
    const res = makeRes();
    await getFiles.getSplashImage({ src: "splash.svg" }, res);
    expect(res.sendFile).toHaveBeenCalledWith(path.join(FIXTURE_DIR, "splash.svg"));
  });

  it("getDatasetJson serves the requested path under the local data dir", async () => {
    const res = makeRes();
    await getFiles.getDatasetJson({ path: "clones.fixture-dataset-001.json" }, res);
    expect(res.sendFile).toHaveBeenCalledWith(path.join(FIXTURE_DIR, "clones.fixture-dataset-001.json"));
  });

  it("getDatasetJson serves a consolidated olmsted-cli file as a plain path", async () => {
    // The Charon API doesn't care about file format — it serves whatever
    // file you point at. This is the wire-level prerequisite for the
    // consolidated-server-dataset flow.
    const res = makeRes();
    await getFiles.getDatasetJson({ path: "consolidated.fixture-consolidated-001.json" }, res);
    expect(res.sendFile).toHaveBeenCalledWith(path.join(FIXTURE_DIR, "consolidated.fixture-consolidated-001.json"));
  });
});

describe("getFiles path validation", () => {
  beforeEach(() => {
    globals.setGlobals({ localData: true, localDataPath: FIXTURE_DIR });
  });

  it.each([
    ["traversal sequence", { src: "../etc/passwd" }],
    ["backslash", { src: "foo\\bar" }],
    ["absolute path", { src: "/etc/passwd" }],
    ["empty path", { src: "" }]
  ])("getSplashImage rejects %s with 400", async (_label, query) => {
    const res = makeRes();
    await getFiles.getSplashImage(query, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith(expect.stringMatching(/Invalid request:/));
    expect(res.sendFile).not.toHaveBeenCalled();
  });

  it.each([
    ["traversal sequence", { path: "../../secret.json" }],
    ["absolute path", { path: "/tmp/leak.json" }],
    ["empty path", {}]
  ])("getDatasetJson rejects %s with 400", async (_label, query) => {
    const res = makeRes();
    await getFiles.getDatasetJson(query, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith(expect.stringMatching(/Invalid request:/));
    expect(res.sendFile).not.toHaveBeenCalled();
  });
});

describe("getFiles (remote mode)", () => {
  let originalFetch;

  beforeEach(() => {
    globals.setGlobals({ localData: false });
    originalFetch = globalThis.fetch;
    // Each test installs its own fetch mock that returns a small payload.
    globalThis.fetch = jest.fn(async () => ({
      ok: true,
      headers: { get: () => "application/json" },
      arrayBuffer: async () => new ArrayBuffer(0)
    }));
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("getDatasets fetches from the live S3 base URL by default", async () => {
    const res = makeRes();
    await getFiles.getDatasets({}, res);
    expect(globalThis.fetch).toHaveBeenCalledWith(`${global.REMOTE_DATA_LIVE_BASEURL}datasets.json`);
    expect(res.send).toHaveBeenCalled();
  });

  it("getDatasets honors s3=staging by fetching from the staging base URL", async () => {
    const res = makeRes();
    await getFiles.getDatasets({ s3: "staging" }, res);
    expect(globalThis.fetch).toHaveBeenCalledWith(`${global.REMOTE_DATA_STAGING_BASEURL}datasets.json`);
  });

  it("propagates non-OK status codes from the remote", async () => {
    globalThis.fetch = jest.fn(async () => ({
      ok: false,
      status: 404,
      statusText: "Not Found",
      headers: { get: () => "text/html" }
    }));
    const res = makeRes();
    await getFiles.getDatasets({}, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.send).toHaveBeenCalledWith(expect.stringMatching(/Failed to fetch/));
  });

  it("returns 500 when the remote fetch throws", async () => {
    globalThis.fetch = jest.fn(async () => {
      throw new Error("network down");
    });
    const res = makeRes();
    await getFiles.getDatasets({}, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith(expect.stringMatching(/Failed to fetch/));
  });
});
