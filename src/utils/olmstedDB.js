/**
 * Dexie database for Olmsted client-side storage with lazy loading
 */

import Dexie from "dexie";

/**
 * Return the lowest-numbered candidate that doesn't appear in `taken`,
 * starting from the bare `base` and walking through `format(base, 1)`,
 * `format(base, 2)`, .... Pure helper, no DB access.
 *
 * @param {string} base
 * @param {Iterable<string>} taken
 * @param {(base: string, n: number) => string} format
 * @returns {string}
 */
export const firstAvailable = (base, taken, format) => {
  const set = new Set(taken);
  if (!set.has(base)) return base;
  let n = 1;
  while (set.has(format(base, n))) n += 1;
  return format(base, n);
};

class OlmstedDB extends Dexie {
  constructor() {
    super("OlmstedClientStorage");

    // Define database schema with separate stores for lazy loading
    this.version(1).stores({
      // Dataset metadata (always loaded)
      datasets: "dataset_id, name, clone_count",

      // Clone family metadata (lightweight, loaded for lists)
      clones: "[dataset_id+clone_id], dataset_id, sample_id, name, unique_seqs_count, mean_mut_freq",

      // Complete tree data (heavy, loaded on demand per family)
      // CRITICAL: Use ident as primary key since tree_id can have duplicates
      trees: "ident, tree_id, clone_id"
    });

    // Version 2: Add configs store for visualization settings persistence
    this.version(2).stores({
      datasets: "dataset_id, name, clone_count",
      clones: "[dataset_id+clone_id], dataset_id, sample_id, name, unique_seqs_count, mean_mut_freq",
      trees: "ident, tree_id, clone_id",
      // Visualization configs (user-saved settings)
      configs: "id, name, datasetId, createdAt"
    });

    // Create a ready promise that resolves when database is open
    this.ready = this.open()
      .then(() => {
        console.log("OlmstedDB: Database ready");
        return this;
      })
      .catch((error) => {
        console.error("Failed to open OlmstedDB:", error);
        throw error;
      });
  }

  /**
   * Store complete dataset with lazy loading structure
   */
  async storeDataset(processedData) {
    const { datasets, clones, trees, datasetId } = processedData;

    try {
      await this.transaction("rw", this.datasets, this.clones, this.trees, async () => {
        // Store dataset metadata using bulk operation
        if (datasets.length > 0) {
          await this.datasets.bulkPut(datasets);
        }

        // Store clone metadata and separate heavy data using bulk operation
        const allCloneMeta = [];
        for (const [dataset_id, cloneList] of Object.entries(clones)) {
          for (const clone of cloneList) {
            // Clone metadata — spread all fields to preserve custom data,
            // then override fields that need normalization
            const cloneMeta = {
              ...clone,
              ident: clone.ident || clone.clone_id,
              dataset_id: clone.dataset_id || dataset_id,
              sample_id: clone.sample_id || (clone.sample ? clone.sample.sample_id : null),
              name: clone.name || clone.clone_id,
              // Store tree metadata (lightweight, for dropdown display).
              // tree.type is the legacy field name; coalesce onto tree.name on ingest.
              trees_meta: clone.trees
                ? clone.trees.map((t) => ({
                    ident: t.ident || t.tree_id,
                    tree_id: t.tree_id,
                    name: t.name || t.type,
                    downsampling_strategy: t.downsampling_strategy
                  }))
                : clone.trees_meta || []
            };
            // Remove embedded trees array (stored separately)
            delete cloneMeta.trees;

            allCloneMeta.push(cloneMeta);
          }
        }
        if (allCloneMeta.length > 0) {
          await this.clones.bulkPut(allCloneMeta);
        }

        // Store complete tree data (like SessionStorage did) using bulk operation
        const allTreeData = trees.map((tree) => ({
          tree_id: tree.tree_id,
          ident: tree.ident,
          clone_id: tree.clone_id,
          newick: tree.newick,
          root_node: tree.root_node,
          nodes: tree.nodes, // Store complete nodes object as-is
          // Add any other tree properties that might be needed
          downsampling_strategy: tree.downsampling_strategy,
          tree_type: tree.tree_type,
          name: tree.name || tree.type
        }));

        if (allTreeData.length > 0) {
          await this.trees.bulkPut(allTreeData);
        }
      });

      return datasetId;
    } catch (error) {
      console.error("OlmstedDB: Failed to store dataset:", error);
      throw error;
    }
  }

  /**
   * Get all datasets (lightweight)
   */
  async getAllDatasets() {
    try {
      const datasets = await this.datasets.orderBy("name").toArray();
      return datasets;
    } catch (error) {
      console.error("OlmstedDB: Failed to get datasets:", error);
      return [];
    }
  }

