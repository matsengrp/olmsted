/* eslint-disable eqeqeq */
// Note: Vega expressions use == for comparison within expression strings
// These are not JavaScript expressions but Vega's domain-specific language

// Helper function to create data configuration
const createDataConfiguration = () => [
  { name: "pts_store" },
  { name: "selected" },
  { name: "locus" },
  { name: "datasets" },
  {
    name: "brush_store",
    on: [
      { trigger: "brush_selection", insert: "brush_selection", remove: true },
      { trigger: "facet_by_signal", remove: true }
    ]
  },
  { name: "source" },
  {
    name: "data_0",
    source: "source",
    format: {
      type: "json",
      parse: { unique_seqs_count: "number", mean_mut_freq: "number" },
      copy: true
    },
    // eslint-disable-next-line no-use-before-define
    transform: createDataTransforms()
  },
  {
    name: "column_domain",
    source: "data_0",
    transform: [
      { type: "aggregate", groupby: [{ signal: "facet_by_signal" }] },
      { type: "formula", expr: "datum[facet_by_signal]", as: "facet_by_field" }
    ]
  }
];

// Helper function to create data transformations
const createDataTransforms = () => [
  // Get nested data at top level
  {
    type: "formula",
    expr: 'datum["sample"] && datum["sample"]["timepoint_id"]',
    as: "sample.timepoint_id"
  },
  {
    type: "formula",
    expr: 'datum["sample"] && datum["sample"]["locus"]',
    as: "sample.locus"
  },
  {
    type: "formula",
    expr: 'datum["dataset"] && datum["dataset"]["dataset_id"]',
    as: "dataset.dataset_id"
  },
  {
    type: "lookup",
    from: "datasets",
    key: "dataset_id",
    fields: ["dataset_id"],
    values: ["name", "dataset_id"]
  },
  {
    type: "formula",
    expr: "datum.name || datum.dataset_id",
    as: "dataset_name"
  },
  {
    type: "filter",
    expr: 'datum["unique_seqs_count"] !== null && !isNaN(datum["unique_seqs_count"]) && datum["mean_mut_freq"] !== null && !isNaN(datum["mean_mut_freq"])'
  },
  // Add the facet by field work around
  { type: "formula", expr: "datum[facet_by_signal]", as: "facet_by_field" }
];

// Helper function to create layout signals
const createLayoutSignals = () => [
  { name: "PADDING_FRACTION", value: 0.05 },
  { name: "PADDING_BUFFER_WIDTH", value: 150 },
  { name: "PADDING_BUFFER_HEIGHT", value: 125 },
  {
    name: "width",
    update: "floor(windowSize()[0]*(1-2*PADDING_FRACTION))-PADDING_BUFFER_WIDTH",
    on: [
      {
        events: { source: "window", type: "resize" },
        update: "floor(windowSize()[0]*(1-2*PADDING_FRACTION))-PADDING_BUFFER_WIDTH"
      }
    ]
  },
  {
    name: "height",
    update: "floor(windowSize()[1]*(1-2*PADDING_FRACTION))-PADDING_BUFFER_HEIGHT",
    on: [
      {
        events: { source: "window", type: "resize" },
        update: "floor(windowSize()[1]*(1-2*PADDING_FRACTION))-PADDING_BUFFER_HEIGHT"
      }
    ]
  },
  { name: "layout_padding", value: 10 },
  { name: "len_col_domain", update: "clamp(length(data('column_domain')), 1, 100)" },
  { name: "child_width", update: "width/len_col_domain-layout_padding" },
  { name: "child_height", update: "height" }
];

// Helper function to create selection signals
const createSelectionSignals = () => [
  {
    name: "pts",
    update: 'data("pts_store").length && {_vgsid_: data("pts_store")[0]}'
  },
  {
    name: "pts_tuple",
    value: {},
    on: [
      {
        events: [{ source: "scope", type: "click" }],
        update: "datum && item().mark.marktype == 'symbol' ? datum : null"
      }
    ]
  },
  {
    name: "pts_modify",
    on: [
      {
        events: { signal: "pts_tuple" },
        update: 'modify("pts_store", pts_tuple, true)'
      }
    ]
  },
  {
    name: "clicked",
    value: null,
    on: [
      {
        events: { signal: "pts_tuple" },
        update: "pts_tuple"
      }
    ]
  },
  { name: "brush_store_signal", update: 'data("brush_store")' },
  { name: "brush_selection", value: null },
  { name: "brushed_facet_value", value: null },
  { name: "cell", value: null },
  {
    name: "mouseDown",
    on: [
      {
        // Only track mousedown for selection when in select mode
        events: { source: "scope", type: "mousedown", consume: true },
        update: "interaction_mode === 'select' ? [x(cell), y(cell)] : null"
      }
    ]
  },
  {
    name: "mouseUp",
    on: [
      {
        // Only track mouseup for selection when in select mode
        events: { source: "window", type: "mouseup" },
        update: "interaction_mode === 'select' ? [x(cell), y(cell)] : null"
      }
    ]
  }
];

