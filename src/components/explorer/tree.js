import { connect } from "react-redux";
import React from "react";
import Vega from "react-vega";
import * as treesSelector from "../../selectors/trees";
import * as clonalFamiliesSelectors from "../../selectors/clonalFamilies";
import { concatTreeWithAlignmentSpec } from "./vega/clonalFamilyDetails";
import { getNaiveVizData } from "./naive";
import * as explorerActions from "../../actions/explorer";
import DownloadFasta from "./downloadFasta";
import DownloadText from "../util/downloadText";
import { IncompleteDataWarning } from "../util/incomplete";
import { CollapseHelpTitle } from "../util/collapseHelpTitle";
import { SimpleInProgress } from "../util/loading";
import { getPairedClone, getAllClonalFamilies } from "../../selectors/clonalFamilies";

// Tree header component
// =================================
// Describes the tree viz, includes dropdown for selecting trees.
@connect(
  (state) => ({
    selectedChain: state.clonalFamilies.selectedChain
  }),
  (dispatch) => ({
    dispatchSelectedTree: (treeIdent, selectedFamily, selectedSeq) => {
      dispatch(explorerActions.updateSelectedTree(treeIdent, selectedFamily, selectedSeq));
    },
    dispatchSelectedChain: (chain) => {
      dispatch(explorerActions.updateSelectedChain(chain));
    }
  })
)
class TreeHeader extends React.Component {
  render() {
    const { selectedFamily, tree, dispatchSelectedTree, selectedSeq, selectedChain, dispatchSelectedChain } = this.props;
    return (
      <div>
        <CollapseHelpTitle
          titleText={`Clonal family details for ${selectedFamily.sample_id || selectedFamily.subject_id || "sample"} ${selectedFamily.clone_id}`}
          helpText={
            <div>
              For a selected clonal family, its phylogenetic tree is visualized below the table in the Clonal family
              details section. Select among any alternate phylogenies using the Ancestral reconstruction method menu.
              Note that these ancestral reconstruction methods are according to those specified in the input data
              according to the phylogenetic inference tool used to produce them - Olmsted does not perform ancestral
              reconstruction (or any phylogenetic inference at all).
              <br />
              <br />
              Alongside the tree is an alignment of the sequences at the tree&apos;s tips. Colors indicate amino acid
              mutations at each position that differs from the sequence at the root of the tree (typically the
              family&apos;s inferred naive antibody sequence). Scroll while hovering over the tree to zoom in and out.
              Click and drag the zoomed view to pan in a traditional map-style interface. The alignment view on the
              right zooms in the vertical dimension according to the zoom status of the tree. The tree&apos;s leaves use
              pie charts to show the multiplicity (i.e. the number of downsampled and deduplicated sequences)
              represented by a given sequence, colored according to sampling timepoint. See{" "}
              <a href="http://www.olmstedviz.org/schema.html">the schema</a> for more detailed field descriptions.
              <br />
              <br />
              Note that often in example data the number of sequences in a clonal family has been downsampled to build a
              tree (see downsampled_count, downsampling_strategy in{" "}
              <a href="http://www.olmstedviz.org/schema.html">the schema</a>
              ), which explains why a clonal family might be listed in the table as having a few thousand unique
              sequences, but upon selecting the clonal family, the corresponding tree visualization only contains 10s or
              100s of sequences.
              <br />
              <br />
              Use the interface below the tree to configure:
              <br />
              <ul>
                <li>Maximum width of the tree window with respect to the alignment window (Tree width ratio)</li>
                <li>Field mapped to the size of pie charts at the tree&apos; leaves (leaf_size_by)</li>
                <li>Maximum size of pie charts at the tree&apos; leaves (max_leaf_size)</li>
                <li>Tree tip labels toggle on and off (show_labels)</li>
                <li>
                  Fields mapped to branch width and color (branch_width_by, branch_color_by, branch_color_scheme,
                  min_color_value)
                </li>
              </ul>
              In order to get more details about a particular lineage in the tree, click on a leaf&apos;s label (or on
              the dot at the center of the pie chart) - the Ancestral Sequences section will appear below the tree.
              <br />
              <br />
            </div>
          }
        />

        <div>
          <span style={{ marginRight: 8 }}>Ancestral reconstruction method:</span>
          <select
            id="tree-select"
            value={tree.ident}
            onChange={(event) => dispatchSelectedTree(event.target.value, selectedFamily, selectedSeq)}
            aria-label="Ancestral reconstruction method"
          >
            {selectedFamily.trees.map((tree_option) => (
              <option key={tree_option.ident} value={tree_option.ident}>
                {tree_option.type || tree_option.tree_id}
              </option>
            ))}
          </select>
        </div>
        {selectedFamily.is_paired && (
          <div style={{ marginTop: "8px" }}>
            <span style={{ marginRight: 8 }}>Chain:</span>
            <select
              id="chain-select"
              value={selectedChain}
              onChange={(event) => dispatchSelectedChain(event.target.value)}
              aria-label="Chain selection"
            >
              <option value="heavy">Heavy chain only</option>
              <option value="light">Light chain only</option>
              <option value="both-stacked">Both chains (stacked)</option>
            </select>
          </div>
        )}
      </div>
    );
  }
}

