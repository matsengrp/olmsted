import { gunzipSync, strFromU8 } from "fflate";
import { detectFieldPresence, applyNodeDefaults, applyCloneDefaults, extractGermlineFromTree } from "./fieldDefaults";

/**
 * File processor for olmsted-cli consolidated format JSON files
 * Processes pre-processed consolidated format files for client-side storage.
 * Accepts .json and .json.gz inputs; .gz payloads are decompressed in-browser
 * via fflate before JSON parsing.
 */

class FileProcessor {
  /**
   * Process an olmsted-cli consolidated format JSON file (.json or .json.gz)
   * @param {File} file - The uploaded JSON file (must be olmsted-cli consolidated format)
   * @returns {Promise<Object>} Processed data structure
   */
  static async processFile(file) {
    try {
      let content;
      let dataSize;
      if (file.name.endsWith(".gz")) {
        const { text, byteLength } = await this.readGzFile(file);
        content = text;
        dataSize = byteLength;
      } else {
        content = await this.readFile(file);
        dataSize = file.size;
      }

      let data;
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

      // dataSize reflects the decompressed payload — what's actually loaded
      // into memory and IndexedDB — not the on-disk compressed size.
      return { ...this.processConsolidatedFormat(data, file.name), dataSize };
    } catch (error) {
      throw new Error(`Failed to process file: ${error.message}`);
    }
  }

  /**
   * Read a gzipped file and return both its decompressed text contents and
   * the decompressed byte count (so callers can report the real payload size
   * rather than the compressed on-disk size).
   * @param {File} file
   * @returns {Promise<{ text: string, byteLength: number }>}
   */
  static async readGzFile(file) {
    const buffer = await this.readFileAsArrayBuffer(file);
    let decompressed;
    try {
      decompressed = gunzipSync(new Uint8Array(buffer));
    } catch (err) {
      throw new Error(`Failed to decompress gzipped file: ${err.message}`);
    }
    return { text: strFromU8(decompressed), byteLength: decompressed.length };
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
      schema_version: data.metadata?.schema_version || null,
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
   * Read file content as an ArrayBuffer (used for gzipped inputs).
   * @param {File} file - File to read
   * @returns {Promise<ArrayBuffer>}
   */
  static readFileAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = () => reject(new Error("File reading failed"));
      reader.readAsArrayBuffer(file);
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
