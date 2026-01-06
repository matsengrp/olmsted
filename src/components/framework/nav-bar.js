/**
 * Sticky navigation bar with Olmsted logo and optional config settings button
 * Larger when at top of page, shrinks on scroll
 */

import React from "react";
import { connect } from "react-redux";
import { changePage } from "../../actions/navigation";
import * as configActions from "../../actions/configs";

// Header heights - exported so other components can account for it
export const NAV_BAR_HEIGHT = 50; // Collapsed height
const EXPANDED_NAV_BAR_HEIGHT = 70; // Height when at top

// SVG gear icon
const GearIcon = ({ size = 16 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

@connect((state) => ({
  currentSection: state.clonalFamilies.currentSection
}))
class NavBar extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      isConfigHovered: false,
      isScrolled: false
    };
  }

  componentDidMount() {
    window.addEventListener("scroll", this.handleScroll);
    this.handleScroll(); // Check initial scroll position
  }

  componentWillUnmount() {
    window.removeEventListener("scroll", this.handleScroll);
  }

  handleScroll = () => {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const isScrolled = scrollTop > 20;
    if (isScrolled !== this.state.isScrolled) {
      this.setState({ isScrolled });
    }
  };

  handleConfigClick = () => {
    const { dispatch } = this.props;
    dispatch(configActions.openConfigModal());
  };

  handleLogoClick = () => {
    const { dispatch } = this.props;
    dispatch(changePage({ path: "/" }));
  };

  render() {
    const { showSettings = true, currentSection = "" } = this.props;
    const { isConfigHovered, isScrolled } = this.state;

    const currentHeight = isScrolled ? NAV_BAR_HEIGHT : EXPANDED_NAV_BAR_HEIGHT;
    const logoSize = isScrolled ? 32 : 44;
    const titleSize = isScrolled ? 18 : 24;

    const headerStyle = {
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      height: `${currentHeight}px`,
      backgroundColor: "#fff",
      borderBottom: "1px solid #e0e0e0",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 20px",
      zIndex: 1001,
      boxShadow: isScrolled ? "0 1px 3px rgba(0, 0, 0, 0.1)" : "none",
      transition: "height 0.2s ease, box-shadow 0.2s ease"
    };

    const logoContainerStyle = {
      display: "flex",
      alignItems: "center",
      gap: "10px",
      cursor: "pointer",
      textDecoration: "none"
    };

    const logoStyle = {
      height: `${logoSize}px`,
      width: "auto",
      transition: "height 0.2s ease"
    };

    const titleStyle = {
      fontSize: `${titleSize}px`,
      fontWeight: "600",
      color: "#333",
      margin: 0,
      transition: "font-size 0.2s ease"
    };

    const rightSectionStyle = {
      display: "flex",
      alignItems: "center",
      gap: "12px"
    };

    const centerSectionStyle = {
      position: "absolute",
      left: "50%",
      transform: "translateX(-50%)",
      fontSize: isScrolled ? "14px" : "16px",
      fontWeight: "500",
      color: "#666",
      transition: "font-size 0.2s ease, opacity 0.2s ease",
      opacity: currentSection ? 1 : 0,
      whiteSpace: "nowrap"
    };

    const configButtonStyle = {
      display: "flex",
      alignItems: "center",
      gap: "6px",
      padding: isScrolled ? "6px 12px" : "8px 14px",
      backgroundColor: isConfigHovered ? "#3a7a94" : "#4a90a4",
      border: "none",
      borderRadius: "4px",
      cursor: "pointer",
      color: "white",
      fontSize: isScrolled ? "13px" : "14px",
      fontWeight: "500",
      transition: "background-color 0.2s, padding 0.2s, font-size 0.2s"
    };

    return (
      <header style={headerStyle}>
        <div
          style={logoContainerStyle}
          onClick={this.handleLogoClick}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              this.handleLogoClick();
            }
          }}
          role="link"
          tabIndex={0}
          aria-label="Go to home page"
        >
          {/* eslint-disable-next-line global-require */}
          <img src={require("../../images/olmsted.svg")} alt="Olmsted" style={logoStyle} />
          <h1 style={titleStyle}>Olmsted</h1>
        </div>

        {/* Centered section name */}
        <div style={centerSectionStyle}>{currentSection}</div>

        <div style={rightSectionStyle}>
          {showSettings && (
            <button
              style={configButtonStyle}
              onClick={this.handleConfigClick}
              onMouseEnter={() => this.setState({ isConfigHovered: true })}
              onMouseLeave={() => this.setState({ isConfigHovered: false })}
              title="Visualization Settings"
              aria-label="Open visualization settings"
            >
              <GearIcon size={isScrolled ? 16 : 18} />
              <span>Settings</span>
            </button>
          )}
        </div>
      </header>
    );
  }
}

export default NavBar;
