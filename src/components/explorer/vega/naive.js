/* eslint-disable eqeqeq */
// Note: Vega expressions use == for comparison within expression strings
// These are not JavaScript expressions but Vega's domain-specific language

const naiveVegaSpec = {
  $schema: "https://vega.github.io/schema/vega/v5.json",
  autosize: "pad",
  padding: 5,
  width: 250,
  height: 35,
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
      style: ["bar"],
      from: {
        data: "source"
      },
      encode: {
        update: {
          fill: { scale: "color", field: "region" },
          opacity: [
            {
              test: "datum[\"region\"] == 'Sequence'",
              value: 0.75
            },
            { value: 1 }
          ],
          tooltip: {
            signal:
              '{"region": \'\'+datum["region"], "start": format(datum["start"], ""), "end": format(datum["end"], ""),  "gene": \'\'+datum["gene"]}'
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
              test: "datum[\"region\"] == 'CDR1' || datum[\"region\"] == 'CDR2' || datum[\"region\"] == 'CDR3'",
              value: 30
            },
            {
              test: "datum[\"region\"] == 'Sequence'",
              value: 12
            },
            { value: 12 }
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
      range: [0, { signal: "width" }],
      nice: true,
      zero: false
    },
    {
      name: "y",
      type: "band",
      domain: { data: "source", field: "family" },
      range: [0, { signal: "height" }],
      paddingInner: 0.1,
      paddingOuter: 0.05
    },
    {
      name: "color",
      type: "ordinal",
      domain: ["V gene", "5' Insertion", "D gene", "3' Insertion", "J gene", "CDR1", "CDR2", "CDR3", "Sequence"],
      // COLORS - CDR1, CDR2, and CDR3 all use the same dark green (#1b7837), Sequence is grey
      range: ["#762a83", "#af8dc3", "black", "#d9f0d3", "#7fbf7b", "#1b7837", "#1b7837", "#1b7837", "#cccccc"]
    }
  ],
  config: {
    axisY: {
      minExtent: 30
    }
  }
};

export default naiveVegaSpec;
