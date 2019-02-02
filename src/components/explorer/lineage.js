import { connect } from "react-redux";
import React from "react";
import Vega from 'react-vega';
import * as reconstructionsSelector from "../../selectors/reconstructions";
import * as clonalFamiliesSelectors from "../../selectors/clonalFamilies";
import {seqAlignSpec} from './vega/clonal_family_details';
import * as _ from "lodash";
import Copy from "../util/copy";
import DownloadFasta from "./downloadfasta";
import {getNaiveVizData} from "./naive";

// Lineage focus viz
// =================
//
// This is the alignment viz showing the mutation history for a particular lineage

// First some redux props whathaveyou

const mapStateToProps = (state) => {
    return {
      lineageData: reconstructionsSelector.getLineageData(state),
      selectedSeq: reconstructionsSelector.getSelectedSeq(state),
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

export {Lineage}
