import React from "react";
import { connect } from "react-redux";
import ClonalFamiliesTable from "./table";
import LoadingTable from "./loadingTable";
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

// STYLES
const PADDING_FRACTION = 0.03;

// Compute how much padding the page should have.
// Use above percentage of available width for padding on either side
const usableWidthStyle = (availableWidth) => {
  return {
    width: availableWidth * (1 - 2 * PADDING_FRACTION),
    paddingLeft: availableWidth * PADDING_FRACTION,
    paddingRight: availableWidth * PADDING_FRACTION,
    paddingTop: 40,
    paddingBottom: 20
  };
};

const tableStyle = { marginBottom: 20, overflow: "auto" };

const sectionStyle = { paddingBottom: 10, marginBottom: 40, overflow: "auto" };

const mapStateToProps = (state) => {
  const selectedFamily = clonalFamiliesSelectors.getSelectedFamily(state);
  const nClonalFamiliesBrushed = clonalFamiliesSelectors.getBrushedClonalFamilies(state).length;
  return { selectedFamily, nClonalFamiliesBrushed };
};

@connect(mapStateToProps)
class SelectedFamiliesSummary extends React.Component {
  render() {
    const { nClonalFamiliesBrushed } = this.props;
    return (
      <div
        style={{
          marginTop: "10px",
          marginBottom: "10px",
          padding: "12px",
          backgroundColor: nClonalFamiliesBrushed === 0 ? "#f8d7da" : "#d4edda",
          border: nClonalFamiliesBrushed === 0 ? "1px solid #dc3545" : "1px solid #28a745",
          borderRadius: "4px",
          color: nClonalFamiliesBrushed === 0 ? "#721c24" : "#155724",
          fontSize: "14px",
          textAlign: "center",
          fontWeight: "bold"
        }}
      >
        Number of families currently selected: {nClonalFamiliesBrushed}
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
    locus: state.clonalFamilies.locus,
    loadedClonalFamilies: clonalFamiliesSelectors.countLoadedClonalFamilies(state.datasets.availableDatasets)
  }),
  (dispatch) => ({
    dispatch,
    filterLocus: (locus) => dispatch(explorerActions.filterLocus(locus)),
    resetState: () => dispatch(explorerActions.resetState())
  })
)
class App extends React.Component {
  constructor(props) {
    super(props);
  }

