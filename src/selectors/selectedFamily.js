import { createSelector } from 'reselect';
import * as _ from 'lodash';

const getSelectedFamily = (state) => state.selectedFamily

const getMutations = (naive_seq, seq_record) =>{
  console.log("args", naive_seq, seq_record)
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

const computeSelectedFamilyData = (family) => {
  if (family["cluster_aa"] && family["cluster_aa"].length > 0){
    let data = family["cluster_aa"].splice(0);
    console.log("data", data)
    let naive = _.find(data, {"id": ["naive"]});
    let naive_seq = naive.seq[0];
    console.log("naive_seq", naive_seq)
    let mutations = _.map(data,  _.partial(getMutations, naive_seq))
    let result = _.flatten(mutations)
  
    console.log("RESULT", result);
  
    family["cluster_aa"] = result;
    return family;
  
    
  }
  else{
    return family
  }
}

const getSelectedFamilySelector = () => {

  return createSelector(
    [getSelectedFamily],
    (family) => {
      return computeSelectedFamilyData(family);
    }
  )
}

export default computeSelectedFamilyData
