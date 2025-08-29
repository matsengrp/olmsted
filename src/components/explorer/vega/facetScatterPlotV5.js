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
          bind: {name: "Color by ", input: "select", options: ["<none>", "subject_id", "sample.timepoint_id", "sample.locus", "dataset.dataset_id"]}
        },
        {
          name: "shapeBy",
          value: "sample.timepoint_id",
          bind: {name: "Shape by ", input: "select", options: ["<none>", "sample.timepoint_id", "subject_id", "v_call", "d_call", "j_call", "has_seed", "sample.locus"]}
        },
        {
          name: "sizeBy",
          value: "unique_seqs_count",
          bind: {name: "Size by ", input: "select", options: ["<none>", "unique_seqs_count", "mean_mut_freq", "junction_length", "unique_sample"]}
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
        {
          name: "down",
          value: null,
          on: [
            {events: "mousedown", update: "xy()"},
            {events: "mouseup", update: "null"}
          ]
        },
        {
          name: "xcur",
          value: null,
          on: [
            {events: "mousedown", update: "slice(xdom)"}
          ]
        },
        {
          name: "ycur", 
          value: null,
          on: [
            {events: "mousedown", update: "slice(ydom)"}
          ]
        },
        {
          name: "delta",
          value: [0, 0],
          on: [
            {
              events: [{source: "window", type: "mousemove", consume: true, between: [{type: "mousedown"}, {source: "window", type: "mouseup"}]}],
              update: "down ? [down[0] - x(), down[1] - y()] : [0,0]"
            }
          ]
        },
        {
          name: "anchor",
          value: [0, 0],
          on: [
            {events: "wheel", update: "[invert('x', x()), invert('y', y())]"}
          ]
        },
        {
          name: "zoom",
          value: 1,
          on: [
            {
              events: "wheel!",
              force: true,
              update: "pow(1.001, event.deltaY * pow(16, event.deltaMode))"
            }
          ]
        },
        {
          name: "xdom",
          init: "extent(data('data_0'), xField)",
          on: [
            {
              events: "signal:xField",
              update: "extent(data('data_0'), xField)"
            },
            {
              events: "dblclick",
              update: "extent(data('data_0'), xField)"
            },
            {
              events: "signal:delta",
              update: "[xcur[0] + delta[0] / child_width * (xcur[1] - xcur[0]), xcur[1] + delta[0] / child_width * (xcur[1] - xcur[0])]"
            },
            {
              events: "signal:zoom",
              update: "[anchor[0] + (xdom[0] - anchor[0]) * zoom, anchor[0] + (xdom[1] - anchor[0]) * zoom]"
            }
          ]
        },
        {
          name: "ydom", 
          init: "extent(data('data_0'), yField)",
          on: [
            {
              events: "signal:yField",
              update: "extent(data('data_0'), yField)"
            },
            {
              events: "dblclick",
              update: "extent(data('data_0'), yField)"
            },
            {
              events: "signal:delta",
              update: "[ycur[0] - delta[1] / child_height * (ycur[1] - ycur[0]), ycur[1] - delta[1] / child_height * (ycur[1] - ycur[0])]"
            },
            {
              events: "signal:zoom", 
              update: "[anchor[1] + (ydom[0] - anchor[1]) * zoom, anchor[1] + (ydom[1] - anchor[1]) * zoom]"
            }
          ]
        }
      ],
      // SCALES
      scales: [
        {
          name: "x",
          type: "linear",
          domain: {signal: "xdom"},
          range: [0, {signal: "child_width"}],
          nice: false,
          zero: false
        },
        {
          name: "y",
          type: "linear",
          domain: {signal: "ydom"},
          range: [{signal: "child_height"}, 0],
          nice: false,
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
                {
                  test: "colorBy === '<none>'",
                  value: "#4682b4"
                },
                {scale: "color", field: {signal: "colorBy"}}
              ],
              stroke: [
                {
                  test: "!filledShapes && data('selected')[0] && data('selected')[0].ident === datum.ident",
                  value: "red"
                },
                {
                  test: "!filledShapes && colorBy === '<none>'",
                  value: "#4682b4"
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
              shape: [
                {
                  test: "shapeBy === '<none>'",
                  value: "circle"
                },
                {
                  scale: "shape",
                  field: {signal: "shapeBy"}
                }
              ],
              x: {scale: "x", field: {signal: "xField"}},
              y: {scale: "y", field: {signal: "yField"}},
              size: [
                {
                  test: "sizeBy === '<none>'",
                  value: 100
                },
                {scale: "size", field: {signal: "sizeBy"}}
              ],
              tooltip: {
                signal: "{\"Clone ID\": datum.ident, \"X\": datum[xField], \"Y\": datum[yField], \"Color\": datum[colorBy], \"Shape\": datum[shapeBy], \"Size\": datum[sizeBy]}"
              }
            },
            hover: {
              opacity: {value: 0.5},
              cursor: {value: "pointer"}
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