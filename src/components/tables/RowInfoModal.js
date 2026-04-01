/**
 * Row info modal component for displaying all data fields
 * Used by tables to show complete row information in a scrollable modal
 */
import React, { useState, useCallback } from "react";
import { FiInfo, FiX, FiTrash2, FiCopy, FiChevronDown, FiChevronRight, FiCheck } from "react-icons/fi";

/**
 * Formats a value for display in the modal
 */
function formatValue(value) {
  if (value === null || value === undefined) {
    return "—";
  }
  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }
  if (typeof value === "object") {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return "[Object]";
    }
  }
  return String(value);
}

/**
 * Gets a human-readable label from a field key
 */
function formatLabel(key) {
  return key
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .split(" ")
    .map((word) => (word === word.toUpperCase() ? word : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()))
    .join(" ");
}

/**
 * Modal overlay styles
 */
const overlayStyle = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: "rgba(0, 0, 0, 0.5)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 10000
};

const modalStyle = {
  backgroundColor: "#fff",
  borderRadius: "8px",
  maxWidth: "600px",
  maxHeight: "80vh",
  width: "90%",
  display: "flex",
  flexDirection: "column",
  boxShadow: "0 4px 20px rgba(0, 0, 0, 0.3)"
};

const headerStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "16px 20px",
  borderBottom: "1px solid #dee2e6",
  backgroundColor: "#f8f9fa",
  borderRadius: "8px 8px 0 0"
};

const bodyStyle = {
  padding: "20px",
  overflowY: "auto",
  overflowX: "hidden",
  flex: 1
};

const tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
  tableLayout: "fixed"
};

const rowStyle = {
  borderBottom: "1px solid #eee"
};

const labelCellStyle = {
  color: "#666",
  fontWeight: "500",
  padding: "8px 12px",
  verticalAlign: "top",
  whiteSpace: "nowrap",
  width: "35%",
  textAlign: "right",
  borderRight: "1px solid #dee2e6"
};

const valueCellStyle = {
  padding: "8px 12px",
  verticalAlign: "top",
  wordBreak: "break-word",
  overflowWrap: "anywhere",
  whiteSpace: "pre-wrap",
  fontFamily: "monospace",
  fontSize: "13px",
  textAlign: "left",
  overflow: "hidden"
};

// closeButtonStyle is now generated dynamically in the component for hover support

/**
 * Expandable value component for truncated large arrays/objects.
 * Shows a preview with expand/collapse toggle.
 */
function ExpandableValue({ value }) {
  const [expanded, setExpanded] = useState(false);
  const formatted = formatValue(value);
  const itemCount = Array.isArray(value)
    ? `${value.length} items`
    : typeof value === "object" && value !== null
      ? `${Object.keys(value).length} keys`
      : "object";

  return (
    <div>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        style={{
          background: "none",
          border: "1px solid #dee2e6",
          borderRadius: "4px",
          padding: "2px 8px",
          cursor: "pointer",
          fontSize: "12px",
          color: "#0d6efd",
          display: "inline-flex",
          alignItems: "center",
          gap: "4px"
        }}
      >
        {expanded ? <FiChevronDown size={12} /> : <FiChevronRight size={12} />}
        {expanded ? "Collapse" : `Expand (${itemCount})`}
      </button>
      {expanded && <pre style={{ margin: "6px 0 0 0", whiteSpace: "pre-wrap", fontSize: "11px" }}>{formatted}</pre>}
    </div>
  );
}

/**
 * Copy button with brief "Copied!" feedback.
 */
function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [text]);

  return (
    <button
      type="button"
      onClick={handleCopy}
      style={{
        background: copied ? "#d4edda" : "#f8f9fa",
        border: "1px solid #dee2e6",
        borderRadius: "4px",
        padding: "4px 10px",
        cursor: "pointer",
        fontSize: "12px",
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        color: copied ? "#155724" : "#333",
        transition: "all 0.15s ease"
      }}
      title="Copy all fields to clipboard"
    >
      {copied ? <FiCheck size={14} /> : <FiCopy size={14} />}
      {copied ? "Copied!" : "Copy All"}
    </button>
  );
}

/** Threshold for showing expand button instead of inline value */
const TRUNCATE_ARRAY_LENGTH = 10;
const TRUNCATE_STRING_LENGTH = 200;

/**
 * Check if a value should be shown with an expand button
 */
