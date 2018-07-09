import React from "react";
import { connect } from "react-redux";
import Flex from "../framework/flex";
import SingleDataset from "./single";
import { materialButton } from "../../globalStyles";


@connect((state) => {
  return {
    availableDatasets: state.datasets.availableDatasets
  };
})
class Status extends React.Component {

  getBadges() {
    return (
      <Flex wrap="wrap" justifyContent="space-between" alignItems="center">
        <div>
          <a href="/"
            style={{
              paddingLeft: "8px",
              paddingRight: "8px",
              paddingTop: "20px",
              paddingBottom: "20px"}}
          >
            <img alt="" width="40" src={require("../../images/nextstrain-logo-small.png")}/>
          </a>
        </div>
        <div style={{flex: 5}}/>
        <div>
          <a href="https://travis-ci.com/nextstrain/auspice">
            <button style={materialButton}>
              Auspice
              <div style={{margin: "5px"}}>
                <img alt="auspice-badge" src="https://travis-ci.com/nextstrain/auspice.svg?branch=release"/>
              </div>
            </button>
          </a>
        </div>
        <div style={{width: "10px"}}/>
        <div>
          <a href="https://travis-ci.com/nextstrain/static">
            <button style={materialButton}>
              Static
              <div style={{margin: "5px"}}>
                <img alt="static-badge" src="https://travis-ci.com/nextstrain/static.svg?branch=master"/>
              </div>
            </button>
          </a>
        </div>
      </Flex>
    );
  }

  render() {
    if (!this.props.availableDatasets) {
      return null;
    }
    const s3bucket = window.location.pathname.includes("staging") ? "staging" : "live";
    console.warn("SHOULD ONLY EVER RUN ONCE");
    const queries = processAvailableDatasets(this.props.availableDatasets);
    return (
      <div style={{maxWidth: 1020, marginLeft: "auto", marginRight: "auto"}}>

        {this.getBadges()}

        <h1 style={{margin: "20px 20px 20px 20px", textAlign: "center"}}>
          {`Status page (s3 bucket: ${s3bucket})`}
        </h1>

        {queries.map((dataset) => (
          <SingleDataset key={dataset.id} path={dataset.id} bucket={s3bucket}/>
        ))}

      </div>
    );
  }
}

export default Status;
