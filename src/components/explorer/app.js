import React from "react";
import { connect } from "react-redux";
import { hot } from 'react-hot-loader';
import ClonalFamiliesTable from "./table";
import LoadingTable from './loadingTable';
import * as clonalFamiliesSelectors from "../../selectors/clonalFamilies";
import * as explorerActions from "../../actions/explorer";
import {TreeViz} from "./tree";
import {ClonalFamiliesViz} from "./scatterplot";
import {Lineage} from "./lineage";
import {CollapseHelpTitle} from "../util/collapseHelpTitle";

// STYLES
const PADDING_FRACTION = 0.03;

// Compute how much padding the page should have.
// Use above percentage of available width for padding on either side
const usableWidthStyle = (availableWidth) => {
  return {
    width: availableWidth*(1-2*PADDING_FRACTION),
    paddingLeft: availableWidth*PADDING_FRACTION,
    paddingRight: availableWidth*PADDING_FRACTION,
    paddingTop: 40,
    paddingBottom: 20
  };
};

const tableStyle = {marginBottom: 20, overflow: 'auto'};

const sectionStyle = {paddingBottom: 10, marginBottom: 40, overflow: 'auto'};

const mapStateToProps = (state) => {
  const selectedFamily = clonalFamiliesSelectors.getSelectedFamily(state);
  const nClonalFamiliesBrushed = clonalFamiliesSelectors.getBrushedClonalFamilies(state).length;
  return {selectedFamily, nClonalFamiliesBrushed};
};

@connect(mapStateToProps)
class SelectedFamiliesSummary extends React.Component {
  render() {
    return (
      <p>
        Number of families currently selected:
        {this.props.nClonalFamiliesBrushed}
      </p>
    );
  }
}

const Overlay = ({styles, mobileDisplay, handler}) => {
  return (
    mobileDisplay
      ? <div style={styles} onClick={handler} onTouchStart={handler}/>
      : <div/>
  );
};

@connect((state) => ({
  browserDimensions: state.browserDimensions.browserDimensions,
  availableDatasets: state.datasets.availableDatasets,
  selectedFamily: clonalFamiliesSelectors.getSelectedFamily(state),
  selectedSeq: state.clonalFamilies.selectedSeq,
  locus: state.clonalFamilies.locus
}), {
  filterLocus: explorerActions.filterLocus,
  resetState: explorerActions.resetState
})
class App extends React.Component {
  constructor(props) {
    super(props);
    // For resize media query listener see this link (helps resize for mobile etc):
    // https://github.com/nextstrain/auspice/blob/master/src/components/app.js#L112-L122
  }

  // static propTypes = {
  //   dispatch: PropTypes.func.isRequired
  // }
  componentDidMount() {
    document.addEventListener("dragover", (e) => {e.preventDefault();}, false);

  }

  // componentDidUpdate(prevProps) {
  //   if (prevProps.datapath !== this.props.datapath) {
  //     console.log("LOAD JSON")
  //     this.props.dispatch(loadJSONs());
  //   }
  // }
  render() {
    /* D I M E N S I O N S */
    const availableWidth = this.props.browserDimensions.width;
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
      left: 0,
      opacity: 0,
      visibility: "hidden",
      zIndex: 8000,
      backgroundColor: "rgba(0,0,0,0.5)",
      cursor: "pointer",
      overflow: "scroll",
      transition: 'left 0.3s ease-out, opacity 0.3s ease-out, visibility 0s ease-out 0.3s'
    };

    return (
      <span>
        {/* <DownloadModal/> */}
        {/* App Contents - TODO: break this into smaller components like SelectedFamiliesSummary */}
        <div>
          <div style={usableWidthStyle(availableWidth)}>
            <div style={sectionStyle}>
              <h2>Datasets</h2>
              <p>You have the following datasets loaded:</p>
              <LoadingTable datasets={this.props.availableDatasets}/>
            </div>
            <div style={sectionStyle}>
              <h2 />
              <CollapseHelpTitle
                titleText="Clonal Families"
                helpText={(
                  <div>
                    The Clonal Families section represents each clonal family as a point in
                    a scatterplot. Choose an immunoglobulin locus to restrict the clonal
                    families in the scatterplot to that locus - the default is immunoglobulin gamma,
                    or igh (where h stands for heavy chain). In order to visualize all clonal families from all
                    loci in the dataset at once, choose "ALL" in the locus selector. By default, the scatterplot maps the number
                    of unique members in a clonal family, unique_seqs_count, to the x-axis, and the average
                    mutation frequency among members of that clonal family, mean_mut_freq, to the y-axis.
                    However, you may configure both axes as well as the color and shape of the points to map
                    to a range of fields, including sequence sampling time (sample.timepoint_id).
                    See
                    <a href="http://www.olmstedviz.org/schema.html">the schema</a>
                    {' '}
                    for field descriptions.
                    <br/>
                    <br/>
                    For comparison of subsets, you may facet the plot into separated panels according to data values
                    for a range of fields. Interact with the plot by clicking and dragging across a subset of points
                    or clicking individual points to filter the resulting clonal families in the Selected clonal families table below.
                  </div>
)}
              />
              <p>Choose a gene locus to explore clonal families with sequences sampled from that locus.</p>
              <select value={this.props.locus}
                onChange={(event) => {
                  this.props.resetState();
                  this.props.filterLocus(event.target.value);
                }}
              >
                {['igh', 'igk', 'igl', 'ALL'].map((locus) => <option key={locus} value={locus}>{locus}</option>)}
              </select>
              <SelectedFamiliesSummary/>
              <ClonalFamiliesViz/>
            </div>

            <div style={{paddingBottom: 40, ...sectionStyle}}>
              <CollapseHelpTitle
                titleText="Selected clonal families"
                helpText={`Below the scatterplot, the full collection or selected subset of clonal families
                 appears in a table including a visualization of the recombination event resulting in the naive
                 antibody sequence and a subset of clonal family metadata. Each row in the table represents one clonal
                 family. The table automatically selects the top clonal family according to the sorting column. Click on
                 the checkbox in the "Select" column in the table to select a clonal family for further visualization.
                 Upon selecting a clonal family from the table, the phylogenetic tree(s) corresponding to that clonal family
                 (as specified in the input JSON) is visualized below the table in the Clonal family details section.`}
              />
              <div style={tableStyle}>
                <ClonalFamiliesTable/>
              </div>
            </div>
            { this.props.selectedFamily
                && (
                <div style={sectionStyle}>
                  <TreeViz availableHeight={availableHeight}/>
                </div>
                ) }
            {!_.isEmpty(this.props.selectedSeq)
                && (
                <div style={sectionStyle}>
                  <Lineage/>
                </div>
                )}
          </div>
        </div>
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
