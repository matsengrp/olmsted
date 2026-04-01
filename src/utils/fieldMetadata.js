import {
  DEFAULT_CLONE_FIELDS,
  DEFAULT_NODE_FIELDS,
  DEFAULT_BRANCH_FIELDS,
  DEFAULT_MUTATION_FIELDS,
  BUILTIN_CLONE_FIELDS,
  BUILTIN_NODE_FIELDS,
  BUILTIN_BRANCH_FIELDS,
  BUILTIN_MUTATION_FIELDS
} from "../constants/fieldDefaults";

/**
 * Resolve field_metadata for a dataset. When field_metadata is provided by the CLI,
 * merge in built-in fields. When absent, build default metadata from constants.
 * All downstream code reads a uniform { clone, node, branch, mutation } structure.
 *
 * Builtins are spread first so they appear first in iteration order (tooltip ordering).
 * CLI/default fields spread on top, so they override builtin labels if redeclared.
 * Accepts "family" as alias for "clone" level.
 *
 * @param {Object|null} rawMetadata - field_metadata from dataset or null
 * @returns {Object} Resolved field_metadata with clone, node, branch, mutation levels
 */
export function resolveFieldMetadata(rawMetadata) {
  const raw = rawMetadata || {};
  const hasMetadata = !!rawMetadata;

  // Builtins first (for ordering), then defaults or CLI fields on top (override labels)
  const clone = { ...BUILTIN_CLONE_FIELDS, ...(hasMetadata ? raw.clone || raw.family || {} : DEFAULT_CLONE_FIELDS) };
  const node = { ...BUILTIN_NODE_FIELDS, ...(hasMetadata ? raw.node || {} : DEFAULT_NODE_FIELDS) };
  const branch = { ...BUILTIN_BRANCH_FIELDS, ...(hasMetadata ? raw.branch || {} : DEFAULT_BRANCH_FIELDS) };
  const mutation = { ...BUILTIN_MUTATION_FIELDS, ...(hasMetadata ? raw.mutation || {} : DEFAULT_MUTATION_FIELDS) };

  return { clone, node, branch, mutation };
}

/**
 * Build a Vega tooltip expression string from an array of field descriptors.
 * Shared by scatterplot and tree tooltip builders.
 *
 * Each field descriptor can have:
 * - field: data field name (supports dot notation for nested access)
 * - label: display label in the tooltip
 * - format: optional d3-format string (e.g., ".3f")
 * - expr: optional custom Vega expression (overrides default accessor)
 *
 * @param {Object[]} fields - Array of { field, label, format?, expr? }
 * @param {Object} [options] - Configuration options
 * @param {string} [options.nullFallback] - Value shown for null fields (default: no fallback)
 * @param {string} [options.quoteStyle="double"] - Quote style: "single" or "double"
 * @returns {string} Vega expression string for the tooltip signal
 */
export function buildVegaTooltipExpr(fields, options = {}) {
  const { nullFallback = null, quoteStyle = "double" } = options;
  const q = quoteStyle === "single" ? "'" : '"';

  const parts = fields.map((f) => {
    const label = quoteStyle === "single" ? f.label.replace(/'/g, "\\'") : f.label.replace(/"/g, '\\"');

    // Custom expression takes precedence
    if (f.expr) {
      return `${q}${label}${q}: ${f.expr}`;
    }

    // Build field accessor (supports dot notation for nested fields)
    let accessor;
    if (f.field.includes(".")) {
      const [parent, child] = f.field.split(".");
      accessor = `datum[${q}${parent}${q}] ? datum[${q}${parent}${q}][${q}${child}${q}] : ${q}${q}`;
    } else {
      accessor = `datum[${q}${f.field}${q}]`;
    }

    // Apply format if specified
    if (f.format) {
      accessor = `format(${accessor}, ${q}${f.format}${q})`;
    }

    // Wrap with null check if fallback specified
    if (nullFallback) {
      const rawAccessor = `datum[${q}${f.field}${q}]`;
      return `${q}${label}${q}: ${rawAccessor} != null ? ${accessor} : ${q}${nullFallback}${q}`;
    }

    return `${q}${label}${q}: ${accessor}`;
  });

  return "{" + parts.join(", ") + "}";
}
