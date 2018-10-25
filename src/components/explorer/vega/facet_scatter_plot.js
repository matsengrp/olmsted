const facetClonalFamiliesVizSpec = (data) => {
  console.log('olmsted facet spec')
  return(       
  {
  "$schema": "https://vega.github.io/schema/vega/v4.json",
  "autosize": "pad",
  "padding": 5,
  // DATA
  "data": [
    {"name": "pts_store"},
    {
      "name": "selected"
    },
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
    //   try this instead of the transforms
    //   "format": {
    //     "type": "json",
    //     "parse": {"Horsepower": "number", "Miles_per_Gallon": "number"}
    //   },
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
        "name": "column_domain",
        "source": "data_0",
        "transform": [{"type": "aggregate", "groupby": ["has_seed"]}]
    }
  ],
  // SIGNALS
  "signals": [
    {
      "name": "PADDING_FRACTION",
      "value": 0.05
    },
    // Explanation of buffer:
    // We'd like to be able to just use the padding fraction to 
    // compute the padding for each side of the screen from the total
    // available screeen width, and then use the remaining available
    // screen width for our vega component. This DOES work when using 
    // vega's autosize: fit which does some math to make sure every part
    // of the viz fits into the width of it's container. However, this recalculation
    // adds some discrepency between the signal updating the width and the autosize
    // vega code updating the width and yields two different values. This (we suspect)
    // introduces a bug with the first brush select and then resize the screen 
    // (see  https://github.com/vega/vega/issues/1421)
    // So we are using autosize: pad, instead which does not fit the vega exactly into
    // its container, which is why wee need PADDING_BUFFER to adjust for the amount
    // it exceeds its container.
    {
      "name": "PADDING_BUFFER_WIDTH",
      "value": 150
    },
    {
      "name": "PADDING_BUFFER_HEIGHT",
      "value": 125
    },
    {
      "name": "width",
      "update": "floor(windowSize()[0]*(1-2*PADDING_FRACTION))-PADDING_BUFFER_WIDTH",
          "on": [
            {
              "events": { "source": "window", "type": "resize" },
              "update": "floor(windowSize()[0]*(1-2*PADDING_FRACTION))-PADDING_BUFFER_WIDTH"
            }
          ]
    },
    {
      "name": "height",
      "update": "floor(windowSize()[1]*(1-2*PADDING_FRACTION))-PADDING_BUFFER_HEIGHT",
      "on": [
        {
          "events": { "source": "window", "type": "resize" },
          "update": "floor(windowSize()[1]*(1-2*PADDING_FRACTION))-PADDING_BUFFER_HEIGHT"
        }
      ]
    },
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
    {"name": "layout_padding", "value": 10},
    { "name": "len_col_domain", "update": "length(data('column_domain'))" },
    {"name": "child_width", "update": "width/len_col_domain-layout_padding"},
    {"name": "child_height", "update": "height"},

    // Put below in nested signals?
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
        "update": "datum && item().mark.marktype == 'symbol' ? datum : null",
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
   },
    //Mouse down and mouse up being used for autoselecting a family upon completing a brush selection
    {
      "name": "mouseDown",
      "on": [
        {
          "events": {
            "source": "scope",
            "type": "mousedown",
            "consume": true
          },
          "update": "[x(unit), y(unit)]"
        }
      ]
    },
    {
      "name": "mouseUp",
      "on": [
        {
          "events": {
            "source": "window",
            "type": "mouseup",
            "consume": true
          },
          "update": "[x(unit), y(unit)]"
        }
      ]
    },

    { "name": "yField", "value": "mean_mut_freq",
      "bind": {"name": "Y variable ", "input": "select", "options": ["n_seqs", "size", "cdr3_length", "mean_mut_freq"]} },
    { "name": "xField", "value": "n_seqs",
       "bind": {"name": "X variable ", "input": "select", "options": ["n_seqs", "size", "cdr3_length", "mean_mut_freq"]} },
    { "name": "colorBy", "value": "subject.id",
       "bind": {"name": "Color by ", "input": "select", "options": ["subject.id", "sample.timepoint", "v_gene", "d_gene", "j_gene", "has_seed"]} },
    { "name": "shapeBy", "value": "sample.timepoint",
       "bind": {"name": "Shape by ", "input": "select", "options": ["sample.timepoint", "subject.id", "v_gene", "d_gene", "j_gene", "has_seed"]} },
    {
      "name": "brush_x_field_outer",
    },
    {
      "name": "brush_y_field_outer",     
    },
  ],
  // LAYOUT
  "layout": {
    "padding": {"row": {"signal": "layout_padding"}, "column": {"signal": "layout_padding"}},
    "offset": {"columnTitle": 10},
    "columns": {"signal": "len_col_domain"},
    "bounds": "full",
    "align": "all"
  },
  // MARKS
  "marks": [
    {
        "name": "column-title",
        "type": "group",
        "role": "column-title",
        "title": {"text": "has_seed", "offset": 10, "style": "guide-title"}
    },
    {
        "name": "row_header",
        "type": "group",
        "role": "row-header",
        "encode": {"update": {"height": {"signal": "child_height"}}},
        "axes": [
        {
            "scale": "y",
            "orient": "left",
            "grid": false,
            "title": {"signal": "yField"},
            "labelOverlap": true,
            "tickCount": {"signal": "ceil(child_height/40)"},
            "zindex": 1
        }
        ]
    },
    {
        "name": "column_header",
        "type": "group",
        "role": "column-header",
        "from": {"data": "column_domain"},
        "sort": {"field": "datum[\"has_seed\"]", "order": "ascending"},
        "title": {
            "text": {"signal": "''+parent[\"has_seed\"]"},
            "offset": 10,
            "style": "guide-label",
            "baseline": "middle"
        },
        "encode": {"update": {"width": {"signal": "child_width"}}}
    },
    {
        "name": "column_footer",
        "type": "group",
        "role": "column-footer",
        "from": {"data": "column_domain"},
        "sort": {"field": "datum[\"has_seed\"]", "order": "ascending"},
        "encode": {"update": {"width": {"signal": "child_width"}}},
        "axes": [
        {
            "scale": "x",
            "orient": "bottom",
            "grid": false,
            "title": {"signal": "xField"},
            "labelFlush": true,
            "labelOverlap": true,
            "tickCount": {"signal": "ceil(child_width/40)"},
            "zindex": 1
        }
        ]
    },
    // begin facet marks?
    {
        "name": "cell",
        "type": "group",
        "style": "cell",
        "from": {
          "facet": {"name": "facet", "data": "data_0", "groupby": ["has_seed"]}
        },
        "sort": {"field": ["datum[\"has_seed\"]"], "order": ["ascending"]},
        "encode": {
          "update": {
            "width": {"signal": "child_width"},
            "height": {"signal": "child_height"}
          }
        },
        "signals": [
          {
            "name": "facet",
            "value": {},
            "on": [
              {
                "events": [{"source": "scope", "type": "mousemove"}],
                "update": "isTuple(facet) ? facet : group(\"cell\").datum"
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
                        "!event.item || event.item.mark.name !== \"brush_brush\"",
                        "inScope(event.item)",
                        "inScope(event.item)",
                        "inScope(event.item)",
                        "inScope(event.item)"
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
                            "!event.item || event.item.mark.name !== \"brush_brush\"",
                            "inScope(event.item)",
                            "inScope(event.item)",
                            "inScope(event.item)",
                            "inScope(event.item)"
                            ]
                        },
                        {
                            "source": "window",
                            "type": "mouseup"
                        }
                        ]
                    },
                    "update": "[brush_x[0], clamp(x(unit), 0, child_width)]"
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
                    "update": "clampRange(panLinear(brush_translate_anchor.extent_x, brush_translate_delta.x / span(brush_translate_anchor.extent_x)), 0, child_width)"
                    },
                ]
                },
                {
                  "name": "brush_x_field_outer",
                  "on": [
                      {
                      "events": { "signal": "brush_x"},
                      "update": "brush_x[0] === brush_x[1] ? null : invert(\"x\", brush_x)"
                    }
                  ],
                  "push": "outer"
                },
                {
                  "name": "brush_x_field",
                  "on": [
                      {
                      "events": { "signal": "brush_x"},
                      "update": "brush_x[0] === brush_x[1] ? null : invert(\"x\", brush_x)"
                    }
                  ],
                  // "push": "outer"
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
                        "!event.item || event.item.mark.name !== \"brush_brush\"",
                        "inScope(event.item)",
                        "inScope(event.item)",
                        "inScope(event.item)",
                        "inScope(event.item)"                      
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
                            "!event.item || event.item.mark.name !== \"brush_brush\"",
                            "inScope(event.item)",
                            "inScope(event.item)",
                            "inScope(event.item)",
                            "inScope(event.item)"
                            ]
                        },
                        {
                            "source": "window",
                            "type": "mouseup"
                        }
                        ]
                    },
                    "update": "[brush_y[0], clamp(y(unit), 0, child_height)]"
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
                    "update": "clampRange(panLinear(brush_translate_anchor.extent_y, brush_translate_delta.y / span(brush_translate_anchor.extent_y)), 0, child_height)"
                    },
                ]
                },
                {
                "name": "brush_y_field_outer",
                "on": [
                    {
                    "events": { "signal": "brush_y" },
                    "update": "brush_y[0] === brush_y[1] ? null : invert(\"y\", brush_y)"
                    }
                ],
                "push": "outer"
                },
                {
                  "name": "brush_y_field",
                  "on": [
                      {
                      "events": { "signal": "brush_y" },
                      "update": "brush_y[0] === brush_y[1] ? null : invert(\"y\", brush_y)"
                      }
                  ],
                  // "push": "outer"
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
                        {"signal": "brush_x_field"},
                        {"signal": "brush_y_field"}
                    ],
                    "update": "brush_x_field && brush_y_field ? {unit: \"child\" + '_' + (facet[\"has_seed\"]), intervals: [{encoding: \"x\", field: xField, extent: brush_x_field}, {encoding: \"y\", field: yField, extent: brush_y_field}]} : null"
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
                  "name": "brush_modify",
                  "on": [
                        {
                        "events": {"signal": "brush_tuple"},
                        "update": "modify(\"brush_store\", brush_tuple, true)"
                        }
                  ]
                }
        ],
        // put marks here
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
                    "test": "data(\"brush_store\").length && data(\"brush_store\")[0].unit === \"child\" + '_' + (facet[\"has_seed\"])",
                    "signal": "brush_x[0]"
                    },
                    {
                    "value": 0
                    }
                ],
                "y": [
                    {
                    "test": "data(\"brush_store\").length && data(\"brush_store\")[0].unit === \"child\" + '_' + (facet[\"has_seed\"])",
                    "signal": "brush_y[0]"
                    },
                    {
                    "value": 0
                    }
                ],
                "x2": [
                    {
                    "test": "data(\"brush_store\").length && data(\"brush_store\")[0].unit === \"child\" + '_' + (facet[\"has_seed\"])",
                    "signal": "brush_x[1]"
                    },
                    {
                    "value": 0
                    }
                ],
                "y2": [
                    {
                    "test": "data(\"brush_store\").length && data(\"brush_store\")[0].unit === \"child\" + '_' + (facet[\"has_seed\"])",
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
                "name": "child_marks",
                "type": "symbol",
                "style": [
                    "point"
                ],
                "from": {
                    "data": "facet"
                },
                "encode": {
                    "update": {
                    "x": {"scale": "x", "field": {"signal": "xField"}},
                    "y": {"scale": "y", "field": {"signal": "yField"}},
                    "opacity": [
                        {"test": "indata('selected', 'ident', datum.ident)", "value": 1},
                        {"value": 0.35}
                    ],
                    "fill": {
                        "value": "transparent"
                    },
                    "stroke": [
                      {
                        "test": "!(length(data(\"brush_store\"))) || (vlInterval(\"brush_store\", datum))",
                        "scale": "color",
                        "field": {"signal": "colorBy"}
                      },
                      {"value": "grey"}
                    ],
                    "shape": {
                        "scale": "shape",
                        "field": {"signal": "shapeBy"}
                    },
                    "size": [
                        {"test": "indata('selected', 'ident', datum.ident)", "value": 600},
                        {"value": 20}
                    ]
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
                    "test": "data(\"brush_store\").length && data(\"brush_store\")[0].unit === \"child\" + '_' + (facet[\"has_seed\"])",
                    "signal": "brush_x[0]"
                    },
                    {
                    "value": 0
                    }
                ],
                "y": [
                    {
                    "test": "data(\"brush_store\").length && data(\"brush_store\")[0].unit === \"child\" + '_' + (facet[\"has_seed\"])",
                    "signal": "brush_y[0]"
                    },
                    {
                    "value": 0
                    }
                ],
                "x2": [
                    {
                    "test": "data(\"brush_store\").length && data(\"brush_store\")[0].unit === \"child\" + '_' + (facet[\"has_seed\"])",
                    "signal": "brush_x[1]"
                    },
                    {
                    "value": 0
                    }
                ],
                "y2": [
                    {
                    "test": "data(\"brush_store\").length && data(\"brush_store\")[0].unit === \"child\" + '_' + (facet[\"has_seed\"])",
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
         // nested axes
        "axes": [
            {
            "scale": "x",
            "orient": "bottom",
            // This is important to leave the grid scale as x to limit this to the x range?? Why does this work when they are both x
            // "gridScale": "y",
            "grid": true,
            "tickCount": {"signal": "ceil(child_width/40)"},
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
            "gridScale": "x",
            "grid": true,
            "tickCount": {"signal": "ceil(child_height/40)"},
            "domain": false,
            "labels": false,
            "maxExtent": 0,
            "minExtent": 0,
            "ticks": false,
            "zindex": 0
            }
        ]

      }
  ],
  // SCALES
  "scales": [
    {
        "name": "x",
        "type": "linear",
        "domain": {"data": "data_0", "field": {"signal": "xField"}},
        "range": [0, {"signal": "child_width"}],
        "nice": true,
        "zero": true

    },
    {
      "name": "y",
      "type": "linear",
      "domain": {"data": "data_0", "field": {"signal": "yField"}},
      "range": [{"signal": "child_height"}, 0],
      "nice": true,
      "zero": true

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
  // LEGENDS
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

export default facetClonalFamiliesVizSpec;
