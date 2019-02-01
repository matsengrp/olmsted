import { connect } from "react-redux";
import React from "react";
import Vega from 'react-vega';
import VegaLite from 'react-vega-lite';
import * as vl from 'vega-lite';
import * as vega from 'vega';
import {createClassFromSpec} from 'react-vega';
import * as reconstructionsSelector from "../../selectors/reconstructions";
import * as clonalFamiliesSelectors from "../../selectors/clonalFamilies";
import naiveVegaSpec from './vega/naive.js';
import facetClonalFamiliesVizSpec from './vega/facet_scatter_plot';
import {concatTreeWithAlignmentSpec, seqAlignSpec} from './vega/clonal_family_details';
import * as explorerActions from "../../actions/explorer.js"
import * as _ from "lodash";
import * as loadData from "../../actions/loadData";
import Copy from "../util/copy";
import DownloadFasta from "./downloadfasta";
import DownloadText from "../util/downloadtext";



// A simple wrapper around the vega-lite-react lib's VegaLite module which prints compilation errors as
// appropriate

const MyVegaLite = args => {
  if (args.debug) {
    console.log("compiling vega-lite", args.spec)
    try {
      console.log("resulting vega", vl.compile(args.spec).spec)
    } catch (e) {
      console.error("couldn't parse vega-lite:", e)
    }
  }
  return <VegaLite {...args}/>
}


// Naive gene reassortment viz component
// =====================================

const getNaiveVizData = (datum) => {
  let result = {
    source: [
    {
      family: "5p",
      region: "CDR3",
      start: datum.cdr3_start,
      end: datum.cdr3_start + datum.cdr3_length
    },
    {
      family: "5p",
      region: "V gene",
      gene: datum.v_gene,
      start: datum.v_start,
      end: datum.v_end
    },
    {
      family: "5p",
      region: "5' Insertion",
      start: datum.v_end,
      end: datum.d_start
    },
    {
      family: "5p",
      region: "D gene",
      gene: datum.d_gene,
      start: datum.d_start,
      end: datum.d_end
    },
    {
      family: "5p",
      region: "3' Insertion",
      start: datum.d_end,
      end: datum.j_start
    },
    {
      family: "5p",
      region: "J gene",
      gene: datum.j_gene,
      start: datum.j_start,
      end: datum.j_end
    }
  ]} 
  return result 
}

const NaiveViz = createClassFromSpec(naiveVegaSpec)

const NaiveSequence = ({datum}) => {
  return <NaiveViz data = {getNaiveVizData(datum)} />;
}



// Clonal Families Viz
// ===================
//
// This is the main view in the entire vizualization as it's the first thing we always see once we explore,
// and it's the top level entry point for us in exploring datasets/clonal-families in gerater detail.
// Goal is to be super configurable and powerful.

@connect((state) => ({
    availableClonalFamilies: clonalFamiliesSelectors.getAvailableClonalFamilies(state),
    selectedFamily: clonalFamiliesSelectors.getSelectedFamily(state),
    locus: state.clonalFamilies.locus
  }),
  //This is a shorthand way of specifying mapDispatchToProps
  {
    selectFamily: explorerActions.selectFamily,
    updateBrushSelection: explorerActions.updateBrushSelection,
    filterBrushSelection: explorerActions.filterBrushSelection,
    updateSelectingStatus: explorerActions.updateSelectingStatus,
    updateFacet: explorerActions.updateFacet
  })
class ClonalFamiliesViz extends React.Component {
  constructor(props) {
    super(props);
    this.xField = "n_seqs";
    this.yField = "mean_mut_freq";
    this.facetOptions = ["none", "has_seed", "sample.timepoint", "dataset.id", "subject.id", "v_gene", "d_gene", "j_gene", "sample.locus"]
    this.spec = facetClonalFamiliesVizSpec()
  }

