/* eslint-disable eqeqeq */
// Note: Vega expressions use == for comparison within expression strings
// These are not JavaScript expressions but Vega's domain-specific language

// Defines the order in which we specify corresponding colors
const aminoAcidDomain = [
  "-",
  "X",
  "A",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "I",
  "K",
  "L",
  "M",
  "N",
  "P",
  "Q",
  "R",
  "S",
  "T",
  "V",
  "W",
  "Y"
];

// AMINO ACID COLORS
// tableau20 colorset of unique colors, with transparent added for gaps and X (any).
// We are using text rather than color to distinguish these characters
// See https://github.com/matsengrp/olmsted/issues/48
// Also note that this order of characters is IMPORTANT because
// it maps directly to the order of the domain (see above aminoAcidDomain) of the mutations marks
const tableau20plusColors = [
  "transparent", // '-' Gap (insertion / deletion)
  "transparent", //  X - (Any amino acid)
  "#1f77b4", //  A - Ala - Alanine
  "#aec7e8", //   C - Cys - Cysteine
  "#ff7f0e", //  D - Asp - Aspartic Acid
  "#ffbb78", //  E - Glu - Glutamic Acid
  "#2ca02c", //   F - Phe - Phenylalanine
  "#98df8a", //   G - Gly - Glycine
  "#d62728", //  H - His - Histidine
  "#ff9896", //   I - Ile - Isoleucine
  "#9467bd", //  K - Lys - Lysine
  "#c5b0d5", //   L - Leu - Leucine
  "#8c564b", //   M - Met - Methionine
  "#c49c94", //  N - Asn - Asparagine
  "#e377c2", //   P - Pro - Proline
  "#f7b6d2", //  Q - Gln - Glutamine
  "#7f7f7f", //  R - Arg - Arginine
  "#c7c7c7", //   S - Ser - Serine
  "#bcbd22", //   T - Thr - Threonine
  "#dbdb8d", //   V - Val - Valine
  "#17becf", //   W - Trp - Tryptophan
  "#9edae5" //   Y - Tyr - Tyrosine
];

// Alternatively:
// As seen in cft web, colors from http://www.imgt.org/IMGTScientificChart/RepresentationRules/colormenu.php#h1_0
// again, with transparent added for gaps and X (any) see https://github.com/matsengrp/olmsted/issues/48
// (EH) these are pretty vibrant and hard to look at
// Keeping for reference but not currently used due to being too vibrant
// const IMGTScientificChartColors = [
//   "transparent", // '-' Gap (insertion / deletion)
//   "transparent", //  X - (Any amino acid)
//   "#CCFFFF", //   A - Ala - Alanine
//   "#00FFFF", //   C - Cys - Cysteine
//   "#FFCC99", //  D - Asp - Aspartic Acid
//   "#FFCC00", //  E - Glu - Glutamic Acid
//   "#00CCFF", //   F - Phe - Phenylalanine
//   "#00FF00", //   G - Gly - Glycine
//   "#FFFF99", //  H - His - Histidine
//   "#000080", //   I - Ile - Isoleucine
//   "#C64200", //  K - Lys - Lysine
//   "#3366FF", //   L - Leu - Leucine
//   "#99CCFF", //   M - Met - Methionine
//   "#FF9900", //  N - Asn - Asparagine
//   "#FFFF00", //   P - Pro - Proline
//   "#FF6600", //  Q - Gln - Glutamine
//   "#E60606", //  R - Arg - Arginine
//   "#CCFF99", //   S - Ser - Serine
//   "#00FF99", //   T - Thr - Threonine
//   "#0000FF", //   V - Val - Valine
//   "#CC99FF", //   W - Trp - Tryptophan
//   "#CCFFCC" //   Y - Tyr - Tyrosine
// ];

