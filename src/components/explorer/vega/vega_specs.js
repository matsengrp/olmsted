const naiveVegaSpec = {
  "$schema": "https://vega.github.io/schema/vega/v3.json",
  "autosize": "pad",
  "padding": 5,
  "width": 250,
  "height": 25,
  "style": "cell",
  "data": [
    {
      "name": "source"
    },
    {
      "name": "data_1",
      "source": "source",
      "transform": [
        {
          "type": "formula",
          "expr": "toString(datum[\"region\"])",
          "as": "region"
        },
        {
          "type": "formula",
          "expr": "toNumber(datum[\"start\"])",
          "as": "start"
        },
        {
          "type": "formula",
          "expr": "toNumber(datum[\"end\"])",
          "as": "end"
        },
        {
          "type": "filter",
          "expr": "indexof([\"CDR3\"], datum[\"region\"]) !== -1"
        },
        {
          "type": "filter",
          "expr": "datum[\"start\"] !== null && !isNaN(datum[\"start\"])"
        }
      ]
    },
    {
      "name": "data_2",
      "source": "source",
      "transform": [
        {
          "type": "formula",
          "expr": "toString(datum[\"region\"])",
          "as": "region"
        },
        {
          "type": "formula",
          "expr": "toNumber(datum[\"start\"])",
          "as": "start"
        },
        {
          "type": "formula",
          "expr": "toNumber(datum[\"end\"])",
          "as": "end"
        },
        {
          "type": "filter",
          "expr": "indexof([\"V gene\",\"Insertion 1\",\"D gene\",\"Insertion 2\",\"J gene\"], datum[\"region\"]) !== -1"
        },
        {
          "type": "filter",
          "expr": "datum[\"start\"] !== null && !isNaN(datum[\"start\"])"
        }
      ]
    }
  ],
  "marks": [
    {
      "name": "layer_0_marks",
      "type": "rect",
      "style": [
        "bar"
      ],
      "from": {
        "data": "data_1"
      },
      "encode": {
        "update": {
          "fill": {
            "value": "yellow"
          },
          "tooltip": {
            "signal": "{\"region\": ''+datum[\"region\"], \"start\": format(datum[\"start\"], \"\"), \"end\": format(datum[\"end\"], \"\")}"
          },
          "x": {
            "scale": "x",
            "field": "start"
          },
          "x2": {
            "scale": "x",
            "field": "end"
          },
          "yc": {
            "scale": "y",
            "field": "family",
            "band": 0.5
          },
          "height": {
            "value": 25
          }
        }
      }
    },
    {
      "name": "layer_1_marks",
      "type": "rect",
      "style": [
        "bar"
      ],
      "from": {
        "data": "data_2"
      },
      "encode": {
        "update": {
          "fill": {
            "scale": "color",
            "field": "region"
          },
          "tooltip": {
            "signal": "{\"region\": ''+datum[\"region\"], \"start\": format(datum[\"start\"], \"\"), \"end\": format(datum[\"end\"], \"\"), \"gene\": ''+datum[\"gene\"]}"
          },
          "x": {
            "scale": "x",
            "field": "start"
          },
          "x2": {
            "scale": "x",
            "field": "end"
          },
          "yc": {
            "scale": "y",
            "field": "family",
            "band": 0.5
          },
          "height": {
            "value": 12
          }
        }
      }
    }
  ],
  "scales": [
    {
      "name": "x",
      "type": "linear",
      "domain": [
        0,
        400
      ],
      "range": [
        0,
        {
          "signal": "width"
        }
      ],
      "nice": true,
      "zero": false
    },
    {
      "name": "y",
      "type": "band",
      "domain": {
        "fields": [
          {
            "data": "data_1",
            "field": "family"
          },
          {
            "data": "data_2",
            "field": "family"
          }
        ],
        "sort": true
      },
      "range": [
        0,
        {
          "signal": "height"
        }
      ],
      "paddingInner": 0.1,
      "paddingOuter": 0.05
    },
    {
      "name": "color",
      "type": "ordinal",
      "domain": [
        "V gene",
        "Insertion 1",
        "D gene",
        "Insertion 2",
        "J gene"
      ],
      "range": [
        "#db2c0d",
        "#36db0d",
        "#000000",
        "#36db0d",
        "#2c12ea"
      ]
    }
  ],
 
  "config": {
    "axisY": {
      "minExtent": 30
    }
  }
}

