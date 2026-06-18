// @ts-check
/**
 * Synthetic dataset generator for performance testing.
 *
 * Produces a consolidated Olmsted JSON object (`{ metadata, datasets, clones,
 * trees }`) of a configurable family count — the same format the browser
 * uploader ingests (`FileProcessor.processConsolidatedFormat`) and the split
 * format is intentionally NOT used (it's being sunset).
 *
 * Rather than hand-build every required field, it AMPLIFIES a known-good golden
 * fixture: it cycles through that fixture's real clone/tree pairs, deep-clones
 * each with fresh unique IDs, and applies deterministic jitter to a couple of
 * numeric fields so the scatterplot has spread. This guarantees the synthetic
 * data carries every field the scatterplot/tree actually need, and stays valid
 * as the input contract evolves (the template is a real olmsted-cli output).
 *
 * Two independent size knobs:
 *   - numFamilies  — breadth: drives ingest + scatterplot.
 *   - nodesPerTree — depth: grows every tree to ~N nodes, to stress tree render
 *                    (the template's real trees are small, 4–30 nodes).
 *
 * Deterministic by construction (no RNG) so perf numbers are comparable across
 * runs at the same size.
 */

const fs = require("fs");
const path = require("path");

// Real olmsted-cli output (28 single-chain families) used as the amplification
// template. Single-chain so opened families render through the `name="tree"`
// path, matching what we measure.
const TEMPLATE_PATH = path.join(__dirname, "..", "e2e", "fixtures", "pcp-olmsted-golden.json");

/** Deterministic, well-spread index in [0, n) for step i (no RNG). */
function spreadIndex(i, n) {
  return ((i * 2654435761) >>> 0) % n;
}

/**
 * Grow a template tree's node set to ~`target` nodes by attaching re-IDed copies
 * of the template's real nodes under existing nodes. Produces a valid stratify
 * structure: exactly one root (parent null), every other node's `parent` points
 * at an earlier node (acyclic), and all node fields come from real data.
 *
 * The tree is rendered from `nodes` via a Vega `stratify` transform, not from
 * `newick` (newick only feeds the "Download Newick" button), so no newick is
 * regenerated here.
 *
 * @param {Object} tplTree - template tree (nodes as object or array)
 * @param {number} target - desired node count
 * @returns {Object} nodes keyed by sequence_id
 */
function growTree(tplTree, target) {
  const tplNodes = Array.isArray(tplTree.nodes) ? tplTree.nodes : Object.values(tplTree.nodes);
  const tplRoot = tplNodes.find((n) => !n.parent || n.type === "root") || tplNodes[0];
  const tplNonRoot = tplNodes.filter((n) => n !== tplRoot);

  const root = { ...JSON.parse(JSON.stringify(tplRoot)), sequence_id: "n0", parent: null, type: "root" };
  const ordered = [root];

  for (let i = 1; i < target; i++) {
    const parent = ordered[spreadIndex(i, ordered.length)];
    const tplNode = tplNonRoot.length ? tplNonRoot[i % tplNonRoot.length] : tplRoot;
    const node = { ...JSON.parse(JSON.stringify(tplNode)), sequence_id: `n${i}`, parent: parent.sequence_id, type: "leaf" };
    if (parent.type === "leaf") parent.type = "node"; // it now has a child
    ordered.push(node);
  }

  const nodes = {};
  for (const n of ordered) nodes[n.sequence_id] = n;
  return nodes;
}

/**
 * Build a consolidated Olmsted JSON dataset.
 * @param {number} numFamilies
 * @param {{ nodesPerTree?: number }} [opts] - if nodesPerTree is set, every tree
 *   is grown to ~that many nodes (otherwise template trees are used as-is).
 * @returns {{ dataset: object, datasetName: string, nodesPerTree: number|null }}
 */
function makeDataset(numFamilies = 500, opts = {}) {
  const nodesPerTree = opts.nodesPerTree || null;
  const tpl = JSON.parse(fs.readFileSync(TEMPLATE_PATH, "utf8"));
  const tplDatasetId = tpl.datasets[0].dataset_id;
  const tplClones = tpl.clones[tplDatasetId] || Object.values(tpl.clones)[0];
  const treeByCloneId = {};
  for (const t of tpl.trees) treeByCloneId[t.clone_id] = t;

  const sizeTag = nodesPerTree ? `${numFamilies}f-${nodesPerTree}n` : `${numFamilies}`;
  const datasetId = `perf-dataset-${sizeTag}`;
  const datasetName = `perf-${sizeTag}`;

  const clones = [];
  const trees = [];
  for (let i = 0; i < numFamilies; i++) {
    const baseClone = tplClones[i % tplClones.length];
    const baseTree = treeByCloneId[baseClone.clone_id] || tpl.trees[i % tpl.trees.length];

    const cloneId = `perf-clone-${i}`;
    const treeIdent = `perf-tree-ident-${i}`;
    const treeId = `perf-tree-${i}`;

    const clone = JSON.parse(JSON.stringify(baseClone));
    const tree = JSON.parse(JSON.stringify(baseTree));

    clone.clone_id = cloneId;
    clone.ident = `perf-clone-ident-${i}`;
    clone.dataset_id = datasetId;
    // Deterministic spread so the scatterplot isn't a single overplotted point.
    const frac = ((i * 7919) % 1000) / 1000; // 0..0.999, deterministic per index
    clone.mean_mut_freq = Number((0.002 + frac * 0.2).toFixed(6));
    clone.unique_seqs_count = 1 + ((i * 104729) % 200);
    clone.trees = [{ ident: treeIdent, clone_id: cloneId, tree_id: treeId, tree_name: treeId, newick: tree.newick }];

    if (nodesPerTree) tree.nodes = growTree(baseTree, nodesPerTree);
    tree.ident = treeIdent;
    tree.clone_id = cloneId;
    tree.tree_id = treeId;
    tree.tree_name = treeId;
    tree.dataset_id = datasetId;

    clones.push(clone);
    trees.push(tree);
  }

  const dataset = {
    ...tpl.datasets[0],
    dataset_id: datasetId,
    name: datasetName,
    clone_count: numFamilies
  };

  const consolidated = {
    metadata: { ...tpl.metadata, name: datasetName },
    datasets: [dataset],
    clones: { [datasetId]: clones },
    trees
  };

  return { dataset: consolidated, datasetName, nodesPerTree };
}

module.exports = { makeDataset };
