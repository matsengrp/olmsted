import * as vega from "vega";
import facetClonalFamiliesVizSpec from "../facetScatterPlot";

describe("facetClonalFamiliesVizSpec", () => {
  let spec;

  beforeAll(() => {
    spec = facetClonalFamiliesVizSpec();
  });

  it("returns a valid Vega v5 spec", () => {
    expect(spec).toBeDefined();
    expect(spec.$schema).toBe(
      "https://vega.github.io/schema/vega/v5.json"
    );
  });

  it("has all required top-level properties", () => {
    expect(spec).toHaveProperty("data");
    expect(spec).toHaveProperty("signals");
    expect(spec).toHaveProperty("layout");
    expect(spec).toHaveProperty("marks");
    expect(spec).toHaveProperty("scales");
    expect(spec).toHaveProperty("legends");
    expect(spec).toHaveProperty("config");
  });

  it("uses autosize pad with resize", () => {
    expect(spec.autosize).toEqual({ type: "pad", resize: true });
  });

  describe("data", () => {
    it("has expected named datasets", () => {
      const dataNames = spec.data.map((d) => d.name);
      expect(dataNames).toContain("pts_store");
      expect(dataNames).toContain("selected");
      expect(dataNames).toContain("locus");
      expect(dataNames).toContain("datasets");
      expect(dataNames).toContain("brush_store");
      expect(dataNames).toContain("source");
      expect(dataNames).toContain("data_0");
      expect(dataNames).toContain("column_domain");
    });

    it("data_0 derives from source with transforms", () => {
      const data0 = spec.data.find((d) => d.name === "data_0");
      expect(data0.source).toBe("source");
      expect(data0.transform).toBeInstanceOf(Array);
      expect(data0.transform.length).toBeGreaterThan(0);
    });

    it("data_0 transforms include formula and filter types", () => {
      const data0 = spec.data.find((d) => d.name === "data_0");
      const transformTypes = data0.transform.map((t) => t.type);
      expect(transformTypes).toContain("formula");
      expect(transformTypes).toContain("filter");
      expect(transformTypes).toContain("lookup");
    });

    it("column_domain aggregates by facet column signal", () => {
      const colDomain = spec.data.find((d) => d.name === "column_domain");
      expect(colDomain.source).toBe("data_0");
      const transformTypes = colDomain.transform.map((t) => t.type);
      expect(transformTypes).toContain("aggregate");
    });
  });

  describe("signals", () => {
    it("is a non-empty array", () => {
      expect(spec.signals).toBeInstanceOf(Array);
      expect(spec.signals.length).toBeGreaterThan(0);
    });

    const getSignal = (name) => spec.signals.find((s) => s.name === name);

    it("has layout signals", () => {
      expect(getSignal("width")).toBeDefined();
      expect(getSignal("height")).toBeDefined();
      expect(getSignal("child_width")).toBeDefined();
      expect(getSignal("child_height")).toBeDefined();
      expect(getSignal("layout_padding")).toBeDefined();
    });

    it("has selection signals", () => {
      expect(getSignal("pts")).toBeDefined();
      expect(getSignal("pts_tuple")).toBeDefined();
      expect(getSignal("pts_modify")).toBeDefined();
      expect(getSignal("clicked")).toBeDefined();
      expect(getSignal("brush_selection")).toBeDefined();
    });

    it("has control signals with bindings", () => {
      const facetCol = getSignal("facet_col_signal");
      expect(facetCol).toBeDefined();
      expect(facetCol.value).toBe("<none>");
      expect(facetCol.bind.input).toBe("select");

      const yField = getSignal("yField");
      expect(yField).toBeDefined();
      expect(yField.value).toBe("mean_mut_freq");
      expect(yField.bind.options).toContain("mean_mut_freq");
      expect(yField.bind.options).toContain("unique_seqs_count");

      const xField = getSignal("xField");
      expect(xField).toBeDefined();
      expect(xField.value).toBe("unique_seqs_count");

      const colorBy = getSignal("colorBy");
      expect(colorBy).toBeDefined();
      expect(colorBy.value).toBe("<none>");
      expect(colorBy.bind.options).toContain("subject_id");
    });

    it("has shape and size controls", () => {
      const shapeBy = getSignal("shapeBy");
      expect(shapeBy).toBeDefined();
      expect(shapeBy.value).toBe("<none>");

      const sizeBy = getSignal("sizeBy");
      expect(sizeBy).toBeDefined();
      expect(sizeBy.value).toBe("<none>");

      const symbolSize = getSignal("symbolSize");
      expect(symbolSize).toBeDefined();
      expect(symbolSize.value).toBe(1);

      const symbolOpacity = getSignal("symbolOpacity");
      expect(symbolOpacity).toBeDefined();
      expect(symbolOpacity.value).toBe(0.4);
    });

    it("has zoom/pan signals", () => {
      expect(getSignal("plot_height_ratio")).toBeDefined();
      expect(getSignal("bottom_divider_dragging")).toBeDefined();
    });

    it("has interaction mode signal", () => {
      const mode = getSignal("interaction_mode");
      expect(mode).toBeDefined();
      expect(mode.update).toBeDefined();
    });
  });

  describe("scales", () => {
    it("has x and y scales", () => {
      const scaleNames = spec.scales.map((s) => s.name);
      expect(scaleNames).toContain("x");
      expect(scaleNames).toContain("y");
    });

    it("x and y scales are linear", () => {
      const xScale = spec.scales.find((s) => s.name === "x");
      const yScale = spec.scales.find((s) => s.name === "y");
      expect(xScale.type).toBe("linear");
      expect(yScale.type).toBe("linear");
    });
  });

  describe("marks", () => {
    it("is a non-empty array", () => {
      expect(spec.marks).toBeInstanceOf(Array);
      expect(spec.marks.length).toBeGreaterThan(0);
    });

    it("contains a group mark for faceting", () => {
      const groupMarks = spec.marks.filter((m) => m.type === "group");
      expect(groupMarks.length).toBeGreaterThan(0);
    });
  });

  describe("legends", () => {
    it("is an array", () => {
      expect(spec.legends).toBeInstanceOf(Array);
    });
  });

  describe("layout", () => {
    it("has layout configuration for faceted columns", () => {
      expect(spec.layout).toBeDefined();
      expect(spec.layout).toHaveProperty("columns");
    });
  });

  describe("config", () => {
    it("sets Y axis minExtent", () => {
      expect(spec.config.axisY.minExtent).toBe(30);
    });
  });

  describe("determinism", () => {
    it("returns identical specs on repeated calls", () => {
      const spec1 = facetClonalFamiliesVizSpec();
      const spec2 = facetClonalFamiliesVizSpec();
      expect(JSON.stringify(spec1)).toBe(JSON.stringify(spec2));
    });
  });

  describe("Vega runtime compatibility", () => {
    it("parses without errors", () => {
      expect(() => vega.parse(spec)).not.toThrow();
    });

    it("produces a valid runtime dataflow", () => {
      const runtime = vega.parse(spec);
      expect(runtime).toBeDefined();
      expect(runtime).toHaveProperty("operators");
    });

    it("can instantiate a headless View", async () => {
      const runtime = vega.parse(spec);
      const view = new vega.View(runtime, { renderer: "none" });
      await expect(view.runAsync()).resolves.toBeDefined();
      view.finalize();
    });
  });
});
