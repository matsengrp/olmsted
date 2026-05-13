/**
 * Tests for bin/build_datasets_manifest.js
 *
 * Each test uses a fresh temp directory so we can write and re-read
 * the manifest without polluting checked-in fixtures.
 */

const fs = require("fs");
const os = require("os");
const path = require("path");
const zlib = require("zlib");
const {
  buildManifest,
  scanForConsolidatedDatasets,
  loadExistingSplitEntries,
  isCandidateConsolidatedFile,
  isConsolidatedShape
} = require("../build_datasets_manifest");

const makeConsolidatedPayload = (overrides = {}) => ({
  metadata: { schema_version: "2.0.0", ...overrides.metadata },
  datasets: [
    {
      ident: overrides.ident || "ident-xyz",
      dataset_id: overrides.dataset_id || "ds-xyz",
      name: overrides.name || "Dataset XYZ",
      clone_count: overrides.clone_count ?? 1,
      schema_version: "2.0.0"
    }
  ],
  clones: { "ds-xyz": [] },
  trees: []
});

let tmpDir;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "manifest-test-"));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

const write = (relPath, content) => {
  const full = path.join(tmpDir, relPath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  if (typeof content === "string") {
    fs.writeFileSync(full, content);
  } else {
    fs.writeFileSync(full, JSON.stringify(content));
  }
  return full;
};

const writeGz = (relPath, payload) => {
  const full = path.join(tmpDir, relPath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, zlib.gzipSync(JSON.stringify(payload)));
  return full;
};

describe("isCandidateConsolidatedFile", () => {
  it.each([
    ["consolidated.json", true],
    ["something.json.gz", true],
    ["datasets.json", false],
    ["clones.foo.json", false],
    ["tree.abc.json", false],
    ["readme.md", false]
  ])("isCandidateConsolidatedFile(%p) === %p", (name, expected) => {
    expect(isCandidateConsolidatedFile(name)).toBe(expected);
  });
});

describe("isConsolidatedShape", () => {
  it("accepts a well-formed payload", () => {
    expect(isConsolidatedShape(makeConsolidatedPayload())).toBe(true);
  });

  it.each([
    [null],
    [{}],
    [{ metadata: {}, datasets: [], clones: {}, trees: [] }], // empty datasets
    [{ datasets: [{ dataset_id: "x" }], clones: {}, trees: [] }] // no metadata
  ])("rejects malformed payload %p", (payload) => {
    expect(isConsolidatedShape(payload)).toBe(false);
  });
});

describe("scanForConsolidatedDatasets", () => {
  it("finds a top-level consolidated .json file", () => {
    write("foo.json", makeConsolidatedPayload({ dataset_id: "ds-foo" }));
    const entries = scanForConsolidatedDatasets(tmpDir);
    expect(entries).toHaveLength(1);
    expect(entries[0].dataset_id).toBe("ds-foo");
    expect(entries[0].consolidated_path).toBe("foo.json");
  });

  it("finds a .json.gz file and decompresses it", () => {
    writeGz("bar.json.gz", makeConsolidatedPayload({ dataset_id: "ds-bar" }));
    const entries = scanForConsolidatedDatasets(tmpDir);
    expect(entries).toHaveLength(1);
    expect(entries[0].dataset_id).toBe("ds-bar");
    expect(entries[0].consolidated_path).toBe("bar.json.gz");
  });

  it("descends into subdirectories", () => {
    write("consolidated/nested.json", makeConsolidatedPayload({ dataset_id: "ds-nested" }));
    const entries = scanForConsolidatedDatasets(tmpDir);
    expect(entries).toHaveLength(1);
    expect(entries[0].consolidated_path).toBe("consolidated/nested.json");
  });

  it("skips datasets.json, clones.*.json, tree.*.json", () => {
    write("datasets.json", []);
    write("clones.ds-x.json", []);
    write("tree.abc-123.json", { nodes: [] });
    const entries = scanForConsolidatedDatasets(tmpDir);
    expect(entries).toEqual([]);
  });

  it("skips files that don't match the consolidated shape", () => {
    write("not-consolidated.json", { just: "a random object" });
    const entries = scanForConsolidatedDatasets(tmpDir);
    expect(entries).toEqual([]);
  });

  it("skips files that fail to parse but doesn't throw", () => {
    write("malformed.json", "not valid json");
    const consoleSpy = jest.spyOn(console, "warn").mockImplementation();
    const entries = scanForConsolidatedDatasets(tmpDir);
    expect(entries).toEqual([]);
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("malformed.json"));
    consoleSpy.mockRestore();
  });
});

describe("loadExistingSplitEntries", () => {
  it("returns [] when manifest doesn't exist", () => {
    expect(loadExistingSplitEntries(path.join(tmpDir, "datasets.json"))).toEqual([]);
  });

  it("returns split entries (no consolidated_path) and drops consolidated ones", () => {
    write("datasets.json", [
      { dataset_id: "split-1", name: "Split One" },
      { dataset_id: "consolidated-1", consolidated_path: "consolidated-1.json" }
    ]);
    const split = loadExistingSplitEntries(path.join(tmpDir, "datasets.json"));
    expect(split).toHaveLength(1);
    expect(split[0].dataset_id).toBe("split-1");
  });

  it("returns [] and warns when the existing manifest is malformed", () => {
    write("datasets.json", "not a valid manifest");
    const consoleSpy = jest.spyOn(console, "warn").mockImplementation();
    expect(loadExistingSplitEntries(path.join(tmpDir, "datasets.json"))).toEqual([]);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});

describe("buildManifest (integration)", () => {
  it("preserves legacy split entries and refreshes consolidated entries", () => {
    // Existing manifest with a hand-curated split entry AND a stale
    // consolidated entry pointing at a file that no longer exists.
    write("datasets.json", [
      { dataset_id: "legacy-split", name: "Legacy split dataset" },
      { dataset_id: "stale-consolidated", consolidated_path: "ghost.json" }
    ]);
    // The actual consolidated file on disk:
    write("real.json", makeConsolidatedPayload({ dataset_id: "real-consolidated" }));

    const result = buildManifest(tmpDir);

    expect(result.split).toHaveLength(1);
    expect(result.split[0].dataset_id).toBe("legacy-split");
    expect(result.consolidated).toHaveLength(1);
    expect(result.consolidated[0].dataset_id).toBe("real-consolidated");

    // The on-disk manifest reflects the merge.
    const onDisk = JSON.parse(fs.readFileSync(path.join(tmpDir, "datasets.json"), "utf-8"));
    expect(onDisk).toHaveLength(2);
    const idents = onDisk.map((e) => e.dataset_id).sort();
    expect(idents).toEqual(["legacy-split", "real-consolidated"]);
  });

  it("writes a fresh manifest when none exists", () => {
    write("foo.json", makeConsolidatedPayload({ dataset_id: "foo" }));
    buildManifest(tmpDir);
    const onDisk = JSON.parse(fs.readFileSync(path.join(tmpDir, "datasets.json"), "utf-8"));
    expect(onDisk).toHaveLength(1);
    expect(onDisk[0].consolidated_path).toBe("foo.json");
  });

  it("writes an empty manifest when the dir is empty", () => {
    buildManifest(tmpDir);
    const onDisk = JSON.parse(fs.readFileSync(path.join(tmpDir, "datasets.json"), "utf-8"));
    expect(onDisk).toEqual([]);
  });
});
