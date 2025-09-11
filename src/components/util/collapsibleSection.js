import React from "react";
import Collapsible from "react-collapsible";
import { FiChevronDown, FiChevronRight } from "react-icons/fi";

class CollapsibleSection extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      isOpen: props.defaultOpen !== false // Default to open unless explicitly set to false
    };
  }

  handleToggle = (isOpen) => {
    this.setState({ isOpen });
  };

  render() {
    const { titleText, helpText, children, ...otherProps } = this.props;
    const { isOpen } = this.state;

    return (
      <Collapsible
        trigger={
          <div
            style={{
              display: "flex",
              alignItems: "center",
              cursor: "pointer",
              userSelect: "none",
              marginBottom: "10px"
            }}
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
        {...otherProps}
      >
        {children}
      </Collapsible>
    );
  }
}

export { CollapsibleSection };
