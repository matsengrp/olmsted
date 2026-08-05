import React from "react";
import { connect } from "react-redux";
import * as _ from "lodash";
import { FiStar } from "react-icons/fi";
import { arrayMove } from "@dnd-kit/sortable";
import { red } from "./displayError";
import { getClientClonalFamilies } from "../../actions/clientDataLoader";
import clientDataStore from "../../utils/clientDataStore";
import * as types from "../../actions/types";
import * as explorerActions from "../../actions/explorer";
import { isUserUpload } from "../../constants/datasetSource";
import { TABLE_KEYS } from "../../constants/tableColumns";
import {
  orderedMappings,
  effectiveOptionalOrder,
  buildColumnDefs,
  filterVisibleMappings
} from "../../utils/columnLayout";
import { LoadingStatus } from "../util/loading";
import { ResizableTable } from "../util/resizableTable";
import DownloadCSV from "../util/downloadCsv";
import ColumnPicker from "../util/ColumnPicker";
import {
  SizeCell,
  UploadTimeCell,
  BuildTimeCell,
  DatasetStarCell,
  getDatasetCsvColumns,
  datasetColumnWidths,
  MissingFieldsCell
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

        getClientClonalFamilies(dispatch, dataset.dataset_id);
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

      getClientClonalFamilies(dispatch, dataset.dataset_id);
      break;
    }
  }
}

