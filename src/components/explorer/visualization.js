import { connect } from "react-redux";
import React from "react";
import Vega from 'react-vega';
import VegaLite from 'react-vega-lite';
import * as vl from 'vega-lite';
import * as types from '../../actions/types';
import {createClassFromSpec} from 'react-vega';
import {naiveVegaSpec, clonalFamiliesVizCustomSpec, concatTreeWithAlignmentSpec} from './vega/vega_specs.js';
import getSelectedFamilySelector from "../../selectors/selectedFamily";
import * as _ from "lodash";

const MyVegaLite = args => {
  if (args.debug) {
    console.log("compiling vega-lite", args.spec)
    try {
      console.log("resulting vega", vl.compile(args.spec).spec)
    } catch (e) {
      console.error("couldn't parse vega-lite:", e)
    }
  }
  return <VegaLite {...args}/>
}

const getNaiveVizData = (datum) => {
  let result = {
    source: [
    {
      family: "5p",
      region: "CDR3",
      start: datum.cdr3_start,
      end: datum.cdr3_start + datum.cdr3_length
    },
    {
      family: "5p",
      region: "V gene",
      gene: datum.v_gene,
      start: datum.v_start,
      end: datum.v_end
    },
    {
      family: "5p",
      region: "Insertion 1",
      start: datum.v_end,
      end: datum.d_start
    },
    {
      family: "5p",
      region: "D gene",
      gene: datum.d_gene,
      start: datum.d_start,
      end: datum.d_end
    },
    {
      family: "5p",
      region: "Insertion 2",
      start: datum.d_end,
      end: datum.j_start
    },
    {
      family: "5p",
      region: "J gene",
      gene: datum.j_gene,
      start: datum.j_start,
      end: datum.j_end
    }
  ]} 
  return result 
}

const NaiveViz = createClassFromSpec(naiveVegaSpec)

const NaiveSequence = ({datum}) => {
      return <NaiveViz data = {getNaiveVizData(datum)} />;
}

@connect((state) => ({
  availableClonalFamilies: state.clonalFamilies.availableClonalFamilies}))
class ClonalFamiliesViz extends React.Component {
  constructor(props) {
    super(props);
    // This binding is necessary to make `this` work in the callback
    this.updateBrushSelection = this.updateBrushSelection.bind(this);
  }

  updateBrushSelection(args){
    this.props.dispatch({type: types.UPDATE_BRUSH_SELECTION, updatedBrushData: args});
  }
  

  render() {
    return <MyVegaLite data={{values: this.props.availableClonalFamilies}}
      onSignalTooltip={/* doesn't work yet */ (...args) => console.log("Tooltip:", args)}
      onSignalHover={/* doesn't work yet */ (...args) => console.log("Hover:", args)}
      onSignalBrush_n_seqs={(...args) => {
        this.updateBrushSelection(args)
      }}
      onSignalBrush_mean_mut_freq={(...args) => {
        this.updateBrushSelection(args)
      }}
      onParseError={(...args) => console.error("parse error:", args)}
      debug={/* true for debugging */ true}
      spec={{
          width: 900,
          height: 700,
          mark: "point",
          selection: {brush: {type: "interval"}},
          encoding: {
            x: {field: "n_seqs", type: "quantitative"},
            y: {field: "mean_mut_freq", type: "quantitative"},
            color: {field: "subject.id", type: "nominal"},
            shape: {field: "sample.timepoint", type: "nominal"},
            opacity: {value: 0.35},
            }}}/>;
      }};

@connect((state) => ({
  availableClonalFamilies: state.clonalFamilies.availableClonalFamilies}))
class ClonalFamiliesVizCustom extends React.Component {
  constructor(props) {
    super(props);
    // This binding is necessary to make `this` work in the callback
    this.updateBrushSelection = this.updateBrushSelection.bind(this);
    this.xField = "n_seqs";
    this.yField = "mean_mut_freq";
  }

  updateBrushSelection(dim, attr, data){
    let updateBrushData = [dim, attr, data]
    this.props.dispatch({type: types.UPDATE_BRUSH_SELECTION, updatedBrushData: updateBrushData});
  }
  
  render() {
    return <Vega
      onSignalXField={(...args) => {
        let result = args.slice(1)[0]
        this.xField = result
      }}
      onSignalYField={(...args) => {
        let result = args.slice(1)[0]
        this.yField = result
      }}
      onSignalBrush_n_seqs={(...args) => {
        let result = args.slice(1)[0]
        this.updateBrushSelection("x", this.xField, result)
      }}
      onSignalBrush_mean_mut_freq={(...args) => {
        let result = args.slice(1)[0]
        this.updateBrushSelection("y", this.yField, result)
      }}
      onParseError={(...args) => console.error("parse error:", args)}
      debug={/* true for debugging */ true}
      spec={clonalFamiliesVizCustomSpec(this.props.availableClonalFamilies)}/>;
  }
};
    
const makeMapStateToProps = () => {
  const getSelectedFamily = getSelectedFamilySelector()
  const mapStateToProps = (state) => {
    let newSelectedFamily = getSelectedFamily(state.clonalFamilies)
    return Object.assign({}, state.clonalFamilies, {
      selectedFamily: newSelectedFamily
    })
  }
  return mapStateToProps
}

@connect(makeMapStateToProps)
class TreeViz extends React.Component {
  constructor(props) {
    super(props);
    // This binding is necessary to make `this` work in the callback
    this.updateSelectedSeq = this.updateSelectedSeq.bind(this);
    this.furthestNode = Math.floor(200/_.maxBy(this.props.selectedFamily["asr_tree"], "distance").distance)
  }

  updateSelectedSeq(seq){
    this.props.dispatch({type: types.UPDATE_SELECTED_SEQ, seq: seq});
  }

  render() {
       return <Vega
        onParseError={(...args) => console.error("parse error:", args)}
        onSignalPts_tuple={(...args) => {
          let node = args.slice(1)[0]
          this.updateSelectedSeq(node)
        }}
        debug={/* true for debugging */ false}
        // spec={treeSpec(this.props.selectedFamily.asr_tree)}
        spec={concatTreeWithAlignmentSpec(this.props.selectedFamily, this.furthestNode)}
        />;
        }};

export {ClonalFamiliesViz, ClonalFamiliesVizCustom, TreeViz, NaiveSequence}
