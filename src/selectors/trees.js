import { createSelector, createSelectorCreator, defaultMemoize } from "reselect";
import * as _ from "lodash";
import * as clonalFamiliesSelectors from "./clonalFamilies";

// selector for selected tree
const getSelectedTreeIdent = (state) => state.trees.selectedTreeIdent;

export const getTreeFromCache = (cache, family, selectedIdent) => {
  const ident = selectedIdent
    || (
      _.find(_.values(family.trees), { downsampling_strategy: "seed_lineage" })
      || _.find(_.values(family.trees), { downsampling_strategy: "min_adcl" })
      || _.values(family.trees)[0]
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

export const getSelectedSeq = createSelector([getSelectedSeqId, getSelectedTree], (seq_id, tree) => _.find(tree.nodes, { sequence_id: seq_id }));

// computing mutations for tree node records relative to naive_seq

const createAlignment = (naive_seq, tree) => {
  let all_mutations = [];
  // compute mutations for each node in the tree
  _.forEach(tree, (node) => {
    const mutations = [];
    const seq = node.sequence_alignment_aa;
    const seq_id = node.sequence_id;
    const is_naive = node.type == "root";
    const pairs = _.toPairs(seq);
    // add mutation for each position deviating from the naive sequence_alignment_aa
    _.forEach(pairs, (pair) => {
      const i = pair[0];
      const aa = pair[1];
      if (aa != naive_seq[i]) {
        // add a mutation for a sequence deviating from the naive
        mutations.push({
          type: node.type,
          parent: node.parent,
          seq_id: seq_id,
          position: i,
          mut_from: naive_seq[i],
          mut_to: aa
        });
      } else if (is_naive) {
        // add a mutation for the naive so it shows up in the viz
        mutations.push({
          type: "naive",
          parent: node.parent,
          seq_id: seq_id,
          position: i,
          mut_from: naive_seq[i],
          mut_to: aa
        });
      }
    });
    all_mutations = all_mutations.concat(mutations);
  });

  return all_mutations;
};

const followLineage = (nodes, leaf, naive) => {
  // this tracks unique intermediate nodes to be downloaded bewtween naive and leaf
  let curr_node = leaf;
  const uniq_int_nodes = [];
  // Prioritize leaf and naive
  const taken_seqs = new Set([leaf.sequence_alignment, naive.sequence_alignment]);
  // Loop through the intermediate nodes to find unique sequences, keeping back mutations,
  // prioritizing the closest to naive in a series of duplicates
  while (curr_node.parent) {
    const parent_id = curr_node.parent;
    const parent = _.find(nodes, { sequence_id: parent_id });
    // Prioritize the seq closest to root if two are identical and make sure it isnt the same as leaf or naive
    if (parent.sequence_alignment !== curr_node.sequence_alignment && !taken_seqs.has(curr_node.sequence_alignment)) {
      uniq_int_nodes.push(curr_node);
    }
    curr_node = parent;
  }
  // put the lineage seqs in order naive -> leaf
  let lineage = [naive];
  // this relies on node records having been added in postorder
  lineage = lineage.concat(_.reverse(uniq_int_nodes));
  // add the leaf in question at the end
  lineage.push(leaf);
  return lineage;
};

const uniqueSeqs = (nodes) => {
  // this relies on node records having been added in postorder
  const seq_records = nodes.slice();
  // remove from a copy so that we dont loop through the whole thing several times filtering
  const naive = _.remove(seq_records, (o) => {
    return o.type == "root";
  })[0];
  const leaves = _.remove(seq_records, (o) => {
    return o.type == "leaf";
  });
  // seq_records should now just have internal nodes, reassign for readability
  const internal_nodes = seq_records;

  const taken_seqs = new Set([
    _.map(leaves, (leaf) => {
      leaf.sequence_alignment;
    }).concat([naive.sequence_alignment])
  ]);
  let download_seqs = [];
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

export const computeTreeData = (tree) => {
  tree = _.clone(tree); // clone for assign by value
  // TODO Remove! Quick hack to fix really funky lbr values on naive nodes
  tree.nodes = _.map(tree.nodes, (x) => x.parent == "inferred_naive" || x.sequence_id == "inferred_naive" ? dissoc(x, "lbr") : x);

  if (tree["nodes"] && tree["nodes"].length > 0) {
    let data = tree["nodes"].slice(0);
    const naive = findNaive(data);
    data = _.filter(data, (o) => o.type == "root" || o.type == "leaf");
    tree["leaves_count_incl_naive"] = data.length;
    const alignment = createAlignment(naive.sequence_alignment_aa, data);
    tree["tips_alignment"] = alignment;
    tree["download_unique_family_seqs"] = uniqueSeqs(tree.nodes);
    return tree;
  }

  return tree;
};

// Create an alignment for the lineage of a particular sequence from naive
// and find lineage sequences, removing repeat sequences but preserving back mutations.
const computeLineageData = (tree, seq) => {
  tree = _.clone(tree); // clone for assign by value
  if (tree["nodes"] && tree["nodes"].length > 0 && !_.isEmpty(seq)) {
    const data = tree["nodes"].slice(0);
    const naive = findNaive(data);
    const lineage = followLineage(data, seq, naive);
    tree["download_lineage_seqs"] = lineage;
    // Count unique aa sequences to set the height of the lineage viz accordingly
    tree["lineage_seq_counter"] = _.uniqBy(lineage, "sequence_alignment_aa").length;
    const alignment = createAlignment(naive.sequence_alignment_aa, lineage);
    tree["lineage_alignment"] = alignment;
    return tree;
  }

  return tree;
};

export const getTreeData = createSelector([getSelectedTree], computeTreeData);

export const getLineageData = createSelector([getSelectedTree, getSelectedSeq], computeLineageData);
