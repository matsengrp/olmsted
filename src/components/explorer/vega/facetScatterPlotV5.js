const facetClonalFamiliesVizSpec = () => {
  return (
    {
      $schema: "https://vega.github.io/schema/vega/v5.json",
      autosize: {type: "fit", contains: "padding"},
      padding: 10,
      // DATA
      data: [
        {
          name: "pts_store"
        },
        {
          name: "selected"
        },
        {
          name: "locus"
        },
        {
          name: "brush_store",
          on: [
            {trigger: "brush_selection", insert: "brush_selection", remove: true}
          ]
        },
        {
          name: "source"
        },
        {
          name: "data_0",
          source: "source",
          format: {
            type: "json",
            parse: {unique_seqs_count: "number", mean_mut_freq: "number", junction_length: "number"},
            copy: true
          },
          transform: [
            // Get nested data at top level
            {
              type: "formula",
              expr: "datum[\"sample\"] && datum[\"sample\"][\"timepoint_id\"]",
              as: "sample.timepoint_id"
            },
            {
              type: "formula",
              expr: "datum[\"sample\"] && datum[\"sample\"][\"locus\"]",
              as: "sample.locus"
            },
            {
              type: "formula",
              expr: "datum[\"dataset\"] && datum[\"dataset\"][\"dataset_id\"]",
              as: "dataset.dataset_id"
            },
            {
              type: "filter",
              expr: "datum[\"unique_seqs_count\"] !== null && !isNaN(datum[\"unique_seqs_count\"]) && datum[\"mean_mut_freq\"] !== null && !isNaN(datum[\"mean_mut_freq\"])"
            }
          ]
        }
      ],
      // SIGNALS
      signals: [
        {
          name: "PADDING_FRACTION",
          value: 0.02
        },
        {
          name: "PADDING_BUFFER_WIDTH",
          value: 100
        },
        {
          name: "PADDING_BUFFER_HEIGHT", 
          value: 150
        },
        {
          name: "width",
          update: "floor(windowSize()[0]*(1-2*PADDING_FRACTION))-PADDING_BUFFER_WIDTH",
          on: [
            {
              events: {source: "window", type: "resize"},
              update: "floor(windowSize()[0]*(1-2*PADDING_FRACTION))-PADDING_BUFFER_WIDTH"
            }
          ]
        },
        {
          name: "height",
          update: "floor(windowSize()[1]*(1-2*PADDING_FRACTION))-PADDING_BUFFER_HEIGHT",
          on: [
            {
              events: {source: "window", type: "resize"},
              update: "floor(windowSize()[1]*(1-2*PADDING_FRACTION))-PADDING_BUFFER_HEIGHT"
            }
          ]
        },
        {
          name: "layout_padding",
          value: 20
        },
        {
          name: "child_width",
          update: "width"
        },
        {
          name: "child_height", 
          update: "height"
        },
        // Dropdown menus
        {
          name: "yField",
          value: "mean_mut_freq",
          bind: {name: "Y variable ", input: "select", options: ["mean_mut_freq", "junction_length", "unique_seqs_count"]}
        },
        {
          name: "xField",
          value: "unique_seqs_count",
          bind: {name: "X variable ", input: "select", options: ["unique_seqs_count", "junction_length", "mean_mut_freq"]}
        },
        {
          name: "colorBy",
          value: "subject_id",
          bind: {name: "Color by ", input: "select", options: ["subject_id", "sample.timepoint_id", "sample.locus", "dataset.dataset_id"]}
        },
        {
          name: "shapeBy",
          value: "sample.timepoint_id",
          bind: {name: "Shape by ", input: "select", options: ["sample.timepoint_id", "subject_id", "v_call", "d_call", "j_call", "has_seed", "sample.locus"]}
        },
        {
          name: "sizeBy",
          value: "unique_seqs_count",
          bind: {name: "Size by ", input: "select", options: ["unique_seqs_count", "mean_mut_freq", "junction_length", "unique_sample"]}
        },
        {
          name: "filledShapes",
          value: false,
          bind: {name: "Filled shapes ", input: "checkbox"}
        },
        // Click signal
        {
          name: "clicked",
          value: null,
          on: [
            {
              events: "symbol:click",
              update: "datum",
              force: true
            }
          ]
        },
        // Brush signals
        {
          name: "brush_x",
          value: [],
          on: [
            {
              events: {source: "scope", type: "mousedown", filter: ["!event.item"]},
              update: "[x(), x()]"
            },
            {
              events: {source: "window", type: "mousemove", consume: true, between: [
                {source: "scope", type: "mousedown", filter: ["!event.item"]},
                {source: "window", type: "mouseup"}
              ]},
              update: "[brush_x[0], clamp(x(), 0, child_width)]"
            },
            {
              events: {signal: "brush_translate_delta"},
              update: "clampRange(panLinear(brush_translate_anchor.extent_x, brush_translate_delta.x / child_width), 0, child_width)"
            },
            {
              events: {signal: "brush_zoom_delta"},
              update: "clampRange(zoomLinear(brush_x, brush_zoom_anchor.x, brush_zoom_delta), 0, child_width)"
            }
          ]
        },
        {
          name: "brush_y",
          value: [],
          on: [
            {
              events: {source: "scope", type: "mousedown", filter: ["!event.item"]},
              update: "[y(), y()]"
            },
            {
              events: {source: "window", type: "mousemove", consume: true, between: [
                {source: "scope", type: "mousedown", filter: ["!event.item"]},
                {source: "window", type: "mouseup"}
              ]},
              update: "[brush_y[0], clamp(y(), 0, child_height)]"
            },
            {
              events: {signal: "brush_translate_delta"},
              update: "clampRange(panLinear(brush_translate_anchor.extent_y, brush_translate_delta.y / child_height), 0, child_height)"
            },
            {
              events: {signal: "brush_zoom_delta"},
              update: "clampRange(zoomLinear(brush_y, brush_zoom_anchor.y, brush_zoom_delta), 0, child_height)"
            }
          ]
        },
        {
          name: "brush_translate_anchor",
          value: {},
          on: [
            {
              events: [{source: "scope", type: "mousedown", markname: "brush"}],
              update: "{x: x(), y: y(), extent_x: brush_x, extent_y: brush_y}"
            }
          ]
        },
        {
          name: "brush_translate_delta",
          value: {},
          on: [
            {
              events: [{source: "window", type: "mousemove", consume: true, between: [
                {source: "scope", type: "mousedown", markname: "brush"},
                {source: "window", type: "mouseup"}
              ]}],
              update: "{x: brush_translate_anchor.x - x(), y: brush_translate_anchor.y - y()}"
            }
          ]
        },
        {
          name: "brush_zoom_anchor",
          value: {},
          on: [
            {
              events: [{source: "scope", type: "wheel", markname: "brush"}],
              update: "{x: x(), y: y()}"
            }
          ]
        },
        {
          name: "brush_zoom_delta",
          value: 1,
          on: [
            {
              events: [{source: "scope", type: "wheel", markname: "brush"}],
              force: true,
              update: "pow(1.001, event.deltaY * pow(16, event.deltaMode))"
            }
          ]
        },
        {
          name: "brush_x_field",
          value: [],
          on: [
            {
              events: {source: "scope", type: "dblclick"},
              update: "null"
            },
            {
              events: {signal: "brush_x"},
              update: "brush_x[0] === brush_x[1] ? null : invert('x', brush_x)"
            }
          ]
        },
        {
          name: "brush_y_field",
          value: [],
          on: [
            {
              events: {source: "scope", type: "dblclick"},
              update: "null"
            },
            {
              events: {signal: "brush_y"},
              update: "brush_y[0] === brush_y[1] ? null : invert('y', brush_y)"
            }
          ]
        },
        {
          name: "brush_selection",
          value: {},
          on: [
            {
              events: [
                {signal: "brush_x_field"},
                {signal: "brush_y_field"}
              ],
              update: "{intervals: { \"x\": { field: xField, extent: brush_x_field },  \"y\": { field: yField, extent: brush_y_field } } }",
              force: true
            }
          ]
        }
      ],
      // SCALES
      scales: [
        {
          name: "x",
          type: "linear",
          domain: {data: "data_0", field: {signal: "xField"}},
          range: [0, {signal: "child_width"}],
          nice: true,
          zero: false
        },
        {
          name: "y",
          type: "linear",
          domain: {data: "data_0", field: {signal: "yField"}},
          range: [{signal: "child_height"}, 0],
          nice: true,
          zero: false
        },
        {
          name: "size",
          type: "sqrt",
          domain: {data: "data_0", field: {signal: "sizeBy"}},
          range: [9, 361]
        },
        {
          name: "color",
          type: "ordinal",
          domain: {
            data: "data_0",
            field: {signal: "colorBy"},
            sort: true
          },
          range: {scheme: "category20"}
        },
        {
          name: "shape",
          type: "ordinal",
          domain: {
            data: "data_0",
            field: {signal: "shapeBy"},
            sort: true
          },
          range: ["circle", "square", "cross", "diamond", "triangle-up", "triangle-down", "triangle-right", "triangle-left"]
        }
      ],
      // LEGENDS
      legends: [
        {
          fill: "color",
          title: {signal: "colorBy"},
          titleFontSize: 13,
          labelFontSize: 12,
          symbolSize: 120,
          encode: {
            symbols: {
              update: {
                fillOpacity: {value: 0.9},
                stroke: {value: "transparent"}
              }
            }
          }
        },
        {
          shape: "shape",
          title: {signal: "shapeBy"},
          titleFontSize: 13,
          labelFontSize: 12,
          symbolSize: 120,
          encode: {
            symbols: {
              update: {
                fill: [
                  {
                    test: "!filledShapes",
                    value: "transparent"
                  },
                  {value: "#666"}
                ],
                stroke: [
                  {
                    test: "!filledShapes",
                    value: "#666"
                  },
                  {value: "transparent"}
                ],
                strokeWidth: {value: 2},
                fillOpacity: {value: 0.9}
              }
            }
          }
        }
      ],
      // MARKS
      marks: [
        {
          name: "marks",
          type: "symbol",
          style: ["point"],
          from: {data: "data_0"},
          encode: {
            update: {
              opacity: {value: 0.9},
              fill: [
                {
                  test: "!filledShapes",
                  value: "transparent"
                },
                {
                  test: "data('selected')[0] && data('selected')[0].ident === datum.ident",
                  value: "red"
                },
                {scale: "color", field: {signal: "colorBy"}}
              ],
              stroke: [
                {
                  test: "!filledShapes && data('selected')[0] && data('selected')[0].ident === datum.ident",
                  value: "red"
                },
                {
                  test: "!filledShapes",
                  scale: "color", 
                  field: {signal: "colorBy"}
                },
                {
                  test: "filledShapes",
                  value: "transparent"
                }
              ],
              strokeWidth: {
                value: 2
              },
              shape: {
                scale: "shape",
                field: {signal: "shapeBy"}
              },
              x: {scale: "x", field: {signal: "xField"}},
              y: {scale: "y", field: {signal: "yField"}},
              size: {scale: "size", field: {signal: "sizeBy"}},
              tooltip: {
                signal: "{\"Clone ID\": datum.ident, \"X\": datum[xField], \"Y\": datum[yField], \"Color\": datum[colorBy], \"Shape\": datum[shapeBy], \"Size\": datum[sizeBy]}"
              }
            },
            hover: {
              opacity: {value: 0.5},
              cursor: {value: "pointer"}
            }
          }
        },
        {
          name: "brush",
          type: "rect",
          encode: {
            enter: {
              fill: {value: "#333"},
              fillOpacity: {value: 0.125}
            },
            update: {
              x: {signal: "brush_x[0]"},
              y: {signal: "brush_y[0]"},
              x2: {signal: "brush_x[1]"},
              y2: {signal: "brush_y[1]"}
            }
          }
        }
      ],
      axes: [
        {
          scale: "x",
          orient: "bottom",
          grid: true,
          gridScale: "y",
          tickCount: {signal: "ceil(child_width/40)"},
          domain: false,
          labels: false,
          aria: false,
          maxExtent: 0,
          minExtent: 0,
          ticks: false,
          zindex: 0
        },
        {
          scale: "y",
          orient: "left",
          grid: true,
          gridScale: "x",
          tickCount: {signal: "ceil(child_height/40)"},
          domain: false,
          labels: false,
          aria: false,
          maxExtent: 0,
          minExtent: 0,
          ticks: false,
          zindex: 0
        },
        {
          scale: "x",
          orient: "bottom",
          grid: false,
          title: {signal: "xField"},
          titleFontSize: 14,
          labelFontSize: 12,
          labelFlush: true,
          labelOverlap: true,
          tickCount: {signal: "ceil(child_width/40)"},
          zindex: 1
        },
        {
          scale: "y",
          orient: "left",
          grid: false,
          title: {signal: "yField"},
          titleFontSize: 14,
          labelFontSize: 12,
          labelOverlap: true,
          tickCount: {signal: "ceil(child_height/40)"},
          zindex: 1
        }
      ]
    }
  );
};

export default facetClonalFamiliesVizSpec;