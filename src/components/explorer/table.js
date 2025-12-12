import React from "react";
import { connect } from "react-redux";
import * as _ from "lodash";
import * as explorerActions from "../../actions/explorer";
import { getBrushedClonalFamilies } from "../../selectors/clonalFamilies";
import { NaiveSequence } from "./naive";
import DownloadCSV from "../util/downloadCsv";
import { ResizableTable } from "../util/resizableTable";

// Extends ResizableTable with ClonalFamilies-specific row rendering and virtual scrolling
class ResizableVirtualTable extends ResizableTable {
  renderTableRow(datum, _index) {
    const { selectedFamily, mappings, dispatch } = this.props;
    const isSelected = selectedFamily && datum.ident === selectedFamily.ident;
    const { columnWidths, hoveredRowId } = this.state;
    const isHovered = hoveredRowId === datum.ident;

    // Determine background color with hover effect
    let backgroundColor = isSelected ? "lightblue" : "white";
    if (isHovered && !isSelected) {
      backgroundColor = "#e8e8e8"; // Light gray for hover
    } else if (isHovered && isSelected) {
      backgroundColor = "#87CEEB"; // Darker lightblue for selected + hover
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
            {_.map(mappings, ([name, AttrOrComponent], colIndex) => {
              const isEvenColumn = colIndex % 2 === 0;
              const isAttr = typeof AttrOrComponent === "string";

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
                cursor: isAttr ? "pointer" : "default"
              };

              const { pagination } = this.props;
              const isCurrentSort = isAttr && pagination && pagination.order_by === AttrOrComponent;
              const sortDesc = pagination && pagination.desc;

              /**
               * Handle keyboard activation for sortable column headers
               * WCAG 2.1.1: Sortable headers must be keyboard accessible
               * Using button role as this performs an action (sorting)
               */
              const handleHeaderKeyDown = (e) => {
                if ((e.key === "Enter" || e.key === " ") && isAttr) {
                  e.preventDefault();
                  dispatch(explorerActions.toggleSort(AttrOrComponent));
                }
              };

              return (
                <div
                  key={name}
                  style={style}
                  onClick={() => {
                    if (isAttr) {
                      dispatch(explorerActions.toggleSort(AttrOrComponent));
                    }
                  }}
                  onKeyDown={handleHeaderKeyDown}
                  role={isAttr ? "button" : "columnheader"} // Button for sortable, columnheader for non-sortable
                  // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
                  tabIndex={isAttr ? 0 : undefined} // Only sortable columns are focusable
                  aria-sort={isCurrentSort ? (sortDesc ? "descending" : "ascending") : "none"} // Announce sort state
                  aria-label={isAttr ? `Sort by ${name}` : undefined}
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
                    {isAttr && isCurrentSort && <span style={{ marginLeft: 4 }}>{pagination.desc ? "▼" : "▲"}</span>}
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

@connect()
class Table extends React.Component {
  render() {
    const { data, mappings, selectedFamily, dispatch, pagination, footerAction, widthMap } = this.props;
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
  // Apply sorting to all families instead of just a page
  const { pagination } = state.clonalFamilies;
  const sortedFamilies = _.orderBy(brushedClonalFamilies, [pagination.order_by], [pagination.desc ? "desc" : "asc"]);

  return {
    visibleClonalFamilies: sortedFamilies,
    pagination: pagination,
    selectedFamily: state.clonalFamilies.selectedFamily,
    selectingStatus: state.clonalFamilies.brushSelecting
  };
};

@connect(mapStateToProps, {
  selectFamily: explorerActions.selectFamily
})
class ClonalFamiliesTable extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      showPairedColumns: false
    };
  }

  componentDidUpdate(prevProps) {
    const { selectingStatus, visibleClonalFamilies, selectFamily } = this.props;
    // Checks:
    // 1. prevProps.selectingStatus: We were previously doing a brush selection
    // 2. !this.props.selectingStatus: We are done doing the brush selection
    // 3. this.props.visibleClonalFamilies.length > 0: There is at least one clonal family in the selection to autoselect for detail view
    if (prevProps.selectingStatus && !selectingStatus && visibleClonalFamilies.length > 0) {
      selectFamily(visibleClonalFamilies[0].ident);
    }
  }

  handlePairedColumnsChange = (event) => {
    this.setState({ showPairedColumns: event.target.checked });
  }

  render() {
    const { visibleClonalFamilies, selectedFamily, pagination } = this.props;
    const { showPairedColumns } = this.state;
    this.selectedFamily = _.find(visibleClonalFamilies, { ident: selectedFamily });

    // Light chain columns (shown when showPairedColumns is true)
    const lightChainColumns = [
      { header: "Light chain type", accessor: "light_chain_type" },
      { header: "V gene (light)", accessor: "v_call_light" },
      { header: "J gene (light)", accessor: "j_call_light" },
      { header: "Junction length (light)", accessor: "junction_length_light" }
    ];

    // CSV columns for export (excludes non-exportable columns like Select, Naive sequence, Dataset component)
    const csvColumns = [
      { header: "ID", accessor: "clone_id" },
      { header: "Unique seqs", accessor: "unique_seqs_count" },
      { header: "V gene", accessor: "v_call" },
      { header: "D gene", accessor: "d_call" },
      { header: "J gene", accessor: "j_call" },
      { header: "Locus", accessor: "sample.locus" },
      { header: "Paired", accessor: "is_paired" },
      ...(showPairedColumns ? lightChainColumns : []),
      { header: "Junction length", accessor: "junction_length" },
      { header: "Mut freq", accessor: "mean_mut_freq" },
      { header: "Seed run", accessor: "has_seed" },
      { header: "Subject", accessor: "subject_id" },
      { header: "Sample", accessor: "sample_id" },
      { header: "Timepoint", accessor: "sample.timepoint_id" },
      { header: "Dataset", accessor: "dataset_id" },
      { header: "Ident", accessor: "ident" }
    ];

    const footerAction = visibleClonalFamilies.length > 0 ? (
      <DownloadCSV
        data={visibleClonalFamilies}
        columns={csvColumns}
        filename="clonal_families.csv"
        label="Download Table as CSV"
        compact
      />
    ) : null;

    // Light chain mappings for table display
    const lightChainMappings = [
      ["Light chain type", "light_chain_type"],
      ["V gene (light)", "v_call_light"],
      ["J gene (light)", "j_call_light"],
      ["Junction length (light)", "junction_length_light"]
    ];

    // Column width map for this table
    const columnWidthMap = {
      "Select": 60,
      "Naive sequence": 260,
      "ID": 120,
      "Unique seqs": 100,
      "V gene": 80,
      "D gene": 80,
      "J gene": 80,
      "Locus": 80,
      "Paired": 60,
      "Light chain type": 100,
      "V gene (light)": 100,
      "J gene (light)": 100,
      "Junction length (light)": 120,
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
      <div>
        <div style={{ marginBottom: "8px" }}>
          <label htmlFor="show-paired-columns" style={{ cursor: "pointer" }}>
            <input
              id="show-paired-columns"
              type="checkbox"
              checked={showPairedColumns}
              onChange={this.handlePairedColumnsChange}
              style={{ marginRight: "6px" }}
            />
            Show light chain columns
          </label>
        </div>
        <Table
          key={showPairedColumns ? "with-paired" : "without-paired"}
          data={visibleClonalFamilies}
          widthMap={columnWidthMap}
          mappings={[
            ["Select", SelectAttribute],
            ["Naive sequence", NaiveSequence],
            ["ID", "clone_id"],
            // TODO decide on language for unique seqs vs rearrangement count
            ["Unique seqs", "unique_seqs_count"],
            ["V gene", "v_call"],
            ["D gene", "d_call"],
            ["J gene", "j_call"],
            ["Locus", "sample.locus"],
            ["Paired", "is_paired"],
            ...(showPairedColumns ? lightChainMappings : []),
            ["Junction length", "junction_length"],
            ["Mut freq", "mean_mut_freq"],
            ["Seed run", "has_seed"],
            ["Subject", "subject_id"],
            ["Sample", "sample_id"],
            ["Timepoint", "sample.timepoint_id"],
            // ["Path", 'path'],
            // ["Entity", ({datum}) => _.toString(_.toPairs(datum))],
            ["Dataset", DatasetName],
            ["Ident", "ident"]
          ]}
          selectedFamily={this.selectedFamily}
          pagination={pagination}
          footerAction={footerAction}
        />
      </div>
    );
  }
}

export default ClonalFamiliesTable;
