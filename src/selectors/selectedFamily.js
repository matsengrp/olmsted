import { createSelector, createSelectorCreator, defaultMemoize } from 'reselect';
import * as _ from 'lodash';

// The naming structure here needs to be cleaned up; 

// selector for clonal family record
export const getSelectedFamily = (state) => {
  return  _.find(state.availableClonalFamilies, {"ident": state.selectedFamily});
}

// selector for selected tree
const getSelectedReconstructionIdent = (state) => {
  return state.selectedReconstruction
}

// combine these to select out the actual selected reconstruction entity
export const getSelectedReconstruction = createSelector(
  [getSelectedFamily, getSelectedReconstructionIdent],
  (family, reconstructionIdent) => reconstructionIdent ?
    _.find(family.reconstructions, {"ident": reconstructionIdent}) :
    family.reconstructions[0])


// selector for sequence

const getSelectedSeq = (state) => state.selectedSeq


// computing mutations for tree node records relative to naive_seq

const getMutations = (naive_seq, tree) =>{
  var all_mutations = []
  // compute mutations for each node in the tree
  _.forEach(tree, (node) => {
    let mutations = []
    let seq = node.aa_seq;
    let seq_id = node.id;
    let is_naive = seq_id == 'naive';
    let pairs = _.toPairs(seq);
    // add mutation for each position deviating from the naive aa_seq
    _.forEach(pairs, (pair) => {
      let i = pair[0]
      let aa = pair[1]
      if (aa != naive_seq[i] ){
        // add a mutation for a sequence deviating from the naive
        mutations.push( { 'height': node.height, 'distance': node.distance,'length': node.length,'parent': node.parent,'seq_id': seq_id, 'position': i, 'mut_from': naive_seq[i], 'mut_to': aa })
      }
      else if(is_naive){
        // add a mutation for the naive so it shows up in the viz
        mutations.push( { 'height': 0, 'distance': node.distance,'length': node.length,'parent': node.parent,'seq_id': seq_id, 'position': i, 'mut_from': naive_seq[i], 'mut_to': aa })
      }
    });
    all_mutations = all_mutations.concat(mutations);    
  });

  return all_mutations
}


const followLineage = (asr_tree, leaf, naive) => {
  //lineage are seqs to go in the viz
  var lineage = [leaf];
  //this tracks unique intermediate nodes to be downloaded bewtween naive and leaf
  var uniq_int_nodes = [];

  var curr_node = leaf;
  var seq_counter = 1; //needed to set the viz height based on the number of seqs
  //Prioritize leaf and naive
  let taken_seqs = new Set([leaf.nt_seq, naive.nt_seq])
  while (curr_node.parent){
    let parent_id = curr_node.parent;
    let parent = _.find(asr_tree, {"id": parent_id});
    lineage.push(parent);
    // seeing many sequences near naive with no mutations,
    // (these sequences would be part of the lineage but not
    //  from the perspective of the mutations viz)
    // so check to make sure we are counting seqs with muts
    // for lineage viz scaling 
    if(curr_node.aa_seq!==naive.aa_seq){
      seq_counter++;
    }
    //Prioritize the seq closest to root if two are identical and make sure it isnt the same as leaf or naive
    if(parent.nt_seq !== curr_node.nt_seq && !taken_seqs.has(curr_node.nt_seq)){
      uniq_int_nodes.push(curr_node)
    }
    curr_node = parent;
  }
  //put the fasta seqs in order naive -> leaf
  let download_seqs = [naive]
  //this relies on node records having been added in postorder
  download_seqs = download_seqs.concat(_.reverse(uniq_int_nodes))
  download_seqs.push(leaf)
  return [lineage, download_seqs, seq_counter]
}

const uniqueFamilySeqs = (asr_tree) => {
  //this relies on node records having been added in postorder
  let seq_records = asr_tree.slice()
  //remove from a copy so that we dont loop through the whole thing several times filtering
  let naive = _.remove(seq_records, function(o) { return o.type == "root" })[0]
  let leaves = _.remove(seq_records, function(o) { return o.type == "leaf" })
  //seq_records should now just have internal nodes

  let taken_seqs = new Set([_.map(leaves, (leaf) => {leaf.nt_seq}).concat([naive.nt_seq])]) 
  var download_seqs = [];
  let uniq_int_nodes = _.filter(
                          _.uniqBy(
                              _.reverse(seq_records),
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
  return _.find(data, {"id": "naive"});
}

// tips mode 
const computeTipsData = (reconstruction) => { 
  let recon = _.clone(reconstruction)   //clone for assign by value
  if (recon["asr_tree"] && recon["asr_tree"].length > 0){
    let data = recon["asr_tree"].slice(0);
    let naive = findNaive(data);    
    data = _.filter(data, (o) => o.type == "root" || o.type == "leaf")
    let all_mutations = getMutations(naive.aa_seq, data)
    recon["tips_alignment"] = all_mutations;
    recon["download_unique_family_seqs"] = uniqueFamilySeqs(recon.asr_tree)
    return recon;
  }
  else{
    return recon;
  }
}

// lineage mode
const computeLineageData = (reconstruction, seq) => { 
  let recon = _.clone(reconstruction)   //clone for assign by value
  if (recon["asr_tree"] && recon["asr_tree"].length > 0 && !_.isEmpty(seq)){
    let data = recon["asr_tree"].slice(0);
    let naive = findNaive(data);
    let lineage_data = followLineage(data, seq, naive);
    let lineage = lineage_data[0]
    recon["download_lineage_seqs"] = lineage_data[1];
    recon["lineage_seq_counter"] = lineage_data[2];
    //reversing the postorder ordering of nodes for lineage mode
    data = _.reverse(lineage)  
    let all_mutations = getMutations(naive.aa_seq, data)
    recon["lineage_alignment"] = all_mutations;
    return recon;
  }
  else{
    return recon
  }
}

export const getTipsDataSelector = createSelector(
    [getSelectedReconstruction],
    (reconstruction) => {
      return computeTipsData(reconstruction);
    }
  )

export const getLineageDataSelector =  createSelector(
    [getSelectedReconstruction, getSelectedSeq],
    (reconstruction, seq) => {
      return computeLineageData(reconstruction, seq);
    }
  )

