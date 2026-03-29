/**
 * Default field options for visualization dropdowns and tooltips.
 * Used as fallback when field_metadata is not provided in the dataset.
 *
 * field_metadata types:
 *   "continuous"  — numeric fields for x/y axes, size dropdowns + tooltip
 *   "categorical" — string fields for color/shape/facet dropdowns + tooltip
 *   "tooltip"     — tooltip display only, not shown in any dropdown
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

/**
 * Default tooltip field metadata for the scatterplot.
 * All continuous and categorical fields are included automatically;
 * these are additional tooltip-only fields with custom formatting.
 */
export const DEFAULT_CLONE_TOOLTIP = [
  { field: "clone_id", label: "Clone ID" },
  { field: "dataset_name", label: "Dataset" },
  { field: "sample.sample_id", label: "Sample", expr: "datum.sample ? datum.sample.sample_id : ''" },
  { field: "subject_id", label: "Subject" },
  { field: "sample.locus", label: "Locus", expr: "datum.sample ? datum.sample.locus : ''" },
  { field: "unique_seqs_count", label: "Unique Sequences" },
  { field: "mean_mut_freq", label: "Mean Mutation Freq", format: ".3f" },
  { field: "junction_length", label: "Junction Length" },
  { field: "v_call", label: "V Gene" },
  { field: "j_call", label: "J Gene" },
  { field: "has_seed", label: "Has Seed", expr: "datum.has_seed ? 'Yes' : 'No'" }
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