const concatTreeWithAlignmentSpec = (options = {}) => {
  const { showControls = true, showLegend = true, topPadding = 20 } = options;

  // Helper to conditionally add bind property
  const maybeAddBind = (bindConfig) => (showControls ? { bind: bindConfig } : {});

  return {
    $schema: "https://vega.github.io/schema/vega/v5.json",
    description: "",
    autosize: { type: "pad", resize: true },
    // Top padding for readability around the gene region
    padding: { top: topPadding, left: 0, right: 0, bottom: 0 },
    // Note that we have some datasets named for signals
    // these are a current way around being able to set
    // the initial values of signals through the props
    // of a react-vega component. See https://github.com/kristw/react-vega/issues/13

    // /DATA:
    // ---------------------------------------------------------------------------

    data: [
      {
        // The number of sequences to show in the
        // alignment is the leaves + the naive
        name: "leaves_count_incl_naive"
      },
      {
        // This is for the naive gene regions shown
        // at the top of the viz
        name: "naive_data",
        transform: [{ type: "extent", field: "end", signal: "dna_j_gene_end" }]
      },
      {
        // For showing CDR regions with dotted lines in the alignment
        name: "cdr_bounds"
      },
      {
        // Stores points that have been clicked on
        name: "pts_store"
      },
      {
        // Stores the id of the seed
        name: "seed"
      },

      // /TREE DATA:
      // ---------------------------------------------------------------------------

      {
        // raw tree data
        name: "source_0"
      },
      {
        source: "source_0",
        name: "max_label_length",
        transform: [
          { expr: "datum.type == 'leaf'", type: "filter" },
          { expr: "length(datum.sequence_id)", type: "formula", as: "label_length" },
          {
            type: "aggregate",
            fields: ["label_length"],
            ops: ["max"],
            as: ["max_value"]
          }
        ]
      },
      {
        name: "tree",
        transform: [
          { key: "sequence_id", type: "stratify", parentKey: "parent" },
          {
            // The size of the tree here should be constant with the number of leaves;
            // the zoom signals rely on xext, yext to be the same no matter the zoom
            // status of the tree. Important that x, y values are scaled after we take xext and yext.
            type: "tree",
            method: "cluster",
            separation: false,
            // We are only using the y values from this transform, x comes from "distance"
            size: [{ signal: "leaves_count_incl_naive" }, { signal: "width" }],
            as: ["y_tree", "x_tree", "depth", "children"]
          },

          // Calculate x_raw based on the current mode (for extent calculation)
          // Now depth is available from the tree transform
          {
            expr: 'fixed_branch_lengths ? datum.depth : datum.distance',
            type: "formula",
            as: "x_raw"
          },

          // Calculate extent AFTER we have depth from the tree transform
          { type: "extent", field: "x_raw", signal: "xext" },
          { type: "extent", field: "y_tree", signal: "yext" },

          // Now scale the x values
          {
            expr: 'scale("time", datum.x_raw)',
            type: "formula",
            as: "x"
          },
          { expr: 'scale("yscale", datum.y_tree)', type: "formula", as: "y" },
          {
            type: "formula",
            expr: "branch_width_by !== '<none>' ? datum[branch_width_by] : null",
            as: "branch_width_by_field"
          },
          {
            type: "formula",
            expr: "branch_color_by !== '<none>' ? datum[branch_color_by] : null",
            as: "branch_color_by_field"
          }
        ],
        source: "source_0"
      },
      {
        name: "links",
        transform: [
          { key: "sequence_id", type: "treelinks" },
          { shape: "orthogonal", type: "linkpath", orient: "horizontal" }
        ],
        source: "tree"
      },
      {
        name: "nodes",
        transform: [
          {
            expr: "datum.type == 'node' || datum.type =='root' || datum.type == 'internal'",
            type: "filter"
          },
          {
            type: "extent",
            field: "branch_width_by_field",
            signal: "branch_width_extent"
          },
          {
            type: "extent",
            field: "branch_color_by_field",
            signal: "branch_color_extent"
          }
        ],
        source: "tree"
      },
      {
        name: "leaves",
        transform: [
          // Get just leaf nodes
          { expr: "datum.type == 'leaf'", type: "filter" },
          // Scale affinity for values with little variance
          {
            type: "formula",
            expr: 'isNumber(datum["affinity"]) ? pow(10, 100*datum["affinity"]) : NaN',
            as: "scaled_affinity"
          },
          // Choose field according to "leaf_size_by" signal and write it
          // to a new field named "leaf_size_by" so we can always expect to
          // use that field from here on with respect to sizing the leaves.
          // Make sure it is a number / not NaN (vega differentiates these)
          // Handle "<none>" option by setting constant value
          {
            type: "formula",
            expr: "leaf_size_by === '<none>' ? 1 : (isNumber(datum[leaf_size_by]) &&  datum[leaf_size_by] !== NaN) ? datum[leaf_size_by] : NaN",
            as: "leaf_size_by"
          }
        ],
        source: "tree"
      },
      // For the leaf marks / pie charts, we only want to show these for those
      // leaves which actually have the appropriate data, so we filter out null values (which are coerced to NaN above in "leaves" dataset)
      {
        name: "valid_leaves",
        transform: [{ expr: 'datum["leaf_size_by"] !== NaN', type: "filter" }],
        source: "leaves"
      },
      // "leaf pies" does a "pie" transformation for timepoint multiplicity data
      // For other data like affinity (and for nonexistant timepoint multiplicity data)
      // we need to pass it some fake data that will just draw a cirlce (aka a pie chart with
      // one value), which explains the confusing logic going on here.
      {
        // TODO
        // Add another data collection here, "timepoint_multiplicity_sum", that sums over the timepoint_multiplicities
        // in order to normalize by this sum instead of trusting the total multiplicity values
        name: "leaf_pies",
        transform: [
          {
            type: "formula",
            expr: "( isArray( datum[leaf_data_map[leaf_size_by]] ) && datum[leaf_data_map[leaf_size_by]].length > 0 ) ? datum[leaf_data_map[leaf_size_by]] : ['none']",
            as: "timepoint_mult_data"
          },
          {
            type: "flatten",
            fields: ["timepoint_mult_data"]
          },
          {
            type: "formula",
            expr: "datum.timepoint_mult_data.timepoint_id",
            as: "timepoint_multiplicity_key"
          },
          {
            type: "formula",
            expr: "datum.timepoint_multiplicity_key ? datum.timepoint_mult_data.multiplicity/datum[leaf_size_by] : 1",
            as: "timepoint_multiplicity_value"
          },
          {
            type: "pie",
            field: "timepoint_multiplicity_value",
            startAngle: 0,
            endAngle: {
              signal: "length(data('valid_leaves'))*6.29"
            }
          }
        ],
        source: "valid_leaves"
      },

      // /ALIGNMENT DATA:
      // ---------------------------------------------------------------------------
      {
        // Raw alignment data / mutations records
        name: "source_1",
        // Get y values from the tree so we can line up leaves with the alignment
        transform: [
          {
            type: "lookup",
            from: "tree",
            values: ["y"],
            key: "sequence_id",
            fields: ["seq_id"],
            as: ["y"]
          }
        ]
      },
      {
        name: "data_1",
        source: "source_1",
        transform: [
          {
            type: "formula",
            expr: 'toNumber(datum["position"])',
            as: "position"
          },
          { type: "extent", field: "y", signal: "mutations_height_extent" },
          { type: "extent", field: "position", signal: "position_extent" },
          {
            type: "filter",
            expr: "datum.type !== 'naive'"
          }
        ]
      },
      // Separate dataset for just gap characters and Xs to label them with text marks
      {
        name: "x_and_gaps",
        source: "source_1",
        transform: [
          {
            type: "filter",
            expr: 'datum.mut_to == "-" || datum.mut_to == "X"'
          },
          {
            type: "filter",
            expr: "datum.type !== 'naive'"
          }
        ]
      },

      // /NAIVE DATA:
      // ---------------------------------------------------------------------------
      // Naive mutations data for static plot above alignment
      {
        name: "naive_mutations",
        source: "source_1",
        transform: [
          {
            type: "formula",
            expr: 'toNumber(datum["position"])',
            as: "position"
          },
          {
            type: "filter",
            expr: "datum.type == 'naive'"
          }
        ]
      },
      {
        name: "naive_mutations_x_and_gaps",
        source: "source_1",
        transform: [
          {
            type: "filter",
            expr: 'datum.mut_to == "-" || datum.mut_to == "X"'
          },
          {
            type: "filter",
            expr: "datum.type == 'naive'"
          }
        ]
      }
    ],

    // /SIGNALS:
    // ---------------------------------------------------------------------------

    signals: [
      {
        // Update height from window size and viz_height_ratio (see https://github.com/matsengrp/olmsted/issues/83)
        name: "height",

        update: "floor(windowSize()[1]*viz_height_ratio)",

        on: [
          {
            events: { source: "window", type: "resize" },
            update: "floor(windowSize()[1]*viz_height_ratio)"
          },
          {
            events: { signal: "viz_height_ratio" },
            update: "floor(windowSize()[1]*viz_height_ratio)"
          }
        ]
      },
      {
        name: "width",
        update: "floor(windowSize()[0]*0.8)",
        on: [
          {
            events: { source: "window", type: "resize" },
            update: "floor(windowSize()[0]*0.8)"
          }
        ]
      },

      // /ZOOM SIGNALS
      // These are the ranges for displaying the tree marks. We pad so that the pie charts and labels
      // are all visible when fully zoomed out
      { name: "xrange", update: "[pie_chart_padding , tree_group_width - leaf_label_length_limit]" },
      // Add 5px buffer to ensure top/bottom pie charts don't touch clip boundary
      { name: "yrange", update: "[pie_chart_padding + 5, height - pie_chart_padding - 5]" },
      // These xdom and ydom signals come from the inner tree zoom signals but need to be updated
      // in the outer scope to allow scales/axes to update accordingly
      {
        name: "xdom",
        update: "slice(xext)"
      },
      {
        name: "branch_length_mode_text",
        update: "fixed_branch_lengths ? 'Tree depth (fixed lengths)' : 'Evolutionary distance from naive'"
      },
      // Fence-post spacing: expand yext by one leaf-spacing on each side
      // so top/bottom leaves have same spacing to edge as to their neighbors
      {
        name: "yext_fencepost",
        update: "[yext[0] - span(yext)/(leaves_count_incl_naive - 1), yext[1] + span(yext)/(leaves_count_incl_naive - 1)]"
      },
      {
        name: "ydom",
        update: "slice(yext_fencepost)"
      },

      // /TREE SIGNALS:
      // ---------------------------------------------------------------------------

      {
        name: "tree_group_width",
        update: "show_alignment ? tree_group_width_ratio*width : width"
      },
      // Number of leaves
      {
        name: "leaves_count_incl_naive",
        // This - like other signals we'd like to initialize
        // from outside the spec, is passed in dynamically as
        // data and read from the data here, so as to not re-initialize
        // the spec
        update: 'data("leaves_count_incl_naive")[0].data'
      },
      // This is used through out as the unit defining
      // the vertical spacing of leaves in the tree and
      // mutation marks in the alignment
      {
        name: "leaf_size",
        update: "clamp(height/leaves_count_incl_naive, 5, 1000)"
      },
      // Size of leaves - they are mapped to a range with
      // the value of this signal as the maximum
      {
        name: "max_leaf_size",
        value: 50,
        ...maybeAddBind({
          max: 100,
          step: 1,
          input: "range",
          min: 1
        })
      },
      // HEIGHTSCALE SIGNALS END
      {
        // Metadata field to use for sizing the leaves
        name: "leaf_size_by",
        value: "<none>",
        ...maybeAddBind({
          input: "select",
          options: ["<none>", "multiplicity", "cluster_multiplicity", "affinity", "scaled_affinity"]
        })
      },
      {
        name: "leaf_size_by_legend_label",
        update: '"Timepoint color key (from "+leaf_size_by+"):"'
      },
      {
        // Defines what key to use for leaf pie chart values, specifically in the cases of timepoint multiplicities
        name: "leaf_data_map",
        update:
          '{"scaled_affinity": "scaled_affinity", "affinity": "affinity", "cluster_multiplicity": "cluster_timepoint_multiplicities", "multiplicity": "timepoint_multiplicities"}'
      },
      {
        // Seq metric to use for sizing branches;
        // uses value from the child of the branch
        name: "branch_width_by",
        value: "<none>",
        ...maybeAddBind({ input: "select", options: ["<none>", "lbr", "lbi"] })
      },
      {
        // Seq metric to use for coloring branches;
        // uses value from the child of the branch
        name: "branch_color_by",
        value: "parent",
        ...maybeAddBind({ input: "select", options: ["<none>", "lbr", "lbi", "parent"] })
      },
      {
        name: "branch_color_scheme",
        value: "redblue",
        ...maybeAddBind({ input: "select", options: ["redblue", "purples"] })
      },
      {
        name: "branch_color_scheme_map",
        update: '{purples: slice(full_purple_range, min_color_value), redblue: ["darkblue", "red"]}'
      },
      {
        name: "min_color_value",
        value: 0,
        ...maybeAddBind({
          input: "range",
          max: 4,
          step: 1,
          min: 0
        })
      },
      {
        name: "full_purple_range",
        value: ["#f7fcfd", "#e0ecf4", "#bfd3e6", "#9ebcda", "#8c96c6", "#8c6bb1", "#88419d", "#810f7c", "#4d004b"]
      },
      {
        // If a branch_color_by option (a seq metric) should be colored categorically
        // rather than sequentially, put its name here.
        name: "categorical_seq_metrics",
        value: '["parent"]'
      },
      {
        // Choose the color scheme/scale to use depending on the selected metric
        name: "branch_color_scale",
        update:
          'indexof(categorical_seq_metrics, branch_color_by) > 0 ? "branch_color_categorical" : "branch_color_sequential"'
      },
      {
        name: "show_labels",
        value: true,
        ...maybeAddBind({
          input: "checkbox",
          name: "Show labels"
        })
      },
      {
        name: "fixed_branch_lengths",
        value: false,
        ...maybeAddBind({
          input: "checkbox",
          name: "Fixed branch lengths"
        })
      },
      // Padding to add to the initial tree size to not clip labels
      {
        name: "leaf_label_length_limit",
        value: 100
      },
      {
        name: "pie_chart_padding",
        update: "clamp(max_leaf_size, 10, max_leaf_size)"
      },
      {
        // Label size for tree leaves (clamped to max value of 10)
        name: "label_size",
        update: "clamp(leaf_size, 0, 10)"
      },
      {
        value: "datum",
        name: "cladify",
        on: [{ update: "datum", events: "@ancestor:mousedown, @ancestor:touchstart" }]
      },
      {
        name: "unit",
        value: {},
        on: [{ events: "mousemove", update: "isTuple(group()) ? group() : unit" }]
      },
      // On click stuff
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
            update: "datum && (item().mark.marktype == 'text' || item().mark.marktype == 'symbol') ? datum : null"
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

      // /CROSS-VIZ HOVER HIGHLIGHT:
      // Track hovered leaf y_tree (unscaled) for cross-visualization highlighting
      // We store y_tree and scale it dynamically so highlights follow pan/zoom
      // Exclude naive/root sequence from highlighting
      {
        name: "hovered_leaf_y_tree",
        value: null,
        on: [
          {
            // Tree side: pie charts, leaf centers, leaf labels (exclude naive/root)
            events: "@pie:mouseover, @leaf_center:mouseover, @leaf_label:mouseover",
            update: "datum.type !== 'naive' && datum.type !== 'root' ? datum.y_tree : null"
          },
          {
            // Alignment side: mutations marks and gridlines (these have y, need to invert)
            // Exclude naive type
            events: "@marks:mouseover, @y_grid:mouseover, @gap_and_x_marks:mouseover",
            update: "datum.type !== 'naive' ? invert('yscale', datum.y) : null"
          },
          {
            events: "@pie:mouseout, @leaf_center:mouseout, @leaf_label:mouseout, @marks:mouseout, @y_grid:mouseout, @gap_and_x_marks:mouseout",
            update: "null"
          }
        ]
      },
      // Track selected/clicked leaf y_tree (unscaled) for persistent highlighting
      // Exclude naive/root sequence from highlighting
      {
        name: "selected_leaf_y_tree",
        value: null,
        on: [
          {
            events: { signal: "pts_tuple" },
            update: "pts_tuple && isValid(pts_tuple.y_tree) && pts_tuple.type !== 'naive' && pts_tuple.type !== 'root' ? pts_tuple.y_tree : null"
          }
        ]
      },

      // /ALIGNMENT SIGNALS:
      // ---------------------------------------------------------------------------

      // max length for the amino acid scale
      // Use the maximum of: gene annotation end OR actual data extent
      {
        name: "max_aa_seq_length",
        update: "max(ceil(dna_j_gene_end[1]/3), position_extent ? position_extent[1] + 1 : 0)"
      },

      // /ALIGNMENT ZOOM/PAN SIGNALS:
      // Horizontal zoom level for alignment (1.0 = no zoom, >1 = zoomed in)
      {
        name: "alignment_zoom",
        value: 1,
        on: [
          {
            // Scroll to zoom when hovering over alignment group
            // consume: true prevents page scrolling
            events: [
              { source: "scope", type: "wheel", markname: "alignment_zoom_area", consume: true },
              { source: "scope", type: "wheel", markname: "naive_zoom_area", consume: true }
            ],
            update: "clamp(alignment_zoom * pow(1.002, -event.deltaY), 1, 50)"
          },
          {
            // Double-click to reset zoom/pan
            events: [
              { source: "scope", type: "dblclick", markname: "alignment_zoom_area" },
              { source: "scope", type: "dblclick", markname: "naive_zoom_area" }
            ],
            update: "1"
          }
        ]
      },
      // Pan offset for alignment (0 = leftmost, 1 = rightmost)
      // Max pan value depends on zoom: at zoom=2, can pan 0.5; at zoom=10, can pan 0.9
      {
        name: "alignment_pan_max",
        update: "max(0, 1 - 1/alignment_zoom)"
      },
      {
        name: "alignment_pan",
        value: 0,
        on: [
          {
            // Clamp pan when zoom changes (keep within valid range)
            events: { signal: "alignment_zoom" },
            update: "clamp(alignment_pan, 0, alignment_pan_max)"
          },
          {
            // Drag scrollbar thumb to pan
            events: {
              source: "window",
              type: "mousemove",
              between: [
                { source: "scope", type: "mousedown", markname: "scrollbar_thumb" },
                { source: "window", type: "mouseup" }
              ]
            },
            // Direct mapping: drag distance maps to pan change
            update: "clamp(alignment_pan + event.movementX / alignment_group_width, 0, alignment_pan_max)"
          },
          {
            // Click on scrollbar track to jump to position
            events: { source: "scope", type: "click", markname: "scrollbar_track" },
            // Calculate pan from click position, centering the thumb on click
            update: "clamp(x() / alignment_group_width - 0.5/alignment_zoom, 0, alignment_pan_max)"
          },
          {
            // Double-click to reset zoom/pan
            events: [
              { source: "scope", type: "dblclick", markname: "alignment_zoom_area" },
              { source: "scope", type: "dblclick", markname: "naive_zoom_area" }
            ],
            update: "0"
          }
        ]
      },
      // Track if we're dragging the scrollbar (for cursor change)
      {
        name: "alignment_dragging",
        value: false,
        on: [
          {
            events: { source: "scope", type: "mousedown", markname: "scrollbar_thumb" },
            update: "true"
          },
          {
            events: { source: "window", type: "mouseup" },
            update: "false"
          }
        ]
      },
      // Computed domain for zoomed alignment view
      // Full domain is [-1, max_aa_seq_length]
      // When zoomed, we show a subset based on pan position
      {
        name: "aa_domain_start",
        update: "-1 + alignment_pan * (max_aa_seq_length + 1)"
      },
      {
        name: "aa_domain_end",
        update: "aa_domain_start + (max_aa_seq_length + 1) / alignment_zoom"
      },
      // Generate integer tick values for the visible domain range
      // This ensures ticks are always at integer positions regardless of zoom
      {
        name: "aa_tick_step",
        // Adjust step based on visible range to avoid overcrowding
        // At low zoom, use larger steps; at high zoom, show every integer
        update: "max(1, floor((aa_domain_end - aa_domain_start) / 20))"
      },
      {
        name: "aa_visible_ticks",
        // Generate integers from visible start to end, with appropriate step
        // Conditional on alignment_group_width forces re-evaluation when divider changes
        update: "alignment_group_width > 0 ? sequence(max(0, ceil(aa_domain_start)), min(max_aa_seq_length, floor(aa_domain_end)) + 1, aa_tick_step) : []"
      },
      {
        name: "aa_gridline_values",
        // Generate ALL integers in visible range for vertical gridlines (step = 1)
        update: "sequence(max(0, ceil(aa_domain_start)), min(max_aa_seq_length, floor(aa_domain_end)) + 1, 1)"
      },
      // Size of mutation marks vertically, clamped to max 20;
      // with scale factor to give space between each mark
      {
        name: "mutation_mark_height",
        update: "clamp(leaf_size*0.75, 0, 20)"
      },
      // Padding value to not cut off marks on fully zoomed out
      {
        name: "mutation_mark_padding",
        update: "mutation_mark_height/2"
      },
      {
        name: "mutation_mark_width",
        update: "ceil(alignment_group_width/150)"
      },
      // #59 this will need to be controlled by slider
      {
        name: "alignment_group_width",
        update: "show_alignment ? width-tree_group_width : 0"
      },

      // /DIVIDER DRAG SIGNALS:
      // ---------------------------------------------------------------------------
      // Track if the divider is being dragged
      {
        name: "divider_dragging",
        value: false,
        on: [
          {
            events: "@divider:mousedown, @divider:touchstart",
            update: "true"
          },
          {
            events: "window:mouseup, window:touchend",
            update: "false"
          }
        ]
      },
      // Track the starting x position when drag begins
      {
        name: "divider_drag_start_x",
        value: 0,
        on: [
          {
            events: "@divider:mousedown, @divider:touchstart",
            update: "x()"
          }
        ]
      },
      // Track the starting ratio when drag begins
      {
        name: "divider_drag_start_ratio",
        value: 0.3,
        on: [
          {
            events: "@divider:mousedown, @divider:touchstart",
            update: "tree_group_width_ratio"
          }
        ]
      },
      // Update ratio during drag
      {
        name: "tree_group_width_ratio",
        value: 0.3,
        ...maybeAddBind({
          name: "Tree width",
          input: "range",
          max: 0.98,
          min: 0.2,
          step: 0.02
        }),
        on: [
          {
            events: {
              source: "window",
              type: "mousemove",
              between: [
                { source: "scope", type: "mousedown", markname: "divider" },
                { source: "window", type: "mouseup" }
              ]
            },
            // Round to 0.02 increments for cleaner values
            update: "clamp(round((divider_drag_start_ratio + (x() - divider_drag_start_x) / width) * 50) / 50, 0.2, 0.98)"
          },
          {
            events: {
              type: "touchmove",
              between: [
                { source: "scope", type: "touchstart", markname: "divider" },
                { source: "window", type: "touchend" }
              ]
            },
            // Round to 0.02 increments for cleaner values
            update: "clamp(round((divider_drag_start_ratio + (x() - divider_drag_start_x) / width) * 50) / 50, 0.2, 0.98)"
          }
        ]
      },
      // /BOTTOM DIVIDER DRAG SIGNALS:
      // ---------------------------------------------------------------------------
      // Track if the bottom divider is being dragged
      {
        name: "bottom_divider_dragging",
        value: false,
        on: [
          {
            events: "@bottom_divider:mousedown, @bottom_divider:touchstart",
            update: "true"
          },
          {
            events: "window:mouseup, window:touchend",
            update: "false"
          }
        ]
      },
      // Track the starting y position when drag begins
      {
        name: "bottom_divider_drag_start_y",
        value: 0,
        on: [
          {
            events: "@bottom_divider:mousedown, @bottom_divider:touchstart",
            update: "event.clientY"
          }
        ]
      },
      // Track the starting ratio when drag begins
      {
        name: "bottom_divider_drag_start_ratio",
        value: 0.8,
        on: [
          {
            events: "@bottom_divider:mousedown, @bottom_divider:touchstart",
            update: "viz_height_ratio"
          }
        ]
      },
      // Height ratio control - allows compacting view for stacked mode
      // Also controlled by dragging the bottom divider
      {
        name: "viz_height_ratio",
        value: 0.8,
        ...maybeAddBind({
          name: "Tree height",
          input: "range",
          min: 0.2,
          max: 0.9,
          step: 0.05
        }),
        on: [
          {
            events: {
              source: "window",
              type: "mousemove",
              between: [
                { source: "scope", type: "mousedown", markname: "bottom_divider" },
                { source: "window", type: "mouseup" }
              ]
            },
            // Calculate new ratio based on drag distance relative to window height
            // Round to 0.05 increments for cleaner values
            update: "clamp(round((bottom_divider_drag_start_ratio + (event.clientY - bottom_divider_drag_start_y) / windowSize()[1]) * 20) / 20, 0.2, 0.9)"
          },
          {
            events: {
              type: "touchmove",
              between: [
                { source: "scope", type: "touchstart", markname: "bottom_divider" },
                { source: "window", type: "touchend" }
              ]
            },
            // Round to 0.05 increments for cleaner values
            update: "clamp(round((bottom_divider_drag_start_ratio + (event.clientY - bottom_divider_drag_start_y) / windowSize()[1]) * 20) / 20, 0.2, 0.9)"
          }
        ]
      },
      // Toggle to show/hide alignment - also controlled by drag position
      {
        name: "show_alignment",
        value: true,
        ...maybeAddBind({
          input: "checkbox",
          name: "Show alignment"
        }),
        on: [
          {
            // Hide alignment when dragged past 0.90
            events: {
              source: "window",
              type: "mousemove",
              between: [
                { source: "scope", type: "mousedown", markname: "divider" },
                { source: "window", type: "mouseup" }
              ]
            },
            update: "(divider_drag_start_ratio + (x() - divider_drag_start_x) / width) <= 0.90"
          },
          {
            // Touch support
            events: {
              type: "touchmove",
              between: [
                { source: "scope", type: "touchstart", markname: "divider" },
                { source: "window", type: "touchend" }
              ]
            },
            update: "(divider_drag_start_ratio + (x() - divider_drag_start_x) / width) <= 0.90"
          }
        ]
      },
      // Toggle to show/hide mutation borders
      {
        name: "show_mutation_borders",
        value: false,
        ...maybeAddBind({
          input: "checkbox",
          name: "Show mutation borders"
        })
      }
    ],

    // /LAYOUT: how top level group marks are formatted in a grid
    // ---------------------------------------------------------------------------

    layout: {
      padding: { column: 8 },
      // 2 columns so the grid repeats on the next row after two items (group marks)
      columns: 2,
      bounds: "full",
      align: "each"
    },

    // /MARKS:
    // ---------------------------------------------------------------------------

    marks: [
      // Evolution axis below the tree
      {
        name: "tree_x_axis",
        type: "group",
        role: "column-footer",
        encode: { update: { width: { signal: "tree_group_width" } } },
        axes: [
          {
            scale: "time",
            orient: "bottom",
            grid: false,
            title: { signal: "branch_length_mode_text" },
            labelFlush: true,
            labelOverlap: true,
            labelBound: true,
            zindex: 1
          }
        ],
        // pie chart legend - conditionally shown
        ...(showLegend ? {
          legends: [
            {
              orient: "bottom",
              direction: "horizontal",
              fill: "timepoint_multiplicities",
              title: { signal: "leaf_size_by_legend_label" }, // "Leaf color key:",
              titleLimit: "2000",
              encode: {
                symbols: {
                  update: { shape: { value: "circle" }, opacity: { value: 0.9 } }
                }
              }
            }
          ]
        } : {})
      },
      // Amino acid position axis
      {
        name: "alignment_x_axis",
        type: "group",
        role: "column-footer",
        encode: { update: { width: { signal: "alignment_group_width" } } },
        axes: [
          {
            // Offset to align axis with the mutations_clip region
            // yrange[0] accounts for pie_chart_padding plus any additional buffer
            offset: { signal: "mutation_mark_padding-yrange[0]" },
            scale: "aa_position",
            orient: "bottom",
            grid: false,
            title: { signal: "show_alignment ? 'Amino acid position' : ''" },
            labelFlush: true,
            labelOverlap: true,
            // Use computed integer tick values based on visible domain
            values: { signal: "aa_visible_ticks" },
            // Format as integers (no decimals)
            format: "d",
            zindex: 1,
            encode: {
              ticks: {
                update: { opacity: { signal: "show_alignment ? 1 : 0" } }
              },
              labels: {
                update: { opacity: { signal: "show_alignment ? 1 : 0" } }
              },
              domain: {
                update: { opacity: { signal: "show_alignment ? 1 : 0" } }
              },
              title: {
                update: { opacity: { signal: "show_alignment ? 1 : 0" } }
              }
            }
          }
        ]
      },

      // /TREE:
      // ---------------------------------------------------------------------------

      {
        type: "group",
        name: "tree_group",
        style: ["cell"],
        encode: {
          update: {
            clip: { value: true },
            // #59 this will need to be controlled by slider
            width: { signal: "tree_group_width" },
            height: { signal: "height" }
          }
        },
        signals: [
          // Zoom signals, {x,y}dom (and {xdom,ydom}_delta) are push: outer to allow access
          // at the top level other places in the spec
          {
            name: "down",
            value: null,
            on: [
              { events: "touchend", update: "null" },
              {
                events: {
                  type: "mousedown",
                  filter: "!event.item || !event.item.mark || (event.item.mark.name !== 'scrollbar_thumb' && event.item.mark.name !== 'scrollbar_track')"
                },
                update: "xy()"
              },
              { events: "touchstart", update: "xy()" }
            ]
          },
          {
            name: "xcur",
            value: null,
            on: [
              {
                events: {
                  type: "mousedown",
                  filter: "!event.item || !event.item.mark || (event.item.mark.name !== 'scrollbar_thumb' && event.item.mark.name !== 'scrollbar_track')"
                },
                update: "slice(xdom)"
              },
              { events: "touchstart, touchend", update: "slice(xdom)" }
            ]
          },
          {
            name: "ycur",
            value: null,
            on: [
              {
                events: {
                  type: "mousedown",
                  filter: "!event.item || !event.item.mark || (event.item.mark.name !== 'scrollbar_thumb' && event.item.mark.name !== 'scrollbar_track')"
                },
                update: "slice(ydom)"
              },
              { events: "touchstart, touchend", update: "slice(ydom)" }
            ]
          },
          // Dragging / panning
          {
            name: "delta",
            value: [0, 0],
            on: [
              {
                events: [
                  {
                    source: "window",
                    type: "mousemove",
                    between: [
                      {
                        type: "mousedown",
                        filter: "!event.item || !event.item.mark || (event.item.mark.name !== 'scrollbar_thumb' && event.item.mark.name !== 'scrollbar_track')"
                      },
                      { source: "window", type: "mouseup" }
                    ]
                  },
                  {
                    type: "touchmove",
                    consume: true,
                    filter: "event.touches.length === 1"
                  }
                ],
                update: "down ? [down[0]-x(), down[1]-y()] : [0,0]"
              }
            ]
          },
          // Anchor for zoom
          {
            name: "anchor",
            value: [0, 0],
            on: [
              {
                events: "wheel",
                update: "[invert('time', x()), invert('yscale', y() )]"
              },
              {
                events: { type: "touchstart", filter: "event.touches.length===2" },
                update: "[(xdom[0] + xdom[1]) / 2, (ydom[0] + ydom[1]) / 2]"
              }
            ]
          },
          // Zoom factor
          {
            name: "zoom",
            value: 1,
            on: [
              {
                events: "wheel!",
                force: true,
                update: "pow(1.001, event.deltaY * pow(16, event.deltaMode))"
              },
              {
                events: { signal: "dist2" },
                force: true,
                update: "dist1 / dist2"
              }
            ]
          },
          {
            name: "dist1",
            value: 0,
            on: [
              {
                events: { type: "touchstart", filter: "event.touches.length===2" },
                update: "pinchDistance(event)"
              },
              {
                events: { signal: "dist2" },
                update: "dist2"
              }
            ]
          },
          {
            name: "dist2",
            value: 0,
            on: [
              {
                events: { type: "touchmove", consume: true, filter: "event.touches.length===2" },
                update: "pinchDistance(event)"
              }
            ]
          },
          // Original delta values are stored in these signals to make the {x,y}dom delta handlers more readable
          {
            update: "slice(xext)",
            name: "xdom_delta",
            on: [
              {
                events: { signal: "delta" },
                update:
                  "[xcur[0] + span(xcur) * delta[0] / tree_group_width,   xcur[1] + span(xcur) * delta[0] / tree_group_width]"
              }
            ]
          },
          // Original delta values are stored in these signals to make the {x,y}dom delta handlers more readable
          {
            update: "slice(yext_fencepost)",

            name: "ydom_delta",
            on: [
              {
                events: { signal: "delta" },
                update: "[ycur[0] + span(ycur) * delta[1] / height,   ycur[1] + span(ycur) * delta[1] / height]"
              }
            ]
          },
          {
            push: "outer",
            name: "xdom",
            on: [
              // Update shown x values when dragging
              {
                events: { signal: "delta" },
                // Original values
                // "update": "[xcur[0] + span(xcur) * delta[0] / tree_group_width,   xcur[1] + span(xcur) * delta[0] / tree_group_width]"
                // Limiting dragging to the boundaries of the tree
                update: "xdom_delta[0] < xext[0] || xdom_delta[1] > xext[1] ? slice(xdom) : slice(xdom_delta)"
              },
              // Update shown x values when zooming
              {
                events: { signal: "zoom" },
                // Original values
                // "update": "[(anchor[0] + (xdom[0] - anchor[0]) * zoom) ,  (anchor[0] + (xdom[1] - anchor[0]) * zoom) ]"
                // Limiting zoom to the boundaries of the tree
                update:
                  "[ max( (anchor[0] + (xdom[0] - anchor[0]) * zoom) , xext[0] ),   min( (anchor[0] + (xdom[1] - anchor[0]) * zoom), xext[1]) ]"
              },
              // Reset to full extent on double-click
              {
                events: { type: "dblclick" },
                update: "slice(xext)"
              }
            ]
          },
          {
            push: "outer",
            name: "ydom",
            on: [
              // Update shown y values when dragging
              {
                events: { signal: "delta" },
                // Original values
                // "update": "[ycur[0] + span(ycur) * delta[1] / height,   ycur[1] + span(ycur) * delta[1] / height]"
                // Limiting dragging so tree stays at least at the midpoint of the view
                // Top branch (yext[0]) cannot go below midpoint, bottom branch (yext[1]) cannot go above midpoint
                update: "yext[0] > (ydom_delta[0] + ydom_delta[1])/2 || yext[1] < (ydom_delta[0] + ydom_delta[1])/2 ? slice(ydom) : slice(ydom_delta)"
              },
              // Update shown y values when zooming
              {
                events: { signal: "zoom" },
                // Original values
                // "update": "[(anchor[1] + (ydom[0] - anchor[1]) * zoom), (anchor[1] + (ydom[1] - anchor[1]) * zoom) ]"
                // Limiting zoom so tree stays at least at the midpoint of the view
                update:
                  "[ max( (anchor[1] + (ydom[0] - anchor[1]) * zoom), yext[0] - span(yext)/2), min( (anchor[1] + (ydom[1] - anchor[1]) * zoom), yext[1] + span(yext)/2 ) ] "
              },
              // Reset to full extent on double-click (with fence-post spacing)
              {
                events: { type: "dblclick" },
                update: "slice(yext_fencepost)"
              }
            ]
          }
        ],
        marks: [
          // /SELECTED HIGHLIGHT ROW
          // Persistent highlight bar for clicked/selected leaf
          {
            name: "tree_selected_highlight",
            type: "rect",
            encode: {
              update: {
                x: { value: 0 },
                x2: { signal: "tree_group_width" },
                yc: { signal: "scale('yscale', selected_leaf_y_tree)" },
                height: { signal: "mutation_mark_height + 4" },
                fill: { value: "#90caf9" },
                fillOpacity: { signal: "selected_leaf_y_tree !== null ? 0.4 : 0" }
              }
            }
          },
          // /HOVER HIGHLIGHT ROW
          // Horizontal highlight bar that appears when hovering over a leaf
          {
            name: "tree_hover_highlight",
            type: "rect",
            encode: {
              update: {
                x: { value: 0 },
                x2: { signal: "tree_group_width" },
                yc: { signal: "scale('yscale', hovered_leaf_y_tree)" },
                height: { signal: "mutation_mark_height + 4" },
                fill: { value: "#ffeb3b" },
                fillOpacity: { signal: "hovered_leaf_y_tree !== null ? 0.3 : 0" }
              }
            }
          },
          // /LINKS
          {
            encode: {
              update: {
                path: { field: "path" },
                strokeWidth: [
                  // Size branches by the branch_width_by_field (see data transform)
                  {
                    test: 'branch_width_by !== "<none>"',
                    scale: "branch_width",
                    field: "target.branch_width_by_field"
                  },
                  // Size all branches the same if branch_width_by is "<none>"
                  { value: "2" }
                ],
                stroke: [
                  // Color branches by the branch_color_by_field (see data transform)
                  {
                    test: 'branch_color_by !== "<none>"',
                    scale: { signal: "branch_color_scale" },
                    field: "target.branch_color_by_field"
                  },
                  // Color all branches grey if branch_color_by is "<none>"
                  { value: "grey" }
                ]
              }
            },
            type: "path",
            from: { data: "links" }
          },
          // /INTERNAL NODES
          {
            name: "ancestor",
            encode: {
              update: {
                y: {
                  field: "y"
                },
                fill: { value: "#000" },
                x: {
                  field: "x"
                },
                tooltip: {
                  signal: '{"id": datum["sequence_id"], "parent": datum["parent"], "distance": datum["distance"],"lbi": datum["lbi"],"lbr": datum["lbr"],"affinity": datum["affinity"],"scaled_affinity": datum["scaled_affinity"], "multiplicity": datum["multiplicity"], "cluster_multiplicity": datum["cluster_multiplicity"]}'
                }
              },
              enter: {
                size: { value: 20 },
                stroke: { value: "#000" }
              }
            },
            type: "symbol",
            from: { data: "nodes" }
          },
          // /LEAVES
          // Pie charts: size depends on multiplicity
          {
            name: "pie",
            type: "arc",
            from: { data: "leaf_pies" },
            encode: {
              update: {
                fill: { scale: "timepoint_multiplicities", field: "timepoint_multiplicity_key" },
                fillOpacity: { value: "0.5" },
                x: {
                  field: "x"
                },
                y: {
                  field: "y"
                },
                startAngle: { field: "startAngle" },
                endAngle: { field: "endAngle" },
                // Set inner radius to get donuts instead of pie charts
                // "innerRadius": {"scale": "leaf_size_scale", "field": {"signal": "leaf_size_by"}},
                tooltip: {
                  signal:
                    '{"id": datum["sequence_id"], "parent": datum["parent"], "distance": datum["distance"],"lbi": datum["lbi"],"lbr": datum["lbr"],"affinity": datum["affinity"],"scaled_affinity": datum["scaled_affinity"], "multiplicity": datum["multiplicity"], "cluster_multiplicity": datum["cluster_multiplicity"], "timepoint": datum["timepoint_multiplicity_key"], "timepoint multiplicity": datum["timepoint_multiplicity_value"]}'
                },
                outerRadius: {
                  scale: "leaf_size_scale",
                  // Here we actually use the field named "leaf_size_by" instead of the signal
                  // value because we have written the value of the appropriate field
                  // into a new field named "leaf_size_by"
                  field: "leaf_size_by"
                }
              }
            }
          },
          // /LEAF CENTERS
          {
            name: "leaf_center",
            encode: {
              update: {
                y: {
                  field: "y"
                },
                fill: { value: "#000" },
                fillOpacity: { value: "0.5" },
                x: {
                  field: "x"
                },
                size: [{ test: "show_labels", value: 1 }, { signal: "leaf_size*2" }],
                cursor: { value: "pointer" },
                tooltip: {
                  signal:
                    '{"id": datum["sequence_id"], "parent": datum["parent"], "distance": datum["distance"],"lbi": datum["lbi"],"lbr": datum["lbr"],"affinity": datum["affinity"],"scaled_affinity": datum["scaled_affinity"], "multiplicity": datum["multiplicity"], "cluster_multiplicity": datum["cluster_multiplicity"], "timepoint": datum["timepoint_multiplicity_key"], "timepoint multiplicity": datum["timepoint_multiplicity_value"]}'
                }
              }
            },
            type: "symbol",
            from: { data: "leaves" }
          },
          // /LEAF LABELS
          {
            name: "leaf_label",
            type: "text",
            encode: {
              update: {
                text: [{ test: "show_labels", field: "sequence_id" }, { value: null }],
                limit: { signal: "leaf_label_length_limit" },
                // Show selected sequence as darker, default to all grey #80
                opacity: [
                  { test: '!pts || pts && datum.sequence_id !== data("pts_store")[0].sequence_id', value: 0.5 },
                  { value: 1 }
                ],
                // Make seed larger #78
                fontSize: [
                  { test: "indata('seed', 'id', datum.sequence_id)", signal: "label_size*1.5" },
                  { signal: "label_size" }
                ],
                // Bold the seed #78
                fontWeight: [{ test: "indata('seed', 'id', datum.sequence_id)", value: "bold" }, { value: "normal" }],
                cursor: { value: "pointer" },
                y: {
                  field: "y"
                },
                dx: { scale: "leaf_label_offset", field: { signal: "leaf_size_by" } },
                dy: { value: 3 },
                x: {
                  field: "x"
                },
                tooltip: {
                  signal:
                    '{"id": datum["sequence_id"], "parent": datum["parent"], "distance": datum["distance"],"lbi": datum["lbi"],"lbr": datum["lbr"],"affinity": datum["affinity"],"scaled_affinity": datum["scaled_affinity"], "multiplicity": datum["multiplicity"], "cluster_multiplicity": datum["cluster_multiplicity"], "timepoint": datum["timepoint_multiplicity_key"], "timepoint multiplicity": datum["timepoint_multiplicity_value"]}'
                }
              }
            },
            from: { data: "leaves" }
          },
          // /DRAGGABLE DIVIDER (vertical - tree/alignment width)
          // Vertical bar at the right edge of tree_group that can be dragged to resize
          // Always visible so user can drag back to show alignment
          {
            name: "divider",
            type: "rect",
            encode: {
              enter: {
                cursor: { value: "col-resize" }
              },
              update: {
                x: { signal: "tree_group_width - 6" },
                y: { value: -10 },
                width: { value: 14 },
                height: { signal: "height + 20" },
                fill: { signal: "divider_dragging ? '#666' : '#ccc'" },
                fillOpacity: { signal: "divider_dragging ? 0.9 : 0.6" },
                cornerRadius: { value: 2 }
              }
            }
          },
          // /BOTTOM DIVIDER (horizontal - viz height)
          // Horizontal bar at the bottom of tree_group that can be dragged to resize height
          {
            name: "bottom_divider",
            type: "rect",
            encode: {
              enter: {
                cursor: { value: "row-resize" }
              },
              update: {
                x: { value: 0 },
                y: { signal: "height - 6" },
                width: { signal: "tree_group_width" },
                height: { value: 14 },
                fill: { signal: "bottom_divider_dragging ? '#666' : '#ccc'" },
                fillOpacity: { signal: "bottom_divider_dragging ? 0.9 : 0.6" },
                cornerRadius: { value: 2 }
              }
            }
          }
        ]
      },

      // /SEQUENCE ALIGNMENT
      // ---------------------------------------------------------------------------

      {
        type: "group",
        name: "alignment_group",
        style: "cell",
        // Disable clipping so naive_group (gene region) above isn't cut off
        clip: false,
        encode: {
          update: {
            // Hide cell border
            stroke: { value: "transparent" },
            // #59 this will need to be controlled by slider
            width: { signal: "alignment_group_width" },
            height: { signal: "height" },
            opacity: { signal: "show_alignment ? 1 : 0" }
          }
        },
        signals: [
          {
            name: "naive_group_height",
            value: 40
          },
          // Horizontal-only clip path for naive_group
          // Clips horizontally to alignment_group_width, but extends far vertically to avoid vertical clipping
          {
            name: "naive_horizontal_clip",
            update: "'M 0 -1000 L 0 1000 L ' + alignment_group_width + ' 1000 L ' + alignment_group_width + ' -1000 z'"
          },
          // This is an SVG path used to assign a special clipping region (not the default,
          // i.e. the height and width of the group mark) for the alignment. This is
          // necessary to get the naive viz as close as possible to the alignment so one
          // can align mutations with the naive by eye. Doing so became difficult when
          // allowing the tree to have padding, as it shares a y-scale with the alignment
          // , so the mutation marks were not flush agaisnt the border of their plot.
          {
            name: "mutations_clip",
            update:
              " 'M 0 ' + toString(yrange[0]-mutation_mark_padding) + ' L 0 ' + toString(yrange[1]+mutation_mark_padding) + ' L ' + alignment_group_width + ' ' + toString(yrange[1]+mutation_mark_padding) + ' L ' + alignment_group_width + ' ' + toString(yrange[0]-mutation_mark_padding) + ' z' "
          }
        ],
        marks: [
          // Show clipping region border
          {
            encode: {
              update: {
                path: { signal: "mutations_clip" },
                strokeWidth: { value: 0.5 },
                stroke: { value: "grey" }
              }
            },
            type: "path"
          },
          // /NAIVE
          {
            name: "naive_group",
            type: "group",
            style: "cell",
            // Use horizontal-only clip path to prevent gene region marks from overflowing
            // horizontally while allowing full vertical visibility
            clip: { path: { signal: "naive_horizontal_clip" } },
            encode: {
              update: {
                stroke: { value: "transparent" },
                // #59 this will need to be controlled by slider
                // Position naive_group above the mutations_clip region
                // yrange[0] - mutation_mark_padding is the top of mutations_clip
                // Then subtract naive_group_height and a 10px gap
                y: { signal: "yrange[0]-mutation_mark_padding-naive_group_height-10" },
                width: { signal: "alignment_group_width" },
                height: { signal: "naive_group_height" }
              }
            },
            marks: [
              // Interaction area for naive region zoom
              // Use very low opacity fill (not transparent) to ensure mouse events are captured
              {
                name: "naive_zoom_area",
                type: "rect",
                encode: {
                  enter: {
                    fill: { value: "#000" },
                    fillOpacity: { value: 0.001 },
                    cursor: { value: "default" }
                  },
                  update: {
                    x: { value: 0 },
                    y: { value: 0 },
                    width: { signal: "alignment_group_width" },
                    height: { signal: "naive_group_height" }
                  }
                }
              },
              {
                name: "naive",
                type: "rect",
                style: ["bar"],
                from: {
                  data: "naive_data"
                },
                encode: {
                  update: {
                    fill: { scale: "naive_color", field: "region" },
                    opacity: [
                      {
                        test: "datum[\"region\"] == 'Sequence'",
                        value: 0.75
                      },
                      { value: 1 }
                    ],
                    tooltip: {
                      signal:
                        '{"region": \'\'+datum["region"], "start (NT)": format(datum["start"], ""), "start (AA)": format(floor(datum["start"]/3), ""), "end (NT)": format(datum["end"], ""), "end (AA)": format(floor(datum["end"]/3), ""), "gene": \'\'+datum["gene"]}'
                    },
                    x: {
                      scale: "aa_position",
                      signal: 'floor(datum["start"]/3)-0.5'
                    },
                    x2: {
                      scale: "aa_position",
                      signal: 'floor(datum["end"]/3)+0.5'
                    },
                    yc: { signal: "naive_group_height/4" },
                    height: [
                      {
                        test: "datum[\"region\"] == 'CDR1' || datum[\"region\"] == 'CDR2' || datum[\"region\"] == 'CDR3'",
                        signal: "naive_group_height*0.6"
                      },
                      {
                        test: "datum[\"region\"] == 'Sequence'",
                        signal: "naive_group_height/4"
                      },
                      { signal: "naive_group_height/4" }
                    ]
                  }
                }
              },
              {
                name: "marks",
                type: "rect",
                style: ["tick"],
                from: { data: "naive_mutations" },
                encode: {
                  update: {
                    opacity: { value: 0.9 },
                    fill: [
                      {
                        test: 'datum["position"] === null || isNaN(datum["position"])',
                        value: null
                      },
                      { scale: "aa_color", field: "mut_to" }
                    ],
                    stroke: { value: "black" },
                    strokeWidth: { value: 0.5 },
                    tooltip: {
                      signal:
                        '{"position": format(datum["position"], ""), "seq_id": \'\'+datum["seq_id"], "mut_to": \'\'+datum["mut_to"], "mut_from": \'\'+datum["mut_from"]}'
                    },
                    xc: { scale: "aa_position", field: "position" },
                    yc: { signal: "3*naive_group_height/4" },
                    height: { signal: "naive_group_height/4" },
                    width: { signal: "mutation_mark_width" }
                  }
                }
              },
              // /GAP character labels (naive)
              {
                name: "x_and_gaps_labels",
                type: "text",
                from: { data: "naive_mutations_x_and_gaps" },
                encode: {
                  enter: {
                    text: { field: "mut_to" },
                    fill: { value: "#000" }
                    // fontSize must be increased for gap character '-' to make it visible
                  },
                  update: {
                    // center the text on x, y properties
                    align: { value: "center" },
                    baseline: { value: "middle" },
                    // Style the '-' and 'X' differently to make them equally visible
                    fontWeight: { signal: "datum.mut_to == \"-\" ? 'bold' : 'normal'" },
                    font: { signal: "datum.mut_to == \"-\" ? 'sans-serif' : 'monospace'" },
                    fontSize: { signal: 'datum.mut_to == "-" ? 20 : 15' },
                    opacity: { value: 0.9 },
                    y: { signal: "3*naive_group_height/4" },
                    x: { scale: "aa_position", field: "position" },
                    tooltip: {
                      signal:
                        '{"position": format(datum["position"], ""), "seq_id": \'\'+datum["seq_id"], "mut_to": \'\'+datum["mut_to"], "mut_from": \'\'+datum["mut_from"]}'
                    }
                  }
                }
              }
            ],
            // Color legend for naive
            legends: [
              {
                orient: "top",
                direction: "horizontal",
                fill: "naive_color",
                title: "Gene region color key",
                offset: { signal: "10" },
                encode: {
                  title: {
                    update: { opacity: { signal: "show_alignment ? 1 : 0" } }
                  },
                  labels: {
                    update: { opacity: { signal: "show_alignment ? 1 : 0" } }
                  },
                  symbols: {
                    update: { shape: { value: "square" }, opacity: { signal: "show_alignment ? 0.9 : 0" } }
                  },
                  entries: {
                    update: { opacity: { signal: "show_alignment ? 1 : 0" } }
                  }
                }
              }
            ]
          },
          // /ALIGNMENT
          {
            type: "group",
            name: "mutations_group",
            style: "cell",
            clip: { path: { signal: "mutations_clip" } },
            encode: {
              update: {
                // #59 this will need to be controlled by slider
                width: { signal: "alignment_group_width" },
                height: { signal: "height" }
              }
            },
            marks: [
              // Interaction area for zoom (scroll wheel)
              // Use very low opacity fill (not transparent) to ensure mouse events are captured
              {
                name: "alignment_zoom_area",
                type: "rect",
                encode: {
                  enter: {
                    fill: { value: "#000" },
                    fillOpacity: { value: 0.001 },
                    cursor: { value: "default" }
                  },
                  update: {
                    x: { value: 0 },
                    y: { value: 0 },
                    width: { signal: "alignment_group_width" },
                    height: { signal: "height" }
                  }
                }
              },
              // /SELECTED HIGHLIGHT ROW
              // Persistent highlight bar for clicked/selected leaf
              {
                name: "alignment_selected_highlight",
                type: "rect",
                encode: {
                  update: {
                    x: { value: 0 },
                    x2: { signal: "alignment_group_width" },
                    yc: { signal: "scale('yscale', selected_leaf_y_tree)" },
                    height: { signal: "mutation_mark_height + 4" },
                    fill: { value: "#90caf9" },
                    fillOpacity: { signal: "selected_leaf_y_tree !== null ? 0.4 : 0" }
                  }
                }
              },
              // /HOVER HIGHLIGHT ROW
              // Horizontal highlight bar that appears when hovering over a leaf
              {
                name: "alignment_hover_highlight",
                type: "rect",
                encode: {
                  update: {
                    x: { value: 0 },
                    x2: { signal: "alignment_group_width" },
                    yc: { signal: "scale('yscale', hovered_leaf_y_tree)" },
                    height: { signal: "mutation_mark_height + 4" },
                    fill: { value: "#ffeb3b" },
                    fillOpacity: { signal: "hovered_leaf_y_tree !== null ? 0.3 : 0" }
                  }
                }
              },
              {
                name: "y_grid",
                type: "rule",
                from: { data: "leaves" },
                encode: {
                  enter: {
                    stroke: { signal: "rgb(221, 221, 221)" },
                    opacity: { value: 1 },
                    strokeWidth: { value: 1 }
                  },
                  update: {
                    y: { field: "y" },
                    // Use pixel values directly to ensure full width coverage
                    x: { value: 0 },
                    x2: { signal: "alignment_group_width" }
                  }
                }
              },
              {
                name: "rule_cdr3",
                type: "rule",
                from: { data: "cdr_bounds" },
                encode: {
                  enter: {
                    stroke: { value: "black" },
                    fill: { value: "black" },
                    opacity: { value: 0.6 }
                  },
                  update: {
                    x: { scale: "aa_position", field: "x" },
                    // This mark had a variable, negative y value;
                    // was causing issues with this whole group jumping around
                    y: 0,
                    y2: { signal: "height" },
                    strokeWidth: { value: 1 },
                    strokeDash: { value: [12, 4] },
                    strokeCap: { value: "butt" },
                    opacity: { value: 1 }
                  }
                }
              },
              // /MUTATIONS MARKS
              {
                name: "marks",
                type: "rect",
                style: ["tick"],
                from: { data: "data_1" },
                encode: {
                  update: {
                    opacity: { value: 0.9 },
                    fill: [
                      {
                        test: 'datum["position"] === null || isNaN(datum["position"])',
                        value: null
                      },
                      { scale: "aa_color", field: "mut_to" }
                    ],
                    stroke: { signal: "show_mutation_borders ? 'black' : null" },
                    strokeWidth: { signal: "show_mutation_borders ? 0.5 : 0" },
                    tooltip: {
                      signal:
                        '{"position": format(datum["position"], ""), "seq_id": \'\'+datum["seq_id"], "mut_to": \'\'+datum["mut_to"], "mut_from": \'\'+datum["mut_from"]}'
                    },
                    xc: { scale: "aa_position", field: "position" },
                    yc: {
                      field: "y"
                    },
                    height: { signal: "mutation_mark_height" },
                    width: { signal: "mutation_mark_width" }
                  }
                }
              },
              // /GAP character labels
              {
                name: "x_and_gaps_labels",
                type: "text",
                from: { data: "x_and_gaps" },
                encode: {
                  enter: {
                    text: { field: "mut_to" },
                    fill: { value: "#000" }
                    // fontSize must be increased for gap character '-' to make it visible
                  },
                  update: {
                    // center the text on x, y properties
                    align: { value: "center" },
                    baseline: { value: "middle" },
                    // Style the '-' and 'X' differently to make them equally visible
                    fontWeight: { signal: "datum.mut_to == \"-\" ? 'bold' : 'normal'" },
                    font: { signal: "datum.mut_to == \"-\" ? 'sans-serif' : 'monospace'" },
                    fontSize: {
                      signal:
                        'datum.mut_to == "-" ? clamp(mutation_mark_height*2, 0, mutation_mark_width*2) : clamp(mutation_mark_height*1.5, 0, mutation_mark_width*2)'
                    },
                    opacity: { value: 0.9 },
                    y: {
                      field: "y"
                    },
                    x: { scale: "aa_position", field: "position" },
                    tooltip: {
                      signal:
                        '{"position": format(datum["position"], ""), "seq_id": \'\'+datum["seq_id"], "mut_to": \'\'+datum["mut_to"], "mut_from": \'\'+datum["mut_from"]}'
                    }
                  }
                }
              }
            ],
            // ALIGNMENT GRIDLINES
            axes: [
              // x grid - always at integer positions
              {
                scale: "aa_position",
                orient: "bottom",
                grid: true,
                // Use explicit integer values for gridlines
                values: { signal: "aa_gridline_values" },
                domain: false,
                labels: false,
                maxExtent: 0,
                minExtent: 0,
                ticks: false,
                zindex: 0
              }
            ]
          },
          // /SCROLLBAR (outside mutations_group to avoid clipping)
          // Interactive scrollbar for panning when zoomed
          // Track background (full width) - clickable to jump to position
          {
            name: "scrollbar_track",
            type: "rect",
            encode: {
              update: {
                x: { value: 0 },
                y: { signal: "height + 42" },
                width: { signal: "alignment_group_width" },
                height: { value: 8 },
                fill: { value: "#e0e0e0" },
                cornerRadius: { value: 4 },
                cursor: { signal: "alignment_zoom > 1 ? 'pointer' : 'default'" },
                // Only show when zoomed
                opacity: { signal: "alignment_zoom > 1 ? 0.9 : 0" }
              }
            }
          },
          // Draggable thumb (shows current view area)
          {
            name: "scrollbar_thumb",
            type: "rect",
            encode: {
              update: {
                // Position based on pan (0-1 range scaled to track width)
                x: { signal: "alignment_pan * alignment_group_width" },
                y: { signal: "height + 42" },
                // Width represents the proportion of visible content
                width: { signal: "max(20, alignment_group_width / alignment_zoom)" },
                height: { value: 8 },
                fill: { signal: "alignment_dragging ? '#555' : '#888'" },
                cornerRadius: { value: 4 },
                cursor: { signal: "alignment_zoom > 1 ? 'grab' : 'default'" },
                // Only show when zoomed
                opacity: { signal: "alignment_zoom > 1 ? 1 : 0" }
              }
            }
          },
          // Zoom level indicator text
          {
            name: "zoom_indicator_text",
            type: "text",
            encode: {
              update: {
                x: { signal: "alignment_group_width - 5" },
                y: { signal: "height + 38" },
                text: { signal: "alignment_zoom > 1 ? format(alignment_zoom, '.1f') + 'x zoom' : ''" },
                fontSize: { value: 11 },
                fill: { value: "#555" },
                align: { value: "right" },
                baseline: { value: "bottom" }
              }
            }
          }
        ]
      }
    ],

    // /SCALES
    // ---------------------------------------------------------------------------
    scales: [
      {
        name: "branch_color_categorical",
        type: "ordinal",
        domain: { data: "tree", field: "branch_color_by_field" },
        range: { scheme: "category10" }
      },
      {
        name: "branch_color_sequential",
        type: "sequential",
        domain: { signal: "branch_color_extent" },
        range: { signal: "branch_color_scheme_map[branch_color_scheme]" }
      },
      {
        name: "branch_width",
        type: "linear",
        domain: { signal: "branch_width_extent" },
        range: [0.5, 5]
      },
      {
        name: "naive_color",
        type: "ordinal",
        domain: ["V gene", "5' Insertion", "D gene", "3' Insertion", "J gene", "CDR1", "CDR2", "CDR3", "Sequence"],
        // /COLORS - CDR1, CDR2, and CDR3 all use the same dark green (#1b7837), Sequence is grey
        range: ["#762a83", "#af8dc3", "black", "#d9f0d3", "#7fbf7b", "#1b7837", "#1b7837", "#1b7837", "#cccccc"]
      },
      {
        name: "timepoint_multiplicities",
        type: "ordinal",
        domain: { data: "leaf_pies", field: "timepoint_multiplicity_key" },
        range: { scheme: "category20" }
      },
      {
        name: "simple_color",
        type: "ordinal",
        range: { scheme: "category20" }
      },
      {
        name: "leaf_label_offset",
        type: "linear",
        domain: { data: "leaves", field: { signal: "leaf_size_by" } },
        range: [4, { signal: "max_leaf_size/55" }]
      },
      {
        name: "leaf_size_scale",
        type: "linear",
        domain: { data: "leaves", field: { signal: "leaf_size_by" } },
        range: [0, { signal: "max_leaf_size" }]
      },
      // Tree x scale
      {
        name: "time",
        zero: false,
        domain: { signal: "xdom" },
        range: { signal: "xrange" }
      },
      // Global y scale (leaves and alignment are on the same y scale)
      {
        name: "yscale",
        zero: false,
        domain: { signal: "ydom" },
        range: { signal: "yrange" }
      },
      // Alignment x scale (with zoom/pan support)
      {
        name: "aa_position",
        type: "linear",
        domain: { signal: "[aa_domain_start, aa_domain_end]" },
        range: [0, { signal: "alignment_group_width" }],
        zero: false
      },
      {
        name: "aa_color",
        type: "ordinal",
        domain: aminoAcidDomain,
        range: tableau20plusColors
      }
    ],
    // LEGENDS
    // ---------------------------------------------------------------------------
    legends: [
      {
        orient: "right",
        direction: "vertical",
        fill: "aa_color",
        title: "AA color",
        encode: {
          legend: {
            update: { opacity: { signal: "show_alignment ? 1 : 0" } }
          },
          symbols: {
            update: { shape: { value: "square" }, opacity: { value: 0.9 } }
          }
        }
      }
    ]
  };
};

