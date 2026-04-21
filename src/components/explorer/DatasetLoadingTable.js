import React from "react";
import { connect } from "react-redux";
import * as _ from "lodash";
import { FiRefreshCw, FiDatabase, FiStar, FiX } from "react-icons/fi";
import { GreenCheckmark, LoadingStatus } from "../util/loading";
import { countLoadedClonalFamilies } from "../../selectors/clonalFamilies";
import { ResizableTable } from "../util/resizableTable";
import { getClientClonalFamilies } from "../../actions/clientDataLoader";
import { getClonalFamilies } from "../../actions/loadData";
import * as explorerActions from "../../actions/explorer";
import { resolveFieldMetadata } from "../../utils/fieldMetadata";
import { DEFAULT_DISPLAY, DISPLAY_MODE_ICONS } from "../../constants/fieldDefaults";
import * as types from "../../actions/types";
import DownloadCSV from "../util/downloadCsv";
import {
  SizeCell,
  UploadTimeCell,
  BuildTimeCell,
  DatasetStarCell,
  getDatasetCsvColumns,
  datasetColumnWidths,
  MissingFieldsCell
} from "../tables/DatasetTableCells";
import { DatasetInfoCell } from "../tables/RowInfoModal";

// --- Shared constants and helpers ---

const FIELD_VIEW_MODES = { UNION: "union", INTERSECTION: "intersection" };

const SESSION_KEYS = {
  sortStarredFirst: "olmsted_datasets_sort_starred_first",
  showOnlyStarred: "olmsted_datasets_show_only_starred",
  hideServerData: "olmsted_datasets_hide_server",
  fieldViewMode: "olmsted_datasets_field_view_mode"
};

