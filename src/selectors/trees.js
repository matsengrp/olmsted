import { createSelector } from "reselect";
import * as _ from "lodash";
import * as clonalFamiliesSelectors from "./clonalFamilies";

// Helper functions for chain-specific field access
const getSeqAlignmentAA = (node, chain = "heavy") => {
  if (chain === "light") {
    return node.sequence_alignment_light_aa || node.sequence_alignment_aa;
  }
  return node.sequence_alignment_aa;
};

const getSeqAlignment = (node, chain = "heavy") => {
  if (chain === "light") {
    return node.sequence_alignment_light || node.sequence_alignment;
  }
  return node.sequence_alignment;
};

// selector for selected tree
const getSelectedTreeIdent = (state) => state.trees.selectedTreeIdent;

// selector for selected chain
const getSelectedChain = (state) => state.clonalFamilies.selectedChain || "heavy";

export const getTreeFromCache = (cache, family, selectedIdent) => {
  const ident =
    selectedIdent ||
    (
      _.find(_.values(family.trees), { downsampling_strategy: "seed_lineage" }) ||
      _.find(_.values(family.trees), { downsampling_strategy: "min_adcl" }) ||
      _.values(family.trees)[0]
    ).ident;
  return cache[ident];
};

// combine these to select out the actual selected tree entity
export const getSelectedTree = createSelector(
  [(state) => state.trees.cache, clonalFamiliesSelectors.getSelectedFamily, getSelectedTreeIdent],
  getTreeFromCache
);

// selector for sequence

const getSelectedSeqId = (state) => state.clonalFamilies.selectedSeq;

export const getSelectedSeq = createSelector([getSelectedSeqId, getSelectedTree], (seq_id, tree) =>
  _.find(tree.nodes, { sequence_id: seq_id })
);

// computing mutations for tree node records relative to naive_seq

const createAlignment = (naive_seq, tree, chain = "heavy") => {
  let all_mutations = [];
  // Get the length of the naive sequence to determine alignment width
  const naive_length = _.isObject(naive_seq) ? Object.keys(naive_seq).length : (naive_seq ? naive_seq.length : 0);

  // compute mutations for each node in the tree
  _.forEach(tree, (node) => {
    const mutations = [];
    const seq = getSeqAlignmentAA(node, chain);
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
        mutations.push({
          type: node.type,
          parent: node.parent,
          seq_id: seq_id,
          position: i,
          mut_from: naive_aa,
          mut_to: aa
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

const followLineage = (nodes, leaf, naive, includeAllNodes = false, chain = "heavy") => {
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
    const taken_seqs = new Set([getSeqAlignment(leaf, chain), getSeqAlignment(naive, chain)]);
    lineage_nodes = [];

    // Filter to only nodes with unique sequences
    let prev_node = leaf;
    for (const node of all_lineage_nodes) {
      const nodeSeq = getSeqAlignment(node, chain);
      const prevSeq = getSeqAlignment(prev_node, chain);
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

const uniqueSeqs = (nodes, chain = "heavy") => {
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

  const taken_seqs = new Set([_.map(leaves, (leaf) => getSeqAlignment(leaf, chain)).concat([getSeqAlignment(naive, chain)])]);
  let download_seqs = [];
  // Group by sequence alignment for the selected chain
  const seqKey = chain === "light" ? "sequence_alignment_light" : "sequence_alignment";
  const uniq_int_nodes = _.filter(_.uniqBy(_.reverse(internal_nodes), seqKey), (node) => {
    return !taken_seqs.has(getSeqAlignment(node, chain));
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

export const computeTreeData = (tree, chain = "heavy") => {
  const treeData = _.clone(tree); // clone for assign by value
  // TODO Remove! Quick hack to fix really funky lbr values on naive nodes
  treeData.nodes = _.map(treeData.nodes, (x) =>
    x.parent === "inferred_naive" || x.sequence_id === "inferred_naive" ? dissoc(x, "lbr") : x
  );

  if (treeData["nodes"] && treeData["nodes"].length > 0) {
    let data = treeData["nodes"].slice(0);
    const naive = findNaive(data);
    data = _.filter(data, (o) => o.type === "root" || o.type === "leaf");
    treeData["leaves_count_incl_naive"] = data.length;
    // Use chain-specific sequence alignment for computing mutations
    const naiveSeqAA = getSeqAlignmentAA(naive, chain);
    const alignment = createAlignment(naiveSeqAA, data, chain);
    treeData["tips_alignment"] = alignment;
    treeData["download_unique_family_seqs"] = uniqueSeqs(treeData.nodes, chain);
    return treeData;
  }

  return treeData;
};

// Create an alignment for the lineage of a particular sequence from naive
// and find lineage sequences, removing repeat sequences but preserving back mutations.
const computeLineageData = (tree, seq, includeAllNodes = false, chain = "heavy") => {
  const treeData = _.clone(tree); // clone for assign by value
  if (treeData["nodes"] && treeData["nodes"].length > 0 && !_.isEmpty(seq)) {
    const data = treeData["nodes"].slice(0);
    const naive = findNaive(data);
    const lineage = followLineage(data, seq, naive, includeAllNodes, chain);
    treeData["download_lineage_seqs"] = lineage;
    // Use chain-specific sequence alignment for computing mutations
    const naiveSeqAA = getSeqAlignmentAA(naive, chain);
    const alignment = createAlignment(naiveSeqAA, lineage, chain);
    treeData["lineage_alignment"] = alignment;
    // Count sequences in the alignment to set the height of the lineage viz accordingly
    // This should be based on actual sequences in the lineage, not unique AA sequences
    treeData["lineage_seq_counter"] = lineage.length;
    return treeData;
  }

  return treeData;
};

export const getTreeData = createSelector(
  [getSelectedTree, getSelectedChain],
  (tree, chain) => computeTreeData(tree, chain)
);

export const getLineageData = createSelector(
  [getSelectedTree, getSelectedSeq, getSelectedChain],
  (tree, seq, chain) => computeLineageData(tree, seq, false, chain)
);

// Export the function for direct use with options
export const computeLineageDataWithOptions = (tree, seq, includeAllNodes, chain = "heavy") => {
  return computeLineageData(tree, seq, includeAllNodes, chain);
};

// Export getSelectedChain for use in components
export { getSelectedChain };
