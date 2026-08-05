import React from "react";
import ReactDOM from "react-dom";
import PropTypes from "prop-types";

/**
 * A small "Columns" popover for toggling table column visibility.
 *
 * The menu is rendered in a portal (document.body) and positioned with `fixed`
 * coordinates anchored to the button, so it isn't clipped by the table's
 * `overflow: hidden` containers. Required columns are listed but locked
 * (checked + disabled) so the table stays usable; toggling an optional column
 * calls `onToggle(name)` — the parent owns the visibility state (Redux).
 */
class ColumnPicker extends React.Component {
  constructor(props) {
    super(props);
    this.state = { open: false, anchorRect: null };
    this.buttonRef = React.createRef();
    this.menuRef = React.createRef();
    this.handleDocumentMouseDown = this.handleDocumentMouseDown.bind(this);
    this.handleReposition = this.handleReposition.bind(this);
  }

  componentWillUnmount() {
    this.removeListeners();
  }

  addListeners() {
    document.addEventListener("mousedown", this.handleDocumentMouseDown);
    // Capture phase so we catch scrolls in nested (table) scroll containers too.
    window.addEventListener("scroll", this.handleReposition, true);
    window.addEventListener("resize", this.handleReposition);
  }

  removeListeners() {
    document.removeEventListener("mousedown", this.handleDocumentMouseDown);
    window.removeEventListener("scroll", this.handleReposition, true);
    window.removeEventListener("resize", this.handleReposition);
  }

  handleDocumentMouseDown(event) {
    const inButton = this.buttonRef.current && this.buttonRef.current.contains(event.target);
    const inMenu = this.menuRef.current && this.menuRef.current.contains(event.target);
    if (!inButton && !inMenu) {
      this.close();
    }
  }

  handleReposition() {
    if (this.buttonRef.current) {
      this.setState({ anchorRect: this.buttonRef.current.getBoundingClientRect() });
    }
  }

  toggleOpen = () => {
    if (this.state.open) {
      this.close();
    } else {
      const anchorRect = this.buttonRef.current ? this.buttonRef.current.getBoundingClientRect() : null;
      this.setState({ open: true, anchorRect });
      this.addListeners();
    }
  };

  close() {
    this.removeListeners();
    this.setState({ open: false });
  }

  renderMenu() {
    const { columns, onToggle } = this.props;
    const { anchorRect } = this.state;
    if (!anchorRect) return null;

    // Anchor the menu's bottom-right to the button's top-right (opens upward,
    // since the picker lives in the table footer). Fixed coords escape clipping.
    const menuStyle = {
      position: "fixed",
      bottom: window.innerHeight - anchorRect.top + 4,
      right: window.innerWidth - anchorRect.right,
      background: "#fff",
      border: "1px solid #ccc",
      borderRadius: "4px",
      boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
      padding: "6px 0",
      minWidth: "180px",
      maxHeight: "320px",
      overflowY: "auto",
      zIndex: 2000
    };

    return ReactDOM.createPortal(
      <div ref={this.menuRef} role="menu" style={menuStyle}>
        {columns.map((col) => {
          const checked = col.required || col.visible;
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
      </div>,
      document.body
    );
  }

  render() {
    const { columns } = this.props;
    const { open } = this.state;
    const hiddenOptionalCount = columns.filter((c) => !c.required && !c.visible).length;

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
      <>
        <button
          ref={this.buttonRef}
          type="button"
          onClick={this.toggleOpen}
          style={buttonStyle}
          title="Show or hide table columns"
          aria-haspopup="true"
          aria-expanded={open}
        >
          Columns{hiddenOptionalCount > 0 ? ` (${hiddenOptionalCount} hidden)` : ""}
        </button>
        {open && this.renderMenu()}
      </>
    );
  }
}

ColumnPicker.propTypes = {
  // All columns in display order: { name, required, visible }. Required columns
  // render checked + locked; others render checked iff visible.
  columns: PropTypes.arrayOf(
    PropTypes.shape({ name: PropTypes.string.isRequired, required: PropTypes.bool, visible: PropTypes.bool })
  ).isRequired,
  // Called with a column name when an optional column is toggled
  onToggle: PropTypes.func.isRequired
};

export default ColumnPicker;