  // static propTypes = {
  //   dispatch: PropTypes.func.isRequired
  // }
  async componentDidMount() {
    const { availableDatasets, dispatch } = this.props;
    document.addEventListener(
      "dragover",
      (e) => {
        e.preventDefault();
      },
      false
    );

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

  componentDidUpdate(prevProps) {
    const { availableDatasets, pendingDatasetLoads, dispatch } = this.props;
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
      locus,
      resetState,
      filterLocus,
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
      <span>
        {/* <DownloadModal/> */}
        {/* App Contents - TODO: break this into smaller components like SelectedFamiliesSummary */}
        <div>
          <div style={usableWidthStyle(availableWidth)}>
            <div style={sectionStyle}>
              <CollapsibleSection titleText="Datasets">
                <CollapseHelpTitle
                  titleText="Datasets"
                  helpText={`The Datasets section allows you to manage and load your B-cell repertoire datasets. Select
                  datasets from the table by checking the "Select" column checkboxes, then click the "Update Visualization"
                  button to load or unload datasets. To upload new datasets or delete existing ones,
                  click the "Manage Datasets" button to return to the main page.`}
                />
                <LoadingTable datasets={availableDatasets} dispatch={dispatch} />
              </CollapsibleSection>
            </div>
            {loadedClonalFamilies > 0 && (
              <div style={sectionStyle}>
                <CollapsibleSection titleText="Clonal Families">
                <CollapseHelpTitle
                  titleText="Clonal Families"
                  helpText={
                    <div>
                      The Clonal Families section represents each clonal family as a point in a scatterplot. Choose an
                      immunoglobulin locus to restrict the clonal families in the scatterplot to that locus - the
                      default is immunoglobulin gamma, or IGH (where H stands for heavy chain). In order to visualize
                      all clonal families from all loci in the dataset at once, choose &quot;ALL&quot; in the locus
                      selector. By default, the scatterplot maps the number of unique members in a clonal family,
                      unique_seqs_count, to the x-axis, and the average mutation frequency among members of that clonal
                      family, mean_mut_freq, to the y-axis. However, you may configure both axes as well as the color
                      and shape of the points to map to a range of fields, including sequence sampling time
                      (sample.timepoint_id). See
                      <a href="http://www.olmstedviz.org/schema.html">the schema</a> for field descriptions.
                      <br />
                      <br />
                      For comparison of subsets, you may facet the plot into separated panels according to data values
                      for a range of fields. Interact with the plot by clicking and dragging across a subset of points
                      or clicking individual points to filter the resulting clonal families in the Selected Clonal
                      Families table below.
                      <br />
                      <br />
                      <strong>Scatterplot Controls:</strong>
                      <ul style={{ marginTop: "5px", paddingLeft: "20px" }}>
                        <li><strong>Click:</strong> Select single clone</li>
                        <li><strong>Drag:</strong> Brush select multiple clones</li>
                        <li><strong>Shift + Scroll:</strong> Zoom in/out (0.5x to 10x)</li>
                        <li><strong>Shift + Drag:</strong> Pan plot in any direction</li>
                        <li><strong>Shift + Double-click:</strong> Reset zoom and pan to default view</li>
                      </ul>
                    </div>
                  }
                />
                <p>Choose a gene locus to explore clonal families with sequences sampled from that locus.</p>
                <div style={{ marginBottom: 5 }}>
                  <span style={{ fontSize: 14, fontWeight: "bold", marginRight: 8 }}>Filter by locus:</span>
                  <select
                    id="locus-select"
                    value={locus}
                    onChange={(event) => {
                      filterLocus(event.target.value);
                    }}
                    aria-label="Filter by locus"
                  >
                    {["IGH", "IGK", "IGL", "ALL"].map((locus_option) => (
                      <option key={locus_option} value={locus_option}>
                        {locus_option}
                      </option>
                    ))}
                  </select>
                </div>
                <SelectedFamiliesSummary />
                <ClonalFamiliesViz />
              </CollapsibleSection>
            </div>
            )}

            {loadedClonalFamilies > 0 && (
              <div style={{ paddingBottom: 40, ...sectionStyle }}>
                <CollapsibleSection titleText="Selected Clonal Families">
                <CollapseHelpTitle
                  titleText="Selected Clonal Families"
                  helpText={`Below the scatterplot, the full collection or selected subset of clonal families
                   appears in a table including a visualization of the recombination event resulting in the naive
                   antibody sequence and a subset of clonal family metadata. Each row in the table represents one clonal
                   family. The table automatically selects the top clonal family according to the sorting column. Click on
                   the checkbox in the "Select" column in the table to select a clonal family for further visualization.
                   Upon selecting a clonal family from the table, the phylogenetic tree(s) corresponding to that clonal family
                   (as specified in the input JSON) is visualized below the table in the Clonal Family Details section.`}
                />
                <div style={tableStyle}>
                  <ClonalFamiliesTable />
                </div>
              </CollapsibleSection>
            </div>
            )}

            {selectedFamily && loadedClonalFamilies > 0 && (
              <div style={sectionStyle}>
                <CollapsibleSection titleText="Clonal Family Details">
                  <TreeViz availableHeight={availableHeight} />
                </CollapsibleSection>
              </div>
            )}
            {selectedSeq && Object.keys(selectedSeq).length > 0 && loadedClonalFamilies > 0 && (
              <div style={sectionStyle}>
                <CollapsibleSection titleText="Ancestral sequences">
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
    );
  }
}

export default App;
