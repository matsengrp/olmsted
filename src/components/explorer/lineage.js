import { connect } from "react-redux";
import React from "react";
import VegaChart from "../util/VegaChart";
import * as treesSelector from "../../selectors/trees";
import * as clonalFamiliesSelectors from "../../selectors/clonalFamilies";
import {
  getPairedClone,
  getAllClonalFamilies,
  getHeavyLightClones,
  getSelectedDatasetFields
} from "../../selectors/clonalFamilies";
import { seqAlignSpec } from "./vega/clonalFamilyDetails";
import Copy from "../util/copy";
import DownloadFasta from "./downloadFasta";
import { getNaiveVizData } from "./naive";
import { CollapseHelpTitle } from "../util/collapseHelpTitle";
import { CHAIN_TYPES, isBothChainsMode } from "../../constants/chainTypes";
import { UNSPECIFIED_LABEL } from "../../constants/displayLabels";
import * as explorerActions from "../../actions/explorer";
import { VegaExportToolbar } from "../util/VegaExportButton";
import VegaViewContext from "../config/VegaViewContext";

// Lineage focus viz
// =================
//
// This is the alignment viz showing the mutation history for a particular lineage

// First some redux props whathaveyou

const mapStateToProps = (state) => {
  const selectedFamily = clonalFamiliesSelectors.getSelectedFamily(state);
  const selectedTree = treesSelector.getSelectedTree(state);
  // Use getAllClonalFamilies (not filtered by locus) so we can find paired clones
  // even when they're filtered out of the scatterplot
  const allClonalFamilies = getAllClonalFamilies(state);
  const treeCache = state.trees.cache;

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
  const { heavyClone, lightClone } = getHeavyLightClones(selectedFamily, pairedClone);
  const selectedFamilyChain = clonalFamiliesSelectors.getCloneChain(selectedFamily);
  const selectedIsHeavy = selectedFamilyChain === CHAIN_TYPES.HEAVY;
  const heavyTree = selectedIsHeavy ? selectedTree : pairedTree;
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
    treeChain: state.clonalFamilies.selectedChain || CHAIN_TYPES.HEAVY,
    // Track which chain was clicked in stacked mode
    lastClickedChain: state.clonalFamilies.lastClickedChain || CHAIN_TYPES.HEAVY,
    // Lineage settings from Redux
    lineageShowEntire: state.clonalFamilies.lineageShowEntire,
    lineageShowBorders: state.clonalFamilies.lineageShowBorders,
    lineageChain: state.clonalFamilies.lineageChain,
    // Subtree focus (shared with the Phylogeny view)
    subtreeRoot: state.clonalFamilies.subtreeRoot,
    treatSubtreeAsRoot: state.clonalFamilies.treatSubtreeAsRoot,
    dataFields: getSelectedDatasetFields(state)
  };
};

// Component definition

@connect(mapStateToProps, {
  updateLineageShowEntire: explorerActions.updateLineageShowEntire,
  updateLineageShowBorders: explorerActions.updateLineageShowBorders,
  updateLineageChain: explorerActions.updateLineageChain
})
class Lineage extends React.Component {
  static contextType = VegaViewContext;

  constructor(props) {
    super(props);
    this.state = {
      vegaViewReady: false,
      // Cascaded from tree view
      treeMutationColorBy: null,
      treeColorByMetric: false
    };
    this.vegaViewRef = null;
    this.attachedTreeView = null;
    this.treeViewListeners = [];
  }

  componentWillUnmount() {
    this.removeTreeViewListeners();
  }

  /**
   * Remove any signal listeners attached to the tree view.
   */
  removeTreeViewListeners() {
    if (this.attachedTreeView && this.treeViewListeners.length > 0) {
      for (const { signal, handler } of this.treeViewListeners) {
        try {
          this.attachedTreeView.removeSignalListener(signal, handler);
        } catch (_e) {
          // View may already be disposed
        }
      }
    }
    this.treeViewListeners = [];
    this.attachedTreeView = null;
  }