const isTreeComplete = (tree) => tree && tree.nodes && !tree.nodes.error;

// Phylogenetic tree & alignment viz
// =================================
// We show this for the given selected clonal family and tree (in case there are multiple such
// trees).

// First some redux connection functions

// Helper to compute visualization data for a clone
// With the two-clone model, each clone has its own data
const computeCloneVizData = (clone, tree, label = "5p") => {
  const naiveData = getNaiveVizData(clone, label);
  const cdrBounds = naiveData.source
    .filter((region) => region.region === 'CDR1' || region.region === 'CDR2' || region.region === 'CDR3')
    .flatMap((region) => [
      { x: Math.floor(region.start / 3) - 0.5, region: region.region },
      { x: Math.floor(region.end / 3) + 0.5, region: region.region }
    ]);
  const treeData = treesSelector.computeTreeData(tree);
  return { naiveData, cdrBounds, treeData };
};

const mapStateToProps = (state) => {
  const selectedFamily = clonalFamiliesSelectors.getSelectedFamily(state);
  const selectedTree = treesSelector.getSelectedTree(state);
  const selectedChain = state.clonalFamilies.selectedChain || "heavy";
  // Use getAllClonalFamilies (not filtered by locus) so we can find paired clones
  // even when they're filtered out of the scatterplot
  const allClonalFamilies = getAllClonalFamilies(state);
  const treeCache = state.trees.cache;

  // idea is that none of these selectors will work (or be needed) if tree data isn't in yet
  if (selectedFamily && selectedTree && isTreeComplete(selectedTree)) {
    const isBothMode = selectedChain === "both-stacked" || selectedChain === "both-side-by-side";
    const isLightMode = selectedChain === "light";

    // Determine the actual chain type of the selected family
    const selectedFamilyChain = clonalFamiliesSelectors.getCloneChain(selectedFamily);
    const selectedIsHeavy = selectedFamilyChain === "heavy";

    // For paired data, look up the paired clone and its tree
    let pairedClone = null;
    let pairedTree = null;
    if (selectedFamily.is_paired) {
      pairedClone = getPairedClone(allClonalFamilies, selectedFamily);
      if (pairedClone) {
        // Get the paired clone's tree from cache
        pairedTree = treesSelector.getTreeFromCache(treeCache, pairedClone, null);
      }
    }

    // Determine which clone/tree is heavy and which is light
    // This handles the case where the user selected the light chain clone from the table
    const heavyClone = selectedIsHeavy ? selectedFamily : pairedClone;
    const heavyCloneTree = selectedIsHeavy ? selectedTree : pairedTree;
    const lightClone = selectedIsHeavy ? pairedClone : selectedFamily;
    const lightCloneTree = selectedIsHeavy ? pairedTree : selectedTree;

    if (isBothMode) {
      // Compute data for both chains
      let heavyVizData = null;
      let lightVizData = null;

      if (heavyClone && heavyCloneTree && isTreeComplete(heavyCloneTree)) {
        heavyVizData = computeCloneVizData(heavyClone, heavyCloneTree, "5p");
      }
      if (lightClone && lightCloneTree && isTreeComplete(lightCloneTree)) {
        lightVizData = computeCloneVizData(lightClone, lightCloneTree, "5p");
      }

      return {
        selectedFamily,
        selectedTree,
        selectedChain,
        selectedSeq: state.clonalFamilies.selectedSeq,
        pairedClone,
        heavyClone,
        lightClone,
        // Heavy chain data
        heavyNaiveData: heavyVizData ? heavyVizData.naiveData : null,
        heavyCdrBounds: heavyVizData ? heavyVizData.cdrBounds : null,
        heavyTree: heavyVizData ? heavyVizData.treeData : null,
        // Light chain data
        lightNaiveData: lightVizData ? lightVizData.naiveData : null,
        lightCdrBounds: lightVizData ? lightVizData.cdrBounds : null,
        lightTree: lightVizData ? lightVizData.treeData : null
      };
    } else if (isLightMode) {
      // Light chain only mode
      if (lightClone && lightCloneTree && isTreeComplete(lightCloneTree)) {
        const vizData = computeCloneVizData(lightClone, lightCloneTree, "5p");
        return {
          selectedFamily,
          selectedTree: lightCloneTree,
          naiveData: vizData.naiveData,
          tree: vizData.treeData,
          selectedSeq: state.clonalFamilies.selectedSeq,
          selectedChain,
          cdrBounds: vizData.cdrBounds,
          pairedClone,
          lightClone
        };
      }
      // Light chain not available - return error state instead of falling through
      return {
        selectedFamily,
        selectedTree,
        selectedChain,
        selectedSeq: state.clonalFamilies.selectedSeq,
        lightChainUnavailable: true,
        pairedClone,
        lightClone
      };
    }

    // Heavy chain mode (default) - use heavy clone's data
    if (heavyClone && heavyCloneTree && isTreeComplete(heavyCloneTree)) {
      const vizData = computeCloneVizData(heavyClone, heavyCloneTree, "5p");
      return {
        selectedFamily,
        selectedTree: heavyCloneTree,
        naiveData: vizData.naiveData,
        tree: vizData.treeData,
        selectedSeq: state.clonalFamilies.selectedSeq,
        selectedChain,
        cdrBounds: vizData.cdrBounds,
        pairedClone,
        heavyClone
      };
    }

    // Fallback - use whatever we have (selectedFamily)
    const vizData = computeCloneVizData(selectedFamily, selectedTree, "5p");
    return {
      selectedFamily,
      selectedTree,
      naiveData: vizData.naiveData,
      tree: vizData.treeData,
      selectedSeq: state.clonalFamilies.selectedSeq,
      selectedChain,
      cdrBounds: vizData.cdrBounds
    };
  }
  return { selectedFamily, selectedTree, selectedChain };
};

