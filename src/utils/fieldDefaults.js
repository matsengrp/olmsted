import { ValidationError } from "./errors";

/**
 * Sentinel value indicating a field is required. If a field marked REQUIRED
 * is missing from imported data, applyNodeDefaults/applyCloneDefaults will
 * throw a ValidationError instead of silently defaulting.
 */
export const REQUIRED = Symbol("REQUIRED");

/**
 * Default values for optional node-level fields.
 * Fields set to REQUIRED will cause a ValidationError if missing.
 * Fields set to null will be present but empty in the data.
 */
export const NODE_FIELD_DEFAULTS = {
  distance: null,
  length: null,
  multiplicity: 1,
  cluster_multiplicity: 1,
  lbi: null,
  lbr: null,
  affinity: null,
  timepoint_multiplicities: []
};

/**
 * Default values for optional clone-level fields.
 */
export const CLONE_FIELD_DEFAULTS = {
  d_call: null,
  j_call: null,
  junction_start: null,
  junction_length: null,
  cdr1_alignment_start: null,
  cdr1_alignment_end: null,
  cdr2_alignment_start: null,
  cdr2_alignment_end: null,
  germline_alignment: null
};

/**
 * Fields to check for presence detection on nodes.
 * Includes fields from NODE_FIELD_DEFAULTS plus additional fields
 * that aren't defaulted but whose presence we want to track.
 */
const NODE_DETECTION_FIELDS = [...Object.keys(NODE_FIELD_DEFAULTS), "surprise_mutations"];

/**
 * Fields to check for presence detection on clones.
 */
const CLONE_DETECTION_FIELDS = Object.keys(CLONE_FIELD_DEFAULTS);

/**
 * Sample items from an array to check field presence.
 * Returns a Set of field names that are present in at least one sampled item.
 *
 * @param {Array} items - Array of objects to sample
 * @param {string[]} fieldNames - Fields to check
 * @param {number} [sampleSize=10] - Number of items to sample
 * @returns {Set<string>} Fields present in at least one sampled item
 */
function sampleFieldPresence(items, fieldNames, sampleSize = 10) {
  const presentFields = new Set();
  const sampled = items.slice(0, sampleSize);
  for (const item of sampled) {
    if (!item || typeof item !== "object") continue;
    for (const field of fieldNames) {
      if (Object.prototype.hasOwnProperty.call(item, field)) {
        presentFields.add(field);
      }
    }
  }
  return presentFields;
}

/**
 * Build a field status entry for the data_fields metadata.
 *
 * @param {boolean} isPresent - Whether the field was found in the raw data
 * @param {boolean} hasDefault - Whether a default was applied
 * @returns {{ present: boolean, defaulted: boolean }}
 */
function fieldStatus(isPresent, hasDefault) {
  return { present: isPresent, defaulted: !isPresent && hasDefault };
}

/**
 * Detect which optional fields are present in imported data.
 * Samples the first few clones and tree nodes to determine field availability.
 *
 * @param {Array} clones - Raw clone objects from the import
 * @param {Array} trees - Raw tree objects from the import (each with nodes array/object)
 * @returns {Object} data_fields metadata object with node and clone field status
 */
export function detectFieldPresence(clones, trees) {
  // Collect node samples from trees
  const nodeSamples = [];
  for (const tree of (trees || []).slice(0, 5)) {
    if (!tree || !tree.nodes) continue;
    const nodes = Array.isArray(tree.nodes) ? tree.nodes : Object.values(tree.nodes);
    nodeSamples.push(...nodes.slice(0, 10));
    if (nodeSamples.length >= 20) break;
  }

  const presentNodeFields = sampleFieldPresence(nodeSamples, NODE_DETECTION_FIELDS);
  const presentCloneFields = sampleFieldPresence(clones || [], CLONE_DETECTION_FIELDS);

  const nodeStatus = {};
  for (const field of NODE_DETECTION_FIELDS) {
    const isPresent = presentNodeFields.has(field);
    const hasDefault = field in NODE_FIELD_DEFAULTS;
    nodeStatus[field] = fieldStatus(isPresent, hasDefault);
  }

  const cloneStatus = {};
  for (const field of CLONE_DETECTION_FIELDS) {
    const isPresent = presentCloneFields.has(field);
    const hasDefault = field in CLONE_FIELD_DEFAULTS;
    cloneStatus[field] = fieldStatus(isPresent, hasDefault);
  }

  return { node: nodeStatus, clone: cloneStatus };
}

