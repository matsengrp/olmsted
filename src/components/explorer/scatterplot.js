import { connect } from "react-redux";
import React from "react";
import Vega from 'react-vega';
import * as clonalFamiliesSelectors from "../../selectors/clonalFamilies";
import facetClonalFamiliesVizSpec from './vega/facet_scatter_plot';
import * as explorerActions from "../../actions/explorer.js"
import * as _ from "lodash";

// Clonal Families Viz
// ===================
//
// This is the main view in the entire vizualization as it's the first thing we always see once we explore,
// and it's the top level entry point for us in exploring datasets/clonal-families in gerater detail.
// Goal is to be super configurable and powerful.

@connect((state) => ({
    availableClonalFamilies: clonalFamiliesSelectors.getAvailableClonalFamilies(state),
    selectedFamily: clonalFamiliesSelectors.getSelectedFamily(state),
    locus: state.clonalFamilies.locus
  }),
  //This is a shorthand way of specifying mapDispatchToProps
  {
    selectFamily: explorerActions.selectFamily,
    updateBrushSelection: explorerActions.updateBrushSelection,
    filterBrushSelection: explorerActions.filterBrushSelection,
    updateSelectingStatus: explorerActions.updateSelectingStatus,
    updateFacet: explorerActions.updateFacet
  })
class ClonalFamiliesViz extends React.Component {
  constructor(props) {
    super(props);
    this.xField = "n_seqs";
    this.yField = "mean_mut_freq";
    this.facetOptions = ["none", "has_seed", "sample.timepoint", "dataset.id", "subject.id", "v_gene", "d_gene", "j_gene", "sample.locus"]
    this.spec = facetClonalFamiliesVizSpec()
  }

  render() {
    if (this.props.availableClonalFamilies) {
      return  <div>
          {/* Here we have our Vega component specification, where we plug in signal handlers, etc. */}
          {this.props.availableClonalFamilies.length > 0 && <Vega
          // TURN THESE ON TO DEBUG SIGNALS
          // SEE https://github.com/matsengrp/olmsted/issues/65
          // onSignalWidth={(...args) => {
          //   let result = args.slice(1)[0]
          //   console.log("width", result)
          // }}
          // onSignalHeight={(...args) => {
          //   let result = args.slice(1)[0]
          //   console.log("height", result)
          // }}
          // onSignalBrush_x={(...args) => {
          //   let result = args.slice(1)[0]
          //   console.log('brushx: ', result)
          // }}
          // onSignalBrush_y={(...args) => {
          //   let result = args.slice(1)[0]
          //   console.log('brushy: ', result)  
          // }}
          onSignalPts_tuple={(...args) => {
            let family = args.slice(1)[0]
            if(family.ident){
              // Second argument specifies that we would like to 
              // include just this family in our brush selection
              // and therefore in the table since we have clicked it

              this.props.selectFamily(family.ident, true)
            }
          }}
          onSignalMouseDown={(...args) => {
            let coords = args.slice(1)[0]
            // Must check to see if there are actual mouse coordinates
            // here and in the mouseup signal handler just below because
            // they are triggered with undefined upon rendering the viz
            if(coords){
              this.props.updateSelectingStatus()
              this.mouseDown = true
            }
          }}
          onSignalMouseUp={(...args) => {
            let coords = args.slice(1)[0]
            if(this.mouseDown && coords){
              this.props.updateSelectingStatus()
            }
            this.mouseDown = false
          }}
          onSignalXField={(...args) => {
            let result = args.slice(1)[0]
            this.xField = result
          }}
          onSignalYField={(...args) => {
            let result = args.slice(1)[0]
            this.yField = result
          }}
          onSignalFacet_by_signal={(...args) => {
            let result = args.slice(1)[0]
            this.props.updateFacet(result)          
          }}
          onSignalBrush_x_field={(...args) => {
            let result = args.slice(1)[0]
            this.props.updateBrushSelection("x", this.xField, result)
          }}
          onSignalBrush_y_field={(...args) => {
            let result = args.slice(1)[0]
            this.props.updateBrushSelection("y", this.yField, result)
          }}
          onSignalBrushed_facet_value={(...args) => {
            let keyVal = args.slice(1)[0]
            if(keyVal){
              this.props.filterBrushSelection(keyVal[0], keyVal[1])
            }
          }}
          onParseError={(...args) => console.error("parse error:", args)}
          debug={/* true for debugging */ true}
          // logLevel={vega.Debug} // https://vega.github.io/vega/docs/api/view/#view_logLevel
          data={{source: this.props.availableClonalFamilies,
                // Here we create a separate dataset only containing the id of the
                // selected family so as to check quickly for this id within the 
                // viz to highlight the selected family.
                selected: [{'ident': this.props.selectedFamily ? this.props.selectFamily.ident : "none"}],
                locus: [{'locus': this.props.locus}] }}
          spec={this.spec}/>}
      </div>
    } else {
      return <h3>Loading data...</h3>
    }
  }
};

export {ClonalFamiliesViz}
