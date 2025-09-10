// Helper function to create data configuration
const createDataConfiguration = () => ([
  { name: "pts_store" },
  { name: "selected" },
  { name: "locus" },
  { name: "datasets" },
  {
    name: "brush_store",
    on: [
      {trigger: "brush_selection", insert: "brush_selection", remove: true},
      {trigger: "facet_by_signal", remove: true}
    ]
  },
  { name: "source" },
  {
    name: "data_0",
    source: "source",
    format: {
      type: "json",
      parse: {unique_seqs_count: "number", mean_mut_freq: "number"},
      copy: true
    },
    transform: createDataTransforms()
  },
  {
    name: "column_domain",
    source: "data_0",
    transform: [
      {type: "aggregate", groupby: [{signal: "facet_by_signal"}]},
      {type: "formula", expr: "datum[facet_by_signal]", as: "facet_by_field"}
    ]
  }
]);

// Helper function to create data transformations
const createDataTransforms = () => ([
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
  {type: "formula", expr: "datum[facet_by_signal]", as: "facet_by_field"}
]);

// Helper function to create layout signals
const createLayoutSignals = () => ([
  { name: "PADDING_FRACTION", value: 0.05 },
  { name: "PADDING_BUFFER_WIDTH", value: 150 },
  { name: "PADDING_BUFFER_HEIGHT", value: 125 },
  {
    name: "width",
    update: "floor(windowSize()[0]*(1-2*PADDING_FRACTION))-PADDING_BUFFER_WIDTH",
    on: [{
      events: { source: "window", type: "resize" },
      update: "floor(windowSize()[0]*(1-2*PADDING_FRACTION))-PADDING_BUFFER_WIDTH"
    }]
  },
  {
    name: "height",
    update: "floor(windowSize()[1]*(1-2*PADDING_FRACTION))-PADDING_BUFFER_HEIGHT",
    on: [{
      events: { source: "window", type: "resize" },
      update: "floor(windowSize()[1]*(1-2*PADDING_FRACTION))-PADDING_BUFFER_HEIGHT"
    }]
  },
  { name: "layout_padding", value: 10 },
  { name: "len_col_domain", update: "clamp(length(data('column_domain')), 1, 100)" },
  { name: "child_width", update: "width/len_col_domain-layout_padding" },
  { name: "child_height", update: "height" }
]);

// Helper function to create selection signals
const createSelectionSignals = () => ([
  {
    name: "pts",
    update: 'data("pts_store").length && {_vgsid_: data("pts_store")[0]}'
  },
  {
    name: "pts_tuple",
    value: {},
    on: [{
      events: [{source: "scope", type: "click"}],
      update: "datum && item().mark.marktype == 'symbol' ? datum : null"
    }]
  },
  {
    name: "pts_modify",
    on: [{
      events: {signal: "pts_tuple"},
      update: 'modify("pts_store", pts_tuple, true)'
    }]
  },
  {
    name: "clicked",
    value: null,
    on: [{
      events: {signal: "pts_tuple"},
      update: "pts_tuple"
    }]
  },
  { name: "brush_store_signal", update: 'data("brush_store")' },
  { name: "brush_selection", value: null },
  { name: "brushed_facet_value", value: null },
  { name: "cell", value: null },
  {
    name: "mouseDown",
    on: [{
      events: { source: "scope", type: "mousedown", consume: true },
      update: "[x(cell), y(cell)]"
    }]
  },
  {
    name: "mouseUp",
    on: [{
      events: { source: "window", type: "mouseup" },
      update: "[x(cell), y(cell)]"
    }]
  }
]);

// Helper function to create control signals (dropdowns)
const createControlSignals = () => ([
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
    bind: { name: "Symbol size ", input: "range", min: 0.1, max: 3, step: 0.1 }
  },
  {
    name: "symbolOpacity",
    value: 0.4,
    bind: { name: "Symbol opacity ", input: "range", min: 0.1, max: 1, step: 0.05 }
  },
  {
    name: "filledShapes",
    value: false,
    bind: { name: "Filled shapes ", input: "checkbox" }
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
]);

// Helper function to create all signals
const createSignals = () => ([
  ...createLayoutSignals(),
  ...createSelectionSignals(),
  ...createControlSignals()
]);

