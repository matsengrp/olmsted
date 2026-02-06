import FileProcessor from "../fileProcessor";

describe("FileProcessor", () => {
  describe("isConsolidatedFormat", () => {
    it("returns true for valid consolidated format", () => {
      const data = {
        metadata: { schema_version: "2.0.0" },
        datasets: [{ dataset_id: "d1" }],
        clones: { d1: [] },
        trees: []
      };
      expect(FileProcessor.isConsolidatedFormat(data)).toBeTruthy();
    });

    it("returns false when metadata is missing", () => {
      expect(
        FileProcessor.isConsolidatedFormat({
          datasets: [],
          clones: {},
          trees: []
        })
      ).toBeFalsy();
    });

    it("returns false when datasets is missing", () => {
      expect(
        FileProcessor.isConsolidatedFormat({
          metadata: {},
          clones: {},
          trees: []
        })
      ).toBeFalsy();
    });

    it("returns false for null", () => {
      expect(FileProcessor.isConsolidatedFormat(null)).toBeFalsy();
    });

    it("returns false for non-object", () => {
      expect(FileProcessor.isConsolidatedFormat("string")).toBeFalsy();
    });
  });

  describe("processConsolidatedFormat", () => {
    const validData = {
      metadata: { schema_version: "2.0.0", name: "Test Data" },
      datasets: [
        { dataset_id: "original-id", clone_count: 2, subjects_count: 1 }
      ],
      clones: {
        "original-id": [
          { ident: "clone-1", clone_id: "c1" },
          { ident: "clone-2", clone_id: "c2" }
        ]
      },
      trees: [
        {
          ident: "tree-1",
          clone_id: "c1",
          nodes: [
            { sequence_id: "naive", type: "root" },
            { sequence_id: "leaf-1", type: "leaf" }
          ]
        }
      ]
    };

    it("processes valid consolidated data", () => {
      const result = FileProcessor.processConsolidatedFormat(validData, "test.json");
      expect(result.datasets).toHaveLength(1);
      expect(result.datasetId).toBeDefined();
      expect(result.trees).toHaveLength(1);
    });

    it("generates a new dataset ID", () => {
      const result = FileProcessor.processConsolidatedFormat(validData, "test.json");
      expect(result.datasetId).not.toBe("original-id");
      expect(result.datasetId).toMatch(/^upload-/);
    });

    it("preserves original dataset ID", () => {
      const result = FileProcessor.processConsolidatedFormat(validData, "test.json");
      expect(result.datasets[0].original_dataset_id).toBe("original-id");
    });

    it("assigns dataset ID to clones", () => {
      const result = FileProcessor.processConsolidatedFormat(validData, "test.json");
      const clones = result.clones[result.datasetId];
      expect(clones).toHaveLength(2);
      clones.forEach((clone) => {
        expect(clone.dataset_id).toBe(result.datasetId);
      });
    });

    it("converts tree nodes from array to object", () => {
      const result = FileProcessor.processConsolidatedFormat(validData, "test.json");
      const tree = result.trees[0];
      expect(tree.nodes).not.toBeInstanceOf(Array);
      expect(tree.nodes["naive"]).toBeDefined();
    });

    it("marks dataset as temporary and client-side", () => {
      const result = FileProcessor.processConsolidatedFormat(validData, "test.json");
      expect(result.datasets[0].temporary).toBe(true);
      expect(result.datasets[0].isClientSide).toBe(true);
    });

    it("uses metadata name for dataset name", () => {
      const result = FileProcessor.processConsolidatedFormat(validData, "test.json");
      expect(result.datasets[0].name).toBe("Test Data");
    });

    it("throws when datasets array is empty", () => {
      const emptyData = { ...validData, datasets: [] };
      expect(() => FileProcessor.processConsolidatedFormat(emptyData, "test.json")).toThrow(
        "missing datasets"
      );
    });
  });

  describe("generateDatasetId", () => {
    it("generates unique IDs", () => {
      const id1 = FileProcessor.generateDatasetId();
      const id2 = FileProcessor.generateDatasetId();
      expect(id1).not.toBe(id2);
    });

    it("starts with upload-", () => {
      expect(FileProcessor.generateDatasetId()).toMatch(/^upload-/);
    });
  });
});