// now for the actual component definition

@connect(mapStateToProps, (dispatch) => ({
  dispatchSelectedSeq: (seq) => {
    dispatch(explorerActions.updateSelectedSeq(seq));
  },
  dispatchSelectFamily: (family_ident) => {
    dispatch(explorerActions.selectFamily(family_ident));
  },
  dispatchLastClickedChain: (chain) => {
    dispatch(explorerActions.updateLastClickedChain(chain));
  },
  dispatchSelectedChain: (chain) => {
    dispatch(explorerActions.updateSelectedChain(chain));
  }
}))
class TreeViz extends React.Component {
  constructor(props) {
    super(props);
    // Spec with controls (for light chain in stacked mode, or single chain mode)
    this.spec = concatTreeWithAlignmentSpec({ showControls: true });
    // Spec without controls (for heavy chain in stacked mode - mirrors light chain settings)
    // Also hides legend and removes top padding for compact layout
    this.specNoControls = concatTreeWithAlignmentSpec({ showControls: false, showLegend: false, topPadding: 0 });
    this.treeDataFromProps = this.treeDataFromProps.bind(this);
    this.getChainData = this.getChainData.bind(this);
    this.handleLightChainSignal = this.handleLightChainSignal.bind(this);
    // Refs to access Vega views for signal synchronization
    this.heavyVegaRef = React.createRef();
    this.lightVegaRef = React.createRef();
    // List of signals to synchronize between light and heavy chain
    this.syncedSignals = [
      "max_leaf_size", "leaf_size_by", "branch_width_by", "branch_color_by",
      "branch_color_scheme", "min_color_value", "show_labels", "fixed_branch_lengths",
      "tree_group_width_ratio", "show_alignment", "show_mutation_borders", "viz_height_ratio"
    ];
    // Signals that can be changed via drag on either view (bidirectional)
    this.bidirectionalSignals = ["tree_group_width_ratio", "show_alignment", "viz_height_ratio"];
    this.tempVegaData = {
      source_0: [],
      source_1: [],
      naive_data: [],
      cdr_bounds: [{ x: 0 }, { x: 100 }],
      leaves_count_incl_naive: 42,
      pts_tuple: [],
      seed: []
    };
  }