// Helper function to create control signals (dropdowns)
const createControlSignals = () => [
  {
    name: "facet_by_signal",
    value: "<none>",
    bind: {
      name: "Facet by field ",
      input: "select",
      options: ["<none>", "has_seed", "dataset_name", "subject_id", "sample.timepoint_id", "sample.locus"]
    }
  },
  {
    name: "yField",
    value: "mean_mut_freq",
    bind: {
      name: "Y variable ",
      input: "select",
      options: ["mean_mut_freq", "junction_length", "unique_seqs_count"]
    }
  },
  {
    name: "xField",
    value: "unique_seqs_count",
    bind: {
      name: "X variable ",
      input: "select",
      options: ["unique_seqs_count", "junction_length", "mean_mut_freq"]
    }
  },
  {
    name: "colorBy",
    value: "<none>",
    bind: {
      name: "Color by ",
      input: "select",
      options: ["<none>", "subject_id", "sample.timepoint_id", "v_call", "d_call", "j_call", "has_seed", "sample.locus"]
    }
  },
  {
    name: "shapeBy",
    value: "<none>",
    bind: {
      name: "Shape by ",
      input: "select",
      options: ["<none>", "sample.timepoint_id", "subject_id", "v_call", "d_call", "j_call", "has_seed", "sample.locus"]
    }
  },
  {
    name: "sizeBy",
    value: "<none>",
    bind: {
      name: "Size by ",
      input: "select",
      options: ["<none>", "unique_seqs_count", "mean_mut_freq", "junction_length"]
    }
  },
  {
    name: "symbolSize",
    value: 1,
    bind: {
      name: "Symbol size ",
      input: "range",
      min: 0.1,
      max: 3,
      step: 0.1
    }
  },
  {
    name: "symbolOpacity",
    value: 0.4,
    bind: {
      name: "Symbol opacity ",
      input: "range",
      min: 0.1,
      max: 1,
      step: 0.05
    }
  },
  {
    name: "filledShapes",
    value: false,
    bind: {
      input: "checkbox",
      name: "Filled shapes"
    }
  },
  {
    name: "brush_x_field",
    value: null,
    on: [{ events: { signal: "facet_by_signal" }, update: "null" }]
  },
  {
    name: "brush_y_field",
    value: null,
    on: [{ events: { signal: "facet_by_signal" }, update: "null" }]
  },
  {
    name: "locus_value",
    update: "data('locus').length ? data('locus')[0].locus : null"
  }
];