  render() {
    if (this.props.availableClonalFamilies) {
      return  <div>
          {/* Here we have our Vega component specification, where we plug in signal handlers, etc. */}
          {this.props.availableClonalFamilies.length > 0 && <Vega
          // TURN THESE ON TO DEBUG SIGNALS
          // SEE https://github.com/matsengrp/olmsted/issues/65
          // onSignalWidth={(...args) => {
          //   let result = args.slice(1)[0]
          //   console.log("width", result)
          // }}
          // onSignalHeight={(...args) => {
          //   let result = args.slice(1)[0]
          //   console.log("height", result)
          // }}
          // onSignalBrush_x={(...args) => {
          //   let result = args.slice(1)[0]
          //   console.log('brushx: ', result)
          // }}
          // onSignalBrush_y={(...args) => {
          //   let result = args.slice(1)[0]
          //   console.log('brushy: ', result)  
          // }}
          onSignalPts_tuple={(...args) => {
            let family = args.slice(1)[0]
            if(family.ident){
              // Second argument specifies that we would like to 
              // include just this family in our brush selection
              // and therefore in the table since we have clicked it

              this.props.selectFamily(family.ident, true)
            }
          }}
          onSignalMouseDown={(...args) => {
            let coords = args.slice(1)[0]
            // Must check to see if there are actual mouse coordinates
            // here and in the mouseup signal handler just below because
            // they are triggered with undefined upon rendering the viz
            if(coords){
              this.props.updateSelectingStatus()
              this.mouseDown = true
            }
          }}
          onSignalMouseUp={(...args) => {
            let coords = args.slice(1)[0]
            if(this.mouseDown && coords){
              this.props.updateSelectingStatus()
            }
            this.mouseDown = false
          }}
          onSignalXField={(...args) => {
            let result = args.slice(1)[0]
            this.xField = result
          }}
          onSignalYField={(...args) => {
            let result = args.slice(1)[0]
            this.yField = result
          }}
          onSignalFacet_by_signal={(...args) => {
            let result = args.slice(1)[0]
            this.props.updateFacet(result)          
          }}
          onSignalBrush_x_field={(...args) => {
            let result = args.slice(1)[0]
            this.props.updateBrushSelection("x", this.xField, result)
          }}
          onSignalBrush_y_field={(...args) => {
            let result = args.slice(1)[0]
            this.props.updateBrushSelection("y", this.yField, result)
          }}
          onSignalBrushed_facet_value={(...args) => {
            let keyVal = args.slice(1)[0]
            if(keyVal){
              this.props.filterBrushSelection(keyVal[0], keyVal[1])
            }
          }}
          onParseError={(...args) => console.error("parse error:", args)}
          debug={/* true for debugging */ true}
          // logLevel={vega.Debug} // https://vega.github.io/vega/docs/api/view/#view_logLevel
          data={{source: this.props.availableClonalFamilies,
                // Here we create a separate dataset only containing the id of the
                // selected family so as to check quickly for this id within the 
                // viz to highlight the selected family.
                selected: [{'ident': this.props.selectedFamily}],
                locus: [{'locus': this.props.locus}] }}
          spec={this.spec}/>}
      </div>
    } else {
      return <h3>Loading data...</h3>
    }
  }
};

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

// Print an object to the DOM because it is broken somehow
class IncompleteDataWarning extends React.Component {
  render(){
    let id_of_broken_data = this.props.datum.id || this.props.datum.ident
    return (
      <div>
        <h2>Insufficient data to display {this.props.data_type}{id_of_broken_data && ": " + id_of_broken_data}</h2>
        <p>{this.props.data_type} object has been logged to the console for inspection:</p>
        <div>
          <pre>
            <code>
              { JSON.stringify(this.props.datum, null, 2) }
            </code>
          </pre>
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

const mapStateToPropsTree = (state) => {
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

@connect(mapStateToPropsTree, (dispatch) => ({
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


// Lineage focus viz
// =================
//
// This is the alignment viz showing the mutation history for a particular lineage

// First some redux props whathaveyou

const mapStateToPropsLineage = (state) => {
    return {
      lineageData: reconstructionsSelector.getLineageData(state),
      selectedSeq: reconstructionsSelector.getSelectedSeq(state),
      selectedFamily: clonalFamiliesSelectors.getSelectedFamily(state)
    }
}

// Compoent definition

@connect(mapStateToPropsLineage)
class Lineage extends React.Component {
  render() {
    if (this.props.selectedFamily) {
      let naiveData = getNaiveVizData(this.props.selectedFamily)
      let cdr3Bounds = [{"x": Math.floor(naiveData.source[0].start/3)-0.5}, {"x": Math.floor(naiveData.source[0].end/3)+0.5}]
      return <div>
        <h2>Ancestral sequences for {this.props.selectedSeq.label} lineage</h2>
        <h3>Amino acid sequence:</h3>
        <p>{this.props.selectedSeq.aa_seq}</p>
        <Copy value={this.props.selectedSeq.nt_seq ? this.props.selectedSeq.nt_seq: "NO NUCLEOTIDE SEQUENCE"} buttonLabel="Copy nucleotide sequence to clipboard"/>
        <DownloadFasta sequencesSet={this.props.lineageData.download_lineage_seqs.slice()}
                         filename={this.props.selectedSeq.id.concat('-lineage.fasta')}
                         label="Download Fasta: Lineage Sequences"/>
        <h3>Lineage</h3>
        <Vega
          onParseError={(...args) => console.error("parse error:", args)}
          debug={/* true for debugging */ true}
          data={{
            naive_data: naiveData.source,
            cdr3_bounds: cdr3Bounds,
          }}
          spec={seqAlignSpec(this.props.lineageData)}
        />
      </div>
    } else {
      return <div>No acestral sequences to show</div>
    }
  }};


// export compoents
export {ClonalFamiliesViz, TreeViz, NaiveSequence, Lineage}
