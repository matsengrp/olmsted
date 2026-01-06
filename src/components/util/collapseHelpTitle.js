import React from "react";
import Collapsible from "react-collapsible";
import { FiHelpCircle } from "react-icons/fi";

class CollapseHelpTitle extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      isHovered: false
    };
  }

  handleMouseEnter = () => {
    this.setState({ isHovered: true });
  };

  handleMouseLeave = () => {
    this.setState({ isHovered: false });
  };

  render() {
    const { titleText, helpText } = this.props;
    const { isHovered } = this.state;

    return (
      <Collapsible
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
        <div
          style={{
            marginTop: "10px",
            marginBottom: "15px",
            padding: "16px",
            backgroundColor: "#e7f3ff",
            border: "1px solid #b3d7ff",
            borderRadius: "6px",
            color: "#0a4a7c",
            fontSize: "14px",
            lineHeight: "1.5"
          }}
        >
          {helpText}
        </div>
      </Collapsible>
    );
  }
}

export { CollapseHelpTitle };
