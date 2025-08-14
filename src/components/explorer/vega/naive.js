const naiveVegaSpec = {
  $schema: "https://vega.github.io/schema/vega/v4.json",
  autosize: "pad",
  padding: 5,
  width: 250,
  height: 25,
  // Remove style: cell to get rid of border
  style: "cell",
  data: [
    {
      name: "source"
    }
  ],
  marks: [
    {
      name: "layer_0_marks",
      type: "rect",
      style: [
        "bar"
      ],
      from: {
        data: "source"
      },
      encode: {
        update: {
          fill: {scale: "color", field: "region"},
          tooltip: {
            signal: "{\"region\": ''+datum[\"region\"], \"start\": format(datum[\"start\"], \"\"), \"end\": format(datum[\"end\"], \"\"),  \"gene\": ''+datum[\"gene\"]}"
          },
          x: {
            scale: "x",
            field: "start"
          },
          x2: {
            scale: "x",
            field: "end"
          },
          yc: {
            scale: "y",
            field: "family",
            band: 0.5
          },
          height: [
            {
              test: "datum[\"region\"] == 'CDR3'",
              value: 25
            },
            {value: 12}
          ]
        }
      }
    }
  ],
  scales: [
    {
      name: "x",
      type: "linear",
      domain: [0, 400],
      range: [0, {signal: "width"}],
      nice: true,
      zero: false
    },
    {
      name: "y",
      type: "band",
      domain: {data: "source", field: "family"},
      range: [0, {signal: "height"}],
      paddingInner: 0.1,
      paddingOuter: 0.05
    },
    {
      name: "color",
      type: "ordinal",
      domain: [
        "V gene",
        "5' Insertion",
        "D gene",
        "3' Insertion",
        "J gene",
        "CDR3"
      ],
      // COLORS
      range: [
        "#762a83",
        "#af8dc3",
        "black",
        "#d9f0d3",
        "#7fbf7b",
        "#1b7837"
      ]
    }
  ],
  config: {
    axisY: {
      minExtent: 30
    }
  }
};

export default naiveVegaSpec;
