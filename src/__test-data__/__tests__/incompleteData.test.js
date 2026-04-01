import { validateCloneCompleteness, validateTreeCompleteness } from "../../utils/fieldDefaults";
import incompleteClone from "../incomplete-clone.json";
import incompleteTree from "../incomplete-tree.json";
import incompleteNoRoot from "../incomplete-no-root.json";
import surpriseForest from "../surprise-forest-example.json";
import forestOnly from "../forest-only-example.json";

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

  describe("surprise-forest-example.json — surprise scores + forest trees", () => {
    const clones = Object.values(surpriseForest.clones).flat();

    it("has 2 clones and 2 trees", () => {
      expect(clones.length).toBe(2);
      expect(surpriseForest.trees.length).toBe(2);
    });

    it("all clones are complete", () => {
      for (const clone of clones) {
        expect(validateCloneCompleteness(clone).complete).toBe(true);
      }
    });

    it("all trees are complete", () => {
      for (const tree of surpriseForest.trees) {
        expect(validateTreeCompleteness(tree).complete).toBe(true);
      }
    });

    it("each tree is a forest with 2 roots", () => {
      for (const tree of surpriseForest.trees) {
        const nodes = Array.isArray(tree.nodes) ? tree.nodes : Object.values(tree.nodes);
        const roots = nodes.filter((n) => !n.parent);
        expect(roots.length).toBe(2);
      }
    });

    it("each tree has 5 leaves", () => {
      for (const tree of surpriseForest.trees) {
        const nodes = Array.isArray(tree.nodes) ? tree.nodes : Object.values(tree.nodes);
        const leaves = nodes.filter((n) => n.type === "leaf");
        expect(leaves.length).toBe(5);
      }
    });

    it("leaf nodes have mutations with expected fields", () => {
      const nodes = surpriseForest.trees[0].nodes;
      const withSurprise = nodes.filter((n) => n.mutations && n.mutations.length > 0);
      expect(withSurprise.length).toBe(5);
      for (const node of withSurprise) {
        const m = node.mutations[0];
        expect(m).toHaveProperty("site");
        expect(m).toHaveProperty("surprise_mutsel");
        expect(m).toHaveProperty("selection_contribution");
        expect(m).toHaveProperty("region");
      }
    });
  });

  describe("forest-only-example.json — forest trees without surprise scores", () => {
    const clones = Object.values(forestOnly.clones).flat();

    it("has 2 clones and 2 trees", () => {
      expect(clones.length).toBe(2);
      expect(forestOnly.trees.length).toBe(2);
    });

    it("all clones are complete", () => {
      for (const clone of clones) {
        expect(validateCloneCompleteness(clone).complete).toBe(true);
      }
    });

    it("all trees are complete", () => {
      for (const tree of forestOnly.trees) {
        expect(validateTreeCompleteness(tree).complete).toBe(true);
      }
    });

    it("each tree is a forest with 2 roots", () => {
      for (const tree of forestOnly.trees) {
        const nodes = Array.isArray(tree.nodes) ? tree.nodes : Object.values(tree.nodes);
        const roots = nodes.filter((n) => !n.parent);
        expect(roots.length).toBe(2);
      }
    });

    it("each tree has 5 leaves", () => {
      for (const tree of forestOnly.trees) {
        const nodes = Array.isArray(tree.nodes) ? tree.nodes : Object.values(tree.nodes);
        const leaves = nodes.filter((n) => n.type === "leaf");
        expect(leaves.length).toBe(5);
      }
    });

    it("no nodes have mutations", () => {
      for (const tree of forestOnly.trees) {
        const nodes = Array.isArray(tree.nodes) ? tree.nodes : Object.values(tree.nodes);
        const withSurprise = nodes.filter((n) => n.mutations);
        expect(withSurprise.length).toBe(0);
      }
    });
  });

  describe("valid fixtures — should all pass completeness", () => {
    const fixtures = [
      { name: "surprise-forest", data: surpriseForest },
      { name: "forest-only", data: forestOnly }
    ];

    for (const { name, data } of fixtures) {
      it(`${name}: all clones are complete`, () => {
        const clones = Object.values(data.clones).flat();
        for (const clone of clones) {
          expect(validateCloneCompleteness(clone).complete).toBe(true);
        }
      });

      it(`${name}: all trees are complete`, () => {
        for (const tree of data.trees) {
          expect(validateTreeCompleteness(tree).complete).toBe(true);
        }
      });
    }
  });
});
