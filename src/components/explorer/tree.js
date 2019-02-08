import { connect } from "react-redux";
import React from "react";
import Vega from 'react-vega';
import * as reconstructionsSelector from "../../selectors/reconstructions";
import * as clonalFamiliesSelectors from "../../selectors/clonalFamilies";
import {concatTreeWithAlignmentSpec} from './vega/clonal_family_details';
import {getNaiveVizData} from "./naive";
import * as explorerActions from "../../actions/explorer.js"
import * as _ from "lodash";
import DownloadFasta from "./downloadfasta";
import DownloadText from "../util/downloadtext";
import {IncompleteDataWarning} from "../util/incomplete";
import * as vega from 'vega';

// Tree header component
// =================================
// Describes the tree viz, includes dropdown for selecting reconstructions.
@connect(null, (dispatch) => ({
  dispatchSelectedReconstruction: (reconIdent, selectedFamily, selectedSeq) => {
    dispatch(explorerActions.updateSelectedReconstruction(reconIdent, selectedFamily, selectedSeq))
  }
}))
class TreeHeader extends React.Component {
  render(){
    return (
      <div>
        <h2>Clonal family details for {this.props.selectedFamily.sample.id} {this.props.selectedFamily.id}</h2>
        <div>
          <p>
            Below on the left is a phylogenetic tree representing the evolutionary history of the sequences in the selected clonal family.
            On the right is a visual representation of the AA sequence alignment, where colored boxes indicate mutations from naive.
            These sequences are ordered so as to align with the corresponding tree tips.
          </p>
          <label>Ancestral reconstruction method: </label>
          <select value={this.props.treeNodes.ident}
            onChange={(event) => this.props.dispatchSelectedReconstruction(event.target.value, this.props.selectedFamily, this.props.selectedSeq)}>
            {this.props.selectedFamily.reconstructions.map((recon) =>
              <option key={recon.ident} value={recon.ident}>{recon.id}</option>)}
          </select>
          </div>
        </div>
    )
  }
}

const isReconstructionComplete = (recon) => recon.asr_tree && !recon.asr_tree.error

// Phylogenetic tree & alignment viz
// =================================
// We show this for the given selected clonal family and reconstruction (in case there are multiple such
// reconstructions).

// First some redux connection functions

const mapStateToProps = (state) => {
  let selectedFamily = clonalFamiliesSelectors.getSelectedFamily(state)
  let selectedReconstruction = reconstructionsSelector.getSelectedReconstruction(state)
  // idea is that none of these selectors will work (or be needed) if reconstruction data isn't in yet
  if (selectedFamily && selectedReconstruction && isReconstructionComplete(selectedReconstruction)) {
    let naiveData = getNaiveVizData(selectedFamily)
    return {
      selectedFamily,
      selectedReconstruction,
      naiveData,
      treeNodes: reconstructionsSelector.getReconstructionData(state),
      selectedSeq: state.clonalFamilies.selectedSeq,
      cdr3Bounds: [{"x": Math.floor(naiveData.source[0].start/3)-0.5}, {"x": Math.floor(naiveData.source[0].end/3)+0.5}]
    }
  } else {
    return {selectedFamily, selectedReconstruction}
  }
}

// now for the actual component definition

@connect(mapStateToProps, (dispatch) => ({
  dispatchSelectedSeq: (seq) => {
    dispatch(explorerActions.updateSelectedSeq(seq))
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

  // Try to source data for the vega viz from props instead of faking
  // with the empty data attribute set in the constructor
  treeDataFromProps(){
    return {
      source_0: this.props.treeNodes.asr_tree,
      source_1: this.props.treeNodes.tips_alignment,
      naive_data: this.props.naiveData.source,
      cdr3_bounds: this.props.cdr3Bounds,
      leaves_count_incl_naive: this.props.treeNodes.leaves_count_incl_naive,
      pts_tuple: this.props.selectedFamily,
      // Here we create a separate dataset only containing the id of the
      // seed sequence so as to check quickly for this id within the 
      // viz to color the seed blue
      seed: this.props.selectedFamily.seed == null ? [] : [{'id': this.props.selectedFamily.seed.id}]
    }
  }

  render() { 
    // TODO #94: We need to have a better way to tell if a family should not be
    // displayed because its data are incomplete. One idea is an 'incomplete' field
    // that we can set to true (upon building and checking for valid data) and have some
    // minimum bit of information saying the error that occured and/or the field that was not built.
    let incompleteFamily = !this.props.selectedFamily.n_seqs || !this.props.selectedFamily.reconstructions

    // Being explicit about the fact that we are relying on the reconstruction being
    // defined vs undefined instead of keeping track of its true loading state
    let reconstructionLoading = this.props.selectedReconstruction ? false : true

    let incompleteRecon = !reconstructionLoading && !isReconstructionComplete(this.props.selectedReconstruction)
    let completeData = !incompleteFamily && !reconstructionLoading && isReconstructionComplete(this.props.selectedReconstruction)
    return (
        <div>
          {/* Reconstruction still loading aka undefined*/}
          {!incompleteFamily && reconstructionLoading &&
            <div>
              <h2>Loading data for clonal family: {this.props.selectedFamily.id}...</h2>
            </div>
          }
          {/* Warn user if data does not have necessary fields according to incompleteFamily, incompleteRecon */}
          {incompleteFamily && <IncompleteDataWarning data_type={"clonal family"} datum={this.props.selectedFamily}/>}
          {incompleteRecon && <IncompleteDataWarning data_type={"reconstruction"} datum={this.props.selectedReconstruction}/>}
          {/* Show tree header if complete family, reconstruction */}
          {completeData && <TreeHeader selectedFamily={this.props.selectedFamily} selectedReconstruction={this.props.selectedReconstruction} selectedSeq={this.props.selectedSeq} treeNodes={this.props.treeNodes}/>}
          {/* Vega component always gets rendered, its data are faked if necessary;
              this allows us to not reset its UI controls between selecting trees */}
          <Vega onParseError={(...args) => console.error("parse error:", args)}      
            onSignalPts_tuple={(...args) => {
              let node = args.slice(1)[0]
              if(node.parent){
                // update selected sequence for lineage mode if it has a parent ie if it is not a bad request
                this.props.dispatchSelectedSeq(node.id)
              }
            }}
            debug={/* true for debugging */ true}
            logLevel={vega.Debug} // https://vega.github.io/vega/docs/api/view/#view_logLevel
            data={completeData ? this.treeDataFromProps() : this.tempVegaData}
            spec={this.spec}
            // Reload spec every render (comment above line and uncomment below) for Hot Reloading of viz during dev
            // spec={concatTreeWithAlignmentSpec()}
          />
          {/* Show downloads if complete family, reconstruction */}
          {completeData && <div>
            <DownloadFasta sequencesSet={this.props.treeNodes.download_unique_family_seqs.slice()}
                          filename={this.props.selectedFamily.sample.id.concat('-',this.props.selectedFamily.id, '.fasta')}
                          label="Download Fasta: Unique Sequences In This Tree"/>
            <DownloadText  text={this.props.selectedReconstruction.newick_string}
                          filename={this.props.selectedFamily.sample.id.concat('-', this.props.selectedFamily.id, '-newick', '.txt')}
                          label="Download Clonal Family Tree Newick String"/>
          </div>}
        </div>
    )
  }
};

export {TreeViz}