/**
 * Minimal mock data for Vega spec runtime tests.
 *
 * These fixtures provide just enough data for vega.View to run
 * each spec without errors, validating that transforms, signals,
 * and scales work with real data shapes.
 */

// --- naive.js: gene region bars ---
export const naiveSourceData = [
  { region: "CDR1", start: 75, end: 99, gene: "IGHV1-2*02", family: "fam-1" },
  { region: "CDR2", start: 150, end: 174, gene: "IGHV1-2*02", family: "fam-1" },
  { region: "CDR3", start: 288, end: 330, gene: "IGHJ4*02", family: "fam-1" },
  { region: "Sequence", start: 0, end: 350, gene: "IGHV1-2*02", family: "fam-1" }
];

// --- facetScatterPlot.js: clonal families scatterplot ---
export const scatterplotSourceData = [
  {
    ident: "clone-1",
    unique_seqs_count: 10,
    mean_mut_freq: 0.05,
    junction_length: 48,
    has_seed: true,
    subject_id: "subject-1",
    v_call: "IGHV1-2*02",
    d_call: "IGHD3-10*01",
    j_call: "IGHJ4*02",
    dataset_id: "dataset-1",
    sample: { timepoint_id: "day-0", locus: "IGH" },
    dataset: { dataset_id: "dataset-1" }
  },
  {
    ident: "clone-2",
    unique_seqs_count: 5,
    mean_mut_freq: 0.12,
    junction_length: 42,
    has_seed: false,
    subject_id: "subject-1",
    v_call: "IGHV3-30*01",
    d_call: "IGHD2-2*01",
    j_call: "IGHJ6*02",
    dataset_id: "dataset-1",
    sample: { timepoint_id: "day-7", locus: "IGH" },
    dataset: { dataset_id: "dataset-1" }
  }
];

export const scatterplotDatasetsData = [
  { dataset_id: "dataset-1", name: "Test Dataset" }
];

// --- clonalFamilyDetails.js: tree + alignment ---

// Minimal tree: naive → root → leaf1, leaf2
export const treeNodesData = [
  {
    sequence_id: "naive",
    parent: null,
    type: "naive",
    distance: 0,
    lbi: 0,
    lbr: 0
  },
  {
    sequence_id: "root",
    parent: "naive",
    type: "root",
    distance: 0.01,
    lbi: 0.5,
    lbr: 1.0
  },
  {
    sequence_id: "leaf-1",
    parent: "root",
    type: "leaf",
    distance: 0.05,
    multiplicity: 3,
    cluster_multiplicity: 3,
    affinity: 0.8,
    timepoint_multiplicities: [
      { timepoint_id: "day-0", multiplicity: 2 },
      { timepoint_id: "day-7", multiplicity: 1 }
    ]
  },
  {
    sequence_id: "leaf-2",
    parent: "root",
    type: "leaf",
    distance: 0.08,
    multiplicity: 1,
    cluster_multiplicity: 1,
    affinity: 0.6,
    timepoint_multiplicities: [
      { timepoint_id: "day-0", multiplicity: 1 }
    ]
  }
];

// Alignment mutations data (one row per position per sequence)
export const treeAlignmentData = [
  { seq_id: "naive", position: 10, mut_to: "A", type: "naive" },
  { seq_id: "naive", position: 20, mut_to: "G", type: "naive" },
  { seq_id: "leaf-1", position: 10, mut_to: "T", type: "leaf" },
  { seq_id: "leaf-1", position: 20, mut_to: "G", type: "leaf" },
  { seq_id: "leaf-2", position: 10, mut_to: "A", type: "leaf" },
  { seq_id: "leaf-2", position: 20, mut_to: "C", type: "leaf" }
];

export const naiveGeneRegionData = [
  { region: "CDR1", start: 75, end: 99, gene: "IGHV1-2*02", family: "fam-1" },
  { region: "CDR2", start: 150, end: 174, gene: "IGHV1-2*02", family: "fam-1" },
  { region: "CDR3", start: 288, end: 330, gene: "IGHJ4*02", family: "fam-1" },
  { region: "Sequence", start: 0, end: 350, gene: "IGHV1-2*02", family: "fam-1" }
];

export const cdrBoundsData = [
  { x: 25 },
  { x: 33 },
  { x: 50 },
  { x: 58 },
  { x: 96 },
  { x: 110 }
];

// leaves_count_incl_naive is passed as a dataset with a single record
// The signal reads: data("leaves_count_incl_naive")[0].data
export const leavesCountData = [{ data: 3 }];

export const seedData = [{ id: "leaf-1" }];
