import React from "react";
import { connect } from "react-redux";
import ClonalFamiliesTable from "./table";
import DatasetLoadingTable from "./DatasetLoadingTable";
import * as clonalFamiliesSelectors from "../../selectors/clonalFamilies";
import * as explorerActions from "../../actions/explorer";
import { getClientDatasets, getClientClonalFamilies } from "../../actions/clientDataLoader";
import * as loadData from "../../actions/loadData";
import * as types from "../../actions/types";
import { TreeViz } from "./tree";
import { ClonalFamiliesViz } from "./scatterplot";
import { Lineage } from "./lineage";
import { CollapseHelpTitle } from "../util/collapseHelpTitle";
import { CollapsibleSection } from "../util/collapsibleSection";
import { NAV_BAR_HEIGHT } from "../framework/nav-bar";
import ConfigModal from "../config/ConfigModal";
import FilterPanel from "./FilterPanel";
import { VegaViewProvider } from "../config/VegaViewContext";

// STYLES
const PADDING_FRACTION = 0.03;

// Compute how much padding the page should have.
// Use above percentage of available width for padding on either side
const usableWidthStyle = (availableWidth) => {
  return {
    width: availableWidth * (1 - 2 * PADDING_FRACTION),
    paddingLeft: availableWidth * PADDING_FRACTION,
    paddingRight: availableWidth * PADDING_FRACTION,
    paddingTop: NAV_BAR_HEIGHT + 20, // Account for sticky nav bar
    paddingBottom: 20
  };
};

const tableStyle = { marginBottom: 20, overflow: "auto" };

const sectionStyle = { paddingBottom: 10, marginBottom: 40, overflow: "auto" };

const mapStateToProps = (state) => {
  const selectedFamily = clonalFamiliesSelectors.getSelectedFamily(state);
  const nClonalFamiliesBrushed = clonalFamiliesSelectors.getBrushedClonalFamilies(state).length;
  const nClonalFamiliesTotal = clonalFamiliesSelectors.getAvailableClonalFamilies(state).length;
  const nClonalFamiliesAll = clonalFamiliesSelectors.getAllClonalFamilies(state).length;
  return { selectedFamily, nClonalFamiliesBrushed, nClonalFamiliesTotal, nClonalFamiliesAll };
};

@connect(mapStateToProps)
class SelectedFamiliesSummary extends React.Component {
  render() {
    const { nClonalFamiliesBrushed, nClonalFamiliesTotal, nClonalFamiliesAll } = this.props;
    const nFiltered = nClonalFamiliesAll - nClonalFamiliesTotal;
    const showFilterInfo = nFiltered > 0;
    const infoBoxStyle = {
      marginTop: "10px",
      marginBottom: "10px",
      padding: "12px",
      backgroundColor: "#d4edda",
      border: "1px solid #28a745",
      borderRadius: "4px",
      color: "#155724",
      fontSize: "14px",
      textAlign: "center",
      fontWeight: "bold"
    };
    return (
      <div>
        {showFilterInfo && (
          <div style={infoBoxStyle}>
            Number of clonal families passed filter: {nClonalFamiliesTotal} out of {nClonalFamiliesAll}
          </div>
        )}
        <div
          style={{
            ...infoBoxStyle,
            backgroundColor: nClonalFamiliesBrushed === 0 ? "#f8d7da" : "#d4edda",
            border: nClonalFamiliesBrushed === 0 ? "1px solid #dc3545" : "1px solid #28a745",
            color: nClonalFamiliesBrushed === 0 ? "#721c24" : "#155724"
          }}
        >
          Number of clonal families currently selected: {nClonalFamiliesBrushed} out of {nClonalFamiliesTotal}
        </div>
      </div>
    );
  }
}

