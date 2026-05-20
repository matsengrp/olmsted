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
 * Fails on duplicate `dataset_id` across files — the client's IndexedDB
 * dedup logic would silently drop all but one of the colliding entries,
 * so we surface it loudly at build time instead. Pass `--allow-duplicates`
 * to downgrade to a warning and write the manifest anyway.
 *
 * Triggered automatically on `npm run start:local` (see server.js) with
 * `allowDuplicates: true` so a stale dev directory doesn't crash the
 * dev server — the collision is still logged.
 *
 * Direct invocation:
 *
 *   node bin/build_datasets_manifest.js _data/server-snapshot/
 *   node bin/build_datasets_manifest.js _data/server-snapshot/ --allow-duplicates
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
 * Group entries by dataset_id and return groups where more than one
 * entry shares an ID. Each collision is `{ dataset_id, paths }` so the
 * caller can render a clear error message.
 *
 * @param {Array<Object>} entries
 * @returns {Array<{dataset_id: string, paths: string[]}>}
 */
function detectCollisions(entries) {
  const groups = new Map();
  for (const entry of entries) {
    const id = entry.dataset_id;
    if (!groups.has(id)) groups.set(id, []);
    groups.get(id).push(entry);
  }
  const collisions = [];
  for (const [id, group] of groups) {
    if (group.length > 1) {
      collisions.push({ dataset_id: id, paths: group.map((e) => e.consolidated_path) });
    }
  }
  return collisions;
}

/**
 * Format collision groups as a multi-line string suitable for console
 * output. Renders one bullet per dataset_id with its colliding file
 * paths indented underneath.
 */
function formatCollisions(collisions) {
  return collisions
    .map((c) => `  ${c.dataset_id}\n${c.paths.map((p) => `    - ${p}`).join("\n")}`)
    .join("\n");
}

/**
 * Rebuild `datasets.json` in `dataDir` from scratch.
 *
 * @param {string} dataDir
 * @param {Object} [options]
 * @param {boolean} [options.allowDuplicates=false] - When false (the
 *   default), throws on dataset_id collisions and does NOT write the
 *   manifest. When true, writes the manifest and returns the collision
 *   list so the caller can warn.
 * @returns {{ consolidated: Array, skipped: number, collisions: Array }}
 */
function buildManifest(dataDir, { allowDuplicates = false } = {}) {
  const manifestPath = path.join(dataDir, MANIFEST_FILENAME);
  const { entries: consolidatedEntries, skipped } = scanForConsolidatedDatasets(dataDir);
  const collisions = detectCollisions(consolidatedEntries);
  if (collisions.length > 0 && !allowDuplicates) {
    const err = new Error(
      `dataset_id collision(s) in ${dataDir}:\n${formatCollisions(collisions)}\n\n` +
        "Each dataset_id must be unique across consolidated files. Either re-process " +
        "one of the colliding files through olmsted-cli to get a fresh namespaced ID " +
        "(post-#283), or rewrite the dataset_id manually. Pass --allow-duplicates to " +
        "write the manifest anyway (the client will silently drop all but one of each " +
        "colliding pair)."
    );
    err.collisions = collisions;
    throw err;
  }
  fs.writeFileSync(manifestPath, JSON.stringify(consolidatedEntries, null, 2) + "\n");
  return { consolidated: consolidatedEntries, skipped, collisions };
}

module.exports = {
  buildManifest,
  scanForConsolidatedDatasets,
  detectCollisions,
  formatCollisions,
  isCandidateConsolidatedFile,
  isConsolidatedShape
};

if (require.main === module) {
  const args = process.argv.slice(2);
  const allowDuplicates = args.includes("--allow-duplicates");
  const positional = args.filter((a) => !a.startsWith("--"));
  const dataDir = positional[0];

  if (!dataDir) {
    console.error("Usage: build_datasets_manifest.js <data-dir> [--allow-duplicates]");
    process.exit(1);
  }
  if (!fs.existsSync(dataDir) || !fs.statSync(dataDir).isDirectory()) {
    console.error(`Not a directory: ${dataDir}`);
    process.exit(1);
  }

  let result;
  try {
    result = buildManifest(dataDir, { allowDuplicates });
  } catch (err) {
    if (err.collisions) {
      console.error(`build_datasets_manifest: ERROR — ${err.message}`);
      process.exit(2);
    }
    throw err;
  }

  if (result.collisions.length > 0) {
    console.warn(
      `build_datasets_manifest: WARNING — ${result.collisions.length} dataset_id collision(s) (writing anyway because --allow-duplicates):`
    );
    console.warn(formatCollisions(result.collisions));
  }

  const skippedSuffix = result.skipped > 0 ? ` (${result.skipped} file(s) skipped — see warnings above)` : "";
  console.log(
    `build_datasets_manifest: wrote ${result.consolidated.length} consolidated entries to ${path.join(dataDir, MANIFEST_FILENAME)}${skippedSuffix}`
  );
}
