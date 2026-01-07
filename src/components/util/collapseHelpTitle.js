import React from "react";
import Collapsible from "react-collapsible";
import { FiHelpCircle, FiX } from "react-icons/fi";

class CollapseHelpTitle extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      isHovered: false,
      isOpen: false,
      closeHovered: false
    };
  }

  handleMouseEnter = () => {
    this.setState({ isHovered: true });
  };

  handleMouseLeave = () => {
    this.setState({ isHovered: false });
  };

  handleOpen = () => {
    this.setState({ isOpen: true });
  };

  handleClose = () => {
    this.setState({ isOpen: false });
  };

  handleCloseClick = (e) => {
    e.stopPropagation();
    this.setState({ isOpen: false });
  };

  render() {
    const { titleText, helpText } = this.props;
    const { isHovered, isOpen, closeHovered } = this.state;

    return (
      <Collapsible
        open={isOpen}
        onOpening={this.handleOpen}
        onClosing={this.handleClose}
        trigger={
          <div
            style={{
              display: "inline-block",
              padding: "8px",
              borderRadius: "4px",
              backgroundColor: isHovered ? "#f0f0f0" : "transparent",
              transition: "background-color 0.2s ease"
            }}
            onMouseEnter={this.handleMouseEnter}
            onMouseLeave={this.handleMouseLeave}
          >
            <h2 style={{ margin: 0, display: "inline" }}>
              {titleText} <FiHelpCircle style={{ cursor: "pointer" }} />
            </h2>
          </div>
        }
      >
        <div className="info-box" style={{ position: "relative" }}>
          <button
            type="button"
            onClick={this.handleCloseClick}
            onMouseEnter={() => this.setState({ closeHovered: true })}
            onMouseLeave={() => this.setState({ closeHovered: false })}
            style={{
              position: "absolute",
              top: "8px",
              right: "8px",
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
            }}
            aria-label="Close help"
          >
            <FiX size={18} />
          </button>
          <div style={{ paddingRight: "30px" }}>
            {helpText}
          </div>
        </div>
      </Collapsible>
    );
  }
}

export { CollapseHelpTitle };
