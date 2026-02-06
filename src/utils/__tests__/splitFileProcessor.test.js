import SplitFileProcessor from "../splitFileProcessor";

describe("SplitFileProcessor", () => {
  describe("isSplitFormat", () => {
    it("returns true for files with dataset + clones naming pattern", () => {
      const files = [
        { name: "dataset.json", content: { dataset_id: "d1" } },
        { name: "clones.json", content: [{ clone_id: "c1" }] }
      ];
      expect(SplitFileProcessor.isSplitFormat(files)).toBe(true);
    });

    it("returns true for files with dataset + tree naming pattern", () => {
      const files = [
        { name: "dataset.json", content: { dataset_id: "d1" } },
        { name: "tree.json", content: [{ newick: "(a,b);" }] }
      ];
      expect(SplitFileProcessor.isSplitFormat(files)).toBe(true);
    });

    it("returns true for mixed array/object content structure", () => {
      const files = [
        { name: "data1.json", content: { dataset_id: "d1" } },
        { name: "data2.json", content: [{ clone_id: "c1" }] }
      ];
      expect(SplitFileProcessor.isSplitFormat(files)).toBe(true);
    });

    it("returns false for single file", () => {
      const files = [
        { name: "dataset.json", content: { dataset_id: "d1" } }
      ];
      expect(SplitFileProcessor.isSplitFormat(files)).toBe(false);
    });

    it("returns false for files without split indicators", () => {
      const files = [
        { name: "a.json", content: { foo: "bar" } },
        { name: "b.json", content: { baz: "qux" } }
      ];
      expect(SplitFileProcessor.isSplitFormat(files)).toBe(false);
    });
  });

  describe("isDatasetContent", () => {
    it("returns true for object with dataset_id", () => {
      expect(SplitFileProcessor.isDatasetContent({ dataset_id: "d1" })).toBe(true);
    });

    it("returns true for object with ident (no clone_id/newick)", () => {
      expect(SplitFileProcessor.isDatasetContent({ ident: "d1" })).toBe(true);
    });

    it("returns false for object with clone_id", () => {
      expect(SplitFileProcessor.isDatasetContent({ dataset_id: "d1", clone_id: "c1" })).toBe(false);
    });

    it("returns false for object with newick", () => {
      expect(SplitFileProcessor.isDatasetContent({ dataset_id: "d1", newick: "(a,b);" })).toBe(false);
    });

    it("returns true for array of dataset objects", () => {
      expect(SplitFileProcessor.isDatasetContent([{ dataset_id: "d1" }])).toBe(true);
    });

    it("returns false for empty array", () => {
      expect(SplitFileProcessor.isDatasetContent([])).toBe(false);
    });
  });

  describe("isClonesContent", () => {
    it("returns true for array of objects with clone_id", () => {
      expect(SplitFileProcessor.isClonesContent([{ clone_id: "c1" }])).toBe(true);
    });

    it("returns true for single object with clone_id", () => {
      expect(SplitFileProcessor.isClonesContent({ clone_id: "c1" })).toBe(true);
    });

    it("returns false for objects with dataset_id", () => {
      expect(SplitFileProcessor.isClonesContent({ clone_id: "c1", dataset_id: "d1" })).toBe(false);
    });

    it("returns false for objects with newick", () => {
      expect(SplitFileProcessor.isClonesContent([{ clone_id: "c1", newick: "(a);" }])).toBe(false);
    });
  });

  describe("isTreeContent", () => {
    it("returns true for object with newick", () => {
      expect(SplitFileProcessor.isTreeContent({ newick: "(a,b);" })).toBe(true);
    });

    it("returns true for object with tree_id", () => {
      expect(SplitFileProcessor.isTreeContent({ tree_id: "t1" })).toBe(true);
    });

    it("returns true for array of tree objects", () => {
      expect(SplitFileProcessor.isTreeContent([{ newick: "(a,b);" }])).toBe(true);
    });

    it("returns false for non-tree objects", () => {
      expect(SplitFileProcessor.isTreeContent({ clone_id: "c1" })).toBeFalsy();
    });
  });

  describe("extractDatasets", () => {
    it("extracts dataset objects from file contents", () => {
      const files = [
        { name: "dataset.json", content: { dataset_id: "d1" } },
        { name: "clones.json", content: [{ clone_id: "c1" }] }
      ];
      const result = SplitFileProcessor.extractDatasets(files);
      expect(result).toHaveLength(1);
      expect(result[0].dataset_id).toBe("d1");
    });

    it("extracts multiple datasets from array content", () => {
      const files = [
        {
          name: "datasets.json",
          content: [{ dataset_id: "d1" }, { dataset_id: "d2" }]
        }
      ];
      const result = SplitFileProcessor.extractDatasets(files);
      expect(result).toHaveLength(2);
    });
  });

  describe("extractClones", () => {
    it("extracts clone objects from array content", () => {
      const files = [
        { name: "clones.json", content: [{ clone_id: "c1" }, { clone_id: "c2" }] }
      ];
      const result = SplitFileProcessor.extractClones(files);
      expect(result).toHaveLength(2);
    });

    it("extracts single clone object", () => {
      const files = [
        { name: "clone.json", content: { clone_id: "c1" } }
      ];
      const result = SplitFileProcessor.extractClones(files);
      expect(result).toHaveLength(1);
    });
  });

  describe("extractTrees", () => {
    it("extracts tree objects", () => {
      const files = [
        { name: "tree.json", content: [{ newick: "(a,b);" }] }
      ];
      const result = SplitFileProcessor.extractTrees(files);
      expect(result).toHaveLength(1);
    });

    it("extracts single tree object with tree_id", () => {
      const files = [
        { name: "tree.json", content: { tree_id: "t1", newick: "(a);" } }
      ];
      const result = SplitFileProcessor.extractTrees(files);
      expect(result).toHaveLength(1);
    });
  });

  describe("inferSamplesFromClones", () => {
    it("infers unique samples from clones", () => {
      const clones = [
        { sample_id: "s1", subject_id: "sub1" },
        { sample_id: "s1", subject_id: "sub1" },
        { sample_id: "s2", subject_id: "sub2" }
      ];
      const result = SplitFileProcessor.inferSamplesFromClones(clones);
      expect(result).toHaveLength(2);
      expect(result[0].sample_id).toBe("s1");
      expect(result[1].sample_id).toBe("s2");
    });

    it("defaults to 'unknown' when sample_id is missing", () => {
      const clones = [{ clone_id: "c1" }];
      const result = SplitFileProcessor.inferSamplesFromClones(clones);
      expect(result[0].sample_id).toBe("unknown");
    });

    it("defaults locus to IGH", () => {
      const clones = [{ sample_id: "s1" }];
      const result = SplitFileProcessor.inferSamplesFromClones(clones);
      expect(result[0].locus).toBe("IGH");
    });

    it("uses clone locus when available", () => {
      const clones = [{ sample_id: "s1", locus: "IGK" }];
      const result = SplitFileProcessor.inferSamplesFromClones(clones);
      expect(result[0].locus).toBe("IGK");
    });
  });
});
