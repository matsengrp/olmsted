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
import { validateCloneCompleteness, validateTreeCompleteness } from "../../utils/fieldDefaults";
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

// Placeholder shown in the disabled tree dropdown when a family has no trees.
const UNSPECIFIED_TREE_LABEL = "<unspecified>";

// Shared min-width for the Chain and Tree dropdowns so longer labels aren't clipped.
const HEADER_SELECT_STYLE = { minWidth: 360 };

// Build the `key` for a Vega chart so it remounts cleanly when subtree focus
// or the treat-as-root mode toggles.
const vegaChartKey = (prefix, subtreeRoot, treatAsRoot) =>
  `${prefix}-${subtreeRoot || "full"}-${treatAsRoot ? "asroot" : "rel"}`;

// For unpaired families the Chain field is a disabled single-option select.
// Renders a dropdown locked to the family's actual chain (heavy or light).
function PinnedChainSelect({ clone }) {
  const pinnedChain = clonalFamiliesSelectors.getCloneChain(clone);
  const pinnedValue = pinnedChain === "light" ? CHAIN_TYPES.LIGHT : CHAIN_TYPES.HEAVY;
  const pinnedLabel = pinnedChain === "light" ? "Light chain only" : "Heavy chain only";
  return (
    <select id="chain-select" value={pinnedValue} disabled style={HEADER_SELECT_STYLE} aria-label="Chain selection">
      <option value={pinnedValue}>{pinnedLabel}</option>
    </select>
  );
}

/**
 * Normalize nodes to an array (they may be an object keyed by sequence_id or an array).
 */
const normalizeNodes = (nodes) => {
  if (!nodes) return [];
  return Array.isArray(nodes) ? nodes : Object.values(nodes);
};

/**
 * Filter tree data to a subtree rooted at the given node.
 * The subtree root is re-parented to null and given type "root".
 *
 * When treatAsRoot is true, the alignment is regenerated with the subtree
 * root's sequence as the new reference (naive), so mutations in the viz
 * are shown relative to the subtree root instead of the original naive.
 *
 * @param {Object[]} nodes - Full tree nodes array
 * @param {Object[]} alignment - Full alignment records
 * @param {number} leavesCount - Original leaves count
 * @param {string} subtreeRoot - sequence_id of the subtree root
 * @param {Function} getSubtreeNodeIds - Function to collect descendant IDs
 * @param {boolean} treatAsRoot - recompute alignment relative to subtree root
 * @returns {{ nodes: Object[], alignment: Object[], leavesCount: number }}
 */