// Helper function to create zoom/pan signals
const createZoomPanSignals = () => [
  // Base interaction mode set by clicking buttons: "select" or "zoom"
  {
    name: "interaction_mode_base",
    value: "select",
    on: [
      {
        // Click on select button or its text
        events: [
          { source: "scope", type: "click", markname: "select_button_bg" },
          { source: "scope", type: "click", markname: "select_button_text" }
        ],
        update: "'select'"
      },
      {
        // Click on zoom button or its text
        events: [
          { source: "scope", type: "click", markname: "zoom_button_bg" },
          { source: "scope", type: "click", markname: "zoom_button_text" }
        ],
        update: "'zoom'"
      }
    ]
  },
  // Track if Shift key is held
  {
    name: "shift_held",
    value: false,
    on: [
      {
        events: { source: "window", type: "keydown", filter: ["event.key === 'Shift'"] },
        update: "true"
      },
      {
        events: { source: "window", type: "keyup", filter: ["event.key === 'Shift'"] },
        update: "false"
      }
    ]
  },
  // Effective interaction mode: base mode XOR shift_held
  // When shift is held, mode is toggled to opposite
  {
    name: "interaction_mode",
    update: "shift_held ? (interaction_mode_base === 'select' ? 'zoom' : 'select') : interaction_mode_base"
  },
  // Multi-select mode removed - see issue #114 for future implementation
  // Clear selection signal - increments when clear button is clicked
  // React component listens for changes to trigger selection clear
  {
    name: "clear_selection_trigger",
    value: 0,
    on: [
      {
        events: [
          { source: "scope", type: "click", markname: "clear_button_bg" },
          { source: "scope", type: "click", markname: "clear_button_text" }
        ],
        update: "clear_selection_trigger + 1"
      }
    ]
  },
  // Show/hide all in-plot controls (buttons and zoom/pan info)
  {
    name: "show_controls",
    value: true,
    bind: {
      name: "Show controls",
      input: "checkbox"
    }
  },
  // Track whether the visualization is focused (user clicked on it)
  // When focused, wheel events will zoom; when unfocused, page scrolls normally
  {
    name: "viz_focused",
    value: false,
    on: [
      {
        // Set to true when user clicks anywhere in the plot
        events: { source: "scope", type: "mousedown" },
        update: "true"
      }
    ]
  },
  // Track which button is currently clicked (for visual feedback)
  // Resets to null on mouseup
  {
    name: "clicked_button",
    value: null,
    on: [
      {
        events: { source: "scope", type: "mousedown", markname: "reset_button_bg" },
        update: "'reset'"
      },
      {
        events: { source: "scope", type: "mousedown", markname: "reset_button_text" },
        update: "'reset'"
      },
      {
        events: { source: "scope", type: "mousedown", markname: "clear_button_bg" },
        update: "'clear'"
      },
      {
        events: { source: "scope", type: "mousedown", markname: "clear_button_text" },
        update: "'clear'"
      },
      {
        events: { source: "scope", type: "mousedown", markname: "zoom_in_button_bg" },
        update: "'zoom_in'"
      },
      {
        events: { source: "scope", type: "mousedown", markname: "zoom_in_button_text" },
        update: "'zoom_in'"
      },
      {
        events: { source: "scope", type: "mousedown", markname: "zoom_out_button_bg" },
        update: "'zoom_out'"
      },
      {
        events: { source: "scope", type: "mousedown", markname: "zoom_out_button_text" },
        update: "'zoom_out'"
      },
      {
        events: { source: "window", type: "mouseup" },
        update: "null"
      }
    ]
  },
  // Zoom level signal (1.0 = no zoom, <1 = zoomed out, >1 = zoomed in)
  // Range is 0.1 to 10 (1/10x to 10x), default 0.9
  {
    name: "zoom_level",
    value: 0.9,
    on: [
      {
        // Zoom in button clicked (~20% per click, similar to 2 wheel scrolls)
        events: [
          { source: "scope", type: "click", markname: "zoom_in_button_bg" },
          { source: "scope", type: "click", markname: "zoom_in_button_text" }
        ],
        update: "clamp(zoom_level * 1.2, 0.1, 10)"
      },
      {
        // Zoom out button clicked (~20% per click, similar to 2 wheel scrolls)
        events: [
          { source: "scope", type: "click", markname: "zoom_out_button_bg" },
          { source: "scope", type: "click", markname: "zoom_out_button_text" }
        ],
        update: "clamp(zoom_level / 1.2, 0.1, 10)"
      },
      {
        // Scroll to zoom when focused and in zoom mode
        // Don't consume - let React handle scroll prevention based on focus state
        events: { type: "wheel" },
        update: "viz_focused && interaction_mode === 'zoom' ? clamp(zoom_level * pow(1.001, -event.deltaY), 0.1, 10) : zoom_level"
      },
      {
        // Doubleclick to reset zoom/pan (when in zoom mode)
        events: { type: "dblclick" },
        update: "interaction_mode === 'zoom' ? 0.9 : zoom_level"
      },
      {
        // Reset zoom when facet changes
        events: { signal: "facet_by_signal" },
        update: "0.9"
      },
      {
        // Reset button clicked
        events: [
          { source: "scope", type: "click", markname: "reset_button_bg" },
          { source: "scope", type: "click", markname: "reset_button_text" }
        ],
        update: "0.9"
      }
    ]
  },
  // Pan offset signals for x and y
  {
    name: "pan_x",
    value: 0,
    on: [
      {
        // Drag to pan when in zoom mode (inverted: drag right moves view left)
        events: { type: "mousemove", between: [{ type: "mousedown" }, { type: "mouseup" }] },
        update: "interaction_mode === 'zoom' ? pan_x - event.movementX / child_width / zoom_level : pan_x"
      },
      {
        // Doubleclick to reset zoom/pan (when in zoom mode)
        events: { type: "dblclick" },
        update: "interaction_mode === 'zoom' ? 0 : pan_x"
      },
      {
        // Reset pan when facet changes
        events: { signal: "facet_by_signal" },
        update: "0"
      },
      {
        // Reset button clicked
        events: [
          { source: "scope", type: "click", markname: "reset_button_bg" },
          { source: "scope", type: "click", markname: "reset_button_text" }
        ],
        update: "0"
      }
    ]
  },
  {
    name: "pan_y",
    value: 0,
    on: [
      {
        // Drag to pan when in zoom mode (inverted: drag down moves view up)
        events: { type: "mousemove", between: [{ type: "mousedown" }, { type: "mouseup" }] },
        update: "interaction_mode === 'zoom' ? pan_y + event.movementY / child_height / zoom_level : pan_y"
      },
      {
        // Doubleclick to reset zoom/pan (when in zoom mode)
        events: { type: "dblclick" },
        update: "interaction_mode === 'zoom' ? 0 : pan_y"
      },
      {
        // Reset pan when facet changes
        events: { signal: "facet_by_signal" },
        update: "0"
      },
      {
        // Reset button clicked
        events: [
          { source: "scope", type: "click", markname: "reset_button_bg" },
          { source: "scope", type: "click", markname: "reset_button_text" }
        ],
        update: "0"
      }
    ]
  },
  // Helper signals for calculating zoomed/panned domains
  {
    name: "x_domain_raw",
    update: "extent(pluck(data('data_0'), xField))"
  },
  {
    name: "y_domain_raw",
    update: "extent(pluck(data('data_0'), yField))"
  },
  {
    name: "x_domain_zoomed",
    update: "[x_domain_raw[0] + (x_domain_raw[1] - x_domain_raw[0]) * (0.5 - 0.5/zoom_level + pan_x), x_domain_raw[0] + (x_domain_raw[1] - x_domain_raw[0]) * (0.5 + 0.5/zoom_level + pan_x)]"
  },
  {
    name: "y_domain_zoomed",
    update: "[y_domain_raw[0] + (y_domain_raw[1] - y_domain_raw[0]) * (0.5 - 0.5/zoom_level + pan_y), y_domain_raw[0] + (y_domain_raw[1] - y_domain_raw[0]) * (0.5 + 0.5/zoom_level + pan_y)]"
  },
  // Signal to track if zoom/pan is active (different from default state)
  {
    name: "zoom_pan_active",
    update: "zoom_level !== 1 || pan_x !== 0 || pan_y !== 0"
  }
];