// Helper function to create scales configuration
const createScales = () => ([
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
    name: "color",
    type: "ordinal",
    domain: {
      data: "data_0",
      field: {signal: "colorBy"},
      sort: true
    },
    range: {scheme: "category10"}
  },
  {
    name: "shape",
    type: "ordinal",
    domain: {
      data: "data_0",
      field: {signal: "shapeBy"},
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
]);

// Helper function to create legends configuration
const createLegends = () => ([
  {
    stroke: "color",
    title: {signal: "colorBy"},
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
    title: {signal: "shapeBy"},
    encode: {
      symbols: {
        update: {
          fill: { value: "transparent" },
          opacity: { value: 0.35 }
        }
      }
    }
  }
]);

// Helper function to create layout configuration
const createLayout = () => ({
  padding: {row: {signal: "layout_padding"}, column: {signal: "layout_padding"}},
  offset: {columnTitle: 10},
  columns: {signal: "len_col_domain"},
  bounds: "full",
  align: "all"
});

// Helper function to create header marks
const createHeaderMarks = () => ([
  {
    name: "column-title",
    type: "group",
    role: "column-title",
    title: {
      text: {signal: "facet_by_signal == '<none>' ? '' : facet_by_signal"},
      offset: 10,
      style: "guide-title"
    }
  },
  {
    name: "row_header",
    type: "group",
    role: "row-header",
    encode: {update: {height: {signal: "child_height"}}},
    axes: [{
      scale: "y",
      orient: "left",
      grid: false,
      title: {signal: "yField"},
      labelOverlap: true,
      tickCount: {signal: "ceil(child_height/40)"},
      zindex: 1
    }]
  },
  {
    name: "column_header",
    type: "group",
    role: "column-header",
    from: {data: "column_domain"},
    sort: {field: "datum[\"facet_by_field\"]", order: "ascending"},
    title: {
      text: {signal: "'' + (toString(parent[\"facet_by_field\"]) ? parent[\"facet_by_field\"] : '')"},
      offset: 10,
      style: "guide-label",
      baseline: "middle"
    },
    encode: {update: {width: {signal: "child_width"}}}
  },
  {
    name: "column_footer",
    type: "group",
    role: "column-footer",
    from: {data: "column_domain"},
    sort: {field: "datum[\"facet_by_field\"]", order: "ascending"},
    encode: {update: {width: {signal: "child_width"}}},
    axes: [{
      scale: "x",
      orient: "bottom",
      grid: false,
      title: {signal: "xField"},
      labelFlush: true,
      labelOverlap: true,
      tickCount: {signal: "ceil(child_width/40)"},
      zindex: 1
    }]
  }
]);

// Helper function to create cell-level signals for brushing
const createCellSignals = () => ([
  {
    name: "facet",
    value: {},
    on: [{
      events: [{source: "scope", type: "mousemove"}],
      update: "isTuple(facet) ? facet : group(\"cell\").datum"
    }]
  },
  {
    name: "local_facet_value",
    update: "facet_by_signal !== \"<none>\" ? facet.facet_by_field : '<none>'"
  },
  {
    name: "brush_test",
    update: "data(\"brush_store\").length && (local_facet_value !== \"<none>\" ? (data(\"brush_store\")[0].facetValue === facet.facet_by_field) : true)"
  },
  {
    name: "brushed_facet_value",
    push: "outer",
    on: [{
      events: "@cell:mousedown",
      update: "[facet_by_signal, facet.facet_by_field]"
    }]
  },
  {
    name: "cell",
    push: "outer",
    on: [
      { events: "@cell:mousedown", update: "group()" },
      { events: "@cell:mouseup", update: "!span(brush_x) && !span(brush_y) ? null : cell" }
    ]
  },
  ...createBrushSignals()
]);

// Helper function to create brush-specific signals
const createBrushSignals = () => ([
  {
    name: "brush_x",
    value: [],
    on: [
      {
        events: {
          source: "scope",
          type: "mousedown",
          filter: [
            "!event.item || event.item.mark.name !== \"brush_brush\"",
            "inScope(event.item)"
          ]
        },
        update: "[x(cell), x(cell)]"
      },
      {
        events: {
          source: "window",
          type: "mousemove",
          between: [
            {
              source: "scope",
              type: "mousedown",
              filter: ["!event.item || event.item.mark.name !== \"brush_brush\"", "inScope(event.item)"]
            },
            { source: "window", type: "mouseup" }
          ]
        },
        update: "[brush_x[0], clamp(x(cell), 0, child_width)]"
      },
      {
        events: { signal: "brush_translate_delta" },
        update: "clampRange(panLinear(brush_translate_anchor.extent_x, brush_translate_delta.x / span(brush_translate_anchor.extent_x)), 0, child_width)"
      }
    ]
  },
  {
    name: "brush_y",
    value: [],
    on: [
      {
        events: {
          source: "scope",
          type: "mousedown",
          filter: [
            "!event.item || event.item.mark.name !== \"brush_brush\"",
            "inScope(event.item)"
          ]
        },
        update: "[y(cell), y(cell)]"
      },
      {
        events: {
          source: "window",
          type: "mousemove",
          between: [
            {
              source: "scope",
              type: "mousedown",
              filter: ["!event.item || event.item.mark.name !== \"brush_brush\"", "inScope(event.item)"]
            },
            { source: "window", type: "mouseup" }
          ]
        },
        update: "[brush_y[0], clamp(y(cell), 0, child_height)]"
      },
      {
        events: { signal: "brush_translate_delta" },
        update: "clampRange(panLinear(brush_translate_anchor.extent_y, brush_translate_delta.y / span(brush_translate_anchor.extent_y)), 0, child_height)"
      }
    ]
  },
  ...createBrushTranslateSignals()
]);

// Helper function for brush translate signals
const createBrushTranslateSignals = () => ([
  {
    name: "brush_translate_anchor",
    value: {},
    on: [{
      events: [{ source: "scope", type: "mousedown", markname: "brush_brush" }],
      update: "{x: x(cell), y: y(cell), extent_x: slice(brush_x), extent_y: slice(brush_y)}"
    }]
  },
  {
    name: "brush_translate_delta",
    value: {},
    on: [{
      events: [{
        source: "window",
        type: "mousemove",
        between: [
          { source: "scope", type: "mousedown", markname: "brush_brush" },
          { source: "window", type: "mouseup" }
        ]
      }],
      update: "{x: brush_translate_anchor.x - x(cell), y: brush_translate_anchor.y - y(cell)}"
    }]
  },
  {
    name: "brush_x_field",
    push: "outer",
    on: [{ events: { signal: "brush_x" }, update: "xField" }]
  },
  {
    name: "brush_y_field",
    push: "outer",
    on: [{ events: { signal: "brush_y" }, update: "yField" }]
  },
  {
    name: "brush_selection",
    push: "outer",
    on: [{
      events: "@cell:mouseup",
      update: "data('facet').filter(d => inrange(d[xField], brush_x) && inrange(d[yField], brush_y))"
    }]
  }
]);

// Helper function to create brush marks
const createBrushMarks = () => ([
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
    encode: {
      update: createSymbolEncoding()
    }
  },
  {
    name: "brush_brush",
    type: "rect",
    clip: true,
    encode: {
      enter: { fill: { value: "transparent" } },
      update: {
        x: [{ test: "brush_test", signal: "brush_x[0]" }, { value: 0 }],
        y: [{ test: "brush_test", signal: "brush_y[0]" }, { value: 0 }],
        x2: [{ test: "brush_test", signal: "brush_x[1]" }, { value: 0 }],
        y2: [{ test: "brush_test", signal: "brush_y[1]" }, { value: 0 }],
        stroke: [
          { test: "brush_x[0] !== brush_x[1] && brush_y[0] !== brush_y[1]", value: "white" },
          { value: null }
        ]
      }
    }
  }
]);

