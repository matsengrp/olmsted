import { createSelector } from 'reselect';
import * as _ from 'lodash';

const getSelectedFamily = (state) => state.selectedFamily

const getMutations = (naive_seq, seq_record) =>{
  let seq = seq_record.seq[0];
  let is_naive = seq_record['id'] == 'naive';
  let mutations = []
  let pairs = _.toPairs(seq);
  _.forEach(pairs, function(pair) {
    let i = pair[0]
    let aa = pair[1]
    if (aa != naive_seq[i] || is_naive){
      mutations.push({ 'seq_id': seq_record['id'][0], 'position': i, 'mut_from': naive_seq[i], 'mut_to': aa })
    }
  });
  return mutations;
}

const computeSelectedFamilyData = (family, tipsOrLineage) => {  
  if (family["cluster_aa"] && family["cluster_aa"].length > 0){
    let data = family["cluster_aa"].slice(0);

    if (tipsOrLineage == "tips"){   
      data = _
      .filter(family["asr_tree"].slice(0), function(o) { return o.type == "root" || o.type == "leaf"; })
      .map( function(o) {
        return _.find(data, {"id": [o.id]})
      })
    }
    else if (tipsOrLineage == "lineage"){
      // TODO: compute ids for all the seqs in the lineage of a particular tip
    }

    let naive = _.find(data, {"id": ["naive"]});
    let naive_seq = naive.seq[0];
    let mutations = _.map(data,  _.partial(getMutations, naive_seq))
    let result = _.flatten(mutations)
  
    family["alignment"] = result;
    return family;
  }
  else{
    return family
  }
}

// Add 'alignmode' to this selector as grabbing the tipsOrLineage mode from state based
// on whether we have clicked on a tip yet or not
const getSelectedFamilySelector = () => {

  return createSelector(
    [getSelectedFamily],
    (family) => {
      return computeSelectedFamilyData(family, "tips");
    }
  )
}

export default getSelectedFamilySelector
