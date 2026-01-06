/**
 * Shared cell components for dataset tables (DatasetManagementTable and DatasetLoadingTable)
 */
import React from "react";

/**
 * Component for the citation column
 * Displays paper author string with optional link to paper URL
 */
export function CitationCell({ datum }) {
  if (!datum) {
    return <span>—</span>;
  }

  const { paper } = datum;
  if (!paper) return <span>—</span>;

  if (paper.url) {
    return (
      <a href={paper.url} onClick={(e) => e.stopPropagation()}>
        {paper.authorstring}
      </a>
    );
  }
  return <span>{paper.authorstring}</span>;
}

/**
 * Component for the size column
 * Converts file size from bytes to MB
 */
export function SizeCell({ datum }) {
  if (!datum) {
    return <span>—</span>;
  }

  const dataset = datum;
  const sizeInBytes = dataset.file_size || dataset.fileSize || 0;

  if (sizeInBytes === 0) {
    return <span>—</span>;
  }

  const sizeInMB = (sizeInBytes / (1024 * 1024)).toFixed(1);
  return <span>{sizeInMB} MB</span>;
}

/**
 * Component for the upload time column
 * Formats ISO datetime to YYYY-MM-DD HH:MM:SS
 */
export function UploadTimeCell({ datum }) {
  if (!datum) {
    return <span>—</span>;
  }

  const uploadTime = datum.upload_time;
  if (!uploadTime) {
    return <span>—</span>;
  }

  // Display in YYYY-MM-DD HH:MM:SS format (remove T and Z from ISO format)
  const formattedTime = uploadTime.replace('T', ' ').replace('Z', '');
  return <span>{formattedTime}</span>;
}

/**
 * Component for the build time column
 * Shows build.time from dataset metadata
 */
export function BuildTimeCell({ datum }) {
  if (!datum) {
    return <span>—</span>;
  }

  const buildTime = datum.build ? datum.build.time || "—" : "—";
  return <span>{buildTime}</span>;
}

// Mark these as React components for production builds where names are minified
CitationCell.isReactComponent = true;
SizeCell.isReactComponent = true;
UploadTimeCell.isReactComponent = true;
BuildTimeCell.isReactComponent = true;

/**
 * CSV column definitions for dataset export
 * Used by both DatasetManagementTable and DatasetLoadingTable
 */
export function getDatasetCsvColumns(showCitation = false) {
  const columns = [
    { header: "Status", accessor: "loading" },
    { header: "Name", accessor: (d) => d.name || d.dataset_id },
    { header: "ID", accessor: "dataset_id" },
    { header: "Source", accessor: (d) => (d.isClientSide || d.temporary ? "Local" : "Server") },
    { header: "Size (bytes)", accessor: "file_size" },
    { header: "Subjects", accessor: "subjects_count" },
    { header: "Families", accessor: "clone_count" },
    { header: "Upload Time", accessor: "upload_time" },
    { header: "Build Time", accessor: (d) => (d.build ? d.build.time : "") }
  ];

  if (showCitation) {
    columns.push({ header: "Citation", accessor: (d) => (d.paper ? d.paper.authorstring : "") });
  }

  return columns;
}

/**
 * Standard column width map for dataset tables
 */
export const datasetColumnWidths = {
  "Select": 60,
  "Load": 60,
  "Status": 60,
  "Name": 200,
  "ID": 150,
  "Source": 80,
  "Size (MB)": 80,
  "Subjects": 80,
  "Families": 100,
  "Upload Time": 120,
  "Build Time": 120,
  "Citation": 150,
  "Actions": 110
};
