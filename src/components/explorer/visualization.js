import { connect } from "react-redux";
import React from "react";
import Vega from 'react-vega';
import VegaLite from 'react-vega-lite';
import * as vl from 'vega-lite';
import * as types from '../../actions/types';
import {createClassFromSpec} from 'react-vega';
import naiveVegaSpec from './vega/vega_specs.js';

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


// signals: [{"value": "n_seqs",
// "name": "x",
// "bind": {"input": "select", "options": ["n_seqs"]}}],

@connect((state) => ({
  availableClonalFamilies: state.clonalFamilies.availableClonalFamilies}))
class ClonalFamiliesVizCustom extends React.Component {
  render() {
    return <Vega data={{values: this.props.availableClonalFamilies}}
      onParseError={(...args) => console.error("parse error:", args)}
      debug={/* true for debugging */ true}
      spec={{
        
        
          "$schema": "https://vega.github.io/schema/vega/v3.json",
          "autosize": "pad",
          "padding": 5,
          "width": 900,
          "height": 700,
          "style": "cell",
          "data": [
            {
              "name": "brush_store"
            },
            {
              "name": "source"
            },
            {
              "name": "data_0",
              "source": "source",
              "transform": [
                {
                  "type": "formula",
                  "expr": "toNumber(datum[\"n_seqs\"])",
                  "as": "n_seqs"
                },
                {
                  "type": "formula",
                  "expr": "toNumber(datum[\"mean_mut_freq\"])",
                  "as": "mean_mut_freq"
                },
                {
                  "type": "formula",
                  "expr": "datum[\"subject\"] && datum[\"subject\"][\"id\"]",
                  "as": "subject.id"
                },
                {
                  "type": "formula",
                  "expr": "datum[\"sample\"] && datum[\"sample\"][\"timepoint\"]",
                  "as": "sample.timepoint"
                },
                {
                  "type": "filter",
                  "expr": "datum[\"n_seqs\"] !== null && !isNaN(datum[\"n_seqs\"]) && datum[\"mean_mut_freq\"] !== null && !isNaN(datum[\"mean_mut_freq\"])"
                }
              ],
              "values":this.props.availableClonalFamilies

            }
          ],
          "signals": [
            {
              "name": "unit",
              "value": {},
              "on": [
                {
                  "events": "mousemove",
                  "update": "isTuple(group()) ? group() : unit"
                }
              ]
            },
            {
              "name": "brush_x",
              "value": [],
              "on": [
                {
                  "events": {
                    "source": "scope",
                    "type": "mousedown",
                    "filter": [
                      "!event.item || event.item.mark.name !== \"brush_brush\""
                    ]
                  },
                  "update": "[x(unit), x(unit)]"
                },
                {
                  "events": {
                    "source": "window",
                    "type": "mousemove",
                    "consume": true,
                    "between": [
                      {
                        "source": "scope",
                        "type": "mousedown",
                        "filter": [
                          "!event.item || event.item.mark.name !== \"brush_brush\""
                        ]
                      },
                      {
                        "source": "window",
                        "type": "mouseup"
                      }
                    ]
                  },
                  "update": "[brush_x[0], clamp(x(unit), 0, width)]"
                },
                {
                  "events": {
                    "signal": "brush_scale_trigger"
                  },
                  "update": "[scale(\"x\", brush_n_seqs[0]), scale(\"x\", brush_n_seqs[1])]"
                },
                {
                  "events": {
                    "signal": "brush_translate_delta"
                  },
                  "update": "clampRange(panLinear(brush_translate_anchor.extent_x, brush_translate_delta.x / span(brush_translate_anchor.extent_x)), 0, width)"
                },
                {
                  "events": {
                    "signal": "brush_zoom_delta"
                  },
                  "update": "clampRange(zoomLinear(brush_x, brush_zoom_anchor.x, brush_zoom_delta), 0, width)"
                }
              ]
            },
            {
              "name": "brush_n_seqs",
              "on": [
                {
                  "events": {
                    "signal": "brush_x"
                  },
                  "update": "brush_x[0] === brush_x[1] ? null : invert(\"x\", brush_x)"
                }
              ]
            },
            {
              "name": "brush_y",
              "value": [],
              "on": [
                {
                  "events": {
                    "source": "scope",
                    "type": "mousedown",
                    "filter": [
                      "!event.item || event.item.mark.name !== \"brush_brush\""
                    ]
                  },
                  "update": "[y(unit), y(unit)]"
                },
                {
                  "events": {
                    "source": "window",
                    "type": "mousemove",
                    "consume": true,
                    "between": [
                      {
                        "source": "scope",
                        "type": "mousedown",
                        "filter": [
                          "!event.item || event.item.mark.name !== \"brush_brush\""
                        ]
                      },
                      {
                        "source": "window",
                        "type": "mouseup"
                      }
                    ]
                  },
                  "update": "[brush_y[0], clamp(y(unit), 0, height)]"
                },
                {
                  "events": {
                    "signal": "brush_scale_trigger"
                  },
                  "update": "[scale(\"y\", brush_mean_mut_freq[0]), scale(\"y\", brush_mean_mut_freq[1])]"
                },
                {
                  "events": {
                    "signal": "brush_translate_delta"
                  },
                  "update": "clampRange(panLinear(brush_translate_anchor.extent_y, brush_translate_delta.y / span(brush_translate_anchor.extent_y)), 0, height)"
                },
                {
                  "events": {
                    "signal": "brush_zoom_delta"
                  },
                  "update": "clampRange(zoomLinear(brush_y, brush_zoom_anchor.y, brush_zoom_delta), 0, height)"
                }
              ]
            },
            {
              "name": "brush_mean_mut_freq",
              "on": [
                {
                  "events": {
                    "signal": "brush_y"
                  },
                  "update": "brush_y[0] === brush_y[1] ? null : invert(\"y\", brush_y)"
                }
              ]
            },
            {
              "name": "brush_scale_trigger",
              "update": "(!isArray(brush_n_seqs) || (+invert(\"x\", brush_x)[0] === +brush_n_seqs[0] && +invert(\"x\", brush_x)[1] === +brush_n_seqs[1])) && (!isArray(brush_mean_mut_freq) || (+invert(\"y\", brush_y)[0] === +brush_mean_mut_freq[0] && +invert(\"y\", brush_y)[1] === +brush_mean_mut_freq[1])) ? brush_scale_trigger : {}"
            },
            {
              "name": "brush_tuple",
              "on": [
                {
                  "events": [
                    {
                      "signal": "brush_n_seqs"
                    },
                    {
                      "signal": "brush_mean_mut_freq"
                    }
                  ],
                  "update": "brush_n_seqs && brush_mean_mut_freq ? {unit: \"\", intervals: [{encoding: \"x\", field: \"n_seqs\", extent: brush_n_seqs}, {encoding: \"y\", field: \"mean_mut_freq\", extent: brush_mean_mut_freq}]} : null"
                }
              ]
            },
            {
              "name": "brush_translate_anchor",
              "value": {},
              "on": [
                {
                  "events": [
                    {
                      "source": "scope",
                      "type": "mousedown",
                      "markname": "brush_brush"
                    }
                  ],
                  "update": "{x: x(unit), y: y(unit), extent_x: slice(brush_x), extent_y: slice(brush_y)}"
                }
              ]
            },
            {
              "name": "brush_translate_delta",
              "value": {},
              "on": [
                {
                  "events": [
                    {
                      "source": "window",
                      "type": "mousemove",
                      "consume": true,
                      "between": [
                        {
                          "source": "scope",
                          "type": "mousedown",
                          "markname": "brush_brush"
                        },
                        {
                          "source": "window",
                          "type": "mouseup"
                        }
                      ]
                    }
                  ],
                  "update": "{x: brush_translate_anchor.x - x(unit), y: brush_translate_anchor.y - y(unit)}"
                }
              ]
            },
            {
              "name": "brush_zoom_anchor",
              "on": [
                {
                  "events": [
                    {
                      "source": "scope",
                      "type": "wheel",
                      "consume": true,
                      "markname": "brush_brush"
                    }
                  ],
                  "update": "{x: x(unit), y: y(unit)}"
                }
              ]
            },
            {
              "name": "brush_zoom_delta",
              "on": [
                {
                  "events": [
                    {
                      "source": "scope",
                      "type": "wheel",
                      "consume": true,
                      "markname": "brush_brush"
                    }
                  ],
                  "force": true,
                  "update": "pow(1.001, event.deltaY * pow(16, event.deltaMode))"
                }
              ]
            },
            {
              "name": "brush_modify",
              "on": [
                {
                  "events": {
                    "signal": "brush_tuple"
                  },
                  "update": "modify(\"brush_store\", brush_tuple, true)"
                }
              ]
            },
            {"value": "n_seqs",
              "name": "x",
            //  "scale": {"name": "x", "invert": true},
              "bind": {"input": "select", "options": ["n_seqs", "cdr3_length"]}}
          ],
          "marks": [
            {
              "name": "brush_brush_bg",
              "type": "rect",
              "clip": true,
              "encode": {
                "enter": {
                  "fill": {
                    "value": "#333"
                  },
                  "fillOpacity": {
                    "value": 0.125
                  }
                },
                "update": {
                  "x": [
                    {
                      "test": "data(\"brush_store\").length && data(\"brush_store\")[0].unit === \"\"",
                      "signal": "brush_x[0]"
                    },
                    {
                      "value": 0
                    }
                  ],
                  "y": [
                    {
                      "test": "data(\"brush_store\").length && data(\"brush_store\")[0].unit === \"\"",
                      "signal": "brush_y[0]"
                    },
                    {
                      "value": 0
                    }
                  ],
                  "x2": [
                    {
                      "test": "data(\"brush_store\").length && data(\"brush_store\")[0].unit === \"\"",
                      "signal": "brush_x[1]"
                    },
                    {
                      "value": 0
                    }
                  ],
                  "y2": [
                    {
                      "test": "data(\"brush_store\").length && data(\"brush_store\")[0].unit === \"\"",
                      "signal": "brush_y[1]"
                    },
                    {
                      "value": 0
                    }
                  ]
                }
              }
            },
            {
              "name": "marks",
              "type": "symbol",
              "style": [
                "point"
              ],
              "from": {
                "data": "data_0"
              },
              "encode": {
                "update": {
                  "opacity": {
                    "value": 0.35
                  },
                  "fill": {
                    "value": "transparent"
                  },
                  "stroke": {
                    "scale": "color",
                    "field": "subject\\.id"
                  },
                  "x": {
                    "scale": "x",
                    "field": "n_seqs"
                  },
                  "y": {
                    "scale": "y",
                    "field": "mean_mut_freq"
                  },
                  "shape": {
                    "scale": "shape",
                    "field": "sample\\.timepoint"
                  }
                }
              }
            },
            {
              "name": "brush_brush",
              "type": "rect",
              "clip": true,
              "encode": {
                "enter": {
                  "fill": {
                    "value": "transparent"
                  }
                },
                "update": {
                  "x": [
                    {
                      "test": "data(\"brush_store\").length && data(\"brush_store\")[0].unit === \"\"",
                      "signal": "brush_x[0]"
                    },
                    {
                      "value": 0
                    }
                  ],
                  "y": [
                    {
                      "test": "data(\"brush_store\").length && data(\"brush_store\")[0].unit === \"\"",
                      "signal": "brush_y[0]"
                    },
                    {
                      "value": 0
                    }
                  ],
                  "x2": [
                    {
                      "test": "data(\"brush_store\").length && data(\"brush_store\")[0].unit === \"\"",
                      "signal": "brush_x[1]"
                    },
                    {
                      "value": 0
                    }
                  ],
                  "y2": [
                    {
                      "test": "data(\"brush_store\").length && data(\"brush_store\")[0].unit === \"\"",
                      "signal": "brush_y[1]"
                    },
                    {
                      "value": 0
                    }
                  ],
                  "stroke": [
                    {
                      "test": "brush_x[0] !== brush_x[1] && brush_y[0] !== brush_y[1]",
                      "value": "white"
                    },
                    {
                      "value": null
                    }
                  ]
                }
              }
            }
          ],
          "scales": [
            {
              "name": "x",
              "type": "linear",
              "domain": {
                "data": "data_0",
                "field": "n_seqs"
              },
              "range": [
                0,
                {
                  "signal": "width"
                }
              ],
              "nice": true,
              "zero": true
            },
            {
              "name": "y",
              "type": "linear",
              "domain": {
                "data": "data_0",
                "field": "mean_mut_freq"
              },
              "range": [
                {
                  "signal": "height"
                },
                0
              ],
              "nice": true,
              "zero": true
            },
            {
              "name": "color",
              "type": "ordinal",
              "domain": {
                "data": "data_0",
                "field": "subject\\.id",
                "sort": true
              },
              "range": "category"
            },
            {
              "name": "shape",
              "type": "ordinal",
              "domain": {
                "data": "data_0",
                "field": "sample\\.timepoint",
                "sort": true
              },
              "range": "symbol"
            }
          ],
          "axes": [
            {
              "scale": "x",
              "orient": "bottom",
              "grid": false,
              "title": "n_seqs",
              "labelFlush": true,
              "labelOverlap": true,
              "tickCount": {
                "signal": "ceil(width/40)"
              },
              "zindex": 1
            },
            {
              "scale": "x",
              "orient": "bottom",
              "grid": true,
              "tickCount": {
                "signal": "ceil(width/40)"
              },
              "gridScale": "y",
              "domain": false,
              "labels": false,
              "maxExtent": 0,
              "minExtent": 0,
              "ticks": false,
              "zindex": 0
            },
            {
              "scale": "y",
              "orient": "left",
              "grid": false,
              "title": "mean_mut_freq",
              "labelOverlap": true,
              "tickCount": {
                "signal": "ceil(height/40)"
              },
              "zindex": 1
            },
            {
              "scale": "y",
              "orient": "left",
              "grid": true,
              "tickCount": {
                "signal": "ceil(height/40)"
              },
              "gridScale": "x",
              "domain": false,
              "labels": false,
              "maxExtent": 0,
              "minExtent": 0,
              "ticks": false,
              "zindex": 0
            }
          ],
          "legends": [
            {
              "stroke": "color",
              "title": "subject.id",
              "encode": {
                "symbols": {
                  "update": {
                    "fill": {
                      "value": "transparent"
                    },
                    "opacity": {
                      "value": 0.35
                    }
                  }
                }
              }
            },
            {
              "shape": "shape",
              "title": "sample.timepoint",
              "encode": {
                "symbols": {
                  "update": {
                    "fill": {
                      "value": "transparent"
                    },
                    "opacity": {
                      "value": 0.35
                    }
                  }
                }
              }
            }
          ],
          "config": {
            "axisY": {
              "minExtent": 30
            }
          }
        
        
          
          
            }}/>;
      }};

export {ClonalFamiliesViz, ClonalFamiliesViz2, NaiveSequence}
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

export {ClonalFamiliesViz, ClonalFamiliesViz2, TreeViz, NaiveSequence}
