/**
 * Default field options for visualization dropdowns and tooltips.
 * Used as fallback when field_metadata is not provided in the dataset.
 * These are intentionally minimal — olmsted-cli can enrich older files
 * with full field_metadata via the enrichment command.
 *
 * field_metadata types (data shape):
 *   "continuous"  — numeric values
 *   "categorical" — string/enum values
 *   "aa"          — amino acid character
 *   "dna"         — nucleotide character
 *   "list"        — ordered array
 *   "json"        — structured key-value data
 *
 * field_metadata display modes (UI behavior):
 *   "dropdown" — shown in visualization controls + tooltip
 *   "tooltip"  — shown on hover only
 *   "skip"     — excluded from display entirely
 */

/**
 * Default display mode for fields without an explicit display property.
 * Fields without display are skipped — olmsted-cli sets display explicitly.
 */
export const DEFAULT_DISPLAY = "skip";

/**
 * Built-in clone fields — always present regardless of field_metadata.
 * Labels are overrideable by metadata.
 */
export const BUILTIN_CLONE_TOOLTIP = [
  { field: "clone_id", label: "Clone ID", display: "tooltip" },
  { field: "dataset_name", label: "Dataset", display: "tooltip", expr: "datum.dataset_name || ''" }
];

export const BUILTIN_CLONE_CATEGORICAL = [{ field: "dataset_name", label: "Dataset" }];

// Scatterplot — clone-level fallback fields
export const DEFAULT_CLONE_CONTINUOUS = ["unique_seqs_count", "mean_mut_freq"];
export const DEFAULT_CLONE_CATEGORICAL = ["v_call", "d_call", "j_call", "subject_id", "dataset_name"];

/**
 * Default tooltip for scatterplot hover (fallback when no field_metadata).
 */
export const DEFAULT_CLONE_TOOLTIP = [
  { field: "clone_id", label: "Clone ID" },
  { field: "dataset_name", label: "Dataset" },
  { field: "unique_seqs_count", label: "Unique Sequences" },
  { field: "mean_mut_freq", label: "Mean Mutation Freq", format: ".3f" },
  { field: "v_call", label: "V Gene" },
  { field: "d_call", label: "D Gene" },
  { field: "j_call", label: "J Gene" }
];

// Tree — fallback leaf size options (none + multiplicity for pre-metadata datasets)
export const DEFAULT_LEAF_SIZE_OPTIONS = ["<none>", "multiplicity"];

/**
 * Default tooltip for tree node hover (structural fields only).
 */
export const DEFAULT_NODE_TOOLTIP = [
  { field: "sequence_id", label: "Sequence ID" },
  { field: "parent", label: "Parent ID" },
  { field: "type", label: "Node Type" },
  { field: "distance", label: "Distance" },
  { field: "node_depth", label: "Depth" }
];

/**
 * Default tooltip for mutation hover (structural fields only).
 */
export const DEFAULT_MUTATION_TOOLTIP = [
  { field: "position", label: "Position", format: "" },
  { field: "seq_id", label: "Sequence" },
  { field: "mut_from", label: "From" },
  { field: "mut_to", label: "To" }
];

/**
 * Built-in mutation color option — always available as the default AA coloring.
 * Used when field_metadata.mutation has no "aa" type entries.
 */
export const BUILTIN_MUTATION_AA = { value: "child_aa", label: "Child Amino Acid", scaleType: "aa" };

// Tree — fallback branch options (just none + parent when no metadata)
export const DEFAULT_BRANCH_WIDTH_OPTIONS = ["<none>"];
export const DEFAULT_BRANCH_COLOR_OPTIONS = ["<none>", "parent"];
