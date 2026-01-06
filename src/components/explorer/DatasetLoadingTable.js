import React from "react";
import { connect } from "react-redux";
import * as _ from "lodash";
import { LoadingStatus } from "../util/loading";
import { countLoadedClonalFamilies } from "../../selectors/clonalFamilies";
import { ResizableTable } from "../util/resizableTable";
import { getClientClonalFamilies } from "../../actions/clientDataLoader";
import { getClonalFamilies } from "../../actions/loadData";
import * as explorerActions from "../../actions/explorer";
import * as types from "../../actions/types";
import DownloadCSV from "../util/downloadCsv";
import {
  CitationCell,
  SizeCell,
  UploadTimeCell,
  BuildTimeCell,
  getDatasetCsvColumns,
  datasetColumnWidths
} from "../tables/DatasetTableCells";
import { DatasetActionsCell } from "../tables/RowInfoModal";

// Component for non-selectable load status display
function LoadStatusDisplay({ datum }) {
  if (!datum) {
    return (
      <div style={{ width: "100%", textAlign: "center" }}>
        <LoadingStatus loadingStatus="ERROR" />
      </div>
    );
  }

  return (
    <div style={{ width: "100%", textAlign: "center" }}>
      <LoadingStatus loadingStatus={datum.loading} />
    </div>
  );
}

// Component for dataset selection checkbox
function SelectionCell({ datum, selectedDatasets, dispatch }) {
  if (!datum) {
    return (
      <div style={{ width: "100%", textAlign: "center" }}>
        <input type="checkbox" disabled />
      </div>
    );
  }

  const isSelected = selectedDatasets && selectedDatasets.includes(datum.dataset_id);

  return (
    <div style={{ width: "100%", textAlign: "center" }}>
      <input
        type="checkbox"
        checked={isSelected}
        onChange={() => {
          dispatch(explorerActions.toggleDatasetSelection(datum.dataset_id));
        }}
      />
    </div>
  );
}

// Mark these as React components for production builds where names are minified
SelectionCell.isReactComponent = true;
LoadStatusDisplay.isReactComponent = true;

@connect((state) => ({
  loadedClonalFamilies: countLoadedClonalFamilies(state.datasets.availableDatasets),
  selectedDatasets: state.datasets.selectedDatasets,
  allDatasets: state.datasets.availableDatasets
}))
export default class DatasetLoadingTable extends React.Component {
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
    const { allDatasets, datasets, selectedDatasets, dispatch, loadedClonalFamilies } = this.props;
    const allDatasetsToUse = allDatasets || datasets || [];

    // Calculate changes pending
    const currentlyLoaded = new Set(allDatasetsToUse.filter((d) => d.loading === "DONE").map((d) => d.dataset_id));
    const pendingChanges =
      selectedDatasets.filter((id) => !currentlyLoaded.has(id)).length +
      Array.from(currentlyLoaded).filter((id) => !selectedDatasets.includes(id)).length;

    // Check if we need citation column
    const showCitation = _.some(allDatasetsToUse, (d) => d.paper !== undefined);

    // Build mappings for the table - same as DatasetManagementTable but with selection checkboxes
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
      ["Upload Time", UploadTimeCell, { sortKey: "upload_time" }],
      ["Build Time", BuildTimeCell, { sortKey: "build.time" }]
    ];

    if (showCitation) {
      mappings.push(["Citation", CitationCell, { sortable: false }]);
    }

    // Actions column (info only - no delete in loading table)
    mappings.push(["Actions", DatasetActionsCell, { sortable: false }]);

    // CSV columns for export
    const csvColumns = getDatasetCsvColumns(showCitation);

    const footerAction = allDatasetsToUse.length > 0 ? (
      <DownloadCSV
        data={allDatasetsToUse}
        columns={csvColumns}
        filename="datasets.csv"
        label="Download Table as CSV"
        compact
      />
    ) : null;

    return (
      <div>
        <div style={{ marginBottom: "10px" }}>
          <span>Select datasets to visualize:</span>
        </div>

        <ResizableTable
          data={allDatasetsToUse}
          mappings={mappings}
          widthMap={datasetColumnWidths}
          containerHeight={200}
          itemName="available datasets"
          componentProps={{
            dispatch,
            selectedDatasets
          }}
          getRowStyle={(dataset) => ({
            backgroundColor: selectedDatasets.includes(dataset.dataset_id) ? "lightblue" : "white"
          })}
          onRowClick={(dataset) => dispatch(explorerActions.toggleDatasetSelection(dataset.dataset_id))}
          footerAction={footerAction}
        />

        <div style={{ marginTop: "15px", marginBottom: "15px", textAlign: "center" }}>
          <button
            type="button"
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
            Update Visualization {pendingChanges > 0 ? `(${pendingChanges} changes pending)` : ""}
          </button>

          <button
            type="button"
            onClick={() => {
              window.location.href = "/";
            }}
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

        <div
          style={{
            marginTop: "10px",
            padding: "12px",
            backgroundColor: loadedClonalFamilies === 0 ? "#f8d7da" : "#d4edda",
            border: loadedClonalFamilies === 0 ? "1px solid #dc3545" : "1px solid #28a745",
            borderRadius: "4px",
            color: loadedClonalFamilies === 0 ? "#721c24" : "#155724",
            fontSize: "14px",
            textAlign: "center",
            fontWeight: "bold"
          }}
          title={
            loadedClonalFamilies > 0
              ? `Loaded datasets: ${allDatasetsToUse.filter((d) => d.loading === "DONE").map((d) => d.name || d.dataset_id).join(", ")}`
              : "No datasets loaded"
          }
        >
          Number of clonal families loaded: {loadedClonalFamilies}
        </div>
        {loadedClonalFamilies === 0 && (
          <div
            style={{
              marginTop: "10px",
              padding: "12px",
              backgroundColor: "#fff3cd",
              border: "1px solid #ffc107",
              borderRadius: "4px",
              color: "#856404",
              fontSize: "14px",
              textAlign: "center"
            }}
          >
            No datasets loaded. Please select one or more datasets from the table above and click &quot;Update
            Visualization&quot; to begin exploring clonal families.
          </div>
        )}
      </div>
    );
  }
}