function isTruncatable(value) {
  if (Array.isArray(value)) {
    if (value.length > TRUNCATE_ARRAY_LENGTH) return true;
    if (value.some((item) => typeof item === "object" && item !== null)) return true;
  }
  if (typeof value === "string" && value.length > TRUNCATE_STRING_LENGTH) return true;
  if (typeof value === "object" && value !== null && !Array.isArray(value)) return true;
  return false;
}

/**
 * RowInfoModal component
 * Displays all fields from a data row in a scrollable modal
 */
export function RowInfoModal({ datum, isOpen, onClose, title }) {
  const [closeHovered, setCloseHovered] = useState(false);

  if (!isOpen || !datum) {
    return null;
  }

  // Get all keys from the datum, excluding internal/complex fields
  const excludeKeys = ["trees", "nodes", "seqs", "sequences", "__typename", "trees_meta"];

  // Keys to flatten one level deep (simple nested objects with scalar values)
  const flattenKeys = new Set(["sample", "build"]);

  // Build entries: flatten simple nested objects, keep complex ones as JSON blocks
  const buildEntries = (obj) => {
    const result = [];
    for (const [key, value] of Object.entries(obj)) {
      if (excludeKeys.includes(key)) continue;
      if (flattenKeys.has(key) && value && typeof value === "object" && !Array.isArray(value)) {
        // Flatten one level (e.g., sample.locus, build.time)
        for (const [subKey, subValue] of Object.entries(value)) {
          result.push([`${key}.${subKey}`, subValue]);
        }
      } else {
        result.push([key, value]);
      }
    }
    return result;
  };

  const entries = buildEntries(datum);

  // Build plain-text version for copy
  const copyText = entries.map(([key, value]) => `${key}: ${formatValue(value)}`).join("\n");

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Escape") {
      onClose();
    }
  };

  const closeButtonStyle = {
    background: closeHovered ? "#e9ecef" : "none",
    border: "none",
    cursor: "pointer",
    padding: "4px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: closeHovered ? "#333" : "#666",
    borderRadius: "4px",
    transition: "all 0.15s ease"
  };

  return (
    <div
      style={overlayStyle}
      onClick={handleOverlayClick}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="row-info-title"
    >
      <div style={modalStyle}>
        <div style={headerStyle}>
          <h3 id="row-info-title" style={{ margin: 0, fontSize: "16px", fontWeight: 600 }}>
            {title || "Row Details"}
          </h3>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <CopyButton text={copyText} />
            <button
              type="button"
              onClick={onClose}
              onMouseEnter={() => setCloseHovered(true)}
              onMouseLeave={() => setCloseHovered(false)}
              style={closeButtonStyle}
              aria-label="Close modal"
            >
              <FiX size={20} />
            </button>
          </div>
        </div>
        <div style={bodyStyle}>
          <table style={tableStyle}>
            <tbody>
              {entries.map(([key, value]) => (
                <tr key={key} style={rowStyle}>
                  <td style={labelCellStyle}>{formatLabel(key)}</td>
                  <td style={valueCellStyle}>
                    {isTruncatable(value) ? (
                      <ExpandableValue value={value} label={key} />
                    ) : typeof value === "object" && value !== null ? (
                      <pre style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: "12px" }}>{formatValue(value)}</pre>
                    ) : (
                      formatValue(value)
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/**
 * InfoButtonCell component
 * A table cell with an info button that opens the RowInfoModal
 */
export function InfoButtonCell({ datum }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [hovered, setHovered] = useState(false);

  if (!datum) {
    return <span>—</span>;
  }

  const handleClick = (e) => {
    e.stopPropagation();
    setIsModalOpen(true);
  };

  const getTitle = () => {
    if (datum.name) return datum.name;
    if (datum.dataset_id) return `Dataset: ${datum.dataset_id}`;
    if (datum.ident) return `Family: ${datum.ident}`;
    if (datum.id) return `ID: ${datum.id}`;
    return "Row Details";
  };

  return (
    <div style={{ width: "100%", textAlign: "center" }}>
      <button
        type="button"
        onClick={handleClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          border: "none",
          cursor: "pointer",
          padding: "5px 7px",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "4px",
          transition: "background-color 0.15s ease",
          backgroundColor: hovered ? "#0b5ed7" : "#0d6efd",
          color: "#fff"
        }}
        title="View all row data"
        aria-label="View row details"
      >
        <FiInfo size={14} />
      </button>
      <RowInfoModal datum={datum} isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={getTitle()} />
    </div>
  );
}

// Mark as React component for ResizableTable detection
InfoButtonCell.isReactComponent = true;

/**
 * DatasetInfoCell component
 * Info button cell for dataset tables - opens row details modal
 */
export function DatasetInfoCell({ datum }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [hovered, setHovered] = useState(false);

  if (!datum) {
    return <span>—</span>;
  }

  const handleClick = (e) => {
    e.stopPropagation();
    setIsModalOpen(true);
  };

  const getTitle = () => {
    if (datum.name) return datum.name;
    if (datum.dataset_id) return `Dataset: ${datum.dataset_id}`;
    return "Row Details";
  };

  return (
    <div style={{ width: "100%", textAlign: "center" }}>
      <button
        type="button"
        onClick={handleClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          border: "none",
          cursor: "pointer",
          padding: "5px 7px",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "4px",
          transition: "background-color 0.15s ease",
          backgroundColor: hovered ? "#0b5ed7" : "#0d6efd",
          color: "#fff"
        }}
        title="View all row data"
        aria-label="View row details"
      >
        <FiInfo size={14} />
      </button>
      <RowInfoModal datum={datum} isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={getTitle()} />
    </div>
  );
}

// Mark as React component for ResizableTable detection
DatasetInfoCell.isReactComponent = true;

/**
 * DatasetDeleteCell component
 * Delete button cell for dataset tables - only shows for client-side datasets
 */
export function DatasetDeleteCell({ datum, onDelete }) {
  const [hovered, setHovered] = useState(false);

  if (!datum) {
    return <span>—</span>;
  }

  const isClientSide = datum.isClientSide || datum.temporary;

  // Don't show delete button for server-side datasets
  if (!isClientSide) {
    return <div style={{ width: "100%", textAlign: "center" }}>—</div>;
  }

  const handleClick = (e) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(datum);
    }
  };

  return (
    <div style={{ width: "100%", textAlign: "center" }}>
      <button
        type="button"
        onClick={handleClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          border: "none",
          cursor: "pointer",
          padding: "5px 7px",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "4px",
          transition: "background-color 0.15s ease",
          backgroundColor: hovered ? "#bb2d3b" : "#dc3545",
          color: "#fff"
        }}
        title="Delete dataset"
        aria-label="Delete dataset"
      >
        <FiTrash2 size={14} />
      </button>
    </div>
  );
}