// Helper function to create all signals
const createSignals = () => [...createLayoutSignals(), ...createSelectionSignals(), ...createControlSignals(), ...createZoomPanSignals()];

// Helper function to create scales configuration
const createScales = () => [
  {
    name: "x",
    type: "linear",
    domain: { signal: "x_domain_zoomed" },
    range: [0, { signal: "child_width" }],
    nice: false,
    zero: false
  },
  {
    name: "y",
    type: "linear",
    domain: { signal: "y_domain_zoomed" },
    range: [{ signal: "child_height" }, 0],
    nice: false,
    zero: false
  },
  {
    name: "color",
    type: "ordinal",
    domain: {
      data: "data_0",
      field: { signal: "colorBy" },
      sort: true
    },
    range: { scheme: "category10" }
  },
  {
    name: "shape",
    type: "ordinal",
    domain: {
      data: "data_0",
      field: { signal: "shapeBy" },
      sort: true
    },
    range: "symbol"
  },
  {
    name: "size",
    type: "sqrt",
    domain: {
      signal: "sizeBy === '<none>' ? [0, 100] : extent(pluck(data('data_0'), sizeBy))"
    },
    range: [9, 361],
    nice: true,
    zero: true
  }
];

// Helper function to create legends configuration
const createLegends = () => [
  {
    stroke: "color",
    title: { signal: "colorBy" },
    encode: {
      symbols: {
        update: {
          fill: { value: "transparent" },
          opacity: { value: 0.35 }
        }
      }
    }
  },
  {
    shape: "shape",
    title: { signal: "shapeBy" },
    encode: {
      symbols: {
        update: {
          fill: { value: "transparent" },
          opacity: { value: 0.35 }
        }
      }
    }
  }
];

// Helper function to create layout configuration
const createLayout = () => ({
  padding: { row: { signal: "layout_padding" }, column: { signal: "layout_padding" } },
  offset: { columnTitle: 10 },
  columns: { signal: "len_col_domain" },
  bounds: "full",
  align: "all"
});

// Helper function to create header marks
const createHeaderMarks = () => [
  {
    name: "column-title",
    type: "group",
    role: "column-title",
    title: {
      text: { signal: "facet_by_signal == '<none>' ? '' : facet_by_signal" },
      offset: 10,
      style: "guide-title"
    }
  },
  {
    name: "row_header",
    type: "group",
    role: "row-header",
    encode: { update: { height: { signal: "child_height" } } },
    axes: [
      {
        scale: "y",
        orient: "left",
        grid: false,
        title: { signal: "yField" },
        labelOverlap: true,
        tickCount: { signal: "ceil(child_height/40)" },
        zindex: 1
      }
    ]
  },
  {
    name: "column_header",
    type: "group",
    role: "column-header",
    from: { data: "column_domain" },
    sort: { field: 'datum["facet_by_field"]', order: "ascending" },
    title: {
      text: { signal: "'' + (toString(parent[\"facet_by_field\"]) ? parent[\"facet_by_field\"] : '')" },
      offset: 10,
      style: "guide-label",
      baseline: "middle"
    },
    encode: { update: { width: { signal: "child_width" } } }
  },
  {
    name: "column_footer",
    type: "group",
    role: "column-footer",
    from: { data: "column_domain" },
    sort: { field: 'datum["facet_by_field"]', order: "ascending" },
    encode: { update: { width: { signal: "child_width" } } },
    axes: [
      {
        scale: "x",
        orient: "bottom",
        grid: false,
        title: { signal: "xField" },
        labelFlush: true,
        labelOverlap: true,
        tickCount: { signal: "ceil(child_width/40)" },
        zindex: 1
      }
    ]
  }
];

