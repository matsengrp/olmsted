import { getTreeFromCache, computeTreeData, computeLineageDataWithOptions } from "../trees";
import { mockTree, mockTreeNodes, mockFamily1 } from "../../__test-data__/mockState";

describe("getTreeFromCache", () => {
  const cache = {
    "tree-1": mockTree,
    "tree-2": { ident: "tree-2", nodes: [] }
  };

  it("returns tree by selected ident", () => {
    const result = getTreeFromCache(cache, mockFamily1, "tree-1");
    expect(result).toBe(mockTree);
  });

  it("falls back to seed_lineage tree when no ident specified", () => {
    const result = getTreeFromCache(cache, mockFamily1, undefined);
    // mockFamily1.trees has tree-1 with seed_lineage strategy
    expect(result).toBe(mockTree);
  });

  it("falls back to min_adcl if no seed_lineage tree", () => {
    const familyNoSeed = {
      trees: {
        "tree-2": { ident: "tree-2", downsampling_strategy: "min_adcl" }
      }
    };
    const result = getTreeFromCache(cache, familyNoSeed, undefined);
    expect(result.ident).toBe("tree-2");
  });

  it("falls back to first tree if no preferred strategy", () => {
    const familyOther = {
      trees: {
        "tree-2": { ident: "tree-2", downsampling_strategy: "other" }
      }
    };
    const result = getTreeFromCache(cache, familyOther, undefined);
    expect(result.ident).toBe("tree-2");
  });
});

describe("computeTreeData", () => {
  it("returns empty object for null tree", () => {
    expect(computeTreeData(null)).toEqual({});
    expect(computeTreeData(undefined)).toEqual({});
  });

  it("returns tree data unchanged when no nodes", () => {
    const treeNoNodes = { ident: "t1" };
    const result = computeTreeData(treeNoNodes);
    expect(result.ident).toBe("t1");
    expect(result.tips_alignment).toBeUndefined();
  });

  it("computes tips alignment from nodes", () => {
    const result = computeTreeData(mockTree);
    expect(result.tips_alignment).toBeDefined();
    expect(Array.isArray(result.tips_alignment)).toBe(true);
    expect(result.tips_alignment.length).toBeGreaterThan(0);
  });

  it("computes leaves count including naive", () => {
    const result = computeTreeData(mockTree);
    // root + 2 leaves = 3 (after filtering to root/leaf only)
    expect(result.leaves_count_incl_naive).toBe(3);
  });

  it("computes download sequences", () => {
    const result = computeTreeData(mockTree);
    expect(result.download_unique_family_seqs).toBeDefined();
    expect(Array.isArray(result.download_unique_family_seqs)).toBe(true);
  });

  it("nullifies lbr on naive nodes", () => {
    const result = computeTreeData(mockTree);
    const naive = result.nodes.find((n) => n.sequence_id === "inferred_naive");
    expect(naive.lbr).toBeUndefined();
  });

  it("alignment includes naive entries for every position with parent_aa and child_aa", () => {
    const result = computeTreeData(mockTree);
    const naiveEntries = result.tips_alignment.filter((m) => m.type === "naive");
    // naive seq is "MKVL" = 4 chars, so 4 naive entries
    expect(naiveEntries).toHaveLength(4);
    // parent_aa and child_aa must be present so Vega fill encoding can color them
    naiveEntries.forEach((entry) => {
      expect(entry.parent_aa).toBeDefined();
      expect(entry.child_aa).toBe(entry.parent_aa);
    });
  });

  it("alignment includes mutations for leaf nodes", () => {
    const result = computeTreeData(mockTree);
    // leaf-1 has "MKVI" vs naive "MKVL" — differs at position 3
    const leaf1Mutations = result.tips_alignment.filter((m) => m.seq_id === "leaf-1" && m.type === "leaf");
    expect(leaf1Mutations.length).toBeGreaterThanOrEqual(1);
    const mutAtPos3 = leaf1Mutations.find((m) => m.position === 3);
    expect(mutAtPos3).toBeDefined();
    expect(mutAtPos3.parent_aa).toBe("L");
    expect(mutAtPos3.child_aa).toBe("I");
  });

  it("mutation records have no site data when nodes lack mutations array", () => {
    const result = computeTreeData(mockTree);
    const leaf1Mutations = result.tips_alignment.filter((m) => m.seq_id === "leaf-1" && m.type === "leaf");
    const mutAtPos3 = leaf1Mutations.find((m) => m.position === 3);
    expect(mutAtPos3.surprise_mutsel).toBeUndefined();
    expect(mutAtPos3.region).toBeUndefined();
  });

  it("mutation records include per-site fields when nodes have mutations array", () => {
    const treeWithMutations = {
      ...mockTree,
      nodes: mockTree.nodes.map((node) => {
        if (node.sequence_id === "leaf-1") {
          return {
            ...node,
            mutations: [
              {
                site: 3,
                parent_aa: "L",
                child_aa: "I",
                surprise_mutsel: 7.2,
                surprise_neutral: 3.1,
                selection_contribution: 4.1,
                region: "CDR2"
              }
            ]
          };
        }
        return node;
      })
    };
    const result = computeTreeData(treeWithMutations);
    const leaf1Mutations = result.tips_alignment.filter((m) => m.seq_id === "leaf-1" && m.type === "leaf");
    const mutAtPos3 = leaf1Mutations.find((m) => m.position === 3);
    expect(mutAtPos3.surprise_mutsel).toBe(7.2);
    expect(mutAtPos3.surprise_neutral).toBe(3.1);
    expect(mutAtPos3.selection_contribution).toBe(4.1);
    expect(mutAtPos3.region).toBe("CDR2");
  });

  describe("subtree ordering aggregates (#331)", () => {
    it("computes leaf count / max leaf depth / total multiplicity for a simple tree", () => {
      const result = computeTreeData(mockTree);
      const byId = Object.fromEntries(result.nodes.map((n) => [n.sequence_id, n]));

      // inferred_naive -> internal-1 -> {leaf-1 (mult 2), leaf-2 (mult 1)}, both leaves at depth 2
      expect(byId["leaf-1"].subtree_leaf_count).toBe(1);
      expect(byId["leaf-1"].subtree_max_leaf_depth).toBe(2);
      expect(byId["leaf-1"].subtree_total_multiplicity).toBe(2);

      expect(byId["internal-1"].subtree_leaf_count).toBe(2);
      expect(byId["internal-1"].subtree_max_leaf_depth).toBe(2);
      expect(byId["internal-1"].subtree_total_multiplicity).toBe(3);

      expect(byId["inferred_naive"].subtree_leaf_count).toBe(2);
      expect(byId["inferred_naive"].subtree_max_leaf_depth).toBe(2);
      expect(byId["inferred_naive"].subtree_total_multiplicity).toBe(3);

      // input_order_index mirrors the (post-normalization) array position
      expect(byId["inferred_naive"].input_order_index).toBe(0);
      expect(byId["internal-1"].input_order_index).toBe(1);
      expect(byId["leaf-1"].input_order_index).toBe(2);
      expect(byId["leaf-2"].input_order_index).toBe(3);
    });

    it("distinguishes leaf count, max leaf depth, and multiplicity across asymmetric siblings", () => {
      // root -> A (leaf, mult 10, depth 1)
      //      -> B -> B1 -> B1a (leaf, mult 1, depth 3)
      //           -> B2 (leaf, mult 1, depth 2)
      const asymmetricTree = {
        ident: "tree-asym",
        nodes: [
          { sequence_id: "root", type: "root", parent: null, sequence_alignment_aa: "MKVL" },
          { sequence_id: "A", type: "leaf", parent: "root", sequence_alignment_aa: "MKVL", multiplicity: 10 },
          { sequence_id: "B", type: "internal", parent: "root", sequence_alignment_aa: "MKVL" },
          { sequence_id: "B1", type: "internal", parent: "B", sequence_alignment_aa: "MKVL" },
          { sequence_id: "B1a", type: "leaf", parent: "B1", sequence_alignment_aa: "MKVL", multiplicity: 1 },
          { sequence_id: "B2", type: "leaf", parent: "B", sequence_alignment_aa: "MKVL", multiplicity: 1 }
        ]
      };
      const result = computeTreeData(asymmetricTree);
      const byId = Object.fromEntries(result.nodes.map((n) => [n.sequence_id, n]));

      // A: single leaf, shallow, but high multiplicity
      expect(byId["A"]).toMatchObject({
        subtree_leaf_count: 1,
        subtree_max_leaf_depth: 1,
        subtree_total_multiplicity: 10
      });
      // B: two leaves, deeper, but lower total multiplicity than A
      expect(byId["B"]).toMatchObject({
        subtree_leaf_count: 2,
        subtree_max_leaf_depth: 3,
        subtree_total_multiplicity: 2
      });
      // By leaf count or multiplicity B and A would order one way; by max leaf
      // depth the other way — confirms the three metrics are independent.
      expect(byId["B"].subtree_leaf_count).toBeGreaterThan(byId["A"].subtree_leaf_count);
      expect(byId["B"].subtree_max_leaf_depth).toBeGreaterThan(byId["A"].subtree_max_leaf_depth);
      expect(byId["B"].subtree_total_multiplicity).toBeLessThan(byId["A"].subtree_total_multiplicity);
    });
  });
});

