import React from "react";
import { connect } from "react-redux";
import * as _ from "lodash";
import { FiStar } from "react-icons/fi";
import * as explorerActions from "../../actions/explorer";
import { getBrushedClonalFamilies, getCloneChain } from "../../selectors/clonalFamilies";
import { NaiveSequence } from "./naive";
import DownloadCSV from "../util/downloadCsv";
import { ResizableTable } from "../util/resizableTable";

// Extends ResizableTable with ClonalFamilies-specific row rendering and virtual scrolling
class ResizableVirtualTable extends ResizableTable {
  renderTableRow(datum, _index) {
    const { selectedFamily, mappings, dispatch, starredFamilies } = this.props;
    const isSelected = selectedFamily && datum.ident === selectedFamily.ident;
    const isStarred = starredFamilies && starredFamilies.includes(datum.ident);
    const { columnWidths, hoveredRowId } = this.state;
    const isHovered = hoveredRowId === datum.ident;

    // Determine background color with hover effect
    // Priority: selected > starred > normal
    let backgroundColor = "white";
    if (isSelected) {
      backgroundColor = isHovered ? "#87CEEB" : "lightblue";
    } else if (isStarred) {
      backgroundColor = isHovered ? "#fff0c2" : "#fffaeb"; // Light gold for starred
    } else if (isHovered) {
      backgroundColor = "#e8e8e8"; // Light gray for hover
    }

    return (
      <div
        key={datum.ident}
        style={{
          display: "flex",
          alignItems: "center",
          borderBottom: "1px solid #eee",
          fontSize: 12,
          height: "40px",
          minHeight: "40px",
          maxHeight: "40px",
          backgroundColor,
          minWidth: "fit-content",
          cursor: "pointer",
          transition: "background-color 0.15s ease",
          overflow: "hidden",
          boxSizing: "border-box"
        }}
        onClick={() => dispatch(explorerActions.selectFamily(datum.ident || datum.clone_id))}
        onMouseEnter={() => this.setState({ hoveredRowId: datum.ident })}
        onMouseLeave={() => this.setState({ hoveredRowId: null })}
      >
        {_.map(mappings, ([name, AttrOrComponent], colIndex) => {
          const isAttr = typeof AttrOrComponent === "string";
          const key = datum.ident + "." + (isAttr ? AttrOrComponent : name);
          const isEvenColumn = colIndex % 2 === 0;

          const style = {
            padding: 8,
            height: "100%",
            display: "flex",
            alignItems: "center",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            width: columnWidths[colIndex],
            minWidth: columnWidths[colIndex],
            maxWidth: columnWidths[colIndex],
            borderRight: "1px solid #eee"
          };

          // Apply alternating column shading only if row is not selected or hovered
          if (!isSelected && !isHovered && isEvenColumn) {
            style.backgroundColor = "#f8f9fa";
          }

          return (
            <div key={key} style={style}>
              {isAttr ? (
                <div
                  style={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    width: "100%"
                  }}
                >
                  {(() => {
                    const value = _.get(datum, AttrOrComponent);
                    // Show "—" for null, undefined, or empty string
                    if (value === null || value === undefined || value === "") return "—";
                    // Convert booleans to Yes/No for display (React doesn't render raw booleans)
                    if (typeof value === "boolean") return value ? "Yes" : "No";
                    return value;
                  })()}
                </div>
              ) : (
                <AttrOrComponent datum={datum} selectedFamily={selectedFamily} />
              )}
            </div>
          );
        })}
      </div>
    );
  }

  render() {
    const { data, containerHeight = 500, mappings, dispatch, footerAction } = this.props;
    const { scrollTop, columnWidths, scrollbarWidth } = this.state;
    const rowHeight = 40;

    // Calculate which items are visible
    const startIndex = Math.floor(scrollTop / rowHeight);
    const endIndex = Math.min(startIndex + Math.ceil(containerHeight / rowHeight) + 1, data.length);

    // Only render visible items
    const visibleItems = data.slice(startIndex, endIndex);

    return (
      <div
        style={{
          width: "100%",
          border: "1px solid #dee2e6",
          overflow: "hidden", // Prevent container from creating its own scrollbars
          boxSizing: "border-box"
        }}
      >
        {/* Fixed Header */}
        <div
          ref={this.headerRef}
          style={{
            overflowX: "hidden",
            overflowY: "hidden",
            borderBottom: "2px solid #dee2e6",
            backgroundColor: "#f8f9fa",
            paddingRight: scrollbarWidth + "px"
          }}
        >
          <div
            style={{
              display: "flex",
              fontWeight: "bold",
              fontSize: 13,
              height: "40px",
              minWidth: "fit-content"
            }}
          >
            {_.map(mappings, ([name, AttrOrComponent, options = {}], colIndex) => {
              const isEvenColumn = colIndex % 2 === 0;
              const isAttr = typeof AttrOrComponent === "string";
              const isSortable = options.sortable !== false && (isAttr || options.sortKey);
              const sortKey = isAttr ? AttrOrComponent : options.sortKey;

              const style = {
                fontSize: 13,
                padding: 8,
                height: "40px",
                display: "flex",
                alignItems: "center",
                backgroundColor: isEvenColumn ? "#e9ecef" : "#f8f9fa",
                width: columnWidths[colIndex],
                minWidth: columnWidths[colIndex],
                maxWidth: columnWidths[colIndex],
                borderRight: "1px solid #dee2e6",
                position: "relative",
                cursor: isSortable ? "pointer" : "default"
              };

              const { pagination } = this.props;
              const isCurrentSort = isSortable && pagination && pagination.order_by === sortKey;
              const sortDesc = pagination && pagination.desc;

              /**
               * Handle keyboard activation for sortable column headers
               * WCAG 2.1.1: Sortable headers must be keyboard accessible
               * Using button role as this performs an action (sorting)
               */
              const handleHeaderKeyDown = (e) => {
                if ((e.key === "Enter" || e.key === " ") && isSortable) {
                  e.preventDefault();
                  dispatch(explorerActions.toggleSort(sortKey));
                }
              };

              return (
                <div
                  key={name}
                  style={style}
                  onClick={() => {
                    if (isSortable) {
                      dispatch(explorerActions.toggleSort(sortKey));
                    }
                  }}
                  onKeyDown={handleHeaderKeyDown}
                  role={isSortable ? "button" : "columnheader"} // Button for sortable, columnheader for non-sortable
                  // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
                  tabIndex={isSortable ? 0 : undefined} // Only sortable columns are focusable
                  aria-sort={isCurrentSort ? (sortDesc ? "descending" : "ascending") : "none"} // Announce sort state
                  aria-label={isSortable ? `Sort by ${name}` : undefined}
                >
                  <span
                    style={{
                      flex: 1,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap"
                    }}
                  >
                    {name}
                    {isSortable && isCurrentSort && <span style={{ marginLeft: 4 }}>{pagination.desc ? "▼" : "▲"}</span>}
                  </span>
                  {/* Resize handle */}
                  <div
                    style={{
                      position: "absolute",
                      right: 0,
                      top: 0,
                      bottom: 0,
                      width: "4px",
                      cursor: "col-resize",
                      backgroundColor: "transparent"
                    }}
                    onMouseDown={(e) => this.onMouseDown(e, colIndex)}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Scrollable Body */}
        <div
          ref={this.bodyRef}
          style={{
            height: containerHeight,
            overflowY: "auto",
            overflowX: "auto",
            boxSizing: "border-box"
          }}
          onScroll={this.onScroll}
        >
          {/* Total height spacer */}
          <div style={{ height: data.length * rowHeight, position: "relative" }}>
            {/* Visible items positioned absolutely */}
            <div style={{ position: "absolute", top: startIndex * rowHeight, width: "100%" }}>
              {visibleItems.map((item, index) => (
                <div key={item.ident} style={{ height: rowHeight }}>
                  {this.renderTableRow(item, startIndex + index)}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div
          style={{
            marginTop: 10,
            fontSize: 12,
            color: "#666",
            padding: "0 8px",
            boxSizing: "border-box",
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between"
          }}
        >
          <span>Showing {data.length} families</span>
          {footerAction}
        </div>
      </div>
    );
  }
}

@connect((state) => ({
  starredFamilies: state.clonalFamilies.starredFamilies
}))
class Table extends React.Component {
  render() {
    const { data, mappings, selectedFamily, dispatch, pagination, footerAction, widthMap, starredFamilies } = this.props;
    return (
      <ResizableVirtualTable
        data={data}
        mappings={mappings}
        widthMap={widthMap}
        selectedFamily={selectedFamily}
        dispatch={dispatch}
        pagination={pagination}
        containerHeight={500}
        footerAction={footerAction}
        starredFamilies={starredFamilies}
      />
    );
  }
}

@connect((state) => ({
  datasets: state.datasets.availableDatasets
}))
class DatasetName extends React.Component {
  render() {
    const { datum, datasets } = this.props;
    const dataset = datasets.find((d) => d.dataset_id === datum.dataset_id);
    const displayName = dataset ? dataset.name || dataset.dataset_id : datum.dataset_id || "—";

    return <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{displayName}</div>;
  }
}

// Chain column component - displays "heavy" or "light" based on locus
class ChainDisplay extends React.Component {
  render() {
    const { datum } = this.props;
    const chain = getCloneChain(datum);
    return <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{chain}</div>;
  }
}

// Star cell component - click to toggle starred status
@connect(
  (state) => ({
    starredFamilies: state.clonalFamilies.starredFamilies
  }),
  (dispatch) => ({
    toggleStarred: (ident) => dispatch(explorerActions.toggleStarredFamily(ident))
  })
)
class StarCell extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hovered: false };
  }

  render() {
    const { datum, starredFamilies, toggleStarred } = this.props;
    const { hovered } = this.state;
    const isStarred = starredFamilies && starredFamilies.includes(datum.ident);

    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          cursor: "pointer"
        }}
        onClick={(e) => {
          e.stopPropagation();
          toggleStarred(datum.ident);
        }}
        onMouseEnter={() => this.setState({ hovered: true })}
        onMouseLeave={() => this.setState({ hovered: false })}
        title={isStarred ? "Unstar this family" : "Star this family"}
      >
        <FiStar
          size={16}
          style={{
            fill: isStarred ? "#ffc107" : "none",
            color: isStarred ? "#ffc107" : (hovered ? "#ffc107" : "#999"),
            transition: "all 0.15s ease"
          }}
        />
      </div>
    );
  }
}


