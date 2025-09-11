import React from "react";
import * as _ from 'lodash';

// Generic resizable virtual scrolling table component
export class ResizableTable extends React.Component {
  constructor(props) {
    super(props);

    // Initialize column widths from props or use defaults
    const defaultWidths = props.columnWidths || props.mappings.map(() => 120);

    this.state = {
      scrollTop: 0,
      columnWidths: defaultWidths,
      isResizing: false,
      resizingColumn: null,
      scrollbarWidth: 0,
      sortColumn: props.defaultSortColumn || null,
      sortDesc: false
    };

    this.headerRef = React.createRef();
    this.bodyRef = React.createRef();
    this.onScroll = this.onScroll.bind(this);
    this.onMouseDown = this.onMouseDown.bind(this);
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);
    this.handleSort = this.handleSort.bind(this);
  }

  componentDidMount() {
    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('mouseup', this.onMouseUp);
    this.updateScrollbarWidth();
  }

  componentDidUpdate() {
    this.updateScrollbarWidth();
  }

  updateScrollbarWidth() {
    if (this.bodyRef.current) {
      const scrollbarWidth = this.bodyRef.current.offsetWidth - this.bodyRef.current.clientWidth;
      if (scrollbarWidth !== this.state.scrollbarWidth) {
        this.setState({ scrollbarWidth });
      }
    }
  }

  componentWillUnmount() {
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('mouseup', this.onMouseUp);
  }

  onScroll(e) {
    this.setState({ scrollTop: e.target.scrollTop });
    // Sync header scroll with body scroll
    if (this.headerRef.current) {
      this.headerRef.current.scrollLeft = e.target.scrollLeft;
    }
  }

  onMouseDown(e, columnIndex) {
    e.preventDefault();
    this.setState({
      isResizing: true,
      resizingColumn: columnIndex,
      startX: e.clientX,
      startWidth: this.state.columnWidths[columnIndex]
    });
  }

  onMouseMove(e) {
    if (!this.state.isResizing) return;

    const { startX, startWidth, resizingColumn } = this.state;
    const deltaX = e.clientX - startX;
    const newWidth = Math.max(50, startWidth + deltaX); // Minimum width of 50px

    const newWidths = [...this.state.columnWidths];
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
    const { sortColumn, sortDesc } = this.state;

    // Toggle sort direction if clicking the same column
    if (sortColumn === columnKey) {
      this.setState({ sortDesc: !sortDesc });
    } else {
      this.setState({ sortColumn: columnKey, sortDesc: false });
    }

    // Call parent's onSort handler if provided
    if (this.props.onSort) {
      this.props.onSort(columnKey, sortColumn === columnKey ? !sortDesc : false);
    }
  }

  getSortedData() {
    const { data } = this.props;
    const { sortColumn, sortDesc } = this.state;

    if (!sortColumn) return data;

    // Sort the data
    const sorted = _.orderBy(data, [sortColumn], [sortDesc ? 'desc' : 'asc']);
    return sorted;
  }

  renderTableRow(datum, index) {
    const { columnWidths } = this.state;
    const { onRowClick, getRowStyle, mappings } = this.props;

    const rowStyle = getRowStyle ? getRowStyle(datum) : {};

    return (
      <div
        key={datum.id || datum.ident || datum.dataset_id || index}
        style={{
          display: 'flex',
          alignItems: 'center',
          borderBottom: '1px solid #eee',
          fontSize: 12,
          height: '40px',
          backgroundColor: rowStyle.backgroundColor || 'white',
          minWidth: 'fit-content',
          cursor: onRowClick ? 'pointer' : 'default',
          ...rowStyle
        }}
        onClick={() => onRowClick && onRowClick(datum)}
      >
        {_.map(mappings, ([name, AttrOrComponent, options = {}], colIndex) => {
          const isAttr = ((typeof AttrOrComponent) === "string");
          const key = (datum.id || datum.ident || datum.dataset_id || index) + '.' + (isAttr ? AttrOrComponent : name);
          const isEvenColumn = colIndex % 2 === 0;

          const style = {
            padding: 8,
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            width: columnWidths[colIndex],
            minWidth: columnWidths[colIndex],
            maxWidth: columnWidths[colIndex],
            borderRight: '1px solid #eee',
            ...options.style
          };

          // Apply alternating column shading only if row doesn't have custom background
          if (!rowStyle.backgroundColor && isEvenColumn) {
            style.backgroundColor = '#f8f9fa';
          }

          // Handle different types of components/attributes
          let content;
          if (isAttr) {
            // It's a string attribute path
            content = (
              <div style={{
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%'
              }}
              >
                {_.get(datum, AttrOrComponent) || '—'}
              </div>
            );
          } else if (typeof AttrOrComponent === 'function') {
            // Check if it's a React component or a simple function
            if (AttrOrComponent.prototype && AttrOrComponent.prototype.isReactComponent) {
              // It's a React component
              content = <AttrOrComponent datum={datum} {...(this.props.componentProps || {})}/>;
            } else {
              // It's a simple function that returns a value
              const value = AttrOrComponent(datum);
              content = (
                <div style={{
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%'
                }}
                >
                  {value || '—'}
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
    const { containerHeight = 400, mappings, showFooter = true } = this.props;
    const {
      scrollTop, columnWidths, scrollbarWidth, sortColumn, sortDesc
    } = this.state;
    const rowHeight = 40;

    const sortedData = this.getSortedData();

    // Calculate which items are visible
    const startIndex = Math.floor(scrollTop / rowHeight);
    const endIndex = Math.min(
      startIndex + Math.ceil(containerHeight / rowHeight) + 1,
      sortedData.length
    );

    // Only render visible items
    const visibleItems = sortedData.slice(startIndex, endIndex);

    return (
      <div style={{
        width: '100%',
        border: '1px solid #dee2e6',
        overflow: 'hidden',
        boxSizing: 'border-box',
        borderRadius: '4px'
      }}
      >
        {/* Fixed Header */}
        <div
          ref={this.headerRef}
          style={{
            overflowX: 'hidden',
            overflowY: 'hidden',
            borderBottom: '2px solid #dee2e6',
            backgroundColor: '#f8f9fa',
            paddingRight: scrollbarWidth + 'px'
          }}
        >
          <div
            style={{
              display: 'flex',
              fontWeight: 'bold',
              fontSize: 13,
              height: '40px',
              minWidth: 'fit-content'
            }}
          >
            {_.map(mappings, ([name, AttrOrComponent, options = {}], colIndex) => {
              const isEvenColumn = colIndex % 2 === 0;
              const isAttr = ((typeof AttrOrComponent) === "string");
              const isSortable = options.sortable !== false && (isAttr || options.sortKey);
              const columnKey = isAttr ? AttrOrComponent : options.sortKey;

              const style = {
                fontSize: 13,
                padding: 8,
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                backgroundColor: isEvenColumn ? '#e9ecef' : '#f8f9fa',
                width: columnWidths[colIndex],
                minWidth: columnWidths[colIndex],
                maxWidth: columnWidths[colIndex],
                borderRight: '1px solid #dee2e6',
                position: 'relative',
                cursor: isSortable ? 'pointer' : 'default'
              };

              return (
                <div
                  key={name}
                  style={style}
                  onClick={() => isSortable && this.handleSort(columnKey)}
                >
                  <span style={{
                    flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                  }}
                  >
                    {name}
                    {isSortable && sortColumn === columnKey && (
                      <span style={{ marginLeft: 4 }}>
                        {sortDesc ? '▼' : '▲'}
                      </span>
                    )}
                  </span>
                  {/* Resize handle */}
                  <div
                    style={{
                      position: 'absolute',
                      right: 0,
                      top: 0,
                      bottom: 0,
                      width: '4px',
                      cursor: 'col-resize',
                      backgroundColor: 'transparent'
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
            overflowY: 'auto',
            overflowX: 'auto',
            boxSizing: 'border-box'
          }}
          onScroll={this.onScroll}
        >
          {/* Total height spacer */}
          <div style={{ height: sortedData.length * rowHeight, position: 'relative' }}>
            {/* Visible items positioned absolutely */}
            <div style={{ position: 'absolute', top: startIndex * rowHeight, width: '100%' }}>
              {visibleItems.map((item, index) => (
                <div key={startIndex + index} style={{ height: rowHeight }}>
                  {this.renderTableRow(item, startIndex + index)}
                </div>
              ))}
            </div>
          </div>
        </div>

        {showFooter && (
          <div style={{
            marginTop: 10,
            fontSize: 12,
            color: '#666',
            padding: '0 8px',
            boxSizing: 'border-box',
            overflow: 'hidden'
          }}
          >
            Showing
            {' '}
            {sortedData.length}
            {' '}
            {this.props.itemName || 'items'}
          </div>
        )}
      </div>
    );
  }
}
