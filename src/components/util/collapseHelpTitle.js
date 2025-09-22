import React from "react";
import Collapsible from "react-collapsible";
import { FiHelpCircle } from "react-icons/fi";

function CollapseHelpTitle({ titleText, helpText }) {
  return (
    <Collapsible
      trigger={
        <div>
          <h2>
            {titleText} <FiHelpCircle style={{ cursor: "pointer" }} />
          </h2>
        </div>
      }
    >
      {helpText}
    </Collapsible>
  );
}

export { CollapseHelpTitle };