function Overlay({ styles, mobileDisplay, handler }) {
  /**
   * Keyboard event handler for accessibility (WCAG 2.1 Level A compliance)
   *
   * WCAG Success Criterion 2.1.1 - Keyboard:
   * All functionality must be operable through a keyboard interface.
   *
   * Standard keys for activation (per ARIA Authoring Practices Guide):
   * - Enter: Universal activation key for buttons and links
   * - Space: Activation key specifically for buttons
   *
   * @param {KeyboardEvent} e - The keyboard event
   */
  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault(); // Prevent default Space key scrolling behavior
      handler(e);
    }
  };

  return mobileDisplay ? (
    <div
      style={styles}
      onClick={handler}
      onKeyDown={handleKeyDown}
      onTouchStart={handler}
      role="button" // ARIA role: Identifies div as a button for screen readers
      tabIndex={0} // Makes element keyboard focusable (0 = normal tab order)
      aria-label="Close overlay" // Provides accessible name for screen readers
    />
  ) : (
    <div />
  );
}

@connect(
  (state) => ({
    browserDimensions: state.browserDimensions.browserDimensions,
    availableDatasets: state.datasets.availableDatasets,
    pendingDatasetLoads: state.datasets.pendingDatasetLoads,
    selectedFamily: clonalFamiliesSelectors.getSelectedFamily(state),
    selectedSeq: state.clonalFamilies.selectedSeq,
    loadedClonalFamilies: clonalFamiliesSelectors.countLoadedClonalFamilies(state.datasets.availableDatasets)
  }),
  (dispatch) => ({
    dispatch,
    updateCurrentSection: (section) => dispatch(explorerActions.updateCurrentSection(section))
  })
)
class App extends React.Component {
  constructor(props) {
    super(props);
    // Refs for section visibility tracking
    this.sectionRefs = {
      datasets: React.createRef(),
      clonalFamilies: React.createRef(),
      selectedClonalFamilies: React.createRef(),
      clonalFamilyDetails: React.createRef(),
      ancestralSequences: React.createRef()
    };
    this.sectionNames = {
      datasets: "Datasets",
      clonalFamilies: "Clonal Families",
      selectedClonalFamilies: "Selected Clonal Families",
      clonalFamilyDetails: "Clonal Family Details",
      ancestralSequences: "Ancestral Sequences"
    };
  }

  // static propTypes = {
  //   dispatch: PropTypes.func.isRequired
  // }
  async componentDidMount() {
    const { availableDatasets, dispatch, updateCurrentSection } = this.props;
    document.addEventListener(
      "dragover",
      (e) => {
        e.preventDefault();
      },
      false
    );

    // Set up IntersectionObserver to track visible section
    this.setupSectionObserver(updateCurrentSection);

    // Load starred families from sessionStorage
    try {
      const savedStarred = sessionStorage.getItem("olmsted_starred_families");
      if (savedStarred) {
        const starredFamilies = JSON.parse(savedStarred);
        if (Array.isArray(starredFamilies) && starredFamilies.length > 0) {
          dispatch(explorerActions.setStarredFamilies(starredFamilies));
        }
      }
    } catch (e) {
      console.warn("Failed to load starred families from sessionStorage:", e);
    }

    // Load starred datasets from sessionStorage
    try {
      const savedStarredDatasets = sessionStorage.getItem("olmsted_starred_datasets");
      if (savedStarredDatasets) {
        const starredDatasets = JSON.parse(savedStarredDatasets);
        if (Array.isArray(starredDatasets) && starredDatasets.length > 0) {
          dispatch(explorerActions.setStarredDatasets(starredDatasets));
        }
      }
    } catch (e) {
      console.warn("Failed to load starred datasets from sessionStorage:", e);
    }

    // Ensure datasets are loaded when app component mounts
    // This fixes the refresh issue where datasets don't reload properly
    if (availableDatasets.length === 0 && !this._datasetsLoading) {
      this._datasetsLoading = true; // Prevent multiple simultaneous calls
      // Wait for IndexedDB to be ready before loading datasets
      try {
        const olmstedDB = (await import("../../utils/olmstedDB")).default;
        await olmstedDB.ready; // Wait for database to be ready
        await getClientDatasets(dispatch);
      } catch (error) {
        console.error("Error waiting for database to be ready:", error);
        // Fallback to immediate loading (for cases where DB isn't available)
        await getClientDatasets(dispatch);
      }
      this._datasetsLoading = false;
    }
  }

