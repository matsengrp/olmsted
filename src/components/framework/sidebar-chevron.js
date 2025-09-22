import React from "react";

function SidebarChevron({ mobileDisplay, handler }) {
  const chevronStyle = {
    visibility: mobileDisplay ? "hidden" : "visible",
    width: mobileDisplay ? 0 : 12,
    height: 16,
    backgroundColor: "inherit",
    boxShadow: "none",
    cursor: "pointer",
    marginTop: 2,
    borderRadius: "0px",
    fontSize: 12,
    color: "#444",
    textAlign: "center",
    verticalAlign: "middle"
  };

  /**
   * Keyboard handler for sidebar toggle chevron
   * WCAG 2.1.1: All controls must be keyboard operable
   * This control toggles the sidebar visibility
   */
  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handler(e);
    }
  };

  return (
    <div
      style={chevronStyle}
      onClick={handler}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label="Toggle sidebar"
      aria-expanded={!mobileDisplay} // Indicates if sidebar is shown
    >
      <i className="fa fa-chevron-left" aria-hidden="true" />
    </div>
  );
}

export default SidebarChevron;
