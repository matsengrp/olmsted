import React from "react";
import * as _ from "lodash";
import { FiDownload } from "react-icons/fi";

const buttonStyle = {
  padding: "6px 12px",
  color: "#333",
  cursor: "pointer"
};

const compactButtonStyle = {
  padding: "2px 6px",
  color: "#666",
  cursor: "pointer",
  background: "none",
  border: "1px solid #ccc",
  borderRadius: "3px",
  fontSize: "11px",
  display: "inline-flex",
  alignItems: "center",
  verticalAlign: "middle"
};

const linkStyle = {
  textDecoration: "none"
};

/**
 * DownloadCSV component - Downloads table data as a CSV file
 *
 * @param {Array} data - Array of objects to export
 * @param {Array} columns - Array of column definitions: { header: string, accessor: string|function }
 *   - header: Column name for CSV header
 *   - accessor: Either a lodash path string (e.g., "sample.locus") or a function (datum) => value
 * @param {string} filename - Name of the downloaded file (should end in .csv)
 * @param {string} label - Button label text
 * @param {boolean} compact - If true, renders a small inline button with icon only
 */
class DownloadCSV extends React.Component {
  constructor(props) {
    super(props);
    this.csvFile = null;
  }

  escapeCSVValue(value) {
    if (value === null || value === undefined) {
      return "";
    }
    const stringValue = String(value);
    // Escape quotes by doubling them, wrap in quotes if contains comma, quote, or newline
    if (stringValue.includes(",") || stringValue.includes('"') || stringValue.includes("\n")) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
  }

  generateCSV() {
    const { data, columns } = this.props;

    // Generate header row
    const headers = columns.map((col) => this.escapeCSVValue(col.header));
    const headerRow = headers.join(",");

    // Generate data rows
    const dataRows = data.map((datum) => {
      const values = columns.map((col) => {
        let value;
        if (typeof col.accessor === "function") {
          value = col.accessor(datum);
        } else {
          value = _.get(datum, col.accessor);
        }
        return this.escapeCSVValue(value);
      });
      return values.join(",");
    });

    return [headerRow, ...dataRows].join("\n");
  }

  createCSVDownload() {
    const csvContent = this.generateCSV();
    const data = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });

    // Revoke previous URL to avoid memory leaks
    if (this.csvFile !== null) {
      window.URL.revokeObjectURL(this.csvFile);
    }

    this.csvFile = window.URL.createObjectURL(data);
    return this.csvFile;
  }

  render() {
    const { filename, label, compact } = this.props;

    if (compact) {
      return (
        <a href={this.createCSVDownload()} download={filename || "table.csv"} style={linkStyle} title={label || "Download CSV"}>
          <button type="button" style={compactButtonStyle}>
            <FiDownload style={{ fontSize: "12px", marginRight: "4px" }} />
            <span>CSV</span>
          </button>
        </a>
      );
    }

    return (
      <a href={this.createCSVDownload()} download={filename || "table.csv"} style={linkStyle}>
        <button type="button" style={buttonStyle}>
          <FiDownload style={{ marginRight: "6px", verticalAlign: "middle" }} />
          {label || "Download CSV"}
        </button>
      </a>
    );
  }
}

export default DownloadCSV;
