import React from "react";
import PropTypes from 'prop-types';
import { connect } from "react-redux";
import { loadJSONs } from "../actions/loadData";
import SidebarToggle from "./framework/sidebar-toggle";
import Controls from "./controls/controls";
import { Frequencies } from "./frequencies";
import { Entropy } from "./entropy";
import Info from "./info/info";
import Tree from "./tree";
import Map from "./map/map";
import { controlsHiddenWidth, controlsWidth, controlsPadding } from "../util/globals";
import { sidebarColor } from "../globalStyles";
import NavBar from "./framework/nav-bar";
import Footer from "./framework/footer";
import DownloadModal from "./download/downloadModal";
import { analyticsNewPage } from "../util/googleAnalytics";
import filesDropped from "../actions/filesDropped";
import Narrative from "./narrative";
import { calcUsableWidth, computeResponsive } from "../util/computeResponsive";
import {filterDatasets } from "../reducers/datasets"
import { changePage } from "../actions/navigation";

const nextstrainLogo = require("../images/nextstrain-logo-small.png");

/* <Contents> contains the header, tree, map, footer components etc.
 * here is where the panel sizes are decided, as well as which components are displayed.
 */

@connect((state) => ({
  availableClonalFamilies: state.clonalFamilies.availableClonalFamilies}))
class ClonalFamiliesExplorer extends React.Component {
  render() {
    return (
      <table>
        <tbody>
          <tr><th>n seqs</th></tr>
          {this.props.availableClonalFamilies.map((data) =>
            (<tr key={data.ident}><td>{data.n_seqs}</td></tr>))}
        </tbody>
      </table>);
  };
};

const Contents = ({sidebarOpen, showSpinner, styles, availableWidth, availableHeight, panels, grid, narrative, frequenciesLoaded, availableDatasets}) => {
  //if (showSpinner) {
  //}
  /* TODO */
  const chosenDatasets = filterDatasets(availableDatasets).map((dataset) =>
  <li>{dataset}</li>
  );

  const divStyle = {
    fontSize: 20,
  }; 
  return (
    <div style={{margin: 50}}>
      <h2>Chosen datasets</h2>
      <ul style={divStyle}>{chosenDatasets}</ul>
      <h2>Clonal Families</h2>
      <ClonalFamiliesExplorer/>
      <h3>Viz</h3>
      <h3>Table</h3>
    </div>
  );
};



const Sidebar = ({styles, sidebarOpen, mobileDisplay, narrative, mapOn, toggleHandler}) => {
  return (
    <div style={styles}>
      <NavBar
        minified
        sidebarOpen={sidebarOpen}
        mobileDisplay={mobileDisplay}
        toggleHandler={toggleHandler}
      />
      <Controls mapOn={mapOn}/>
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
  metadataLoaded: state.metadata.loaded,
  panelsToDisplay: state.controls.panelsToDisplay,
  panelLayout: state.controls.panelLayout,
  displayNarrative: state.narrative.display,
  availableDatasets: state.datasets.availableDatasets,
  browserDimensions: state.browserDimensions.browserDimensions
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
      sidebarOpen: props.treeLoaded ? mql.matches : false,
      mobileDisplay: !mql.matches
    };
    analyticsNewPage();
  }
  static propTypes = {
    dispatch: PropTypes.func.isRequired
  }
  componentDidMount() {
    document.addEventListener("dragover", (e) => {e.preventDefault();}, false);
    document.addEventListener("drop", (e) => {
      e.preventDefault();
      return this.props.dispatch(filesDropped(e.dataTransfer.files));
    }, false);
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
    if (this.props.displayNarrative) {
      sidebarWidth = parseInt(0.27 * availableWidth, 10);
    } else {
      sidebarWidth = controlsWidth;
    }
    sidebarWidth += controlsPadding;

    const visibleSidebarWidth = this.state.sidebarOpen ? sidebarWidth : 0;
    if (!this.state.mobileDisplay) {
      availableWidth -= visibleSidebarWidth;
    }

    const mapOn = this.props.panelsToDisplay.indexOf("map") !== -1;

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
          showSpinner={!this.props.treeLoaded || !this.props.metadataLoaded}
          availableWidth={availableWidth}
          availableHeight={availableHeight}
          panels={this.props.panelsToDisplay}
          grid={this.props.panelLayout === "grid"}
          narrative={this.props.displayNarrative}
          frequenciesLoaded={this.props.frequenciesLoaded}
          availableDatasets={this.props.availableDatasets}
        />
        <Overlay
          styles={overlayStyles}
          sidebarOpen={this.state.sidebarOpen}
          mobileDisplay={this.state.mobileDisplay}
          handler={() => {this.setState({sidebarOpen: false});}}
        />
      </span>

    //const sidebarStyles = {
      //...sharedStyles,
      //left: this.state.sidebarOpen ? 0 : -1 * sidebarWidth,
      //backgroundColor: sidebarColor,
      //height: availableHeight,
      //width: sidebarWidth,
      //maxWidth: sidebarWidth,
      //overflow: "scroll",
      //boxShadow: '-3px 0px 3px -3px rgba(0, 0, 0, 0.2) inset'
    //};
        //<SidebarToggle
          //sidebarOpen={this.state.sidebarOpen}
          //mobileDisplay={this.state.mobileDisplay}
          //handler={() => {this.setState({sidebarOpen: !this.state.sidebarOpen});}}
        ///>
        //<Sidebar
          //styles={sidebarStyles}
          //sidebarOpen={this.state.sidebarOpen}
          //mobileDisplay={this.state.mobileDisplay}
          //narrative={this.props.displayNarrative}
          //mapOn={mapOn}
          //toggleHandler={() => {this.setState({sidebarOpen: !this.state.sidebarOpen});}}
        ///>
    );
  }
}

export default App;