  /**
   * Find an already-loaded dataset whose original_dataset_id matches the
   * given value. Storage `dataset_id`s are always unique (Date.now-based)
   * and never collide; we check `original_dataset_id` to detect "the same
   * source dataset is already loaded."
   *
   * @param {string} originalDatasetId
   * @returns {Promise<Object|null>} the existing dataset or null
   */
  async findDatasetByOriginalId(originalDatasetId) {
    if (!originalDatasetId) return null;
    try {
      const all = await this.datasets.toArray();
      return all.find((d) => d.original_dataset_id === originalDatasetId) || null;
    } catch (error) {
      console.error("OlmstedDB: Failed to look up dataset by original_dataset_id:", error);
      return null;
    }
  }

  /**
   * Find an already-loaded dataset whose user-facing `name` matches.
   *
   * @param {string} name
   * @returns {Promise<Object|null>}
   */
  async findDatasetByName(name) {
    if (!name) return null;
    try {
      return (await this.datasets.where("name").equals(name).first()) || null;
    } catch (error) {
      console.error("OlmstedDB: Failed to look up dataset by name:", error);
      return null;
    }
  }

  /**
   * See module-level firstAvailable for the pure implementation.
   *
   * @param {string} candidate
   * @returns {Promise<string>}
   */
  async makeUniqueOriginalDatasetId(candidate) {
    const all = await this.datasets.toArray();
    const taken = all.map((d) => d.original_dataset_id).filter(Boolean);
    return firstAvailable(candidate, taken, (base, n) => `${base}-${n}`);
  }

  /**
   * See module-level firstAvailable for the pure implementation. The user
   * can override the returned suggestion with anything (including a
   * duplicate) — this just produces the default shown in the rename modal.
   *
   * @param {string} candidate
   * @returns {Promise<string>}
   */
  async makeUniqueDatasetName(candidate) {
    const all = await this.datasets.toArray();
    const taken = all.map((d) => d.name).filter(Boolean);
    return firstAvailable(candidate, taken, (base, n) => `${base} (${n})`);
  }

  /**
   * Get clone metadata for a dataset (lightweight, no sequences)
   */
  async getCloneMetadata(datasetId) {
    try {
      const clones = await this.clones.where("dataset_id").equals(datasetId).toArray();

      return clones;
    } catch (error) {
      console.error("OlmstedDB: Failed to get clone metadata:", error);
      return [];
    }
  }

  /**
   * Convert nodes from object format to array and filter out duplicate roots.
   * Surprise-format files may have a "naive" placeholder root with empty sequences
   * alongside the real root. Vega's stratify requires exactly one root.
   *
   * @param {Object} nodesObj - Nodes as { sequence_id: nodeData }
   * @returns {Array} Nodes as array with at most one root
   */
  convertAndFilterNodes(nodesObj) {
    if (!nodesObj) return [];
    let nodesArray = Object.entries(nodesObj).map(([nodeId, nodeData]) => ({
      sequence_id: nodeId,
      ...nodeData
    }));

    // Filter duplicate roots: keep only roots with non-empty sequences
    const roots = nodesArray.filter((n) => !n.parent);
    if (roots.length > 1) {
      const emptyRoots = roots.filter((n) => !n.sequence_alignment);
      if (emptyRoots.length > 0 && emptyRoots.length < roots.length) {
        const emptyIds = new Set(emptyRoots.map((n) => n.sequence_id));
        nodesArray = nodesArray.filter((n) => !emptyIds.has(n.sequence_id));
      }
    }

    return nodesArray;
  }

  /**
   * Get full tree data by tree identifier (heavy, loaded on demand)
   */
  async getTreeByIdent(treeIdent) {
    try {
      // Get complete tree by ident (now stored as complete object)
      const completeTree = await this.trees.where("ident").equals(treeIdent).first();

      if (!completeTree) {
        return null;
      }

      const nodesArray = this.convertAndFilterNodes(completeTree.nodes);
      return { ...completeTree, nodes: nodesArray };
    } catch (error) {
      console.error("OlmstedDB: Failed to get tree by ident:", error);
      return null;
    }
  }

  /**
   * Get full tree data for a specific clone (heavy, loaded on demand)
   */
  async getTreeForClone(cloneId) {
    try {
      // Get complete tree - try both by clone_id and by ident
      let completeTree = await this.trees.where("clone_id").equals(cloneId).first();

      if (!completeTree) {
        // Try searching by ident field (tree identifier)
        completeTree = await this.trees.where("ident").equals(cloneId).first();
      }

      if (!completeTree) {
        // Try partial matching - sometimes tree ident contains clone_id
        const allTrees = await this.trees.toArray();
        completeTree = allTrees.find(
          (tree) =>
            tree.clone_id === cloneId ||
            tree.ident === cloneId ||
            (tree.ident && tree.ident.includes(cloneId)) ||
            (tree.tree_id && tree.tree_id.includes(cloneId))
        );
      }

      if (!completeTree) {
        console.warn(`OlmstedDB: No tree found for clone ${cloneId}`);
        return null;
      }

      const nodesArray = this.convertAndFilterNodes(completeTree.nodes);
      return { ...completeTree, nodes: nodesArray };
    } catch (error) {
      console.error("OlmstedDB: Failed to get tree for clone:", error);
      return null;
    }
  }

