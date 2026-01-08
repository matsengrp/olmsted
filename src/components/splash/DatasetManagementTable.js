import React from "react";
import { connect } from "react-redux";
import * as _ from "lodash";
import { FiStar } from "react-icons/fi";
import { red } from "./displayError";
import { getClonalFamilies } from "../../actions/loadData";
import { getClientClonalFamilies } from "../../actions/clientDataLoader";
import clientDataStore from "../../utils/clientDataStore";
import * as types from "../../actions/types";
import * as explorerActions from "../../actions/explorer";
import { LoadingStatus } from "../util/loading";
import { ResizableTable } from "../util/resizableTable";
import DownloadCSV from "../util/downloadCsv";
import {
  CitationCell,
  SizeCell,
  UploadTimeCell,
  BuildTimeCell,
  DatasetStarCell,
  getDatasetCsvColumns,
  datasetColumnWidths
} from "../tables/DatasetTableCells";
import { DatasetInfoCell, DatasetDeleteCell } from "../tables/RowInfoModal";

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

// Helper function to handle dataset deletion
function handleDatasetDelete(dataset, dispatch) {
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

class DatasetManagementTableComponent extends React.Component {
  constructor(props) {
    super(props);
    // Load preferences from sessionStorage
    let sortStarredFirst = true;
    let showOnlyStarred = false;
    try {
      const savedSort = sessionStorage.getItem("olmsted_datasets_sort_starred_first");
      if (savedSort !== null) sortStarredFirst = JSON.parse(savedSort);
      const savedFilter = sessionStorage.getItem("olmsted_datasets_show_only_starred");
      if (savedFilter !== null) showOnlyStarred = JSON.parse(savedFilter);
    } catch (e) {
      // ignore
    }
    this.state = {
      sortStarredFirst,
      showOnlyStarred,
      starAllHovered: false,
      unstarAllHovered: false,
      clearStarsHovered: false
    };
  }

  toggleSortStarredFirst = () => {
    this.setState((prevState) => {
      const newValue = !prevState.sortStarredFirst;
      try {
        sessionStorage.setItem("olmsted_datasets_sort_starred_first", JSON.stringify(newValue));
      } catch (e) { /* ignore */ }
      return { sortStarredFirst: newValue };
    });
  };

  toggleShowOnlyStarred = () => {
    this.setState((prevState) => {
      const newValue = !prevState.showOnlyStarred;
      try {
        sessionStorage.setItem("olmsted_datasets_show_only_starred", JSON.stringify(newValue));
      } catch (e) { /* ignore */ }
      return { showOnlyStarred: newValue };
    });
  };

  render() {
    const { availableDatasets, starredDatasets, dispatch } = this.props;
    const { sortStarredFirst, showOnlyStarred, starAllHovered, unstarAllHovered, clearStarsHovered } = this.state;

    if (!availableDatasets) {
      return (
        <div style={{ fontSize: "20px", fontWeight: 400, color: red }}>There was an error fetching the datasets</div>
      );
    }

    // Filter to only starred if enabled
    let filteredDatasets = showOnlyStarred
      ? availableDatasets.filter((d) => starredDatasets.includes(d.dataset_id))
      : availableDatasets;

    // Sort datasets - optionally with starred first
    const sortedDatasets = sortStarredFirst
      ? _.orderBy(filteredDatasets, [(d) => (starredDatasets.includes(d.dataset_id) ? 1 : 0)], ["desc"])
      : filteredDatasets;

    // Check if we need citation column
    const showCitation = _.some(availableDatasets, (d) => d.paper !== undefined);

    // Build mappings for the table
    // Action columns: Star, Load, Info at beginning; Delete at end
    const mappings = [
      ["Star", DatasetStarCell, { sortable: false }],
      ["Load", LoadStatusCell, { sortKey: "loading" }],
      ["Info", DatasetInfoCell, { sortable: false }],
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

    // Delete column at the end
    mappings.push(["Delete", DatasetDeleteCell, { sortable: false }]);

    // CSV columns for export
    const csvColumns = getDatasetCsvColumns(showCitation);

    // Bulk star operations
    const visibleIds = sortedDatasets.map((d) => d.dataset_id);
    const visibleStarredCount = visibleIds.filter((id) => starredDatasets.includes(id)).length;
    const allVisibleStarred = visibleStarredCount === sortedDatasets.length && sortedDatasets.length > 0;

    const starButtonStyle = {
      background: "none",
      border: "1px solid #ccc",
      borderRadius: "4px",
      padding: "4px 8px",
      fontSize: "11px",
      cursor: "pointer",
      display: "inline-flex",
      alignItems: "center",
      gap: "4px",
      transition: "all 0.15s ease"
    };

    const footerAction = availableDatasets.length > 0 ? (
      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
        <label style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "11px", cursor: "pointer" }}>
          <input type="checkbox" checked={sortStarredFirst} onChange={this.toggleSortStarredFirst} style={{ cursor: "pointer" }} />
          Starred first
        </label>
        <label style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "11px", cursor: "pointer" }}>
          <input type="checkbox" checked={showOnlyStarred} onChange={this.toggleShowOnlyStarred} style={{ cursor: "pointer" }} />
          Only starred
        </label>
        <button
          type="button"
          onClick={() => {
            visibleIds.forEach((id) => {
              if (!starredDatasets.includes(id)) dispatch(explorerActions.toggleStarredDataset(id));
            });
          }}
          onMouseEnter={() => this.setState({ starAllHovered: true })}
          onMouseLeave={() => this.setState({ starAllHovered: false })}
          style={{ ...starButtonStyle, background: starAllHovered ? "#fff8e1" : "none", borderColor: starAllHovered ? "#ffc107" : "#ccc" }}
          title="Star all visible datasets"
          disabled={allVisibleStarred || sortedDatasets.length === 0}
        >
          <FiStar size={12} style={{ fill: "#ffc107", color: "#ffc107" }} />
          Star All
        </button>
        <button
          type="button"
          onClick={() => {
            visibleIds.forEach((id) => {
              if (starredDatasets.includes(id)) dispatch(explorerActions.toggleStarredDataset(id));
            });
          }}
          onMouseEnter={() => this.setState({ unstarAllHovered: true })}
          onMouseLeave={() => this.setState({ unstarAllHovered: false })}
          style={{ ...starButtonStyle, background: unstarAllHovered ? "#f5f5f5" : "none", borderColor: unstarAllHovered ? "#999" : "#ccc" }}
          title="Unstar all visible datasets"
          disabled={visibleStarredCount === 0}
        >
          <FiStar size={12} />
          Unstar All
        </button>
        {starredDatasets.length > 0 && (
          <button
            type="button"
            onClick={() => dispatch(explorerActions.clearStarredDatasets())}
            onMouseEnter={() => this.setState({ clearStarsHovered: true })}
            onMouseLeave={() => this.setState({ clearStarsHovered: false })}
            style={{ ...starButtonStyle, background: clearStarsHovered ? "#ffebee" : "none", borderColor: clearStarsHovered ? "#f44336" : "#ccc", color: clearStarsHovered ? "#f44336" : "inherit" }}
            title={`Clear all ${starredDatasets.length} starred datasets`}
          >
            Clear Stars ({starredDatasets.length})
          </button>
        )}
        <DownloadCSV
          data={sortedDatasets}
          columns={csvColumns}
          filename="datasets.csv"
          label="Download Table as CSV"
          compact
        />
      </div>
    ) : null;

    // Get row style - starred datasets get a light gold background
    const getRowStyle = (dataset) => {
      const isStarred = starredDatasets.includes(dataset.dataset_id);
      if (dataset.loading) {
        return { backgroundColor: "lightblue" };
      }
      if (isStarred) {
        return { backgroundColor: "#fffaeb" };
      }
      return { backgroundColor: "white" };
    };

    return (
      <div style={{ width: "100%" }}>
        <ResizableTable
          data={sortedDatasets}
          mappings={mappings}
          widthMap={datasetColumnWidths}
          containerHeight={200}
          itemName="datasets"
          componentProps={{
            dispatch: dispatch,
            onDelete: (dataset) => handleDatasetDelete(dataset, dispatch),
            starredDatasets: starredDatasets,
            onToggleStar: (dataset_id) => dispatch(explorerActions.toggleStarredDataset(dataset_id))
          }}
          getRowStyle={getRowStyle}
          onRowClick={(dataset) => handleDatasetSelect(dataset, dispatch)}
          footerAction={footerAction}
        />
      </div>
    );
  }
}

export const DatasetManagementTable = connect(
  (state) => ({
    starredDatasets: state.datasets.starredDatasets || []
  })
)(DatasetManagementTableComponent);
