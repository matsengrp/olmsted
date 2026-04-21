/**
 * Default and built-in field metadata for each visualization level.
 *
 * DEFAULTS: Used as fallback when field_metadata is not provided by the CLI.
 * BUILTINS: Always injected regardless of field_metadata (structural fields
 *           computed by the web app, not declared by the CLI).
 *
 * Each entry has: { type, display, label, format?, expr? }
 *
 * Types (data shape): continuous, categorical, aa, dna, list, json
 * Display modes (UI): dropdown, tooltip, skip
 */

/**
 * Default display mode for fields without an explicit display property.
 * Fields without display are skipped — olmsted-cli sets display explicitly.
 */
export const DEFAULT_DISPLAY = "skip";

/** Icon rendered next to a field label based on its display mode. */
export const DISPLAY_MODE_ICONS = {
  dropdown: "🟢",
  tooltip: "🟡",
  skip: "🔴"
};

// ============================================================
// Clone / Family level
// ============================================================

/** Defaults for clone-level fields (used when no field_metadata.clone exists) */
export const DEFAULT_CLONE_FIELDS = {
  unique_seqs_count: { type: "continuous", display: "dropdown", label: "Unique Sequences" },
  mean_mut_freq: { type: "continuous", display: "dropdown", label: "Mean Mutation Freq", format: ".3f" },
  v_call: { type: "categorical", display: "dropdown", label: "V Gene" },
  d_call: { type: "categorical", display: "dropdown", label: "D Gene" },
  j_call: { type: "categorical", display: "dropdown", label: "J Gene" },
  subject_id: { type: "categorical", display: "dropdown", label: "Subject" }
};

/** Built-in clone fields — always present regardless of metadata */
export const BUILTIN_CLONE_FIELDS = {
  clone_id: { type: "categorical", display: "tooltip", label: "Clone ID" },
  dataset_name: { type: "categorical", display: "dropdown", label: "Dataset", expr: "datum.dataset_name || ''" }
};

// ============================================================
// Node level
// ============================================================

/** Defaults for node-level fields (used when no field_metadata.node exists) */
export const DEFAULT_NODE_FIELDS = {
  multiplicity: { type: "continuous", display: "dropdown", label: "Multiplicity" }
};

/** Built-in node fields — always present (structural, computed by web app) */
export const BUILTIN_NODE_FIELDS = {
  sequence_id: { type: "categorical", display: "tooltip", label: "Sequence ID" },
  parent: { type: "categorical", display: "tooltip", label: "Parent ID" },
  type: { type: "categorical", display: "tooltip", label: "Node Type" },
  distance: { type: "continuous", display: "tooltip", label: "Distance" },
  node_depth: { type: "continuous", display: "tooltip", label: "Depth" }
};

// ============================================================
// Branch level
// ============================================================

/** Defaults for branch-level fields (used when no field_metadata.branch exists) */
export const DEFAULT_BRANCH_FIELDS = {};

/** Built-in branch fields — none currently (parent coloring is always appended by spec) */
export const BUILTIN_BRANCH_FIELDS = {};

// ============================================================
// Mutation level
// ============================================================

/** Defaults for mutation-level fields (used when no field_metadata.mutation exists) */
export const DEFAULT_MUTATION_FIELDS = {};

/** Built-in mutation fields — child_aa always available as default AA coloring */
export const BUILTIN_MUTATION_FIELDS = {
  child_aa: { type: "aa", display: "dropdown", label: "Child Amino Acid" }
};
