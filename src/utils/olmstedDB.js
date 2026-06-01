/**
 * Dexie database for Olmsted client-side storage with lazy loading
 */

import Dexie from "dexie";
import { DATASET_SOURCE } from "../constants/datasetSource";

/**
 * Maximum suffix attempts before firstAvailable gives up. Realistic uploads
 * never approach this — a user accumulating 10000 same-named datasets is
 * pathological. Bounded to make the failure mode loud rather than hung.
 */
const FIRST_AVAILABLE_MAX_ATTEMPTS = 10000;

/**
 * Return the lowest-numbered candidate that doesn't appear in `taken`,
 * starting from the bare `base` and walking through `format(base, 1)`,
 * `format(base, 2)`, .... Pure helper, no DB access.
 *
 * Throws if a free candidate isn't found within FIRST_AVAILABLE_MAX_ATTEMPTS
 * to fail loud rather than hang.
 *
 * @param {string} base
 * @param {Iterable<string>} taken
 * @param {(base: string, n: number) => string} format
 * @returns {string}
 */
export const firstAvailable = (base, taken, format) => {
  const set = new Set(taken);
  if (!set.has(base)) return base;
  for (let n = 1; n <= FIRST_AVAILABLE_MAX_ATTEMPTS; n += 1) {
    const candidate = format(base, n);
    if (!set.has(candidate)) return candidate;
  }
  throw new Error(`firstAvailable: no free suffix found for "${base}" within ${FIRST_AVAILABLE_MAX_ATTEMPTS} attempts`);
};

/**
 * Build a globally-unique ident by prefixing with the storage `dataset_id`.
 *
 * Source files (especially olmsted-cli output) emit deterministic clone and
 * tree idents — re-importing the same source produces identical idents. The
 * webapp uses `ident` as the per-row identity for selection, hover, starring,
 * the byIdent lookup map, and the trees-table primary key. Without
 * namespacing, two datasets with overlapping idents cross-talk in the UI and
 * (worse) overwrite each other in the trees table on insert. Namespacing at
 * the storage boundary keeps ident comparisons elsewhere unchanged.
 *
 * Constraint: source `ident` values must not contain the `::` separator.
 * If they ever do, the round-trip back to `original_ident` becomes
 * ambiguous. olmsted-cli outputs use UUIDs and dot-separated names that
 * don't contain `::`, so this is currently safe.
 *
 * @param {string} datasetId - the (already-unique) storage dataset_id
 * @param {string} ident - the source ident
 * @returns {string}
 */
export const namespacedIdent = (datasetId, ident) => `${datasetId}::${ident}`;

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
        // Store dataset metadata using bulk operation. Dataset records carry
        // an `ident` field from the source file (separate from `dataset_id`,
        // which is the unique storage PK). Source idents can collide across
        // re-imports and sibling datasets — and ResizableTable derives
        // rowId from `datum.ident` before falling back to `datum.dataset_id`,
        // so collisions show up as hover/select cross-talk in the dataset
        // tables. Read the existing rows and rename to the next free
        // `${ident}-{n}` on collision; preserve the original as
        // `original_ident`.
        //
        // Note: this dedupe is *not* atomic across separate storeDataset
        // calls — two parallel uploads could each see an empty `taken` set
        // and pick the same renamed value. In practice fileUpload gates the
        // UI behind `isProcessing`, so concurrent storeDataset is not
        // currently reachable. Worth tightening if that ever changes.
        if (datasets.length > 0) {
          const existing = await this.datasets.toArray();
          const takenIdents = new Set(existing.map((d) => d.ident).filter(Boolean));
          const datasetsToStore = datasets.map((d) => {
            if (!d.ident) return d;
            const sourceIdent = d.original_ident || d.ident;
            const renamed = firstAvailable(d.ident, takenIdents, (base, n) => `${base}-${n}`);
            takenIdents.add(renamed);
            return { ...d, ident: renamed, original_ident: sourceIdent };
          });
          await this.datasets.bulkPut(datasetsToStore);
        }

        // Store clone metadata and separate heavy data using bulk operation.
        // The clones map is keyed by storage dataset_id (the same `datasetId`
        // we read off processedData), so cloneGroupId === datasetId for
        // single-dataset uploads — but we keep the variable distinct from
        // the outer `datasetId` to avoid silent drift if the data shape
        // ever changes.
        const allCloneMeta = [];
        for (const [cloneGroupId, cloneList] of Object.entries(clones)) {
          for (const clone of cloneList) {
            // Source idents are deterministic from olmsted-cli, so re-imports
            // and sibling datasets often share idents. Namespace by datasetId
            // here so the byIdent lookup map, hover/star/select state, and the
            // trees-table primary key can't collide across datasets.
            const cloneOriginalIdent = clone.ident || clone.clone_id;
            const cloneMeta = {
              ...clone,
              ident: namespacedIdent(datasetId, cloneOriginalIdent),
              original_ident: cloneOriginalIdent,
              dataset_id: clone.dataset_id || cloneGroupId,
              sample_id: clone.sample_id || (clone.sample ? clone.sample.sample_id : null),
              name: clone.name || clone.clone_id,
              // Store tree metadata (lightweight, for dropdown display).
              // tree.type is the legacy field name; coalesce onto tree.name on ingest.
              // Tree idents get the same namespace prefix so the dropdown
              // values match the (also-namespaced) trees-table primary keys.
              trees_meta: clone.trees
                ? clone.trees.map((t) => {
                    const treeOriginalIdent = t.ident || t.tree_id;
                    return {
                      ident: namespacedIdent(datasetId, treeOriginalIdent),
                      original_ident: treeOriginalIdent,
                      tree_id: t.tree_id,
                      name: t.name || t.type,
                      downsampling_strategy: t.downsampling_strategy
                    };
                  })
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

        // Store complete tree data (like SessionStorage did) using bulk operation.
        // Tree idents get the same dataset_id prefix as clone idents — without
        // it, two datasets whose source files share tree idents would collide
        // on the trees-table primary key, with the second insert silently
        // overwriting the first.
        const allTreeData = trees.map((tree) => ({
          tree_id: tree.tree_id,
          ident: namespacedIdent(datasetId, tree.ident),
          original_ident: tree.ident,
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
   * Return IndexedDB datasets whose `source` is explicitly
   * SERVER_CONSOLIDATED. Used by manifest reconciliation as the set
   * eligible for removal/refresh.
   *
   * Deliberately stricter than `sourceOf()` — this checks the raw
   * `source` field rather than falling back through legacy flags
   * (`temporary === false` etc.). Reconciliation is destructive, so
   * records without an explicit `source` are left alone to avoid
   * sweeping a legacy upload whose `temporary` field happened to be
   * absent. The cost is that pre-source-enum server entries persist
   * forever; in practice they're rare and benign.
   *
   * @returns {Promise<Object[]>}
   */
  async getServerConsolidatedDatasets() {
    try {
      const all = await this.datasets.toArray();
      return all.filter((d) => d.source === DATASET_SOURCE.SERVER_CONSOLIDATED);
    } catch (error) {
      console.error("OlmstedDB: Failed to enumerate server-consolidated datasets:", error);
      return [];
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
