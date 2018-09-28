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

/* <Contents> contains the header, tree, map, footer components etc.
 * here is where the panel sizes are decided, as well as which components are displayed.
 */

const grid_container_style = (availableWidth) => {
  return {
    display: "grid",
    gridTemplateColumns: availableWidth*0.6 + 'px',
    gridTemplateRows: "auto",
    justifyItems: "center"
  }
}

const Contents = ({styles, grid, availableDatasets, selectedFamily, selectedSeq, availableWidth, availableHeight}) => {

//const Contents = ({availableDatasets}) => {
  //if (showSpinner) {
  //}
  /* TODO */
  return (
    <div style={{margin: 50}}>
      
      {/* <div style={grid_container_style(availableWidth)}> */}
      <div className="grid-container">
        <div className="grid-item">
          <h2>Clonal Families</h2>
          <p>Click and drag on the visualization below to brush select a collection of clonal families for deeper investigation.</p>
        </div>
        {console.log(availableWidth)}
        <div style={{width: availableWidth*0.5}} className="grid-item">
        {/* <div  className="grid-item"> */}
          {/* <viz.ClonalFamiliesVizCustom availableWidth={availableWidth}/> */}
          <viz.ClonalFamiliesVizCustom/>
        </div>
      </div>
      <h2>Selected clonal families</h2>
      <div style={{paddingBottom: 20, width: 800, height:410, overflow:'scroll'}}>
        <ClonalFamiliesTable/>
      </div>
      <div style={{paddingBottom: 20, width: 1700, overflowX:'scroll'}}>
        {selectedFamily? <viz.TreeViz/> : ""}
        {_.isEmpty(selectedSeq)? "" : <viz.Lineage/>}
      </div>
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
    // console.log('state', props);
    /* window listener to see when width changes cross threshold to toggle sidebar */
    // const mql = window.matchMedia(`(min-width: ${controlsHiddenWidth}px)`);
    // mql.addListener(() => this.setState({
    //   sidebarOpen: this.state.mql.matches,
    //   mobileDisplay: !this.state.mql.matches
    // }));
    // this.state = {
    //   mql,
    //   sidebarOpen: false,
    //   mobileDisplay: !mql.matches
    // };
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
