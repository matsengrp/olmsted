import React from "react";
import * as _ from "lodash";

// Generic resizable virtual scrolling table component
export class ResizableTable extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      scrollTop: 0,
      columnWidths: this.getDefaultWidths(props.mappings, props.widthMap, props.columnWidths),
      isResizing: false,
      resizingColumn: null,
      scrollbarWidth: 0,
      sortColumn: props.defaultSortColumn || null,
      sortDesc: false,
      hoveredRowId: null
    };

    this.headerRef = React.createRef();
    this.bodyRef = React.createRef();
    this.onScroll = this.onScroll.bind(this);
    this.onMouseDown = this.onMouseDown.bind(this);
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);
    this.handleSort = this.handleSort.bind(this);
  }

  // Generate default widths based on column names via widthMap, or use columnWidths array, or default to 120
  getDefaultWidths(mappings, widthMap, columnWidths) {
    if (columnWidths) {
      return columnWidths;
    }
    if (widthMap) {
      return mappings.map(([name]) => widthMap[name] || 120);
    }
    return mappings.map(() => 120);
  }

  componentDidMount() {
    document.addEventListener("mousemove", this.onMouseMove);
    document.addEventListener("mouseup", this.onMouseUp);
    this.updateScrollbarWidth();
  }

  componentDidUpdate(prevProps) {
    this.updateScrollbarWidth();
    // Reset column widths when mappings change (e.g., toggling optional columns)
    if (prevProps.mappings.length !== this.props.mappings.length) {
      this.setState({
        columnWidths: this.getDefaultWidths(this.props.mappings, this.props.widthMap, this.props.columnWidths)
      });
    }
  }

  updateScrollbarWidth() {
    const { scrollbarWidth: currentScrollbarWidth } = this.state;
    if (this.bodyRef.current) {
      const newScrollbarWidth = this.bodyRef.current.offsetWidth - this.bodyRef.current.clientWidth;
      if (newScrollbarWidth !== currentScrollbarWidth) {
        this.setState({ scrollbarWidth: newScrollbarWidth });
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
    const { isResizing, startX, startWidth, resizingColumn, columnWidths } = this.state;
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

  handleSort(columnKey) {
    const { onSort } = this.props;
    const { sortColumn, sortDesc } = this.state;

    // Toggle sort direction if clicking the same column
    if (sortColumn === columnKey) {
      this.setState({ sortDesc: !sortDesc });
    } else {
      this.setState({ sortColumn: columnKey, sortDesc: false });
    }

    // Call parent's onSort handler if provided
    if (onSort) {
      onSort(columnKey, sortColumn === columnKey ? !sortDesc : false);
    }
  }

  getSortedData() {
    const { data } = this.props;
    const { sortColumn, sortDesc } = this.state;

    if (!sortColumn) return data;

    // Sort the data
    const sorted = _.orderBy(data, [sortColumn], [sortDesc ? "desc" : "asc"]);
    return sorted;
  }

  renderTableRow(datum, index) {
    const { columnWidths, hoveredRowId } = this.state;
    const { onRowClick, getRowStyle, mappings, componentProps } = this.props;

    const rowId = datum.id || datum.ident || datum.dataset_id || index;
    const rowStyle = getRowStyle ? getRowStyle(datum) : {};
    const isHovered = hoveredRowId === rowId;

    // Determine background color with hover effect
    let backgroundColor = rowStyle.backgroundColor || "white";
    if (isHovered) {
      // Darken the background on hover
      if (rowStyle.backgroundColor === "lightblue") {
        backgroundColor = "#87CEEB"; // Darker lightblue
      } else {
        backgroundColor = "#e8e8e8"; // Light gray for hover
      }
    }

    /**
     * Keyboard handler for clickable table rows
     * WCAG 2.1.1: Interactive table rows must support keyboard navigation
     */
    const handleRowKeyDown = onRowClick
      ? (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onRowClick(datum);
          }
        }
      : undefined;

    return (
      <div
        key={rowId}
        style={{
          display: "flex",
          alignItems: "center",
          borderBottom: "1px solid #eee",
          fontSize: 12,
          height: "40px",
          minHeight: "40px",
          maxHeight: "40px",
          backgroundColor,
          cursor: onRowClick ? "pointer" : "default",
          transition: "background-color 0.15s ease",
          overflow: "hidden",
          boxSizing: "border-box",
          ...rowStyle,
          backgroundColor // Override rowStyle.backgroundColor with our computed value
        }}
        onClick={() => onRowClick && onRowClick(datum)}
        onKeyDown={handleRowKeyDown}
        onMouseEnter={() => this.setState({ hoveredRowId: rowId })}
        onMouseLeave={() => this.setState({ hoveredRowId: null })}
        role={onRowClick ? "button" : undefined}
        // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
        tabIndex={onRowClick ? 0 : undefined}
        aria-label={onRowClick ? `Select row ${rowId}` : undefined}
      >
        {_.map(mappings, ([name, AttrOrComponent, options = {}], colIndex) => {
          const isAttr = typeof AttrOrComponent === "string";
          const key = (datum.id || datum.ident || datum.dataset_id || index) + "." + (isAttr ? AttrOrComponent : name);
          const isEvenColumn = colIndex % 2 === 0;
          const isSticky = options.sticky === true;

          const colWidth = columnWidths[colIndex] || 120;
          const style = {
            padding: 8,
            height: "100%",
            display: "flex",
            alignItems: "center",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            width: colWidth,
            minWidth: colWidth,
            maxWidth: colWidth,
            flexShrink: 0,
            flexGrow: 0,
            borderRight: "1px solid #eee",
            ...options.style
          };

          // Apply sticky positioning for sticky columns
          if (isSticky) {
            style.position = "sticky";
            style.right = 0;
            style.zIndex = 1;
            style.borderLeft = "1px solid #dee2e6";
            style.borderRight = "none";
            // Ensure solid background for sticky columns
            style.backgroundColor = backgroundColor;
          }

          // Apply alternating column shading only if row doesn't have custom background and is not hovered
          const hasDefaultBackground = !rowStyle.backgroundColor || rowStyle.backgroundColor === "white";
          if (!isSticky && hasDefaultBackground && !isHovered && isEvenColumn) {
            style.backgroundColor = "#f8f9fa";
          }

          // Handle different types of components/attributes
          let content;
          if (isAttr) {
            // It's a string attribute path
            content = (
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
            );
          } else if (typeof AttrOrComponent === "function") {
            // Check if it's a React component (class or functional) or a simple function
            // We mark React components with a special property to distinguish them
            const isReactComponent =
              (AttrOrComponent.prototype && AttrOrComponent.prototype.isReactComponent) ||
              AttrOrComponent.isReactComponent === true ||
              (typeof AttrOrComponent === "function" && AttrOrComponent.name && AttrOrComponent.name.match(/^[A-Z]/));

            if (isReactComponent) {
              // It's a React component (class component or functional component)
              // eslint-disable-next-line react/jsx-props-no-spreading
              content = <AttrOrComponent datum={datum} {...(componentProps || {})} />;
            } else {
              // It's a simple function that returns a value
              const value = AttrOrComponent(datum);
              content = (
                <div
                  style={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    width: "100%"
                  }}
                >
                  {value || "—"}
                </div>
              );
            }
          } else {
            content = <span>—</span>;
          }

          return (
            <div key={key} style={style}>
              {content}
            </div>
          );
        })}
      </div>
    );
  }

  render() {
    const {
      containerHeight = 400,
      mappings,
      showFooter = true,
      componentProps: _componentProps,
      itemName,
      footerAction
    } = this.props;
    const { scrollTop, columnWidths, scrollbarWidth, sortColumn, sortDesc } = this.state;
    const rowHeight = 40;

    const sortedData = this.getSortedData();

    // Calculate total width for horizontal scrolling
    const totalWidth = columnWidths.reduce((sum, w) => sum + w, 0);

    // Calculate which items are visible
    const startIndex = Math.floor(scrollTop / rowHeight);
    const endIndex = Math.min(startIndex + Math.ceil(containerHeight / rowHeight) + 1, sortedData.length);

    // Only render visible items
    const visibleItems = sortedData.slice(startIndex, endIndex);

    return (
      <div
        style={{
          width: "100%",
          border: "1px solid #dee2e6",
          overflow: "hidden",
          boxSizing: "border-box",
          borderRadius: "4px"
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
              minWidth: totalWidth
            }}
          >
            {_.map(mappings, ([name, AttrOrComponent, options = {}], colIndex) => {
              const isEvenColumn = colIndex % 2 === 0;
              const isAttr = typeof AttrOrComponent === "string";
              const isSortable = options.sortable !== false && (isAttr || options.sortKey);
              const columnKey = isAttr ? AttrOrComponent : options.sortKey;
              const isSticky = options.sticky === true;
              // Explicitly capture sort state from parent scope for accessibility attributes
              const currentSortColumn = sortColumn;
              const currentSortDesc = sortDesc;

              const colWidth = columnWidths[colIndex] || 120;
              const style = {
                fontSize: 13,
                padding: 8,
                height: "40px",
                display: "flex",
                alignItems: "center",
                backgroundColor: isEvenColumn ? "#e9ecef" : "#f8f9fa",
                width: colWidth,
                minWidth: colWidth,
                maxWidth: colWidth,
                flexShrink: 0,
                flexGrow: 0,
                borderRight: "1px solid #dee2e6",
                position: "relative",
                cursor: isSortable ? "pointer" : "default"
              };

              // Apply sticky positioning for sticky columns
              if (isSticky) {
                style.position = "sticky";
                style.right = 0;
                style.zIndex = 2;
                style.borderLeft = "1px solid #dee2e6";
                style.borderRight = "none";
                style.backgroundColor = "#e9ecef";
              }

              /**
               * Keyboard handler for sortable column headers
               * WCAG 2.1.1: Column headers must be keyboard accessible for sorting
               */
              const handleHeaderKeyDown = isSortable
                ? (e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      this.handleSort(columnKey);
                    }
                  }
                : undefined;

              return (
                <div
                  key={name}
                  style={style}
                  onClick={() => isSortable && this.handleSort(columnKey)}
                  onKeyDown={handleHeaderKeyDown}
                  role={isSortable ? "button" : "columnheader"}
                  // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
                  tabIndex={isSortable ? 0 : undefined}
                  aria-label={isSortable ? `Sort by ${name}` : undefined}
                  aria-sort={
                    isSortable && currentSortColumn === columnKey
                      ? currentSortDesc
                        ? "descending"
                        : "ascending"
                      : "none"
                  }
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
                    {isSortable && currentSortColumn === columnKey && (
                      <span style={{ marginLeft: 4 }}>{currentSortDesc ? "▼" : "▲"}</span>
                    )}
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
          <div style={{ height: sortedData.length * rowHeight, position: "relative", minWidth: totalWidth }}>
            {/* Visible items positioned absolutely */}
            <div style={{ position: "absolute", top: startIndex * rowHeight, width: "100%", minWidth: totalWidth }}>
              {visibleItems.map((item, index) => (
                <div key={item.id || item.ident || item.dataset_id || startIndex + index} style={{ height: rowHeight }}>
                  {this.renderTableRow(item, startIndex + index)}
                </div>
              ))}
            </div>
          </div>
        </div>

        {showFooter && (
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
            <span>Showing {sortedData.length} {itemName || "items"}</span>
            {footerAction}
          </div>
        )}
      </div>
    );
  }
}
