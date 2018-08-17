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