const seqAlignSpec = (family, options = {}) => {
  const { showMutationBorders = false } = options;
  const padding = 20;
  const mutation_mark_height = 16; // Increased for better spacing and padding
  const min_height = 100; // Minimum height to ensure visibility
  const max_height = 5000; // Maximum height to prevent performance issues with very large trees
  // Add some height here for padding and to accomodate naive gene regions section
  const calculated_height = (family["lineage_seq_counter"] + 2) * mutation_mark_height + padding;
  const height = Math.min(max_height, Math.max(min_height, calculated_height));

  return {
    $schema: "https://vega.github.io/schema/vega/v5.json",
    padding: 5,
    height: height,
    width: 1000,
    style: "cell",
    data: [
      {
        // This is for the naive gene regions shown
        // at the top of the viz
        name: "naive_data",
        transform: [{ type: "extent", field: "end", signal: "dna_j_gene_end" }]
      },
      {
        // For showing CDR regions with dotted lines in the alignment
        name: "cdr_bounds"
      },
      {
        name: "source_0"
      },
      {
        name: "data_0",
        source: "source_0",
        transform: [
          {
            type: "formula",
            expr: 'toNumber(datum["position"])',
            as: "position"
          },
          {
            type: "extent",
            field: "position",
            signal: "position_extent"
          }
        ]
      },
      {
        name: "x_and_gaps",
        source: "data_0",
        transform: [
          {
            type: "filter",
            expr: 'datum.mut_to == "-" || datum.mut_to == "X"'
          }
        ]
      }
    ],
    signals: [
      {
        name: "max_aa_seq_length",
        update: "max(ceil(dna_j_gene_end[1]/3), position_extent ? position_extent[1] + 1 : 0)"
      },
      {
        name: "mutation_mark_height",
        value: mutation_mark_height
      },
      {
        name: "lineage_seqs",
        value: family["lineage_seq_counter"]
      },
      {
        name: "mark_width",
        update: "ceil(width/150)"
      },
      // Toggle to show/hide mutation borders - controlled via React state
      {
        name: "show_mutation_borders",
        value: showMutationBorders
      }
    ],
    marks: [
      // Naive gene regions
      {
        name: "naive",
        type: "rect",
        style: ["bar"],
        from: {
          data: "naive_data"
        },
        encode: {
          update: {
            fill: { scale: "naive_color", field: "region" },
            opacity: [
              {
                test: "datum[\"region\"] == 'Sequence'",
                value: 0.75
              },
              { value: 1 }
            ],
            tooltip: {
              signal:
                '{"region": \'\'+datum["region"], "start (NT)": format(datum["start"], ""), "start (AA)": format(floor(datum["start"]/3), ""), "end (NT)": format(datum["end"], ""), "end (AA)": format(floor(datum["end"]/3), ""), "gene": \'\'+datum["gene"]}'
            },
            x: {
              scale: "aa_position",
              signal: 'floor(datum["start"]/3)-0.5'
            },
            x2: {
              scale: "aa_position",
              signal: 'floor(datum["end"]/3)+0.5'
            },
            yc: { signal: "-1.5*mutation_mark_height" },
            height: [
              {
                test: "datum[\"region\"] == 'CDR1' || datum[\"region\"] == 'CDR2' || datum[\"region\"] == 'CDR3'",
                signal: "mutation_mark_height*2.4"
              },
              {
                test: "datum[\"region\"] == 'Sequence'",
                signal: "mutation_mark_height"
              },
              { signal: "mutation_mark_height" }
            ]
          }
        }
      },
      // CDR bounds
      {
        name: "rule_cdr3",
        type: "rule",
        from: { data: "cdr_bounds" },

        encode: {
          enter: {
            stroke: { value: "black" },
            fill: { value: "black" },
            opacity: { value: 0.6 }
          },
          update: {
            x: { scale: "aa_position", field: "x" },
            y: { signal: "-1*mutation_mark_height" },
            y2: { signal: "height" },
            strokeWidth: { value: 1 },
            strokeDash: { value: [12, 4] },
            strokeCap: { value: "butt" },
            opacity: { value: 1 }
          }
        }
      },
      // Mutation marks
      {
        name: "marks",
        type: "rect",
        style: ["tick"],
        from: { data: "data_0" },
        encode: {
          update: {
            opacity: { value: 0.9 },
            fill: [
              {
                test: 'datum["position"] === null || isNaN(datum["position"])',
                value: null
              },
              { scale: "aa_color", field: "mut_to" }
            ],
            stroke: { signal: "show_mutation_borders ? 'black' : null" },
            strokeWidth: { signal: "show_mutation_borders ? 0.5 : 0" },
            tooltip: {
              signal:
                '{"position": format(datum["position"], ""), "seq_id": \'\'+datum["seq_id"], "mut_to": \'\'+datum["mut_to"], "mut_from": \'\'+datum["mut_from"]}'
            },
            xc: { scale: "aa_position", field: "position" },
            yc: { scale: "y", field: "seq_id" },
            height: { signal: "mutation_mark_height" },
            width: { signal: "mark_width" }
          }
        }
      },
      // Gap character labels
      {
        name: "x_and_gap_labels",
        type: "text",
        from: { data: "x_and_gaps" },
        encode: {
          enter: {
            text: { field: "mut_to" },
            fill: { value: "#000" }
          },
          update: {
            align: { value: "center" },
            baseline: { value: "middle" },
            // Style the '-' and 'X' differently to make them equally visible
            fontSize: { signal: 'datum.mut_to == "-" ? mutation_mark_height*2 : mutation_mark_height*1.5' },
            fontWeight: { signal: "datum.mut_to == \"-\" ? 'bold' : 'normal'" },
            font: { signal: "datum.mut_to == \"-\" ? 'sans-serif' : 'monospace'" },
            opacity: { value: 0.7 },
            y: { scale: "y", field: "seq_id" },
            x: { scale: "aa_position", field: "position" },
            tooltip: {
              signal:
                '{"position": format(datum["position"], ""),  "seq_id": \'\'+datum["seq_id"], "mut_to": \'\'+datum["mut_to"], "mut_from": \'\'+datum["mut_from"]}'
            }
          }
        }
      }
    ],
    scales: [
      {
        name: "naive_color",
        type: "ordinal",
        domain: ["V gene", "5' Insertion", "D gene", "3' Insertion", "J gene", "CDR1", "CDR2", "CDR3", "Sequence"],
        // COLORS - CDR1, CDR2, and CDR3 all use the same dark green (#1b7837), Sequence is grey
        range: ["#762a83", "#af8dc3", "black", "#d9f0d3", "#7fbf7b", "#1b7837", "#1b7837", "#1b7837", "#cccccc"]
      },
      {
        name: "aa_position",
        type: "linear",
        domain: [0, { signal: "max_aa_seq_length" }],
        range: [5, { signal: "width" }],
        nice: true,
        zero: true
      },
      {
        name: "y",
        type: "point",
        domain: { data: "data_0", field: "seq_id" },
        range: [0, { signal: "height" }],
        padding: 0.5
      },
      {
        name: "aa_color",
        type: "ordinal",
        domain: aminoAcidDomain,
        range: tableau20plusColors
      }
    ],
    axes: [
      {
        scale: "aa_position",
        orient: "bottom",
        grid: false,
        title: "position",
        labelFlush: true,
        labelOverlap: true,
        tickCount: { signal: "ceil(width/40)" },
        zindex: 1
      },
      {
        scale: "aa_position",
        orient: "bottom",
        gridScale: "y",
        grid: true,
        tickCount: { signal: "max_aa_seq_length" },
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
        grid: false,
        title: "seq id",
        zindex: 1
      },
      {
        scale: "y",
        orient: "left",
        gridScale: "aa_position",
        grid: true,
        tickCount: { signal: "max_aa_seq_length" },
        domain: false,
        labels: false,
        maxExtent: 0,
        minExtent: 0,
        ticks: false,
        zindex: 0
      }
    ],
    legends: [
      {
        orient: "top",
        direction: "horizontal",
        fill: "naive_color",
        title: "Gene region color key",
        offset: { signal: "4*mutation_mark_height" },
        encode: {
          symbols: {
            update: { shape: { value: "square" }, opacity: { value: 0.9 } }
          }
        }
      },
      {
        orient: "bottom",
        direction: "horizontal",
        fill: "aa_color",
        title: "Amino acid color key:",
        encode: {
          symbols: {
            update: { shape: { value: "square" }, opacity: { value: 0.7 } }
          }
        }
      }
    ]
  };
};

export { concatTreeWithAlignmentSpec, seqAlignSpec };