// Full column set in default display order. Star/Load/Info/Name/Delete are
// action/identity columns that stay fixed (locked visible, non-draggable); the
// rest are user-toggleable and reorderable via the Columns picker. Delete stays
// pinned to the end regardless of optional-column order (see render()).
const DATASET_MANAGEMENT_LEADING_MAPPINGS = [
  ["Star", DatasetStarCell, { sortable: false, required: true }],
  ["Load", LoadStatusCell, { sortKey: "loading", required: true }],
  ["Info", DatasetInfoCell, { sortable: false, required: true }],
  ["Name", (d) => d.name || d.dataset_id, { sortKey: "name", required: true }]
];
const DATASET_MANAGEMENT_OPTIONAL_MAPPINGS = [
  ["Source", (d) => (isUserUpload(d) ? "Local" : "Server"), { style: { fontSize: "12px" }, sortKey: "source" }],
  ["Size (MB)", SizeCell, { sortKey: "file_size", style: { textAlign: "right" } }],
  ["Subjects", "subjects_count"],
  ["Families", "clone_count"],
  ["Upload Time", UploadTimeCell, { sortKey: "upload_time" }],
  ["Build Time", BuildTimeCell, { sortKey: "build.time" }],
  ["Missing Fields", MissingFieldsCell, { sortable: false }]
];
const DATASET_MANAGEMENT_TRAILING_MAPPINGS = [["Delete", DatasetDeleteCell, { sortable: false, required: true }]];

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
    } catch (_e) {
      // ignore
    }
    let hideServerData = false;
    try {
      const savedHide = sessionStorage.getItem("olmsted_datasets_hide_server");
      if (savedHide !== null) hideServerData = JSON.parse(savedHide);
    } catch (_e) {
      // ignore
    }
    this.state = {
      sortStarredFirst,
      showOnlyStarred,
      hideServerData,
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
      } catch (_e) {
        /* ignore */
      }
      return { sortStarredFirst: newValue };
    });
  };

  toggleShowOnlyStarred = () => {
    this.setState((prevState) => {
      const newValue = !prevState.showOnlyStarred;
      try {
        sessionStorage.setItem("olmsted_datasets_show_only_starred", JSON.stringify(newValue));
      } catch (_e) {
        /* ignore */
      }
      return { showOnlyStarred: newValue };
    });
  };

  toggleHideServerData = () => {
    this.setState((prevState) => {
      const newValue = !prevState.hideServerData;
      try {
        sessionStorage.setItem("olmsted_datasets_hide_server", JSON.stringify(newValue));
      } catch (_e) {
        /* ignore */
      }
      return { hideServerData: newValue };
    });
  };

  // Reorder optional columns: move `activeName` to `overName`'s slot within the
  // full optional order (so hidden columns keep their relative positions), then
  // persist the new order. Delete stays pinned to the end (see render()).
  handleColumnReorder = (activeName, overName) => {
    const { columnOrder, dispatch } = this.props;
    const order = effectiveOptionalOrder(columnOrder, DATASET_MANAGEMENT_OPTIONAL_MAPPINGS);
    const from = order.indexOf(activeName);
    const to = order.indexOf(overName);
    if (from === -1 || to === -1 || from === to) return;
    dispatch(explorerActions.setDatasetManagementColumnOrder(arrayMove(order, from, to)));
  };

  render() {
    const { availableDatasets, starredDatasets, dispatch, columnVisibility, columnOrder } = this.props;
    const { sortStarredFirst, showOnlyStarred, hideServerData, starAllHovered, unstarAllHovered, clearStarsHovered } =
      this.state;

    if (!availableDatasets) {
      return (
        <div style={{ fontSize: "20px", fontWeight: 400, color: red }}>There was an error fetching the datasets</div>
      );
    }

    // Filter datasets
    let filteredDatasets = availableDatasets;
    if (hideServerData) {
      filteredDatasets = filteredDatasets.filter(isUserUpload);
    }
    if (showOnlyStarred) {
      filteredDatasets = filteredDatasets.filter((d) => starredDatasets.includes(d.dataset_id));
    }

    // Sort datasets - optionally with starred first
    const sortedDatasets = sortStarredFirst
      ? _.orderBy(filteredDatasets, [(d) => (starredDatasets.includes(d.dataset_id) ? 1 : 0)], ["desc"])
      : filteredDatasets;

    // Columns in the user's order (leading required, then optional per
    // columnOrder, then Delete pinned last), filtered by visibility. The picker
    // lists the full ordered set; the table renders only the visible ones.
    const allOrderedMappings = [
      ...orderedMappings(DATASET_MANAGEMENT_LEADING_MAPPINGS, DATASET_MANAGEMENT_OPTIONAL_MAPPINGS, columnOrder),
      ...DATASET_MANAGEMENT_TRAILING_MAPPINGS
    ];
    const columnDefs = buildColumnDefs(allOrderedMappings, columnVisibility);
    const mappings = filterVisibleMappings(allOrderedMappings, columnVisibility);

    // CSV columns for export
    const csvColumns = getDatasetCsvColumns();

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

    const footerAction =
      availableDatasets.length > 0 ? (
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <label
            style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "11px", cursor: "pointer" }}
          >
            <input
              type="checkbox"
              checked={sortStarredFirst}
              onChange={this.toggleSortStarredFirst}
              style={{ cursor: "pointer" }}
            />
            Starred first
          </label>
          <label
            style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "11px", cursor: "pointer" }}
          >
            <input
              type="checkbox"
              checked={showOnlyStarred}
              onChange={this.toggleShowOnlyStarred}
              style={{ cursor: "pointer" }}
            />
            Only starred
          </label>
          <label
            style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "11px", cursor: "pointer" }}
          >
            <input
              type="checkbox"
              checked={hideServerData}
              onChange={this.toggleHideServerData}
              style={{ cursor: "pointer" }}
            />
            Hide server data
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
            style={{
              ...starButtonStyle,
              background: starAllHovered ? "#fff8e1" : "none",
              borderColor: starAllHovered ? "#ffc107" : "#ccc"
            }}
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
            style={{
              ...starButtonStyle,
              background: unstarAllHovered ? "#f5f5f5" : "none",
              borderColor: unstarAllHovered ? "#999" : "#ccc"
            }}
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
              style={{
                ...starButtonStyle,
                background: clearStarsHovered ? "#ffebee" : "none",
                borderColor: clearStarsHovered ? "#f44336" : "#ccc",
                color: clearStarsHovered ? "#f44336" : "inherit"
              }}
              title={`Clear all ${starredDatasets.length} starred datasets`}
            >
              Clear Stars ({starredDatasets.length})
            </button>
          )}
          <ColumnPicker
            columns={columnDefs}
            onToggle={(name) => {
              const col = columnDefs.find((c) => c.name === name);
              if (col && !col.required)
                dispatch(explorerActions.setDatasetManagementColumnVisibility(name, !col.visible));
            }}
          />
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
          onReorderColumns={this.handleColumnReorder}
          footerAction={footerAction}
        />
      </div>
    );
  }
}

export const DatasetManagementTable = connect((state) => ({
  starredDatasets: state.datasets.starredDatasets || [],
  columnVisibility: state.tableColumns[TABLE_KEYS.DATASET_MANAGEMENT].visibility,
  columnOrder: state.tableColumns[TABLE_KEYS.DATASET_MANAGEMENT].order
}))(DatasetManagementTableComponent);
