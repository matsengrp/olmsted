import React from "react";
import { connect } from "react-redux";
import * as _ from "lodash";
import { LoadingStatus, SimpleInProgress } from "../util/loading";
import { countLoadedClonalFamilies } from "../../selectors/clonalFamilies";
import { ResizableTable } from "../util/resizableTable";
import { getClientClonalFamilies } from "../../actions/clientDataLoader";
import { getClonalFamilies } from "../../actions/loadData";
import * as explorerActions from "../../actions/explorer";
import * as types from "../../actions/types";

// Component for the citation column
class CitationCell extends React.Component {
  render() {
    const { paper } = this.props.datum;
    if (!paper) return <span>—</span>;

    if (paper.url) {
      return (
        <a href={paper.url} onClick={(e) => e.stopPropagation()}>
          {paper.authorstring}
        </a>
      );
    }
    return <span>{paper.authorstring}</span>;
  }
}

// Component for the size column
class SizeCell extends React.Component {
  render() {
    const dataset = this.props.datum;
    const sizeInBytes = dataset.file_size || dataset.fileSize || 0;

    if (sizeInBytes === 0) {
      return <span>—</span>;
    }

    const sizeInMB = (sizeInBytes / (1024 * 1024)).toFixed(1);
    return (
      <span>
        {sizeInMB}
        {' '}
        MB
      </span>
    );
  }
}

// Component for non-selectable load status
class LoadStatusDisplay extends React.Component {
  render() {
    return (
      <div style={{ width: "100%", textAlign: "center" }}>
        <LoadingStatus loadingStatus={this.props.datum.loading} />
      </div>
    );
  }
}

// Component for dataset selection checkbox
class SelectionCell extends React.Component {
  render() {
    const { datum, selectedDatasets, dispatch } = this.props;
    const isSelected = selectedDatasets && selectedDatasets.includes(datum.dataset_id);

    return (
      <div style={{ width: "100%", textAlign: "center" }}>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => {
            dispatch(explorerActions.toggleDatasetSelection(datum.dataset_id));
          }}
          style={{ cursor: "pointer" }}
        />
      </div>
    );
  }
}

@connect((state) => ({
  loadedClonalFamilies: countLoadedClonalFamilies(state.datasets.availableDatasets),
  selectedDatasets: state.datasets.selectedDatasets,
  allDatasets: state.datasets.availableDatasets
}))
export default class LoadingTable extends React.Component {
  constructor(props) {
    super(props);
    this.handleBatchUpdate = this.handleBatchUpdate.bind(this);
  }

  componentDidMount() {
    // Initialize selections with currently loaded datasets
    const { allDatasets, selectedDatasets, dispatch } = this.props;
    const currentlyLoaded = allDatasets.filter((d) => d.loading === "DONE").map((d) => d.dataset_id);

    // Only initialize if no selections are made yet
    if (selectedDatasets.length === 0 && currentlyLoaded.length > 0) {
      currentlyLoaded.forEach((dataset_id) => {
        dispatch(explorerActions.toggleDatasetSelection(dataset_id));
      });
    }
  }

  async handleBatchUpdate() {
    const { selectedDatasets, allDatasets, dispatch } = this.props;

    // Get currently loaded dataset IDs
    const currentlyLoaded = new Set(allDatasets.filter((d) => d.loading === "DONE").map((d) => d.dataset_id));

    // Determine what needs to be loaded and unloaded
    const toLoad = selectedDatasets.filter((id) => !currentlyLoaded.has(id));
    const toUnload = Array.from(currentlyLoaded).filter((id) => !selectedDatasets.includes(id));

    console.log(`Batch update: Loading ${toLoad.length}, Unloading ${toUnload.length}`);

    // First, unload datasets that are no longer selected
    toUnload.forEach((dataset_id) => {
      dispatch({ type: types.LOADING_DATASET, dataset_id, loading: false });
    });

    // Then load new datasets
    toLoad.forEach(async (dataset_id) => {
      const dataset = allDatasets.find((d) => d.dataset_id === dataset_id);
      if (dataset) {
        dispatch({ type: types.LOADING_DATASET, dataset_id, loading: "LOADING" });

        try {
          if (dataset.isClientSide) {
            await getClientClonalFamilies(dispatch, dataset_id);
            // Success is handled by getClientClonalFamilies dispatch
          } else {
            await getClonalFamilies(dispatch, dataset_id);
            // Success is handled by getClonalFamilies dispatch
          }
        } catch (error) {
          console.error(`Failed to load dataset ${dataset_id}:`, error);
          dispatch({ type: types.LOADING_DATASET, dataset_id, loading: "ERROR" });
        }
      }
    });

    // Clear selections after processing
    dispatch(explorerActions.clearDatasetSelections());
  }

