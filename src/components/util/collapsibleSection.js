import React from "react";
import Collapsible from "react-collapsible";
import { FiChevronDown, FiChevronRight } from "react-icons/fi";

class CollapsibleSection extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      isOpen: props.defaultOpen !== false, // Default to open unless explicitly set to false
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
    const { titleText, _helpText, children, ...otherProps } = this.props;
    const { isOpen, isHovered } = this.state;

    return (
      <Collapsible
        trigger={
          <div
            style={{
              display: "flex",
              alignItems: "center",
              cursor: "pointer",
              userSelect: "none",
              marginBottom: "10px",
              padding: "8px",
              borderRadius: "4px",
              backgroundColor: isHovered ? "#f0f0f0" : "transparent",
              transition: "background-color 0.2s ease"
            }}
            onMouseEnter={this.handleMouseEnter}
            onMouseLeave={this.handleMouseLeave}
          >
            {isOpen ? (
              <FiChevronDown style={{ marginRight: "8px", fontSize: "16px", color: "#666" }} />
            ) : (
              <FiChevronRight style={{ marginRight: "8px", fontSize: "16px", color: "#666" }} />
            )}
            <h2
              style={{
                margin: 0,
                display: "inline-flex",
                alignItems: "center",
                fontSize: "1.5em"
              }}
            >
              {titleText}
            </h2>
          </div>
        }
        onTriggerOpening={() => this.handleToggle(true)}
        onTriggerClosing={() => this.handleToggle(false)}
        open={isOpen}
        // eslint-disable-next-line react/jsx-props-no-spreading
        {...otherProps}
      >
        {children}
      </Collapsible>
    );
  }
}

export { CollapsibleSection };
