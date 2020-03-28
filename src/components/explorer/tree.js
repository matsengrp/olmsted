import { connect } from "react-redux";
import React from "react";
import Vega from 'react-vega';
import * as treesSelector from "../../selectors/trees";
import * as clonalLineagesSelectors from "../../selectors/clonalLineages";
import {concatTreeWithAlignmentSpec} from './vega/clonal_lineage_details';
import {getNaiveVizData} from "./naive";
import * as explorerActions from "../../actions/explorer.js"
import * as _ from "lodash";
import DownloadFasta from "./downloadfasta";
import DownloadText from "../util/downloadtext";
import {IncompleteDataWarning} from "../util/incomplete";
import * as vega from 'vega';

// Tree header component
// =================================
// Describes the tree viz, includes dropdown for selecting trees.
@connect(null, (dispatch) => ({
  dispatchSelectedTree: (treeIdent, selectedLineage, selectedSeq) => {
    dispatch(explorerActions.updateSelectedTree(treeIdent, selectedLineage, selectedSeq))
  }
}))
class TreeHeader extends React.Component {
  render(){
    return (
      <div>
        <h2>Clonal lineage details for {this.props.selectedLineage.sample_id} {this.props.selectedLineage.clone_id}</h2>
        <div>
          <p>
            Below on the left is a phylogenetic tree representing the evolutionary history of the sequences in the selected clonal lineage.
            On the right is a visual representation of the AA sequence alignment, where colored boxes indicate mutations from naive.
            These sequences are ordered so as to align with the corresponding tree tips.
          </p>
          <label>Ancestral reconstruction method: </label>
          <select value={this.props.tree.ident}
            onChange={(event) => this.props.dispatchSelectedTree(event.target.value, this.props.selectedLineage, this.props.selectedSeq)}>
            {this.props.selectedLineage.trees.map((tree) =>
              <option key={tree.ident} value={tree.ident}>{tree.tree_id}</option>)}
          </select>
          </div>
        </div>
    )
  }
}

const isTreeComplete = (tree) => tree.nodes && !tree.nodes.error

// Phylogenetic tree & alignment viz
// =================================
// We show this for the given selected clonal lineage and tree (in case there are multiple such
// trees).

// First some redux connection functions

const mapStateToProps = (state) => {
  let selectedLineage = clonalLineagesSelectors.getSelectedLineage(state)
  let selectedTree = treesSelector.getSelectedTree(state)
  // idea is that none of these selectors will work (or be needed) if tree data isn't in yet
  if (selectedLineage && selectedTree && isTreeComplete(selectedTree)) {
    let naiveData = getNaiveVizData(selectedLineage)
    return {
      selectedLineage,
      selectedTree,
      naiveData,
      tree: treesSelector.getTreeData(state),
      selectedSeq: state.clonalLineages.selectedSeq,
      cdr3Bounds: [{"x": Math.floor(naiveData.source[0].start/3)-0.5}, {"x": Math.floor(naiveData.source[0].end/3)+0.5}]
    }
  } else {
    return {selectedLineage, selectedTree}
  }
}

// now for the actual component definition

@connect(mapStateToProps, (dispatch) => ({
  dispatchSelectedSeq: (seq) => {
    dispatch(explorerActions.updateSelectedSeq(seq))
  },
  dispatchSelectLineage: (lineage_ident) => {
    dispatch(explorerActions.selectLineage(lineage_ident))
  }
}))
class TreeViz extends React.Component {
  constructor(props) {
    super(props);
    this.spec = concatTreeWithAlignmentSpec()
    this.treeDataFromProps = this.treeDataFromProps.bind(this)
    this.tempVegaData = {
      source_0: [],
      source_1: [],
      naive_data: [],
      cdr3_bounds: [{"x":0},{"x":100}],
      leaves_count_incl_naive: 42,
      pts_tuple: [],
      seed:[]
    }
  }

  componentDidMount(){
    // Automatically request a tree for the selected lineage
    // when the component is first inserted into the DOM tree.
    this.props.dispatchSelectLineage(this.props.selectedLineage.ident)
  }

