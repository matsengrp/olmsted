import facetClonalFamiliesVizSpec from "../../components/explorer/vega/facetScatterPlot";
import { concatTreeWithAlignmentSpec } from "../../components/explorer/vega/clonalFamilyDetails";
import fieldMetadataFixture from "../field-metadata-example.json";

const fieldMetadata = fieldMetadataFixture.datasets[0].field_metadata;
const cloneMetadata = fieldMetadata.clone;

describe("Dynamic field_metadata integration", () => {
  describe("scatterplot spec with field_metadata", () => {
    const spec = facetClonalFamiliesVizSpec({ fieldMetadata: cloneMetadata });
    const getSignal = (name) => spec.signals.find((s) => s.name === name);

    it("x/y axes include custom continuous fields", () => {
      const yField = getSignal("yField");
      expect(yField.bind.options).toContain("foobar_score");
      expect(yField.bind.options).toContain("baz_index");
      expect(yField.bind.options).toContain("unique_seqs_count");
    });

    it("x/y axes exclude categorical and tooltip fields", () => {
      const xField = getSignal("xField");
      expect(xField.bind.options).not.toContain("widget_type");
      expect(xField.bind.options).not.toContain("clone_id");
    });

    it("color/shape/facet include custom categorical fields", () => {
      const colorBy = getSignal("colorBy");
      expect(colorBy.bind.options).toContain("widget_type");
      expect(colorBy.bind.options).toContain("color_group");

      const facet = getSignal("facet_col_signal");
      expect(facet.bind.options).toContain("widget_type");
    });

    it("color/shape/facet exclude continuous and tooltip fields", () => {
      const shapeBy = getSignal("shapeBy");
      expect(shapeBy.bind.options).not.toContain("foobar_score");
      expect(shapeBy.bind.options).not.toContain("clone_id");
    });

    it("size-by includes custom continuous fields", () => {
      const sizeBy = getSignal("sizeBy");
      expect(sizeBy.bind.options).toContain("foobar_score");
      expect(sizeBy.bind.options).toContain("baz_index");
    });
  });

  describe("tree spec with field_metadata", () => {
    const spec = concatTreeWithAlignmentSpec({ showControls: true, fieldMetadata });
    const getSignal = (name) => spec.signals.find((s) => s.name === name);

    it("leaf_size_by includes custom node metrics", () => {
      const leafSize = getSignal("leaf_size_by");
      expect(leafSize.bind.options).toContain("wobble_metric");
      expect(leafSize.bind.options).toContain("multiplicity");
    });

    it("branch_width_by includes custom branch metrics", () => {
      const branchWidth = getSignal("branch_width_by");
      expect(branchWidth.bind.options).toContain("quux_weight");
      expect(branchWidth.bind.options).toContain("lbi");
    });

    it("branch_color_by includes custom branch metrics plus parent", () => {
      const branchColor = getSignal("branch_color_by");
      expect(branchColor.bind.options).toContain("quux_weight");
      expect(branchColor.bind.options).toContain("parent");
    });
  });

  describe("fixture data integrity", () => {
    const clones = Object.values(fieldMetadataFixture.clones).flat();

    it("clones have custom continuous fields", () => {
      for (const clone of clones) {
        expect(typeof clone.foobar_score).toBe("number");
        expect(typeof clone.baz_index).toBe("number");
      }
    });

    it("clones have custom categorical fields", () => {
      for (const clone of clones) {
        expect(["Alpha", "Beta"]).toContain(clone.widget_type);
        expect(["Red", "Blue", "Green"]).toContain(clone.color_group);
      }
    });

    it("nodes have custom metrics", () => {
      for (const tree of fieldMetadataFixture.trees) {
        for (const node of tree.nodes) {
          expect(typeof node.wobble_metric).toBe("number");
          expect(typeof node.quux_weight).toBe("number");
        }
      }
    });

    it("field_metadata has all three types", () => {
      const types = new Set(Object.values(cloneMetadata).map((m) => m.type));
      expect(types).toContain("continuous");
      expect(types).toContain("categorical");
      expect(types).toContain("tooltip");
    });
  });
});
