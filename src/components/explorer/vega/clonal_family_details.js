// Defines the order in which we specify corresponding colors
const aminoAcidDomain = [ 
  '-',
  'X',
  'A', 
  'C',
  'D',
  'E',
  'F',
  'G',
  'H', 
  'I', 
  'K', 
  'L',
  'M',
  'N', 
  'P', 
  'Q', 
  'R', 
  'S', 
  'T',
  'V', 
  'W',
  'Y' 
 ]

// AMINO ACID COLORS
// tableau20 colorset of unique colors, with transparent added for gaps and X (any).
// We are using text rather than color to distinguish these characters 
// See https://github.com/matsengrp/olmsted/issues/48
// Also note that this order of characters is IMPORTANT because
// it maps directly to the order of the domain (see above aminoAcidDomain) of the mutations marks
const tableau20plusColors = [
  "transparent", // '-' Gap (insertion / deletion)
  "transparent", //  X - (Any amino acid)
  "#1f77b4",     //  A - Ala - Alanine
  "#aec7e8",     //	 C - Cys - Cysteine
  "#ff7f0e",     //  D - Asp - Aspartic Acid
  "#ffbb78",     //  E - Glu - Glutamic Acid
  "#2ca02c",     //	 F - Phe - Phenylalanine
  "#98df8a",     //	 G - Gly - Glycine
  "#d62728",     //  H - His - Histidine
  "#ff9896",     //	 I - Ile - Isoleucine
  "#9467bd",     //  K - Lys - Lysine
  "#c5b0d5",     //	 L - Leu - Leucine
  "#8c564b",     //	 M - Met - Methionine
  "#c49c94",     //  N - Asn - Asparagine
  "#e377c2",     //	 P - Pro - Proline
  "#f7b6d2",     //  Q - Gln - Glutamine
  "#7f7f7f",     //  R - Arg - Arginine
  "#c7c7c7",     //	 S - Ser - Serine
  "#bcbd22",     //	 T - Thr - Threonine
  "#dbdb8d",     //	 V - Val - Valine
  "#17becf",     //	 W - Trp - Tryptophan
  "#9edae5"      //	 Y - Tyr - Tyrosine
]

// Alternatively: 
// As seen in cft web, colors from http://www.imgt.org/IMGTScientificChart/RepresentationRules/colormenu.php#h1_0
// again, with transparent added for gaps and X (any) see https://github.com/matsengrp/olmsted/issues/48
// (EH) these are pretty vibrant and hard to look at
const IMGTScientificChartColors = [
  'transparent', // '-' Gap (insertion / deletion)
  'transparent', //  X - (Any amino acid)
  '#CCFFFF',     //	 A - Ala - Alanine
  '#00FFFF',     //	 C - Cys - Cysteine
  '#FFCC99',     //  D - Asp - Aspartic Acid
  '#FFCC00',     //  E - Glu - Glutamic Acid
  '#00CCFF',     //	 F - Phe - Phenylalanine
  '#00FF00',     //	 G - Gly - Glycine
  '#FFFF99',     //  H - His - Histidine
  '#000080',     //	 I - Ile - Isoleucine
  '#C64200',     //  K - Lys - Lysine
  '#3366FF',     //	 L - Leu - Leucine
  '#99CCFF',     //	 M - Met - Methionine
  '#FF9900',     //  N - Asn - Asparagine
  '#FFFF00',     //	 P - Pro - Proline
  '#FF6600',     //  Q - Gln - Glutamine
  '#E60606',     //  R - Arg - Arginine
  '#CCFF99',     //	 S - Ser - Serine
  '#00FF99',     //	 T - Thr - Threonine
  '#0000FF',     //	 V - Val - Valine
  '#CC99FF',     //	 W - Trp - Tryptophan
  '#CCFFCC',     //	 Y - Tyr - Tyrosine    
]

