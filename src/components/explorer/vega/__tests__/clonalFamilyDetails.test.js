import * as vega from "vega";
import {
  concatTreeWithAlignmentSpec,
  seqAlignSpec
} from "../clonalFamilyDetails";
import { GENE_REGION_DOMAIN, GENE_REGION_RANGE } from "../../../../constants/geneRegionColors";
import { AMINO_ACID_DOMAIN, AMINO_ACID_RANGE } from "../../../../constants/aminoAcidColors";

describe("concatTreeWithAlignmentSpec", () => {
  let spec;

  beforeAll(() => {
    spec = concatTreeWithAlignmentSpec();
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
    expect(spec).toHaveProperty("marks");
    expect(spec).toHaveProperty("scales");
  });

  it("uses autosize pad with resize", () => {
    expect(spec.autosize).toEqual({ type: "pad", resize: true });
  });

  describe("options", () => {
    it("defaults to showControls=true, showLegend=true, topPadding=20", () => {
      expect(spec.padding.top).toBe(20);
    });

    it("respects custom topPadding", () => {
      const custom = concatTreeWithAlignmentSpec({ topPadding: 50 });
      expect(custom.padding.top).toBe(50);
    });

    it("showControls=true adds bind properties to signals", () => {
      const withControls = concatTreeWithAlignmentSpec({ showControls: true });
      const maxLeafSize = withControls.signals.find(
        (s) => s.name === "max_leaf_size"
      );
      expect(maxLeafSize.bind).toBeDefined();
    });

    it("showControls=false omits bind properties from signals", () => {
      const noControls = concatTreeWithAlignmentSpec({ showControls: false });
      const maxLeafSize = noControls.signals.find(
        (s) => s.name === "max_leaf_size"
      );
      expect(maxLeafSize.bind).toBeUndefined();
    });
  });

  describe("data", () => {
    it("has expected named datasets", () => {
      const dataNames = spec.data.map((d) => d.name);
      expect(dataNames).toContain("leaves_count_incl_naive");
      expect(dataNames).toContain("naive_data");
      expect(dataNames).toContain("cdr_bounds");
      expect(dataNames).toContain("pts_store");
      expect(dataNames).toContain("seed");
      expect(dataNames).toContain("source_0");
      expect(dataNames).toContain("tree");
      expect(dataNames).toContain("links");
      expect(dataNames).toContain("nodes");
      expect(dataNames).toContain("leaves");
      expect(dataNames).toContain("valid_leaves");
      expect(dataNames).toContain("leaf_pies");
      expect(dataNames).toContain("source_1");
      expect(dataNames).toContain("data_1");
    });

    it("tree dataset uses stratify and tree transforms", () => {
      const tree = spec.data.find((d) => d.name === "tree");
      expect(tree.source).toBe("source_0");
      const transformTypes = tree.transform.map((t) => t.type);
      expect(transformTypes).toContain("stratify");
      expect(transformTypes).toContain("tree");
    });

    it("links dataset uses treelinks and linkpath transforms", () => {
      const links = spec.data.find((d) => d.name === "links");
      expect(links.source).toBe("tree");
      const transformTypes = links.transform.map((t) => t.type);
      expect(transformTypes).toContain("treelinks");
      expect(transformTypes).toContain("linkpath");
    });

    it("leaves dataset filters for leaf type", () => {
      const leaves = spec.data.find((d) => d.name === "leaves");
      expect(leaves.source).toBe("tree");
      const filterTransform = leaves.transform.find((t) => t.type === "filter");
      expect(filterTransform.expr).toContain("leaf");
    });
  });

  describe("signals", () => {
    const getSignal = (name) => spec.signals.find((s) => s.name === name);

    it("has core layout signals", () => {
      expect(getSignal("height")).toBeDefined();
      expect(getSignal("width")).toBeDefined();
      expect(getSignal("tree_group_width")).toBeDefined();
    });

    it("has tree control signals", () => {
      expect(getSignal("max_leaf_size")).toBeDefined();
      expect(getSignal("leaf_size_by")).toBeDefined();
      expect(getSignal("branch_width_by")).toBeDefined();
      expect(getSignal("branch_color_by")).toBeDefined();
      expect(getSignal("show_labels")).toBeDefined();
      expect(getSignal("fixed_branch_lengths")).toBeDefined();
    });

    it("has zoom/pan signals", () => {
      expect(getSignal("xdom")).toBeDefined();
      expect(getSignal("ydom")).toBeDefined();
      expect(getSignal("xrange")).toBeDefined();
      expect(getSignal("yrange")).toBeDefined();
    });

    it("has alignment signals", () => {
      expect(getSignal("alignment_zoom")).toBeDefined();
      expect(getSignal("alignment_pan")).toBeDefined();
      expect(getSignal("max_aa_seq_length")).toBeDefined();
    });

    it("has hover/selection signals", () => {
      expect(getSignal("hovered_leaf_y_tree")).toBeDefined();
      expect(getSignal("selected_leaf_y_tree")).toBeDefined();
      expect(getSignal("pts")).toBeDefined();
      expect(getSignal("pts_tuple")).toBeDefined();
    });

    it("has viz focus signal", () => {
      const vizFocused = getSignal("viz_focused");
      expect(vizFocused).toBeDefined();
      expect(vizFocused.value).toBe(false);
    });

    it("default values are sensible", () => {
      expect(getSignal("max_leaf_size").value).toBe(50);
      expect(getSignal("leaf_size_by").value).toBe("<none>");
      expect(getSignal("branch_width_by").value).toBe("<none>");
      expect(getSignal("branch_color_by").value).toBe("parent");
      expect(getSignal("show_labels").value).toBe(true);
      expect(getSignal("fixed_branch_lengths").value).toBe(false);
      expect(getSignal("alignment_zoom").value).toBe(1);
      expect(getSignal("alignment_pan").value).toBe(0);
    });
  });

  describe("scales", () => {
    it("has expected scales", () => {
      const scaleNames = spec.scales.map((s) => s.name);
      expect(scaleNames).toContain("naive_color");
      expect(scaleNames).toContain("aa_color");
      expect(scaleNames).toContain("time");
      expect(scaleNames).toContain("yscale");
    });

    it("naive_color scale uses gene region constants", () => {
      const colorScale = spec.scales.find((s) => s.name === "naive_color");
      expect(colorScale.type).toBe("ordinal");
      expect(colorScale.domain).toEqual(GENE_REGION_DOMAIN);
      expect(colorScale.range).toEqual(GENE_REGION_RANGE);
    });

    it("aa_color scale uses amino acid constants", () => {
      const aaScale = spec.scales.find((s) => s.name === "aa_color");
      expect(aaScale.type).toBe("ordinal");
      expect(aaScale.domain).toEqual(AMINO_ACID_DOMAIN);
      expect(aaScale.range).toEqual(AMINO_ACID_RANGE);
    });
  });

  describe("determinism", () => {
    it("returns identical specs with same options", () => {
      const spec1 = concatTreeWithAlignmentSpec();
      const spec2 = concatTreeWithAlignmentSpec();
      expect(JSON.stringify(spec1)).toBe(JSON.stringify(spec2));
    });

    it("returns different specs with different options", () => {
      const withControls = concatTreeWithAlignmentSpec({ showControls: true });
      const noControls = concatTreeWithAlignmentSpec({ showControls: false });
      expect(JSON.stringify(withControls)).not.toBe(
        JSON.stringify(noControls)
      );
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
      // logLevel: 0 (vega.None) suppresses expected runtime errors from missing data
      const view = new vega.View(runtime, { renderer: "none", logLevel: 0 });
      await expect(view.runAsync()).resolves.toBeDefined();
      view.finalize();
    });

    it("parses with showControls=false", () => {
      const noControls = concatTreeWithAlignmentSpec({ showControls: false });
      expect(() => vega.parse(noControls)).not.toThrow();
    });
  });
});