// Helper function to create cell-level signals for brushing
const createCellSignals = () => [
  {
    name: "facet",
    value: {},
    on: [
      {
        events: [{ source: "scope", type: "mousemove" }],
        update: 'isTuple(facet) ? facet : group("cell").datum'
      }
    ]
  },
  {
    name: "local_facet_value",
    update: "facet_by_signal !== \"<none>\" ? facet.facet_by_field : '<none>'"
  },
  {
    name: "brush_test",
    update:
      'data("brush_store").length && (local_facet_value !== "<none>" ? (data("brush_store")[0].facetValue === facet.facet_by_field) : true)'
  },
  {
    name: "brushed_facet_value",
    push: "outer",
    on: [
      {
        // Only update brushed facet when in select mode
        events: { source: "scope", type: "mousedown", markname: "cell" },
        update: "interaction_mode === 'select' ? [facet_by_signal, facet.facet_by_field] : brushed_facet_value"
      }
    ]
  },
  {
    name: "cell",
    push: "outer",
    on: [
      {
        // Only start cell selection when in select mode
        events: { source: "scope", type: "mousedown", markname: "cell" },
        update: "interaction_mode === 'select' ? group() : cell"
      },
      { events: "@cell:mouseup", update: "!span(brush_x) && !span(brush_y) ? null : cell" }
    ]
  },
  // eslint-disable-next-line no-use-before-define
  ...createBrushSignals()
];

// Helper function to create brush-specific signals
const createBrushSignals = () => [
  {
    name: "brush_x",
    value: [],
    on: [
      {
        // Start brush when in select mode
        events: {
          source: "scope",
          type: "mousedown",
          filter: ['!event.item || event.item.mark.name !== "brush_brush"', "inScope(event.item)"]
        },
        update: "interaction_mode === 'select' ? [x(cell), x(cell)] : brush_x"
      },
      {
        // Extend brush during drag when in select mode
        events: {
          source: "window",
          type: "mousemove",
          between: [
            {
              source: "scope",
              type: "mousedown",
              filter: ['!event.item || event.item.mark.name !== "brush_brush"', "inScope(event.item)"]
            },
            { source: "window", type: "mouseup" }
          ]
        },
        update: "interaction_mode === 'select' ? [brush_x[0], clamp(x(cell), 0, child_width)] : brush_x"
      },
      {
        events: { signal: "brush_translate_delta" },
        update:
          "clampRange(panLinear(brush_translate_anchor.extent_x, brush_translate_delta.x / span(brush_translate_anchor.extent_x)), 0, child_width)"
      }
    ]
  },
  {
    name: "brush_y",
    value: [],
    on: [
      {
        // Start brush when in select mode
        events: {
          source: "scope",
          type: "mousedown",
          filter: ['!event.item || event.item.mark.name !== "brush_brush"', "inScope(event.item)"]
        },
        update: "interaction_mode === 'select' ? [y(cell), y(cell)] : brush_y"
      },
      {
        // Extend brush during drag when in select mode
        events: {
          source: "window",
          type: "mousemove",
          between: [
            {
              source: "scope",
              type: "mousedown",
              filter: ['!event.item || event.item.mark.name !== "brush_brush"', "inScope(event.item)"]
            },
            { source: "window", type: "mouseup" }
          ]
        },
        update: "interaction_mode === 'select' ? [brush_y[0], clamp(y(cell), 0, child_height)] : brush_y"
      },
      {
        events: { signal: "brush_translate_delta" },
        update:
          "clampRange(panLinear(brush_translate_anchor.extent_y, brush_translate_delta.y / span(brush_translate_anchor.extent_y)), 0, child_height)"
      }
    ]
  },
  // eslint-disable-next-line no-use-before-define
  ...createBrushTranslateSignals()
];

// Helper function for brush translate signals
const createBrushTranslateSignals = () => [
  {
    name: "brush_translate_anchor",
    value: {},
    on: [
      {
        events: [{ source: "scope", type: "mousedown", markname: "brush_brush" }],
        update: "{x: x(cell), y: y(cell), extent_x: slice(brush_x), extent_y: slice(brush_y)}"
      }
    ]
  },
  {
    name: "brush_translate_delta",
    value: {},
    on: [
      {
        events: [
          {
            source: "window",
            type: "mousemove",
            between: [
              { source: "scope", type: "mousedown", markname: "brush_brush" },
              { source: "window", type: "mouseup" }
            ]
          }
        ],
        update: "{x: brush_translate_anchor.x - x(cell), y: brush_translate_anchor.y - y(cell)}"
      }
    ]
  },
  {
    name: "brush_x_field",
    push: "outer",
    on: [
      {
        events: { signal: "brush_x" },
        update: "brush_x[0] === brush_x[1] ? null : invert('x', brush_x)",
        force: true
      }
    ]
  },
  {
    name: "brush_y_field",
    push: "outer",
    on: [
      {
        events: { signal: "brush_y" },
        update: "brush_y[0] === brush_y[1] ? null : invert('y', brush_y)",
        force: true
      }
    ]
  },
  {
    name: "brush_selection",
    push: "outer",
    on: [
      {
        // Only finalize brush selection when in select mode
        events: { source: "scope", type: "mouseup", markname: "cell" },
        update:
          "interaction_mode === 'select' && span(brush_x) && span(brush_y) ? pluck(data('facet'), 'clone_id', 'inrange(datum[xField], brush_x) && inrange(datum[yField], brush_y)') : brush_selection"
      }
    ]
  }
];

