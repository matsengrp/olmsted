import React from "react";
import { connect } from "react-redux";
import * as _ from "lodash";
import { FiRefreshCw, FiDatabase, FiStar } from "react-icons/fi";
import { GreenCheckmark } from "../util/loading";
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
  DatasetStarCell,
  getDatasetCsvColumns,
  datasetColumnWidths
} from "../tables/DatasetTableCells";
import { DatasetInfoCell } from "../tables/RowInfoModal";

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

// Gray circle icon for unselected state (matches LoadingStatus icon style)
function GrayCircle() {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: "16px",
        height: "16px",
        backgroundColor: "#dee2e6",
        borderRadius: "50%"
      }}
    />
  );
}

// Component for dataset selection indicator (matches LoadingStatus icon style)
function SelectionCell({ datum, selectedDatasets }) {
  if (!datum) {
    return (
      <div style={{ width: "100%", textAlign: "center" }}>
        <GrayCircle />
      </div>
    );
  }

  const isSelected = selectedDatasets && selectedDatasets.includes(datum.dataset_id);

  return (
    <div style={{ width: "100%", textAlign: "center" }}>
      {isSelected ? <GreenCheckmark /> : <GrayCircle />}
    </div>
  );
}

// Mark these as React components for production builds where names are minified
SelectionCell.isReactComponent = true;
LoadStatusDisplay.isReactComponent = true;

@connect((state) => ({
  loadedClonalFamilies: countLoadedClonalFamilies(state.datasets.availableDatasets),
  selectedDatasets: state.datasets.selectedDatasets,
  allDatasets: state.datasets.availableDatasets,
  starredDatasets: state.datasets.starredDatasets || []
}))
export default class DatasetLoadingTable extends React.Component {
  constructor(props) {
    super(props);
    this.handleBatchUpdate = this.handleBatchUpdate.bind(this);
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
      updateHovered: false,
      manageHovered: false,
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
    const { allDatasets, datasets, selectedDatasets, starredDatasets, dispatch, loadedClonalFamilies } = this.props;
    const { sortStarredFirst, showOnlyStarred, starAllHovered, unstarAllHovered, clearStarsHovered } = this.state;
    const allDatasetsRaw = allDatasets || datasets || [];

    // Filter to only starred if enabled
    const filteredDatasets = showOnlyStarred
      ? allDatasetsRaw.filter((d) => starredDatasets.includes(d.dataset_id))
      : allDatasetsRaw;

    // Sort datasets - optionally with starred first
    const allDatasetsToUse = sortStarredFirst
      ? _.orderBy(filteredDatasets, [(d) => (starredDatasets.includes(d.dataset_id) ? 1 : 0)], ["desc"])
      : filteredDatasets;

    // Calculate changes pending
    const currentlyLoaded = new Set(allDatasetsToUse.filter((d) => d.loading === "DONE").map((d) => d.dataset_id));
    const pendingChanges =
      selectedDatasets.filter((id) => !currentlyLoaded.has(id)).length +
      Array.from(currentlyLoaded).filter((id) => !selectedDatasets.includes(id)).length;

    // Check if we need citation column
    const showCitation = _.some(allDatasetsToUse, (d) => d.paper !== undefined);

    // Build mappings for the table - same as DatasetManagementTable but with selection checkboxes
    // Action columns grouped at the beginning: Star, Select, Status, Info (no Delete in loading table)
    const mappings = [
      ["Star", DatasetStarCell, { sortable: false }],
      ["Select", SelectionCell, { sortable: false }],
      ["Status", LoadStatusDisplay, { sortable: false }],
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

    // CSV columns for export
    const csvColumns = getDatasetCsvColumns(showCitation);

    // Bulk star operations
    const visibleIds = allDatasetsToUse.map((d) => d.dataset_id);
    const visibleStarredCount = visibleIds.filter((id) => starredDatasets.includes(id)).length;
    const allVisibleStarred = visibleStarredCount === allDatasetsToUse.length && allDatasetsToUse.length > 0;

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

    const footerAction = allDatasetsToUse.length > 0 ? (
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
          disabled={allVisibleStarred}
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
          data={allDatasetsToUse}
          columns={csvColumns}
          filename="datasets.csv"
          label="Download Table as CSV"
          compact
        />
      </div>
    ) : null;

    // Get row style - selected gets priority, then starred
    const getRowStyle = (dataset) => {
      const isSelected = selectedDatasets.includes(dataset.dataset_id);
      const isStarred = starredDatasets.includes(dataset.dataset_id);
      if (isSelected) {
        return { backgroundColor: "lightblue" };
      }
      if (isStarred) {
        return { backgroundColor: "#fffaeb" };
      }
      return { backgroundColor: "white" };
    };

    return (
      <div style={{ width: "100%" }}>
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
            selectedDatasets,
            starredDatasets,
            onToggleStar: (dataset_id) => dispatch(explorerActions.toggleStarredDataset(dataset_id))
          }}
          getRowStyle={getRowStyle}
          onRowClick={(dataset) => dispatch(explorerActions.toggleDatasetSelection(dataset.dataset_id))}
          footerAction={footerAction}
        />

        <div style={{ marginTop: "15px", marginBottom: "15px", textAlign: "center" }}>
          <button
            type="button"
            onClick={this.handleBatchUpdate}
            disabled={pendingChanges === 0}
            onMouseEnter={() => this.setState({ updateHovered: true })}
            onMouseLeave={() => this.setState({ updateHovered: false })}
            style={{
              padding: "8px 16px",
              fontSize: "14px",
              fontWeight: "bold",
              backgroundColor: pendingChanges > 0
                ? (this.state.updateHovered ? "#0069d9" : "#007bff")
                : "#6c757d",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: pendingChanges > 0 ? "pointer" : "not-allowed",
              marginRight: "10px",
              transition: "background-color 0.15s ease",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px"
            }}
          >
            <FiRefreshCw size={16} />
            Update Visualization {pendingChanges > 0 ? `(${pendingChanges} changes pending)` : ""}
          </button>

          <button
            type="button"
            onClick={() => {
              window.location.href = "/";
            }}
            onMouseEnter={() => this.setState({ manageHovered: true })}
            onMouseLeave={() => this.setState({ manageHovered: false })}
            style={{
              padding: "8px 16px",
              fontSize: "14px",
              fontWeight: "bold",
              backgroundColor: this.state.manageHovered ? "#218838" : "#28a745",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              transition: "background-color 0.15s ease",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px"
            }}
          >
            <FiDatabase size={16} />
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
