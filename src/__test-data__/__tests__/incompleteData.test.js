import { validateCloneCompleteness, validateTreeCompleteness } from "../../utils/fieldDefaults";
import incompleteClone from "../incomplete-clone.json";
import incompleteTree from "../incomplete-tree.json";
import incompleteNoRoot from "../incomplete-no-root.json";

describe("Incomplete data detection with test fixtures", () => {
  describe("incomplete-clone.json — clone missing unique_seqs_count", () => {
    const clone = Object.values(incompleteClone.clones).flat()[0];

    it("detects incomplete clone", () => {
      const result = validateCloneCompleteness(clone);
      expect(result.complete).toBe(false);
    });

    it("reports missing unique sequence count", () => {
      const result = validateCloneCompleteness(clone);
      expect(result.reasons.some((r) => r.includes("unique sequence count"))).toBe(true);
    });

    it("tree itself is valid", () => {
      const tree = incompleteClone.trees[0];
      const result = validateTreeCompleteness(tree);
      expect(result.complete).toBe(true);
    });
  });

  describe("incomplete-tree.json — tree with empty nodes", () => {
    const clone = Object.values(incompleteTree.clones).flat()[0];
    const tree = incompleteTree.trees[0];

    it("clone is complete", () => {
      const result = validateCloneCompleteness(clone);
      expect(result.complete).toBe(true);
    });

    it("detects incomplete tree", () => {
      const result = validateTreeCompleteness(tree);
      expect(result.complete).toBe(false);
    });

    it("reports empty nodes", () => {
      const result = validateTreeCompleteness(tree);
      expect(result.reasons.some((r) => r.includes("no nodes") || r.includes("no root"))).toBe(true);
    });
  });

  describe("incomplete-no-root.json — tree with no root node", () => {
    const clone = Object.values(incompleteNoRoot.clones).flat()[0];
    const tree = incompleteNoRoot.trees[0];

    it("clone is complete", () => {
      const result = validateCloneCompleteness(clone);
      expect(result.complete).toBe(true);
    });

    it("detects missing root", () => {
      const result = validateTreeCompleteness(tree);
      expect(result.complete).toBe(false);
    });

    it("reports no root node", () => {
      const result = validateTreeCompleteness(tree);
      expect(result.reasons).toContain("Tree has no root node");
    });
  });

  describe("golden data — should be complete", () => {
    // Use the smallest golden dataset for fast tests
    const golden = require("../top20_olmsted.json");

    it("all clones are complete", () => {
      // clones may be an array or object keyed by dataset_id
      const clones = Array.isArray(golden.clones)
        ? golden.clones
        : Object.values(golden.clones).flat();
      for (const clone of clones) {
        const result = validateCloneCompleteness(clone);
        expect(result.complete).toBe(true);
      }
    });

    it("all trees are complete", () => {
      const trees = Array.isArray(golden.trees)
        ? golden.trees
        : Object.values(golden.trees).flat();
      for (const tree of trees) {
        const result = validateTreeCompleteness(tree);
        expect(result.complete).toBe(true);
      }
    });
  });
});