const concatTreeWithAlignmentSpec  = (selectedFamily, treeScale) => {
  return(
    {
      "$schema": "https://vega.github.io/schema/vega/v4.json",
      "description": "",
      // "autosize": {"type": "pad", "resize": false},
      "height": 800,
      "width": 1000,
      "data": [
        {"name": "pts_store"},
        // Tree Data
        {"name": "source_0",
         "values":selectedFamily["asr_tree"] 
        },
        {"name": "tree", 
         "transform": [
                        {"expr": "datum.distance", "type": "formula", "as": "x"}, 
                        {"expr": "datum.height * heightScale", "type": "formula", "as": "y"},   
                        {"type": "extent", "field": "distance", "signal": "distance_extent"},                
                        { "type": "extent", "field": "x", "signal": "xext" },
                        { "type": "extent", "field": "y", "signal": "yext" },
                        {"key": "id", "type": "stratify", "parentKey": "parent"},
                        {"expr": "scale(\"xscale\", datum.distance)", "type": "formula", "as": "x"}, 
                       ],
         "source": "source_0"},
        {"name": "links",
         "transform": [{"key": "id", "type": "treelinks"},
                       {"shape": "orthogonal", "type": "linkpath", "orient": "horizontal"}],
         "source": "tree"},
        {"name": "nodes", "transform": [{"expr": "datum.type == 'node' || datum.type =='root'", "type": "filter"}],
          "source": "tree"},
        {"name": "leaves", "transform": [{"expr": "datum.type == 'leaf'", "type": "filter"}], "source": "tree"}, 
        // Mutations Data
        {"name": "source_1",
         "values":selectedFamily["tips_alignment"] 
        },
        {"name": "data_1",
         "source": "source_1",
         "transform": [
           {
             "type": "formula",
             "expr": "toNumber(datum[\"position\"])",
             "as": "position"
           },
           {"expr": "datum.height * heightScale", "type": "formula", "as": "y"}
         ]
        },
        // Separate dataset for just gap characters and Xs to label them with text marks
        {"name": "x_and_gaps",
         "source": "data_1",
         "transform": [
            {
              "type": "filter",
              "expr": "datum.mut_to == \"-\" || datum.mut_to == \"X\""
            }
          ]
        }
      ],
      "signals": [
        //ZOOOOOOM
        {
          "name": "hover",
          "on": [
            {"events": "*:mouseover", "encode": "hover"},
            {"events": "*:mouseout",  "encode": "leave"},
            {"events": "*:mousedown", "encode": "select"},
            {"events": "*:mouseup",   "encode": "release"}
          ]
        },
        { "name": "xrange", "update": "[0, scaledWidth]" },
        { "name": "yrange", "update": "[height, 0]" },
    
        {
          "name": "down", "value": null,
          "on": [
            {"events": "touchend", "update": "null"},
            {"events": "mousedown, touchstart", "update": "xy()"}
          ]
        },
        {
          "name": "xcur", "value": null,
          "on": [
            {
              "events": "mousedown, touchstart, touchend",
              "update": "slice(xdom)"
            }
          ]
        },
        {
          "name": "delta", "value": [0, 0],
          "on": [
            {
              "events": [
                {
                  "source": "window", "type": "mousemove", "consume": true,
                  "between": [{"type": "mousedown"}, {"source": "window", "type": "mouseup"}]
                },
                {
                  "type": "touchmove", "consume": true,
                  "filter": "event.touches.length === 1"
                }
              ],
              "update": "down ? [down[0]-x(), y()-down[1]] : [0,0]"
            }
          ]
        },
        // This is the anchor from which zoom happens.
        // It's set to the place you scroll at now but my best 
        // shot at scrolling only in the positive x direction so 
        // far is to set it to always be [0,0]. This generally works,
        // but might not be perfect for zooming on clades far from root
        // We need a way to just limit zoom out to not go past zero?
        {
          "name": "anchor", "value": [0, 0],
          "on": [
            {
              "events": "wheel",
              "update": "[invert('xscale', x()), 0]"
            },
            {
              "events": {"type": "touchstart", "filter": "event.touches.length===2"},
              "update": "[(xdom[0] + xdom[1]) / 2, y()]"
            }
          ]
        },
        {
          "name": "zoom", "value": 1,
          "on": [
            {
              "events": "wheel!",
              "force": true,
              "update": "pow(1.001, event.deltaY * pow(16, event.deltaMode))"
            },
            {
              "events": {"signal": "dist2"},
              "force": true,
              "update": "dist1 / dist2"
            }
          ]
        },
        {
          "name": "dist1", "value": 0,
          "on": [
            {
              "events": {"type": "touchstart", "filter": "event.touches.length===2"},
              "update": "pinchDistance(event)"
            },
            {
              "events": {"signal": "dist2"},
              "update": "dist2"
            }
          ]
        },
        {
          "name": "dist2", "value": 0,
          "on": [{
            "events": {"type": "touchmove", "consume": true, "filter": "event.touches.length===2"},
            "update": "pinchDistance(event)"
          }]
        },
    
        {
          "name": "xdom", "update": "slice(xext)", "react": false,
          "on": [
            {
              "events": {"signal": "delta"},
              "update": "[xcur[0] + span(xcur) * delta[0] / scaledWidth, xcur[1] + span(xcur) * delta[0] / scaledWidth]"
            },
            {
              "events": {"signal": "zoom"},
              "update": "[anchor[0] + (xdom[0] - anchor[0]) * zoom, anchor[0] + (xdom[1] - anchor[0]) * zoom]"
            }
          ]
        },
        {
          "name": "size",
          "update": "clamp(20 / span(xdom), 1, 1000)"
        },
        // TREE SIGNALS
        // BRANCHSCALE - scales up width of tree
        {"value": treeScale.branch_scale,
         "name": "branchScale",
         "bind": {"max": 7000, "step": 50, "input": "range", "min": 0}},
        // HEIGHTSCALE - scales up height the ENTIRE VIZ
        {"value": treeScale.height_scale,
         "name": "heightScale",
         "bind": {"max": 20, "step": 1, "input": "range", "min": 0}
        },
         // Size of leaves
         {
          "name": "max_leaf_size",
          "value": 1000,
          "bind": {"max": 7000, "step": 50, "input": "range", "min": 1}
        },
        {
          "name": "leaf_size",
          "value": "multiplicity",
          "bind": {"input": "select", "options": ["multiplicity", "cluster_multiplicity"]} 
        },
        // Number of leaves
        {
          "name": "leaves_len",
          "update": "length(data(\"leaves\"))"
        },
        // Height of viz scaled by number of leaves 
        {
          "name": "scaledHeight",
          "update": "heightScale*(leaves_len+1)"
        },
        {"value": "datum",
         "name": "cladify",
         "on": [{"update": "datum", "events": "@ancestor:mousedown, @ancestor:touchstart"}]},
        {"name": "concat_0_x_step", "value": 0},
        {
          "name": "scaledWidth",
          // "value": 500,
         "update": "branchScale"
        },
        {"name": "unit",
         "value": {},
         "on": [
           {"events": "mousemove", "update": "isTuple(group()) ? group() : unit"}
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
             "update": "datum && (item().mark.marktype == 'text' || item().mark.marktype == 'symbol') ? datum : null",
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
        // ALIGNMENT SIGNALS
        {
          "name": "mutation_mark_height",
          "update": "ceil(height/100)"
        },
        {
          "name": "mutation_mark_width",
          "update": "ceil(width/150)"
        },
        {"name": "concat_1_width", "value": 200}
      ],
      //LAYOUT: how to space the two concattenated viz groups with respect to one another
      "layout": {
        "padding": {"column": 0},
        // Ideally we'd set bounds: flush to get the leaf labels flush with the tick marks
        // for the alignment viz, but the leaf labels are not always the same length so 
        // we can't correct for them with padding. See hack in evolutionary axis title
        "bounds": "full",
        "align": "each"
      },
      "marks": [
        // TREE
        {
          "type": "group",
          "name": "concat_0_group",
          "encode": {
              "update": {
                "clip": {"value": true},
                "width": {"signal": "scaledWidth"},
                "height": {"signal": "scaledHeight"}
            }
          },
          "marks": [
            // LINKS
            {
              "encode": {
                "update": {
                  "path": {"field": "path"},
                  "strokeWidth": {"value": 2},
                  "stroke": {"value": "#ccc"}
                }
              },
              "type": "path",
              "from": {"data": "links"}
            },
            // INTERNAL NODES
            {
              "name": "ancestor",
              "encode": {
                "update": {
                  "y": {"field": "y"},
                  "fill": {"value": "transparent"},
                  "x": {"field": "x"},
                  "tooltip": {
                    "signal": "{\"height\": format(datum[\"height\"], \"\"), \"id\": datum[\"id\"], \"parent\": datum[\"parent\"]}"
                  }
                },
                "enter": {
                  "size": {"value": 10},
                  "stroke": {"value": "transparent"},
                }
              },
              "type": "symbol",
              "from": {"data": "nodes"}
            },
            // LEAVES
            // labels
            {
              "type": "text",
              "encode": {
                "enter": {
                  "text": {"field": "label"},
                  "fill": {"value": "#000"},
                  "fontSize": {"value": 10},
                },
                "update": {
                  "y": {"scale": "y", "field": "y"},
                  "dx": {"scale": "leaf_label_offset", "field": {"signal": "leaf_size"}},
                  "dy": {"value": 3},
                  "x": {"field": "x"},
                  "tooltip": {
                    "signal": "{\"id\": datum[\"id\"], \"parent\": datum[\"parent\"], \"distance\": datum[\"distance\"], \"multiplicity\": datum[\"multiplicity\"], \"cluster_multiplicity\": datum[\"cluster_multiplicity\"], \"*tree height\": datum[\"height\"]}"
                  }
                }  
              },
              "from": {"data": "leaves"}
            },
            // circles: size depends on multiplicity 
            {
              "name": "leaf",
              "encode": {
                "update": {
                  "y": {"field": "y"},
                  "fill": {"value": "#000"},
                  "fillOpacity": {"value": "0.05"},
                  "x": {"field": "x"},
                  "tooltip": {
                    "signal": "{\"id\": datum[\"id\"], \"parent\": datum[\"parent\"], \"distance\": datum[\"distance\"], \"multiplicity\": datum[\"multiplicity\"], \"cluster_multiplicity\": datum[\"cluster_multiplicity\"], \"*tree height\": datum[\"height\"]}"
                  },
                  "size": {"scale": "leaf_size_scale", "field": {"signal": "leaf_size"}},
                  "stroke": {"value": "#000"},
                  "strokeWidth": {"value": 0.5}
                },
              },
              "type": "symbol",
              "from": {"data": "leaves"}
            },
            {
              "name": "leaf_center",
              "encode": {
                "update": {
                  "y": {"field": "y"},
                  "fill": {"value": "#000"},
                  "x": {"field": "x"},
                  "size": {"value": 1},
                },
              },
              "type": "symbol",
              "from": {"data": "leaves"}
            }
          ],
          // Tree axes
          "axes": [{
            "scale": "xscale",
            "orient": "bottom",
            "grid": false,
            // See layout section: the axes get included in the group width when you have 
            // bound: full. We need bounf: full to account for the leaf labels going beyond
            // the exact width; this setting allows them to be included in our width. However,
            // since this setting also includes the axis title in the overall width, we collapse
            // it when the branch scale is 0 because we want to be able to have the leaf labels 
            // flush with the tick marks for the alignment viz.
            "title": {"signal": "branchScale > 0 ? 'Evolutionary distance from naive' : ''"},
            "labelFlush": true,
            "labelOverlap": true,
            "tickCount": {"signal": "ceil(scaledWidth/40)"},
            "zindex": 1
          }]
        },
        // SEQUENCE ALIGNMENT
        {
          "type": "group",
          "name": "concat_1_group",
          "style": "cell",
          "encode": {
            "update": {
              "width": {"signal": "concat_1_width"},
              "height": {"signal": "scaledHeight"}
            }
          },
          "marks": [
            // MUTATIONS MARKS
            {
              "name": "marks",
              "type": "rect",
              "style": ["tick"],
              "from": {"data": "data_1"},
              "encode": {
                "update": {
                  "opacity": {"value": 0.9},
                  "fill": [
                    {
                      "test": "datum[\"position\"] === null || isNaN(datum[\"position\"])",
                      "value": null
                    },
                    {"scale": "color", "field": "mut_to"}
                  ],
                  "tooltip": {
                    "signal": "{\"position\": format(datum[\"position\"], \"\"), \"seq_id\": ''+datum[\"seq_id\"], \"mut_to\": ''+datum[\"mut_to\"], \"mut_from\": ''+datum[\"mut_from\"]}"
                  },
                  "xc": {"scale": "x", "field": "position"},
                  "yc": {"scale": "y", "field": "y"},
                  "height": {"signal": "mutation_mark_height"},
                  "width": {"signal": "mutation_mark_width"}
                }
              }
            },
            // Gap character labels
            {
              "name": "x_and_gaps_labels",
              "type": "text",
              "from": {"data": "x_and_gaps"},
              "encode": {
                "enter": {
                  "text": {"field": "mut_to"},
                  "fill": {"value": "#000"},
                  // fontSize must be increased for gap character '-' to make it visible
                  "fontSize": {"signal": "datum.mut_to == \"-\" ? 20 : 10"},
                },
                "update": {
                  "opacity": {"value": 0.7},
                  "y": {"scale": "y", "field": "y"},
                  "dx": {"value": -2},
                  // See above "fontSize must be increased for gap character '-' to make it visible"
                  // This means y offset needs to be larger for these marks
                  "dy": {"signal": "datum.mut_to == \"-\" ? mutation_mark_height/2+2 : mutation_mark_height/2"},
                  "x": {"scale": "x", "field": "position"},
                  "tooltip": {
                    "signal": "{\"position\": format(datum[\"position\"], \"\"), \"seq_id\": ''+datum[\"seq_id\"], \"mut_to\": ''+datum[\"mut_to\"], \"mut_from\": ''+datum[\"mut_from\"]}"
                  }
                }  
              },
            }
          ],
          // MUTATIONS AXES
          "axes": [
            // x
            {
              "scale": "x",
              "orient": "bottom",
              "grid": false,
              "title": "Amino acid position",
              "labelFlush": true,
              "labelOverlap": true,
              "tickCount": 128,
              "zindex": 1
            },
            // x grid
            {
              "scale": "x",
              "orient": "bottom",
              "gridScale": "y",
              "grid": true,
              "tickCount": 128,
              "domain": false,
              "labels": false,
              "maxExtent": 0,
              "minExtent": 0,
              "ticks": false,
              "zindex": 0
            },
            // y
            {
              "scale": "y",
              "orient": "left",
              "grid": false,
              "tickCount": {"signal": "leaves_len+1"},
              // TURN THIS ON TO DEBUG THE TICKS / GRID ISSUE
              "labels": false,
              "zindex": 1,
            },
            // y grid
            {
              "scale": "y",
              "orient": "left",
              "gridScale": "x",
              "grid": true,
              "tickCount": {"signal": "leaves_len+1"},
              // "domain": false,
              "labels": false,
              "maxExtent": 0,
              "minExtent": 0,
              "zindex": 0
            }
          ]
        }
      ],
      
      "scales": [
        {
          "name": "leaf_label_offset",
          "type": "linear",
          "domain": {"data": "leaves", "field": {"signal": "leaf_size"}},
          "range": [4,{"signal": "max_leaf_size/55"}]
        },
        {
          "name": "leaf_size_scale",
          "type": "linear",
          "domain": {"data": "leaves", "field": {"signal": "leaf_size"}},
          "range": [0,{"signal": "max_leaf_size"}]
        },
        {
          "name": "x",
          "type": "linear",
          "domain": {"data": "data_1", "field": "position"},
          "range": [5, {"signal": "width"}],
          "zero": true
        },
        {
          "name": "xscale",
          "type": "linear",
          "domain": {"signal": "xdom"},
          "range": {"signal": "xrange"},
          // "domain": {"data": "tree", "field": "x"},
          // "range": [0, {"signal": "scaledWidth"}],
          "nice": true,
          "zero": true
        },
        {
          // https://vega.github.io/vega/docs/scales/#quantize-scales
          "name": "y",
          "type": "quantize",
          // according to the above link,  "Using a number value for this parameter 
          //                               (representing a desired tick count) allows
          //                               greater control over the step size used to
          //                               extend the bounds, guaranteeing that the returned
          //                               ticks will exactly cover the domain."
          // This is not true in practice: why not?
          // "nice": {"signal": "leaves_len"},
          "zero": true,
          "domain": {"data": "leaves", "field": "y"},
          // this creates an array of range values - one for each leaf; scaledHeight is heightScale * (len_leaves+1)
          "range": {"signal": "sequence(0, scaledHeight, heightScale)"}, 
        },
        {
          "name": "color",
          "type": "ordinal",
          "domain": aminoAcidDomain,
          "range": tableau20plusColors
        }
      ],
      "legends": [
        {
          "fill": "color",
          "title": "mut_to",
          "encode": {
            "symbols": {
              "update": {"shape": {"value": "square"}, "opacity": {"value": 0.7}}
            }
          }
        }
      ],
    }
  )
}

const seqAlignSpec = (family) => {
  let padding = 20;
  let mark_height = 8
  let height = family["lineage_seq_counter"]*mark_height+padding;
  return(
    {
      "$schema": "https://vega.github.io/schema/vega/v4.json",
      "padding": 5,
      "height": height,
      "width": 1000,
      "style": "cell",
      "data": [
        {
          "name": "source_0",
          "values": family["lineage_alignment"]
        },
        {
          "name": "data_0",
          "source": "source_0",
          "transform": [
            {
              "type": "formula",
              "expr": "toNumber(datum[\"position\"])",
              "as": "position"
            }
          ]
        },
        {
          "name": "x_and_gaps",
          "source": "data_0",
          "transform": [
              {
                "type": "filter",
                "expr": "datum.mut_to == \"-\" || datum.mut_to == \"X\""
              }
            ]
        }
      ],
      "signals": [
        {
          "name": "mark_height",
          "value": mark_height
        },
        {
          "name": "lineage_seqs",
          "value": family["lineage_seq_counter"]
        },
        {
          "name": "mark_width",
          "update": "ceil(width/150)"
        }
      ],
      "marks": [
        // Mutation squares
        {
          "name": "marks",
          "type": "rect",
          "style": ["tick"],
          "from": {"data": "data_0"},
          "encode": {
            "update": {
              "opacity": {"value": 0.9},
              "fill": [
                {
                  "test": "datum[\"position\"] === null || isNaN(datum[\"position\"])",
                  "value": null
                },
                {"scale": "color", "field": "mut_to"}
              ],
              "tooltip": {
                "signal": "{\"position\": format(datum[\"position\"], \"\"), \"seq_id\": ''+datum[\"seq_id\"], \"mut_to\": ''+datum[\"mut_to\"], \"mut_from\": ''+datum[\"mut_from\"]}"
              },
              "xc": {"scale": "x", "field": "position"},
              "yc": {"scale": "y", "field": "seq_id"},
              "height": {"signal": "mark_height"},
              "width": {"signal": "mark_width"}
            }
          }
        },
        // Gap character labels
        {
          "name": "x_and_gap_labels",
          "type": "text",
          "from": {"data": "x_and_gaps"},
          "encode": {
            "enter": {
              "text": {"field": "mut_to"},
              "fill": {"value": "#000"},
              // fontSize must be increased for gap character '-' to make it visible
              "fontSize": {"signal": "datum.mut_to == \"-\" ? 20 : 10"},
            },
            "update": {
              "opacity": {"value": 0.7},
              "y": {"scale": "y", "field": "seq_id"},
              "dx": {"value": -3},
              // See above "fontSize must be increased for gap character '-' to make it visible"
              // This means y offset needs to be larger for these marks
              "dy": {"signal": "datum.mut_to == \"-\" ? mark_height/2+2 : mark_height/2"},
              "x": {"scale": "x", "field": "position"},
              "tooltip": {
                "signal": "{\"position\": format(datum[\"position\"], \"\"),  \"seq_id\": ''+datum[\"seq_id\"], \"mut_to\": ''+datum[\"mut_to\"], \"mut_from\": ''+datum[\"mut_from\"]}"
              }
            }  
          },
        }
      ],
      "scales": [
        {
          "name": "x",
          "type": "linear",
          "domain": {"data": "data_0", "field": "position"},
          "range": [5, {"signal": "width"}],
          "nice": true,
          "zero": true
        },
        {
          "name": "y",
          "type": "point",
          "domain": {"data": "data_0", "field": "seq_id"},
          "range": [0, {"signal": "mark_height*lineage_seqs + 20"}],
          "padding": 0.5
        },
        {
          "name": "color",
          "type": "ordinal",
          "domain": aminoAcidDomain,
          "range": tableau20plusColors
        }
      ],
      "axes": [
        {
          "scale": "x",
          "orient": "bottom",
          "grid": false,
          "title": "position",
          "labelFlush": true,
          "labelOverlap": true,
          "tickCount": {"signal": "ceil(width/40)"},
          "zindex": 1
        },
        {
          "scale": "x",
          "orient": "bottom",
          "gridScale": "y",
          "grid": true,
          "tickCount": 128,
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
          "grid": false,
          "title": "seq_id",
          "zindex": 1
        },
        {
          "scale": "y",
          "orient": "left",
          "gridScale": "x",
          "grid": true,
          "tickCount": 128,
          "domain": false,
          "labels": false,
          "maxExtent": 0,
          "minExtent": 0,
          "ticks": false,
          "zindex": 0
        },
      ],
      "legends": [
        {
          "fill": "color",
          "title": "mut_to",
          "encode": {
            "symbols": {
              "update": {"shape": {"value": "square"}, "opacity": {"value": 0.7}}
            }
          }
        }
      ],
    }
  )
}

export {concatTreeWithAlignmentSpec, seqAlignSpec};
