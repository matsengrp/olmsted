import { connect } from "react-redux";
import React from "react";
import Vega from "react-vega";
import * as treesSelector from "../../selectors/trees";
import * as clonalFamiliesSelectors from "../../selectors/clonalFamilies";
import { getPairedClone, getAvailableClonalFamilies } from "../../selectors/clonalFamilies";
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
  const selectedFamily = clonalFamiliesSelectors.getSelectedFamily(state);
  const selectedTree = treesSelector.getSelectedTree(state);
  const allClonalFamilies = getAvailableClonalFamilies(state);
  const treeCache = state.trees.cache;

  // Determine the actual chain type of the selected family
  const selectedFamilyChain = clonalFamiliesSelectors.getCloneChain(selectedFamily);
  const selectedIsHeavy = selectedFamilyChain === "heavy";

  // Look up paired clone if this is a paired family
  let pairedClone = null;
  let pairedTree = null;
  if (selectedFamily && selectedFamily.is_paired) {
    pairedClone = getPairedClone(allClonalFamilies, selectedFamily);
    if (pairedClone) {
      pairedTree = treesSelector.getTreeFromCache(treeCache, pairedClone, null);
    }
  }

  // Determine which clone/tree is heavy and which is light
  const heavyClone = selectedIsHeavy ? selectedFamily : pairedClone;
  const heavyTree = selectedIsHeavy ? selectedTree : pairedTree;
  const lightClone = selectedIsHeavy ? pairedClone : selectedFamily;
  const lightTree = selectedIsHeavy ? pairedTree : selectedTree;

  return {
    selectedTree,
    selectedSeq: treesSelector.getSelectedSeq(state),
    selectedFamily,
    pairedClone,
    pairedTree,
    heavyClone,
    heavyTree,
    lightClone,
    lightTree,
    // Tree/alignment chain selection - used to infer lineage chain when leaf is clicked
    treeChain: state.clonalFamilies.selectedChain || "heavy",
    // Track which chain was clicked in stacked mode
    lastClickedChain: state.clonalFamilies.lastClickedChain || "heavy"
  };
};

// Component definition

