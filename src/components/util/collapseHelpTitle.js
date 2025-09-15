import React from "react";
import Collapsible from "react-collapsible";
import { FiHelpCircle } from "react-icons/fi";

class CollapseHelpTitle extends React.Component {
  render() {
    const { titleText, helpText } = this.props;
    return (
      <Collapsible
        trigger={(
          <div>
            <h2>
              {titleText}
              {' '}
              <FiHelpCircle style={{ cursor: "pointer" }} />
            </h2>
          </div>
        )}
      >
        {helpText}
      </Collapsible>
    );
  }
}

export { CollapseHelpTitle };