// Helper function to create symbol encoding
const createSymbolEncoding = () => ({
  x: {scale: "x", field: {signal: "xField"}},
  y: {scale: "y", field: {signal: "yField"}},
  opacity: [
    {test: "indata('selected', 'ident', datum.ident)", value: 1},
    {signal: "symbolOpacity"}
  ],
  tooltip: {
    signal: "{" +
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
    { scale: "color", field: {signal: "colorBy"} }
  ],
  stroke: [
    { test: "!filledShapes && colorBy === '<none>'", value: "#4682b4" },
    { test: "!filledShapes", scale: "color", field: {signal: "colorBy"} },
    { value: null }
  ],
  shape: [
    { test: "shapeBy === '<none>'", value: "circle" },
    { scale: "shape", field: {signal: "shapeBy"} }
  ],
  size: [
    { test: "sizeBy === '<none>'", signal: "60 * symbolSize * symbolSize" },
    { scale: "size", field: {signal: "sizeBy"} }
  ]
});

// Helper function to create axes for the cell
const createCellAxes = () => ([
  {
    scale: "x",
    orient: "bottom",
    grid: true,
    tickCount: {signal: "ceil(child_width/40)"},
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
    tickCount: {signal: "ceil(child_height/40)"},
    domain: false,
    labels: false,
    maxExtent: 0,
    minExtent: 0,
    ticks: false,
    zindex: 0
  }
]);

// Helper function to create the complete cell mark
const createCellMark = () => ({
  name: "cell",
  type: "group",
  style: "cell",
  from: {
    facet: {name: "facet", data: "data_0", groupby: "facet_by_field"}
  },
  sort: {field: "datum.facet_by_field", order: "ascending"},
  encode: {
    update: {
      width: {signal: "child_width"},
      height: {signal: "child_height"}
    }
  },
  signals: createCellSignals(),
  marks: createBrushMarks(),
  axes: createCellAxes()
});

// Helper function to create all marks
const createMarks = () => ([
  ...createHeaderMarks(),
  createCellMark()
]);

// Main function that composes the complete spec
const facetClonalFamiliesVizSpec = () => {
  return {
    $schema: "https://vega.github.io/schema/vega/v5.json",
    autosize: {type: "pad", resize: true},
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
