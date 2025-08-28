const facetClonalFamiliesVizSpec = () => {
  return (
    {
      $schema: "https://vega.github.io/schema/vega/v5.json",
      autosize: {type: "pad"},
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
            parse: {unique_seqs_count: "number", mean_mut_freq: "number"},
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
          value: 0.05
        },
        {
          name: "BUFFER",
          value: 15
        },
        {
          name: "child_width",
          update: "(width - BUFFER * 2 * PADDING_FRACTION * width) - BUFFER"
        },
        {
          name: "child_height",
          update: "(height - BUFFER * 2 * PADDING_FRACTION * height) - BUFFER"
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
          name: "sizeBy",
          value: "unique_seqs_count",
          bind: {name: "Size by ", input: "select", options: ["unique_seqs_count", "mean_mut_freq", "junction_length", "unique_sample"]}
        }
      ],
      // SCALES
      scales: [
        {
          name: "color_scale",
          type: "ordinal",
          range: {scheme: "category20"},
          domain: {
            fields: [
              {data: "data_0", field: {signal: "colorBy"}}
            ]
          }
        }
      ],
      // MARKS
      marks: [
        {
          name: "cell",
          type: "group",
          encode: {
            update: {
              width: {signal: "child_width"},
              height: {signal: "child_height"}
            }
          },
          signals: [
            {
              name: "brush_x",
              value: [],
              on: [
                {
                  events: {source: "scope", type: "mousedown", filter: ["!event.item", "event.shiftKey"]},
                  update: "[x(unit), x(unit)]"
                },
                {
                  events: {source: "scope", type: "mousemove", between: [
                    {source: "scope", type: "mousedown", filter: ["!event.item", "event.shiftKey"]},
                    {source: "scope", type: "mouseup"}
                  ]},
                  update: "[brush_x[0], clamp(x(unit), 0, child_width)]"
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
                  events: {source: "scope", type: "mousedown", filter: ["!event.item", "event.shiftKey"]},
                  update: "[y(unit), y(unit)]"
                },
                {
                  events: {source: "scope", type: "mousemove", between: [
                    {source: "scope", type: "mousedown", filter: ["!event.item", "event.shiftKey"]},
                    {source: "scope", type: "mouseup"}
                  ]},
                  update: "[brush_y[0], clamp(y(unit), 0, child_height)]"
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
                  update: "{x: x(unit), y: y(unit), extent_x: brush_x, extent_y: brush_y}"
                }
              ]
            },
            {
              name: "brush_translate_delta",
              value: {},
              on: [
                {
                  events: [{source: "scope", type: "mousemove", between: [
                    {source: "scope", type: "mousedown", markname: "brush"},
                    {source: "scope", type: "mouseup"}
                  ]}],
                  update: "{x: brush_translate_anchor.x - x(unit), y: brush_translate_anchor.y - y(unit)}"
                }
              ]
            },
            {
              name: "brush_zoom_anchor",
              value: {},
              on: [
                {
                  events: [{source: "scope", type: "wheel", markname: "brush"}],
                  update: "{x: x(unit), y: y(unit)}"
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
                  events: {
                    signal: "brush_x"
                  },
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
                  events: {
                    signal: "brush_y"
                  },
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
                      test: "data('selected')[0].ident === datum.ident",
                      value: "red"
                    },
                    {scale: "color_scale", field: {signal: "colorBy"}}
                  ],
                  x: {scale: "x", field: {signal: "xField"}},
                  y: {scale: "y", field: {signal: "yField"}},
                  size: {scale: "size", field: {signal: "sizeBy"}},
                  shape: {value: "circle"}
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
          scales: [
            {
              name: "x",
              type: "linear",
              domain: {
                fields: [
                  {data: "data_0", field: {signal: "xField"}}
                ]
              },
              range: [0, {signal: "child_width"}],
              nice: true,
              zero: false
            },
            {
              name: "y",
              type: "linear",
              domain: {
                fields: [
                  {data: "data_0", field: {signal: "yField"}}
                ]
              },
              range: [{signal: "child_height"}, 0],
              nice: true,
              zero: false
            },
            {
              name: "size",
              type: "sqrt",
              domain: {
                fields: [
                  {data: "data_0", field: {signal: "sizeBy"}}
                ]
              },
              range: [9, 361]
            }
          ],
          axes: [
            {
              scale: "x",
              orient: "bottom",
              labelAngle: 0,
              title: {signal: "xField"}
            },
            {
              scale: "y",
              orient: "left",
              title: {signal: "yField"}
            }
          ]
        }
      ]
    }
  );
};

export default facetClonalFamiliesVizSpec;