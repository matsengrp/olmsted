import { createSelector } from "reselect";
import * as _ from "lodash";
import * as clonalFamiliesSelectors from "./clonalFamilies";

// selector for selected tree
const getSelectedTreeIdent = (state) => state.trees.selectedTreeIdent;

export const getTreeFromCache = (cache, family, selectedIdent) => {
  if (selectedIdent) {
    return cache[selectedIdent];
  }

  // If the clone has embedded tree references, use them with preferred strategy ordering
  if (family.trees && _.values(family.trees).length > 0) {
    const ident = (
      _.find(_.values(family.trees), { downsampling_strategy: "seed_lineage" }) ||
      _.find(_.values(family.trees), { downsampling_strategy: "min_adcl" }) ||
      _.values(family.trees)[0]
    ).ident;
    return cache[ident];
  }

  // Fallback: find a cached tree whose clone_id matches this family
  const cloneId = family.clone_id || family.ident;
  return _.find(_.values(cache), { clone_id: cloneId });
};

// combine these to select out the actual selected tree entity
export const getSelectedTree = createSelector(
  [(state) => state.trees.cache, clonalFamiliesSelectors.getSelectedFamily, getSelectedTreeIdent],
  getTreeFromCache
);

// selector for sequence

const getSelectedSeqId = (state) => state.clonalFamilies.selectedSeq;

export const getSelectedSeq = createSelector([getSelectedSeqId, getSelectedTree], (seq_id, tree) => {
  // Return null if tree is not loaded yet or doesn't have nodes
  if (!tree || !tree.nodes) {
    return null;
  }
  return _.find(tree.nodes, { sequence_id: seq_id });
});

// computing mutations for tree node records relative to naive_seq

const createAlignment = (naive_seq, tree) => {
  let all_mutations = [];
  // Get the length of the naive sequence to determine alignment width
  const naive_length = _.isObject(naive_seq) ? Object.keys(naive_seq).length : naive_seq ? naive_seq.length : 0;

  // compute mutations for each node in the tree
  _.forEach(tree, (node) => {
    const mutations = [];
    const seq = node.sequence_alignment_aa;
    const seq_id = node.sequence_id;
    const is_naive = node.type === "root";

    // Iterate over ALL positions in the naive sequence (0 to naive_length)
    // This ensures the alignment table includes all positions, even if some nodes are shorter
    for (let i = 0; i < naive_length; i++) {
      const aa = seq ? seq[i] : undefined;
      const naive_aa = naive_seq[i];

      if (is_naive) {
        // CRITICAL: For naive sequence, ALWAYS add an entry at EVERY position
        // This ensures the x-axis extends to the full length of the naive sequence
        // even if there are no mutations at the end positions
        mutations.push({
          type: "naive",
          parent: node.parent,
          seq_id: seq_id,
          position: i,
          mut_from: naive_aa,
          mut_to: naive_aa // naive sequence shows its own AA
        });
      } else if (aa !== undefined && aa !== naive_aa) {
        // Mutation: sequence deviates from naive
        const surpriseData = node.surprise_mutations?.find((m) => m.site === i);
        mutations.push({
          type: node.type,
          parent: node.parent,
          seq_id: seq_id,
          position: i,
          mut_from: naive_aa,
          mut_to: aa,
          surprise_mutsel: surpriseData?.surprise_mutsel ?? null,
          surprise_neutral: surpriseData?.surprise_neutral ?? null,
          selection_contribution: surpriseData?.selection_contribution ?? null,
          region: surpriseData?.region ?? null
        });
      }
    }

    // CRITICAL: If a non-naive sequence has NO mutations (empty mutations array),
    // add a placeholder entry so it still appears in the y-scale domain
    // This ensures every sequence gets a row in the alignment, even with zero mutations
    if (mutations.length === 0 && !is_naive) {
      mutations.push({
        type: node.type,
        parent: node.parent,
        seq_id: seq_id,
        position: null, // null position = placeholder, won't render a mark
        mut_from: null,
        mut_to: null
      });
    }

    all_mutations = all_mutations.concat(mutations);
  });

  return all_mutations;
};

