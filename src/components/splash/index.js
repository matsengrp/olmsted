import React from "react";
import { connect } from "react-redux";
import Title from "../framework/title";
import Flex from "../../components/framework/flex";
import { changePage } from "../../actions/navigation";
import { logos } from "./logos";
import { displayAvailableDatasets } from "./availableDatasets";
import { CenterContent } from "./centerContent";
import { displayError } from "./displayError";
import { Provider } from 'react-redux';

@connect((state) => ({
  availableDatasets: state.datasets.availableDatasets,
  availableDatasets: state.clonalFamilies.availableClonalFamilies,
  errorMessage: state.datasets.errorMessage
}))
class Splash extends React.Component {
  render() {
    return (
      <div>
        <div className="static container">
          <Flex justifyContent="center">
            <Title/>
          </Flex>
          <div className="row">
            <h1 style={{textAlign: "center", marginTop: "-10px", fontSize: "29px"}}> B-cell repertoire and clonal family tree explorer </h1>
          </div>
          {/* First: either display the error message or the intro-paragraph */}
          {this.props.errorMessage ? (
            <CenterContent>
              {displayError(this.props.errorMessage)}
            </CenterContent>
          ) : (
            <p style={{maxWidth: 600, marginTop: 0, marginRight: "auto", marginBottom: 20, marginLeft: "auto", textAlign: "center", fontSize: 16, fontWeight: 300, lineHeight: 1.42857143}}>
              Olmsted is an open source tool for visualizing B-cell repertoire data.
            </p>
          )}
          {/* Secondly, list the available datasets */}

          <CenterContent>
            <p style={{maxWidth: 600, marginTop: 0, marginRight: "auto", marginBottom: 20, marginLeft: "auto", textAlign: "center", fontSize: 16, fontWeight: 300, lineHeight: 1.42857143}}>
              Select datasets below and click "Explore!" to visualize clonal families.
            </p>
            <button
              style={{marginLeft: "100%"}}
              onClick={(e) => this.props.dispatch(changePage({path: "app"}))}>
              Explore!
            </button>
            {/*This only happens when the app loads up, not when we change the state.*/}
            {console.log("displayAvailableDatasets being called on: ", this.props.availableDatasets)}
            {displayAvailableDatasets(this.props.availableDatasets, this.props.dispatch)}
          </CenterContent>
          {/* hack; insert line */}
        </div>
      </div>

    );
  }
}

export default Splash;
