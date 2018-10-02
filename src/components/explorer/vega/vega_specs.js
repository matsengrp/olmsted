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
          "update": "[scale(\"x\", brush_x_field[0]), scale(\"x\", brush_x_field[1])]"
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
      "name": "brush_x_field",
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
          "update": "[scale(\"y\", brush_y_field[0]), scale(\"y\", brush_y_field[1])]"
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
      "name": "brush_y_field",
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
      "update": "(!isArray(brush_x_field) || (+invert(\"x\", brush_x)[0] === +brush_x_field[0] && +invert(\"x\", brush_x)[1] === +brush_x_field[1])) && (!isArray(brush_y_field) || (+invert(\"y\", brush_y)[0] === +brush_y_field[0] && +invert(\"y\", brush_y)[1] === +brush_y_field[1])) ? brush_scale_trigger : {}"
    },
    {
      "name": "brush_tuple",
      "on": [
        {
          "events": [
            {
              "signal": "brush_x_field"
            },
            {
              "signal": "brush_y_field"
            }
          ],
          "update": "brush_x_field && brush_y_field ? {unit: \"\", intervals: [{encoding: \"x\", field: xField, extent: brush_x_field}, {encoding: \"y\", field: yField, extent: brush_y_field}]} : null"
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
    { "name": "nullGap", "update": "nullSize + 10" },
    { "name": "colorBy", "value": "subject.id",
      "bind": {"input": "select", "options": ["subject.id", "sample.timepoint", "v_gene", "d_gene", "j_gene", "has_seed"]} },
    { "name": "shapeBy", "value": "sample.timepoint",
      "bind": {"input": "select", "options": ["sample.timepoint", "subject.id", "v_gene", "d_gene", "j_gene", "has_seed"]} }
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
        "field": {"signal": "colorBy"},
        "sort": true
      },
      "range": "category"
    },
    {
      "name": "shape",
      "type": "ordinal",
      "domain": {
        "data": "data_0",
        "field": {"signal": "shapeBy"},
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
            "field": {"signal": "colorBy"}
          },
          "shape": {
            "scale": "shape",
            "field": {"signal": "shapeBy"}
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
      "title": {"signal": "colorBy"},
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
      "title": {"signal": "shapeBy"},
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

const concatTreeWithAlignmentSpec  = (selectedFamily, treeScale) => {
  return(
    {
      "$schema": "https://vega.github.io/schema/vega/v4.json",
      "description": "",
      "autosize": {"type": "pad", "resize": true},
      "padding": 5,
      "height": 800,
      "width": 1000,
      "data": [
        {"name": "pts_store"},

        // Tree Data
        {"name": "source_0",
         "values":selectedFamily["asr_tree"] 
        },
        {"name": "tree", 
         "transform": [{"key": "id", "type": "stratify", "parentKey": "parent"},
                       {"type": "extent", "field": "distance", "signal": "distance_extent"},
                       {"expr": "datum.distance * branchScale", "type": "formula", "as": "x"}, 
                       {"expr": "datum.height * heightScale", "type": "formula", "as": "y"}],
         "source": "source_0"},
        {"name": "links",
         "transform": [{"key": "id", "type": "treelinks"},
                       {"shape": "orthogonal", "type": "linkpath", "orient": "horizontal"}],
         "source": "tree"},
        {"name": "nodes", "transform": [{"expr": "datum.type == 'node' || datum.type =='root'", "type": "filter"}],
          "source": "tree"},
        {"name": "leaves", "transform": [{"expr": "datum.type == 'leaf'", "type": "filter"}], "source": "tree"}, 
        // Mutations Data
        {"name": "source_1",
         "values":selectedFamily["tips_alignment"] 
        },
        {"name": "data_1",
         "source": "source_1",
         "transform": [
           {
             "type": "formula",
             "expr": "toNumber(datum[\"position\"])",
             "as": "position"
           },
           {"expr": "datum.height * heightScale", "type": "formula", "as": "y"}
         ]
        },
      ],
      "signals": [
        // Size of leaves
        {
          "name": "max_leaf_size",
          "value": 1000,
          "bind": {"max": 7000, "step": 50, "input": "range", "min": 1}
        },
        {
          "name": "leaf_size",
          "value": "multiplicity",
          "bind": {"input": "select", "options": ["multiplicity", "cluster_multiplicity"]} 
        },
        // Number of leaves
        {
          "name": "leaves_len",
          "update": "length(data(\"leaves\"))"
        },
        // BRANCHSCALE - scales up width of tree
        {"value": treeScale.branch_scale,
         "name": "branchScale",
         "bind": {"max": 7000, "step": 50, "input": "range", "min": 0}},
        // HEIGHTSCALE - scales up height of tree
        {"value": treeScale.height_scale,
         "name": "heightScale",
         "bind": {"max": 20, "step": 1, "input": "range", "min": 0}
        },
        // Height of viz scaled by number of leaves 
        {
          "name": "scaledHeight",
          "update": "heightScale*(leaves_len+1)"
        },
        {"value": "datum",
         "name": "cladify",
         "on": [{"update": "datum", "events": "@ancestor:mousedown, @ancestor:touchstart"}]},
        {"name": "concat_0_x_step", "value": 0},
        {"name": "concat_0_width",
         "update": "branchScale*distance_extent[1] + 100"
        },
        {"name": "concat_1_width", "value": 200},
        {"name": "unit",
         "value": {},
         "on": [
           {"events": "mousemove", "update": "isTuple(group()) ? group() : unit"}
         ]
        },
        // On click stuff
        {"name": "pts",
         "update": "data(\"pts_store\").length && {_vgsid_: data(\"pts_store\")[0]}"
        },
        {
         "name": "pts_tuple",
         "value": {},
         "on": [
           {
             "events": [{"source": "scope", "type": "click"}],
             "update": "datum && (item().mark.marktype == 'text' || item().mark.marktype == 'symbol') ? datum : null",
            //  "force": true
           }
         ]
        },
        {
          "name": "pts_modify",
          "on": [
            {
              "events": {"signal": "pts_tuple"},
              "update": "modify(\"pts_store\", pts_tuple, true)"
            }
          ]
        }
      ],
      "layout": {
        "padding": {"row": 10, "column": 10},
        "bounds": "full",
        "align": "each"
      },
      "marks": [
        // TREE
        {
          "type": "group",
          "name": "concat_0_group",
          "style": "cell",
          "encode": {
           "update": {
             "width": {"signal": "concat_0_width"},
             "height": {"signal": "scaledHeight"}
           }
          },
          "marks": [
            // LINKS
            {
              "encode": {
                "update": {
                  "path": {"field": "path"},
                  "strokeWidth": {"value": 2},
                  "stroke": {"value": "#ccc"}
                }
              },
              "type": "path",
              "from": {"data": "links"}
            },
            // INTERNAL NODES
            {
              "name": "ancestor",
              "encode": {
                "update": {
                  "y": {"field": "y"},
                  "fill": {"value": "transparent"},
                  "x": {"field": "x"},
                  "tooltip": {
                    "signal": "{\"height\": format(datum[\"height\"], \"\"), \"id\": datum[\"id\"], \"parent\": datum[\"parent\"]}"
                  }
                },
                "enter": {
                  "size": {"value": 10},
                  "stroke": {"value": "transparent"},
                }
              },
              "type": "symbol",
              "from": {"data": "nodes"}
            },
            // LEAVES
            // labels
            {
              "type": "text",
              "encode": {
                "enter": {
                  "text": {"field": "label"},
                  "fill": {"value": "#000"},
                  "fontSize": {"value": 10},
                },
                "update": {
                  "y": {"scale": "y", "field": "y"},
                  "dx": {"scale": "leaf_label_offset", "field": {"signal": "leaf_size"}},
                  "dy": {"value": 3},
                  "x": {"field": "x"},
                  "tooltip": {
                    "signal": "{\"id\": datum[\"id\"], \"parent\": datum[\"parent\"], \"distance\": datum[\"distance\"], \"multiplicity\": datum[\"multiplicity\"], \"cluster_multiplicity\": datum[\"cluster_multiplicity\"], \"*tree height\": datum[\"height\"]}"
                  }
                }  
              },
              "from": {"data": "leaves"}
            },
            // circles: size depends on multiplicity 
            {
              "name": "leaf",
              "encode": {
                "update": {
                  "y": {"field": "y"},
                  "fill": {"value": "#000"},
                  "fillOpacity": {"value": "0.05"},
                  "x": {"field": "x"},
                  "tooltip": {
                    "signal": "{\"id\": datum[\"id\"], \"parent\": datum[\"parent\"], \"distance\": datum[\"distance\"], \"multiplicity\": datum[\"multiplicity\"], \"cluster_multiplicity\": datum[\"cluster_multiplicity\"], \"*tree height\": datum[\"height\"]}"
                  },
                  "size": {"scale": "leaf_size_scale", "field": {"signal": "leaf_size"}},
                  "stroke": {"value": "#000"},
                  "strokeWidth": {"value": 0.5}
                },
              },
              "type": "symbol",
              "from": {"data": "leaves"}
            },
            {
              "name": "leaf_center",
              "encode": {
                "update": {
                  "y": {"field": "y"},
                  "fill": {"value": "#000"},
                  "x": {"field": "x"},
                  "size": {"value": 1},
                },
              },
              "type": "symbol",
              "from": {"data": "leaves"}
            }
          ],
          // Tree axes
          "axes": [{
            "scale": "time",
            "orient": "bottom",
            "grid": false,
            "title": "Distance from root",
            "labelFlush": true,
            "labelOverlap": true,
            "tickCount": {"signal": "ceil(width/40)"},
            "zindex": 1
          }]
        },
        // SEQUENCE ALIGNMENT
        {
          "type": "group",
          "name": "concat_1_group",
          "style": "cell",
          "encode": {
            "update": {
              // "width": {"signal": "concat_1_width"},
              "height": {"signal": "scaledHeight"}
            }
          },
          "marks": [
            // MUTATIONS MARKS
            {
              "name": "marks",
              "type": "rect",
              "style": ["tick"],
              "from": {"data": "data_1"},
              "encode": {
                "update": {
                  "opacity": {"value": 0.7},
                  "fill": [
                    {
                      "test": "datum[\"position\"] === null || isNaN(datum[\"position\"])",
                      "value": null
                    },
                    {"scale": "color", "field": "mut_to"}
                  ],
                  "tooltip": {
                    "signal": "{\"position\": format(datum[\"position\"], \"\"), \"seq_id\": ''+datum[\"seq_id\"], \"mut_to\": ''+datum[\"mut_to\"], \"mut_from\": ''+datum[\"mut_from\"]}"
                  },
                  "xc": {"scale": "x", "field": "position"},
                  "yc": {"scale": "y", "field": "y"},
                  "height": {"signal": "ceil(height/100)"},
                  "width": {"signal": "ceil(width/150)"}
                }
              }
            }
          ],
          // MUTATIONS AXES
          "axes": [
            // x
            {
              "scale": "x",
              "orient": "bottom",
              "grid": false,
              "title": "position",
              "labelFlush": true,
              "labelOverlap": true,
              "tickCount": 128,
              "zindex": 1
            },
            // x grid
            {
              "scale": "x",
              "orient": "bottom",
              "gridScale": "y",
              "grid": true,
              "tickCount": 128,
              "domain": false,
              "labels": false,
              "maxExtent": 0,
              "minExtent": 0,
              "ticks": false,
              "zindex": 0
            },
            // y
            {
              "scale": "y",
              "orient": "left",
              "grid": false,
              "tickCount": {"signal": "leaves_len+1"},
              // TURN THIS ON TO DEBUG THE TICKS / GRID ISSUE
              "labels": false,
              "zindex": 1,
            },
            // y grid
            {
              "scale": "y",
              "orient": "left",
              "gridScale": "x",
              "grid": true,
              "tickCount": {"signal": "leaves_len+1"},
              // "domain": false,
              "labels": false,
              "maxExtent": 0,
              "minExtent": 0,
              "zindex": 0
            }
          ]
        }
      ],
      
      "scales": [
        {
          "name": "leaf_label_offset",
          "type": "linear",
          "domain": {"data": "leaves", "field": {"signal": "leaf_size"}},
          "range": [4,{"signal": "max_leaf_size/55"}]
        },
        {
          "name": "leaf_size_scale",
          "type": "linear",
          "domain": {"data": "leaves", "field": {"signal": "leaf_size"}},
          "range": [0,{"signal": "max_leaf_size"}]
        },
        {
          "name": "x",
          "type": "linear",
          "domain": {"data": "data_1", "field": "position"},
          "range": [5, {"signal": "width"}],
          "zero": true
        },
        {
          "name": "time",
          "type": "linear",
          "domain": {"data": "tree", "field": "distance"},
          "range": [0, {"signal": "concat_0_width"}],
          "nice": true,
          "zero": true
        },
        {
          // https://vega.github.io/vega/docs/scales/#quantize-scales
          "name": "y",
          "type": "quantize",
          // according to the above link,  "Using a number value for this parameter 
          //                               (representing a desired tick count) allows
          //                               greater control over the step size used to
          //                               extend the bounds, guaranteeing that the returned
          //                               ticks will exactly cover the domain."
          // This is not true in practice: why not?
          // "nice": {"signal": "leaves_len"},
          "zero": true,
          "domain": {"data": "leaves", "field": "y"},
          // this creates an array of range values - one for each leaf; scaledHeight is heightScale * (len_leaves+1)
          "range": {"signal": "sequence(0, scaledHeight, heightScale)"}, 
        },
        {
          "name": "color",
          "type": "ordinal",
          // "domain": {"data": "data_1", "field": "mut_to", "sort": false},
          "domain":  [ 
            '-',
            'A', 
            'C',
            'D',
            'E',
            'F',
            'G',
            'H', 
            'I', 
            'K', 
            'L',
            'M',
            'N', 
            'P', 
            'Q', 
            'R', 
            'S', 
            'T',
            'V', 
            'X',
            'W',
            'Y' 
           ],
          //tableau20 colorset of unique colors, with black and transparent added 
          "range": ["transparent", "#1f77b4", "#aec7e8", "#ff7f0e", "#ffbb78", "#2ca02c", "#98df8a", "#d62728", "#ff9896", "#9467bd", "#c5b0d5", "#8c564b", "#c49c94", "#e377c2", "#f7b6d2", "#7f7f7f", "#c7c7c7", "#bcbd22", "#dbdb8d", "black", "#17becf", "#9edae5"]
          // Alternatively: 
          // As seen in cft web, colors from http://www.imgt.org/IMGTScientificChart/RepresentationRules/colormenu.php#h1_0
          // (EH) these are pretty vibrant and hard to look at
          // "range": [
          //   'transparent', // '-' del?
          //   '#CCFFFF', //	A - Ala - Alanine
          //   '#00FFFF', //	C - Cys - Cysteine
          //   '#FFCC99', // D - Asp - Aspartic Acid
          //   '#FFCC00', // E - Glu - Glutamic Acid
          //   '#00CCFF', //	F - Phe - Phenylalanine
          //   '#00FF00', //	G - Gly - Glycine
          //   '#FFFF99', // H - His - Histidine
          //   '#000080', //	I - Ile - Isoleucine
          //   '#C64200', // K - Lys - Lysine
          //   '#3366FF', //	L - Leu - Leucine
          //   '#99CCFF', //	M - Met - Methionine
          //   '#FF9900', // N - Asn - Asparagine
          //   '#FFFF00', //	P - Pro - Proline
          //   '#FF6600', // Q - Gln - Glutamine
          //   '#E60606', // R - Arg - Arginine
          //   '#CCFF99', //	S - Ser - Serine
          //   '#00FF99', //	T - Thr - Threonine
          //   '#0000FF', //	V - Val - Valine
          //   'black',        // X
          //   '#CC99FF', //	W - Trp - Tryptophan
          //   '#CCFFCC', //	Y - Tyr - Tyrosine

            
          // ]
        }
      ],
      "legends": [
        {
          "fill": "color",
          "title": "mut_to",
          "encode": {
            "symbols": {
              "update": {"shape": {"value": "square"}, "opacity": {"value": 0.7}}
            }
          }
        }
      ],
    }
  )
}

const seqAlignSpec = (family) => {
  let padding = 20;
  let mark_height = 8
  let height = family["lineage_seq_counter"]*mark_height+padding;
  return(
    {
      "$schema": "https://vega.github.io/schema/vega/v4.json",
      "padding": 5,
      "height": height,
      "width": 1000,
      "style": "cell",
      "data": [
        {
          "name": "source_0",
          "values": family["lineage_alignment"]
        },
        {
          "name": "data_0",
          "source": "source_0",
          "transform": [
            {
              "type": "formula",
              "expr": "toNumber(datum[\"position\"])",
              "as": "position"
            }
          ]
        }
      ],
      "signals": [
        {
          "name": "mark_height",
          "value": mark_height
        },
        {
          "name": "lineage_seqs",
          "value": family["lineage_seq_counter"]
        }
      ],
      "marks": [
        {
          "name": "marks",
          "type": "rect",
          "style": ["tick"],
          "from": {"data": "data_0"},
          "encode": {
            "update": {
              "opacity": {"value": 0.7},
              "fill": [
                {
                  "test": "datum[\"position\"] === null || isNaN(datum[\"position\"])",
                  "value": null
                },
                {"scale": "color", "field": "mut_to"}
              ],
              "tooltip": {
                "signal": "{\"position\": format(datum[\"position\"], \"\"), \"seq_id\": ''+datum[\"seq_id\"], \"mut_to\": ''+datum[\"mut_to\"], \"mut_from\": ''+datum[\"mut_from\"]}"
              },
              "xc": {"scale": "x", "field": "position"},
              "yc": {"scale": "y", "field": "seq_id"},
              "height": {"signal": "mark_height"},
              "width": {"signal": "ceil(width/150)"}
            }
          }
        }
      ],
      "scales": [
        {
          "name": "x",
          "type": "linear",
          "domain": {"data": "data_0", "field": "position"},
          "range": "width",
          "nice": true,
          "zero": true
        },
        {
          "name": "y",
          "type": "point",
          "domain": {"data": "data_0", "field": "seq_id"},
          "range": [0, {"signal": "mark_height*lineage_seqs + 20"}],
          "padding": 0.5
        },
        {
          "name": "color",
          "type": "ordinal",
          "domain": {"data": "data_0", "field": "mut_to", "sort": true},
          "range": "category"
        }
      ],
      "axes": [
        {
          "scale": "x",
          "orient": "bottom",
          "grid": false,
          "title": "position",
          "labelFlush": true,
          "labelOverlap": true,
          "tickCount": {"signal": "ceil(width/40)"},
          "zindex": 1
        },
        {
          "scale": "x",
          "orient": "bottom",
          "gridScale": "y",
          "grid": true,
          "tickCount": 128,
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
          "title": "seq_id",
          "zindex": 1
        },
        {
          "scale": "y",
          "orient": "left",
          "gridScale": "x",
          "grid": true,
          "tickCount": 128,
          "domain": false,
          "labels": false,
          "maxExtent": 0,
          "minExtent": 0,
          "ticks": false,
          "zindex": 0
        },
      ],
      "legends": [
        {
          "fill": "color",
          "title": "mut_to",
          "encode": {
            "symbols": {
              "update": {"shape": {"value": "square"}, "opacity": {"value": 0.7}}
            }
          }
        }
      ],
    }
  )
}

export {naiveVegaSpec, clonalFamiliesVizCustomSpec, concatTreeWithAlignmentSpec, seqAlignSpec};