// Helper function to create brush marks
const createBrushMarks = () => [
  {
    name: "brush_brush_bg",
    type: "rect",
    clip: true,
    encode: {
      enter: {
        fill: { value: "#333" },
        fillOpacity: { value: 0.125 }
      },
      update: {
        x: [{ test: "brush_test", signal: "brush_x[0]" }, { value: 0 }],
        y: [{ test: "brush_test", signal: "brush_y[0]" }, { value: 0 }],
        x2: [{ test: "brush_test", signal: "brush_x[1]" }, { value: 0 }],
        y2: [{ test: "brush_test", signal: "brush_y[1]" }, { value: 0 }]
      }
    }
  },
  {
    name: "child_marks",
    type: "symbol",
    style: ["point"],
    from: { data: "facet" },
    clip: true,
    encode: {
      // eslint-disable-next-line no-use-before-define
      update: createSymbolEncoding()
    }
  },
  {
    name: "brush_brush",
    type: "rect",
    clip: true,
    interactive: false,
    encode: {
      enter: { fill: { value: "transparent" } },
      update: {
        x: [{ test: "brush_test", signal: "brush_x[0]" }, { value: 0 }],
        y: [{ test: "brush_test", signal: "brush_y[0]" }, { value: 0 }],
        x2: [{ test: "brush_test", signal: "brush_x[1]" }, { value: 0 }],
        y2: [{ test: "brush_test", signal: "brush_y[1]" }, { value: 0 }],
        stroke: [{ test: "brush_x[0] !== brush_x[1] && brush_y[0] !== brush_y[1]", value: "white" }, { value: null }]
      }
    }
  },
  // Mode toggle button - Select Mode
  {
    name: "select_button_bg",
    type: "rect",
    encode: {
      enter: {
        cursor: { value: "pointer" }
      },
      update: {
        x: { signal: "child_width - 115" },
        y: { value: 5 },
        width: { value: 105 },
        height: { value: 22 },
        fill: { signal: "interaction_mode === 'select' ? '#4682b4' : '#fff'" },
        stroke: { value: "#999" },
        strokeWidth: { value: 1 },
        cornerRadius: { value: 3 },
        fillOpacity: { signal: "show_controls ? 1 : 0" },
        strokeOpacity: { signal: "show_controls ? 1 : 0" }
      }
    }
  },
  {
    name: "select_button_text",
    type: "text",
    encode: {
      enter: {
        cursor: { value: "pointer" }
      },
      update: {
        x: { signal: "child_width - 62" },
        y: { value: 20 },
        text: { value: "Select Mode" },
        fontSize: { value: 12 },
        fontWeight: { value: "normal" },
        fill: { signal: "interaction_mode === 'select' ? '#fff' : '#333'" },
        align: { value: "center" },
        baseline: { value: "bottom" },
        opacity: { signal: "show_controls ? 1 : 0" }
      }
    }
  },
  // Mode toggle button - Pan/Zoom Mode
  {
    name: "zoom_button_bg",
    type: "rect",
    encode: {
      enter: {
        cursor: { value: "pointer" }
      },
      update: {
        x: { signal: "child_width - 115" },
        y: { value: 30 },
        width: { value: 105 },
        height: { value: 22 },
        fill: { signal: "interaction_mode === 'zoom' ? '#4682b4' : '#fff'" },
        stroke: { value: "#999" },
        strokeWidth: { value: 1 },
        cornerRadius: { value: 3 },
        fillOpacity: { signal: "show_controls ? 1 : 0" },
        strokeOpacity: { signal: "show_controls ? 1 : 0" }
      }
    }
  },
  {
    name: "zoom_button_text",
    type: "text",
    encode: {
      enter: {
        cursor: { value: "pointer" }
      },
      update: {
        x: { signal: "child_width - 62" },
        y: { value: 45 },
        text: { value: "Pan/Zoom Mode" },
        fontSize: { value: 12 },
        fontWeight: { value: "normal" },
        fill: { signal: "interaction_mode === 'zoom' ? '#fff' : '#333'" },
        align: { value: "center" },
        baseline: { value: "bottom" },
        opacity: { signal: "show_controls ? 1 : 0" }
      }
    }
  },
  // Multi-Select Mode button removed - see issue #114 for future implementation
  // Reset View button
  {
    name: "reset_button_bg",
    type: "rect",
    encode: {
      enter: {
        cursor: { value: "pointer" }
      },
      update: {
        x: { signal: "child_width - 115" },
        y: { value: 80 },
        width: { value: 105 },
        height: { value: 22 },
        fill: { signal: "clicked_button === 'reset' ? '#5a9fd4' : '#fff'" },
        stroke: { value: "#999" },
        strokeWidth: { value: 1 },
        cornerRadius: { value: 3 },
        fillOpacity: { signal: "show_controls ? 1 : 0" },
        strokeOpacity: { signal: "show_controls ? 1 : 0" }
      }
    }
  },
  {
    name: "reset_button_text",
    type: "text",
    encode: {
      enter: {
        cursor: { value: "pointer" }
      },
      update: {
        x: { signal: "child_width - 62" },
        y: { value: 95 },
        text: { value: "Reset View" },
        fontSize: { value: 12 },
        fontWeight: { value: "normal" },
        fill: { signal: "clicked_button === 'reset' ? '#fff' : '#333'" },
        align: { value: "center" },
        baseline: { value: "bottom" },
        opacity: { signal: "show_controls ? 1 : 0" }
      }
    }
  },
  // Clear Selection button
  {
    name: "clear_button_bg",
    type: "rect",
    encode: {
      enter: {
        cursor: { value: "pointer" }
      },
      update: {
        x: { signal: "child_width - 115" },
        y: { value: 105 },
        width: { value: 105 },
        height: { value: 22 },
        fill: { signal: "clicked_button === 'clear' ? '#5a9fd4' : '#fff'" },
        stroke: { value: "#999" },
        strokeWidth: { value: 1 },
        cornerRadius: { value: 3 },
        fillOpacity: { signal: "show_controls ? 1 : 0" },
        strokeOpacity: { signal: "show_controls ? 1 : 0" }
      }
    }
  },
  {
    name: "clear_button_text",
    type: "text",
    encode: {
      enter: {
        cursor: { value: "pointer" }
      },
      update: {
        x: { signal: "child_width - 62" },
        y: { value: 120 },
        text: { value: "Clear Selection" },
        fontSize: { value: 12 },
        fontWeight: { value: "normal" },
        fill: { signal: "clicked_button === 'clear' ? '#fff' : '#333'" },
        align: { value: "center" },
        baseline: { value: "bottom" },
        opacity: { signal: "show_controls ? 1 : 0" }
      }
    }
  },
  // Zoom in button background
  // Positioned between Pan/Zoom Mode button (y=52) and Reset View button (y=80)
  // Centered vertically: (80 - 52 - 22) / 2 = 3, so y = 52 + 3 = 55
  // Horizontally centered within the button column
  {
    name: "zoom_in_button_bg",
    type: "rect",
    encode: {
      enter: {
        cursor: { value: "pointer" }
      },
      update: {
        x: { signal: "child_width - 90" },
        y: { value: 55 },
        width: { value: 26 },
        height: { value: 22 },
        fill: { signal: "clicked_button === 'zoom_in' ? '#5a9fd4' : '#fff'" },
        stroke: { value: "#999" },
        strokeWidth: { value: 1 },
        cornerRadius: { value: 3 },
        fillOpacity: { signal: "show_controls ? 1 : 0" },
        strokeOpacity: { signal: "show_controls ? 1 : 0" }
      }
    }
  },
  {
    name: "zoom_in_button_text",
    type: "text",
    encode: {
      enter: {
        cursor: { value: "pointer" }
      },
      update: {
        x: { signal: "child_width - 77" },
        y: { value: 66 },
        text: { value: "+" },
        fontSize: { value: 16 },
        fontWeight: { value: "bold" },
        fill: { signal: "clicked_button === 'zoom_in' ? '#fff' : '#333'" },
        align: { value: "center" },
        baseline: { value: "middle" },
        opacity: { signal: "show_controls ? 1 : 0" }
      }
    }
  },
  // Zoom out button background
  {
    name: "zoom_out_button_bg",
    type: "rect",
    encode: {
      enter: {
        cursor: { value: "pointer" }
      },
      update: {
        x: { signal: "child_width - 62" },
        y: { value: 55 },
        width: { value: 26 },
        height: { value: 22 },
        fill: { signal: "clicked_button === 'zoom_out' ? '#5a9fd4' : '#fff'" },
        stroke: { value: "#999" },
        strokeWidth: { value: 1 },
        cornerRadius: { value: 3 },
        fillOpacity: { signal: "show_controls ? 1 : 0" },
        strokeOpacity: { signal: "show_controls ? 1 : 0" }
      }
    }
  },
  {
    name: "zoom_out_button_text",
    type: "text",
    encode: {
      enter: {
        cursor: { value: "pointer" }
      },
      update: {
        x: { signal: "child_width - 49" },
        y: { value: 66 },
        text: { value: "−" },
        fontSize: { value: 16 },
        fontWeight: { value: "bold" },
        fill: { signal: "clicked_button === 'zoom_out' ? '#fff' : '#333'" },
        align: { value: "center" },
        baseline: { value: "middle" },
        opacity: { signal: "show_controls ? 1 : 0" }
      }
    }
  },
  // Zoom level indicator background
  // Positioned below Clear Selection button (y=127)
  {
    name: "zoom_indicator_bg",
    type: "rect",
    encode: {
      update: {
        x: { signal: "child_width - 115" },
        y: { value: 132 },
        width: { value: 105 },
        height: { value: 32 },
        fill: { value: "#fff" },
        fillOpacity: { signal: "show_controls ? 0.7 : 0" },
        cornerRadius: { value: 3 }
      }
    }
  },
  // Zoom level indicator
  {
    name: "zoom_indicator",
    type: "text",
    encode: {
      enter: {
        align: { value: "center" },
        baseline: { value: "top" },
        fontSize: { value: 11 },
        fontWeight: { value: "normal" },
        fill: { value: "#555" }
      },
      update: {
        x: { signal: "child_width - 62" },
        y: { value: 135 },
        text: { signal: "'Zoom: ' + format(zoom_level, '.2f') + 'x'" },
        opacity: { signal: "show_controls ? 1 : 0" }
      }
    }
  },
  // Pan offset indicator
  {
    name: "pan_indicator",
    type: "text",
    encode: {
      enter: {
        align: { value: "center" },
        baseline: { value: "top" },
        fontSize: { value: 11 },
        fontWeight: { value: "normal" },
        fill: { value: "#555" }
      },
      update: {
        x: { signal: "child_width - 62" },
        y: { value: 148 },
        text: { signal: "'Pan: ' + format(pan_x, '.2f') + ', ' + format(pan_y, '.2f')" },
        opacity: { signal: "show_controls ? 1 : 0" }
      }
    }
  }
];

