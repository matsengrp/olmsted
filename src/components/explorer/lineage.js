import { connect } from "react-redux";
import React from "react";
import Vega from "react-vega";
import * as treesSelector from "../../selectors/trees";
import * as clonalFamiliesSelectors from "../../selectors/clonalFamilies";
import { seqAlignSpec } from "./vega/clonalFamilyDetails";
import Copy from "../util/copy";
import DownloadFasta from "./downloadFasta";
import { getNaiveVizData } from "./naive";
import { CollapseHelpTitle } from "../util/collapseHelpTitle";

// Lineage focus viz
// =================
//
// This is the alignment viz showing the mutation history for a particular lineage

// First some redux props whathaveyou

const mapStateToProps = (state) => {
  return {
    selectedTree: treesSelector.getSelectedTree(state),
    selectedSeq: treesSelector.getSelectedSeq(state),
    selectedFamily: clonalFamiliesSelectors.getSelectedFamily(state)
  };
};

// Component definition

@connect(mapStateToProps)
class Lineage extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      showEntireLineage: false
    };
  }

  handleCheckboxChange = (event) => {
    this.setState({ showEntireLineage: event.target.checked });
  }

  render() {
    const { selectedFamily, selectedSeq, selectedTree } = this.props;
    const { showEntireLineage } = this.state;

    if (selectedFamily && selectedSeq && selectedTree) {
      // Compute lineage data with the option to show all nodes
      const lineageData = treesSelector.computeLineageDataWithOptions(
        selectedTree,
        selectedSeq,
        showEntireLineage
      );

      const naiveData = getNaiveVizData(selectedFamily);

      // Create boundary markers for all CDR regions
      const cdrBounds = naiveData.source
        .filter((region) => region.region === 'CDR1' || region.region === 'CDR2' || region.region === 'CDR3')
        .flatMap((region) => [
          { x: Math.floor(region.start / 3) - 0.5, region: region.region },
          { x: Math.floor(region.end / 3) + 0.5, region: region.region }
        ]);

      return (
        <div>
          <CollapseHelpTitle
            titleText={`Ancestral sequences for ${selectedSeq.sequence_id} lineage`}
            helpText={`The Ancestral Sequences section displays an alignment of the selected sequence
          with its ancestral lineage starting from the naive sequence. Mutations from the naive sequence
          are shown as in the Clonal Family Details section.`}
          />

          <h3>Amino acid sequence:</h3>
          <p>{selectedSeq.sequence_alignment_aa}</p>
          <Copy
            value={selectedSeq.sequence_alignment ? selectedSeq.sequence_alignment : "NO NUCLEOTIDE SEQUENCE"}
            buttonLabel="Copy nucleotide sequence to clipboard"
          />

          <DownloadFasta
            sequencesSet={lineageData.download_lineage_seqs.slice()}
            filename={selectedSeq.sequence_id.concat("-lineage.fasta")}
            label="Download Fasta: Lineage Sequences"
          />

          <h3>Lineage</h3>
          <Vega
            key={`${showEntireLineage ? "show-all" : "show-mutations"}-${lineageData["lineage_seq_counter"]}`}
            onParseError={(...args) => console.error("parse error:", args)}
            debug
            data={{
              naive_data: naiveData.source,
              cdr_bounds: cdrBounds,
              source_0: lineageData.lineage_alignment
            }}
            spec={seqAlignSpec(lineageData)}
          />

          <div style={{ marginTop: '10px' }}>
            <label htmlFor="show-entire-lineage">
              <input
                id="show-entire-lineage"
                type="checkbox"
                checked={showEntireLineage}
                onChange={this.handleCheckboxChange}
              />
              {" "}Show entire lineage (include nodes without mutations)
            </label>
          </div>
        </div>
      );
    }
    return <div>No ancestral sequences to show</div>;
  }
}

export { Lineage };