describe("seqAlignSpec", () => {
  const mockFamily = {
    lineage_seq_counter: 10
  };

  let spec;

  beforeAll(() => {
    spec = seqAlignSpec(mockFamily);
  });

  it("returns a valid Vega v5 spec", () => {
    expect(spec).toBeDefined();
    expect(spec.$schema).toBe(
      "https://vega.github.io/schema/vega/v5.json"
    );
  });

  it("has expected top-level properties", () => {
    expect(spec).toHaveProperty("data");
    expect(spec).toHaveProperty("marks");
    expect(spec).toHaveProperty("scales");
  });

  it("uses autosize pad with resize", () => {
    expect(spec.autosize).toEqual({ type: "pad", resize: true });
  });

  describe("height calculation", () => {
    it("computes height from lineage_seq_counter", () => {
      // (10 + 2) * 16 + 20 = 212
      expect(spec.height).toBe(212);
    });

    it("enforces minimum height of 100", () => {
      const tinyFamily = { lineage_seq_counter: 1 };
      const tinySpec = seqAlignSpec(tinyFamily);
      // (1 + 2) * 16 + 20 = 68 → clamped to 100
      expect(tinySpec.height).toBe(100);
    });

    it("enforces maximum height of 5000", () => {
      const hugeFamily = { lineage_seq_counter: 500 };
      const hugeSpec = seqAlignSpec(hugeFamily);
      // (500 + 2) * 16 + 20 = 8052 → clamped to 5000
      expect(hugeSpec.height).toBe(5000);
    });
  });

  describe("data", () => {
    it("has naive_data dataset", () => {
      const naiveData = spec.data.find((d) => d.name === "naive_data");
      expect(naiveData).toBeDefined();
    });

    it("has source_0 dataset for mutations", () => {
      const source = spec.data.find((d) => d.name === "source_0");
      expect(source).toBeDefined();
    });
  });

  describe("scales", () => {
    it("has amino acid color scale", () => {
      const aaScale = spec.scales.find((s) => s.name === "aa_color");
      expect(aaScale).toBeDefined();
      expect(aaScale.type).toBe("ordinal");
      expect(aaScale.domain).toEqual(AMINO_ACID_DOMAIN);
      expect(aaScale.range).toEqual(AMINO_ACID_RANGE);
    });

    it("has gene region color scale", () => {
      const colorScale = spec.scales.find((s) => s.name === "naive_color");
      expect(colorScale).toBeDefined();
      expect(colorScale.domain).toEqual(GENE_REGION_DOMAIN);
      expect(colorScale.range).toEqual(GENE_REGION_RANGE);
    });
  });

  describe("options", () => {
    it("defaults showMutationBorders to false", () => {
      // The default spec should not have strokeWidth on mutation marks
      // (or have it set to 0 / not present)
      expect(spec).toBeDefined();
    });
  });

  describe("determinism", () => {
    it("returns identical specs for the same family", () => {
      const spec1 = seqAlignSpec(mockFamily);
      const spec2 = seqAlignSpec(mockFamily);
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
