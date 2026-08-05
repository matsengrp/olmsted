import React from "react";
import PropTypes from "prop-types";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

/**
 * A draggable column-header cell for drag-and-drop reordering.
 *
 * The cell itself is the sortable node (so it animates as columns shuffle), but
 * the drag is initiated only from a dedicated grip handle that carries dnd-kit's
 * pointer + keyboard listeners. This keeps reorder separate from the header's
 * existing sort-on-click and resize-handle interactions, and gives a
 * keyboard-accessible reorder path (focus the grip, Space to pick up, arrows to
 * move, Space to drop) distinct from the label's sort control.
 */
function SortableColumnHeader({ name, style, role, ariaSort, children }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: name });

  const cellStyle = {
    ...style,
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 5 : style.zIndex
  };

  return (
    <div ref={setNodeRef} style={cellStyle} role={role} aria-sort={ariaSort}>
      <span
        {...attributes}
        {...listeners}
        aria-label={`Reorder ${name} column`}
        title="Drag to reorder"
        // Don't let a grip click bubble to the cell's sort handler.
        onClick={(e) => e.stopPropagation()}
        style={{
          cursor: "grab",
          marginRight: 4,
          color: "#aaa",
          fontSize: 12,
          lineHeight: 1,
          userSelect: "none",
          touchAction: "none"
        }}
      >
        ⠿
      </span>
      {children}
    </div>
  );
}

SortableColumnHeader.propTypes = {
  name: PropTypes.string.isRequired,
  style: PropTypes.object,
  role: PropTypes.string,
  ariaSort: PropTypes.string,
  children: PropTypes.node
};

SortableColumnHeader.defaultProps = {
  style: {},
  role: "columnheader",
  ariaSort: "none",
  children: null
};

export default SortableColumnHeader;
