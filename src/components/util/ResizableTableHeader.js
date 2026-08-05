import React from "react";
import PropTypes from "prop-types";
import { DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, horizontalListSortingStrategy, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import SortableColumnHeader from "./SortableColumnHeader";

const RESIZE_HANDLE_STYLE = {
  position: "absolute",
  right: 0,
  top: 0,
  bottom: 0,
  width: "4px",
  cursor: "col-resize",
  backgroundColor: "transparent"
};

/**
 * Header row for ResizableTable-based tables, with drag-and-drop column reordering.
 *
 * Required (action/identity) columns render fixed; optional columns are wrapped
 * in a SortableColumnHeader and can be reordered by dragging their grip or via
 * the keyboard. Reordering only emits the new order of the *optional* columns;
 * sort-on-click and the resize handle are preserved per column.
 *
 * A function component (not a class) because dnd-kit's sensor setup requires
 * hooks. ARIA: the cell carries role="columnheader" + aria-sort; the sort label
 * is a button inside it; the grip is a separate reorder control.
 */
function ResizableTableHeader({ mappings, sortColumn, sortDesc, getColumnWidth, onSort, onResizeStart, onReorder }) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const draggableNames = mappings.filter(([, , options = {}]) => !options.required).map(([name]) => name);

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      onReorder(active.id, over.id);
    }
  };

  const sortStateFor = (sortKey, isSortable) => {
    const isCurrentSort = isSortable && sortColumn === sortKey;
    const ariaSort = isCurrentSort ? (sortDesc ? "descending" : "ascending") : "none";
    return { isCurrentSort, ariaSort };
  };

  const renderCellInner = (name, AttrOrComponent, options) => {
    const isAttr = typeof AttrOrComponent === "string";
    const sortKey = isAttr ? AttrOrComponent : options.sortKey;
    const isSortable = options.sortable !== false && (isAttr || options.sortKey);
    const { isCurrentSort } = sortStateFor(sortKey, isSortable);
    const labelStyle = {
      flex: 1,
      display: "flex",
      alignItems: "center",
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap"
    };
    const label = isSortable ? (
      <span
        role="button"
        tabIndex={0}
        onClick={() => onSort(sortKey)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onSort(sortKey);
          }
        }}
        aria-label={`Sort by ${name}`}
        style={{ ...labelStyle, cursor: "pointer", background: "none", border: "none", font: "inherit", padding: 0 }}
      >
        {name}
        {isCurrentSort && <span style={{ marginLeft: 4 }}>{sortDesc ? "▼" : "▲"}</span>}
      </span>
    ) : (
      <span style={labelStyle}>{name}</span>
    );
    return (
      <>
        {label}
        <div style={RESIZE_HANDLE_STYLE} onMouseDown={(e) => onResizeStart(e, name)} />
      </>
    );
  };

  const cellStyle = (name, colIndex, isSticky) => {
    const colWidth = getColumnWidth(name);
    const style = {
      fontSize: 13,
      padding: 8,
      height: "40px",
      display: "flex",
      alignItems: "center",
      backgroundColor: colIndex % 2 === 0 ? "#e9ecef" : "#f8f9fa",
      width: colWidth,
      minWidth: colWidth,
      maxWidth: colWidth,
      borderRight: "1px solid #dee2e6",
      position: "relative"
    };
    if (isSticky) {
      style.position = "sticky";
      style.right = 0;
      style.zIndex = 2;
      style.borderLeft = "1px solid #dee2e6";
      style.borderRight = "none";
      style.backgroundColor = "#e9ecef";
    }
    return style;
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={draggableNames} strategy={horizontalListSortingStrategy}>
        <div style={{ display: "flex", fontWeight: "bold", fontSize: 13, height: "40px", minWidth: "fit-content" }}>
          {mappings.map(([name, AttrOrComponent, options = {}], colIndex) => {
            const isAttr = typeof AttrOrComponent === "string";
            const sortKey = isAttr ? AttrOrComponent : options.sortKey;
            const isSortable = options.sortable !== false && (isAttr || options.sortKey);
            const { ariaSort } = sortStateFor(sortKey, isSortable);
            const inner = renderCellInner(name, AttrOrComponent, options);
            const style = cellStyle(name, colIndex, options.sticky === true);
            if (options.required) {
              return (
                <div key={name} style={style} role="columnheader" aria-sort={ariaSort}>
                  {inner}
                </div>
              );
            }
            return (
              <SortableColumnHeader key={name} name={name} style={style} role="columnheader" ariaSort={ariaSort}>
                {inner}
              </SortableColumnHeader>
            );
          })}
        </div>
      </SortableContext>
    </DndContext>
  );
}

ResizableTableHeader.propTypes = {
  mappings: PropTypes.array.isRequired,
  sortColumn: PropTypes.string,
  sortDesc: PropTypes.bool,
  getColumnWidth: PropTypes.func.isRequired,
  onSort: PropTypes.func.isRequired,
  onResizeStart: PropTypes.func.isRequired,
  onReorder: PropTypes.func.isRequired
};

ResizableTableHeader.defaultProps = {
  sortColumn: null,
  sortDesc: false
};

export default ResizableTableHeader;
