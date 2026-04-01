import { detectFieldPresence, applyNodeDefaults, applyCloneDefaults, extractGermlineFromTree } from "./fieldDefaults";
import {
  DEFAULT_CLONE_CONTINUOUS,
  DEFAULT_CLONE_CATEGORICAL,
  DEFAULT_CLONE_TOOLTIP,
  BUILTIN_CLONE_TOOLTIP,
  BUILTIN_CLONE_CATEGORICAL,
  BUILTIN_MUTATION_AA
} from "../constants/fieldDefaults";

/**
 * Inject built-in clone fields (categoricals and tooltip) into a clone metadata object.
 * When a CATEGORICAL builtin is added and a matching TOOLTIP builtin has an expr,
 * the expr is included so tooltip rendering works correctly.
 *
 * @param {Object} clone - Mutable clone metadata object to inject into
 */
function injectCloneBuiltins(clone) {
  // Build a lookup from TOOLTIP builtins for expr fallback
  const tooltipByField = {};
  for (const builtin of BUILTIN_CLONE_TOOLTIP) {
    tooltipByField[builtin.field] = builtin;
  }

  // Ensure built-in categoricals are present
  for (const builtin of BUILTIN_CLONE_CATEGORICAL) {
    if (!(builtin.field in clone)) {
      const entry = { type: "categorical", display: "dropdown", label: builtin.label };
      // Include expr from tooltip builtin if available (needed for tooltip rendering)
      if (tooltipByField[builtin.field]?.expr) {
        entry.expr = tooltipByField[builtin.field].expr;
      }
      clone[builtin.field] = entry;
    }
  }

  // Ensure built-in tooltip fields are present
  for (const builtin of BUILTIN_CLONE_TOOLTIP) {
    if (!(builtin.field in clone)) {
      clone[builtin.field] = { type: "categorical", display: "tooltip", label: builtin.label };
      if (builtin.expr) {
        clone[builtin.field].expr = builtin.expr;
      }
    }
  }
}

/**
 * Resolve field_metadata for a dataset. When field_metadata is provided by the CLI,
 * merge in built-in fields (dataset_name, child_aa). When absent, build a default
 * metadata object from constants so all downstream code reads a uniform structure.
 *
 * @param {Object|null} rawMetadata - field_metadata from dataset or null
 * @returns {Object} Resolved field_metadata with clone, node, branch, mutation levels
 */
export function resolveFieldMetadata(rawMetadata) {
  if (rawMetadata) {
    // Accept "family" as alias for "clone" level
    const clone = { ...(rawMetadata.clone || rawMetadata.family || {}) };

    injectCloneBuiltins(clone);

    // Ensure mutation has at least the built-in AA option
    const mutation = { ...(rawMetadata.mutation || {}) };
    const hasAa = Object.values(mutation).some((m) => m.type === "aa");
    if (!hasAa) {
      mutation[BUILTIN_MUTATION_AA.value] = { type: "aa", display: "dropdown", label: BUILTIN_MUTATION_AA.label };
    }

    return {
      clone,
      node: rawMetadata.node || null,
      branch: rawMetadata.branch || null,
      mutation: Object.keys(mutation).length > 0 ? mutation : null
    };
  }

  // No metadata at all — build defaults
  const clone = {};
  for (const field of DEFAULT_CLONE_CONTINUOUS) {
    clone[field] = { type: "continuous", display: "dropdown", label: field };
  }
  for (const field of DEFAULT_CLONE_CATEGORICAL) {
    clone[field] = { type: "categorical", display: "dropdown", label: field };
  }
  for (const entry of DEFAULT_CLONE_TOOLTIP) {
    if (!(entry.field in clone)) {
      clone[entry.field] = {
        type: "categorical",
        display: "tooltip",
        label: entry.label,
        format: entry.format,
        expr: entry.expr
      };
    }
  }
  injectCloneBuiltins(clone);

  return {
    clone,
    node: null,
    branch: null,
    mutation: { [BUILTIN_MUTATION_AA.value]: { type: "aa", display: "dropdown", label: BUILTIN_MUTATION_AA.label } }
  };
}

/**
 * File processor for olmsted-cli consolidated format JSON files
 * Processes pre-processed consolidated format files for client-side storage
 */

class FileProcessor {
  /**
   * Process an olmsted-cli consolidated format JSON file
   * @param {File} file - The uploaded JSON file (must be olmsted-cli consolidated format)
   * @returns {Promise<Object>} Processed data structure
   */
  static async processFile(file) {
    try {
      const content = await this.readFile(file);
      let data;

      // Handle gzipped files
      if (file.name.endsWith(".gz")) {
        throw new Error("Gzipped files not yet supported in client-side processing");
      }

      try {
        data = JSON.parse(content);
      } catch {
        throw new Error("Invalid JSON format");
      }

      // Validate this is consolidated format
      if (!this.isConsolidatedFormat(data)) {
        throw new Error(
          "File is not in olmsted-cli consolidated format. Please process your data with olmsted-cli first."
        );
      }

      return this.processConsolidatedFormat(data, file.name);
    } catch (error) {
      throw new Error(`Failed to process file: ${error.message}`);
    }
  }

  /**
   * Check if data is in consolidated format
   * @param {Object} data - Parsed JSON data
   * @returns {boolean} Whether this is consolidated format
   */
  static isConsolidatedFormat(data) {
    return data && typeof data === "object" && data.metadata && data.datasets && data.clones && data.trees;
  }