@connect(
  (_store) => ({}),
  (dispatch) => ({
    dispatchSelect: (family_ident) => {
      dispatch(explorerActions.selectFamily(family_ident));
    }
  })
)
class SelectAttribute extends React.Component {
  render() {
    const { selectedFamily, datum, dispatchSelect } = this.props;
    return (
      <input
        type="checkbox"
        checked={
          selectedFamily ? (datum.ident || datum.clone_id) === (selectedFamily.ident || selectedFamily.clone_id) : false
        }
        onChange={() => {
          dispatchSelect(datum.ident || datum.clone_id);
        }}
      />
    );
  }
}

const mapStateToProps = (state) => {
  const brushedClonalFamilies = getBrushedClonalFamilies(state);
  const { pagination, starredFamilies } = state.clonalFamilies;

  return {
    brushedClonalFamilies: brushedClonalFamilies,
    pagination: pagination,
    selectedFamily: state.clonalFamilies.selectedFamily,
    selectingStatus: state.clonalFamilies.brushSelecting,
    starredFamilies: starredFamilies
  };
};

@connect(mapStateToProps, {
  selectFamily: explorerActions.selectFamily,
  starAllFamilies: explorerActions.starAllFamilies,
  unstarAllFamilies: explorerActions.unstarAllFamilies,
  clearStarredFamilies: explorerActions.clearStarredFamilies
})
class ClonalFamiliesTable extends React.Component {
  constructor(props) {
    super(props);
    // Load sortStarredFirst preference from sessionStorage
    let sortStarredFirst = true;
    try {
      const saved = sessionStorage.getItem("olmsted_sort_starred_first");
      if (saved !== null) {
        sortStarredFirst = JSON.parse(saved);
      }
    } catch (e) {
      // ignore
    }
    this.state = {
      starAllHovered: false,
      unstarAllHovered: false,
      clearStarsHovered: false,
      sortStarredFirst
    };
  }

