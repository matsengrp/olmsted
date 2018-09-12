import { createSelector } from 'reselect';
import * as _ from 'lodash';

const getSelectedFamily = (state) => {
  return  _.find(state.availableClonalFamilies, {"ident": state.selectedFamily});
}

const getSelectedSeq = (state) => state.selectedSeq

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

const followLineage = (asr_tree, leaf, naive_seq) => {
  var lineage = [leaf];
  var curr_node = leaf;
  var seq_counter = 1; //needed to set the viz height based on the number of seqs
  while (curr_node.parent){
    let parent_id = curr_node.parent;
    let parent = _.find(asr_tree, {"id": parent_id});
    lineage.push(parent);
    curr_node = parent;
    // seeing many sequences near naive with no mutations,
    // so check to make sure we are counting seqs with muts
    // for lineage viz scaling
    if(curr_node.aa_seq!==naive_seq){
      seq_counter++;
    }
  }
  return [lineage, seq_counter]
}

const computeSelectedFamilyData = (family, seq) => {  
  if (family["asr_tree"] && family["asr_tree"].length > 0){
    let data = family["asr_tree"].slice(0);
    var mode_key;
    let naive = _.find(data, {"id": "naive"});
    let naive_seq = naive.aa_seq;
    // lineage mode
    if (!_.isEmpty(seq)){
      let lineage_data = followLineage(data, seq, naive_seq);
      let lineage = lineage_data[0]
      family["lineage_seq_counter"] = lineage_data[1];
      //reversing the postorder ordering of nodes for lineage mode
      data = _.reverse(lineage)
      mode_key = "lineage_alignment";
    }
    // tips mode
    else {   
      data = _.filter(data, function(o) { return o.type == "root" || o.type == "leaf"; })
      mode_key = "tips_alignment";
    }
    
    let all_mutations = getMutations(naive_seq, data)
    family[mode_key] = all_mutations;
    return family;
  }
  else{
    return family
  }
}

// lineage mode works like this: 
// We have a slice of store that is "selectedSeq"
//        if it is empty:
//          then we do tips mode
//        if it is not:
//          then we use it for lineage mode
//        *just means we have to reset it to null when we want to go back to tips mode 
//        (this problem already exists in the scope of the tree for selected family)
//        below we could pass leaf in to the selector from a state getter on "selectedSeq"
const getSelectedFamilySelector = () => {

  return createSelector(
    [getSelectedFamily, getSelectedSeq],
    (family, seq) => {
      return computeSelectedFamilyData(family, seq);
    }
  )
}

export default getSelectedFamilySelector
