import React from "react";
import * as _ from "lodash";
import { red } from "./displayError";
import { getClonalFamilies } from "../../actions/loadData";
import { getClientClonalFamilies } from "../../actions/clientDataLoader";
import clientDataStore from "../../utils/clientDataStore";
import * as types from "../../actions/types";
import { LoadingStatus } from "../util/loading";
import { ResizableTable } from "../util/resizableTable";
import DownloadCSV from "../util/downloadCsv";
import {
  CitationCell,
  SizeCell,
  UploadTimeCell,
  BuildTimeCell,
  getDatasetCsvColumns,
  datasetColumnWidths
} from "../tables/DatasetTableCells";

// Component for the load status column (clickable to load/unload)
class LoadStatusCell extends React.Component {
  constructor(props) {
    super(props);
    this.selectDataset = this.selectDataset.bind(this);
  }

  selectDataset(e) {
    const { datum, dispatch } = this.props;
    e.stopPropagation();
    const dataset = datum;

    switch (dataset.loading) {
      case "LOADING": {
        break;
      }
      case "DONE": {
        dispatch({
          type: types.LOADING_DATASET,
          dataset_id: dataset.dataset_id,
          loading: false
        });
        break;
      }
      case "ERROR": {
        dispatch({
          type: types.LOADING_DATASET,
          dataset_id: dataset.dataset_id,
          loading: false
        });
        break;
      }
      default: {
        dispatch({
          type: types.LOADING_DATASET,
          dataset_id: dataset.dataset_id,
          loading: "LOADING"
        });

        // Try client-side data first, fallback to server
        if (dataset.isClientSide) {
          getClientClonalFamilies(dispatch, dataset.dataset_id);
        } else {
          getClonalFamilies(dispatch, dataset.dataset_id);
        }
        break;
      }
    }
  }

  render() {
    const { datum } = this.props;

    /**
     * Keyboard handler for dataset selection
     * WCAG 2.1.1: Interactive table cells must be keyboard accessible
     * Allows dataset selection via keyboard navigation
     */
    const handleKeyDown = (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        this.selectDataset();
      }
    };

    return (
      <div
        onClick={this.selectDataset}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={0}
        aria-label={`Select dataset ${datum.dataset_id}`}
        style={{ cursor: "pointer", width: "100%", textAlign: "center" }}
      >
        <LoadingStatus loadingStatus={datum.loading} />
      </div>
    );
  }
}

// Component for the delete button
class DeleteButtonCell extends React.Component {
  constructor(props) {
    super(props);
    this.deleteDataset = this.deleteDataset.bind(this);
  }

  deleteDataset(e) {
    const { datum, dispatch } = this.props;
    e.stopPropagation();
    const dataset = datum;
    const datasetName = dataset.name || dataset.dataset_id;

    if (window.confirm(`Are you sure you want to delete dataset "${datasetName}"?`)) {
      clientDataStore.removeDataset(dataset.dataset_id);
      dispatch({
        type: types.REMOVE_DATASET,
        dataset_id: dataset.dataset_id
      });
      console.log("Deleted client-side dataset:", dataset.dataset_id);
    }
  }

  render() {
    const { datum } = this.props;
    const isClientSide = datum.isClientSide || datum.temporary;

    if (!isClientSide) {
      return <span>—</span>;
    }

    return (
      <button
        type="button"
        onClick={this.deleteDataset}
        style={{
          padding: "2px 8px",
          fontSize: "12px",
          backgroundColor: "#dc3545",
          color: "white",
          border: "none",
          borderRadius: "3px",
          cursor: "pointer"
        }}
      >
        Delete
      </button>
    );
  }
}

// Helper function to handle dataset selection (load/unload)
function handleDatasetSelect(dataset, dispatch) {
  switch (dataset.loading) {
    case "LOADING": {
      // Do nothing while loading
      break;
    }
    case "DONE": {
      dispatch({
        type: types.LOADING_DATASET,
        dataset_id: dataset.dataset_id,
        loading: false
      });
      break;
    }
    case "ERROR": {
      dispatch({
        type: types.LOADING_DATASET,
        dataset_id: dataset.dataset_id,
        loading: false
      });
      break;
    }
    default: {
      dispatch({
        type: types.LOADING_DATASET,
        dataset_id: dataset.dataset_id,
        loading: "LOADING"
      });

      // Try client-side data first, fallback to server
      if (dataset.isClientSide) {
        getClientClonalFamilies(dispatch, dataset.dataset_id);
      } else {
        getClonalFamilies(dispatch, dataset.dataset_id);
      }
      break;
    }
  }
}

export function DatasetManagementTable({ availableDatasets, dispatch }) {
  if (!availableDatasets) {
    return (
      <div style={{ fontSize: "20px", fontWeight: 400, color: red }}>There was an error fetching the datasets</div>
    );
  }

  // Check if we need citation column
  const showCitation = _.some(availableDatasets, (d) => d.paper !== undefined);
  // Check if we need delete button column
  const hasClientDatasets = _.some(availableDatasets, (d) => d.isClientSide || d.temporary);

  // Build mappings for the table
  const mappings = [
    ["Load", LoadStatusCell, { sortKey: "loading" }],
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

  if (hasClientDatasets) {
    mappings.push(["Actions", DeleteButtonCell, { sortable: false }]);
  }

  // CSV columns for export
  const csvColumns = getDatasetCsvColumns(showCitation);

  const footerAction = availableDatasets.length > 0 ? (
    <DownloadCSV
      data={availableDatasets}
      columns={csvColumns}
      filename="datasets.csv"
      label="Download Table as CSV"
      compact
    />
  ) : null;

  return (
    <div style={{ width: "100%" }}>
      <ResizableTable
        data={availableDatasets}
        mappings={mappings}
        widthMap={datasetColumnWidths}
        containerHeight={200}
        itemName="datasets"
        componentProps={{ dispatch: dispatch }}
        getRowStyle={(dataset) => ({
          backgroundColor: dataset.loading ? "lightblue" : "white"
        })}
        onRowClick={(dataset) => handleDatasetSelect(dataset, dispatch)}
        footerAction={footerAction}
      />
    </div>
  );
}