  toggleSortStarredFirst = () => {
    this.setState((prevState) => {
      const newValue = !prevState.sortStarredFirst;
      try {
        sessionStorage.setItem("olmsted_sort_starred_first", JSON.stringify(newValue));
      } catch (e) {
        // ignore
      }
      return { sortStarredFirst: newValue };
    });
  };

  componentDidUpdate(prevProps) {
    const { selectingStatus, brushedClonalFamilies, selectFamily } = this.props;
    // Checks:
    // 1. prevProps.selectingStatus: We were previously doing a brush selection
    // 2. !this.props.selectingStatus: We are done doing the brush selection
    // 3. this.props.brushedClonalFamilies.length > 0: There is at least one clonal family in the selection to autoselect for detail view
    if (prevProps.selectingStatus && !selectingStatus && brushedClonalFamilies.length > 0) {
      selectFamily(brushedClonalFamilies[0].ident);
    }
  }

  render() {
    const { brushedClonalFamilies, selectedFamily, pagination, starredFamilies, starAllFamilies, unstarAllFamilies, clearStarredFamilies } = this.props;
    const { starAllHovered, unstarAllHovered, clearStarsHovered, sortStarredFirst } = this.state;

    // Sort families - optionally with starred items first
    const visibleClonalFamilies = sortStarredFirst
      ? _.orderBy(
          brushedClonalFamilies,
          [
            (family) => (starredFamilies.includes(family.ident) ? 1 : 0),
            pagination.order_by
          ],
          ["desc", pagination.desc ? "desc" : "asc"]
        )
      : _.orderBy(brushedClonalFamilies, [pagination.order_by], [pagination.desc ? "desc" : "asc"]);

    this.selectedFamily = _.find(visibleClonalFamilies, { ident: selectedFamily });

    // CSV columns for export (excludes non-exportable columns like Select, Naive sequence, Dataset component)
    const csvColumns = [
      { header: "Starred", accessor: (d) => (starredFamilies.includes(d.ident) ? "Yes" : "No") },
      { header: "Family ID", accessor: "clone_id" },
      { header: "Unique seqs", accessor: "unique_seqs_count" },
      { header: "V gene", accessor: "v_call" },
      { header: "D gene", accessor: "d_call" },
      { header: "J gene", accessor: "j_call" },
      { header: "Locus", accessor: "sample.locus" },
      { header: "Chain", accessor: (d) => getCloneChain(d) },
      { header: "Paired", accessor: "is_paired" },
      { header: "Pair ID", accessor: "pair_id" },
      { header: "Junction length", accessor: "junction_length" },
      { header: "Mut freq", accessor: "mean_mut_freq" },
      { header: "Seed run", accessor: "has_seed" },
      { header: "Subject", accessor: "subject_id" },
      { header: "Sample", accessor: "sample_id" },
      { header: "Timepoint", accessor: "sample.timepoint_id" },
      { header: "Dataset", accessor: "dataset_id" },
      { header: "Ident", accessor: "ident" }
    ];

    // Count how many visible families are starred
    const visibleIdents = visibleClonalFamilies.map((f) => f.ident);
    const visibleStarredCount = visibleIdents.filter((id) => starredFamilies.includes(id)).length;
    const allVisibleStarred = visibleStarredCount === visibleClonalFamilies.length && visibleClonalFamilies.length > 0;

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
      transition: "all 0.15s ease",
      marginRight: "8px"
    };

