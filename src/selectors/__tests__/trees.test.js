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

  it("alignment includes naive entries for every position", () => {
    const result = computeTreeData(mockTree);
    const naiveEntries = result.tips_alignment.filter((m) => m.type === "naive");
    // naive seq is "MKVL" = 4 chars, so 4 naive entries
    expect(naiveEntries).toHaveLength(4);
  });

  it("alignment includes mutations for leaf nodes", () => {
    const result = computeTreeData(mockTree);
    // leaf-1 has "MKVI" vs naive "MKVL" — differs at position 3
    const leaf1Mutations = result.tips_alignment.filter((m) => m.seq_id === "leaf-1" && m.type === "leaf");
    expect(leaf1Mutations.length).toBeGreaterThanOrEqual(1);
    const mutAtPos3 = leaf1Mutations.find((m) => m.position === 3);
    expect(mutAtPos3).toBeDefined();
    expect(mutAtPos3.mut_from).toBe("L");
    expect(mutAtPos3.mut_to).toBe("I");
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