  componentWillUnmount() {
    // Clean up the IntersectionObserver
    if (this.sectionObserver) {
      this.sectionObserver.disconnect();
    }
  }

  setupSectionObserver = (updateCurrentSection) => {
    // Use IntersectionObserver to detect which section is in view
    // Trigger when section header is near the top of the viewport
    const options = {
      root: null,
      rootMargin: `-${NAV_BAR_HEIGHT + 20}px 0px -70% 0px`,
      threshold: 0
    };

    this.sectionObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const sectionKey = entry.target.dataset.section;
          if (sectionKey && this.sectionNames[sectionKey]) {
            updateCurrentSection(this.sectionNames[sectionKey]);
          }
        }
      });
    }, options);

    // Observe all section refs
    Object.keys(this.sectionRefs).forEach((key) => {
      const ref = this.sectionRefs[key];
      if (ref.current) {
        ref.current.dataset.section = key;
        this.sectionObserver.observe(ref.current);
      }
    });
  };

  componentDidUpdate(prevProps) {
    const { availableDatasets, pendingDatasetLoads, dispatch, updateCurrentSection, loadedClonalFamilies, selectedFamily, selectedSeq } = this.props;

    // Re-observe sections when they become visible
    if (
      prevProps.loadedClonalFamilies !== loadedClonalFamilies ||
      prevProps.selectedFamily !== selectedFamily ||
      prevProps.selectedSeq !== selectedSeq
    ) {
      // Re-setup observer to include newly visible sections
      if (this.sectionObserver) {
        this.sectionObserver.disconnect();
      }
      this.setupSectionObserver(updateCurrentSection);
    }
    // Check if datasets were just loaded and we have pending dataset loads from URL
    if (
      prevProps.availableDatasets.length === 0 &&
      availableDatasets.length > 0 &&
      pendingDatasetLoads &&
      pendingDatasetLoads.length > 0
    ) {
      // Process each pending dataset load
      pendingDatasetLoads.forEach((dataset_id) => {
        const dataset = availableDatasets.find((d) => d.dataset_id === dataset_id);
        if (dataset) {
          dispatch({ type: types.LOADING_DATASET, dataset_id, loading: "LOADING" });

          // Use appropriate loader based on dataset type
          if (dataset.isClientSide) {
            getClientClonalFamilies(dispatch, dataset_id);
          } else {
            loadData.getClonalFamilies(dispatch, dataset_id);
          }
        } else {
          console.warn(`App: Dataset ${dataset_id} not found in available datasets`);
        }
      });

      // Clear pending dataset loads
      dispatch({ type: types.CLEAR_PENDING_DATASET_LOADS });
    }
  }

  render() {
    const {
      browserDimensions,
      availableDatasets,
      dispatch,
      selectedFamily,
      selectedSeq,
      loadedClonalFamilies
    } = this.props;

    /* D I M E N S I O N S */
    const availableWidth = browserDimensions.width;
    const availableHeight = browserDimensions.height;

    // let sidebarWidth = 0;

    // sidebarWidth = controlsWidth;

    // sidebarWidth += controlsPadding;

    // const visibleSidebarWidth = this.state.sidebarOpen ? sidebarWidth : 0;
    // if (!this.state.mobileDisplay) {
    //   availableWidth -= visibleSidebarWidth;
    // }

    /* S T Y L E S */
    const sharedStyles = {
      position: "absolute",
      top: 0,
      bottom: 0,
      right: 0,
      transition: "left 0.3s ease-out"
    };
    const overlayStyles = {
      ...sharedStyles,
      position: "absolute",
      display: "block",
      width: availableWidth,
      height: availableHeight,
      left: 0,
      opacity: 0,
      visibility: "hidden",
      zIndex: 8000,
      backgroundColor: "rgba(0,0,0,0.5)",
      cursor: "pointer",
      overflow: "scroll",
      transition: "left 0.3s ease-out, opacity 0.3s ease-out, visibility 0s ease-out 0.3s"
    };

    return (
      <VegaViewProvider>
        <span>
          <ConfigModal />
          {/* App Contents - TODO: break this into smaller components like SelectedFamiliesSummary */}
          <div>
          <div style={usableWidthStyle(availableWidth)}>
            <div ref={this.sectionRefs.datasets} style={sectionStyle}>
              <CollapsibleSection titleText="Datasets">
                <CollapseHelpTitle
                  titleText="Datasets"
                  helpText={
                    <div>
                      The Datasets section allows you to manage and load your B-cell repertoire datasets. The table displays
                      all available datasets stored in your browser&apos;s local storage (IndexedDB), including dataset name,
                      number of clonal families, and loading status.
                      <br />
                      <br />
                      <strong>Loading Datasets:</strong>
                      <ul style={{ marginTop: "5px", paddingLeft: "20px", marginBottom: "10px" }}>
                        <li><strong>Select datasets:</strong> Check the boxes in the &quot;Select&quot; column for datasets you want to visualize</li>
                        <li><strong>Update Visualization:</strong> Click this button to load selected datasets or unload unselected ones</li>
                        <li><strong>Status indicators:</strong> Color-coded labels show whether each dataset is loaded (green), loading (blue), or unloaded (gray)</li>
                      </ul>
                      <strong>Table Features:</strong>
                      <ul style={{ marginTop: "5px", paddingLeft: "20px", marginBottom: "10px" }}>
                        <li><strong>Info button:</strong> Click the blue info icon to view all metadata fields for a dataset</li>
                        <li><strong>Sorting:</strong> Click column headers to sort. Click again to reverse order</li>
                        <li><strong>Resize columns:</strong> Drag column borders to adjust width</li>
                      </ul>
                      <strong>Managing Datasets:</strong>
                      <ul style={{ marginTop: "5px", paddingLeft: "20px", marginBottom: "10px" }}>
                        <li><strong>Upload new data:</strong> Click &quot;Manage Datasets&quot; to return to the main page where you can upload new datasets</li>
                        <li><strong>Delete datasets:</strong> Use the &quot;Manage Datasets&quot; page to remove datasets from local storage</li>
                      </ul>
                      <strong>Starring Datasets:</strong>
                      <ul style={{ marginTop: "5px", paddingLeft: "20px", marginBottom: "10px" }}>
                        <li><strong>Star icon:</strong> Click the star in any row to mark it for easy reference</li>
                        <li><strong>Starred first:</strong> Check this option to sort starred datasets to the top of the table</li>
                        <li><strong>Only starred:</strong> Check this option to filter and show only starred datasets</li>
                        <li><strong>Bulk actions:</strong> Use &quot;Star All&quot; or &quot;Unstar All&quot; to quickly star or unstar all currently visible datasets. Use &quot;Clear Stars&quot; to remove all stars</li>
                      </ul>
                      <strong>Export:</strong> Click &quot;Download Table as CSV&quot; to export the current table view (with applied filters and sorting) to a CSV file.
                      <br />
                      <br />
                      Multiple datasets can be loaded simultaneously for comparative analysis across different samples or subjects.
                    </div>
                  }
                />
                <DatasetLoadingTable datasets={availableDatasets} dispatch={dispatch} />
              </CollapsibleSection>
            </div>
            {loadedClonalFamilies > 0 && (
              <div ref={this.sectionRefs.clonalFamilies} style={sectionStyle}>
                <CollapsibleSection titleText="Clonal Families">
                <CollapseHelpTitle
                  titleText="Clonal Families"
                  helpText={
                    <div>
                      The Clonal Families section represents each clonal family as a point in a scatterplot. Each point
                      corresponds to a single clonal family, with axes, size, color, and shape customizable to display different
                      family-level metrics and metadata. For paired heavy/light chain data, each chain is represented as a
                      separate data point. Interact with the plot by clicking individual points or dragging to brush-select
                      multiple clones, which filters the clonal families displayed in the Selected Clonal Families table below.
                      See the <a href="https://github.com/matsengrp/olmsted#readme">README</a> to learn more about AIRR, PCP, or Olmsted data schemas and field descriptions.
                      <br />
                      <br />
                      <strong>Filters:</strong> Use the &quot;Filters&quot; panel below to restrict which clonal families are displayed.
                      Filter by locus (IGH, IGK, IGL), subject, sample, V gene, J gene, or dataset. Multiple values can be
                      selected for each filter field. Active filters are shown as chips that can be individually removed.
                      <br />
                      <br />
                      <strong>Control Modes:</strong> The scatterplot has two interaction modes accessible via buttons in the upper right:
                      <ul style={{ marginTop: "5px", paddingLeft: "20px", marginBottom: "10px" }}>
                        <li><strong>Select Mode:</strong> Click to select individual clones or drag to brush-select multiple clones</li>
                        <li><strong>Pan/Zoom Mode:</strong> Drag to pan the view and scroll to zoom in/out</li>
                      </ul>
                      <strong>Note:</strong> The active mode is highlighted in blue. Clicking on the plot enters focused mode, where scroll events will zoom the plot
                      instead of scrolling the page. Click outside the plot to exit focused mode and restore normal page scrolling.
                      <br />
                      <br />
                      <strong>Mouse + Keyboard Controls:</strong>
                      <ul style={{ marginTop: "5px", paddingLeft: "20px", marginBottom: "10px" }}>
                        <li><strong>Click</strong> to select individual clones (Select Mode)</li>
                        <li><strong>Drag</strong> to brush-select multiple clones (Select Mode) or pan the view (Pan/Zoom Mode)</li>
                        <li><strong>Scroll</strong> to zoom in/out (Pan/Zoom Mode)</li>
                        <li><strong>Hold Shift:</strong> Temporarily switch to the opposite mode (Select ↔ Pan/Zoom)</li>
                        <li><strong>Double-click:</strong> Reset zoom and pan to default view (Pan/Zoom Mode)</li>
                      </ul>
                      <strong>Button Controls:</strong>
                      <ul style={{ marginTop: "5px", paddingLeft: "20px", marginBottom: "10px" }}>
                        <li><strong>Select / Pan-Zoom:</strong> Toggle between interaction modes</li>
                        <li><strong>+/−:</strong> Zoom in or out</li>
                        <li><strong>Reset View:</strong> Reset zoom and pan to default view</li>
                        <li><strong>Clear Selection:</strong> Deselect all selected clones</li>
                      </ul>
                      <strong>Plot Customization:</strong> Use the dropdown menus below the plot to customize the visualization:
                      <ul style={{ marginTop: "5px", paddingLeft: "20px", marginBottom: "10px" }}>
                        <li><strong>X and Y axes:</strong> Map continuous variables to the x and y axes</li>
                        <li><strong>Size by:</strong> Scale point size by a continuous variable</li>
                        <li><strong>Color by:</strong> Color points by categorical variables</li>
                        <li><strong>Shape by:</strong> Change point shape by categorical variables</li>
                        <li><strong>Facet by:</strong> Split the plot into separate panels by categorical variables</li>
                      </ul>
                      <strong>Export &amp; Display Options:</strong>
                      <ul style={{ marginTop: "5px", paddingLeft: "20px" }}>
                        <li><strong>Hide Plot Settings:</strong> Toggle off the on-plot settings panel for a cleaner view</li>
                        <li><strong>Export PNG/SVG:</strong> Save the scatterplot as an image</li>
                      </ul>
                      <strong>Tip:</strong> Plot settings can be saved as configurations via the Settings menu in the header.
                    </div>
                  }
                />
                <CollapsibleSection
                  titleText="Filters"
                  defaultOpen={false}
                >
                  <FilterPanel />
                </CollapsibleSection>
                <SelectedFamiliesSummary />
                <ClonalFamiliesViz />
              </CollapsibleSection>
            </div>
            )}

            {loadedClonalFamilies > 0 && (
              <div ref={this.sectionRefs.selectedClonalFamilies} style={{ paddingBottom: 40, ...sectionStyle }}>
                <CollapsibleSection titleText="Selected Clonal Families">
                <CollapseHelpTitle
                  titleText="Selected Clonal Families"
                  helpText={
                    <div>
                      The Selected Clonal Families table displays the full collection or selected subset of clonal families
                      (based on scatterplot selection). Each row represents one clonal family and includes:
                      <ul style={{ marginTop: "5px", paddingLeft: "20px", marginBottom: "10px" }}>
                        <li><strong>Naive sequence visualization:</strong> Graphical representation of V(D)J recombination showing gene segments and CDR regions</li>
                        <li><strong>Metadata:</strong> Clone ID, unique sequence count, mutation frequency, and other family-level statistics</li>
                      </ul>
                      <strong>Table Interactions:</strong>
                      <ul style={{ marginTop: "5px", paddingLeft: "20px", marginBottom: "10px" }}>
                        <li><strong>Selection:</strong> Click a row or the checkbox in the &quot;Select&quot; column to choose a clonal family for detailed visualization</li>
                        <li><strong>Sorting:</strong> Click column headers to sort. Click again to reverse order</li>
                        <li><strong>Info button:</strong> Click the blue info icon to view all available data fields for a clonal family in a modal dialog</li>
                        <li><strong>Resize columns:</strong> Drag column borders to adjust width</li>
                      </ul>
                      <strong>Starring Clonal Families:</strong>
                      <ul style={{ marginTop: "5px", paddingLeft: "20px", marginBottom: "10px" }}>
                        <li><strong>Star icon:</strong> Click the star in any row to mark it for easy reference</li>
                        <li><strong>Persistence:</strong> Stars persist when the scatterplot selection changes, allowing you to track families across multiple selections</li>
                        <li><strong>Starred first:</strong> Check this option to sort starred families to the top of the table</li>
                        <li><strong>Only starred:</strong> Check this option to filter and show only starred families</li>
                        <li><strong>Bulk actions:</strong> Use &quot;Star All&quot; or &quot;Unstar All&quot; to quickly star or unstar all currently visible families. Use &quot;Clear Stars&quot; to remove all stars from the entire dataset</li>
                      </ul>
                      <strong>Export:</strong> Click &quot;Download Table as CSV&quot; to export the current table view (with applied filters and sorting) to a CSV file.
                      <br />
                      <br />
                      When you select a clonal family from the table, its phylogenetic tree and alignment are displayed below
                      in the Clonal Family Details section. For paired heavy/light chain data, trees for both chains will be available.
                    </div>
                  }
                />
                <div style={tableStyle}>
                  <ClonalFamiliesTable />
                </div>
              </CollapsibleSection>
            </div>
            )}

            {selectedFamily && loadedClonalFamilies > 0 && (
              <div ref={this.sectionRefs.clonalFamilyDetails} style={sectionStyle}>
                <CollapsibleSection titleText="Clonal Family Details">
                  <TreeViz availableHeight={availableHeight} />
                </CollapsibleSection>
              </div>
            )}
            {selectedSeq && Object.keys(selectedSeq).length > 0 && loadedClonalFamilies > 0 && (
              <div ref={this.sectionRefs.ancestralSequences} style={sectionStyle}>
                <CollapsibleSection titleText="Ancestral Sequences">
                  <Lineage />
                </CollapsibleSection>
              </div>
            )}
          </div>
        </div>
        <Overlay
          styles={overlayStyles}
          // sidebarOpen={this.state.sidebarOpen}
          // mobileDisplay={this.state.mobileDisplay}
          // handler={() => {this.setState({sidebarOpen: false});}}
        />
        </span>
      </VegaViewProvider>
    );
  }
}

export default App;
