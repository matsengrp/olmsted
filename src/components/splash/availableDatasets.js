import React from "react";
import * as _ from "lodash";
import { red } from "./displayError";
import { getClonalFamilies } from "../../actions/loadData";
import { getClientClonalFamilies } from "../../actions/clientDataLoader";
import clientDataStore from "../../utils/clientDataStore";
import * as types from "../../actions/types";
import { LoadingStatus } from "../util/loading";
import { ResizableTable } from "../util/resizableTable";

// Component for the load status column
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

// Component for the citation column
function CitationCell({ datum }) {
  if (!datum) {
    return <span>—</span>;
  }

  const { paper } = datum;
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

// Component for the size column
function SizeCell({ datum }) {
  if (!datum) {
    return <span>—</span>;
  }

  const dataset = datum;
  const sizeInBytes = dataset.file_size || dataset.fileSize || 0;

  if (sizeInBytes === 0) {
    return <span>—</span>;
  }

  const sizeInMB = (sizeInBytes / (1024 * 1024)).toFixed(1);
  return <span>{sizeInMB} MB</span>;
}

// Component for the upload time column
function UploadTimeCell({ datum }) {
  if (!datum) {
    return <span>—</span>;
  }

  const uploadTime = datum.upload_time;
  if (!uploadTime) {
    return <span>—</span>;
  }

  // Display in YYYY-MM-DD HH:MM:SS format (remove T and Z from ISO format)
  const formattedTime = uploadTime.replace('T', ' ').replace('Z', '');
  return <span>{formattedTime}</span>;
}

// Component for the build time column
function BuildTimeCell({ datum }) {
  if (!datum) {
    return <span>—</span>;
  }

  const buildTime = datum.build ? datum.build.time || "—" : "—";
  return <span>{buildTime}</span>;
}

// Mark these as React components for production builds where names are minified
CitationCell.isReactComponent = true;
SizeCell.isReactComponent = true;
UploadTimeCell.isReactComponent = true;
BuildTimeCell.isReactComponent = true;

// Component for the download button
class DownloadButtonCell extends React.Component {
  constructor(props) {
    super(props);
    this.state = { downloading: false };
    this.downloadDataset = this.downloadDataset.bind(this);
  }

  async downloadDataset(e) {
    const { datum } = this.props;
    e.stopPropagation();

    this.setState({ downloading: true });

    try {
      const consolidated = await clientDataStore.exportDataset(datum.dataset_id);

      // Create downloadable blob
      const jsonString = JSON.stringify(consolidated, null, 2);
      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);

      // Create temporary link and trigger download
      const link = document.createElement("a");
      const filename = `${datum.name || datum.dataset_id}_olmsted.json`;
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up blob URL
      URL.revokeObjectURL(url);

      console.log("Downloaded dataset:", datum.dataset_id);
    } catch (error) {
      console.error("Failed to download dataset:", error);
      alert(`Failed to download dataset: ${error.message}`);
    } finally {
      this.setState({ downloading: false });
    }
  }

  render() {
    const { datum } = this.props;
    const { downloading } = this.state;
    const isClientSide = datum.isClientSide || datum.temporary;

    if (!isClientSide) {
      return null;
    }

    return (
      <button
        type="button"
        onClick={this.downloadDataset}
        disabled={downloading}
        style={{
          padding: "2px 8px",
          fontSize: "12px",
          backgroundColor: downloading ? "#6c757d" : "#28a745",
          color: "white",
          border: "none",
          borderRadius: "3px",
          cursor: downloading ? "wait" : "pointer",
          marginRight: "4px"
        }}
      >
        {downloading ? "..." : "Download"}
      </button>
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
      return null;
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

// Combined actions cell with Download and Delete buttons
function ActionsCell({ datum, dispatch }) {
  const isClientSide = datum.isClientSide || datum.temporary;

  if (!isClientSide) {
    return <span>—</span>;
  }

  return (
    <div style={{ display: "flex", justifyContent: "center" }}>
      <DownloadButtonCell datum={datum} dispatch={dispatch} />
      <DeleteButtonCell datum={datum} dispatch={dispatch} />
    </div>
  );
}

// Mark as React component for production builds
ActionsCell.isReactComponent = true;

export function DatasetsTable({ availableDatasets, dispatch }) {
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
    ["Status", LoadStatusCell, { sortKey: "loading" }],
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
    mappings.push(["Actions", ActionsCell, { sortable: false }]);
  }

  // Define column widths
  const columnWidths = [
    60, // Status
    200, // Name
    150, // ID
    80, // Source
    80, // Size (MB)
    80, // Subjects
    100, // Families
    120, // Upload time
    120, // Build time
    ...(showCitation ? [150] : []),
    ...(hasClientDatasets ? [160] : [])
  ];

  return (
    <div style={{ width: "100%" }}>
      <div style={{ fontSize: "26px", marginBottom: "10px" }}>Available Datasets:</div>
      <ResizableTable
        data={availableDatasets}
        mappings={mappings}
        columnWidths={columnWidths}
        containerHeight={200}
        itemName="datasets"
        componentProps={{ dispatch: dispatch }}
        getRowStyle={(dataset) => ({
          backgroundColor: dataset.loading ? "lightblue" : "white"
        })}
      />
    </div>
  );
}