  // Try to source data for the vega viz from props instead of faking
  // with the empty data attribute set in the constructor
  treeDataFromProps(){
    return {
      source_0: this.props.tree.nodes,
      source_1: this.props.tree.tips_alignment,
      naive_data: this.props.naiveData.source,
      cdr3_bounds: this.props.cdr3Bounds,
      leaves_count_incl_naive: this.props.tree.leaves_count_incl_naive,
      pts_tuple: this.props.selectedLineage,
      // Here we create a separate dataset only containing the id of the
      // seed sequence so as to check quickly for this id within the 
      // viz to color the seed blue
      seed: this.props.selectedLineage.seed_id == null ? [] : [{'id': this.props.selectedLineage.seed_id}]
    }
  }

  render() { 
    // TODO #94: We need to have a better way to tell if a lineage should not be
    // displayed because its data are incomplete. One idea is an 'incomplete' field
    // that we can set to true (upon building and checking for valid data) and have some
    // minimum bit of information saying the error that occured and/or the field that was not built.
    let incompleteLineage = !this.props.selectedLineage.unique_seqs_count || !this.props.selectedLineage.trees

    // Being explicit about the fact that we are relying on the tree being
    // defined vs undefined instead of keeping track of its true loading state
    let treeLoading = this.props.selectedTree ? false : true

    let incompleteTree = !treeLoading && !isTreeComplete(this.props.selectedTree)
    let completeData = !incompleteLineage && !treeLoading && isTreeComplete(this.props.selectedTree)
    return (
        <div>
          {/* Tree still loading aka undefined*/}
          {!incompleteLineage && treeLoading &&
            <div>
              <h2>Loading data for clonal lineage: {this.props.selectedLineage.clone_id}...</h2>
            </div>
          }
          {/* Warn user if data does not have necessary fields according to incompleteLineage, incompleteTree */}
          {incompleteLineage && <IncompleteDataWarning data_type={"clonal lineage"} datum={this.props.selectedLineage}/>}
          {incompleteTree && <IncompleteDataWarning data_type={"tree"} datum={this.props.selectedTree}/>}
          {/* Show tree header if complete lineage, tree */}
          {completeData && <TreeHeader selectedLineage={this.props.selectedLineage} selectedTree={this.props.selectedTree} selectedSeq={this.props.selectedSeq} tree={this.props.tree}/>}
          {/* Vega component always gets rendered, its data are faked if necessary;
              this allows us to not reset its UI controls between selecting trees */}
          <Vega onParseError={(...args) => console.error("parse error:", args)}      
            onSignalPts_tuple={(...args) => {
              let node = args.slice(1)[0]
              if(node.parent){
                // update selected sequence for lineage mode if it has a parent ie if it is not a bad request
                this.props.dispatchSelectedSeq(node.sequence_id)
              }
            }}
            debug={/* true for debugging */ true}
            // logLevel={vega.Debug} // https://vega.github.io/vega/docs/api/view/#view_logLevel
            data={completeData ? this.treeDataFromProps() : this.tempVegaData}
            spec={this.spec}
            // Reload spec every render (comment above line and uncomment below) for Hot Reloading of viz during dev
            // spec={concatTreeWithAlignmentSpec()}
          />
          {/* Show downloads if complete lineage, tree */}
          {completeData && <div>
            <DownloadFasta sequencesSet={this.props.tree.download_unique_lineage_seqs.slice()}
                          filename={this.props.selectedLineage.sample_id.concat('-',this.props.selectedLineage.clone_id, '.fasta')}
                          label="Download Fasta: Unique Sequences In This Tree"/>
            <DownloadText  text={this.props.selectedTree.newick}
                          filename={this.props.selectedLineage.sample_id.concat('-', this.props.selectedLineage.clone_id, '-newick', '.txt')}
                          label="Download Clonal Lineage Tree Newick String"/>
          </div>}
        </div>
    )
  }
};

export {TreeViz}