const applySubtreeFilter = (nodes, alignment, leavesCount, subtreeRoot, getSubtreeNodeIds, treatAsRoot = false) => {
  if (!subtreeRoot || !nodes) return { nodes, alignment, leavesCount };
  const subtreeIds = getSubtreeNodeIds(nodes, subtreeRoot);
  const filteredNodes = nodes
    .filter((n) => subtreeIds.has(n.sequence_id))
    .map((n) => (n.sequence_id === subtreeRoot ? { ...n, parent: null, type: "root" } : n));
  const filteredCount = filteredNodes.filter((n) => n.type === "root" || n.type === "leaf").length;

  if (treatAsRoot) {
    const rootNode = filteredNodes.find((n) => n.sequence_id === subtreeRoot);
    const renderable = filteredNodes.filter((n) => n.type === "root" || n.type === "leaf");
    const regenerated = treesSelector.buildSubtreeAlignment(rootNode, renderable);
    if (regenerated) {
      return { nodes: filteredNodes, alignment: regenerated, leavesCount: filteredCount };
    }
  }

  // Keep naive (type: "naive") alignment rows — they define the x-axis and gene regions
  const filteredAlignment = alignment.filter((m) => subtreeIds.has(m.seq_id) || m.type === "naive");
  return { nodes: filteredNodes, alignment: filteredAlignment, leavesCount: filteredCount };
};

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
    if (!tree) return null;
    const treeCount = selectedFamily.trees?.length || 0;
    return (
      <div>
        <CollapseHelpTitle
          titleText="Clonal Family Tree & Alignment"
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
              <strong>Tree Selection:</strong> When a clonal family has more than one tree, use the Tree dropdown to
              switch among them. Trees may differ by reconstruction method, downsampling strategy, seed, or pipeline
              version.
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
              <strong>Surprise Score Coloring:</strong> When the dataset includes per-mutation surprise scores (computed
              by DASM mutation-selection models), a &quot;Color by surprise score&quot; toggle appears in the plot
              settings. Enabling it recolors mutation rectangles using an orange heat scale where darker values indicate
              more surprising mutations (less likely under the model). Mutations without surprise data become invisible
              so only scored mutations are visible. Hover over a colored mutation to see its surprise score, selection
              contribution, and CDR region in the tooltip. The surprise color legend appears on the right side when the
              toggle is active.
              <br />
              <br />
              <strong>Subtree Focus:</strong> The subtree navigation bar above the alignment allows you to focus the
              visualization on a subtree of the phylogeny.
              <ul style={{ marginTop: "5px", paddingLeft: "20px", marginBottom: "10px" }}>
                <li>
                  <strong>Root / Selected:</strong> Shows the current root of the displayed tree and the currently
                  selected node
                </li>
                <li>
                  <strong>Children dropdown:</strong> Lists the direct children of the current root node. Select a child
                  to highlight it without clicking in the tree
                </li>
                <li>
                  <strong>Focus Subtree:</strong> Filters the view to show only the selected node and its descendants.
                  The selected node becomes the new root
                </li>
                <li>
                  <strong>Full Tree:</strong> Resets the view to show the complete tree (appears when focused on a
                  subtree)
                </li>
              </ul>
              Plot settings (fixed branch lengths, color by surprise, etc.) are preserved when focusing or resetting.
              <br />
              <br />
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
          <span style={{ marginRight: 8 }}>Clonal Family:</span>
          <span style={{ fontWeight: "bold" }}>
            {`${selectedFamily.sample_id || selectedFamily.subject_id || "sample"} ${selectedFamily.clone_id}`}
          </span>
        </div>
        <div style={{ marginTop: "8px" }}>
          <span style={{ marginRight: 8 }}>Chain:</span>
          {selectedFamily.is_paired ? (
            <select
              id="chain-select"
              value={selectedChain}
              style={HEADER_SELECT_STYLE}
              onChange={(event) => dispatchSelectedChain(event.target.value)}
              aria-label="Chain selection"
            >
              <option value={CHAIN_TYPES.HEAVY}>Heavy chain only</option>
              <option value={CHAIN_TYPES.LIGHT}>Light chain only</option>
              <option value={CHAIN_TYPES.BOTH_STACKED}>Both chains (stacked)</option>
            </select>
          ) : (
            <PinnedChainSelect clone={selectedFamily} />
          )}
        </div>
        <div style={{ marginTop: "8px" }}>
          <span style={{ marginRight: 8 }}>{`Tree (${treeCount}):`}</span>
          {treeCount > 0 ? (
            <select
              id="tree-select"
              value={tree.ident}
              style={HEADER_SELECT_STYLE}
              onChange={(event) => dispatchSelectedTree(event.target.value, selectedFamily, selectedSeq)}
              aria-label="Tree selection"
            >
              {selectedFamily.trees.map((tree_option, idx) => {
                const label = tree_option.tree_id || tree_option.ident || `Tree ${idx + 1}`;
                // Fall back to tree.type for trees persisted in IndexedDB before the rename.
                const rawName = tree_option.name || tree_option.type;
                const name = typeof rawName === "string" ? rawName.trim() : "";
                return (
                  <option key={tree_option.ident} value={tree_option.ident}>
                    {name ? `${label} | ${name}` : label}
                  </option>
                );
              })}
            </select>
          ) : (
            <select
              id="tree-select"
              value={tree.ident || ""}
              disabled
              style={HEADER_SELECT_STYLE}
              aria-label="Tree selection"
            >
              <option value={tree.ident || ""}>{UNSPECIFIED_TREE_LABEL}</option>
            </select>
          )}
        </div>
      </div>
    );
  }
}

// Thin wrapper around validateTreeCompleteness for use in mapStateToProps
// (runs on the raw cached tree before computeTreeData processing)
const isTreeComplete = (tree) => validateTreeCompleteness(tree).complete;

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

