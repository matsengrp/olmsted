import { createSelector, createSelectorCreator, defaultMemoize } from 'reselect';
import { getAvailableClonalFamilies } from './clonalFamilies';
import * as _ from 'lodash';

// The naming structure here needs to be cleaned up; 

// selector for selected family ident
const getSelectedFamilyIdent = (state) => state.clonalFamilies.selectedFamily

// selector for clonal family record
export const getSelectedFamily = createSelector(
  [getAvailableClonalFamilies, getSelectedFamilyIdent],
  (availableClonalFamilies, selectedIdent) =>  _.find(availableClonalFamilies, {"ident": selectedIdent})
)

// selector for selected tree
const getSelectedReconstructionIdent = (state) =>
  state.clonalFamilies.selectedReconstruction

const defaultReconstruction = (reconstructions) =>
  // If there is a seed lineage tree, we take that first (see #70), otherwise min adcl, otherwise first as last resort
  _.find(reconstructions, {prune_strategy: "seed_lineage"}) || _.find(reconstructions, {prune_strategy: "min_adcl"}) || reconstructions[0]

export const findReconstruction = (family, reconstructionIdent) => reconstructionIdent ?
                                                            _.find(family.reconstructions, {ident: reconstructionIdent}) :
                                                            defaultReconstruction(family.reconstructions)

// combine these to select out the actual selected reconstruction entity
export const getSelectedReconstruction = createSelector(
  [getSelectedFamily, getSelectedReconstructionIdent],
  (family, reconstructionIdent) => findReconstruction(family, reconstructionIdent)
)


// selector for sequence
 
const getSelectedSeqId = (state) => state.clonalFamilies.selectedSeq

export const getSelectedSeq = createSelector(
  [getSelectedSeqId, getSelectedReconstruction],
  (seq_id, recon) => _.find(recon.asr_tree, {"id": seq_id})
)

// computing mutations for tree node records relative to naive_seq

const createAlignment = (naive_seq, tree) => {
  var all_mutations = []
  // compute mutations for each node in the tree
  _.forEach(tree, (node) => {
    let mutations = []
    let seq = node.aa_seq;
    let seq_id = node.id;
    let is_naive = node.type == 'root';
    let pairs = _.toPairs(seq);
    // add mutation for each position deviating from the naive aa_seq
    _.forEach(pairs, (pair) => {
      let i = pair[0]
      let aa = pair[1]
      if (aa != naive_seq[i] ){
        // add a mutation for a sequence deviating from the naive
        mutations.push( { 'height': node.height, 'type': node.type,'parent': node.parent,'seq_id': seq_id, 'position': i, 'mut_from': naive_seq[i], 'mut_to': aa })
      }
      else if(is_naive){
        // add a mutation for the naive so it shows up in the viz
        mutations.push( { 'height': 0, 'type': 'naive','parent': node.parent,'seq_id': seq_id, 'position': i, 'mut_from': naive_seq[i], 'mut_to': aa })
      }
    });
    all_mutations = all_mutations.concat(mutations);    
  });

  return all_mutations
}


const followLineage = (asr_tree, leaf, naive) => {
  // this tracks unique intermediate nodes to be downloaded bewtween naive and leaf
  var curr_node = leaf;
  var uniq_int_nodes = [];
  // Prioritize leaf and naive
  let taken_seqs = new Set([leaf.nt_seq, naive.nt_seq])
  // Loop through the intermediate nodes to find unique sequences, keeping back mutations,
  // prioritizing the closest to naive in a series of duplicates
  while (curr_node.parent){
    let parent_id = curr_node.parent;
    let parent = _.find(asr_tree, {"id": parent_id});
    //Prioritize the seq closest to root if two are identical and make sure it isnt the same as leaf or naive
    if(parent.nt_seq !== curr_node.nt_seq && !taken_seqs.has(curr_node.nt_seq)){
      uniq_int_nodes.push(curr_node)
    }
    curr_node = parent;
  }
  //put the lineage seqs in order naive -> leaf
  let lineage = [naive]
  //this relies on node records having been added in postorder
  lineage = lineage.concat(_.reverse(uniq_int_nodes))
  //add the leaf in question at the end
  lineage.push(leaf)
  return lineage
}

const uniqueSeqs = (asr_tree) => {
  //this relies on node records having been added in postorder
  let seq_records = asr_tree.slice()
  //remove from a copy so that we dont loop through the whole thing several times filtering
  let naive = _.remove(seq_records, function(o) { return o.type == "root" })[0]
  let leaves = _.remove(seq_records, function(o) { return o.type == "leaf" })
  //seq_records should now just have internal nodes, reassign for readability
  let internal_nodes = seq_records

  let taken_seqs = new Set([_.map(leaves, (leaf) => {leaf.nt_seq}).concat([naive.nt_seq])]) 
  var download_seqs = [];
  let uniq_int_nodes = _.filter(
                          _.uniqBy(
                              _.reverse(internal_nodes),
                              'nt_seq'
                          ),
                          function(node) {return !taken_seqs.has(node.nt_seq)}
                       )

  download_seqs.push(naive)
  download_seqs = download_seqs.concat(uniq_int_nodes)
  download_seqs = download_seqs.concat(leaves)

  return download_seqs
}

const findNaive = (data) => {
  return _.find(data, {"type": "root"});
}

// Create an alignment for naive + all of the leaves of the tree (reconstruction)
// and find unique set of sequences (giving preference to leaves, naive, and duplicate
// internal nodes that are closer to naive)
const computeReconstructionData = (reconstruction) => { 
  let recon = _.clone(reconstruction)   //clone for assign by value
  if (recon["asr_tree"] && recon["asr_tree"].length > 0){
    let data = recon["asr_tree"].slice(0);
    let naive = findNaive(data);    
    data = _.filter(data, (o) => o.type == "root" || o.type == "leaf")
    recon["leaves_count_incl_naive"] = data.length;
    let alignment = createAlignment(naive.aa_seq, data)
    recon["tips_alignment"] = alignment;
    recon["download_unique_family_seqs"] = uniqueSeqs(recon.asr_tree)
    return recon;
  }
  else{
    return recon;
  }
}

// Create an alignment for the lineage of a particular sequence from naive
// and find lineage sequences, removing repeat sequences but preserving back mutations.
const computeLineageData = (reconstruction, seq) => { 
  let recon = _.clone(reconstruction)   //clone for assign by value
  if (recon["asr_tree"] && recon["asr_tree"].length > 0 && !_.isEmpty(seq)){
    let data = recon["asr_tree"].slice(0);
    let naive = findNaive(data);
    let lineage = followLineage(data, seq, naive);
    recon["download_lineage_seqs"] = lineage;
    //Count unique aa sequences to set the height of the lineage viz accordingly
    recon["lineage_seq_counter"] = _.uniqBy(lineage, "aa_seq").length;
    let alignment = createAlignment(naive.aa_seq, lineage)
    recon["lineage_alignment"] = alignment;
    return recon;
  }
  else{
    return recon
  }
}

export const getReconstructionData = createSelector(
    [getSelectedReconstruction],
    (reconstruction) => {
      return computeReconstructionData(reconstruction);
    }
  )

export const getLineageData =  createSelector(
    [getSelectedReconstruction, getSelectedSeq],
    (reconstruction, seq) => {
      return computeLineageData(reconstruction, seq);
    }
  )