  // Handle signal changes from light chain and propagate to heavy chain
  handleLightChainSignal(signalName, value) {
    if (this.heavyVegaRef.current) {
      try {
        this.heavyVegaRef.current.signal(signalName, value).run();
      } catch (e) {
        // Signal may not exist or view not ready
      }
    }
  }

  // Set up signal listeners on the light chain view to sync with heavy chain
  setupLightChainSignalSync(lightView, initialHeightRatio = null) {
    this.lightVegaRef.current = lightView;

    // Set initial height ratio for stacked mode
    if (initialHeightRatio !== null) {
      lightView.signal("viz_height_ratio", initialHeightRatio).run();
      // Also sync to heavy chain
      this.handleLightChainSignal("viz_height_ratio", initialHeightRatio);
    }

    this.syncedSignals.forEach((signalName) => {
      lightView.addSignalListener(signalName, (name, value) => {
        this.handleLightChainSignal(name, value);
      });
    });
  }

  // Handle signal changes from heavy chain and propagate to light chain (for bidirectional signals)
  handleHeavyChainSignal(signalName, value) {
    if (this.lightVegaRef.current) {
      try {
        this.lightVegaRef.current.signal(signalName, value).run();
      } catch (e) {
        // Signal may not exist or view not ready
      }
    }
  }

  // Set up signal listeners on the heavy chain view for bidirectional sync (divider drag)
  setupHeavyChainSignalSync(heavyView) {
    this.heavyVegaRef.current = heavyView;
    this.bidirectionalSignals.forEach((signalName) => {
      heavyView.addSignalListener(signalName, (name, value) => {
        this.handleHeavyChainSignal(name, value);
      });
    });
  }

  // Sync leaf selection from heavy to light chain view
  syncSelectionToLightChain(yTree) {
    if (this.lightVegaRef.current) {
      try {
        this.lightVegaRef.current.signal("selected_leaf_y_tree", yTree).run();
      } catch (e) {
        // View not ready
      }
    }
  }

  // Sync leaf selection from light to heavy chain view
  syncSelectionToHeavyChain(yTree) {
    if (this.heavyVegaRef.current) {
      try {
        this.heavyVegaRef.current.signal("selected_leaf_y_tree", yTree).run();
      } catch (e) {
        // View not ready
      }
    }
  }

  componentDidMount() {
    const { selectedFamily, dispatchSelectFamily } = this.props;
    // Automatically request a tree for the selected family
    // when the component is first inserted into the DOM tree.
    const familyId = selectedFamily?.ident || selectedFamily?.clone_id;
    if (familyId) {
      dispatchSelectFamily(familyId);
    }
  }

  componentDidUpdate(prevProps) {
    const { selectedFamily, selectedChain, dispatchSelectedChain } = this.props;
    // When family changes, check if we need to reset chain selection
    if (selectedFamily && selectedFamily !== prevProps.selectedFamily) {
      const isBothMode = selectedChain === "both-stacked" || selectedChain === "both-side-by-side";
      const isLightMode = selectedChain === "light";
      // If in "both" or "light" mode but new family is not paired, reset to "heavy"
      if ((isBothMode || isLightMode) && !selectedFamily.is_paired) {
        dispatchSelectedChain("heavy");
      }
    }
  }

  // Get data for a specific chain (used in both modes)
  getChainData(chain) {
    const { heavyClone, lightClone, heavyTree, lightTree, heavyNaiveData, lightNaiveData, heavyCdrBounds, lightCdrBounds } = this.props;
    const tree = chain === "heavy" ? heavyTree : lightTree;
    const naiveData = chain === "heavy" ? heavyNaiveData : lightNaiveData;
    const cdrBounds = chain === "heavy" ? heavyCdrBounds : lightCdrBounds;
    // Use the actual heavy/light clone for family data (for seed_id lookup)
    const cloneForChain = chain === "heavy" ? heavyClone : lightClone;

    // Handle missing chain data gracefully
    if (!tree || !naiveData || !cloneForChain) {
      return this.tempVegaData;
    }

    return {
      source_0: tree.nodes,
      source_1: tree.tips_alignment,
      naive_data: naiveData.source,
      cdr_bounds: cdrBounds,
      leaves_count_incl_naive: tree.leaves_count_incl_naive,
      pts_tuple: cloneForChain,
      seed: cloneForChain.seed_id === null ? [] : [{ id: cloneForChain.seed_id }]
    };
  }

