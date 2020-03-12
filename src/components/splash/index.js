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
import { DatasetsTable } from './availableDatasets';
import { getSelectedDatasets } from "../../reducers/datasets"

@connect((state) => ({
  availableDatasets: state.datasets.availableDatasets,
  errorMessage: state.datasets.errorMessage
}))
class Splash extends React.Component {
  render() {
    return (
      <div style={{justifyContent: "space-around", display: "flex", marginRight: 50}}>
        <div className="static container">
          <div style={{marginBottom: 35}}>
            <Flex justifyContent="center">
              <img alt="logo" src={require("../../images/olmsted.svg")}/>
            </Flex>
          </div>
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
            {/*This only happens when the app loads up, not when we change the state.*/}
            <DatasetsTable availableDatasets={this.props.availableDatasets} dispatch={this.props.dispatch}/>
            <button
              style={{
                border: "0px",
                backgroundColor: "#05337f",
                marginTop: 20,
                borderRadius: 5,
                cursor: "pointer",
                padding: 20,
                fontFamily: "Lato",
                color: "white",
                fontWeight: 400,
                fontSize: 18,
                outline: 0
              }}
              onClick={
                (e) => this.props.dispatch(
                  changePage(
                    {path: "/app", query: 
                      {selectedDatasets: getSelectedDatasets(
                              this.props.availableDatasets).map(dataset => dataset.dataset_id)
                      }
                    }
                  )
                )
                }>
                Explore!
            </button>
          </CenterContent>
          {/* hack; insert line */}
        </div>
      </div>

    );
  }
}

export default Splash;