// JSON-encoded session read with a fallback when the key is missing or unparseable.
const readSessionJson = (key, fallback) => {
  try {
    const raw = sessionStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch (_e) {
    return fallback;
  }
};

// Enum-valued session read that restricts to a list of allowed values.
const readSessionEnum = (key, allowed, fallback) => {
  try {
    const raw = sessionStorage.getItem(key);
    return allowed.includes(raw) ? raw : fallback;
  } catch (_e) {
    return fallback;
  }
};

// Silent session write; ignores quota/privacy errors.
const writeSession = (key, value) => {
  try {
    sessionStorage.setItem(key, typeof value === "string" ? value : JSON.stringify(value));
  } catch (_e) {
    /* ignore */
  }
};

// Hoisted style objects for FieldViewModeToggle so they aren't recreated per render.
const TOGGLE_BASE_BTN = {
  border: "1px solid #ced4da",
  padding: "2px 8px",
  fontSize: 11,
  cursor: "pointer",
  lineHeight: 1.4
};
const TOGGLE_ACTIVE_BTN = { backgroundColor: "#007bff", color: "#fff", borderColor: "#007bff" };
const TOGGLE_INACTIVE_BTN = { backgroundColor: "#fff", color: "#495057" };

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

// Segmented control for toggling Available Fields between union and intersection of loaded datasets.
function FieldViewModeToggle({ mode, onChange }) {
  return (
    <span
      style={{ display: "inline-flex" }}
      title="Union shows every field present in any dataset; Intersection shows only fields shared by all datasets."
    >
      <button
        type="button"
        onClick={() => onChange(FIELD_VIEW_MODES.INTERSECTION)}
        style={{
          ...TOGGLE_BASE_BTN,
          ...(mode === FIELD_VIEW_MODES.INTERSECTION ? TOGGLE_ACTIVE_BTN : TOGGLE_INACTIVE_BTN),
          borderTopLeftRadius: 3,
          borderBottomLeftRadius: 3
        }}
      >
        Show Only Shared Data Fields
      </button>
      <button
        type="button"
        onClick={() => onChange(FIELD_VIEW_MODES.UNION)}
        style={{
          ...TOGGLE_BASE_BTN,
          ...(mode === FIELD_VIEW_MODES.UNION ? TOGGLE_ACTIVE_BTN : TOGGLE_INACTIVE_BTN),
          borderTopRightRadius: 3,
          borderBottomRightRadius: 3,
          marginLeft: -1
        }}
      >
        Show All Data Fields
      </button>
    </span>
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

  return <div style={{ width: "100%", textAlign: "center" }}>{isSelected ? <GreenCheckmark /> : <GrayCircle />}</div>;
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
    const sortStarredFirst = readSessionJson(SESSION_KEYS.sortStarredFirst, true);
    const showOnlyStarred = readSessionJson(SESSION_KEYS.showOnlyStarred, false);
    const hideServerData = readSessionJson(SESSION_KEYS.hideServerData, false);
    const fieldViewMode = readSessionEnum(
      SESSION_KEYS.fieldViewMode,
      [FIELD_VIEW_MODES.UNION, FIELD_VIEW_MODES.INTERSECTION],
      FIELD_VIEW_MODES.INTERSECTION
    );
    this.state = {
      updateHovered: false,
      manageHovered: false,
      fieldWarningDismissed: false,
      sortStarredFirst,
      showOnlyStarred,
      hideServerData,
      fieldViewMode,
      starAllHovered: false,
      unstarAllHovered: false,
      clearStarsHovered: false,
      clearSelectionsHovered: false
    };
  }

  toggleSortStarredFirst = () => {
    this.setState((prevState) => {
      const newValue = !prevState.sortStarredFirst;
      writeSession(SESSION_KEYS.sortStarredFirst, newValue);
      return { sortStarredFirst: newValue };
    });
  };

  toggleShowOnlyStarred = () => {
    this.setState((prevState) => {
      const newValue = !prevState.showOnlyStarred;
      writeSession(SESSION_KEYS.showOnlyStarred, newValue);
      return { showOnlyStarred: newValue };
    });
  };

  toggleHideServerData = () => {
    this.setState((prevState) => {
      const newValue = !prevState.hideServerData;
      writeSession(SESSION_KEYS.hideServerData, newValue);
      return { hideServerData: newValue };
    });
  };

  setFieldViewMode = (mode) => {
    writeSession(SESSION_KEYS.fieldViewMode, mode);
    this.setState({ fieldViewMode: mode });
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
    // Reset field warning when datasets change
    this.setState({ fieldWarningDismissed: false });
    const { selectedDatasets, allDatasets, dispatch } = this.props;

    // Get currently loaded dataset IDs
    const currentlyLoaded = new Set(allDatasets.filter((d) => d.loading === "DONE").map((d) => d.dataset_id));

    // Determine what needs to be loaded and unloaded
    const toLoad = selectedDatasets.filter((id) => !currentlyLoaded.has(id));
    const toUnload = Array.from(currentlyLoaded).filter((id) => !selectedDatasets.includes(id));

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

    // Intentionally do NOT clear selections here: after a successful update,
    // selections should reflect what is loaded so the button settles into the
    // "Visualization Up-to-Date" state until the user toggles something.
  }

  /**
   * Render a summary of available fields across loaded datasets with metadata.
   * @param {Object[]} allDatasetsToUse - The datasets currently displayed in the table
   * @returns {React.ReactNode|null}
   */
  /**
   * Render a small panel listing the currently active (loaded) datasets.
   * Shown directly above the Available Data Fields panel.
   * @param {Object[]} allDatasetsToUse - The datasets currently displayed in the table
   * @returns {React.ReactNode|null}
   */
  renderLoadedDatasetsList(allDatasetsToUse) {
    const loadedDatasets = allDatasetsToUse.filter((d) => d.loading === "DONE");
    if (loadedDatasets.length === 0) return null;
    return (
      <div
        style={{
          marginTop: 10,
          padding: "10px 14px",
          backgroundColor: "#f8f9fa",
          border: "1px solid #dee2e6",
          borderRadius: 4,
          fontSize: 12
        }}
      >
        <div style={{ fontWeight: "bold", fontSize: 13, marginBottom: 6 }}>
          Active Datasets ({loadedDatasets.length})
        </div>
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          {loadedDatasets.map((ds) => {
            const name = ds.name || ds.dataset_id;
            const count = typeof ds.clone_count === "number" ? ds.clone_count : null;
            return (
              <li key={ds.dataset_id}>
                <span style={{ fontWeight: 500 }}>{name}</span>
                {count !== null && (
                  <span style={{ color: "#666" }}>
                    {" "}
                    — {count} clonal {count === 1 ? "family" : "families"}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  renderFieldSummary(allDatasetsToUse) {
    const loadedDatasets = allDatasetsToUse.filter((d) => d.loading === "DONE");
    if (loadedDatasets.length === 0) return null;

    // Resolve metadata for each loaded dataset (includes builtins/defaults)
    const datasetsWithoutMetadata = loadedDatasets
      .filter((ds) => !ds.field_metadata)
      .map((ds) => ds.name || ds.dataset_id);
    const resolvedDatasets = loadedDatasets.map((ds) => ({
      name: ds.name || ds.dataset_id,
      metadata: resolveFieldMetadata(ds.field_metadata || null)
    }));

    // Collect all fields across all loaded datasets
    const allFields = {}; // key → { level, label, datasets: Set }
    const allLevels = ["clone", "node", "branch", "mutation"];
    for (const ds of resolvedDatasets) {
      for (const level of allLevels) {
        const fields = ds.metadata[level];
        if (!fields) continue;
        for (const [field, meta] of Object.entries(fields)) {
          const key = `${level}.${field}`;
          if (!allFields[key]) {
            allFields[key] = {
              level,
              field,
              label: meta.label || field,
              type: meta.type,
              display: meta.display || DEFAULT_DISPLAY,
              datasets: new Set()
            };
          }
          allFields[key].datasets.add(ds.name);
        }
      }
    }

    const totalDatasets = resolvedDatasets.length;
    const fieldList = Object.values(allFields);
    const sharedFields = fieldList.filter((f) => f.datasets.size === totalDatasets);
    const partialFields = fieldList.filter((f) => f.datasets.size < totalDatasets);

    // Intersection: only fields shared across all datasets.
    // Union: all fields, with partials marked inline.
    const isUnion = this.state.fieldViewMode === FIELD_VIEW_MODES.UNION && totalDatasets > 1;
    const displayedFields = isUnion ? fieldList : sharedFields;
    const fieldsByLevel = {};
    for (const level of allLevels) {
      fieldsByLevel[level] = displayedFields.filter((f) => f.level === level);
    }

    return (
      <div
        style={{
          marginTop: 10,
          padding: "10px 14px",
          backgroundColor: "#f8f9fa",
          border: "1px solid #dee2e6",
          borderRadius: 4,
          fontSize: 12
        }}
      >
        {datasetsWithoutMetadata.length > 0 && (
          <div
            style={{
              marginBottom: 8,
              padding: "6px 10px",
              backgroundColor: "#fff3cd",
              border: "1px solid #ffc107",
              borderRadius: 4,
              color: "#856404",
              fontSize: 11
            }}
          >
            <strong>⚠ No field metadata provided:</strong> {datasetsWithoutMetadata.join(", ")}. Falling back to default
            fields.
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <span style={{ fontWeight: "bold", fontSize: 13 }}>Available Data Fields</span>
          <span style={{ color: "#888", fontSize: 11 }}>
            {DISPLAY_MODE_ICONS.dropdown} dropdown {DISPLAY_MODE_ICONS.tooltip} tooltip {DISPLAY_MODE_ICONS.skip} skip
            {totalDatasets > 1 && isUnion ? " † partial (hover for datasets)" : ""}
          </span>
        </div>
        {totalDatasets > 1 && (
          <div style={{ marginBottom: 6 }}>
            <FieldViewModeToggle mode={this.state.fieldViewMode} onChange={this.setFieldViewMode} />
          </div>
        )}
        {allLevels.map((level) => {
          const fields = fieldsByLevel[level];
          return (
            <div key={level} style={{ marginBottom: 4 }}>
              <span style={{ fontWeight: 500, color: "#555" }}>{level}:</span>{" "}
              <span style={{ color: fields.length > 0 ? "#333" : "#999" }}>
                {fields.length > 0
                  ? fields.map((f, i) => {
                      const icon = DISPLAY_MODE_ICONS[f.display] || DISPLAY_MODE_ICONS.dropdown;
                      const isPartial = f.datasets.size < totalDatasets;
                      return (
                        <React.Fragment key={`${f.level}.${f.field}`}>
                          {i > 0 ? ",  " : ""}
                          <span
                            title={isPartial ? `Only in: ${[...f.datasets].join(", ")}` : undefined}
                            style={isPartial ? { color: "#856404" } : undefined}
                          >
                            {`${icon} ${f.label}${isPartial ? " †" : ""}`}
                          </span>
                        </React.Fragment>
                      );
                    })
                  : "(none)"}
              </span>
            </div>
          );
        })}
        {!isUnion && partialFields.length > 0 && totalDatasets > 1 && !this.state.fieldWarningDismissed && (
          <div
            style={{
              marginTop: 8,
              padding: "6px 10px",
              backgroundColor: "#fff3cd",
              border: "1px solid #ffc107",
              borderRadius: 4,
              color: "#856404",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start"
            }}
          >
            <div>
              <strong>Fields not shared across all datasets:</strong>
              <ul style={{ margin: "4px 0 0 0", paddingLeft: 18 }}>
                {partialFields.map((f) => (
                  <li key={`${f.level}.${f.field}`}>
                    {f.label} ({f.level}) — only in: {[...f.datasets].join(", ")}
                  </li>
                ))}
              </ul>
            </div>
            <button
              type="button"
              onClick={() => this.setState({ fieldWarningDismissed: true })}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "0 2px",
                fontSize: 16,
                color: "#856404",
                lineHeight: 1,
                flexShrink: 0
              }}
              title="Dismiss"
              aria-label="Dismiss"
            >
              &times;
            </button>
          </div>
        )}
      </div>
    );
  }

  render() {
    // Use all datasets (including loaded ones)
    const { allDatasets, datasets, selectedDatasets, starredDatasets, dispatch, loadedClonalFamilies } = this.props;
    const { sortStarredFirst, showOnlyStarred, hideServerData, starAllHovered, unstarAllHovered, clearStarsHovered } =
      this.state;
    const allDatasetsRaw = allDatasets || datasets || [];

    // Filter datasets
    let filteredDatasets = allDatasetsRaw;
    if (hideServerData) {
      filteredDatasets = filteredDatasets.filter((d) => d.isClientSide || d.temporary);
    }
    if (showOnlyStarred) {
      filteredDatasets = filteredDatasets.filter((d) => starredDatasets.includes(d.dataset_id));
    }

    // Sort datasets - optionally with starred first
    const allDatasetsToUse = sortStarredFirst
      ? _.orderBy(filteredDatasets, [(d) => (starredDatasets.includes(d.dataset_id) ? 1 : 0)], ["desc"])
      : filteredDatasets;

    // Calculate changes pending
    const currentlyLoaded = new Set(allDatasetsToUse.filter((d) => d.loading === "DONE").map((d) => d.dataset_id));
    const pendingChanges =
      selectedDatasets.filter((id) => !currentlyLoaded.has(id)).length +
      Array.from(currentlyLoaded).filter((id) => !selectedDatasets.includes(id)).length;

    // Build mappings for the table - same as DatasetManagementTable but with selection checkboxes
    // Action columns grouped at the beginning: Star, Select, Status, Info (no Delete in loading table)
    const mappings = [
      ["Star", DatasetStarCell, { sortable: false }],
      ["Select", SelectionCell, { sortable: false }],
      ["Status", LoadStatusDisplay, { sortable: false }],
      ["Info", DatasetInfoCell, { sortable: false }],
      ["Name", (d) => d.name || d.dataset_id, { sortKey: "name" }],
      [
        "Source",
        (d) => (d.isClientSide || d.temporary ? "Local" : "Server"),
        { style: { fontSize: "12px" }, sortKey: "isClientSide" }
      ],
      ["Size (MB)", SizeCell, { sortKey: "file_size", style: { textAlign: "right" } }],
      ["Subjects", "subjects_count"],
      ["Families", "clone_count"],
      ["Upload Time", UploadTimeCell, { sortKey: "upload_time" }],
      ["Build Time", BuildTimeCell, { sortKey: "build.time" }],
      ["Missing Fields", MissingFieldsCell, { sortable: false }]
    ];

    // CSV columns for export
    const csvColumns = getDatasetCsvColumns();

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

    const footerAction =
      allDatasetsRaw.length > 0 ? (
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
            disabled={allVisibleStarred || allDatasetsToUse.length === 0}
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
              backgroundColor: pendingChanges > 0 ? (this.state.updateHovered ? "#0069d9" : "#007bff") : "#6c757d",
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
            {pendingChanges > 0
              ? `Update Visualization (${pendingChanges} changes pending)`
              : "Visualization Up-to-Date"}
          </button>

          <button
            type="button"
            onClick={() => dispatch(explorerActions.clearDatasetSelections())}
            disabled={selectedDatasets.length === 0}
            onMouseEnter={() => this.setState({ clearSelectionsHovered: true })}
            onMouseLeave={() => this.setState({ clearSelectionsHovered: false })}
            style={{
              padding: "8px 16px",
              fontSize: "14px",
              fontWeight: "bold",
              backgroundColor: this.state.clearSelectionsHovered && selectedDatasets.length > 0 ? "#e8700e" : "#fd7e14",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: selectedDatasets.length === 0 ? "not-allowed" : "pointer",
              marginRight: "10px",
              transition: "background-color 0.15s ease",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              opacity: selectedDatasets.length === 0 ? 0.65 : 1
            }}
            title={selectedDatasets.length === 0 ? "No datasets selected" : "Clear all dataset selections"}
          >
            <FiX size={16} />
            Clear Selections
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
              ? `Loaded datasets: ${allDatasetsToUse
                  .filter((d) => d.loading === "DONE")
                  .map((d) => d.name || d.dataset_id)
                  .join(", ")}`
              : "No datasets loaded"
          }
        >
          Number of clonal families loaded: {loadedClonalFamilies}
        </div>
        {loadedClonalFamilies > 0 && this.renderLoadedDatasetsList(allDatasetsToUse)}
        {loadedClonalFamilies > 0 && this.renderFieldSummary(allDatasetsToUse)}
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
