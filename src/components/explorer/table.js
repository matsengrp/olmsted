import React from "react";
import { connect } from "react-redux";
import * as _ from "lodash";
import * as explorerActions from "../../actions/explorer";
import { getBrushedClonalFamilies } from "../../selectors/clonalFamilies";
import { NaiveSequence } from "./naive";

// Resizable virtual scrolling table component
class ResizableVirtualTable extends React.Component {
  constructor(props) {
    super(props);

    // Initialize column widths
    const defaultWidths = [
      60, // Select
      260, // Naive sequence
      120, // ID
      100, // Unique seqs
      80, // V gene
      80, // D gene
      80, // J gene
      80, // Seed run
      100, // Subject
      100, // Sample
      100, // Timepoint
      80, // Mut freq
      120, // Dataset
      120 // Ident
    ];

    this.state = {
      scrollTop: 0,
      columnWidths: defaultWidths.slice(0, props.mappings.length),
      isResizing: false,
      resizingColumn: null,
      scrollbarWidth: 0
    };

    this.headerRef = React.createRef();
    this.bodyRef = React.createRef();
    this.onScroll = this.onScroll.bind(this);
    this.onMouseDown = this.onMouseDown.bind(this);
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);
  }

  componentDidMount() {
    document.addEventListener("mousemove", this.onMouseMove);
    document.addEventListener("mouseup", this.onMouseUp);
    this.updateScrollbarWidth();
  }

  componentDidUpdate() {
    this.updateScrollbarWidth();
  }

  updateScrollbarWidth() {
    const { scrollbarWidth } = this.state;
    if (this.bodyRef.current) {
      const scrollbarWidth = this.bodyRef.current.offsetWidth - this.bodyRef.current.clientWidth;
      if (scrollbarWidth !== scrollbarWidth) {
        this.setState({ scrollbarWidth });
      }
    }
  }

  componentWillUnmount() {
    document.removeEventListener("mousemove", this.onMouseMove);
    document.removeEventListener("mouseup", this.onMouseUp);
  }

  onScroll(e) {
    this.setState({ scrollTop: e.target.scrollTop });
    // Sync header scroll with body scroll
    if (this.headerRef.current) {
      this.headerRef.current.scrollLeft = e.target.scrollLeft;
    }
  }

  onMouseDown(e, columnIndex) {
    const { columnWidths } = this.state;
    e.preventDefault();
    this.setState({
      isResizing: true,
      resizingColumn: columnIndex,
      startX: e.clientX,
      startWidth: columnWidths[columnIndex]
    });
  }

  onMouseMove(e) {
    const {
      isResizing, startX, startWidth, resizingColumn, columnWidths
    } = this.state;
    if (!isResizing) return;
    const deltaX = e.clientX - startX;
    const newWidth = Math.max(50, startWidth + deltaX); // Minimum width of 50px

    const newWidths = [...columnWidths];
    newWidths[resizingColumn] = newWidth;

    this.setState({ columnWidths: newWidths });
  }

  onMouseUp() {
    this.setState({
      isResizing: false,
      resizingColumn: null
    });
  }

  renderTableRow(datum, _index) {
    const { selectedFamily, mappings } = this.props;
    const isSelected = selectedFamily && datum.ident === selectedFamily.ident;
    const { columnWidths } = this.state;

    return (
      <div
        key={datum.ident}
        style={{
          display: "flex",
          alignItems: "center",
          borderBottom: "1px solid #eee",
          fontSize: 12,
          height: "40px",
          backgroundColor: isSelected ? "lightblue" : "white",
          minWidth: "fit-content"
        }}
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

          // Apply alternating column shading only if row is not selected
          if (!isSelected && isEvenColumn) {
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
                  {_.get(datum, AttrOrComponent) || "—"}
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
    const {
      data, containerHeight = 500, mappings, dispatch
    } = this.props;
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

              return (
                <div
                  key={name}
                  style={style}
                  onClick={() => {
                    isAttr && dispatch(explorerActions.toggleSort(AttrOrComponent));
                  }}
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
                <div key={startIndex + index} style={{ height: rowHeight }}>
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
            overflow: "hidden"
          }}
        >
          Showing
          {' '}
          {data.length}
          {' '}
          families
        </div>
      </div>
    );
  }
}

@connect()
class Table extends React.Component {
  render() {
    const {
      data, mappings, selectedFamily, dispatch, pagination
    } = this.props;
    return (
      <ResizableVirtualTable
        data={data}
        mappings={mappings}
        selectedFamily={selectedFamily}
        dispatch={dispatch}
        pagination={pagination}
        containerHeight={500}
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
        style={{ cursor: "pointer" }}
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

  render() {
    const { visibleClonalFamilies, selectedFamily, pagination } = this.props;
    this.selectedFamily = _.find(visibleClonalFamilies, { ident: selectedFamily });
    return (
      <Table
        data={visibleClonalFamilies}
        mappings={[
          ["Select", SelectAttribute],
          ["Naive sequence", NaiveSequence],
          ["ID", "clone_id"],
          // TODO decide on language for unique seqs vs rearrangement count
          ["Unique seqs", "unique_seqs_count"],
          ["V gene", "v_call"],
          ["D gene", "d_call"],
          ["J gene", "j_call"],
          ["Seed run", "has_seed"],
          ["Subject", "subject_id"],
          ["Sample", "sample_id"],
          ["Timepoint", "sample.timepoint_id"],
          ["Mut freq", "mean_mut_freq"],
          // ["Path", 'path'],
          // ["Entity", ({datum}) => _.toString(_.toPairs(datum))],
          ["Dataset", DatasetName],
          ["Ident", "ident"]
        ]}
        selectedFamily={this.selectedFamily}
        pagination={pagination}
      />
    );
  }
}

export default ClonalFamiliesTable;
