import facetClonalFamiliesVizSpec from "../../components/explorer/vega/facetScatterPlot";
import { concatTreeWithAlignmentSpec } from "../../components/explorer/vega/clonalFamilyDetails";
import { computeTreeData } from "../../selectors/trees";
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
      expect(xField.bind.options).not.toContain("secret_note");
    });

    it("tooltip includes tooltip-only clone fields", () => {
      const specStr = JSON.stringify(spec);
      expect(specStr).toContain("secret_note");
      expect(specStr).toContain("Secret Note");
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

    it("leaf_size_by excludes tooltip-only fields", () => {
      const leafSize = getSignal("leaf_size_by");
      expect(leafSize.bind.options).not.toContain("snark_label");
    });

    it("node tooltip includes tooltip-only fields in spec", () => {
      // snark_label should appear in the generated tooltip signal
      const specStr = JSON.stringify(spec);
      expect(specStr).toContain("snark_label");
      expect(specStr).toContain("Snark Label");
    });

    it("mutation_color_by includes continuous mutation fields from metadata", () => {
      const mutColorBy = getSignal("mutation_color_by");
      expect(mutColorBy.bind.options).toContain("surprise_mutsel");
      expect(mutColorBy.bind.options).toContain("selection_contribution");
    });

    it("mutation_color_by includes aa-type fields from metadata", () => {
      const mutColorBy = getSignal("mutation_color_by");
      expect(mutColorBy.bind.options).toContain("child_aa");
    });

    it("mutation_color_by defaults to first aa field", () => {
      const mutColorBy = getSignal("mutation_color_by");
      expect(mutColorBy.value).toBe("child_aa");
    });

    it("mutation_color_by falls back to child_aa when no mutation metadata", () => {
      const noMutSpec = concatTreeWithAlignmentSpec({
        showControls: true,
        fieldMetadata: { node: fieldMetadata.node, branch: fieldMetadata.branch }
      });
      const mutColorBy = noMutSpec.signals.find((s) => s.name === "mutation_color_by");
      expect(mutColorBy.bind.options).toContain("child_aa");
      expect(mutColorBy.value).toBe("child_aa");
    });

    it("node tooltip includes all node metadata fields", () => {
      const specStr = JSON.stringify(spec);
      expect(specStr).toContain("wobble_metric");
      expect(specStr).toContain("Wobble Metric");
    });

    it("node tooltip includes branch-only metrics", () => {
      const specStr = JSON.stringify(spec);
      expect(specStr).toContain("quux_weight");
      expect(specStr).toContain("Quux Weight");
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

    it("has 4 clones with distinct values", () => {
      expect(clones.length).toBe(4);
      const foobarScores = clones.map((c) => c.foobar_score);
      expect(new Set(foobarScores).size).toBe(4);
    });

    it("clones have tooltip-only field (secret_note)", () => {
      for (const clone of clones) {
        expect(typeof clone.secret_note).toBe("string");
      }
    });

    it("clones have custom categorical fields with distinct values", () => {
      const widgetTypes = new Set(clones.map((c) => c.widget_type));
      expect(widgetTypes).toEqual(new Set(["Alpha", "Beta", "Gamma", "Delta"]));
      const colorGroups = new Set(clones.map((c) => c.color_group));
      expect(colorGroups).toEqual(new Set(["Red", "Blue", "Green", "Yellow"]));
    });

    it("nodes have custom metrics", () => {
      for (const tree of fieldMetadataFixture.trees) {
        for (const node of tree.nodes) {
          expect(typeof node.wobble_metric).toBe("number");
          expect(typeof node.quux_weight).toBe("number");
        }
      }
    });

    it("nodes have tooltip-only field (snark_label)", () => {
      for (const tree of fieldMetadataFixture.trees) {
        for (const node of tree.nodes) {
          expect(typeof node.snark_label).toBe("string");
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

  describe("data pipeline — custom fields survive computeTreeData", () => {
    it("snark_label survives through computeTreeData nodes", () => {
      // Simulate what fileProcessor does: convert array nodes to object
      const rawTree = fieldMetadataFixture.trees[0];
      const nodesObj = {};
      for (const node of rawTree.nodes) {
        nodesObj[node.sequence_id] = node;
      }
      // Convert back to array (like convertAndFilterNodes)
      const nodesArray = Object.entries(nodesObj).map(([nodeId, nodeData]) => ({
        sequence_id: nodeId,
        ...nodeData
      }));

      const mockTree = { ...rawTree, nodes: nodesArray };
      const processed = computeTreeData(mockTree);

      // Check that custom fields survive
      const nodeWithSnark = processed.nodes.find((n) => n.snark_label);
      expect(nodeWithSnark).toBeDefined();
      expect(typeof nodeWithSnark.snark_label).toBe("string");
      expect(typeof nodeWithSnark.wobble_metric).toBe("number");
    });
  });
});
