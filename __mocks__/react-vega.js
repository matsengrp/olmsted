const React = require("react");

const VegaEmbed = React.forwardRef(function VegaEmbed(props, ref) {
  return React.createElement("div", { ref, "data-testid": "vega-embed" });
});
VegaEmbed.displayName = "VegaEmbed";

function useVegaEmbed() {
  return null;
}

module.exports = { VegaEmbed, useVegaEmbed };