  /**
   * Remove a dataset and all associated data
   */
  async removeDataset(datasetId) {
    try {
      await this.transaction("rw", this.datasets, this.clones, this.trees, async () => {
        // Get all clones for this dataset
        const clones = await this.clones.where("dataset_id").equals(datasetId).toArray();
        const cloneIds = clones.map((c) => c.clone_id);

        // Remove dataset
        await this.datasets.delete(datasetId);

        // Remove clones
        await this.clones.where("dataset_id").equals(datasetId).delete();

        // Remove trees for these clones using bulk operation
        if (cloneIds.length > 0) {
          await this.trees.where("clone_id").anyOf(cloneIds).delete();
        }
      });
    } catch (error) {
      console.error("OlmstedDB: Failed to remove dataset:", error);
    }
  }

  /**
   * Clear all data
   */
  async clearAll() {
    try {
      await this.transaction("rw", this.datasets, this.clones, this.trees, this.configs, async () => {
        await this.datasets.clear();
        await this.clones.clear();
        await this.trees.clear();
        await this.configs.clear();
      });
    } catch (error) {
      console.error("OlmstedDB: Failed to clear all data:", error);
    }
  }

  // ============================================
  // Config CRUD Operations
  // ============================================

  /**
   * Get all saved configs
   * @param {string|null} datasetId - Optional filter by dataset (null returns global configs)
   * @returns {Promise<Array>} Array of config objects
   */
  async getAllConfigs(datasetId = undefined) {
    try {
      let configs;
      if (datasetId === undefined) {
        // Return all configs
        configs = await this.configs.orderBy("createdAt").reverse().toArray();
      } else {
        // Filter by datasetId (null = global configs, string = dataset-specific)
        configs = await this.configs.where("datasetId").equals(datasetId).toArray();
      }
      return configs;
    } catch (error) {
      console.error("OlmstedDB: Failed to get configs:", error);
      return [];
    }
  }

  /**
   * Get a single config by ID
   * @param {string} configId - The config ID
   * @returns {Promise<Object|null>} Config object or null
   */
  async getConfig(configId) {
    try {
      const config = await this.configs.get(configId);
      return config || null;
    } catch (error) {
      console.error("OlmstedDB: Failed to get config:", error);
      return null;
    }
  }

  /**
   * Save a config (create or update)
   * @param {Object} config - Config object with id, name, settings, etc.
   * @returns {Promise<string>} The config ID
   */
  async saveConfig(config) {
    try {
      const now = Date.now();
      const configToSave = {
        ...config,
        updatedAt: now,
        createdAt: config.createdAt || now
      };
      await this.configs.put(configToSave);
      return configToSave.id;
    } catch (error) {
      console.error("OlmstedDB: Failed to save config:", error);
      throw error;
    }
  }

  /**
   * Delete a config by ID
   * @param {string} configId - The config ID to delete
   */
  async deleteConfig(configId) {
    try {
      await this.configs.delete(configId);
    } catch (error) {
      console.error("OlmstedDB: Failed to delete config:", error);
      throw error;
    }
  }

  /**
   * Get storage usage estimate
   */
  async getStorageEstimate() {
    if (navigator.storage && navigator.storage.estimate) {
      const estimate = await navigator.storage.estimate();
      return {
        used: estimate.usage || 0,
        total: estimate.quota || 0,
        available: (estimate.quota || 0) - (estimate.usage || 0),
        usedMB: ((estimate.usage || 0) / (1024 * 1024)).toFixed(2),
        totalMB: ((estimate.quota || 0) / (1024 * 1024)).toFixed(2),
        availableMB: (((estimate.quota || 0) - (estimate.usage || 0)) / (1024 * 1024)).toFixed(2)
      };
    }
    return { message: "Storage estimation not supported" };
  }

  /**
   * Get database statistics
   */
  async getStats() {
    try {
      const stats = await this.transaction("r", this.datasets, this.clones, this.trees, this.configs, async () => {
        const datasetCount = await this.datasets.count();
        const cloneCount = await this.clones.count();
        const treeCount = await this.trees.count();
        const configCount = await this.configs.count();

        return {
          datasets: datasetCount,
          clones: cloneCount,
          trees: treeCount,
          configs: configCount
        };
      });

      return stats;
    } catch (error) {
      console.error("OlmstedDB: Failed to get stats:", error);
      return { error: error.message };
    }
  }
}

// Create singleton instance
const olmstedDB = new OlmstedDB();

export default olmstedDB;
