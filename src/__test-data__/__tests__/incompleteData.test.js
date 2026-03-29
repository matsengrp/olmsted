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

  describe("surprise-forest-example.json — surprise scores + forest tree", () => {
    const clone = Object.values(surpriseForest.clones).flat()[0];
    const tree = surpriseForest.trees[0];
    const nodes = Array.isArray(tree.nodes) ? tree.nodes : Object.values(tree.nodes);

    it("clone is complete", () => {
      expect(validateCloneCompleteness(clone).complete).toBe(true);
    });

    it("tree is complete", () => {
      expect(validateTreeCompleteness(tree).complete).toBe(true);
    });

    it("has multiple roots (forest)", () => {
      const roots = nodes.filter((n) => !n.parent);
      expect(roots.length).toBeGreaterThanOrEqual(2);
    });

    it("has nodes with surprise_mutations", () => {
      const withSurprise = nodes.filter((n) => n.surprise_mutations && n.surprise_mutations.length > 0);
      expect(withSurprise.length).toBeGreaterThan(0);
    });

    it("surprise_mutations have expected fields", () => {
      const node = nodes.find((n) => n.surprise_mutations && n.surprise_mutations.length > 0);
      const mutation = node.surprise_mutations[0];
      expect(mutation).toHaveProperty("site");
      expect(mutation).toHaveProperty("surprise_mutsel");
      expect(mutation).toHaveProperty("selection_contribution");
      expect(mutation).toHaveProperty("region");
    });
  });

  describe("forest-only-example.json — forest without surprise scores", () => {
    const clone = Object.values(forestOnly.clones).flat()[0];
    const tree = forestOnly.trees[0];
    const nodes = Array.isArray(tree.nodes) ? tree.nodes : Object.values(tree.nodes);

    it("clone is complete", () => {
      expect(validateCloneCompleteness(clone).complete).toBe(true);
    });

    it("tree is complete", () => {
      expect(validateTreeCompleteness(tree).complete).toBe(true);
    });

    it("has multiple roots (forest)", () => {
      const roots = nodes.filter((n) => !n.parent);
      expect(roots.length).toBeGreaterThanOrEqual(2);
    });

    it("has no surprise_mutations on any node", () => {
      const withSurprise = nodes.filter((n) => n.surprise_mutations);
      expect(withSurprise.length).toBe(0);
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