// Helper function to create symbol encoding
const createSymbolEncoding = () => ({
  x: { scale: "x", field: { signal: "xField" } },
  y: { scale: "y", field: { signal: "yField" } },
  opacity: [{ test: "indata('selected', 'ident', datum.ident)", value: 1 }, { signal: "symbolOpacity" }],
  tooltip: {
    signal:
      "{" +
      "'Clone ID': datum.clone_id, " +
      "'Dataset': datum.dataset_name || '', " +
      "'Subject': datum.subject_id, " +
      "'Locus': datum.sample ? datum.sample.locus : '', " +
      "'Unique Sequences': datum.unique_seqs_count, " +
      "'Mean Mutation Freq': format(datum.mean_mut_freq, '.3f'), " +
      "'Junction Length': datum.junction_length, " +
      "'V Gene': datum.v_call, " +
      "'J Gene': datum.j_call, " +
      "'Has Seed': datum.has_seed ? 'Yes' : 'No'" +
      "}"
  },
  fill: [
    { test: "!filledShapes", value: "transparent" },
    { test: "colorBy === '<none>'", value: "#4682b4" },
    { scale: "color", field: { signal: "colorBy" } }
  ],
  stroke: [
    { test: "!filledShapes && colorBy === '<none>'", value: "#4682b4" },
    { test: "!filledShapes", scale: "color", field: { signal: "colorBy" } },
    { value: null }
  ],
  shape: [
    { test: "shapeBy === '<none>'", value: "circle" },
    { scale: "shape", field: { signal: "shapeBy" } }
  ],
  size: [
    { test: "sizeBy === '<none>'", signal: "60 * symbolSize * symbolSize" },
    { signal: "scale('size', datum[sizeBy]) * symbolSize * symbolSize" }
  ]
});

