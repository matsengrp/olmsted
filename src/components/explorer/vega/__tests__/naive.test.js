import naiveVegaSpec from "../naive";
import { GENE_REGION_DOMAIN, GENE_REGION_RANGE } from "../../../../constants/geneRegionColors";

describe("naiveVegaSpec", () => {
  it("is a valid Vega v5 spec object", () => {
    expect(naiveVegaSpec).toBeDefined();
    expect(naiveVegaSpec.$schema).toBe(
      "https://vega.github.io/schema/vega/v5.json"
    );
  });

  it("has expected top-level properties", () => {
    expect(naiveVegaSpec).toHaveProperty("data");
    expect(naiveVegaSpec).toHaveProperty("marks");
    expect(naiveVegaSpec).toHaveProperty("scales");
    expect(naiveVegaSpec).toHaveProperty("config");
  });

  it("has fixed dimensions", () => {
    expect(naiveVegaSpec.width).toBe(250);
    expect(naiveVegaSpec.height).toBe(35);
    expect(naiveVegaSpec.padding).toBe(5);
  });

  it("uses autosize pad", () => {
    expect(naiveVegaSpec.autosize).toBe("pad");
  });

  describe("data", () => {
    it("has a single source dataset", () => {
      expect(naiveVegaSpec.data).toHaveLength(1);
      expect(naiveVegaSpec.data[0].name).toBe("source");
    });
  });

  describe("marks", () => {
    it("has a single rect mark", () => {
      expect(naiveVegaSpec.marks).toHaveLength(1);
      expect(naiveVegaSpec.marks[0].type).toBe("rect");
      expect(naiveVegaSpec.marks[0].name).toBe("layer_0_marks");
    });

    it("draws from the source dataset", () => {
      expect(naiveVegaSpec.marks[0].from.data).toBe("source");
    });

    it("encodes fill by gene region color scale", () => {
      const update = naiveVegaSpec.marks[0].encode.update;
      expect(update.fill.scale).toBe("color");
      expect(update.fill.field).toBe("region");
    });

    it("has opacity rules for Sequence region", () => {
      const opacity = naiveVegaSpec.marks[0].encode.update.opacity;
      expect(opacity).toBeInstanceOf(Array);
      expect(opacity[0].test).toContain("Sequence");
      expect(opacity[0].value).toBe(0.75);
      expect(opacity[1].value).toBe(1);
    });

    it("has height rules for CDR vs non-CDR regions", () => {
      const height = naiveVegaSpec.marks[0].encode.update.height;
      expect(height).toBeInstanceOf(Array);
      // CDR regions get height 30
      expect(height[0].test).toContain("CDR1");
      expect(height[0].value).toBe(30);
      // Sequence gets height 12
      expect(height[1].test).toContain("Sequence");
      expect(height[1].value).toBe(12);
    });

    it("includes tooltip signal", () => {
      const tooltip = naiveVegaSpec.marks[0].encode.update.tooltip;
      expect(tooltip).toHaveProperty("signal");
      expect(tooltip.signal).toContain("region");
    });
  });

  describe("scales", () => {
    it("has x, y, and color scales", () => {
      const scaleNames = naiveVegaSpec.scales.map((s) => s.name);
      expect(scaleNames).toContain("x");
      expect(scaleNames).toContain("y");
      expect(scaleNames).toContain("color");
    });

    it("x scale is linear", () => {
      const xScale = naiveVegaSpec.scales.find((s) => s.name === "x");
      expect(xScale.type).toBe("linear");
      expect(xScale.domain).toEqual([0, 150]);
    });

    it("y scale is band", () => {
      const yScale = naiveVegaSpec.scales.find((s) => s.name === "y");
      expect(yScale.type).toBe("band");
      expect(yScale.domain.data).toBe("source");
      expect(yScale.domain.field).toBe("family");
    });

    it("color scale uses gene region constants", () => {
      const colorScale = naiveVegaSpec.scales.find((s) => s.name === "color");
      expect(colorScale.type).toBe("ordinal");
      expect(colorScale.domain).toBe(GENE_REGION_DOMAIN);
      expect(colorScale.range).toBe(GENE_REGION_RANGE);
    });
  });

  describe("config", () => {
    it("sets Y axis minExtent", () => {
      expect(naiveVegaSpec.config.axisY.minExtent).toBe(30);
    });
  });
});
