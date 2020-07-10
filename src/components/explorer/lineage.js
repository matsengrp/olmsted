import { connect } from "react-redux";
import React from "react";
import Vega from 'react-vega';
import * as treesSelector from "../../selectors/trees";
import * as clonalFamiliesSelectors from "../../selectors/clonalFamilies";
import {seqAlignSpec} from './vega/clonal_family_details';
import * as _ from "lodash";
import Copy from "../util/copy";
import DownloadFasta from "./downloadfasta";
import {getNaiveVizData} from "./naive";
import {CollapseHelpTitle} from "../util/collapseHelpTitle";

// Lineage focus viz
// =================
//
// This is the alignment viz showing the mutation history for a particular lineage

// First some redux props whathaveyou

const mapStateToProps = (state) => {
    return {
      lineageData: treesSelector.getLineageData(state),
      selectedSeq: treesSelector.getSelectedSeq(state),
      selectedFamily: clonalFamiliesSelectors.getSelectedFamily(state)
    }
}

// Compoent definition

@connect(mapStateToProps)
class Lineage extends React.Component {
  render() {
    if (this.props.selectedFamily) {
      let naiveData = getNaiveVizData(this.props.selectedFamily)
      let cdr3Bounds = [{"x": Math.floor(naiveData.source[0].start/3)-0.5}, {"x": Math.floor(naiveData.source[0].end/3)+0.5}]
      return <div>
        <CollapseHelpTitle 
          titleText={`Ancestral sequences for ${this.props.selectedSeq.sequence_id} lineage`}
          helpText={`The Ancestral Sequences section displays an alignment of the selected sequence
          with its ancestral lineage starting from the naive sequence. Mutations from the naive sequence
          are shown as in the Clonal Family Details section.`}/>
        <h3>Amino acid sequence:</h3>
        <p>{this.props.selectedSeq.sequence_alignment_aa}</p>
        <Copy value={this.props.selectedSeq.sequence_alignment ? this.props.selectedSeq.sequence_alignment: "NO NUCLEOTIDE SEQUENCE"} buttonLabel="Copy nucleotide sequence to clipboard"/>
        <DownloadFasta sequencesSet={this.props.lineageData.download_lineage_seqs.slice()}
                         filename={this.props.selectedSeq.sequence_id.concat('-lineage.fasta')}
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

export {Lineage}
