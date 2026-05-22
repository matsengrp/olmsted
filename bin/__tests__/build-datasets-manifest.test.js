/**
 * Tests for bin/build-datasets-manifest.js
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
  detectCollisions,
  isCandidateConsolidatedFile,
  isConsolidatedShape
} = require("../build-datasets-manifest");

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
    const { entries, skipped } = scanForConsolidatedDatasets(tmpDir);
    expect(entries).toHaveLength(1);
    expect(entries[0].dataset_id).toBe("ds-foo");
    expect(entries[0].consolidated_path).toBe("foo.json");
    expect(skipped).toBe(0);
  });

  it("finds a .json.gz file and decompresses it", () => {
    writeGz("bar.json.gz", makeConsolidatedPayload({ dataset_id: "ds-bar" }));
    const { entries } = scanForConsolidatedDatasets(tmpDir);
    expect(entries).toHaveLength(1);
    expect(entries[0].dataset_id).toBe("ds-bar");
    expect(entries[0].consolidated_path).toBe("bar.json.gz");
  });

  it("descends into subdirectories", () => {
    write("consolidated/nested.json", makeConsolidatedPayload({ dataset_id: "ds-nested" }));
    const { entries } = scanForConsolidatedDatasets(tmpDir);
    expect(entries).toHaveLength(1);
    expect(entries[0].consolidated_path).toBe("consolidated/nested.json");
  });

  it("skips datasets.json without counting it as skipped", () => {
    write("datasets.json", []);
    const { entries, skipped } = scanForConsolidatedDatasets(tmpDir);
    expect(entries).toEqual([]);
    expect(skipped).toBe(0);
  });

  it("counts files that don't match the consolidated shape as skipped", () => {
    write("not-consolidated.json", { just: "a random object" });
    const { entries, skipped } = scanForConsolidatedDatasets(tmpDir);
    expect(entries).toEqual([]);
    expect(skipped).toBe(1);
  });

  it("counts malformed-JSON files as skipped and warns instead of throwing", () => {
    write("malformed.json", "not valid json");
    const consoleSpy = jest.spyOn(console, "warn").mockImplementation();
    const { entries, skipped } = scanForConsolidatedDatasets(tmpDir);
    expect(entries).toEqual([]);
    expect(skipped).toBe(1);
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("malformed.json"));
    consoleSpy.mockRestore();
  });

  it("does not follow symlinked directories (avoids cycles)", () => {
    // Real consolidated file inside a real subdir
    write("real/inside.json", makeConsolidatedPayload({ dataset_id: "ds-real" }));
    // A symlink at the root that points back at the root — would loop forever
    // if scan followed it.
    fs.symlinkSync(tmpDir, path.join(tmpDir, "loop"));
    const { entries } = scanForConsolidatedDatasets(tmpDir);
    expect(entries.map((e) => e.dataset_id)).toEqual(["ds-real"]);
  });
});

describe("detectCollisions", () => {
  it("returns [] for unique dataset_ids", () => {
    const entries = [
      { dataset_id: "a", consolidated_path: "a.json" },
      { dataset_id: "b", consolidated_path: "b.json" }
    ];
    expect(detectCollisions(entries)).toEqual([]);
  });

  it("returns one collision per duplicated id with all colliding paths", () => {
    const entries = [
      { dataset_id: "shared", consolidated_path: "first.json" },
      { dataset_id: "unique", consolidated_path: "lone.json" },
      { dataset_id: "shared", consolidated_path: "second.json" },
      { dataset_id: "shared", consolidated_path: "third.json" }
    ];
    const result = detectCollisions(entries);
    expect(result).toHaveLength(1);
    expect(result[0].dataset_id).toBe("shared");
    expect(result[0].paths).toEqual(["first.json", "second.json", "third.json"]);
  });
});

describe("buildManifest collision handling", () => {
  it("throws and does NOT write the manifest by default on collision", () => {
    write("a.json", makeConsolidatedPayload({ dataset_id: "ds-dup" }));
    write("b.json", makeConsolidatedPayload({ dataset_id: "ds-dup" }));

    expect(() => buildManifest(tmpDir)).toThrow(/dataset_id collision/);
    // Manifest is NOT written on failure — caller should re-run after fixing.
    expect(fs.existsSync(path.join(tmpDir, "datasets.json"))).toBe(false);
  });

  it("attaches the collision list to the thrown error", () => {
    write("a.json", makeConsolidatedPayload({ dataset_id: "ds-dup" }));
    write("b.json", makeConsolidatedPayload({ dataset_id: "ds-dup" }));

    let caught;
    try {
      buildManifest(tmpDir);
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeDefined();
    expect(caught.collisions).toHaveLength(1);
    expect(caught.collisions[0].dataset_id).toBe("ds-dup");
    expect(caught.collisions[0].paths.sort()).toEqual(["a.json", "b.json"]);
  });

  it("writes the manifest and returns the collision list when allowDuplicates is true", () => {
    write("a.json", makeConsolidatedPayload({ dataset_id: "ds-dup" }));
    write("b.json", makeConsolidatedPayload({ dataset_id: "ds-dup" }));

    const result = buildManifest(tmpDir, { allowDuplicates: true });
    expect(result.consolidated).toHaveLength(2);
    expect(result.collisions).toHaveLength(1);
    expect(result.collisions[0].dataset_id).toBe("ds-dup");

    const onDisk = JSON.parse(fs.readFileSync(path.join(tmpDir, "datasets.json"), "utf-8"));
    expect(onDisk).toHaveLength(2);
  });

  it("returns collisions: [] when ids are unique", () => {
    write("a.json", makeConsolidatedPayload({ dataset_id: "ds-a" }));
    write("b.json", makeConsolidatedPayload({ dataset_id: "ds-b" }));

    const result = buildManifest(tmpDir);
    expect(result.collisions).toEqual([]);
  });
});

describe("buildManifest (integration)", () => {
  it("overwrites the manifest from scratch on each run", () => {
    // Stale manifest with entries that no longer correspond to files on disk.
    write("datasets.json", [
      { dataset_id: "stale-1", name: "Stale legacy entry" },
      { dataset_id: "stale-consolidated", consolidated_path: "ghost.json" }
    ]);
    // The actual consolidated file on disk:
    write("real.json", makeConsolidatedPayload({ dataset_id: "real-consolidated" }));

    const result = buildManifest(tmpDir);

    expect(result.consolidated).toHaveLength(1);
    expect(result.consolidated[0].dataset_id).toBe("real-consolidated");

    // The on-disk manifest is just the fresh scan — stale entries are gone.
    const onDisk = JSON.parse(fs.readFileSync(path.join(tmpDir, "datasets.json"), "utf-8"));
    expect(onDisk).toHaveLength(1);
    expect(onDisk[0].dataset_id).toBe("real-consolidated");
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
