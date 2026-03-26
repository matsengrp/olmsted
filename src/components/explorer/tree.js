import { connect } from "react-redux";
import React from "react";
import { FiEye, FiEyeOff, FiGitBranch, FiRotateCcw } from "react-icons/fi";
import VegaChart from "../util/VegaChart";
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
import {
  getPairedClone,
  getAllClonalFamilies,
  getHeavyLightClones,
  getSelectedDatasetFields
} from "../../selectors/clonalFamilies";
import { CHAIN_TYPES, isBothChainsMode, isStackedMode, isSideBySideMode } from "../../constants/chainTypes";
import VegaViewContext from "../config/VegaViewContext";
import { VegaExportToolbar } from "../util/VegaExportButton";

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
    const { selectedFamily, tree, dispatchSelectedTree, selectedSeq, selectedChain, dispatchSelectedChain } =
      this.props;
    return (
      <div>
        <CollapseHelpTitle
          titleText={`Clonal Family Details for: "${selectedFamily.sample_id || selectedFamily.subject_id || "sample"} ${selectedFamily.clone_id}"`}
          helpText={
            <div>
              For a selected clonal family, its phylogenetic tree is visualized below. Alongside the tree is an
              alignment of the sequences at the tree&apos;s tips. Colors indicate amino acid mutations at each position
              that differs from the sequence at the root of the tree (typically the family&apos;s inferred naive
              antibody sequence). The tree&apos;s leaves are displayed as scaled markers showing the multiplicity (i.e.
              the number of downsampled and deduplicated sequences) represented by a given sequence, with wedges colored
              according to sampling timepoint. See the <a href="https://github.com/matsengrp/olmsted#readme">README</a>{" "}
              to learn more about AIRR, PCP, or Olmsted data schemas and field descriptions.
              <br />
              <br />
              <strong>Ancestral Reconstruction Method:</strong> Select among alternate phylogenies using the Ancestral
              reconstruction method dropdown menu. These methods are specified in the input data according to the
              phylogenetic inference tool used.
              <br />
              <br />
              <strong>Paired Heavy/Light Chain Data:</strong> For paired data, a Chain dropdown menu appears below,
              allowing you to select which chain to visualize: heavy chain only, light chain only, or both chains
              stacked.
              <br />
              <br />
              <strong>Mouse + Keyboard Controls:</strong>
              <ul style={{ marginTop: "5px", paddingLeft: "20px", marginBottom: "10px" }}>
                <li>
                  <strong>Click</strong> on leaf labels or markers to select sequences for lineage analysis
                </li>
                <li>
                  <strong>Scroll</strong> over tree section to zoom vertically
                </li>
                <li>
                  <strong>Scroll</strong> over alignment section to zoom horizontally
                </li>
                <li>
                  <strong>Drag</strong> to pan the view
                </li>
                <li>
                  <strong>Drag scrollbar:</strong> When the alignment is zoomed, a draggable scrollbar appears at the
                  bottom for horizontal panning
                </li>
                <li>
                  <strong>Hold Shift:</strong> Temporarily switch between Select and Pan/Zoom modes
                </li>
                <li>
                  <strong>Double-click:</strong> Reset zoom and pan to default view
                </li>
              </ul>
              <strong>Note:</strong> Clicking on the plot enters focused mode, where scroll events will zoom the plot
              instead of scrolling the page. Click outside the plot to exit focused mode and restore normal page
              scrolling.
              <br />
              <br />
              <strong>Button Controls:</strong>
              <ul style={{ marginTop: "5px", paddingLeft: "20px", marginBottom: "10px" }}>
                <li>
                  <strong>Tree +/−:</strong> Zoom tree section vertically
                </li>
                <li>
                  <strong>Align +/−:</strong> Zoom alignment section horizontally
                </li>
                <li>
                  <strong>Reset View:</strong> Reset all zoom and pan to default view
                </li>
              </ul>
              <strong>Plot Customization:</strong> Use the controls below the tree to configure:
              <ul style={{ marginTop: "5px", paddingLeft: "20px", marginBottom: "10px" }}>
                <li>
                  <strong>Tree width ratio:</strong> Adjust the relative width of the tree vs. alignment panels
                </li>
                <li>
                  <strong>Leaf size by:</strong> Scale leaf marker size by a continuous field
                </li>
                <li>
                  <strong>Max leaf size:</strong> Set maximum leaf marker diameter
                </li>
                <li>
                  <strong>Show labels:</strong> Toggle tree tip labels on and off
                </li>
                <li>
                  <strong>Branch width and color:</strong> Map branch visual properties to continuous fields
                </li>
                <li>
                  <strong>Color scheme:</strong> Choose color palette for branch coloring
                </li>
              </ul>
              <strong>Branch Metrics:</strong> The following phylogenetic metrics can be used to color or size branches:
              <ul style={{ marginTop: "5px", paddingLeft: "20px", marginBottom: "10px" }}>
                <li>
                  <strong>LBI (Local Branching Index):</strong> Measures the local tree imbalance around each branch,
                  useful for identifying rapidly expanding lineages
                </li>
                <li>
                  <strong>LBR (Local Branching Ratio):</strong> Ratio-based measure of local branching patterns
                </li>
                <li>
                  <strong>Parent:</strong> Colors branches by parentage; sibling branches share a common color
                </li>
              </ul>
              <strong>Lineage Selection:</strong> To view the ancestral sequence lineage for a specific sequence, click
              on a leaf&apos;s label (or on the center of the leaf marker). The Ancestral Sequences section will appear
              below the tree showing the mutational history from naive to the selected sequence.
              <br />
              <br />
              <strong>Export &amp; Display Options:</strong>
              <ul style={{ marginTop: "5px", paddingLeft: "20px" }}>
                <li>
                  <strong>Hide Plot Settings:</strong> Toggle off the on-plot settings panel for a cleaner view
                </li>
                <li>
                  <strong>Export PNG/SVG:</strong> Save the tree visualization as an image
                </li>
              </ul>
              <strong>Tip:</strong> Plot settings can be saved as configurations via the Settings menu in the header.
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
              <option value={CHAIN_TYPES.HEAVY}>Heavy chain only</option>
              <option value={CHAIN_TYPES.LIGHT}>Light chain only</option>
              <option value={CHAIN_TYPES.BOTH_STACKED}>Both chains (stacked)</option>
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
    .filter((region) => region.region === "CDR1" || region.region === "CDR2" || region.region === "CDR3")
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
  const dataFields = getSelectedDatasetFields(state);
  // Use getAllClonalFamilies (not filtered by locus) so we can find paired clones
  // even when they're filtered out of the scatterplot
  const allClonalFamilies = getAllClonalFamilies(state);
  const treeCache = state.trees.cache;

  // idea is that none of these selectors will work (or be needed) if tree data isn't in yet
  if (selectedFamily && selectedTree && isTreeComplete(selectedTree)) {
    const isBothMode = isBothChainsMode(selectedChain);
    const isLightMode = selectedChain === CHAIN_TYPES.LIGHT;

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
    const { heavyClone, lightClone } = getHeavyLightClones(selectedFamily, pairedClone);
    const selectedFamilyChain = clonalFamiliesSelectors.getCloneChain(selectedFamily);
    const selectedIsHeavy = selectedFamilyChain === CHAIN_TYPES.HEAVY;
    const heavyCloneTree = selectedIsHeavy ? selectedTree : pairedTree;
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
        lightTree: lightVizData ? lightVizData.treeData : null,
        dataFields
      };
    }
    if (isLightMode) {
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
          lightClone,
          dataFields
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
        lightClone,
        dataFields
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
        heavyClone,
        dataFields
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
      cdrBounds: vizData.cdrBounds,
      dataFields
    };
  }
  return { selectedFamily, selectedTree, selectedChain, dataFields };
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
  static contextType = VegaViewContext;

  constructor(props) {
    super(props);
    this.state = {
      // Track the current Vega view for export functionality
      currentVegaView: null,
      // Toggle to hide/show Vega control bindings
      hideControls: false,
      // Vega rendering error message (shown to user)
      vegaError: null,
      // Subtree focus: sequence_id of the root of the focused subtree (null = full tree)
      subtreeRoot: null
    };
    this.handleVegaError = this.handleVegaError.bind(this);
    this.focusSubtree = this.focusSubtree.bind(this);
    this.resetSubtree = this.resetSubtree.bind(this);
    // Saved Vega signal values to restore after subtree focus re-mount
    this.savedSignals = null;
    // User-configurable signals to preserve across re-mounts
    this.preservedSignalNames = [
      "max_leaf_size",
      "leaf_size_by",
      "branch_width_by",
      "branch_color_by",
      "branch_color_scheme",
      "min_color_value",
      "show_labels",
      "fixed_branch_lengths",
      "tree_group_width_ratio",
      "viz_height_ratio",
      "show_alignment",
      "show_mutation_borders",
      "color_by_surprise"
    ];
    // Specs are memoized and regenerated only when dataFields changes
    this.lastDataFields = null;
    this.spec = concatTreeWithAlignmentSpec({ showControls: true });
    this.specNoControls = concatTreeWithAlignmentSpec({ showControls: false, showLegend: false, topPadding: 0 });
    this.treeDataFromProps = this.treeDataFromProps.bind(this);
    this.getChainData = this.getChainData.bind(this);
    this.handleLightChainSignal = this.handleLightChainSignal.bind(this);
    this.handleWindowClick = this.handleWindowClick.bind(this);
    this.handleWheel = this.handleWheel.bind(this);
    // Container ref for click-outside detection
    this.containerRef = React.createRef();
    // Refs to access Vega views for signal synchronization and focus control
    this.heavyVegaRef = React.createRef();
    this.lightVegaRef = React.createRef();
    // Ref for single-chain mode Vega view
    this.singleVegaRef = null;
    // Track focus state for scroll prevention
    this.isFocused = false;
    this.setupSingleChainView = this.setupSingleChainView.bind(this);
    // List of signals to synchronize between light and heavy chain
    this.syncedSignals = [
      "max_leaf_size",
      "leaf_size_by",
      "branch_width_by",
      "branch_color_by",
      "branch_color_scheme",
      "min_color_value",
      "show_labels",
      "fixed_branch_lengths",
      "tree_group_width_ratio",
      "show_alignment",
      "show_mutation_borders",
      "viz_height_ratio"
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

  toggleHideControls = () => {
    this.setState((prevState) => ({ hideControls: !prevState.hideControls }));
  };

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

    // Update state for export functionality
    this.setState({ currentVegaView: lightView });

    // Register view with context for config management (use light chain since it has controls)
    if (this.context && this.context.setTreeView) {
      this.context.setTreeView(lightView);
    }

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
    // Listen for focus changes to sync with React
    lightView.addSignalListener("viz_focused", (name, value) => {
      if (value) this.isFocused = true;
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

  /**
   * Set up a single-chain Vega view with common signal listeners.
   * Used by both the default single-chain render and the loading-state render.
   *
   * @param {Object} view - Vega View instance
   * @param {Function} dispatchSelectedSeq - Redux action for sequence selection
   */
  setupSingleChainView(view, dispatchSelectedSeq) {
    this.singleVegaRef = view;
    this.setState({ currentVegaView: view });
    if (this.context && this.context.setTreeView) {
      this.context.setTreeView(view);
    }

    // Restore saved signals from before subtree re-mount
    if (this.savedSignals) {
      for (const [name, value] of Object.entries(this.savedSignals)) {
        try {
          view.signal(name, value);
        } catch (e) {
          // Signal may not exist in this spec variant
        }
      }
      view.runAsync();
      this.savedSignals = null;
    }

    view.addSignalListener("viz_focused", (name, value) => {
      if (value) this.isFocused = true;
    });
    view.addSignalListener("pts_tuple", (name, node) => {
      if (node && node.parent) {
        dispatchSelectedSeq(node.sequence_id);
      }
    });
  }

  /**
   * Handle Vega rendering errors — log to console and show to user.
   */
  handleVegaError(...args) {
    const errorMsg = args[0] instanceof Error ? args[0].message : String(args[0]);
    console.error("Vega error:", ...args);
    this.setState({ vegaError: errorMsg });
  }

  /**
   * Focus the tree view on the subtree rooted at the currently selected node.
   */
  /**
   * Save current Vega signal values so they can be restored after re-mount.
   */
  saveSignals() {
    const view = this.singleVegaRef;
    if (!view) return;
    const saved = {};
    for (const name of this.preservedSignalNames) {
      try {
        saved[name] = view.signal(name);
      } catch (e) {
        // Signal may not exist in this spec variant
      }
    }
    this.savedSignals = saved;
  }

  focusSubtree() {
    const { selectedSeq } = this.props;
    if (selectedSeq) {
      this.saveSignals();
      this.setState({ subtreeRoot: selectedSeq, vegaError: null });
    }
  }

  /**
   * Reset to showing the full tree.
   */
  resetSubtree() {
    this.saveSignals();
    this.setState({ subtreeRoot: null, vegaError: null });
  }

  /**
   * Get direct children of a given node from the tree's nodes array.
   */
  /**
   * Normalize nodes to an array (they may be an object keyed by sequence_id or an array).
   */
  normalizeNodes(nodes) {
    if (!nodes) return [];
    return Array.isArray(nodes) ? nodes : Object.values(nodes);
  }

  getDirectChildren(nodes, parentId) {
    if (!parentId) return [];
    const arr = this.normalizeNodes(nodes);
    return arr
      .filter((n) => n.parent === parentId)
      .sort((a, b) => String(a.sequence_id).localeCompare(String(b.sequence_id)));
  }

  /**
   * Get the current effective root — subtreeRoot if focused, otherwise the tree root.
   */
  getEffectiveRootId(nodes) {
    if (this.state.subtreeRoot) return this.state.subtreeRoot;
    const arr = this.normalizeNodes(nodes);
    if (arr.length === 0) return null;
    const root = arr.find((n) => !n.parent || n.type === "root");
    return root ? root.sequence_id : null;
  }

  /**
   * Render the subtree navigation bar (focus/reset buttons + children dropdown).
   */
  renderSubtreeNav(tree) {
    const { selectedSeq, dispatchSelectedSeq } = this.props;
    const { subtreeRoot } = this.state;
    const nodes = tree ? tree.nodes : null;
    const effectiveRoot = this.getEffectiveRootId(nodes);
    const children = this.getDirectChildren(nodes, effectiveRoot);

    const labelStyle = { color: "#666", fontWeight: "normal" };
    const valueStyle = { color: "#333", fontWeight: 500 };
    const btnStyle = {
      display: "inline-flex",
      alignItems: "center",
      gap: 4,
      padding: "3px 7px",
      fontSize: 12,
      border: "1px solid #ccc",
      borderRadius: 4,
      cursor: "pointer",
      transition: "all 0.15s ease"
    };

    return (
      <div style={{ marginBottom: 6, fontSize: 12 }}>
        {/* Status line */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
          <span>
            <span style={labelStyle}>Root: </span>
            <span style={valueStyle}>{effectiveRoot || "—"}</span>
          </span>
          <span>
            <span style={labelStyle}>Selected: </span>
            <span style={valueStyle}>{selectedSeq || "—"}</span>
          </span>
        </div>
        {/* Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={this.focusSubtree}
            disabled={!selectedSeq}
            style={{
              ...btnStyle,
              backgroundColor: selectedSeq ? "#fff" : "#f5f5f5",
              color: selectedSeq ? "#333" : "#999",
              cursor: selectedSeq ? "pointer" : "default"
            }}
            title={selectedSeq ? `Focus on subtree rooted at ${selectedSeq}` : "Select a node first"}
          >
            <FiGitBranch size={12} />
            Focus Subtree
          </button>
          {subtreeRoot && (
            <button
              type="button"
              onClick={this.resetSubtree}
              style={{ ...btnStyle, backgroundColor: "#e3f2fd" }}
              title="Show full tree"
            >
              <FiRotateCcw size={12} />
              Full Tree
            </button>
          )}
          {children.length > 0 && (
            <select
              value={selectedSeq || ""}
              onChange={(e) => {
                if (e.target.value) dispatchSelectedSeq(e.target.value);
              }}
              style={{
                padding: "3px 5px",
                fontSize: 12,
                border: "1px solid #ccc",
                borderRadius: 4,
                cursor: "pointer"
              }}
              title={`Children of ${effectiveRoot}`}
            >
              <option value="" disabled>
                Children of {effectiveRoot}
              </option>
              {children.map((child) => (
                <option key={child.sequence_id} value={child.sequence_id}>
                  {child.sequence_id} ({child.type || "node"})
                </option>
              ))}
            </select>
          )}
        </div>
      </div>
    );
  }

  // Set up signal listeners on the heavy chain view for bidirectional sync (divider drag)
  setupHeavyChainSignalSync(heavyView) {
    this.heavyVegaRef.current = heavyView;
    this.bidirectionalSignals.forEach((signalName) => {
      heavyView.addSignalListener(signalName, (name, value) => {
        this.handleHeavyChainSignal(name, value);
      });
    });
    // Listen for focus changes to sync with React
    heavyView.addSignalListener("viz_focused", (name, value) => {
      if (value) this.isFocused = true;
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
    // Add window click listener to detect clicks outside the plot
    window.addEventListener("click", this.handleWindowClick);
    // Add wheel event listener with passive: false to allow preventDefault
    if (this.containerRef.current) {
      this.containerRef.current.addEventListener("wheel", this.handleWheel, { passive: false });
    }
  }

  componentWillUnmount() {
    window.removeEventListener("click", this.handleWindowClick);
    // Clean up wheel listener if it exists
    if (this.containerRef.current) {
      this.containerRef.current.removeEventListener("wheel", this.handleWheel);
    }
  }

  handleWheel(event) {
    // Prevent page scroll when visualization is focused
    if (this.isFocused) {
      event.preventDefault();
    }
  }

  handleWindowClick(event) {
    // If click was outside our container, unfocus all visualizations
    if (this.containerRef.current && !this.containerRef.current.contains(event.target)) {
      this.isFocused = false;
      // Blur heavy chain view
      if (this.heavyVegaRef.current) {
        try {
          this.heavyVegaRef.current.signal("viz_focused", false).run();
        } catch (e) {
          // View may not be ready
        }
      }
      // Blur light chain view
      if (this.lightVegaRef.current) {
        try {
          this.lightVegaRef.current.signal("viz_focused", false).run();
        } catch (e) {
          // View may not be ready
        }
      }
      // Blur single-chain view
      if (this.singleVegaRef) {
        try {
          this.singleVegaRef.signal("viz_focused", false).run();
        } catch (e) {
          // View may not be ready
        }
      }
    }
  }

  componentDidUpdate(prevProps) {
    const { selectedFamily, selectedChain, dispatchSelectedChain, tree, selectedSeq, dispatchSelectedSeq } = this.props;
    // When family changes, check if we need to reset chain selection
    if (selectedFamily && selectedFamily !== prevProps.selectedFamily) {
      // Clear any previous Vega error and subtree focus when switching families
      if (this.state.vegaError || this.state.subtreeRoot) {
        this.setState({ vegaError: null, subtreeRoot: null });
      }
      const isBothMode = isBothChainsMode(selectedChain);
      const isLightMode = selectedChain === CHAIN_TYPES.LIGHT;
      // If in "both" or "light" mode but new family is not paired, reset to "heavy"
      if ((isBothMode || isLightMode) && !selectedFamily.is_paired) {
        dispatchSelectedChain(CHAIN_TYPES.HEAVY);
      }
    }

    // Auto-select the root node when a tree first loads and no node is selected
    if (tree && tree.nodes && !selectedSeq) {
      const rootNode = tree.nodes.find((n) => !n.parent || n.type === "root");
      if (rootNode) {
        dispatchSelectedSeq(rootNode.sequence_id);
      }
    }
  }

  // Get data for a specific chain (used in both modes)
  getChainData(chain) {
    const {
      heavyClone,
      lightClone,
      heavyTree,
      lightTree,
      heavyNaiveData,
      lightNaiveData,
      heavyCdrBounds,
      lightCdrBounds
    } = this.props;

    // Validate data exists before performing assignments
    const tree = chain === CHAIN_TYPES.HEAVY ? heavyTree : lightTree;
    const naiveData = chain === CHAIN_TYPES.HEAVY ? heavyNaiveData : lightNaiveData;
    const cloneForChain = chain === CHAIN_TYPES.HEAVY ? heavyClone : lightClone;

    // Handle missing chain data gracefully - return early if critical data is missing
    if (!tree || !naiveData || !cloneForChain) {
      return this.tempVegaData;
    }

    // Only compute remaining data after validation passes
    const cdrBounds = chain === CHAIN_TYPES.HEAVY ? heavyCdrBounds : lightCdrBounds;

    return {
      source_0: tree.nodes,
      source_1: tree.tips_alignment,
      naive_data: naiveData.source,
      cdr_bounds: cdrBounds,
      leaves_count_incl_naive: tree.leaves_count_incl_naive,
      pts_tuple: cloneForChain,
      seed: cloneForChain.seed_id ? [{ id: cloneForChain.seed_id }] : []
    };
  }

  // Try to source data for the vega viz from props instead of faking
  // with the empty data attribute set in the constructor
  /**
   * Collect all descendant node IDs of a given root node.
   */
  getSubtreeNodeIds(nodes, rootId) {
    const childrenMap = {};
    for (const node of nodes) {
      if (node.parent) {
        if (!childrenMap[node.parent]) childrenMap[node.parent] = [];
        childrenMap[node.parent].push(node.sequence_id);
      }
    }
    const ids = new Set([rootId]);
    const queue = [rootId];
    while (queue.length > 0) {
      const current = queue.pop();
      const children = childrenMap[current] || [];
      for (const childId of children) {
        if (!ids.has(childId)) {
          ids.add(childId);
          queue.push(childId);
        }
      }
    }
    return ids;
  }

  treeDataFromProps() {
    const { tree, naiveData, cdrBounds, selectedFamily } = this.props;
    const { subtreeRoot } = this.state;

    let nodes = tree.nodes;
    let alignment = tree.tips_alignment;
    let leavesCount = tree.leaves_count_incl_naive;

    // Filter to subtree if focused
    if (subtreeRoot) {
      const subtreeIds = this.getSubtreeNodeIds(nodes, subtreeRoot);
      nodes = nodes
        .filter((n) => subtreeIds.has(n.sequence_id))
        .map((n) => (n.sequence_id === subtreeRoot ? { ...n, parent: null, type: "root" } : n));
      alignment = alignment.filter((m) => subtreeIds.has(m.seq_id));
      leavesCount = nodes.filter((n) => n.type === "root" || n.type === "leaf").length;
    }

    return {
      source_0: nodes,
      source_1: alignment,
      naive_data: naiveData.source,
      cdr_bounds: cdrBounds,
      leaves_count_incl_naive: leavesCount,
      pts_tuple: selectedFamily,
      seed: selectedFamily.seed_id ? [{ id: selectedFamily.seed_id }] : []
    };
  }

  render() {
    const {
      selectedFamily,
      selectedTree,
      selectedSeq,
      tree,
      heavyTree,
      lightTree,
      dispatchSelectedSeq,
      dispatchLastClickedChain,
      selectedChain,
      lightChainUnavailable,
      dataFields
    } = this.props;

    // Regenerate Vega specs when dataset field availability changes
    if (dataFields !== this.lastDataFields) {
      this.lastDataFields = dataFields;
      this.spec = concatTreeWithAlignmentSpec({ showControls: true, missingFields: dataFields?.missing_fields });
      this.specNoControls = concatTreeWithAlignmentSpec({
        showControls: false,
        showLegend: false,
        topPadding: 0,
        missingFields: dataFields?.missing_fields
      });
    }
    // TODO #94: We need to have a better way to tell if a family should not be
    // displayed because its data are incomplete. One idea is an 'incomplete' field
    // that we can set to true (upon building and checking for valid data) and have some
    // minimum bit of information saying the error that occured and/or the field that was not built.
    const incompleteFamily = !selectedFamily.unique_seqs_count;

    // Being explicit about the fact that we are relying on the tree being
    // defined vs undefined instead of keeping track of its true loading state
    const treeLoading = !selectedTree;

    const incompleteTree = !treeLoading && !isTreeComplete(selectedTree);
    const completeData = !incompleteFamily && !treeLoading && isTreeComplete(selectedTree);

    const isStacked = isStackedMode(selectedChain);
    const isSideBySide = isSideBySideMode(selectedChain);
    const isBothMode = isBothChainsMode(selectedChain);

    // Use heavyTree for downloads in both mode, otherwise use tree
    const downloadTree = isBothMode ? heavyTree : tree;

    const { hideControls, vegaError, subtreeRoot } = this.state;

    return (
      <div ref={this.containerRef}>
        {vegaError && (
          <div
            style={{
              marginBottom: "10px",
              padding: "12px",
              backgroundColor: "#f8d7da",
              border: "1px solid #dc3545",
              borderRadius: "4px",
              color: "#721c24"
            }}
          >
            <strong>Tree visualization error:</strong> {vegaError}
          </div>
        )}
        {tree && tree.data_modifications && tree.data_modifications.length > 0 && (
          <div
            style={{
              marginBottom: "10px",
              padding: "10px 14px",
              backgroundColor: "#fff3cd",
              border: "1px solid #ffc107",
              borderRadius: "4px",
              color: "#856404",
              fontSize: "12px"
            }}
          >
            <strong>Data modifications:</strong>
            <ul style={{ margin: "4px 0 0 0", paddingLeft: 18 }}>
              {tree.data_modifications.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </div>
        )}
        <div
          className={hideControls ? "hide-vega-controls" : ""}
          style={{ border: "1px solid #ddd", borderRadius: "4px", padding: "8px" }}
        >
          {/* Hide controls CSS - only applied when hideControls is true */}
          {hideControls && (
            <style>{`
              .hide-vega-controls .vega-bindings { display: none !important; }
            `}</style>
          )}
          {/* Show tree header if complete family, tree */}
          {completeData && (
            <TreeHeader
              selectedFamily={selectedFamily}
              selectedTree={selectedTree}
              selectedSeq={selectedSeq}
              tree={isBothMode ? heavyTree : tree}
            />
          )}

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

          {/* Stacked mode: render two separate tree/alignment visualizations */}
          {/* Light chain has controls, heavy chain mirrors light chain settings */}
          {isStacked && completeData && (
            <div>
              <h4 style={{ marginBottom: "5px", marginTop: "10px" }}>Heavy Chain (above) / Light Chain (below)</h4>
              <VegaChart
                onNewView={(view) => {
                  this.setupHeavyChainSignalSync(view);
                  view.addSignalListener("pts_tuple", (name, node) => {
                    if (node && node.parent) {
                      dispatchSelectedSeq(node.sequence_id);
                      dispatchLastClickedChain("heavy");
                      this.syncSelectionToLightChain(node.y_tree);
                    }
                  });
                }}
                onError={this.handleVegaError}
                data={this.getChainData("heavy")}
                spec={this.specNoControls}
              />
              {lightTree ? (
                <VegaChart
                  onNewView={(view) => {
                    this.setupLightChainSignalSync(view, 0.4);
                    view.addSignalListener("pts_tuple", (name, node) => {
                      if (node && node.parent) {
                        dispatchSelectedSeq(node.sequence_id);
                        dispatchLastClickedChain("light");
                        this.syncSelectionToHeavyChain(node.y_tree);
                      }
                    });
                  }}
                  onError={this.handleVegaError}
                  data={this.getChainData("light")}
                  spec={this.spec}
                />
              ) : (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    marginTop: "10px",
                    padding: "10px",
                    backgroundColor: "#fff3f3",
                    border: "1px solid #ffcccc",
                    borderRadius: "4px"
                  }}
                >
                  <span style={{ color: "#cc0000", fontSize: "18px", fontWeight: "bold" }}>✗</span>
                  <span style={{ color: "#cc0000" }}>
                    Light chain tree data not available. The paired clone may not be loaded yet.
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Side-by-side mode: In development */}
          {isSideBySide && completeData && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginTop: "10px",
                padding: "12px",
                backgroundColor: "#fff8e6",
                border: "1px solid #ffcc00",
                borderRadius: "4px"
              }}
            >
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
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginTop: "10px",
                  padding: "10px",
                  backgroundColor: "#fff3f3",
                  border: "1px solid #ffcccc",
                  borderRadius: "4px"
                }}
              >
                <span style={{ color: "#cc0000", fontSize: "18px", fontWeight: "bold" }}>✗</span>
                <span style={{ color: "#cc0000" }}>
                  Light chain tree data not available. The paired clone may not be loaded yet.
                </span>
              </div>
            </div>
          )}

          {/* Single chain mode: original Vega component */}
          {!isBothMode &&
            !lightChainUnavailable &&
            completeData &&
            (() => {
              // Determine chain label: for paired data use selectedChain, for non-paired use locus
              const chainType = selectedFamily.is_paired
                ? selectedChain
                : clonalFamiliesSelectors.getCloneChain(selectedFamily);
              const chainLabel = chainType === "heavy" ? "Heavy Chain" : "Light Chain";
              return (
                <div>
                  <h4 style={{ marginBottom: "5px", marginTop: "10px" }}>{chainLabel}</h4>
                  {this.renderSubtreeNav(tree)}
                  <VegaChart
                    key={`tree-${subtreeRoot || "full"}`}
                    onNewView={(view) => this.setupSingleChainView(view, dispatchSelectedSeq)}
                    onError={this.handleVegaError}
                    data={this.treeDataFromProps()}
                    spec={this.spec}
                  />
                </div>
              );
            })()}
          {!isBothMode && !lightChainUnavailable && !completeData && !incompleteFamily && !incompleteTree && (
            <div>
              {this.renderSubtreeNav(tree)}
              <VegaChart
                key={`tree-${subtreeRoot || "full"}`}
                onNewView={(view) => this.setupSingleChainView(view, dispatchSelectedSeq)}
                onError={this.handleVegaError}
                data={this.tempVegaData}
                spec={this.spec}
              />
            </div>
          )}

          {/* Export and download options */}
          {completeData && (
            <div style={{ marginTop: "10px", display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              <button
                onClick={this.toggleHideControls}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "4px 8px",
                  fontSize: 12,
                  border: "1px solid #ccc",
                  borderRadius: 4,
                  backgroundColor: hideControls ? "#e3f2fd" : "#fff",
                  color: "#333",
                  cursor: "pointer",
                  transition: "all 0.15s ease"
                }}
                title={hideControls ? "Show plot controls" : "Hide plot controls"}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = hideControls ? "#bbdefb" : "#f5f5f5";
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = hideControls ? "#e3f2fd" : "#fff";
                }}
              >
                {hideControls ? <FiEye size={14} /> : <FiEyeOff size={14} />}
                <span>{hideControls ? "Show Plot Settings" : "Hide Plot Settings"}</span>
              </button>
              <VegaExportToolbar
                vegaView={this.state.currentVegaView}
                filename={`olmsted-tree-${selectedFamily.clone_id || "family"}`}
              />
            </div>
          )}
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
      </div>
    );
  }
}

export { TreeViz };
