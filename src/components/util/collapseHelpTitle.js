import React from "react";
import Collapsible from "react-collapsible";
import { FiHelpCircle } from "react-icons/fi";

class CollapseHelpTitle extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      isOpen: false,
      isHovered: false
    };
  }

  handleToggle = (isOpen) => {
    this.setState({ isOpen });
  };

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
        onTriggerOpening={() => this.handleToggle(true)}
        onTriggerClosing={() => this.handleToggle(false)}
      >
        <div style={{ paddingBottom: "15px" }}>
          {helpText}
        </div>
      </Collapsible>
    );
  }
}

export { CollapseHelpTitle };
