import { createSelector } from 'reselect';
import * as _ from 'lodash';

const getSelectedFamily = (state) => {
  return  _.find(state.availableClonalFamilies, {"ident": state.selectedFamily});
}

const getSelectedSeq = (state) => state.selectedSeq

const getMutations = (naive_seq, tree, seq_record) =>{
  let seq = seq_record.seq;
  let seq_id = seq_record['id'];

  let is_naive = seq_id == 'naive';
  let mutations = []
  let pairs = _.toPairs(seq);
  let node = _.find(tree, {"id": seq_id})
  _.forEach(pairs, function(pair) {
    let i = pair[0]
    let aa = pair[1]
    if (aa != naive_seq[i] ){
      mutations.push( { 'height': node.height, 'distance': node.distance,'length': node.length,'parent': node.parent,'seq_id': seq_record['id'], 'position': i, 'mut_from': naive_seq[i], 'mut_to': aa })
    }
    else if(is_naive){
      mutations.push( { 'height': 0, 'distance': node.distance,'length': node.length,'parent': node.parent,'seq_id': seq_record['id'], 'position': i, 'mut_from': naive_seq[i], 'mut_to': aa })

    }
  });
  return mutations;
}

const followLineage = (family, leaf) => {
  var lineage = [leaf];
  var curr_node = leaf;
  while (curr_node.parent){
    let parent_id = curr_node.parent;
    let parent = _.find(family["asr_tree"], {"id": parent_id});
    lineage.push(parent);
    curr_node = parent;
  }
  return lineage
}

const computeSelectedFamilyData = (family, seq) => {  
  if (family["cluster_aa"] && family["cluster_aa"].length > 0){
    let data = family["cluster_aa"].slice(0);
    var mode_key;
    if (!_.isEmpty(seq)){
      let lineage = followLineage(family, seq)
      data = _
              .map(lineage,
                    function(node) {
                      let matched_seq = _.find(data, {"id": [node.id]})
                      node["seq"] = matched_seq.seq[0]
                      return node
                    }
                  )
              .reverse()
      mode_key = "lineage_alignment";
    }
    else {   
      data = _
              .filter(family["asr_tree"].slice(0), function(o) { return o.type == "root" || o.type == "leaf"; })
              .map( function(node) {
                      let matched_seq = _.find(data, {"id": [node.id]})
                      node["seq"] = matched_seq.seq[0]
                      return node
                    }
              )
      mode_key = "tips_alignment";
    }
    let naive = _.find(data, {"id": "naive"});
    let naive_seq = naive.seq;
    let mutations_by_seq = _.map(data,  _.partial(getMutations, naive_seq, family["asr_tree"]))
    let all_mutations = _.flatten(mutations_by_seq)
    // reverse so that that we get the naive sequence at the top of the viz
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