  /**
   * Process consolidated format data
   * @param {Object} data - Consolidated format data
   * @param {string} filename - Original filename
   * @returns {Object} Processed data structure
   */
  static processConsolidatedFormat(data, filename) {
    // Validate structure
    if (!Array.isArray(data.datasets) || data.datasets.length === 0) {
      throw new Error("Consolidated format missing datasets array");
    }

    // Generate unique dataset ID for this session
    const datasetId = this.generateDatasetId();

    // Process the first dataset (typically consolidated format has one dataset)
    const dataset = data.datasets[0];

    // Get clones for this dataset
    const datasetClones = data.clones[dataset.dataset_id] || data.clones[Object.keys(data.clones)[0]] || [];

    // Process dataset metadata
    const processedDataset = {
      ...dataset,
      dataset_id: datasetId, // Use new temporary ID
      original_dataset_id: dataset.dataset_id,
      clone_count: datasetClones.length || dataset.clone_count || 0,
      subjects_count: dataset.subjects_count || 1,
      schema_version: data.metadata?.schema_version || "2.0.0",
      temporary: true,
      isClientSide: true,
      upload_time: new Date().toISOString(),
      original_filename: filename,
      format_type: "consolidated",
      metadata: data.metadata,
      name: dataset.name || data.metadata?.name || filename,
      description: dataset.description || data.metadata?.description || null,
      debug: dataset.debug || data.metadata?.debug || false,
      field_metadata: dataset.field_metadata || data.metadata?.field_metadata || null,
      build: dataset.build || {
        time: data.metadata?.created_at || new Date().toISOString(),
        commit: "client-side-processing"
      }
    };

    // Detect which optional fields are present before applying defaults
    const dataFields = detectFieldPresence(datasetClones, data.trees);

    // Build a flat list of missing/defaulted field names
    const missingFields = [];
    for (const [field, status] of Object.entries(dataFields.node)) {
      if (status.defaulted) missingFields.push(`node.${field}`);
    }
    for (const [field, status] of Object.entries(dataFields.clone)) {
      if (status.defaulted) missingFields.push(`clone.${field}`);
    }
    processedDataset.missing_fields = missingFields;

    // CRITICAL: In consolidated format, trees are in data.trees (top-level), not embedded in clones
    // Process trees from top-level trees array (these have nodes)
    let forestTreeCount = 0;
    const processedTrees = (data.trees || []).map((tree) => {
      let nodesList = tree.nodes;

      // Normalize to array for processing
      if (nodesList && !Array.isArray(nodesList)) {
        nodesList = Object.values(nodesList);
      }

      // Detect forest structure (multiple root nodes) for metadata
      if (nodesList) {
        const roots = nodesList.filter((n) => !n.parent);
        const sequencedRoots = roots.filter((n) => n.sequence_alignment);
        if (sequencedRoots.length > 1) {
          forestTreeCount++;
        }
      }

      // Convert nodes array to object indexed by sequence_id
      const processedNodes = {};
      if (nodesList) {
        nodesList.forEach((node, nodeIndex) => {
          const nodeId = node.sequence_id || String(nodeIndex);
          applyNodeDefaults(node);
          processedNodes[nodeId] = node;
        });
      }

      return {
        ...tree,
        nodes: processedNodes,
        dataset_id: datasetId,
        ident: tree.ident || this.generateUUID()
      };
    });

    // Process clones — apply defaults and extract germline from tree root if missing
    const processedClones = datasetClones.map((clone) => {
      const processed = {
        ...clone,
        dataset_id: datasetId,
        ident: clone.ident || this.generateUUID()
      };
      applyCloneDefaults(processed);
      extractGermlineFromTree(processed, processedTrees);
      return processed;
    });

    // If germline was extracted from tree roots, remove it from missing list
    if (missingFields.includes("clone.germline_alignment")) {
      const hasExtractedGermline = processedClones.some((c) => c.germline_alignment);
      if (hasExtractedGermline) {
        const idx = missingFields.indexOf("clone.germline_alignment");
        missingFields.splice(idx, 1);
      }
    }

    // Build data modifications after all mutations to missingFields are complete
    const dataModifications = [];
    if (missingFields.length > 0) {
      dataModifications.push({
        label: `Default values applied for ${missingFields.length} missing field(s)`,
        items: [...missingFields]
      });
    }
    if (forestTreeCount > 0) {
      dataModifications.push({
        label:
          `${forestTreeCount} tree(s) contain disconnected subtrees (forests). ` +
          `A synthetic root with consensus sequence will be created for visualization.`,
        items: []
      });
    }
    processedDataset.data_modifications = dataModifications;

    return {
      datasets: [processedDataset],
      clones: { [datasetId]: processedClones },
      trees: processedTrees,
      datasetId: datasetId
    };
  }

  /**
   * Read file content using FileReader API
   * @param {File} file - File to read
   * @returns {Promise<string>} File content as string
   */
  static readFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = () => reject(new Error("File reading failed"));
      reader.readAsText(file);
    });
  }

  /**
   * Generate a unique dataset ID
   * @returns {string} Dataset ID
   */
  static generateDatasetId() {
    return `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate a UUID v4
   * @returns {string} UUID string
   */
  static generateUUID() {
    // Use crypto.randomUUID if available (modern browsers)
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return crypto.randomUUID();
    }

    // Fallback UUID v4 generator
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      // eslint-disable-next-line no-bitwise
      const r = (Math.random() * 16) | 0;
      // eslint-disable-next-line no-bitwise
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}

export default FileProcessor;
