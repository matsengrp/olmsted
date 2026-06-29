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
 * Header row for the clonal-families table with drag-and-drop column reordering.
 *
 * Required (action/identity) columns render fixed; optional columns are wrapped
 * in a SortableColumnHeader and can be reordered by dragging their grip or via
 * the keyboard. Reordering only emits the new order of the *optional* columns;
 * sort-on-click and the resize handle are preserved per column.
 *
 * A function component (not the surrounding class) because dnd-kit's sensor
 * setup requires hooks. ARIA: the cell carries role="columnheader" + aria-sort;
 * the sort label is a button inside it; the grip is a separate reorder control.
 */
function FamiliesTableHeader({ mappings, pagination, getColumnWidth, onSort, onResizeStart, onReorder }) {
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
    const isCurrentSort = isSortable && pagination && pagination.order_by === sortKey;
    const ariaSort = isCurrentSort ? (pagination.desc ? "descending" : "ascending") : "none";
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
        {isCurrentSort && <span style={{ marginLeft: 4 }}>{pagination.desc ? "▼" : "▲"}</span>}
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

  const cellStyle = (name, colIndex) => {
    const colWidth = getColumnWidth(name);
    return {
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
            const style = cellStyle(name, colIndex);
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

FamiliesTableHeader.propTypes = {
  mappings: PropTypes.array.isRequired,
  pagination: PropTypes.object,
  getColumnWidth: PropTypes.func.isRequired,
  onSort: PropTypes.func.isRequired,
  onResizeStart: PropTypes.func.isRequired,
  onReorder: PropTypes.func.isRequired
};

FamiliesTableHeader.defaultProps = {
  pagination: null
};

export default FamiliesTableHeader;
