const facetClonalLineagesVizSpec = () => {
  return(       
  {
  "$schema": "https://vega.github.io/schema/vega/v4.json",
  "autosize": {"type": "pad"},
  // DATA
  "data": [
    {
      "name": "pts_store"
    },
    {
      "name": "selected"
    },
    {
      "name": "locus"
    },
    {
      "name": "brush_store",
      "on": [
        // single trigger version
        {"trigger": "brush_selection", "insert": "brush_selection", "remove": true},
        {"trigger": "facet_by_signal", "remove": true},

        // Use a pattern similar to this for #114
        // {"trigger": "!shift", "remove": true},
        // {"trigger": "!shift && clicked", "insert": "clicked"},
        // {"trigger": "shift && clicked", "toggle": "clicked"}
      ]
    },
    {
      "name": "source",
    },
    {
      "name": "data_0",
      "source": "source",
      "format": {
        "type": "json",
        "parse": {"unique_seqs_count": "number", "mean_mut_freq": "number"},
        "copy": true
      },
      "transform": [
        // Get nested data at top level
        // Vega assumes things are top level properties and
        // sometimes has issues with nested fields https://vega.github.io/vega/docs/data/
        {
          "type": "formula",
          "expr": "datum[\"sample\"] && datum[\"sample\"][\"timepoint_id\"]",
          "as": "sample.timepoint_id"
        },
        {
          "type": "formula",
          "expr": "datum[\"sample\"] && datum[\"sample\"][\"locus\"]",
          "as": "sample.locus"
        },
        {
          "type": "formula",
          "expr": "datum[\"dataset\"] && datum[\"dataset\"][\"dataset_id\"]",
          "as": "dataset.dataset_id"
        },
        {
          "type": "filter",
          "expr": "datum[\"unique_seqs_count\"] !== null && !isNaN(datum[\"unique_seqs_count\"]) && datum[\"mean_mut_freq\"] !== null && !isNaN(datum[\"mean_mut_freq\"])"
        },
        // Add the facet by field work around since it cannot be updated directly 
        // with a signal see https://github.com/vega/vega/issues/1461
        {"type": "formula", "expr": "datum[facet_by_signal]", "as": "facet_by_field"}

      ],
    },
    {
        "name": "column_domain",
        "source": "data_0",
        "transform": [{"type": "aggregate", "groupby": [{"signal": "facet_by_signal"}]},
                      // Add the facet by field work around since it cannot be updated directly 
                      // with a signal see https://github.com/vega/vega/issues/1461
                      {"type": "formula", "expr": "datum[facet_by_signal]", "as": "facet_by_field"}
      ]
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
    {"name": "layout_padding", "value": 10},
    { "name": "len_col_domain", "update": "clamp(length(data('column_domain')), 1, 100)" },
    {"name": "child_width", "update": "width/len_col_domain-layout_padding"},
    {"name": "child_height", "update": "height"},
    // On click stuff
    {
      "name": "pts",
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
    {
      "name": "brush_store_signal",
      "update": "data(\"brush_store\")"
    },
    {
      "name": "brush_selection",
      "value": null
    },
    // Tracks the facet value of the group selected from
    {
      // TODO (#118):  Use brush store signal in place
     // of brushed_facet_value, taking values from facetKey and facetValue 
     // from brush store
      "name": "brushed_facet_value", "value": null
    },
    // Tracks the cell (group mark) in which the user is interacting
    {
      "name": "cell", "value": null
    },
    //Mouse down and mouse up being used for autoselecting a lineage upon completing a brush selection
    {
      "name": "mouseDown",
      "on": [
        {
          "events": {
            "source": "scope",
            "type": "mousedown",
            "consume": true
          },
          "update": "[x(cell), y(cell)]"
        }
      ]
    },
    {
      "name": "mouseUp",
      "on": [
        {
          "events": {
            "source": "window",
            "type": "mouseup"
          },
          "update": "[x(cell), y(cell)]"
        }
      ]
    },
    // Dropdown menus
    {
      "name": "facet_by_signal",
      "value": "none",
      "bind": {"name": "Facet by field ", "input": "select", "options": ["none", "has_seed", "dataset.dataset_id", "subject_id", "sample.timepoint_id", "sample.locus"]}
    },
    { "name": "yField", "value": "mean_mut_freq",
      "bind": {"name": "Y variable ", "input": "select", "options": ["mean_mut_freq", "junction_length", "unique_seqs_count"]} },
    { "name": "xField", "value": "unique_seqs_count",
       "bind": {"name": "X variable ", "input": "select", "options": ["unique_seqs_count", "junction_length", "mean_mut_freq"]} },
    { "name": "colorBy", "value": "subject_id",
       "bind": {"name": "Color by ", "input": "select", "options": ["subject_id", "sample.timepoint_id", "v_call", "d_call", "j_call", "has_seed", "sample.locus"]} },
    { "name": "shapeBy", "value": "sample.timepoint_id",
       "bind": {"name": "Shape by ", "input": "select", "options": ["sample.timepoint_id", "subject_id", "v_call", "d_call", "j_call", "has_seed", "sample.locus"]} },
    // Outer level brush signals to subscribe to
    {
      "name": "brush_x_field",
      "on": [{
              "events": {
                "signal": "facet_by_signal"
              },
              "update": "null"
            }]
    },
    {
      "name": "brush_y_field",    
      "on": [{
              "events": {
                "signal": "facet_by_signal"
              },
              "update": "null"
            }]
    },
    {
      "name": "locus", 
      "update": "data(\"locus\")[0].locus"
    }
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
        "title": {"text": {"signal": "facet_by_signal == 'none' ? '' : facet_by_signal"}, "offset": 10, "style": "guide-title"}
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
        "sort": {"field": "datum[\"facet_by_field\"]", "order": "ascending"},
        "title": {
            "text": {"signal": "'' + (toString(parent[\"facet_by_field\"]) ? parent[\"facet_by_field\"] : '')"},
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
        "sort": {"field": "datum[\"facet_by_field\"]", "order": "ascending"},
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
    // begin facet marks
    {
      "name": "cell",
      "type": "group",
      "style": "cell",
      "from": {
        "facet": {"name": "facet", "data": "data_0", "groupby": "facet_by_field"}
      },
      "sort": {"field": "datum.facet_by_field", "order": "ascending"},
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
          "name": "local_facet_value",
          "update": "facet_by_signal !== \"none\" ? facet.facet_by_field : 'none'"
        },
        {
          "name": "brush_test",
          "update": "data(\"brush_store\").length && (local_facet_value !== \"none\" ? (data(\"brush_store\")[0].facetValue === facet.facet_by_field) : true)"
        },
        // TODO (#118): use brush store and get rid of brushed_facet_value
        {
          "name": "brushed_facet_value", 
          "push": "outer",
          "on": [
            {
              "events": "@cell:mousedown", "update": "[facet_by_signal, facet.facet_by_field]"
            }
          ]
        },
        {
          "name": "cell",  
          "push": "outer",
          "on": [
            {
              "events": "@cell:mousedown", "update": "group()"
            },
            {
              "events": "@cell:mouseup",
              "update": "!span(brush_x) && !span(brush_y) ? null : cell"
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
                "update": "[x(cell), x(cell)]"
              },
              {
                "events": {
                    "source": "window",
                    "type": "mousemove",
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
                "update": "[brush_x[0], clamp(x(cell), 0, child_width)]"
              },
              {
                "events": {
                    "signal": "brush_scale_trigger"
                },
                "update": "brush_x_field_nested ? [scale(\"x\", brush_x_field_nested[0]), scale(\"x\", brush_x_field_nested[1])] : null"
              },
              {
                "events": {
                    "signal": "brush_translate_delta"
                },
                "update": "clampRange(panLinear(brush_translate_anchor.extent_x, brush_translate_delta.x / span(brush_translate_anchor.extent_x)), 0, child_width)"
              },
              {
                "events": [
                  {"signal": "facet_by_signal"},
                  {"signal": "brushed_facet_value"},
                  {"signal": "locus"}
                ],
                "update": "[]"
              }
          ]
        },
        {
          "name": "brush_x_field_nested",
          "on": [
            {
              "events": { "signal": "brush_x"},
              "update": "brush_x[0] === brush_x[1] ? null : invert(\"x\", brush_x)",
              "force": true
            }
          ]
        },
        {
          "push": "outer",
          "name": "brush_x_field",
          "on": [
            {
              "events": { "signal": "brush_x"},
              "update": "brush_x[0] === brush_x[1] ? null : invert(\"x\", brush_x)",
              "force": true
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
                  "!event.item || event.item.mark.name !== \"brush_brush\"",
                  "inScope(event.item)",
                  "inScope(event.item)",
                  "inScope(event.item)",
                  "inScope(event.item)"                      
                  ]
              },
              "update": "[y(cell), y(cell)]"
            },
            {
              "events": {
                  "source": "window",
                  "type": "mousemove",
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
              "update": "[brush_y[0], clamp(y(cell), 0, child_height)]"
            },
            {
              "events": {
                  "signal": "brush_scale_trigger"
              },
              "update": "brush_y_field_nested ? [scale(\"y\", brush_y_field_nested[0]), scale(\"y\", brush_y_field_nested[1])] : null"
            },
            {
              "events": {
                  "signal": "brush_translate_delta"
              },
              "update": "clampRange(panLinear(brush_translate_anchor.extent_y, brush_translate_delta.y / span(brush_translate_anchor.extent_y)), 0, child_height)"
            },
            {
              "events": [
                {"signal": "facet_by_signal"},
                {"signal": "brushed_facet_value"},
                {"signal": "locus"}
              ],
              "update": "[]"
            }
          ]
        },
        {
          "name": "brush_y_field_nested",
          "on": [
              {
              "events": { "signal": "brush_y" },
              "update": "brush_y[0] === brush_y[1] ? null : invert(\"y\", brush_y)",
              "force": true
              }
          ]
        },
        {            
          "push": "outer",
          "name": "brush_y_field",
          "on": [
            {
              "events": { "signal": "brush_y" },
              "update": "brush_y[0] === brush_y[1] ? null : invert(\"y\", brush_y)",
              "force": true
            }
          ]
        },
        {
          "name": "brush_scale_trigger",
          "update": "(!isArray(brush_x_field_nested) || (+invert(\"x\", brush_x)[0] === +brush_x_field_nested[0] && +invert(\"x\", brush_x)[1] === +brush_x_field_nested[1])) && (!isArray(brush_y_field_nested) || (+invert(\"y\", brush_y)[0] === +brush_y_field_nested[0] && +invert(\"y\", brush_y)[1] === +brush_y_field_nested[1])) ? brush_scale_trigger : {}"
        },
        {
          "name": "brush_selection",
          "push": "outer",
          "on": [
            {
              "events": [
                {"signal": "brush_x_field_nested"},
                {"signal": "brush_y_field_nested"}
              ],
              "update": "{facetKey: facet_by_signal, facetValue: local_facet_value, intervals: { \"x\": { field: xField, extent: brush_x_field_nested },  \"y\": { field: yField, extent: brush_y_field_nested } }  } ",
              "force": true
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
              "update": "{x: x(cell), y: y(cell), extent_x: slice(brush_x), extent_y: slice(brush_y)}"
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
              "update": "{x: brush_translate_anchor.x - x(cell), y: brush_translate_anchor.y - y(cell)}"
            }
          ]
        },
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
                  "test": "brush_test",
                  "signal": "brush_x[0]"
                },
                {
                  "value": 0
                }
              ],
              "y": [
                {
                  "test": "brush_test",
                  "signal": "brush_y[0]"
                },
                {
                  "value": 0
                }
              ],
              "x2": [
                {
                  "test": "brush_test",
                  "signal": "brush_x[1]"
                },
                {
                  "value": 0
                }
              ],
              "y2": [
                {
                  "test": "brush_test",
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
                  "scale": "color",
                  "field": {"signal": "colorBy"}
                },
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
                  "test": "brush_test",
                  "signal": "brush_x[0]"
                },
                {
                  "value": 0
                }
              ],
              "y": [
                {
                  "test": "brush_test",
                  "signal": "brush_y[0]"
                },
                {
                  "value": 0
                }
              ],
              "x2": [
                {
                  "test": "brush_test",
                  "signal": "brush_x[1]"
                },
                {
                  "value": 0
                }
              ],
              "y2": [
                {
                  "test": "brush_test",
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

export default facetClonalLineagesVizSpec;
