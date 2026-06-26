import React from "react";
import PropTypes from "prop-types";

/**
 * A small "Columns" popover for toggling table column visibility.
 *
 * Required columns are listed but locked (checked + disabled) so the table
 * stays usable. Toggling an optional column calls `onToggle(name)`; the parent
 * owns the visibility state (Redux), so this component is presentational.
 */
class ColumnPicker extends React.Component {
  constructor(props) {
    super(props);
    this.state = { open: false };
    this.containerRef = React.createRef();
    this.handleDocumentMouseDown = this.handleDocumentMouseDown.bind(this);
  }

  componentWillUnmount() {
    document.removeEventListener("mousedown", this.handleDocumentMouseDown);
  }

  handleDocumentMouseDown(event) {
    // Close when clicking outside the picker.
    if (this.containerRef.current && !this.containerRef.current.contains(event.target)) {
      this.close();
    }
  }

  toggleOpen = () => {
    this.setState((prev) => {
      const open = !prev.open;
      if (open) {
        document.addEventListener("mousedown", this.handleDocumentMouseDown);
      } else {
        document.removeEventListener("mousedown", this.handleDocumentMouseDown);
      }
      return { open };
    });
  };

  close() {
    document.removeEventListener("mousedown", this.handleDocumentMouseDown);
    this.setState({ open: false });
  }

  render() {
    const { columns, hiddenColumns, onToggle } = this.props;
    const { open } = this.state;
    const hiddenSet = new Set(hiddenColumns);
    const hiddenOptionalCount = columns.filter((c) => !c.required && hiddenSet.has(c.name)).length;

    const buttonStyle = {
      background: "none",
      border: "1px solid #ccc",
      borderRadius: "4px",
      padding: "4px 8px",
      fontSize: "11px",
      cursor: "pointer",
      display: "inline-flex",
      alignItems: "center",
      gap: "4px",
      marginRight: "8px"
    };

    return (
      <div ref={this.containerRef} style={{ position: "relative", display: "inline-block" }}>
        <button
          type="button"
          onClick={this.toggleOpen}
          style={buttonStyle}
          title="Show or hide table columns"
          aria-haspopup="true"
          aria-expanded={open}
        >
          Columns{hiddenOptionalCount > 0 ? ` (${hiddenOptionalCount} hidden)` : ""}
        </button>
        {open && (
          <div
            role="menu"
            style={{
              position: "absolute",
              bottom: "100%",
              right: 0,
              marginBottom: "4px",
              background: "#fff",
              border: "1px solid #ccc",
              borderRadius: "4px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
              padding: "6px 0",
              minWidth: "180px",
              maxHeight: "320px",
              overflowY: "auto",
              zIndex: 1000
            }}
          >
            {columns.map((col) => {
              const checked = col.required || !hiddenSet.has(col.name);
              return (
                <label
                  key={col.name}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "4px 12px",
                    fontSize: "12px",
                    cursor: col.required ? "default" : "pointer",
                    color: col.required ? "#999" : "inherit",
                    whiteSpace: "nowrap"
                  }}
                  title={col.required ? "Always shown" : undefined}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={col.required}
                    onChange={() => onToggle(col.name)}
                    style={{ cursor: col.required ? "default" : "pointer" }}
                  />
                  {col.name}
                </label>
              );
            })}
          </div>
        )}
      </div>
    );
  }
}

ColumnPicker.propTypes = {
  // All toggleable + required columns, in display order: { name, required }
  columns: PropTypes.arrayOf(PropTypes.shape({ name: PropTypes.string.isRequired, required: PropTypes.bool }))
    .isRequired,
  // Names of optional columns currently hidden
  hiddenColumns: PropTypes.arrayOf(PropTypes.string).isRequired,
  // Called with a column name when an optional column is toggled
  onToggle: PropTypes.func.isRequired
};

export default ColumnPicker;