  render() {
    // Use all datasets (including loaded ones)
    const allDatasets = this.props.allDatasets || this.props.datasets || [];
    const { selectedDatasets } = this.props;

    // Calculate changes pending
    const currentlyLoaded = new Set(allDatasets.filter((d) => d.loading === "DONE").map((d) => d.dataset_id));
    const pendingChanges = selectedDatasets.filter((id) => !currentlyLoaded.has(id)).length
      + Array.from(currentlyLoaded).filter((id) => !selectedDatasets.includes(id)).length;

    // Check if we need citation column
    const showCitation = _.some(allDatasets, (d) => d.paper !== undefined);

    // Build mappings for the table - same as Available Datasets but with selection checkboxes
    const mappings = [
      ["Select", SelectionCell, { sortable: false }],
      ["Status", LoadStatusDisplay, { sortable: false }],
      ["Name", (d) => d.name || d.dataset_id, { sortKey: "name" }],
      ["ID", "dataset_id", { style: { fontSize: "11px", color: "#666", fontFamily: "monospace" } }],
      [
        "Source",
        (d) => (d.isClientSide || d.temporary ? "Local" : "Server"),
        { style: { fontSize: "12px" }, sortKey: "isClientSide" }
      ],
      ["Size (MB)", SizeCell, { sortKey: "file_size", style: { textAlign: "right" } }],
      ["Subjects", "subjects_count"],
      ["Families", "clone_count"],
      ["Build Time", (d) => (d.build ? d.build.time || "—" : "—"), { sortKey: "build.time" }]
    ];

    if (showCitation) {
      mappings.push(["Citation", CitationCell, { sortable: false }]);
    }

    // Define column widths
    const columnWidths = [
      60, // Select
      120, // Status
      200, // Name
      150, // ID
      80, // Source
      80, // Size (MB)
      80, // Subjects
      100, // Families
      120, // Build time
      ...(showCitation ? [150] : [])
    ];

    return (
      <div>
        <div style={{ marginBottom: "10px" }}>
          <span>Select datasets to visualize:</span>
        </div>

        <ResizableTable
          data={allDatasets}
          mappings={mappings}
          columnWidths={columnWidths}
          containerHeight={200}
          itemName="available datasets"
          componentProps={{
            dispatch: this.props.dispatch,
            selectedDatasets: this.props.selectedDatasets
          }}
        />

        <div style={{ marginTop: "15px", marginBottom: "15px", textAlign: "center" }}>
          <button
            onClick={this.handleBatchUpdate}
            disabled={pendingChanges === 0}
            style={{
              padding: "8px 16px",
              fontSize: "14px",
              fontWeight: "bold",
              backgroundColor: pendingChanges > 0 ? "#007bff" : "#6c757d",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: pendingChanges > 0 ? "pointer" : "not-allowed",
              marginRight: "10px"
            }}
          >
            Update Visualization
            {' '}
            {pendingChanges > 0 ? `(${pendingChanges} changes pending)` : ""}
          </button>

          <button
            onClick={() => (window.location.href = "/")}
            style={{
              padding: "8px 16px",
              fontSize: "14px",
              fontWeight: "bold",
              backgroundColor: "#28a745",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer"
            }}
          >
            Manage Datasets
          </button>
        </div>

        <p style={{ marginTop: "10px" }}>
          Loaded clonal families:
          {this.props.loadedClonalFamilies}
        </p>
      </div>
    );
  }
}
