const naiveVegaSpec = {
  "$schema": "https://vega.github.io/schema/vega/v4.json",
  "autosize": "pad",
  "padding": 5,
  "width": 250,
  "height": 25,
  "style": "cell",
  "data": [
    {
      "name": "source"
    },
    {
      "name": "data_1",
      "source": "source",
      "transform": [
        {
          "type": "formula",
          "expr": "toString(datum[\"region\"])",
          "as": "region"
        },
        {
          "type": "formula",
          "expr": "toNumber(datum[\"start\"])",
          "as": "start"
        },
        {
          "type": "formula",
          "expr": "toNumber(datum[\"end\"])",
          "as": "end"
        },
        {
          "type": "filter",
          "expr": "indexof([\"CDR3\"], datum[\"region\"]) !== -1"
        },
        {
          "type": "filter",
          "expr": "datum[\"start\"] !== null && !isNaN(datum[\"start\"])"
        }
      ]
    },
    {
      "name": "data_2",
      "source": "source",
      "transform": [
        {
          "type": "formula",
          "expr": "toString(datum[\"region\"])",
          "as": "region"
        },
        {
          "type": "formula",
          "expr": "toNumber(datum[\"start\"])",
          "as": "start"
        },
        {
          "type": "formula",
          "expr": "toNumber(datum[\"end\"])",
          "as": "end"
        },
        {
          "type": "filter",
          "expr": "indexof([\"V gene\",\"Insertion 1\",\"D gene\",\"Insertion 2\",\"J gene\"], datum[\"region\"]) !== -1"
        },
        {
          "type": "filter",
          "expr": "datum[\"start\"] !== null && !isNaN(datum[\"start\"])"
        }
      ]
    }
  ],
  "marks": [
    {
      "name": "layer_0_marks",
      "type": "rect",
      "style": [
        "bar"
      ],
      "from": {
        "data": "data_1"
      },
      "encode": {
        "update": {
          "fill": {
            "value": "firebrick"
          },
          "tooltip": {
            "signal": "{\"region\": ''+datum[\"region\"], \"start\": format(datum[\"start\"], \"\"), \"end\": format(datum[\"end\"], \"\")}"
          },
          "x": {
            "scale": "x",
            "field": "start"
          },
          "x2": {
            "scale": "x",
            "field": "end"
          },
          "yc": {
            "scale": "y",
            "field": "family",
            "band": 0.5
          },
          "height": {
            "value": 25
          }
        }
      }
    },
    {
      "name": "layer_1_marks",
      "type": "rect",
      "style": [
        "bar"
      ],
      "from": {
        "data": "data_2"
      },
      "encode": {
        "update": {
          "fill": {
            "scale": "color",
            "field": "region"
          },
          "tooltip": {
            "signal": "{\"region\": ''+datum[\"region\"], \"start\": format(datum[\"start\"], \"\"), \"end\": format(datum[\"end\"], \"\"), \"gene\": ''+datum[\"gene\"]}"
          },
          "x": {
            "scale": "x",
            "field": "start"
          },
          "x2": {
            "scale": "x",
            "field": "end"
          },
          "yc": {
            "scale": "y",
            "field": "family",
            "band": 0.5
          },
          "height": {
            "value": 12
          }
        }
      }
    }
  ],
  "scales": [
    {
      "name": "x",
      "type": "linear",
      "domain": [
        0,
        400
      ],
      "range": [
        0,
        {
          "signal": "width"
        }
      ],
      "nice": true,
      "zero": false
    },
    {
      "name": "y",
      "type": "band",
      "domain": {
        "fields": [
          {
            "data": "data_1",
            "field": "family"
          },
          {
            "data": "data_2",
            "field": "family"
          }
        ],
        "sort": true
      },
      "range": [
        0,
        {
          "signal": "height"
        }
      ],
      "paddingInner": 0.1,
      "paddingOuter": 0.05
    },
    {
      "name": "color",
      "type": "ordinal",
      "domain": [
        "V gene",
        "Insertion 1",
        "D gene",
        "Insertion 2",
        "J gene"
      ],
      "range": [
        "#1f78b4",
        "#a6cee3",
        "black",
        "#b2df8a",
        "#33a02c"
      ]
    }
  ], 
  "config": {
    "axisY": {
      "minExtent": 30
    }
  }
}

export default naiveVegaSpec;
