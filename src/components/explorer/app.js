import React from "react";
import PropTypes from 'prop-types';
import VegaLite from 'react-vega-lite';
// import 
import { connect } from "react-redux";
import { loadJSONs } from "../../actions/loadData";
import { controlsHiddenWidth, controlsWidth, controlsPadding } from "../../util/globals";
import { filterDatasets } from "../../reducers/datasets"
import ClonalFamiliesTable from "./table";
import * as viz from "./visualization";
import { hot } from 'react-hot-loader';


// STYLES
const PADDING_FRACTION = 0.03

// Compute how much padding the page should have.
// Use above percentage of available width for padding on either side
const usableWidthStyle = (availableWidth) => {
  return {
    width: availableWidth*(1-2*PADDING_FRACTION),
    paddingLeft: availableWidth*PADDING_FRACTION,
    paddingRight: availableWidth*PADDING_FRACTION,
    paddingTop: 40,
    paddingBottom: 220
  }
}

const tableStyle = {marginBottom: 20, overflow:'auto'};

const sectionStyle = {paddingBottom: 10, marginBottom: 40, overflow: 'auto'};

const Contents = ({styles, grid, availableDatasets, selectedFamily, selectedSeq, availableWidth, availableHeight}) => {

  return (
    <div style={usableWidthStyle(availableWidth)}>
      <div style={sectionStyle}>
        <h2>Clonal Families</h2>
        <p>Click and drag on the visualization below to brush select a collection of clonal families for deeper investigation.</p>
        <viz.ClonalFamiliesViz/>
      </div>
      <div style={{paddingBottom: 40}}>
        <h2>Selected clonal families:</h2>
        <div style={tableStyle}>
            <ClonalFamiliesTable/>
        </div>
      </div>
      { selectedFamily ?
          <div style={sectionStyle}>
            <viz.TreeViz/>
          </div> :
          ""}
      {_.isEmpty(selectedSeq) ?
          "" :
          <div style={sectionStyle}>
            <viz.Lineage/>
          </div>}
    </div>
  );
};

const Overlay = ({styles, mobileDisplay, handler}) => {
  return (
    mobileDisplay ?
      <div style={styles} onClick={handler} onTouchStart={handler}/> :
      <div/>
  );
};

@connect((state) => ({
  browserDimensions: state.browserDimensions.browserDimensions,
  availableDatasets: state.datasets.availableDatasets,
  selectedFamily: state.clonalFamilies.selectedFamily,
  selectedSeq: state.clonalFamilies.selectedSeq
}))
class App extends React.Component {
  constructor(props) {
    super(props);
    // For resize media query listener see this link (helps resize for mobile etc):
    //https://github.com/nextstrain/auspice/blob/master/src/components/app.js#L112-L122
  }
  static propTypes = {
    dispatch: PropTypes.func.isRequired
  }
  componentDidMount() {
    document.addEventListener("dragover", (e) => {e.preventDefault();}, false);
    
  }
  componentDidUpdate(prevProps) {
    if (prevProps.datapath !== this.props.datapath) {
      this.props.dispatch(loadJSONs());
    }
  }
  render() {
    /* D I M E N S I O N S */
    let availableWidth = this.props.browserDimensions.width;
    const availableHeight = this.props.browserDimensions.height;

    // let sidebarWidth = 0;
    
    // sidebarWidth = controlsWidth;
    
    // sidebarWidth += controlsPadding;

    // const visibleSidebarWidth = this.state.sidebarOpen ? sidebarWidth : 0;
    // if (!this.state.mobileDisplay) {
    //   availableWidth -= visibleSidebarWidth;
    // }


    /* S T Y L E S */
    const sharedStyles = {
      position: "absolute",
      top: 0,
      bottom: 0,
      right: 0,
      transition: 'left 0.3s ease-out'
    };
    const overlayStyles = {
      ...sharedStyles,
      position: "absolute",
      display: "block",
      width: availableWidth,
      height: availableHeight,
      left:  0,
      opacity: 0,
      visibility: "hidden",
      zIndex: 8000,
      backgroundColor: "rgba(0,0,0,0.5)",
      cursor: "pointer",
      overflow: "scroll",
      transition: 'left 0.3s ease-out, opacity 0.3s ease-out, visibility 0s ease-out 0.3s'
    };
    const contentStyles = {
    };

    return (
      <span>
        {/* <DownloadModal/> */}
        <Contents
          // sidebarOpen={this.state.sidebarOpen}
          styles={contentStyles}
          availableWidth={availableWidth}
          availableHeight={availableHeight}
          availableDatasets={this.props.availableDatasets}
          selectedFamily={this.props.selectedFamily}
          selectedSeq={this.props.selectedSeq}
        />
        <Overlay
          styles={overlayStyles}
          // sidebarOpen={this.state.sidebarOpen}
          // mobileDisplay={this.state.mobileDisplay}
          // handler={() => {this.setState({sidebarOpen: false});}}
        />
      </span>
    );
  }
}

export default hot(module)(App);