describe("computeLineageDataWithOptions", () => {
  it("returns empty object for null tree", () => {
    expect(computeLineageDataWithOptions(null, {}, false)).toEqual({});
  });

  it("returns tree unchanged when seq is empty", () => {
    const result = computeLineageDataWithOptions(mockTree, {}, false);
    expect(result.lineage_alignment).toBeUndefined();
  });

  it("computes lineage alignment for a leaf", () => {
    const leaf = mockTreeNodes.find((n) => n.sequence_id === "leaf-1");
    const result = computeLineageDataWithOptions(mockTree, leaf, false);
    expect(result.lineage_alignment).toBeDefined();
    expect(result.lineage_seq_counter).toBeGreaterThanOrEqual(2); // at least naive + leaf
  });

  it("includes all nodes when includeAllNodes is true", () => {
    const leaf = mockTreeNodes.find((n) => n.sequence_id === "leaf-1");
    const resultAll = computeLineageDataWithOptions(mockTree, leaf, true);
    const resultFiltered = computeLineageDataWithOptions(mockTree, leaf, false);
    // includeAllNodes should include internal nodes regardless of mutations
    expect(resultAll.lineage_seq_counter).toBeGreaterThanOrEqual(resultFiltered.lineage_seq_counter);
  });

  it("produces download lineage sequences", () => {
    const leaf = mockTreeNodes.find((n) => n.sequence_id === "leaf-1");
    const result = computeLineageDataWithOptions(mockTree, leaf, false);
    expect(result.download_lineage_seqs).toBeDefined();
    // First should be naive, last should be the leaf
    expect(result.download_lineage_seqs[0].type).toBe("root");
    expect(result.download_lineage_seqs[result.download_lineage_seqs.length - 1].sequence_id).toBe("leaf-1");
  });
});