@connect(mapStateToProps)
class Lineage extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      showEntireLineage: false,
      showMutationBorders: false,
      lineageChain: "heavy"
    };
  }

  componentDidUpdate(prevProps) {
    const { selectedSeq, selectedFamily, treeChain, lastClickedChain } = this.props;
    const { lineageChain } = this.state;

    // When family changes to non-paired, reset lineageChain to heavy if it was light
    if (selectedFamily && selectedFamily !== prevProps.selectedFamily) {
      if (!selectedFamily.is_paired && lineageChain === "light") {
        this.setState({ lineageChain: "heavy" });
        return;
      }
    }

    // When a new sequence is selected, infer the lineage chain from the tree's chain selection
    if (selectedSeq && selectedSeq !== prevProps.selectedSeq) {
      let inferredChain = "heavy";
      if (treeChain === "light") {
        inferredChain = "light";
      } else if (treeChain === "both-stacked" || treeChain === "both-side-by-side") {
        // In stacked/side-by-side mode, use the chain that was actually clicked
        inferredChain = lastClickedChain;
      }
      this.setState({ lineageChain: inferredChain });
    }
  }

  handleEntireLineageChange = (event) => {
    this.setState({ showEntireLineage: event.target.checked });
  }

  handleMutationBordersChange = (event) => {
    this.setState({ showMutationBorders: event.target.checked });
  }

  handleLineageChainChange = (event) => {
    this.setState({ lineageChain: event.target.value });
  }

  render() {
    const { selectedFamily, selectedSeq, selectedTree, heavyClone, heavyTree, lightClone, lightTree } = this.props;
    const { showEntireLineage, showMutationBorders, lineageChain } = this.state;

    if (selectedFamily && selectedSeq && selectedTree) {
      // Determine which tree and clone to use based on chain selection
      const isLightMode = lineageChain === "light";
      const treeToUse = isLightMode ? lightTree : heavyTree;
      const cloneToUse = isLightMode ? lightClone : heavyClone;

      // For the other chain mode, we need to find the corresponding sequence in that chain's tree
      // since the same sequence_id should exist in both trees (same topology)
      let seqToUse = selectedSeq;
      if (treeToUse && treeToUse.nodes && treeToUse !== selectedTree) {
        const otherSeq = treeToUse.nodes.find(n => n.sequence_id === selectedSeq.sequence_id);
        if (otherSeq) {
          seqToUse = otherSeq;
        }
      }

      // Compute lineage data with the option to show all nodes
      // No chain parameter needed - the tree already has the correct chain's data
      const lineageData = treesSelector.computeLineageDataWithOptions(
        treeToUse,
        seqToUse,
        showEntireLineage
      );

      // Get naive viz data for the appropriate clone
      const naiveData = getNaiveVizData(cloneToUse);

      // Create boundary markers for all CDR regions
      const cdrBounds = naiveData.source
        .filter((region) => region.region === 'CDR1' || region.region === 'CDR2' || region.region === 'CDR3')
        .flatMap((region) => [
          { x: Math.floor(region.start / 3) - 0.5, region: region.region },
          { x: Math.floor(region.end / 3) + 0.5, region: region.region }
        ]);

      // Check if the requested chain data is available
      const chainDataAvailable = !isLightMode ? (heavyClone && heavyTree) : (lightClone && lightTree);

      return (
        <div>
          <CollapseHelpTitle
            titleText={`Ancestral sequences for ${selectedSeq.sequence_id} lineage`}
            helpText={`The Ancestral Sequences section displays an alignment of the selected sequence
          with its ancestral lineage starting from the naive sequence. Mutations from the naive sequence
          are shown as in the Clonal Family Details section.`}
          />

          {selectedFamily.is_paired && (
            <div style={{ marginBottom: "12px" }}>
              <span style={{ marginRight: 8 }}>Chain:</span>
              <select
                id="lineage-chain-select"
                value={lineageChain}
                onChange={this.handleLineageChainChange}
                aria-label="Chain selection for lineage"
              >
                <option value="heavy">Heavy chain</option>
                <option value="light">Light chain</option>
              </select>
            </div>
          )}

          {!chainDataAvailable && (
            <p style={{ fontStyle: "italic", color: "#666", marginBottom: "12px" }}>
              {isLightMode ? "Light" : "Heavy"} chain data not available. The paired clone may not be loaded yet.
            </p>
          )}

          <h3>Amino acid sequence:</h3>
          <p>{seqToUse.sequence_alignment_aa || "N/A"}</p>
          <div style={{ marginTop: "10px", marginBottom: "8px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <Copy
              value={seqToUse.sequence_alignment || "NO NUCLEOTIDE SEQUENCE"}
              buttonLabel="Copy nucleotide sequence to clipboard"
            />
            <Copy
              value={seqToUse.sequence_alignment_aa || "NO AMINO ACID SEQUENCE"}
              buttonLabel="Copy amino acid sequence to clipboard"
            />
          </div>
          <div style={{ marginBottom: "8px" }}>
            <DownloadFasta
              sequencesSet={lineageData.download_lineage_seqs.slice()}
              filename={selectedSeq.sequence_id.concat("-lineage.fasta")}
              label="Download Fasta: Lineage Sequences"
            />
          </div>

          <h3>Lineage</h3>
          <Vega
            key={`${showEntireLineage ? "show-all" : "show-mutations"}-${showMutationBorders ? "borders" : "no-borders"}-${lineageChain}-${lineageData["lineage_seq_counter"]}`}
            onParseError={(...args) => console.error("parse error:", args)}
            debug
            data={{
              naive_data: naiveData.source,
              cdr_bounds: cdrBounds,
              source_0: lineageData.lineage_alignment
            }}
            spec={seqAlignSpec(lineageData, { showMutationBorders })}
          />

          <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label htmlFor="show-mutation-borders" style={{ cursor: 'pointer' }}>
              <input
                id="show-mutation-borders"
                type="checkbox"
                checked={showMutationBorders}
                onChange={this.handleMutationBordersChange}
                style={{ marginRight: '6px' }}
              />
              Show mutation borders
            </label>
            <label htmlFor="show-entire-lineage" style={{ cursor: 'pointer' }}>
              <input
                id="show-entire-lineage"
                type="checkbox"
                checked={showEntireLineage}
                onChange={this.handleEntireLineageChange}
                style={{ marginRight: '6px' }}
              />
              Show entire lineage (include nodes without mutations)
            </label>
          </div>
        </div>
      );
    }
    return <div>No ancestral sequences to show</div>;
  }
}

export { Lineage };
