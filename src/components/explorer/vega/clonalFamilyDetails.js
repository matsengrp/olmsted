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

const concatTreeWithAlignmentSpec = () => {
  return {
    $schema: "https://vega.github.io/schema/vega/v5.json",
    description: "",
    autosize: { type: "pad", resize: true },
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
        // For showing the cdr3 with dotted lines in the alignment
        name: "cdr3_bounds"
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
          { expr: "datum.distance", type: "formula", as: "x" },

          // xscale and y scale depend on these extents
          { type: "extent", field: "x", signal: "xext" },

          // Then we can scale by x and y scales to fit into zoomed domains

          { key: "sequence_id", type: "stratify", parentKey: "parent" },
          {
            // The size of the tree here should be constant with the number of leaves;
            // the zoom signals rely on xext, yext to be the same no matter the zoom
            // status of the tree. Important that x, y values are scaled after we take xext and yext.
            type: "tree",
            method: "cluster",
            separation: false,
            // We are only using the y values from this transform, x comes from "distance"
            size: [{ signal: "leaves_count_incl_naive" }, { signal: "span(xext)" }],
            as: ["y_tree", "x_tree", "depth", "children"]
          },
          { type: "extent", field: "y_tree", signal: "yext" },

          { expr: 'scale("time", datum.distance)', type: "formula", as: "x" },
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
          { expr: "datum.type == 'node' || datum.type =='root' || datum.type == 'internal'", type: "filter" },
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
        // Update height from window size see https://github.com/matsengrp/olmsted/issues/83)
        name: "height",

        update: "floor(windowSize()[1]*0.8)",

        on: [
          {
            events: { source: "window", type: "resize" },
            update: "floor(windowSize()[1]*0.8)"
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
      { name: "yrange", update: "[pie_chart_padding , height - pie_chart_padding]" },
      // These xdom and ydom signals come from the inner tree zoom signals but need to be updated
      // in the outer scope to allow scales/axes to update accordingly
      {
        name: "xdom",
        update: "slice(xext)"
      },
      {
        name: "ydom",
        update: "slice(yext)"
      },

      // /TREE SIGNALS:
      // ---------------------------------------------------------------------------

      {
        name: "tree_group_width_ratio",
        value: 0.3,
        bind: {
          name: "Tree width ratio",
          input: "range",
          max: 1,
          min: 0.2,
          step: 0.01
        }
      },
      {
        name: "tree_group_width",
        update: "tree_group_width_ratio*width"
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
        bind: {
          max: 100,
          step: 1,
          input: "range",
          min: 1
        }
      },
      // HEIGHTSCALE SIGNALS END
      {
        // Metadata field to use for sizing the leaves
        name: "leaf_size_by",
        value: "<none>",
        bind: {
          input: "select",
          options: ["<none>", "multiplicity", "cluster_multiplicity", "affinity", "scaled_affinity"]
        }
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
        bind: { input: "select", options: ["<none>", "lbr", "lbi"] }
      },
      {
        // Seq metric to use for coloring branches;
        // uses value from the child of the branch
        name: "branch_color_by",
        value: "parent",
        bind: { input: "select", options: ["<none>", "lbr", "lbi", "parent"] }
      },
      {
        name: "branch_color_scheme",
        value: "redblue",
        bind: { input: "select", options: ["redblue", "purples"] }
      },
      {
        name: "branch_color_scheme_map",
        update: '{purples: slice(full_purple_range, min_color_value), redblue: ["darkblue", "red"]}'
      },
      {
        name: "min_color_value",
        value: 0,
        bind: {
          input: "range",
          max: 4,
          step: 1,
          min: 0
        }
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
        bind: { input: "checkbox", options: [true, false] }
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

      // /ALIGNMENT SIGNALS:
      // ---------------------------------------------------------------------------

      // max length for the amino acid scale
      {
        name: "max_aa_seq_length",
        update: "ceil(dna_j_gene_end[1]/3)"
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
        update: "width-tree_group_width"
      }
    ],

    // /LAYOUT: how top level group marks are formatted in a grid
    // ---------------------------------------------------------------------------

    layout: {
      padding: { column: 0 },
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
            title: "Evolutionary distance from naive",
            labelFlush: true,
            labelOverlap: true,
            labelBound: true,
            zindex: 1
          }
        ],
        // pie chart legend
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
      },
      // Amino acid position axis
      {
        name: "alignment_x_axis",
        type: "group",
        role: "column-footer",
        encode: { update: { width: { signal: "alignment_group_width" } } },
        axes: [
          {
            // Offset to align with the change of the alignment height due to padding
            offset: { signal: "mutation_mark_padding-pie_chart_padding" },
            scale: "aa_position",
            orient: "bottom",
            grid: false,
            title: "Amino acid position",
            labelFlush: true,
            labelOverlap: true,
            values: { signal: "sequence(max_aa_seq_length)" },
            zindex: 1
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
              { events: "mousedown, touchstart", update: "xy()" }
            ]
          },
          {
            name: "xcur",
            value: null,
            on: [
              {
                events: "mousedown, touchstart, touchend",
                update: "slice(xdom)"
              }
            ]
          },
          {
            name: "ycur",
            value: null,
            on: [
              {
                events: "mousedown, touchstart, touchend",
                update: "slice(ydom)"
              }
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
                    between: [{ type: "mousedown" }, { source: "window", type: "mouseup" }]
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
            update: "slice(yext)",

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
                // Limiting dragging to the boundaries of the tree
                update: "ydom_delta[0] < yext[0] || ydom_delta[1] > yext[1] ? slice(ydom) : slice(ydom_delta)"
              },
              // Update shown y values when zooming
              {
                events: { signal: "zoom" },
                // Original values
                // "update": "[(anchor[1] + (ydom[0] - anchor[1]) * zoom), (anchor[1] + (ydom[1] - anchor[1]) * zoom) ]"
                // Limiting zoom to the boundaries of the tree
                update:
                  "[ max( (anchor[1] + (ydom[0] - anchor[1]) * zoom), yext[0]), min( (anchor[1] + (ydom[1] - anchor[1]) * zoom), yext[1] ) ] "
              }
            ]
          }
        ],
        marks: [
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
                  signal: '{"id": datum["sequence_id"], "parent": datum["parent"], "distance": datum["distance"]}'
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
          }
        ]
      },

      // /SEQUENCE ALIGNMENT
      // ---------------------------------------------------------------------------

      {
        type: "group",
        name: "alignment_group",
        style: "cell",
        encode: {
          update: {
            // Hide cell border
            stroke: { value: "transparent" },
            // #59 this will need to be controlled by slider
            width: { signal: "alignment_group_width" },
            height: { signal: "height" }
          }
        },
        signals: [
          {
            name: "naive_group_height",
            value: 30
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
            encode: {
              update: {
                stroke: { value: "transparent" },
                // #59 this will need to be controlled by slider
                y: { signal: "pie_chart_padding-naive_group_height-mutation_mark_padding" },
                width: { signal: "alignment_group_width" },
                height: { signal: "naive_group_height" }
              }
            },
            marks: [
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
                    tooltip: {
                      signal:
                        '{"region": \'\'+datum["region"], "start": format(datum["start"], ""), "end": format(datum["end"], ""),  "gene": \'\'+datum["gene"]}'
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
                        test: "datum[\"region\"] == 'CDR3'",
                        signal: "naive_group_height/2"
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
                offset: { signal: "0" },
                encode: {
                  symbols: {
                    update: { shape: { value: "square" }, opacity: { value: 0.9 } }
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
              {
                name: "y_grid",
                type: "rule",
                from: { data: "leaves" },
                encode: {
                  enter: {
                    stroke: { signal: "rgb(221, 221, 221)" },
                    opacity: { value: 1 },
                    x: { scale: "aa_position", value: "-5" },
                    x2: { scale: "aa_position", signal: "max_aa_seq_length" },
                    strokeWidth: { value: 1 }
                  },
                  update: {
                    y: { field: "y" }
                  }
                }
              },
              {
                name: "rule_cdr3",
                type: "rule",
                from: { data: "cdr3_bounds" },
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
                    // Set opacity similar to this (but with 'indata' function and with hovered id stored in a separate dataset) for hovered data #24:
                    // [
                    //   {"test": "pts_tuple.id == null || datum.seq_id == pts_tuple.id || datum.type == 'naive'", "value": 0.9},
                    //   {"value": 0.1}
                    // ],
                    fill: [
                      {
                        test: 'datum["position"] === null || isNaN(datum["position"])',
                        value: null
                      },
                      { scale: "aa_color", field: "mut_to" }
                    ],
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
                    // Set opacity similar to this (but with 'indata' function and with hovered id stored in a separate dataset) for hovered data #24:
                    // [
                    //   {"test": "pts_tuple.id == null || datum.id == pts_tuple.id || datum.type == 'naive'"", "value": 0.9},
                    //   {"value": 0.1}
                    // ],
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
              // x grid
              {
                scale: "aa_position",
                orient: "bottom",
                grid: true,
                tickCount: { signal: "max_aa_seq_length" },
                domain: false,
                labels: false,
                maxExtent: 0,
                minExtent: 0,
                ticks: false,
                zindex: 0
              }
            ]
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
        domain: ["V gene", "5' Insertion", "D gene", "3' Insertion", "J gene", "CDR3"],
        // /COLORS
        range: ["#762a83", "#af8dc3", "black", "#d9f0d3", "#7fbf7b", "#1b7837"]
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
      // Alignment x scale
      {
        name: "aa_position",
        type: "linear",
        domain: [-1, { signal: "max_aa_seq_length" }],
        range: [0, { signal: "alignment_group_width" }],
        zero: true
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
          symbols: {
            update: { shape: { value: "square" }, opacity: { value: 0.9 } }
          }
        }
      }
    ]
  };
};

const seqAlignSpec = (family) => {
  const padding = 20;
  const mutation_mark_height = 8;
  // Add some height here for padding and to accomodate naive gene regions section
  const height = (family["lineage_seq_counter"] + 2) * mutation_mark_height + padding;
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
        // For showing the cdr3 with dotted lines in the alignment
        name: "cdr3_bounds"
      },
      {
        name: "source_0",
        values: family["lineage_alignment"]
      },
      {
        name: "data_0",
        source: "source_0",
        transform: [
          {
            type: "formula",
            expr: 'toNumber(datum["position"])',
            as: "position"
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
        update: "ceil(dna_j_gene_end[1]/3)"
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
            tooltip: {
              signal:
                '{"region": \'\'+datum["region"], "start": format(datum["start"], ""), "end": format(datum["end"], ""),  "gene": \'\'+datum["gene"]}'
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
                test: "datum[\"region\"] == 'CDR3'",
                signal: "mutation_mark_height*2"
              },
              { signal: "mutation_mark_height" }
            ]
          }
        }
      },
      // CDR3 bounds
      {
        name: "rule_cdr3",
        type: "rule",
        from: { data: "cdr3_bounds" },

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
        domain: ["V gene", "5' Insertion", "D gene", "3' Insertion", "J gene", "CDR3"],
        // COLORS
        range: ["#762a83", "#af8dc3", "black", "#d9f0d3", "#7fbf7b", "#1b7837"]
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
        offset: { signal: "2.5*mutation_mark_height" },
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
