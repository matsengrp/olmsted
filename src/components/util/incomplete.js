import React from "react";

/**
 * Warning banner shown when a clonal family or tree has insufficient data to display.
 *
 * @param {Object} props
 * @param {Object} props.datum - The incomplete data object
 * @param {string} props.data_type - Label for the data type (e.g., "clonal family", "tree")
 * @param {string[]} [props.reasons] - Specific reasons for incompleteness
 */
function IncompleteDataWarning({ datum, data_type, reasons }) {
  const id = datum.clone_id || datum.id || datum.ident || datum.tree_id;
  return (
    <div
      style={{
        marginTop: "10px",
        padding: "16px",
        backgroundColor: "#f8d7da",
        border: "1px solid #dc3545",
        borderRadius: "4px",
        color: "#721c24"
      }}
    >
      <h3
        style={{
          margin: "0 0 8px 0",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          fontSize: "16px",
          fontWeight: "bold"
        }}
      >
        <span style={{ fontSize: "20px" }}>✖</span>
        Insufficient data to display {data_type}
        {id && `: ${id}`}
      </h3>
      {reasons && reasons.length > 0 ? (
        <ul style={{ margin: "8px 0 0 0", paddingLeft: 20, fontSize: "14px" }}>
          {reasons.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      ) : (
        <p style={{ margin: "8px 0 0 0", fontSize: "14px" }}>Check the browser console for details.</p>
      )}
    </div>
  );
}

export { IncompleteDataWarning };
