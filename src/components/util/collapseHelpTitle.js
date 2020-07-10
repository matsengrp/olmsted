import React from 'react';
import Collapsible from "react-collapsible";
import { FiHelpCircle } from "react-icons/fi";


class CollapseHelpTitle extends React.Component {
  render(){
    return (
    <Collapsible trigger={<div><h2>{this.props.titleText} <FiHelpCircle style={{cursor:"pointer"}}/></h2></div>}>
        <p>{this.props.helpText}</p>
    </Collapsible>
    )
  }
}

export {CollapseHelpTitle};