const followLineage = (nodes, leaf, naive, includeAllNodes = false) => {
  // this tracks unique intermediate nodes to be downloaded bewtween naive and leaf
  let curr_node = leaf;
  const all_lineage_nodes = [];

  // Walk from leaf up to naive, collecting all nodes in the path
  while (curr_node && curr_node.sequence_id !== naive.sequence_id) {
    all_lineage_nodes.push(curr_node);
    if (curr_node.parent) {
      const parent_id = curr_node.parent;
      curr_node = _.find(nodes, { sequence_id: parent_id });
    } else {
      break;
    }
  }

  // Remove the leaf from the list (we'll add it back at the end)
  all_lineage_nodes.shift();

  let lineage_nodes;
  if (includeAllNodes) {
    // Include all internal nodes in the lineage path, regardless of mutations
    lineage_nodes = all_lineage_nodes;
  } else {
    // Original logic: only include nodes with mutations (different sequences)
    const taken_seqs = new Set([leaf.sequence_alignment, naive.sequence_alignment]);
    lineage_nodes = [];

    // Filter to only nodes with unique sequences
    let prev_node = leaf;
    for (const node of all_lineage_nodes) {
      const nodeSeq = node.sequence_alignment;
      const prevSeq = prev_node.sequence_alignment;
      if (nodeSeq !== prevSeq && !taken_seqs.has(nodeSeq)) {
        lineage_nodes.push(node);
        taken_seqs.add(nodeSeq);
      }
      prev_node = node;
    }
  }

  // Build final lineage in order: naive -> intermediates -> leaf
  let lineage = [naive];
  // Reverse because we collected from leaf to naive
  lineage = lineage.concat(_.reverse(lineage_nodes));
  // Add the leaf at the end
  lineage.push(leaf);
  return lineage;
};

const uniqueSeqs = (nodes) => {
  // this relies on node records having been added in postorder
  const seq_records = nodes.slice();
  // remove from a copy so that we dont loop through the whole thing several times filtering
  const naive = _.remove(seq_records, (o) => {
    return o.type === "root";
  })[0];
  const leaves = _.remove(seq_records, (o) => {
    return o.type === "leaf";
  });
  // seq_records should now just have internal nodes, reassign for readability
  const internal_nodes = seq_records;

  const taken_seqs = new Set([_.map(leaves, (leaf) => leaf.sequence_alignment).concat([naive.sequence_alignment])]);
  let download_seqs = [];
  // Group by sequence alignment
  const uniq_int_nodes = _.filter(_.uniqBy(_.reverse(internal_nodes), "sequence_alignment"), (node) => {
    return !taken_seqs.has(node.sequence_alignment);
  });

  download_seqs.push(naive);
  download_seqs = download_seqs.concat(uniq_int_nodes);
  download_seqs = download_seqs.concat(leaves);

  return download_seqs;
};

const findNaive = (data) => {
  return _.find(data, { type: "root" });
};

// Create an alignment for naive + all of the leaves of the tree
// and find unique set of sequences (giving preference to leaves, naive, and duplicate
// internal nodes that are closer to naive)

const dissoc = (d, key) => {
  const newD = _.clone(d);
  newD[key] = undefined;
  return newD;
};

/**
 * Build a consensus sequence from multiple sequences by majority vote at each position.
 * Gaps and missing positions use the most common character at that position.
 *
 * @param {string[]} sequences - Array of sequence strings
 * @returns {string} Consensus sequence
 */
const buildConsensus = (sequences) => {
  const validSeqs = sequences.filter((s) => s && s.length > 0);
  if (validSeqs.length === 0) return "";
  if (validSeqs.length === 1) return validSeqs[0];

  const maxLen = Math.max(...validSeqs.map((s) => s.length));
  let consensus = "";
  for (let i = 0; i < maxLen; i++) {
    const counts = {};
    for (const seq of validSeqs) {
      const ch = i < seq.length ? seq[i] : "-";
      counts[ch] = (counts[ch] || 0) + 1;
    }
    // Pick the most common character at this position
    let bestChar = "-";
    let bestCount = 0;
    for (const [ch, count] of Object.entries(counts)) {
      if (count > bestCount) {
        bestChar = ch;
        bestCount = count;
      }
    }
    consensus += bestChar;
  }
  return consensus;
};

