import { connect } from "react-redux";
import React from "react";
import Vega from 'react-vega';
import VegaLite from 'react-vega-lite';
import * as vl from 'vega-lite';
import * as types from '../../actions/types';
import {createClassFromSpec} from 'react-vega';
import {naiveVegaSpec, clonalFamiliesVizCustomSpec, clonalFamiliesTestSpec} from './vega/vega_specs.js';

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
      }};

@connect((state) => ({
  selectedFamily: state.clonalFamilies.selectedFamily,
  availableClonalFamilies: state.clonalFamilies.availableClonalFamilies}))
class TreeViz extends React.Component {
  render() {
    return <Vega
      onParseError={(...args) => console.error("parse error:", args)}
      debug={/* true for debugging */ false}
      spec={{
        "height": 1000,
        "autosize": {"type": "pad", "resize": true},
        "padding": 5,
        "$schema": "https://vega.github.io/schema/vega/v3.0.json",
        "scales": [{"name": "color", 
                    "range": {"scheme": "magma"},
                    "type": "sequential", 
                    "domain": {"field": "depth", "data": "tree"},
                    "zero": true}],
        "data": [{"name": "tree", 
                  "transform": [{"key": "id", "type": "stratify", "parentKey": "parent"},
                                {"size": [{"signal": "height"}, {"signal": "width - 100"}],
                                "type": "tree",
                                "as": ["y0", "x0", "depth0", "children0"],
                                "method": "cluster"}, 
                                {"size": [{"signal": "height"}, {"signal": "width - 100"}],
                                "type": "tree", 
                                "as": ["y", "x", "depth", "children"], 
                                "method": "cluster"},
                                {"expr": "datum.distance * branchScale", "type": "formula", "as": "x"}, 
                                {"expr": "datum.y0 * (heightScale / 100)", "type": "formula", "as": "y"}],
                  "values": this.props.selectedFamily.asr_tree},
                 {"name": "links",
                  "transform": [{"key": "id", "type": "treelinks"},
                                {"shape": "orthogonal", "type": "linkpath", "orient": "horizontal"}],
                  "source": "tree"},
                 {"name": "nodes", "transform": [{"expr": "datum.type == 'node'", "type": "filter"}],
                   "source": "tree"},
                 {"name": "leaves", "transform": [{"expr": "datum.type == 'leaf'", "type": "filter"}], "source": "tree"}],
          "marks": [{"encode": {"update": {"path": {"field": "path"},
                                                    "strokeWidth": {"value": 3},
                                                    "stroke": {"value": "#ccc"}}},
                                "type": "path",
                                "from": {"data": "links"}},
                    {"name": "ancestor",
                     "encode": {"update": {"y": {"field": "y"},"fill": {"value": "#000"}, "x": {"field": "x"}},
                                "enter": {"size": {"value": 100}, "stroke": {"value": "#000"}}},
                     "type": "symbol",
                     "from": {"data": "nodes"}},
                    {"encode": {"update": {"y": {"field": "y"},
                                           "dx": {"value": 2},
                                           "dy": {"value": 3}, 
                                           "x": {"field": "x"}}, 
                                "enter": {"text": {"field": "label"},
                                          "fill": {"value": "#000"}}},
                     "type": "text",
                     "from": {"data": "leaves"}}],
          "signals": [{"value": 5000,
                       "name": "branchScale",
                       "bind": {"max": 5000, "step": 50, "input": "range", "min": 0}},
                      {"value": 70,
                       "name": "heightScale",
                       "bind": {"max": 300, "step": 5, "input": "range", "min": 70}},
                      {"value": "datum",
                       "name": "cladify",
                       "on": [{"update": "datum", "events": "@ancestor:mousedown, @ancestor:touchstart"}]}], 
          "width": 2000}
          }/>;
      }};

export {ClonalFamiliesViz, ClonalFamiliesVizCustom, TreeViz, NaiveSequence}