  componentDidUpdate(prevProps) {
    // Attach signal listeners to the tree view for mutation setting changes.
    // Re-attach when the view instance changes (e.g., new family or subtree focus).
    const treeView = this.context?.treeView;
    if (treeView && treeView !== this.attachedTreeView) {
      this.removeTreeViewListeners();
      this.attachedTreeView = treeView;
      try {
        const mutationColorByHandler = (_name, value) => {
          this.setState({ treeMutationColorBy: value });
        };
        const colorByMetricHandler = (_name, value) => {
          this.setState({ treeColorByMetric: !!value });
        };
        treeView.addSignalListener("mutation_color_by", mutationColorByHandler);
        treeView.addSignalListener("color_by_mutation_metric", colorByMetricHandler);
        this.treeViewListeners = [
          { signal: "mutation_color_by", handler: mutationColorByHandler },
          { signal: "color_by_mutation_metric", handler: colorByMetricHandler }
        ];
        // Read initial values from the new view
        this.setState({
          treeMutationColorBy: treeView.signal("mutation_color_by"),
          treeColorByMetric: !!treeView.signal("color_by_mutation_metric")
        });
      } catch (_e) {
        // View may not be ready
      }
    } else if (!treeView && this.attachedTreeView) {
      this.removeTreeViewListeners();
    }
    const { selectedSeq, selectedFamily, treeChain, lastClickedChain, lineageChain, updateLineageChain } = this.props;

    // When family changes, infer the appropriate chain
    if (selectedFamily && selectedFamily !== prevProps.selectedFamily) {
      // For non-paired families, use the family's actual chain
      if (!selectedFamily.is_paired) {
        const familyChain = clonalFamiliesSelectors.getCloneChain(selectedFamily);
        if (familyChain !== lineageChain) {
          updateLineageChain(familyChain);
          return;
        }
      }
    }

    // When a new sequence is selected, infer the lineage chain from the tree's chain selection
    if (selectedSeq && selectedSeq !== prevProps.selectedSeq) {
      // For non-paired families, always use the family's actual chain
      if (selectedFamily && !selectedFamily.is_paired) {
        const familyChain = clonalFamiliesSelectors.getCloneChain(selectedFamily);
        updateLineageChain(familyChain);
      } else {
        // For paired families, infer from tree selection
        let inferredChain = CHAIN_TYPES.HEAVY;
        if (treeChain === CHAIN_TYPES.LIGHT) {
          inferredChain = CHAIN_TYPES.LIGHT;
        } else if (isBothChainsMode(treeChain)) {
          // In stacked/side-by-side mode, use the chain that was actually clicked
          inferredChain = lastClickedChain;
        }
        updateLineageChain(inferredChain);
      }
    }
  }

  handleEntireLineageChange = (event) => {
    const { updateLineageShowEntire } = this.props;
    updateLineageShowEntire(event.target.checked);
  };

  handleMutationBordersChange = (event) => {
    const { updateLineageShowBorders } = this.props;
    updateLineageShowBorders(event.target.checked);
  };

  /**
   * Get mutation coloring settings cascaded from the tree view.
   */
  getTreeMutationSettings() {
    return {
      colorByMutationMetric: this.state.treeColorByMetric,
      mutationColorBy: this.state.treeMutationColorBy
    };
  }

  handleLineageChainChange = (event) => {
    const { updateLineageChain } = this.props;
    updateLineageChain(event.target.value);
  };

