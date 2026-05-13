#!/usr/bin/env node
/* eslint no-console: off */
/**
 * Build a `datasets.json` manifest from the consolidated dataset files
 * present in a data directory.
 *
 * Walks the directory recursively, parses each consolidated olmsted-cli
 * file (`.json` or `.json.gz`, anything that isn't `datasets.json`,
 * `clones.*.json`, or `tree.*.json`), lifts the dataset metadata from
 * `data.datasets[0]`, and writes a fresh `datasets.json` with a
 * `consolidated_path` field pointing at each file.
 *
 * Pre-existing manifest entries WITHOUT a `consolidated_path` (i.e.
 * legacy split-format entries) are preserved. Pre-existing
 * consolidated entries are replaced by the fresh scan.
 *
 * Triggered automatically on `npm run start:local` (see server.js).
 * Can also be invoked directly:
 *
 *   node bin/build_datasets_manifest.js _data/server-snapshot/
 */

const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const MANIFEST_FILENAME = "datasets.json";

/**
 * Files that are NOT consolidated datasets and should be skipped.
 * Returns true if the filename looks like a consolidated dataset file.
 */
function isCandidateConsolidatedFile(name) {
  if (name === MANIFEST_FILENAME) return false;
  if (name.startsWith("clones.")) return false;
  if (name.startsWith("tree.")) return false;
  return name.endsWith(".json") || name.endsWith(".json.gz");
}

function readConsolidatedFile(filepath) {
  const buffer = fs.readFileSync(filepath);
  const text = filepath.endsWith(".gz") ? zlib.gunzipSync(buffer).toString("utf-8") : buffer.toString("utf-8");
  return JSON.parse(text);
}

function isConsolidatedShape(data) {
  return Boolean(
    data &&
    typeof data === "object" &&
    data.metadata &&
    Array.isArray(data.datasets) &&
    data.datasets.length > 0 &&
    data.clones &&
    Array.isArray(data.trees)
  );
}

/**
 * Walk `rootDir` and return manifest entries for each consolidated
 * dataset file found. Files that fail to parse or don't match the
 * consolidated shape are skipped with a warning.
 *
 * @param {string} rootDir - absolute path to the data dir
 * @returns {Array<Object>} manifest entries with consolidated_path set
 */
function scanForConsolidatedDatasets(rootDir) {
  const entries = [];

  function walk(dir, relPath) {
    for (const name of fs.readdirSync(dir)) {
      const full = path.join(dir, name);
      const rel = relPath ? path.posix.join(relPath, name) : name;
      const stat = fs.statSync(full);
      if (stat.isDirectory()) {
        walk(full, rel);
        continue;
      }
      if (!isCandidateConsolidatedFile(name)) continue;
      try {
        const data = readConsolidatedFile(full);
        if (!isConsolidatedShape(data)) continue;
        const ds = data.datasets[0];
        entries.push({ ...ds, consolidated_path: rel });
      } catch (err) {
        console.warn(`build_datasets_manifest: skipping ${rel}: ${err.message}`);
      }
    }
  }

  walk(rootDir, "");
  return entries;
}

/**
 * Read the existing manifest (if any) and return its split-format
 * entries (entries without a consolidated_path). Returns [] when the
 * manifest is missing or malformed.
 */
function loadExistingSplitEntries(manifestPath) {
  if (!fs.existsSync(manifestPath)) return [];
  try {
    const data = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
    if (!Array.isArray(data)) return [];
    return data.filter((entry) => entry && !entry.consolidated_path);
  } catch (err) {
    console.warn(`build_datasets_manifest: existing manifest is invalid, starting fresh (${err.message})`);
    return [];
  }
}

/**
 * Rebuild `datasets.json` in `dataDir`. Idempotent and non-destructive
 * for split-format entries.
 *
 * @param {string} dataDir
 * @returns {{ split: Array, consolidated: Array }} the two slices that
 *   ended up in the manifest
 */
function buildManifest(dataDir) {
  const manifestPath = path.join(dataDir, MANIFEST_FILENAME);
  const splitEntries = loadExistingSplitEntries(manifestPath);
  const consolidatedEntries = scanForConsolidatedDatasets(dataDir);
  const merged = [...splitEntries, ...consolidatedEntries];
  fs.writeFileSync(manifestPath, JSON.stringify(merged, null, 2) + "\n");
  return { split: splitEntries, consolidated: consolidatedEntries };
}

module.exports = {
  buildManifest,
  scanForConsolidatedDatasets,
  loadExistingSplitEntries,
  isCandidateConsolidatedFile,
  isConsolidatedShape
};

if (require.main === module) {
  const dataDir = process.argv[2];
  if (!dataDir) {
    console.error("Usage: build_datasets_manifest.js <data-dir>");
    process.exit(1);
  }
  if (!fs.existsSync(dataDir) || !fs.statSync(dataDir).isDirectory()) {
    console.error(`Not a directory: ${dataDir}`);
    process.exit(1);
  }
  const result = buildManifest(dataDir);
  console.log(
    `build_datasets_manifest: wrote ${result.split.length} split + ${result.consolidated.length} consolidated entries to ${path.join(dataDir, MANIFEST_FILENAME)}`
  );
}
