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
      } catch (parseError) {
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
      name: data.metadata?.name || filename, // Use metadata name if available, otherwise filename
      build: dataset.build || {
        time: data.metadata?.created_at || new Date().toISOString(),
        commit: "client-side-processing"
      }
    };

    // CRITICAL: In consolidated format, trees are in data.trees (top-level), not embedded in clones
    // Process trees from top-level trees array (these have nodes)
    const processedTrees = (data.trees || []).map((tree) => {
      // Convert nodes array to object indexed by sequence_id if needed
      let processedNodes = tree.nodes;
      if (tree.nodes && Array.isArray(tree.nodes)) {
        processedNodes = {};
        tree.nodes.forEach((node, nodeIndex) => {
          const nodeId = node.sequence_id || String(nodeIndex);
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

    // Process clones (tree references already exist, don't extract trees from clones)
    const processedClones = datasetClones.map((clone) => {
      return {
        ...clone,
        dataset_id: datasetId,
        ident: clone.ident || this.generateUUID()
      };
    });

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
