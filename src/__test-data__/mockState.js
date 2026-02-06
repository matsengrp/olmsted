/**
 * Shared mock data for tests
 */

export const mockDataset = {
  dataset_id: "dataset-1",
  name: "Test Dataset",
  clone_count: 3,
  subjects_count: 1,
  loading: "DONE",
  build: { time: "2024-01-01", commit: "abc123" }
};

export const mockDataset2 = {
  dataset_id: "dataset-2",
  name: "Test Dataset 2",
  clone_count: 2,
  subjects_count: 1,
  loading: "DONE",
  build: { time: "2024-01-02", commit: "def456" }
};

export const mockFamily1 = {
  ident: "family-1",
  dataset_id: "dataset-1",
  clone_id: "clone-1",
  unique_seqs_count: 10,
  mean_mut_freq: 0.05,
  has_seed: true,
  sample: { locus: "IGH", subject_id: "subject-1" },
  trees: {
    "tree-1": { ident: "tree-1", downsampling_strategy: "seed_lineage" },
    "tree-2": { ident: "tree-2", downsampling_strategy: "min_adcl" }
  }
};

export const mockFamily2 = {
  ident: "family-2",
  dataset_id: "dataset-1",
  clone_id: "clone-2",
  unique_seqs_count: 5,
  mean_mut_freq: 0.12,
  has_seed: false,
  sample: { locus: "IGK", subject_id: "subject-1" },
  trees: {
    "tree-3": { ident: "tree-3", downsampling_strategy: "min_adcl" }
  }
};

export const mockFamily3 = {
  ident: "family-3",
  dataset_id: "dataset-1",
  clone_id: "clone-3",
  unique_seqs_count: 20,
  mean_mut_freq: 0.02,
  has_seed: true,
  sample: { locus: "IGH", subject_id: "subject-2" },
  is_paired: true,
  pair_id: "pair-1",
  trees: {
    "tree-4": { ident: "tree-4", downsampling_strategy: "seed_lineage" }
  }
};

export const mockPairedFamily = {
  ident: "family-4",
  dataset_id: "dataset-1",
  clone_id: "clone-4",
  unique_seqs_count: 15,
  mean_mut_freq: 0.03,
  has_seed: true,
  sample: { locus: "IGL", subject_id: "subject-2" },
  is_paired: true,
  pair_id: "pair-1",
  trees: {
    "tree-5": { ident: "tree-5", downsampling_strategy: "seed_lineage" }
  }
};

export const mockTreeNodes = [
  {
    sequence_id: "inferred_naive",
    type: "root",
    parent: null,
    sequence_alignment: "ATCGATCG",
    sequence_alignment_aa: "MKVL"
  },
  {
    sequence_id: "internal-1",
    type: "internal",
    parent: "inferred_naive",
    sequence_alignment: "ATCGATCG",
    sequence_alignment_aa: "MKVL",
    lbr: 0.5
  },
  {
    sequence_id: "leaf-1",
    type: "leaf",
    parent: "internal-1",
    sequence_alignment: "ATCGATCC",
    sequence_alignment_aa: "MKVI",
    lbr: 0.3,
    multiplicity: 2
  },
  {
    sequence_id: "leaf-2",
    type: "leaf",
    parent: "internal-1",
    sequence_alignment: "ATCAATCG",
    sequence_alignment_aa: "MKVV",
    lbr: 0.7,
    multiplicity: 1
  }
];

export const mockTree = {
  ident: "tree-1",
  newick: "((leaf-1,leaf-2)internal-1)inferred_naive;",
  nodes: mockTreeNodes
};

export const mockConfig = {
  id: "config-1",
  name: "Test Config",
  version: "1.2",
  createdAt: 1700000000000,
  updatedAt: 1700000000000,
  settings: {
    scatterplot: {
      xField: "unique_seqs_count",
      yField: "mean_mut_freq"
    },
    tree: {
      show_labels: true
    },
    global: {
      filters: {},
      selectedChain: "heavy"
    },
    lineage: {
      showEntire: false,
      showBorders: false,
      chain: "heavy"
    }
  }
};
