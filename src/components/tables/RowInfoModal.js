/**
 * Row info modal component for displaying all data fields
 * Used by tables to show complete row information in a scrollable modal
 */
import React, { useState } from "react";
import { FiInfo, FiX, FiTrash2 } from "react-icons/fi";

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
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
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
  flex: 1
};

const tableStyle = {
  width: "100%",
  borderCollapse: "collapse"
};

const rowStyle = {
  borderBottom: "1px solid #eee"
};

const labelCellStyle = {
  color: "#666",
  fontWeight: "500",
  padding: "8px 12px 8px 0",
  verticalAlign: "top",
  whiteSpace: "nowrap",
  width: "40%"
};

const valueCellStyle = {
  padding: "8px 0",
  verticalAlign: "top",
  wordBreak: "break-word",
  fontFamily: "monospace",
  fontSize: "13px"
};

// closeButtonStyle is now generated dynamically in the component for hover support

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
  const excludeKeys = ["trees", "nodes", "seqs", "sequences", "__typename"];
  const entries = Object.entries(datum).filter(([key, value]) => {
    if (excludeKeys.includes(key)) return false;
    // Exclude very large arrays
    if (Array.isArray(value) && value.length > 10) return false;
    return true;
  });

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
        <div style={bodyStyle}>
          <table style={tableStyle}>
            <tbody>
              {entries.map(([key, value]) => (
                <tr key={key} style={rowStyle}>
                  <td style={labelCellStyle}>{formatLabel(key)}</td>
                  <td style={valueCellStyle}>
                    {typeof value === "object" && value !== null ? (
                      <pre style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: "12px" }}>
                        {formatValue(value)}
                      </pre>
                    ) : (
                      formatValue(value)
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {Object.keys(datum).length > entries.length && (
            <div style={{ marginTop: "12px", color: "#888", fontStyle: "italic", fontSize: "13px" }}>
              {Object.keys(datum).length - entries.length} additional fields not shown (large arrays or internal data)
            </div>
          )}
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
      <RowInfoModal
        datum={datum}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={getTitle()}
      />
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
      <RowInfoModal
        datum={datum}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={getTitle()}
      />
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
      <RowInfoModal
        datum={datum}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={getTitle()}
      />
    </div>
  );
}

// Mark as React component for ResizableTable detection
DatasetActionsCell.isReactComponent = true;

export default RowInfoModal;