// Helper function to create axes for the cell
const createCellAxes = () => [
  {
    scale: "x",
    orient: "bottom",
    grid: true,
    tickCount: { signal: "ceil(child_width/40)" },
    domain: false,
    labels: false,
    maxExtent: 0,
    minExtent: 0,
    ticks: false,
    zindex: 0
  },
  {
    scale: "y",
    orient: "left",
    gridScale: "x",
    grid: true,
    tickCount: { signal: "ceil(child_height/40)" },
    domain: false,
    labels: false,
    maxExtent: 0,
    minExtent: 0,
    ticks: false,
    zindex: 0
  }
];

// Helper function to create the complete cell mark
const createCellMark = () => ({
  name: "cell",
  type: "group",
  style: "cell",
  from: {
    facet: { name: "facet", data: "data_0", groupby: "facet_by_field" }
  },
  sort: { field: "datum.facet_by_field", order: "ascending" },
  encode: {
    update: {
      width: { signal: "child_width" },
      height: { signal: "child_height" },
      // Show move cursor (cross with arrows) in zoom mode, default pointer in select mode
      cursor: { signal: "interaction_mode === 'zoom' ? 'move' : 'crosshair'" }
    }
  },
  signals: createCellSignals(),
  marks: createBrushMarks(),
  axes: createCellAxes()
});

// Helper function to create all marks
const createMarks = () => [...createHeaderMarks(), createCellMark()];

// Main function that composes the complete spec
const facetClonalFamiliesVizSpec = () => {
  return {
    $schema: "https://vega.github.io/schema/vega/v5.json",
    autosize: { type: "pad", resize: true },
    data: createDataConfiguration(),
    signals: createSignals(),
    layout: createLayout(),
    marks: createMarks(),
    scales: createScales(),
    legends: createLegends(),
    config: {
      axisY: {
        minExtent: 30
      }
    }
  };
};

export default facetClonalFamiliesVizSpec;
