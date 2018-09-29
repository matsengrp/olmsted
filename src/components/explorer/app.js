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
  
const PADDING_FRACTION = 0.05
// We'd like to be able to just use the padding fraction to 
// compute the padding for each side of the screen from the total
// available screeen width, and then use the remaining available
// screen width for our vega component. This DOES work when using 
// vega's autosize: fit which does some math to make sure every part
// of the viz fits into the width of it's container. However, this recalculation
// adds some discrepency between the signal updating the width and the autosize
// vega code updating the width and yields two different values. This (we suspect)
// introduces a bug with the first brush select and then resize the screen 
// (see  <PUT VEGA ISSUE HERE>)
// So we are using autosize: pad, instead which does not fit the vega exactly into
// its container, which is why wee need PADDING_BUFFER to adjust for the amount
// it exceeds its container.
const PADDING_BUFFER = 150

const gridContainerStyle = (availableWidth) => {
  return {
    width: availableWidth*(1-2*PADDING_FRACTION)-PADDING_BUFFER,
    paddingLeft: availableWidth*PADDING_FRACTION,
    paddingRight: availableWidth*PADDING_FRACTION,
    display: "grid",
    gridTemplateColumns: "auto",
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
    <div >
      
      <div style={gridContainerStyle(availableWidth)}>
      {/* <div className="grid-container"> */}
        <div className="grid-item">
          <h2>Clonal Families</h2>
          <p>Click and drag on the visualization below to brush select a collection of clonal families for deeper investigation.</p>
        </div>
        {/* {console.log(availableWidth)} */}
        <div style={{width: 'inherit'}} className="grid-item">
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