const SYNTHETIC_ROOT_ID = "__synthetic_root__";

/**
 * Ensure the tree has exactly one root for Vega's stratify transform.
 * Returns { nodes, modification } where modification is null if no change
 * was needed, or a description string for data_modifications metadata.
 *
 * Handles:
 * 1. Single root with empty "naive" duplicate → removes the placeholder
 * 2. Forest (multiple disconnected subtrees) → creates a synthetic root
 *    with consensus sequences and re-parents all subtree roots to it
 */
const ensureSingleRoot = (nodes) => {
  const roots = nodes.filter((n) => !n.parent);
  if (roots.length <= 1) return { nodes, modification: null };

  // Separate empty placeholders from sequenced roots
  const sequencedRoots = roots.filter((n) => n.sequence_alignment);
  const emptyRoots = roots.filter((n) => !n.sequence_alignment);

  // Case 1: single sequenced root + empty placeholder(s) → just remove empties
  if (sequencedRoots.length === 1 && emptyRoots.length > 0) {
    const emptyIds = new Set(emptyRoots.map((n) => n.sequence_id));
    return {
      nodes: nodes.filter((n) => !emptyIds.has(n.sequence_id)),
      modification: `Removed ${emptyRoots.length} empty root placeholder(s): ${emptyRoots.map((n) => n.sequence_id).join(", ")}`
    };
  }

  // Case 2: forest — create synthetic root with consensus sequences
  const dnaSeqs = sequencedRoots.map((n) => n.sequence_alignment).filter(Boolean);
  const aaSeqs = sequencedRoots.map((n) => n.sequence_alignment_aa).filter(Boolean);

  const syntheticRoot = {
    sequence_id: SYNTHETIC_ROOT_ID,
    type: "root",
    parent: null,
    sequence_alignment: buildConsensus(dnaSeqs),
    sequence_alignment_aa: buildConsensus(aaSeqs),
    distance: null,
    length: null,
    multiplicity: 0,
    cluster_multiplicity: 0,
    lbi: null,
    lbr: null,
    affinity: null,
    timepoint_multiplicities: []
  };

  // Re-parent all original roots (including empty placeholders) to synthetic root
  // Then filter out empty placeholders since they add no value
  const emptyIds = new Set(emptyRoots.map((n) => n.sequence_id));
  const modifiedNodes = nodes
    .filter((n) => !emptyIds.has(n.sequence_id))
    .map((n) => {
      if (!n.parent) {
        return { ...n, parent: SYNTHETIC_ROOT_ID };
      }
      return n;
    });

  return {
    nodes: [syntheticRoot, ...modifiedNodes],
    modification:
      `Created synthetic root to join forest of ${sequencedRoots.length} disconnected subtree roots` +
      (emptyRoots.length > 0 ? `; removed ${emptyRoots.length} empty placeholder(s)` : "")
  };
};

/**
 * Normalize tree nodes: strip lbr from naive nodes and ensure a single root.
 * Shared by computeTreeData and computeLineageData to avoid duplication.
 *
 * @param {Object[]} nodes - Array of tree node objects
 * @returns {{ nodes: Object[], modification: string|null }} Normalized nodes and optional modification description
 */
const normalizeTreeNodes = (nodes) => {
  const normalized = _.map(nodes, (x) =>
    x.parent === "inferred_naive" || x.sequence_id === "inferred_naive" ? dissoc(x, "lbr") : x
  );
  const rootResult = ensureSingleRoot(normalized);
  return { nodes: rootResult.nodes, modification: rootResult.modification };
};