  // Try to source data for the vega viz from props instead of faking
  // with the empty data attribute set in the constructor
  treeDataFromProps() {
    const { tree, naiveData, cdrBounds, selectedFamily } = this.props;
    return {
      source_0: tree.nodes,
      source_1: tree.tips_alignment,
      naive_data: naiveData.source,
      cdr_bounds: cdrBounds,
      leaves_count_incl_naive: tree.leaves_count_incl_naive,
      pts_tuple: selectedFamily,
      // Here we create a separate dataset only containing the id of the
      // seed sequence so as to check quickly for this id within the
      // viz to color the seed blue
      seed: selectedFamily.seed_id === null ? [] : [{ id: selectedFamily.seed_id }]
    };
  }

  render() {
    const { selectedFamily, selectedTree, selectedSeq, tree, heavyTree, lightTree, dispatchSelectedSeq, dispatchLastClickedChain, selectedChain, lightChainUnavailable } = this.props;
    // TODO #94: We need to have a better way to tell if a family should not be
    // displayed because its data are incomplete. One idea is an 'incomplete' field
    // that we can set to true (upon building and checking for valid data) and have some
    // minimum bit of information saying the error that occured and/or the field that was not built.
    const incompleteFamily = !selectedFamily.unique_seqs_count || !selectedFamily.trees;

    // Being explicit about the fact that we are relying on the tree being
    // defined vs undefined instead of keeping track of its true loading state
    const treeLoading = !selectedTree;

    const incompleteTree = !treeLoading && !isTreeComplete(selectedTree);
    const completeData = !incompleteFamily && !treeLoading && isTreeComplete(selectedTree);

    const isStackedMode = selectedChain === "both-stacked";
    const isSideBySideMode = selectedChain === "both-side-by-side";
    const isBothMode = isStackedMode || isSideBySideMode;

    // Use heavyTree for downloads in both mode, otherwise use tree
    const downloadTree = isBothMode ? heavyTree : tree;

    return (
      <div>
        {/* Tree still loading aka undefined */}
        {!incompleteFamily && treeLoading && (
          <div>
            <h2 style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <SimpleInProgress />
              Loading data for clonal family: {selectedFamily.clone_id}
            </h2>
          </div>
        )}
        {/* Warn user if data does not have necessary fields according to incompleteFamily, incompleteTree */}
        {incompleteFamily && <IncompleteDataWarning data_type="clonal family" datum={selectedFamily} />}
        {incompleteTree && <IncompleteDataWarning data_type="tree" datum={selectedTree} />}
        {/* Show tree header if complete family, tree */}
        {completeData && (
          <TreeHeader
            selectedFamily={selectedFamily}
            selectedTree={selectedTree}
            selectedSeq={selectedSeq}
            tree={isBothMode ? heavyTree : tree}
          />
        )}

        {/* Stacked mode: render two separate tree/alignment visualizations */}
        {/* Light chain has controls, heavy chain mirrors light chain settings */}
        {isStackedMode && completeData && (
          <div>
            <h4 style={{ marginBottom: "5px", marginTop: "10px" }}>Heavy Chain (above) / Light Chain (below)</h4>
            <Vega
              onParseError={(...args) => console.error("parse error:", args)}
              onSignalPts_tuple={(...args) => {
                const node = args.slice(1)[0];
                if (node && node.parent) {
                  dispatchSelectedSeq(node.sequence_id);
                  dispatchLastClickedChain("heavy");
                  // Sync selection to light chain view
                  this.syncSelectionToLightChain(node.y_tree);
                }
              }}
              onNewView={(view) => this.setupHeavyChainSignalSync(view)}
              debug
              data={this.getChainData("heavy")}
              spec={this.specNoControls}
            />
            {lightTree ? (
              <Vega
                onParseError={(...args) => console.error("parse error:", args)}
                onSignalPts_tuple={(...args) => {
                  const node = args.slice(1)[0];
                  if (node && node.parent) {
                    dispatchSelectedSeq(node.sequence_id);
                    dispatchLastClickedChain("light");
                    // Sync selection to heavy chain view
                    this.syncSelectionToHeavyChain(node.y_tree);
                  }
                }}
                onNewView={(view) => this.setupLightChainSignalSync(view, 0.4)}
                debug
                data={this.getChainData("light")}
                spec={this.spec}
              />
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "10px", padding: "10px", backgroundColor: "#fff3f3", border: "1px solid #ffcccc", borderRadius: "4px" }}>
                <span style={{ color: "#cc0000", fontSize: "18px", fontWeight: "bold" }}>✗</span>
                <span style={{ color: "#cc0000" }}>
                  Light chain tree data not available. The paired clone may not be loaded yet.
                </span>
              </div>
            )}
          </div>
        )}

