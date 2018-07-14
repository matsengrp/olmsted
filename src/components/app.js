import React from "react";
import PropTypes from 'prop-types';
import { connect } from "react-redux";
import { loadJSONs } from "../actions/loadData";
import { controlsHiddenWidth, controlsWidth, controlsPadding } from "../util/globals";
import {filterDatasets } from "../reducers/datasets"


/* <Contents> contains the header, tree, map, footer components etc.
 * here is where the panel sizes are decided, as well as which components are displayed.
 */
const Contents = ({styles, grid, availableDatasets}) => {
  /* TODO */
  const chosenDatasets = filterDatasets(availableDatasets).map((dataset) =>
  <li>{dataset}</li>
  );

  const divStyle = {
    fontSize: 20,
  }; 
  return (
    <div style={styles}>
      <h2>Clonal Families</h2>
      <h1>CHOSEN DATASETS</h1>
      <ul style={divStyle}>{chosenDatasets}</ul>

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
  availableDatasets: state.datasets.availableDatasets
}))
class App extends React.Component {
  constructor(props) {
    super(props);
    // console.log('state', props);
    /* window listener to see when width changes cross threshold to toggle sidebar */
    const mql = window.matchMedia(`(min-width: ${controlsHiddenWidth}px)`);
    mql.addListener(() => this.setState({
      sidebarOpen: this.state.mql.matches,
      mobileDisplay: !this.state.mql.matches
    }));
    this.state = {
      mql,
      sidebarOpen: false,
      mobileDisplay: !mql.matches
    };
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

    let sidebarWidth = 0;
    
    sidebarWidth = controlsWidth;
    
    sidebarWidth += controlsPadding;

    const visibleSidebarWidth = this.state.sidebarOpen ? sidebarWidth : 0;
    if (!this.state.mobileDisplay) {
      availableWidth -= visibleSidebarWidth;
    }


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
      left: this.state.sidebarOpen ? visibleSidebarWidth : 0,
      opacity: this.state.sidebarOpen ? 1 : 0,
      visibility: this.state.sidebarOpen ? "visible" : "hidden",
      zIndex: 8000,
      backgroundColor: "rgba(0,0,0,0.5)",
      cursor: "pointer",
      overflow: "scroll",
      transition: this.state.sidebarOpen ?
        'visibility 0s ease-out, left 0.3s ease-out, opacity 0.3s ease-out' :
        'left 0.3s ease-out, opacity 0.3s ease-out, visibility 0s ease-out 0.3s'
    };
    const contentStyles = {
    };

    return (
      <span>
        {/* <DownloadModal/> */}
        <Contents
          sidebarOpen={this.state.sidebarOpen}
          styles={contentStyles}
          availableWidth={availableWidth}
          availableHeight={availableHeight}
          availableDatasets={this.props.availableDatasets}
        />
        <Overlay
          styles={overlayStyles}
          sidebarOpen={this.state.sidebarOpen}
          mobileDisplay={this.state.mobileDisplay}
          handler={() => {this.setState({sidebarOpen: false});}}
        />
      </span>
    );
  }
}

export default App;
