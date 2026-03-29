/**
 * Default field options for visualization dropdowns.
 * Used as fallback when field_metadata is not provided in the dataset.
 */

// Scatterplot — clone-level fields
export const DEFAULT_CLONE_CONTINUOUS = ["unique_seqs_count", "mean_mut_freq", "junction_length"];
export const DEFAULT_CLONE_CATEGORICAL = [
  "subject_id",
  "sample.timepoint_id",
  "v_call",
  "d_call",
  "j_call",
  "has_seed",
  "sample.locus",
  "dataset_name"
];

// Tree — node-level fields for leaf sizing
export const DEFAULT_LEAF_SIZE_OPTIONS = [
  "<none>",
  "multiplicity",
  "cluster_multiplicity",
  "affinity",
  "scaled_affinity"
];

// Tree — branch-level fields for width and color
export const DEFAULT_BRANCH_WIDTH_OPTIONS = ["<none>", "lbr", "lbi"];
export const DEFAULT_BRANCH_COLOR_OPTIONS = ["<none>", "lbr", "lbi", "parent"];
