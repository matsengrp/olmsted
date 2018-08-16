// This file exists for vega specs we want to keep
// , which may be useful for reference, but are not in use
// Perhaps should not go in git repo

const treeSpec = (data) => {
    return( 
    {
    "height": 1000,
    "autosize": {"type": "pad", "resize": true},
    "padding": 5,
    "$schema": "https://vega.github.io/schema/vega/v3.0.json",
    "scales": [{"name": "color", 
                "range": {"scheme": "magma"},
                "type": "sequential", 
                "domain": {"field": "depth", "data": "tree"},
                "zero": true}],
    "data": [{"name": "tree", 
              "transform": [{"key": "id", "type": "stratify", "parentKey": "parent"},
                            {"size": [{"signal": "height"}, {"signal": "width - 100"}],
                            "type": "tree",
                            "as": ["y0", "x0", "depth0", "children0"],
                            "method": "cluster"}, 
                            {"size": [{"signal": "height"}, {"signal": "width - 100"}],
                            "type": "tree", 
                            "as": ["y", "x", "depth", "children"], 
                            "method": "cluster"},
                            {"expr": "datum.distance * branchScale", "type": "formula", "as": "x"}, 
                            {"expr": "datum.y0 * (heightScale / 100)", "type": "formula", "as": "y"}],
              "values": data},
             {"name": "links",
              "transform": [{"key": "id", "type": "treelinks"},
                            {"shape": "orthogonal", "type": "linkpath", "orient": "horizontal"}],
              "source": "tree"},
             {"name": "nodes", "transform": [{"expr": "datum.type == 'node'", "type": "filter"}],
               "source": "tree"},
             {"name": "leaves", "transform": [{"expr": "datum.type == 'leaf'", "type": "filter"}], "source": "tree"}],
      "marks": [{"encode": {"update": {"path": {"field": "path"},
                                                "strokeWidth": {"value": 3},
                                                "stroke": {"value": "#ccc"}}},
                            "type": "path",
                            "from": {"data": "links"}},
                {"name": "ancestor",
                 "encode": {"update": {"y": {"field": "y"},"fill": {"value": "#000"}, "x": {"field": "x"}},
                            "enter": {"size": {"value": 100}, "stroke": {"value": "#000"}}},
                 "type": "symbol",
                 "from": {"data": "nodes"}},
                {"encode": {"update": {"y": {"field": "y"},
                                       "dx": {"value": 2},
                                       "dy": {"value": 3}, 
                                       "x": {"field": "x"}}, 
                            "enter": {"text": {"field": "label"},
                                      "fill": {"value": "#000"}}},
                 "type": "text",
                 "from": {"data": "leaves"}}],
      "signals": [{"value": 5000,
                   "name": "branchScale",
                   "bind": {"max": 5000, "step": 50, "input": "range", "min": 0}},
                  {"value": 70,
                   "name": "heightScale",
                   "bind": {"max": 300, "step": 5, "input": "range", "min": 70}},
                  {"value": "datum",
                   "name": "cladify",
                   "on": [{"update": "datum", "events": "@ancestor:mousedown, @ancestor:touchstart"}]}], 
      "width": 2000}
    )
  }
  
  const seqAlignSpec = (data) => {
    return(
      {
        "$schema": "https://vega.github.io/schema/vega/v4.json",
        "autosize": {"type": "fit", "resize": true},
        "padding": 5,
        "width": 1000,
        "height": 300,
        "style": "cell",
        "data": [
          {
            "name": "source_0",
            "values": data
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
          }
        ],
        "marks": [
          {
            "name": "marks",
            "type": "rect",
            "style": ["tick"],
            "from": {"data": "data_0"},
            "encode": {
              "update": {
                "opacity": {"value": 0.7},
                "fill": [
                  {
                    "test": "datum[\"position\"] === null || isNaN(datum[\"position\"])",
                    "value": null
                  },
                  {"scale": "color", "field": "mut_to"}
                ],
                "tooltip": {
                  "signal": "{\"position\": format(datum[\"position\"], \"\"), \"seq_id\": ''+datum[\"seq_id\"], \"mut_to\": ''+datum[\"mut_to\"]}"
                },
                "xc": {"scale": "x", "field": "position"},
                "yc": {"scale": "y", "field": "seq_id"},
                "height": {"signal": "ceil(height/20)"},
                "width": {"signal": "ceil(width/130)"}
              }
            }
          }
        ],
        "scales": [
          {
            "name": "x",
            "type": "linear",
            "domain": {"data": "data_0", "field": "position"},
            "range": [0, {"signal": "width"}],
            "nice": true,
            "zero": true
          },
          {
            "name": "y",
            "type": "point",
            "domain": {"data": "data_0", "field": "seq_id", "sort": true},
            "range": [0, {"signal": "height"}],
            "padding": 0.5
          },
          {
            "name": "color",
            "type": "ordinal",
            "domain": {"data": "data_0", "field": "mut_to", "sort": true},
            "range": "category"
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
            "tickCount": {"signal": "130"},
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
        "config": {"axisY": {"minExtent": 30}}
      }
    )
  }

  const naiveVegaLiteSpec = {
    width: 250,
    height: 25,
    layer: [{
      transform: [{
        filter: {field: "region", oneOf: ["CDR3"]}
      }],
      mark: {type: "bar",color:"yellow", size: 25},
      encoding: {
        x: {
          field: "start",
          type: "quantitative",
          axis: {title: "", ticks: false, labels: false},
          scale: {domain: [0,400]}
        },
        x2: {
          field: "end",
          type: "quantitative",
          axis: {title: "", ticks: false, labels: false},
          scale: {domain: [0,400]}
        },
        y: {
          field: "family",
          type: "nominal",
          axis: {title: "", ticks: false, labels: false},
        },
        tooltip: [
          {field: "region", type: "nominal"},
          {field: "start", type: "quantitative"},
          {field: "end", type: "quantitative"}
        ]
    }}, 
    {  
      transform: [{
        filter: {field: "region", oneOf: [
          "V gene",
          "Insertion 1",
          "D gene",
          "Insertion 2",
          "J gene"]
        }
      }],   
      mark: {type: "bar", size: 12},
      encoding: {
        x: {
          field: "start",
          type: "quantitative",
          axis: {title: "", ticks: false, labels: false},
          scale: {domain: [0,400]}
  
        },
        x2: {
          field: "end",
          type: "quantitative",
          axis: {title: "", ticks: false, labels: false},
          scale: {domain: [0,400]}
  
        },
        y: {
          field: "family",
          type: "nominal",
          axis: {title: "", ticks: false, labels: false},
        },
        tooltip: [
          {field: "region", type: "nominal"},
          {field: "start", type: "quantitative"},
          {field: "end", type: "quantitative"},
          {field: "gene", type: "nominal"}
        ],
        color: {
          field: "region",
          type: "nominal",
          legend: null,
          scale: {
            domain:
              [ "V gene",
                "Insertion 1",
                "D gene",
                "Insertion 2",
                "J gene",
              ],
            range: ["#db2c0d", "#36db0d", "#000000", "#36db0d", "#2c12ea"],
            type: "ordinal"
          }
          
      }
    }
    }]
  }