const naiveVegaLiteSpec = {
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
  }]
}

const clonalFamiliesVizCustomSpec = (data) => {
  return(       
  {
  "$schema": "https://vega.github.io/schema/vega/v3.json",
  "autosize": "pad",
  "padding": 5,
  "width": 900,
  "height": 700,
  "style": "cell",
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
    { "name": "yField", "value": "mean_mut_freq",
      "bind": {"input": "select", "options": ["n_seqs", "size", "cdr3_length", "mean_mut_freq"]} },
    { "name": "xField", "value": "n_seqs",
      "bind": {"input": "select", "options": ["n_seqs", "size", "cdr3_length", "mean_mut_freq"]} },
    { "name": "nullSize", "value": 8 },
    { "name": "nullGap", "update": "nullSize + 10" }
  ],
  "data": [
    {
      "name": "brush_store"
    },
    {
      "name": "source",
      "values":data
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
      

    },
    {
      "name": "valid",
      "source": "data_0",
      "transform": [
        {
          "type": "filter",
          "expr": "datum[xField] != null && datum[yField] != null"
        }
      ]
    },
    {
      "name": "nullY",
      "source": "source",
      "transform": [
        {
          "type": "filter",
          "expr": "datum[xField] != null && datum[yField] == null"
        }
      ]
    },
    {
      "name": "nullX",
      "source": "source",
      "transform": [
        {
          "type": "filter",
          "expr": "datum[xField] == null && datum[yField] != null"
        }
      ]
    }
  ],
  "scales": [
    {
      "name": "y",
      "type": "linear",
      "range": [{"signal": "height - nullGap"}, {"signal": "nullGap"}],
      "domain": {"data": "valid", "field": {"signal": "yField"}},
      "nice": true,
    },
    {
      "name": "x",
      "type": "linear",
      "range": [{"signal": "nullGap"}, {"signal": "width"}],
      "domain": {"data": "valid", "field": {"signal": "xField"}},
      "nice": true,
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
      "title": {"signal": "xField"},
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
      "title": {"signal": "yField"},
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
      "type": "symbol",
      "style": [
        "point"
      ],
      "from": {
        "data": "valid"
      },
      "encode": {
        "update": {
          "x": {"scale": "x", "field": {"signal": "xField"}},
          "y": {"scale": "y", "field": {"signal": "yField"}},
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
          "shape": {
            "scale": "shape",
            "field": "sample\\.timepoint"
          }
        }
      }
    },
    {
      "type": "symbol",
      "style": [
        "point"
      ],
      "from": {
        "data": "nullY"
      },
      "encode": {
        "update": {
          "x": {"scale": "x", "field": {"signal": "xField"}},
          "y": {"signal": "height - nullSize/2"},
          "opacity": {
            "value": 0.35
          },
          "fill": {"value": "#aaa"},
          "fillOpacity": {"value": 0.2},
          "stroke": {
            "scale": "color",
            "field": "subject\\.id"
          },
          "shape": {
            "scale": "shape",
            "field": "sample\\.timepoint"
          }
        }
      }
    },
    {
      "type": "symbol",
      "style": [
        "point"
      ],
      "from": {
        "data": "nullX"
      },
      "encode": {
        "update": {
          "x": {"signal": "nullSize/2"},
          "y": {"scale": "y", "field": {"signal": "yField"}},
          "opacity": {
            "value": 0.35
          },
          "fill": {"value": "#aaa"},
          "fillOpacity": {"value": 0.2},

          "stroke": {
            "scale": "color",
            "field": "subject\\.id"
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


  
  
    }
  )
}

export {naiveVegaSpec, clonalFamiliesVizCustomSpec};