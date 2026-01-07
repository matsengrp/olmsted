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
import { getPairedClone, getAllClonalFamilies, getHeavyLightClones } from "../../selectors/clonalFamilies";
import { CHAIN_TYPES, isBothChainsMode, isStackedMode, isSideBySideMode } from "../../constants/chainTypes";
import VegaViewContext from "../config/VegaViewContext";
import { VegaExportToolbar } from "../util/VegaExportButton";
import { FiEye, FiEyeOff } from "react-icons/fi";

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
          titleText={`Clonal Family Details for: "${selectedFamily.sample_id || selectedFamily.subject_id || "sample"} ${selectedFamily.clone_id}"`}
          helpText={
            <div>
              For a selected clonal family, its phylogenetic tree is visualized below. Alongside the tree is an alignment
              of the sequences at the tree&apos;s tips. Colors indicate amino acid
              mutations at each position that differs from the sequence at the root of the tree (typically the
              family&apos;s inferred naive antibody sequence). The tree&apos;s leaves are displayed as scaled markers
              showing the multiplicity (i.e. the number of downsampled and deduplicated sequences) represented by a given
              sequence, with wedges colored according to sampling timepoint. See the{" "}
              <a href="https://github.com/matsengrp/olmsted#readme">README</a> to learn more about AIRR, PCP, or Olmsted data schemas and field descriptions.
              <br />
              <br />
              <strong>Ancestral Reconstruction Method:</strong> Select among alternate phylogenies using the Ancestral reconstruction method dropdown menu.
              These methods are specified in the input data according to the phylogenetic inference tool used.
              <br />
              <br />
              <strong>Paired Heavy/Light Chain Data:</strong> For paired data, a Chain dropdown menu appears below, allowing you to select which chain to visualize: heavy chain only,
              light chain only, or both chains stacked.
              <br />
              <br />
              <strong>Mouse + Keyboard Controls:</strong>
              <ul style={{ marginTop: "5px", paddingLeft: "20px", marginBottom: "10px" }}>
                <li><strong>Click</strong> on leaf labels or markers to select sequences for lineage analysis</li>
                <li><strong>Scroll</strong> over tree section to zoom vertically</li>
                <li><strong>Scroll</strong> over alignment section to zoom horizontally</li>
                <li><strong>Drag</strong> to pan the view</li>
                <li><strong>Drag scrollbar:</strong> When the alignment is zoomed, a draggable scrollbar appears at the bottom for horizontal panning</li>
                <li><strong>Hold Shift:</strong> Temporarily switch between Select and Pan/Zoom modes</li>
                <li><strong>Double-click:</strong> Reset zoom and pan to default view</li>
              </ul>
              <strong>Note:</strong> Clicking on the plot enters focused mode, where scroll events will zoom the plot
              instead of scrolling the page. Click outside the plot to exit focused mode and restore normal page scrolling.
              <br />
              <br />
              <strong>Button Controls:</strong>
              <ul style={{ marginTop: "5px", paddingLeft: "20px", marginBottom: "10px" }}>
                <li><strong>Tree +/−:</strong> Zoom tree section vertically</li>
                <li><strong>Align +/−:</strong> Zoom alignment section horizontally</li>
                <li><strong>Reset View:</strong> Reset all zoom and pan to default view</li>
              </ul>
              <strong>Plot Customization:</strong> Use the controls below the tree to configure:
              <ul style={{ marginTop: "5px", paddingLeft: "20px", marginBottom: "10px" }}>
                <li><strong>Tree width ratio:</strong> Adjust the relative width of the tree vs. alignment panels</li>
                <li><strong>Leaf size by:</strong> Scale leaf marker size by a continuous field</li>
                <li><strong>Max leaf size:</strong> Set maximum leaf marker diameter</li>
                <li><strong>Show labels:</strong> Toggle tree tip labels on and off</li>
                <li><strong>Branch width and color:</strong> Map branch visual properties to continuous fields</li>
                <li><strong>Color scheme:</strong> Choose color palette for branch coloring</li>
              </ul>
              <strong>Branch Metrics:</strong> The following phylogenetic metrics can be used to color or size branches:
              <ul style={{ marginTop: "5px", paddingLeft: "20px", marginBottom: "10px" }}>
                <li><strong>LBI (Local Branching Index):</strong> Measures the local tree imbalance around each branch, useful for identifying rapidly expanding lineages</li>
                <li><strong>LBR (Local Branching Ratio):</strong> Ratio-based measure of local branching patterns</li>
                <li><strong>Parent:</strong> Colors branches by parentage; sibling branches share a common color</li>
              </ul>
              <strong>Lineage Selection:</strong> To view the ancestral sequence lineage for a specific sequence, click on a
              leaf&apos;s label (or on the center of the leaf marker). The Ancestral Sequences section will appear
              below the tree showing the mutational history from naive to the selected sequence.
              <br />
              <br />
              <strong>Export &amp; Display Options:</strong>
              <ul style={{ marginTop: "5px", paddingLeft: "20px" }}>
                <li><strong>Hide Plot Settings:</strong> Toggle off the on-plot settings panel for a cleaner view</li>
                <li><strong>Export PNG/SVG:</strong> Save the tree visualization as an image</li>
              </ul>
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
  static contextType = VegaViewContext;

  constructor(props) {
    super(props);
    this.state = {
      // Track the current Vega view for export functionality
      currentVegaView: null,
      // Toggle to hide/show Vega control bindings
      hideControls: false
    };
    // Spec with controls (for light chain in stacked mode, or single chain mode)
    this.spec = concatTreeWithAlignmentSpec({ showControls: true });
    // Spec without controls (for heavy chain in stacked mode - mirrors light chain settings)
    // Also hides legend and removes top padding for compact layout
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
    const { selectedFamily, selectedChain, dispatchSelectedChain } = this.props;
    // When family changes, check if we need to reset chain selection
    if (selectedFamily && selectedFamily !== prevProps.selectedFamily) {
      const isBothMode = isBothChainsMode(selectedChain);
      const isLightMode = selectedChain === CHAIN_TYPES.LIGHT;
      // If in "both" or "light" mode but new family is not paired, reset to "heavy"
      if ((isBothMode || isLightMode) && !selectedFamily.is_paired) {
        dispatchSelectedChain(CHAIN_TYPES.HEAVY);
      }
    }
  }

  // Get data for a specific chain (used in both modes)
  getChainData(chain) {
    const { heavyClone, lightClone, heavyTree, lightTree, heavyNaiveData, lightNaiveData, heavyCdrBounds, lightCdrBounds } = this.props;

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

    const isStacked = isStackedMode(selectedChain);
    const isSideBySide = isSideBySideMode(selectedChain);
    const isBothMode = isBothChainsMode(selectedChain);

    // Use heavyTree for downloads in both mode, otherwise use tree
    const downloadTree = isBothMode ? heavyTree : tree;

    const { hideControls } = this.state;

    return (
      <div ref={this.containerRef}>
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
        {isSideBySide && completeData && (
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
                onNewView={(view) => {
                  this.singleVegaRef = view;
                  // Update state for export functionality
                  this.setState({ currentVegaView: view });
                  // Register view with context for config management
                  if (this.context && this.context.setTreeView) {
                    this.context.setTreeView(view);
                  }
                  // Listen for focus changes to sync with React
                  view.addSignalListener("viz_focused", (name, value) => {
                    if (value) this.isFocused = true;
                  });
                }}
                debug
                // logLevel={vega.Debug} // https://vega.github.io/vega/docs/api/view/#view_logLevel
                data={this.treeDataFromProps()}
                spec={this.spec}
              />
            </div>
          );
        })()}
        {!isBothMode && !lightChainUnavailable && !completeData && !incompleteFamily && !incompleteTree && (
          <Vega
            onParseError={(...args) => console.error("parse error:", args)}
            onSignalPts_tuple={(...args) => {
              const node = args.slice(1)[0];
              if (node && node.parent) {
                dispatchSelectedSeq(node.sequence_id);
              }
            }}
            onNewView={(view) => {
              this.singleVegaRef = view;
              // Update state for export functionality
              this.setState({ currentVegaView: view });
              // Register view with context for config management
              if (this.context && this.context.setTreeView) {
                this.context.setTreeView(view);
              }
              // Listen for focus changes to sync with React
              view.addSignalListener("viz_focused", (name, value) => {
                if (value) this.isFocused = true;
              });
            }}
            debug
            data={this.tempVegaData}
            spec={this.spec}
          />
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
              onMouseEnter={(e) => { e.target.style.backgroundColor = hideControls ? "#bbdefb" : "#f5f5f5"; }}
              onMouseLeave={(e) => { e.target.style.backgroundColor = hideControls ? "#e3f2fd" : "#fff"; }}
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
