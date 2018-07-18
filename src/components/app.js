import React from "react";
import PropTypes from 'prop-types';
import VegaLite from 'react-vega-lite';
import Vega from 'react-vega';
import { connect } from "react-redux";
import { loadJSONs } from "../actions/loadData";
import { controlsHiddenWidth, controlsWidth, controlsPadding } from "../util/globals";
import { filterDatasets } from "../reducers/datasets"
import * as _ from 'lodash';
import * as types from "../actions/types";


/* <Contents> contains the header, tree, map, footer components etc.
 * here is where the panel sizes are decided, as well as which components are displayed.
 */

const tableStyle = {fontSize: '15px'};

const Table = ({pageUp, pageDown, toggleSort, data, mappings, pagination}) => {
  console.log("pagination:", pagination);
  var d = _.drop(data, pagination.page * pagination.per_page)
  return (<table style={tableStyle}>
            <tbody>
              <tr>
                <th><a onClick={pageUp}>page up</a></th>
                <th><a onClick={pageDown}>page down</a></th>
              </tr>
              <tr>
                { _.map(mappings, ([name, attribute]) =>
                  <th key={name} onClick={toggleSort.bind(this, attribute)}>{name}</th>) }
              </tr>
              {_.take(    
                _.drop(
                  _.orderBy(data,[pagination.order_by], [pagination.desc ? "desc":"asc"]),
                  pagination.page * pagination.per_page
                ),
                pagination.per_page
                ).map((datum) =>
                <tr key={datum.ident}>
                  { _.map(mappings, ([__, attr]) =>
                    <td key={attr}>{datum[attr]}</td>) }
                </tr>
              )}
            </tbody>
          </table>)}


@connect((state) => ({
  pagination: state.clonalFamilies.pagination,
  availableClonalFamilies: state.clonalFamilies.availableClonalFamilies}))
class ClonalFamiliesTable extends React.Component {
  constructor(props) {
    super(props);

    // This binding is necessary to make `this` work in the callback
    this.pageUp = this.pageUp.bind(this);
    this.pageDown = this.pageDown.bind(this);
    this.toggleSort = this.toggleSort.bind(this);
  }

  pageDown(){
    this.props.dispatch({type: types.PAGE_DOWN});
  }

  pageUp(){
    this.props.dispatch({type: types.PAGE_UP});
  }

  toggleSort(attribute){
    this.props.dispatch({type: types.TOGGLE_SORT, column: attribute})
  }

  render() {
    return (  
      <Table data={this.props.availableClonalFamilies}
        mappings={
          [["ID", "id"],
           ["N seqs", "n_seqs"],
           ["V gene", "v_gene"],
           ["D gene", "d_gene"],
           ["J gene", "j_gene"],
           //["seed run", "has_seed"],
          ]}
        pagination = {this.props.pagination}
        pageUp = {this.pageUp}
        pageDown = {this.pageDown}
        toggleSort = {this.toggleSort}/>
    )
  }       
}


@connect((state) => ({
  availableClonalFamilies: state.clonalFamilies.availableClonalFamilies}))
class ClonalFamiliesViz extends React.Component {
  render() {
    return <VegaLite data={{values: this.props.availableClonalFamilies}}
      onSignalHover={(...args) => console.log(args)}
      onParseError={(...args) => console.log("error!:", args)}
      spec={{
          width: 900,
          height: 700,
          mark: "point",
          transform: [{
            bin: true,
            field: "subject.id",
            as: "subject_id" 
          }],
          selection: {
            picked: {
              type: "single", 
              fields:["subject_id"],
              bind: {input: "select", options: ["QA255", "MG505"]},
              resolve: "global",
              empty: "all"
            }
          },
          encoding: {
            x: {field: "n_seqs", type: "quantitative"},
            y: {field: "mean_mut_freq", type: "quantitative"},
            color: {
              condition: {
                selection: "picked", 
                type: "nominal",
                value: "black"
              },
              field: "subject.id",
              type: "nominal"
            },
            shape: {field: "sample.timepoint", type: "nominal"},
            opacity: {value: 0.35},
          }
          
          }}/>;
      }};


const Contents = ({styles, grid, availableDatasets}) => {
  //if (showSpinner) {
  //}
  /* TODO */
  const chosenDatasets = filterDatasets(availableDatasets).map((dataset) =>
    <li key={dataset}>{dataset}</li>
  );

  const divStyle = {
    fontSize: 20,
  }; 
  return (
    <div style={{margin: 50}}>
      <h2>Chosen datasets</h2>
      <ul>{chosenDatasets}</ul>
      <h2>Viz</h2>
      <ClonalFamiliesViz/>
      <h2>Table</h2>
      <ClonalFamiliesTable/>
      <h2>Clonal Family details</h2>
      <p>TODO: Select clonal families from table and show tree, ancestral reconstructions etc here</p>
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