    const footerAction = visibleClonalFamilies.length > 0 ? (
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <label
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            fontSize: "11px",
            cursor: "pointer",
            marginRight: "8px"
          }}
          title="When enabled, starred families appear at the top of the table"
        >
          <input
            type="checkbox"
            checked={sortStarredFirst}
            onChange={this.toggleSortStarredFirst}
            style={{ cursor: "pointer" }}
          />
          Starred first
        </label>
        <button
          type="button"
          onClick={() => starAllFamilies(visibleIdents)}
          onMouseEnter={() => this.setState({ starAllHovered: true })}
          onMouseLeave={() => this.setState({ starAllHovered: false })}
          style={{
            ...starButtonStyle,
            background: starAllHovered ? "#fff8e1" : "none",
            borderColor: starAllHovered ? "#ffc107" : "#ccc"
          }}
          title="Star all visible families"
          disabled={allVisibleStarred}
        >
          <FiStar size={12} style={{ fill: "#ffc107", color: "#ffc107" }} />
          Star All
        </button>
        <button
          type="button"
          onClick={() => unstarAllFamilies(visibleIdents)}
          onMouseEnter={() => this.setState({ unstarAllHovered: true })}
          onMouseLeave={() => this.setState({ unstarAllHovered: false })}
          style={{
            ...starButtonStyle,
            background: unstarAllHovered ? "#f5f5f5" : "none",
            borderColor: unstarAllHovered ? "#999" : "#ccc"
          }}
          title="Unstar all visible families"
          disabled={visibleStarredCount === 0}
        >
          <FiStar size={12} />
          Unstar All
        </button>
        {starredFamilies.length > 0 && (
          <button
            type="button"
            onClick={() => clearStarredFamilies()}
            onMouseEnter={() => this.setState({ clearStarsHovered: true })}
            onMouseLeave={() => this.setState({ clearStarsHovered: false })}
            style={{
              ...starButtonStyle,
              background: clearStarsHovered ? "#ffebee" : "none",
              borderColor: clearStarsHovered ? "#f44336" : "#ccc",
              color: clearStarsHovered ? "#f44336" : "inherit"
            }}
            title={`Clear all ${starredFamilies.length} starred families`}
          >
            Clear Stars ({starredFamilies.length})
          </button>
        )}
        <DownloadCSV
          data={visibleClonalFamilies}
          columns={csvColumns}
          filename="clonal_families.csv"
          label="Download Table as CSV"
          compact
        />
      </div>
    ) : null;

    // Column width map for this table
    const columnWidthMap = {
      "Star": 50,
      "Select": 60,
      "Naive sequence": 260,
      "Family ID": 120,
      "Unique seqs": 100,
      "V gene": 80,
      "D gene": 80,
      "J gene": 80,
      "Locus": 80,
      "Chain": 60,
      "Paired": 60,
      "Pair ID": 150,
      "Junction length": 100,
      "Mut freq": 80,
      "Seed run": 80,
      "Subject": 100,
      "Sample": 100,
      "Timepoint": 100,
      "Dataset": 120,
      "Ident": 120
    };

    return (
      <Table
        data={visibleClonalFamilies}
        widthMap={columnWidthMap}
        mappings={[
          ["Star", StarCell, { sortable: false }],
          ["Select", SelectAttribute],
          ["Naive sequence", NaiveSequence],
          ["Family ID", "clone_id"],
          // TODO decide on language for unique seqs vs rearrangement count
          ["Unique seqs", "unique_seqs_count"],
          ["V gene", "v_call"],
          ["D gene", "d_call"],
          ["J gene", "j_call"],
          ["Locus", "sample.locus"],
          ["Chain", ChainDisplay, { sortKey: "sample.locus" }],
          ["Paired", "is_paired"],
          ["Pair ID", "pair_id"],
          ["Junction length", "junction_length"],
          ["Mut freq", "mean_mut_freq"],
          ["Seed run", "has_seed"],
          ["Subject", "subject_id"],
          ["Sample", "sample_id"],
          ["Timepoint", "sample.timepoint_id"],
          // ["Path", 'path'],
          // ["Entity", ({datum}) => _.toString(_.toPairs(datum))],
          ["Dataset", DatasetName, { sortKey: "dataset_id" }],
          ["Ident", "ident"]
        ]}
        selectedFamily={this.selectedFamily}
        pagination={pagination}
        footerAction={footerAction}
      />
    );
  }
}

export default ClonalFamiliesTable;
