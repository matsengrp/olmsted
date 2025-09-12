/**
 * Pure JavaScript AIRR data processor for client-side processing
 * Replaces server-side Python processing to keep user data in browser
 */

class AIRRProcessor {
  /**
   * Process an AIRR JSON file entirely client-side
   * @param {File} file - The uploaded AIRR JSON file
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

      // Check if this is consolidated format
      if (this.isConsolidatedFormat(data)) {
        return this.processConsolidatedFormat(data, file.name);
      }

      // Process as standard AIRR dataset
      return this.processDataset(data, file.name);
    } catch (error) {
      throw new Error(`Failed to process AIRR file: ${error.message}`);
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

    // First process trees - just add dataset_id, keep existing idents
    const processedTrees = (data.trees || []).map((tree, _index) => {
      // CRITICAL: Convert nodes array to object indexed by sequence_id if needed
      let processedNodes = tree.nodes;
      if (tree.nodes && Array.isArray(tree.nodes)) {
        processedNodes = {};
        tree.nodes.forEach((node, nodeIndex) => {
          // Use sequence_id as key, or fall back to index if not available
          const nodeId = node.sequence_id || String(nodeIndex);
          processedNodes[nodeId] = node;
        });
      }

      const processedTree = {
        ...tree,
        nodes: processedNodes, // Use the processed nodes (now always an object)
        dataset_id: datasetId,
        ident: tree.ident || this.generateUUID()
      };
      return processedTree;
    });

    // Process clones - ensure they have the right dataset_id
    // Tree references should already be correct from the server processing
    const processedClones = datasetClones.map((clone) => {
      const processedClone = {
        ...clone,
        dataset_id: datasetId,
        ident: clone.ident || this.generateUUID()
      };

      // For consolidated format from olmsted-cli, tree references should already be correct
      // We don't need to modify them since the Python code already ensures matching idents

      return processedClone;
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
   * Process AIRR dataset (equivalent to Python process_dataset function)
   * @param {Object} dataset - Raw AIRR dataset
   * @param {string} filename - Original filename
   * @returns {Object} Processed data structure
   */
  static processDataset(dataset, filename) {
    // Validate basic AIRR structure
    if (!dataset.clones || !Array.isArray(dataset.clones)) {
      throw new Error("Invalid AIRR format: missing or invalid clones array");
    }

    // Samples array is optional - some formats don't include it
    const hasSamples = dataset.samples && Array.isArray(dataset.samples);

    // Generate unique dataset ID for this session
    const datasetId = this.generateDatasetId();

    // Process dataset metadata (same logic as Python version)
    const processedDataset = {
      ...dataset,
      dataset_id: datasetId,
      clone_count: dataset.clones ? dataset.clones.length : dataset.clone_count || 0,
      subjects_count: dataset.clones
        ? new Set(dataset.clones.map((c) => c.subject_id)).size
        : dataset.subjects_count || 1,
      timepoints_count: hasSamples
        ? new Set(dataset.samples.map((s) => s.timepoint_id)).size
        : dataset.timepoints_count || 1,
      schema_version: "2.0.0",
      temporary: true,
      isClientSide: true,
      upload_time: new Date().toISOString(),
      original_filename: filename,
      ident: dataset.ident || this.generateUUID(),
      build: dataset.build || {
        time: new Date().toISOString(),
        commit: "client-side-processing"
      }
    };

    // Process clones and extract trees
    const { clones, trees } = this.processClones(dataset.clones, processedDataset);

    // Remove clones from dataset object (they're stored separately)
    delete processedDataset.clones;

    return {
      datasets: [processedDataset],
      clones: { [datasetId]: clones },
      trees: trees,
      datasetId: datasetId // For easy reference
    };
  }

  /**
   * Process clones array and extract trees
   * @param {Array} clonesData - Array of clone objects
   * @param {Object} dataset - Processed dataset metadata
   * @returns {Object} {clones, trees}
   */
  static processClones(clonesData, dataset) {
    const trees = [];

    const clones = clonesData.map((clone) => {
      // Process each clone
      const processedClone = this.processClone(clone, dataset);

      // Extract trees and add to global trees array
      if (processedClone.trees && Array.isArray(processedClone.trees)) {
        processedClone.trees.forEach((tree) => {
          // Add full tree to trees array
          trees.push({
            ...tree,
            clone_id: processedClone.clone_id || processedClone.ident,
            ident: tree.ident || this.generateUUID()
          });
        });

        // Keep only tree metadata in clone object (remove nodes for size)
        processedClone.trees = processedClone.trees.map((tree) => {
          const { nodes: _nodes, ...treeMetadata } = tree;
          return {
            ...treeMetadata,
            ident: tree.ident || this.generateUUID()
          };
        });
      }

      return processedClone;
    });

    return { clones, trees };
  }

  /**
   * Process individual clone (equivalent to Python process_clone function)
   * @param {Object} clone - Raw clone object
   * @param {Object} dataset - Dataset metadata
   * @returns {Object} Processed clone
   */
  static processClone(clone, dataset) {
    // Add any missing required fields
    const processedClone = {
      ...clone,
      ident: clone.ident || this.generateUUID(),
      dataset_id: dataset.dataset_id,
      clone_id: clone.clone_id || clone.ident || this.generateUUID()
    };

    // Ensure trees have proper structure if they exist
    if (processedClone.trees && Array.isArray(processedClone.trees)) {
      processedClone.trees = processedClone.trees.map((tree) => ({
        ...tree,
        ident: tree.ident || this.generateUUID(),
        tree_id: tree.tree_id || tree.ident || this.generateUUID(),
        clone_id: processedClone.clone_id
      }));
    }

    return processedClone;
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
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  /**
   * Validate AIRR format basic structure
   * @param {Object} data - Data to validate
   * @returns {boolean} Whether data appears to be valid AIRR format
   */
  static isValidAIRRFormat(data) {
    return (
      data
      && typeof data === "object"
      && Array.isArray(data.clones)
      && Array.isArray(data.samples)
      && data.clones.length > 0
    );
  }
}

export default AIRRProcessor;
