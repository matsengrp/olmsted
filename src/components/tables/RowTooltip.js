/**
 * Row tooltip component for displaying all data fields on hover
 * Used by ResizableTable to show complete row information
 */
import React from "react";
import * as _ from "lodash";

/**
 * Formats a value for display in the tooltip
 */
function formatValue(value) {
  if (value === null || value === undefined) {
    return "—";
  }
  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }
  if (typeof value === "object") {
    // For objects, show a condensed JSON representation
    try {
      return JSON.stringify(value, null, 0);
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
 * RowTooltip component
 * Displays all fields from a data row in a floating tooltip
 */
export function RowTooltip({ datum, position, visible, maxFields = 20 }) {
  if (!visible || !datum || !position) {
    return null;
  }

  // Get all keys from the datum, excluding internal/complex fields
  const excludeKeys = ["trees", "nodes", "seqs", "sequences", "__typename"];
  const entries = Object.entries(datum)
    .filter(([key, value]) => {
      // Exclude internal fields and large arrays/objects
      if (excludeKeys.includes(key)) return false;
      if (Array.isArray(value) && value.length > 5) return false;
      return true;
    })
    .slice(0, maxFields);

  const tooltipStyle = {
    position: "fixed",
    left: position.x + 15,
    top: position.y + 10,
    backgroundColor: "rgba(33, 33, 33, 0.95)",
    color: "#fff",
    padding: "12px 16px",
    borderRadius: "6px",
    fontSize: "12px",
    lineHeight: "1.5",
    maxWidth: "400px",
    maxHeight: "400px",
    overflowY: "auto",
    zIndex: 10000,
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
    pointerEvents: "none"
  };

  const tableStyle = {
    width: "100%",
    borderCollapse: "collapse"
  };

  const labelStyle = {
    color: "#aaa",
    fontWeight: "500",
    paddingRight: "12px",
    paddingBottom: "4px",
    paddingTop: "4px",
    verticalAlign: "top",
    whiteSpace: "nowrap"
  };

  const valueStyle = {
    color: "#fff",
    paddingBottom: "4px",
    paddingTop: "4px",
    verticalAlign: "top",
    wordBreak: "break-word",
    maxWidth: "250px"
  };

  return (
    <div style={tooltipStyle}>
      <table style={tableStyle}>
        <tbody>
          {entries.map(([key, value]) => (
            <tr key={key}>
              <td style={labelStyle}>{formatLabel(key)}:</td>
              <td style={valueStyle}>{formatValue(value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {Object.keys(datum).length > maxFields && (
        <div style={{ marginTop: "8px", color: "#888", fontStyle: "italic" }}>
          + {Object.keys(datum).length - maxFields} more fields...
        </div>
      )}
    </div>
  );
}

export default RowTooltip;