// Mark as React component for ResizableTable detection
DatasetDeleteCell.isReactComponent = true;

/**
 * DatasetActionsCell component (DEPRECATED - use DatasetInfoCell and DatasetDeleteCell instead)
 * Combined actions cell with info and delete buttons for dataset tables
 * Only shows delete button if onDelete prop is provided
 */
export function DatasetActionsCell({ datum, onDelete }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [infoHovered, setInfoHovered] = useState(false);
  const [deleteHovered, setDeleteHovered] = useState(false);

  if (!datum) {
    return <span>—</span>;
  }

  const isClientSide = datum.isClientSide || datum.temporary;
  const showDelete = isClientSide && onDelete;

  const handleInfoClick = (e) => {
    e.stopPropagation();
    setIsModalOpen(true);
  };

  const handleDeleteClick = (e) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(datum);
    }
  };

  const getTitle = () => {
    if (datum.name) return datum.name;
    if (datum.dataset_id) return `Dataset: ${datum.dataset_id}`;
    return "Row Details";
  };

  const iconButtonStyle = {
    border: "none",
    cursor: "pointer",
    padding: "5px 7px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "4px",
    transition: "background-color 0.15s ease"
  };

  return (
    <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
      <button
        type="button"
        onClick={handleInfoClick}
        onMouseEnter={() => setInfoHovered(true)}
        onMouseLeave={() => setInfoHovered(false)}
        style={{
          ...iconButtonStyle,
          backgroundColor: infoHovered ? "#0b5ed7" : "#0d6efd",
          color: "#fff"
        }}
        title="View all row data"
        aria-label="View row details"
      >
        <FiInfo size={14} />
      </button>
      {showDelete && (
        <button
          type="button"
          onClick={handleDeleteClick}
          onMouseEnter={() => setDeleteHovered(true)}
          onMouseLeave={() => setDeleteHovered(false)}
          style={{
            ...iconButtonStyle,
            backgroundColor: deleteHovered ? "#bb2d3b" : "#dc3545",
            color: "#fff"
          }}
          title="Delete dataset"
          aria-label="Delete dataset"
        >
          <FiTrash2 size={14} />
        </button>
      )}
      <RowInfoModal datum={datum} isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={getTitle()} />
    </div>
  );
}

// Mark as React component for ResizableTable detection
DatasetActionsCell.isReactComponent = true;

export default RowInfoModal;