  render() {
    const {
      selectedFamily,
      selectedSeq,
      selectedTree,
      heavyClone,
      heavyTree,
      lightClone,
      lightTree,
      lineageShowEntire,
      lineageShowBorders,
      lineageChain,
      subtreeRoot,
      treatSubtreeAsRoot
    } = this.props;
    const showEntireLineage = lineageShowEntire;
    const showMutationBorders = lineageShowBorders;

    if (selectedFamily && selectedSeq && selectedTree) {
      // Determine which tree and clone to use based on chain selection
      const isLightMode = lineageChain === CHAIN_TYPES.LIGHT;
      const treeToUse = isLightMode ? lightTree : heavyTree;
      const cloneToUse = isLightMode ? lightClone : heavyClone;

      // For the other chain mode, we need to find the corresponding sequence in that chain's tree
      // since the same sequence_id should exist in both trees (same topology)
      let seqToUse = selectedSeq;
      if (treeToUse && treeToUse.nodes && treeToUse !== selectedTree) {
        const otherSeq = treeToUse.nodes.find((n) => n.sequence_id === selectedSeq.sequence_id);
        if (otherSeq) {
          seqToUse = otherSeq;
        }
      }

      // Compute lineage data. If the Phylogeny view has a focused subtree AND
      // treat-as-root is on, compute relative to the subtree root so mutations
      // and the lineage path mirror the Phylogeny view's reference.
      const lineageData =
        subtreeRoot && treatSubtreeAsRoot
          ? treesSelector.computeLineageDataRelativeTo(treeToUse, seqToUse, subtreeRoot, showEntireLineage)
          : treesSelector.computeLineageDataWithOptions(treeToUse, seqToUse, showEntireLineage);

      // Check if lineageData is valid (has required properties)
      const hasLineageData = lineageData && lineageData.lineage_alignment && lineageData.download_lineage_seqs;

      // Get naive viz data for the appropriate clone
      // Will return empty source array if clone is null
      const naiveData = getNaiveVizData(cloneToUse);

      // Create boundary markers for all CDR regions
      const cdrBounds = naiveData.source
        .filter((region) => region.region === "CDR1" || region.region === "CDR2" || region.region === "CDR3")
        .flatMap((region) => [
          { x: Math.floor(region.start / 3) - 0.5, region: region.region },
          { x: Math.floor(region.end / 3) + 0.5, region: region.region }
        ]);

      // Check if the requested chain data is available
      const chainDataAvailable = !isLightMode ? heavyClone && heavyTree : lightClone && lightTree;

      // Also check if we have the clone data needed for naive visualization
      const hasCloneData = cloneToUse !== null && cloneToUse !== undefined;

      return (
        <div>
          <div style={{ border: "1px solid #ddd", borderRadius: "4px", padding: "8px" }}>
            <CollapseHelpTitle
              titleText={`Ancestral Sequences for: "${selectedSeq.sequence_id}" Lineage`}
              helpText={
                <div>
                  The Ancestral Sequences section displays an alignment showing the mutational path from the naive
                  sequence to the selected sequence. Each row represents a node along the lineage, with mutations
                  highlighted using the same color scheme as the Clonal Family Tree & Alignment view. CDR regions (CDR1,
                  CDR2, CDR3) are marked with colored background bars.
                  <br />
                  <br />
                  <strong>Paired Heavy/Light Chain Data:</strong> For paired data, a Chain dropdown menu appears below,
                  allowing you to select which chain&apos;s lineage to display: heavy chain or light chain.
                  <br />
                  <br />
                  <strong>Features:</strong>
                  <ul style={{ marginTop: "5px", paddingLeft: "20px", marginBottom: "10px" }}>
                    <li>
                      <strong>Copy sequences:</strong> Use the copy buttons to copy nucleotide or amino acid sequences
                      to clipboard
                    </li>
                    <li>
                      <strong>Download FASTA:</strong> Download all sequences in the lineage as a FASTA file
                    </li>
                  </ul>
                  <strong>Surprise Score Coloring:</strong> When the dataset includes per-mutation surprise scores, the
                  &quot;Color by surprise score&quot; toggle (enabled in the Clonal Family Tree & Alignment view above)
                  also applies here. Scored mutations are colored using an orange heat scale; unscored mutations become
                  invisible. A surprise score legend appears on the right when active.
                  <br />
                  <br />
                  <strong>Display Options:</strong>
                  <ul style={{ marginTop: "5px", paddingLeft: "20px", marginBottom: "10px" }}>
                    <li>
                      <strong>Show mutation borders:</strong> Draw borders around mutated positions for easier
                      identification
                    </li>
                    <li>
                      <strong>Show entire lineage:</strong> Include all ancestral nodes (default shows only nodes with
                      mutations)
                    </li>
                  </ul>
                  <strong>Export:</strong>
                  <ul style={{ marginTop: "5px", paddingLeft: "20px" }}>
                    <li>
                      <strong>Export PNG/SVG:</strong> Save the lineage visualization as an image
                    </li>
                  </ul>
                  <strong>Tip:</strong> Display options can be saved as configurations via the Settings menu in the
                  header.
                </div>
              }
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
                  <option value={CHAIN_TYPES.HEAVY}>Heavy chain</option>
                  <option value={CHAIN_TYPES.LIGHT}>Light chain</option>
                </select>
              </div>
            )}

            {!chainDataAvailable && (
              <div
                style={{
                  marginTop: "10px",
                  marginBottom: "12px",
                  padding: "12px",
                  backgroundColor: "#f8d7da",
                  border: "1px solid #dc3545",
                  borderRadius: "4px",
                  color: "#721c24"
                }}
              >
                <p style={{ margin: 0, fontSize: "14px" }}>
                  {isLightMode ? "Light" : "Heavy"} chain data not found. The paired clone is not available in this
                  dataset.
                </p>
              </div>
            )}

            {(!hasLineageData || !hasCloneData) && (
              <div
                style={{
                  marginTop: "10px",
                  padding: "16px",
                  backgroundColor: "#f8d7da",
                  border: "1px solid #dc3545",
                  borderRadius: "4px",
                  color: "#721c24"
                }}
              >
                <p style={{ margin: 0, fontSize: "14px" }}>
                  {!hasCloneData
                    ? "Clone data not found. The selected chain's data may not be available."
                    : "Tree data not found or incomplete. The lineage visualization cannot be displayed."}
                </p>
              </div>
            )}

            {hasLineageData && hasCloneData && (
              <>
                <h3>Amino acid sequence:</h3>
                <p>{seqToUse.sequence_alignment_aa || UNSPECIFIED_LABEL}</p>
                <div style={{ marginTop: "10px", marginBottom: "8px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  {/* Skip the Copy button entirely when the sequence is absent — copying
                      the placeholder string would be misleading and indistinguishable
                      between the two buttons. */}
                  {seqToUse.sequence_alignment && (
                    <Copy value={seqToUse.sequence_alignment} buttonLabel="Copy nucleotide sequence to clipboard" />
                  )}
                  {seqToUse.sequence_alignment_aa && (
                    <Copy value={seqToUse.sequence_alignment_aa} buttonLabel="Copy amino acid sequence to clipboard" />
                  )}
                </div>
                <div style={{ marginBottom: "8px" }}>
                  <DownloadFasta
                    sequencesSet={lineageData.download_lineage_seqs.slice()}
                    filename={selectedSeq.sequence_id.concat("-lineage.fasta")}
                    label="Download Fasta: Lineage Sequences"
                  />
                </div>

                <h3>Lineage</h3>
                {this.state.treeMutationColorBy && (
                  <div style={{ fontSize: 12, color: "#666", marginBottom: 6 }}>
                    Coloring by: <strong>{this.state.treeMutationColorBy}</strong>
                    {this.state.treeColorByMetric && " (heatmap)"}
                  </div>
                )}
                <div style={{ width: "100%", maxWidth: "100%", overflow: "hidden" }}>
                  <VegaChart
                    key={`${showEntireLineage ? "show-all" : "show-mutations"}-${showMutationBorders ? "borders" : "no-borders"}-${this.state.treeMutationColorBy || "aa"}-${this.state.treeColorByMetric}-${lineageChain}-${lineageData["lineage_seq_counter"]}`}
                    onNewView={(view) => {
                      this.vegaViewRef = view;
                      if (!this.state.vegaViewReady) {
                        this.setState({ vegaViewReady: true });
                      }
                    }}
                    onError={(...args) => console.error("Vega error:", args)}
                    data={{
                      naive_data: naiveData.source,
                      cdr_bounds: cdrBounds,
                      source_0: lineageData.lineage_alignment
                    }}
                    spec={seqAlignSpec(lineageData, {
                      showMutationBorders,
                      colorByMutationMetric: this.getTreeMutationSettings().colorByMutationMetric,
                      mutationColorField: this.getTreeMutationSettings().mutationColorBy,
                      mutationMetadata: this.props.dataFields?.field_metadata?.mutation || null
                    })}
                  />
                </div>
                <div style={{ marginTop: 10 }}>
                  <VegaExportToolbar
                    vegaView={this.vegaViewRef}
                    filename={`olmsted-lineage-${selectedSeq.sequence_id}`}
                  />
                </div>
              </>
            )}

            <div style={{ marginTop: "10px", display: "flex", flexDirection: "column", gap: "6px" }}>
              <label htmlFor="show-mutation-borders" style={{ cursor: "pointer" }}>
                <input
                  id="show-mutation-borders"
                  type="checkbox"
                  checked={showMutationBorders}
                  onChange={this.handleMutationBordersChange}
                  style={{ marginRight: "6px" }}
                />
                Show mutation borders
              </label>
              <label htmlFor="show-entire-lineage" style={{ cursor: "pointer" }}>
                <input
                  id="show-entire-lineage"
                  type="checkbox"
                  checked={showEntireLineage}
                  onChange={this.handleEntireLineageChange}
                  style={{ marginRight: "6px" }}
                />
                Show entire lineage (include nodes without mutations)
              </label>
            </div>
          </div>
        </div>
      );
    }
    return <div>No ancestral sequences to show</div>;
  }
}

export { Lineage };
