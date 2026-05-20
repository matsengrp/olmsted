#!/usr/bin/env node
/* eslint no-console: off */
/**
 * Build a `datasets.json` manifest from the consolidated dataset files
 * present in a data directory.
 *
 * Walks the directory recursively, parses each consolidated olmsted-cli
 * file (`.json` or `.json.gz`, anything that isn't `datasets.json`),
 * lifts the dataset metadata from `data.datasets[0]`, and writes a
 * fresh `datasets.json` with a `consolidated_path` field pointing at
 * each file.
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
 * Returns true if the filename looks like a consolidated dataset file.
 * `isConsolidatedShape` enforces correctness after parsing, so this
 * is just a cheap filter to avoid opening the manifest itself.
 */
function isCandidateConsolidatedFile(name) {
  if (name === MANIFEST_FILENAME) return false;
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
 * consolidated shape are skipped with a warning; the count of skipped
 * files is returned alongside the entries so the caller can surface it
 * in startup logs.
 *
 * Symlinks (file or directory) are deliberately not followed —
 * `withFileTypes: true` causes Dirent.isDirectory() to return false for
 * symlinks, so a cyclic or runaway symlink can't trap the scan.
 *
 * @param {string} rootDir - absolute path to the data dir
 * @returns {{ entries: Array<Object>, skipped: number }}
 */
function scanForConsolidatedDatasets(rootDir) {
  const entries = [];
  let skipped = 0;

  function walk(dir, relPath) {
    for (const dirent of fs.readdirSync(dir, { withFileTypes: true })) {
      const name = dirent.name;
      const full = path.join(dir, name);
      const rel = relPath ? path.posix.join(relPath, name) : name;
      if (dirent.isDirectory()) {
        walk(full, rel);
        continue;
      }
      if (!dirent.isFile()) continue; // skip symlinks, devices, etc.
      if (!isCandidateConsolidatedFile(name)) continue;
      try {
        const data = readConsolidatedFile(full);
        if (!isConsolidatedShape(data)) {
          skipped += 1;
          continue;
        }
        const ds = data.datasets[0];
        entries.push({ ...ds, consolidated_path: rel });
      } catch (err) {
        skipped += 1;
        console.warn(`build_datasets_manifest: skipping ${rel}: ${err.message}`);
      }
    }
  }

  walk(rootDir, "");
  return { entries, skipped };
}

/**
 * Rebuild `datasets.json` in `dataDir` from scratch.
 *
 * @param {string} dataDir
 * @returns {{ consolidated: Array, skipped: number }}
 *   the consolidated entries written to the manifest, plus a count of
 *   files that looked consolidated but failed to parse or didn't match
 *   the shape
 */
function buildManifest(dataDir) {
  const manifestPath = path.join(dataDir, MANIFEST_FILENAME);
  const { entries: consolidatedEntries, skipped } = scanForConsolidatedDatasets(dataDir);
  fs.writeFileSync(manifestPath, JSON.stringify(consolidatedEntries, null, 2) + "\n");
  return { consolidated: consolidatedEntries, skipped };
}

module.exports = {
  buildManifest,
  scanForConsolidatedDatasets,
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
  const skippedSuffix = result.skipped > 0 ? ` (${result.skipped} file(s) skipped — see warnings above)` : "";
  console.log(
    `build_datasets_manifest: wrote ${result.consolidated.length} consolidated entries to ${path.join(dataDir, MANIFEST_FILENAME)}${skippedSuffix}`
  );
}
