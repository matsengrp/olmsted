import React from "react";

// Print an object to the DOM because it is broken somehow
function IncompleteDataWarning({ datum, data_type }) {
  const id_of_broken_data = datum.id || datum.ident;
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
      <h3 style={{
        margin: "0 0 12px 0",
        display: "flex",
        alignItems: "center",
        gap: "10px",
        fontSize: "16px",
        fontWeight: "bold"
      }}>
        <span style={{ fontSize: "20px" }}>✖</span>
        Loading error: Insufficient data to display {data_type}
        {id_of_broken_data && ": " + id_of_broken_data}
      </h3>
      <p style={{ margin: "0 0 10px 0", fontSize: "14px" }}>
        {data_type} object has been logged to the console for inspection:
      </p>
      <div
        style={{
          backgroundColor: "#ffffff",
          border: "1px solid #dc3545",
          borderRadius: "3px",
          padding: "10px",
          overflowX: "auto"
        }}
      >
        <pre style={{ margin: 0, fontSize: "12px" }}>
          <code>{JSON.stringify(datum, null, 2)}</code>
        </pre>
      </div>
    </div>
  );
}

export { IncompleteDataWarning };
