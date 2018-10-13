const clonalFamiliesVizCustomSpec = (data) => {
  return(       
  {
  "$schema": "https://vega.github.io/schema/vega/v4.json",
  "autosize": {"type": "pad"},
  "style": "cell",
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
      "update": "floor(windowSize()[0]*(1-2*PADDING_FRACTION))-PADDING_BUFFER_HEIGHT",
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
      "bind": {"name": "Y variable ", "input": "select", "options": ["n_seqs", "size", "cdr3_length", "mean_mut_freq"]} },
    { "name": "xField", "value": "n_seqs",
      "bind": {"name": "X variable ", "input": "select", "options": ["n_seqs", "size", "cdr3_length", "mean_mut_freq"]} },
    { "name": "nullSize", "value": 8 },
    { "name": "nullGap", "update": "nullSize + 10" },
    { "name": "colorBy", "value": "subject.id",
      "bind": {"name": "Color by ", "input": "select", "options": ["subject.id", "sample.timepoint", "v_gene", "d_gene", "j_gene", "has_seed"]} },
    { "name": "shapeBy", "value": "sample.timepoint",
      "bind": {"name": "Shape by ", "input": "select", "options": ["sample.timepoint", "subject.id", "v_gene", "d_gene", "j_gene", "has_seed"]} }
  ],
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
      "domain": {"data": "valid", "field": {"signal": "yField"}},
      "range": [{"signal": "height - nullGap"}, {"signal": "nullGap"}],
      "nice": true,
    },
    {
      "name": "x",
      "type": "linear",
      "domain": {"data": "valid", "field": {"signal": "xField"}},
      "range": [{"signal": "nullGap"}, {"signal": "width"}],
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
      "grid": true,
      "title": {"signal": "xField"},
      "tickCount": {
        "signal": "ceil(width/40)"
      },
      "zindex": 0
    },
    {
      "scale": "y",
      "orient": "left",
      "grid": true,
      "title": {"signal": "yField"},
      "tickCount": {
        "signal": "ceil(height/40)"
      },
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
          "opacity": [
            {"test": "indata('selected', 'ident', datum.ident)", "value": 1},
            {"value": 0.35}
          ],
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
          },
          "size": [
            {"test": "indata('selected', 'ident', datum.ident)", "value": 600},
            {"value": 20}
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

export default clonalFamiliesVizCustomSpec;