const baseMapStateToProps = (state) => {
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

// Merge shared subtree state from Redux into the rest of the mapped props.
const mapStateToProps = (state) => ({
  ...baseMapStateToProps(state),
  subtreeRoot: state.clonalFamilies.subtreeRoot,
  treatSubtreeAsRoot: state.clonalFamilies.treatSubtreeAsRoot
});

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
  },
  dispatchSubtreeRoot: (subtreeRoot) => {
    dispatch(explorerActions.updateSubtreeRoot(subtreeRoot));
  },
  dispatchTreatSubtreeAsRoot: (treatAsRoot) => {
    dispatch(explorerActions.updateTreatSubtreeAsRoot(treatAsRoot));
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
      // Whether the user has dismissed the warnings banner for this family
      warningsDismissed: false
    };
    this.handleVegaError = this.handleVegaError.bind(this);
    this.focusSubtree = this.focusSubtree.bind(this);
    this.resetSubtree = this.resetSubtree.bind(this);
    // Saved Vega signal values to restore after subtree focus re-mount
    this.savedSignals = null;
    // User-configurable signals to preserve across re-mounts
    this.preservedSignalNames = [
      "branch_length_mode",
      "leaf_size_by",
      "max_leaf_size",
      "branch_width_by",
      "branch_color_by",
      "branch_color_scheme",
      "mutation_color_by",
      "mutation_color_scheme",
      "show_mutation_borders",
      "show_labels",
      "show_alignment",
      "tree_group_width_ratio",
      "viz_height_ratio"
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
      "branch_length_mode",
      "leaf_size_by",
      "max_leaf_size",
      "branch_width_by",
      "branch_color_by",
      "branch_color_scheme",
      "mutation_color_by",
      "mutation_color_scheme",
      "show_mutation_borders",
      "show_labels",
      "show_alignment",
      "tree_group_width_ratio",
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
      } catch (_e) {
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

    // Restore saved signals from before subtree re-mount
    if (this.savedSignals) {
      for (const [name, value] of Object.entries(this.savedSignals)) {
        try {
          lightView.signal(name, value);
        } catch (_e) {
          // Signal may not exist in this spec variant
        }
      }
      lightView.runAsync();
      this.savedSignals = null;
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
      } catch (_e) {
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
        } catch (_e) {
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
   * Save current Vega signal values so they can be restored after re-mount.
   */
  saveSignals() {
    // Try single-chain view first, fall back to light chain view (stacked mode has controls)
    const view = this.singleVegaRef || (this.lightVegaRef && this.lightVegaRef.current);
    if (!view) return;
    const saved = {};
    for (const name of this.preservedSignalNames) {
      try {
        saved[name] = view.signal(name);
      } catch (_e) {
        // Signal may not exist in this spec variant
      }
    }
    this.savedSignals = saved;
  }

  /**
   * Focus the tree view on the subtree rooted at the currently selected node.
   */
  focusSubtree() {
    const { selectedSeq, dispatchSubtreeRoot } = this.props;
    if (selectedSeq) {
      this.saveSignals();
      this.setState({ vegaError: null });
      dispatchSubtreeRoot(selectedSeq);
    }
  }

  /**
   * Reset to showing the full tree.
   */
  resetSubtree() {
    const { dispatchSubtreeRoot } = this.props;
    this.saveSignals();
    this.setState({ vegaError: null });
    dispatchSubtreeRoot(null);
  }

  /**
   * Get direct children of a given node from the tree's nodes array.
   */
  getDirectChildren(nodes, parentId) {
    if (!parentId) return [];
    const arr = normalizeNodes(nodes);
    return arr
      .filter((n) => n.parent === parentId)
      .sort((a, b) => String(a.sequence_id).localeCompare(String(b.sequence_id)));
  }

  /**
   * Get the current effective root — subtreeRoot if focused, otherwise the tree root.
   */
  getEffectiveRootId(nodes) {
    if (this.props.subtreeRoot) return this.props.subtreeRoot;
    const arr = normalizeNodes(nodes);
    if (arr.length === 0) return null;
    const root = arr.find((n) => !n.parent || n.type === "root");
    return root ? root.sequence_id : null;
  }

  /**
   * Render the subtree navigation bar (focus/reset buttons + children dropdown).
   */
  renderSubtreeNav(tree) {
    const { selectedSeq, dispatchSelectedSeq, subtreeRoot, treatSubtreeAsRoot, dispatchTreatSubtreeAsRoot } =
      this.props;
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
            <span style={valueStyle}>{(typeof effectiveRoot === "string" ? effectiveRoot : null) || "—"}</span>
          </span>
          <span>
            <span style={labelStyle}>Selected: </span>
            <span style={valueStyle}>{(typeof selectedSeq === "string" ? selectedSeq : null) || "—"}</span>
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
              value=""
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
              <option value="">Children of {typeof effectiveRoot === "string" ? effectiveRoot : "root"}</option>
              {children.map((child) => (
                <option key={child.sequence_id} value={child.sequence_id}>
                  {child.sequence_id} ({child.type || "node"})
                </option>
              ))}
            </select>
          )}
          <label
            style={{ display: "inline-flex", alignItems: "center", gap: 4, cursor: "pointer", fontSize: 12 }}
            title="When a subtree is focused, use its root as the alignment reference; mutations are shown relative to it, and this cascades into the Ancestral Sequences view."
          >
            <input
              type="checkbox"
              checked={!!treatSubtreeAsRoot}
              onChange={(e) => dispatchTreatSubtreeAsRoot(e.target.checked)}
            />
            Treat subtree as root
          </label>
        </div>
      </div>
    );
  }

  /**
   * Render the dismissible warnings banner (clone warnings + tree modifications).
   */
  renderWarningsBanner(familyWarnings, tree) {
    const treeModifications = tree?.data_modifications || [];
    const allWarnings = [...familyWarnings, ...treeModifications];
    if (allWarnings.length === 0 || this.state.warningsDismissed) return null;
    return (
      <div
        style={{
          marginBottom: 10,
          padding: "10px 14px",
          backgroundColor: "#fff3cd",
          border: "1px solid #ffc107",
          borderRadius: 4,
          color: "#856404",
          fontSize: 12
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            {familyWarnings.length > 0 && (
              <>
                <strong>Clonal family data warnings:</strong>
                <ul style={{ margin: "4px 0 6px 0", paddingLeft: 18 }}>
                  {familyWarnings.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              </>
            )}
            {treeModifications.length > 0 && (
              <>
                <strong>Data modifications:</strong>
                <ul style={{ margin: "4px 0 0 0", paddingLeft: 18 }}>
                  {treeModifications.map((m) => (
                    <li key={m}>{m}</li>
                  ))}
                </ul>
              </>
            )}
          </div>
          <button
            type="button"
            onClick={() => this.setState({ warningsDismissed: true })}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "0 2px",
              fontSize: 16,
              color: "#856404",
              lineHeight: 1,
              flexShrink: 0
            }}
            title="Dismiss warnings"
            aria-label="Dismiss warnings"
          >
            &times;
          </button>
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
      } catch (_e) {
        // View not ready
      }
    }
  }

  // Sync leaf selection from light to heavy chain view
  syncSelectionToHeavyChain(yTree) {
    if (this.heavyVegaRef.current) {
      try {
        this.heavyVegaRef.current.signal("selected_leaf_y_tree", yTree).run();
      } catch (_e) {
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
        } catch (_e) {
          // View may not be ready
        }
      }
      // Blur light chain view
      if (this.lightVegaRef.current) {
        try {
          this.lightVegaRef.current.signal("viz_focused", false).run();
        } catch (_e) {
          // View may not be ready
        }
      }
      // Blur single-chain view
      if (this.singleVegaRef) {
        try {
          this.singleVegaRef.signal("viz_focused", false).run();
        } catch (_e) {
          // View may not be ready
        }
      }
    }
  }

  componentDidUpdate(prevProps) {
    const { selectedFamily, selectedChain, dispatchSelectedChain, tree, selectedSeq, dispatchSelectedSeq } = this.props;
    // When family changes, check if we need to reset chain selection
    if (selectedFamily && selectedFamily !== prevProps.selectedFamily) {
      // Clear any previous Vega error when switching families.
      // Subtree focus is reset via the TOGGLE_FAMILY reducer case, so we don't
      // dispatch it here — but we still clear local view state.
      if (this.state.vegaError || this.props.subtreeRoot) {
        this.setState({ vegaError: null, warningsDismissed: false });
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
      const nodesArr = normalizeNodes(tree.nodes);
      const rootNode = nodesArr.find((n) => !n.parent || n.type === "root");
      if (rootNode && rootNode.sequence_id) {
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

    const { subtreeRoot, treatSubtreeAsRoot } = this.props;
    const filtered = applySubtreeFilter(
      tree.nodes,
      tree.tips_alignment,
      tree.leaves_count_incl_naive,
      subtreeRoot,
      this.getSubtreeNodeIds,
      treatSubtreeAsRoot
    );

    return {
      source_0: filtered.nodes,
      source_1: filtered.alignment,
      naive_data: naiveData.source,
      cdr_bounds: cdrBounds,
      leaves_count_incl_naive: filtered.leavesCount,
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
    const { tree, naiveData, cdrBounds, selectedFamily, subtreeRoot, treatSubtreeAsRoot } = this.props;

    const filtered = applySubtreeFilter(
      tree.nodes,
      tree.tips_alignment,
      tree.leaves_count_incl_naive,
      subtreeRoot,
      this.getSubtreeNodeIds,
      treatSubtreeAsRoot
    );

    return {
      source_0: filtered.nodes,
      source_1: filtered.alignment,
      naive_data: naiveData.source,
      cdr_bounds: cdrBounds,
      leaves_count_incl_naive: filtered.leavesCount,
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
      const specOpts = {
        missingFields: dataFields?.missing_fields,
        fieldMetadata: dataFields?.field_metadata || null
      };
      this.spec = concatTreeWithAlignmentSpec({ showControls: true, ...specOpts });
      this.specNoControls = concatTreeWithAlignmentSpec({
        showControls: false,
        showLegend: false,
        topPadding: 0,
        ...specOpts
      });
    }
    // Validate clone and tree completeness (#94)
    // Clone warnings are non-blocking — tree renders if nodes are valid
    const { reasons: familyWarnings } = validateCloneCompleteness(selectedFamily);

    const treeLoading = !selectedTree;
    const treeValidation = !treeLoading ? validateTreeCompleteness(selectedTree) : { complete: false, reasons: [] };
    const incompleteTree = !treeLoading && !treeValidation.complete;
    const completeData = !treeLoading && treeValidation.complete;

    const isStacked = isStackedMode(selectedChain);
    const isSideBySide = isSideBySideMode(selectedChain);
    const isBothMode = isBothChainsMode(selectedChain);

    // Use heavyTree for downloads in both mode, otherwise use tree
    const downloadTree = isBothMode ? heavyTree : tree;

    const { hideControls, vegaError } = this.state;
    const { subtreeRoot } = this.props;

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
        {this.renderWarningsBanner(familyWarnings, tree)}
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
          {treeLoading && (
            <div>
              <h2 style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <SimpleInProgress />
                Loading data for clonal family: {selectedFamily.clone_id}
              </h2>
            </div>
          )}
          {/* Blocking tree incompleteness error */}
          {incompleteTree && (
            <IncompleteDataWarning data_type="tree" datum={selectedTree} reasons={treeValidation.reasons} />
          )}

          {/* Stacked mode: render two separate tree/alignment visualizations */}
          {/* Light chain has controls, heavy chain mirrors light chain settings */}
          {isStacked && completeData && (
            <div>
              <h4 style={{ marginBottom: "5px", marginTop: "10px" }}>Heavy Chain (above) / Light Chain (below)</h4>
              {this.renderSubtreeNav(heavyTree || tree)}
              <VegaChart
                key={vegaChartKey("heavy", subtreeRoot, this.props.treatSubtreeAsRoot)}
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
                  key={vegaChartKey("light", subtreeRoot, this.props.treatSubtreeAsRoot)}
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
                    key={vegaChartKey("tree", subtreeRoot, this.props.treatSubtreeAsRoot)}
                    onNewView={(view) => this.setupSingleChainView(view, dispatchSelectedSeq)}
                    onError={this.handleVegaError}
                    data={this.treeDataFromProps()}
                    spec={this.spec}
                  />
                </div>
              );
            })()}
          {!isBothMode && !lightChainUnavailable && !completeData && !incompleteTree && (
            <div>
              {this.renderSubtreeNav(tree)}
              <VegaChart
                key={vegaChartKey("tree", subtreeRoot, this.props.treatSubtreeAsRoot)}
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
                type="button"
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