/**
 * Apply default values to a node object for any missing optional fields.
 * Throws ValidationError if a REQUIRED field is missing.
 *
 * @param {Object} node - Node object (mutated in place)
 * @returns {Object} The same node object with defaults applied
 */
export function applyNodeDefaults(node) {
  for (const [field, defaultValue] of Object.entries(NODE_FIELD_DEFAULTS)) {
    if (!Object.prototype.hasOwnProperty.call(node, field) || node[field] === undefined) {
      if (defaultValue === REQUIRED) {
        throw new ValidationError(`Required node field "${field}" is missing`, field);
      }
      node[field] = defaultValue;
    }
  }
  return node;
}

/**
 * Apply default values to a clone object for any missing optional fields.
 * Throws ValidationError if a REQUIRED field is missing.
 *
 * @param {Object} clone - Clone object (mutated in place)
 * @returns {Object} The same clone object with defaults applied
 */
export function applyCloneDefaults(clone) {
  for (const [field, defaultValue] of Object.entries(CLONE_FIELD_DEFAULTS)) {
    if (!Object.prototype.hasOwnProperty.call(clone, field) || clone[field] === undefined) {
      if (defaultValue === REQUIRED) {
        throw new ValidationError(`Required clone field "${field}" is missing`, field);
      }
      clone[field] = defaultValue;
    }
  }
  return clone;
}

/**
 * Extract germline_alignment from the root node of a clone's tree.
 * Surprise-format files store the germline as the root node's sequence,
 * rather than as a clone-level field.
 *
 * @param {Object} clone - Clone object (mutated in place if germline found)
 * @param {Array} trees - All processed tree objects
 * @returns {Object} The same clone object, potentially with germline_alignment set
 */
export function extractGermlineFromTree(clone, trees) {
  if (clone.germline_alignment) return clone;

  const cloneTree = (trees || []).find((t) => t.clone_id === clone.clone_id);
  if (!cloneTree || !cloneTree.nodes) return clone;

  const nodes = Array.isArray(cloneTree.nodes) ? cloneTree.nodes : Object.values(cloneTree.nodes);

  // Find root node with a non-empty sequence
  const rootNode = nodes.find((n) => n.type === "root" && n.sequence_alignment && n.sequence_alignment.length > 0);

  if (rootNode) {
    clone.germline_alignment = rootNode.sequence_alignment;
  }

  return clone;
}

/**
 * Build a human-readable summary of which field categories are missing.
 * Used for the import warning banner.
 *
 * @param {string[]} missingFields - Flat array of missing field names (e.g., ["node.lbi", "clone.d_call"])
 * @returns {string[]} Array of summary strings for missing categories
 */
export function getMissingFieldSummary(missingFields) {
  if (!missingFields || missingFields.length === 0) return [];

  const set = new Set(missingFields);
  const summary = [];

  const missingNodeMetrics = ["lbi", "lbr", "affinity"].filter((f) => set.has(`node.${f}`));
  if (missingNodeMetrics.length > 0) {
    summary.push(`Node metrics: ${missingNodeMetrics.join(", ")}`);
  }

  const missingNodeCounts = ["multiplicity", "cluster_multiplicity"].filter((f) => set.has(`node.${f}`));
  if (missingNodeCounts.length > 0) {
    summary.push(`Node counts: ${missingNodeCounts.join(", ")} (defaulted to 1)`);
  }

  if (set.has("node.distance")) {
    summary.push("Branch distances (defaulted to unit length)");
  }

  const missingCdr = ["cdr1_alignment_start", "cdr2_alignment_start", "junction_start"].filter((f) =>
    set.has(`clone.${f}`)
  );
  if (missingCdr.length > 0) {
    summary.push("CDR region positions");
  }

  if (set.has("clone.germline_alignment")) {
    summary.push("Germline alignment");
  }

  const missingGenes = ["d_call", "j_call"].filter((f) => set.has(`clone.${f}`));
  if (missingGenes.length > 0) {
    summary.push(`Gene calls: ${missingGenes.join(", ")}`);
  }

  return summary;
}
