/**
 * Manual Jest mock for react-vega v8 (ESM-only package).
 *
 * Limitation: This mock renders a stub <div> and never calls onEmbed,
 * so signal listener registration and onNewView callbacks are not exercised.
 * Integration tests that need Vega View behavior should use the real package
 * with the UMD build (see jest.config.js moduleNameMapper).
 */
const React = require("react");

const VegaEmbed = React.forwardRef(function VegaEmbed(props, ref) {
  return React.createElement("div", { ref, "data-testid": "vega-embed" });
});
VegaEmbed.displayName = "VegaEmbed";

function useVegaEmbed() {
  return null;
}

module.exports = { VegaEmbed, useVegaEmbed };