        {/* Side-by-side mode: In development */}
        {isSideBySideMode && completeData && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "10px", padding: "12px", backgroundColor: "#fff8e6", border: "1px solid #ffcc00", borderRadius: "4px" }}>
            <span style={{ color: "#cc8800", fontSize: "18px" }}>⚠</span>
            <span style={{ color: "#806600" }}>
              Side-by-side view is currently in development. Please use the stacked view for now.
            </span>
          </div>
        )}

        {/* Single chain mode: light chain unavailable error */}
        {!isBothMode && lightChainUnavailable && (
          <div>
            <TreeHeader
              selectedFamily={selectedFamily}
              selectedTree={selectedTree}
              selectedSeq={selectedSeq}
              tree={tree}
            />
            <h4 style={{ marginBottom: "5px", marginTop: "10px" }}>Light Chain</h4>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "10px", padding: "10px", backgroundColor: "#fff3f3", border: "1px solid #ffcccc", borderRadius: "4px" }}>
              <span style={{ color: "#cc0000", fontSize: "18px", fontWeight: "bold" }}>✗</span>
              <span style={{ color: "#cc0000" }}>
                Light chain tree data not available. The paired clone may not be loaded yet.
              </span>
            </div>
          </div>
        )}

        {/* Single chain mode: original Vega component */}
        {!isBothMode && !lightChainUnavailable && completeData && (() => {
          // Determine chain label: for paired data use selectedChain, for non-paired use locus
          const chainType = selectedFamily.is_paired
            ? selectedChain
            : clonalFamiliesSelectors.getCloneChain(selectedFamily);
          const chainLabel = chainType === "heavy" ? "Heavy Chain" : "Light Chain";
          return (
            <div>
              <h4 style={{ marginBottom: "5px", marginTop: "10px" }}>{chainLabel}</h4>
              <Vega
                onParseError={(...args) => console.error("parse error:", args)}
                onSignalPts_tuple={(...args) => {
                  const node = args.slice(1)[0];
                  if (node && node.parent) {
                    // update selected sequence for lineage mode if it has a parent ie if it is not a bad request
                    dispatchSelectedSeq(node.sequence_id);
                  }
                }}
                debug
                // logLevel={vega.Debug} // https://vega.github.io/vega/docs/api/view/#view_logLevel
                data={this.treeDataFromProps()}
                spec={this.spec}
              />
            </div>
          );
        })()}
        {!isBothMode && !lightChainUnavailable && !completeData && (
          <Vega
            onParseError={(...args) => console.error("parse error:", args)}
            onSignalPts_tuple={(...args) => {
              const node = args.slice(1)[0];
              if (node && node.parent) {
                dispatchSelectedSeq(node.sequence_id);
              }
            }}
            debug
            data={this.tempVegaData}
            spec={this.spec}
          />
        )}

        {/* Show downloads if complete family, tree */}
        {completeData && downloadTree && downloadTree.download_unique_family_seqs && (
          <div style={{ marginTop: "10px" }}>
            <div style={{ marginBottom: "8px" }}>
              <DownloadFasta
                sequencesSet={downloadTree.download_unique_family_seqs.slice()}
                filename={(selectedFamily.sample_id || selectedFamily.subject_id || "sample").concat(
                  "-",
                  selectedFamily.clone_id,
                  ".fasta"
                )}
                label="Download Fasta: Unique Sequences In This Tree"
              />
            </div>
            <div>
              <DownloadText
                text={selectedTree.newick}
                filename={(selectedFamily.sample_id || selectedFamily.subject_id || "sample").concat(
                  "-",
                  selectedFamily.clone_id,
                  "-newick",
                  ".txt"
                )}
                label="Download Clonal Family Tree Newick String"
              />
            </div>
          </div>
        )}
      </div>
    );
  }
}

export { TreeViz };