export const computeTreeData = (tree) => {
  // Return empty object if tree is null or undefined
  if (!tree) {
    return {};
  }

  const treeData = _.clone(tree); // clone for assign by value
  if (treeData.nodes) {
    const normalized = normalizeTreeNodes(treeData.nodes);
    treeData.nodes = normalized.nodes;
    if (normalized.modification) {
      treeData.data_modifications = treeData.data_modifications || [];
      treeData.data_modifications.push(normalized.modification);
    }
  }

  // Compute node depth (edges from root) — done on full tree before any filtering
  if (treeData.nodes && treeData.nodes.length > 0) {
    const childrenMap = {};
    let rootId = null;
    for (const node of treeData.nodes) {
      if (!node.parent) {
        rootId = node.sequence_id;
      } else {
        if (!childrenMap[node.parent]) childrenMap[node.parent] = [];
        childrenMap[node.parent].push(node.sequence_id);
      }
    }
    if (rootId) {
      const depthMap = {};
      const queue = [[rootId, 0]];
      while (queue.length > 0) {
        const [nodeId, d] = queue.shift();
        depthMap[nodeId] = d;
        for (const childId of childrenMap[nodeId] || []) {
          queue.push([childId, d + 1]);
        }
      }
      treeData.nodes = treeData.nodes.map((n) =>
        depthMap[n.sequence_id] !== undefined ? { ...n, node_depth: depthMap[n.sequence_id] } : n
      );
    }
  }

  if (treeData["nodes"] && treeData["nodes"].length > 0) {
    let data = treeData["nodes"].slice(0);
    const naive = findNaive(data);

    // Guard: if no root node or root lacks sequence data, mark tree as incomplete
    if (!naive || !naive.sequence_alignment_aa) {
      treeData.nodes = { error: "Tree has no root node with sequence alignment" };
      return treeData;
    }

    data = _.filter(data, (o) => o.type === "root" || o.type === "leaf");
    treeData["leaves_count_incl_naive"] = data.length;
    // Use the tree's own sequence alignment for computing mutations
    const naiveSeqAA = naive.sequence_alignment_aa;
    const alignment = createAlignment(naiveSeqAA, data);
    treeData["tips_alignment"] = alignment;
    treeData["download_unique_family_seqs"] = uniqueSeqs(treeData.nodes);
    return treeData;
  }

  return treeData;
};

// Create an alignment for the lineage of a particular sequence from naive
// and find lineage sequences, removing repeat sequences but preserving back mutations.
const computeLineageData = (tree, seq, includeAllNodes = false) => {
  // Return empty object if tree is null or undefined
  if (!tree) {
    return {};
  }

  const treeData = _.clone(tree); // clone for assign by value

  // Apply same root normalization as computeTreeData
  if (treeData.nodes) {
    const normalized = normalizeTreeNodes(treeData.nodes);
    treeData.nodes = normalized.nodes;
  }

  if (treeData["nodes"] && treeData["nodes"].length > 0 && !_.isEmpty(seq)) {
    const data = treeData["nodes"].slice(0);
    const naive = findNaive(data);
    const lineage = followLineage(data, seq, naive, includeAllNodes);
    treeData["download_lineage_seqs"] = lineage;
    // Use the tree's own sequence alignment for computing mutations
    const naiveSeqAA = naive.sequence_alignment_aa;
    const alignment = createAlignment(naiveSeqAA, lineage);
    treeData["lineage_alignment"] = alignment;
    // Count sequences in the alignment to set the height of the lineage viz accordingly
    // This should be based on actual sequences in the lineage, not unique AA sequences
    treeData["lineage_seq_counter"] = lineage.length;
    return treeData;
  }

  return treeData;
};

export const getTreeData = createSelector([getSelectedTree], (tree) => computeTreeData(tree));

export const getLineageData = createSelector([getSelectedTree, getSelectedSeq], (tree, seq) =>
  computeLineageData(tree, seq, false)
);

// Export the function for direct use with options
export const computeLineageDataWithOptions = (tree, seq, includeAllNodes) => {
  return computeLineageData(tree, seq, includeAllNodes);
};
