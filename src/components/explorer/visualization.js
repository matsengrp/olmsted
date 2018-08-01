import { connect } from "react-redux";
import React from "react";
import Vega from "react-vega";
import VegaLite from "react-vega-lite";
import * as vl from "vega-lite";
import * as v from "vega";

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

const MyVega = args => {
  if (args.debug) {
    console.log("compiling vega-lite", args.spec)
    try {
      console.log("resulting vega", v.compile(args.spec).spec)
    } catch (e) {
      console.error("couldn't parse vega-lite:", e)
    }
  }
  return <Vega {...args}/>
}

const getNaiveVizData = (v_start, cdr3_start, v_end, d_start, d_end, j_start, cdr3_length, j_end, v_gene, d_gene, j_gene) => {
  let result = {
    values: [
    {
      family: "5p",
      region: "CDR3",
      start: cdr3_start,
      end: cdr3_start + cdr3_length
    },
    {
      family: "5p",
      region: "V gene",
      gene: v_gene,
      start: v_start,
      end: v_end
    },
    {
      family: "5p",
      region: "Insertion 1",
      start: v_end,
      end: d_start
    },
    {
      family: "5p",
      region: "D gene",
      gene: d_gene,
      start: d_start,
      end: d_end
    },
    {
      family: "5p",
      region: "Insertion 2",
      start: d_end,
      end: j_start
    },
    {
      family: "5p",
      region: "J gene",
      gene: j_gene,
      start: j_start,
      end: j_end
    }
  ]} 
  return result 
}
const NaiveSequence = ({v_start, cdr3_start, v_end, d_start, d_end, j_start, cdr3_length, j_end, v_gene, d_gene, j_gene}) => {
      return <MyVegaLite 
              data= {getNaiveVizData(v_start, cdr3_start, v_end, d_start, d_end, j_start, cdr3_length, j_end, v_gene, d_gene, j_gene)}
              onParseError={(...args) => console.error("parse error:", args)}
              debug={/* true for debugging */ false}
              spec={{
                width: 250,
                height: 25,
                layer: [{
                transform: [{
                  filter: {field: "region", oneOf: ["CDR3"]}
                }],
                mark: {type: "bar",color:"yellow", size: 25},
                encoding: {
                  x: {
                    field: "start",
                    type: "quantitative",
                    axis: {title: "", ticks: false, labels: false},
                    scale: {domain: [0,400]}
                  },
                  x2: {
                    field: "end",
                    type: "quantitative",
                    axis: {title: "", ticks: false, labels: false},
                    scale: {domain: [0,400]}
                  },
                  y: {
                    field: "family",
                    type: "nominal",
                    axis: {title: "", ticks: false, labels: false},
                  },
                  tooltip: [
                    {field: "region", type: "nominal"},
                    {field: "start", type: "quantitative"},
                    {field: "end", type: "quantitative"}
                  ]
                }}, 
                {  
                transform: [{
                  filter: {field: "region", oneOf: [
                    "V gene",
                    "Insertion 1",
                    "D gene",
                    "Insertion 2",
                    "J gene"]
                  }
                }],   
                mark: {type: "bar", size: 12},
                encoding: {
                  x: {
                    field: "start",
                    type: "quantitative",
                    axis: {title: "", ticks: false, labels: false},
                    scale: {domain: [0,400]}

                  },
                  x2: {
                    field: "end",
                    type: "quantitative",
                    axis: {title: "", ticks: false, labels: false},
                    scale: {domain: [0,400]}

                  },
                  y: {
                    field: "family",
                    type: "nominal",
                    axis: {title: "", ticks: false, labels: false},
                  },
                  tooltip: [
                    {field: "region", type: "nominal"},
                    {field: "start", type: "quantitative"},
                    {field: "end", type: "quantitative"},
                    {field: "gene", type: "nominal"}
                  ],
                  color: {
                    field: "region",
                    type: "nominal",
                    legend: null,
                    scale: {
                      domain:
                        [ "V gene",
                          "Insertion 1",
                          "D gene",
                          "Insertion 2",
                          "J gene",
                        ],
                      range: ["#db2c0d", "#36db0d", "#000000", "#36db0d", "#2c12ea"],
                      type: "ordinal"
                    }
                    
                }
              }
            }
          ]
          }}/>;
}

@connect((state) => ({
  availableClonalFamilies: state.clonalFamilies.availableClonalFamilies}))
class ClonalFamiliesViz extends React.Component {
  render() {
    return <MyVegaLite data={{values: this.props.availableClonalFamilies}}
      onSignalTooltip={/* doesn"t work yet */ (...args) => console.log("Tooltip:", args)}
      onSignalHover={/* doesn"t work yet */ (...args) => console.log("Hover:", args)}
      onSignalBrush_n_seqs={(...args) => console.log("Brushed n_seqs:", args)}
      onSignalBrush_mean_mut_freq={(...args) => console.log("Brushed mut_freqs:", args)}
      onParseError={(...args) => console.error("parse error:", args)}
      debug={/* true for debugging */ false}
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
class ClonalFamiliesViz2 extends React.Component {
  render() {
    return <VegaLite data={{values: this.props.availableClonalFamilies}}
      onSignalHover={(...args) => console.log(args)}
      onParseError={(...args) => console.error("vega parse error!:", args)}
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

@connect((state) => ({
  selectedFamily: state.clonalFamilies.selectedFamily,
  availableClonalFamilies: state.clonalFamilies.availableClonalFamilies}))
class TreeViz extends React.Component {
  render() {
    console.log("TREE VIZ")
    return <MyVega
      onSignalTooltip={/* doesn"t work yet */ (...args) => console.log("Tooltip:", args)}
      onSignalHover={/* doesn"t work yet */ (...args) => console.log("Hover:", args)}
      onSignalBrush_n_seqs={(...args) => console.log("Brushed n_seqs:", args)}
      onSignalBrush_mean_mut_freq={(...args) => console.log("Brushed mut_freqs:", args)}
      onParseError={(...args) => console.error("parse error:", args)}
      debug={/* true for debugging */ false}
      spec={{
        "height": 2000,
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
          "signals": [{"value": 200,
                       "name": "branchScale",
                       "bind": {"max": 5000, "step": 50, "input": "range", "min": 0}},
                      {"value": 100,
                       "name": "heightScale",
                       "bind": {"max": 300, "step": 5, "input": "range", "min": 0}},
                      {"value": "datum",
                       "name": "cladify",
                       "on": [{"update": "datum", "events": "@ancestor:mousedown, @ancestor:touchstart"}]}], 
          "width": 2000}
      
      
          
          }/>;
      }};

export {ClonalFamiliesViz, ClonalFamiliesViz2, TreeViz, NaiveSequence}
