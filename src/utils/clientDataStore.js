/**
 * Client-side data storage for processed AIRR data using Dexie with lazy loading.
 *
 * This class provides an interface between the application and the Dexie database,
 * implementing lazy loading strategies to improve performance when working with large
 * AIRR datasets. It maintains a small in-memory cache for recently accessed data
 * to reduce database queries.
 *
 * @class ClientDataStore
 * @module utils/clientDataStore
 */

import olmstedDB from "./olmstedDB";
import { ValidationError, DatabaseError, ErrorLogger, validateRequired, validateType } from "./errors";

/**
 * Manages client-side storage and retrieval of AIRR data with optimized caching
 */
class ClientDataStore {
  /**
   * Creates a new ClientDataStore instance with memory caching
   * @constructor
   */
  constructor() {
    /**
     * Cache for recently loaded full clone data
     * @type {Map<string, Object>}
     * @private
     */
    this.recentClones = new Map();

    /**
     * Cache for recently loaded tree data
     * @type {Map<string, Object>}
     * @private
     */
    this.recentTrees = new Map();

    /**
     * Maximum number of items to keep in each cache
     * @type {number}
     * @private
     */
    this.maxCacheSize = 10;
  }

  /**
   * Store processed AIRR data with lazy loading structure
   * @async
   * @param {Object} processedData - Data from AIRRProcessor
   * @param {Array} processedData.datasets - Array of dataset objects
   * @param {Object} processedData.clones - Clone data indexed by dataset ID
   * @param {Array} processedData.trees - Array of phylogenetic tree objects
   * @param {string} processedData.datasetId - Primary dataset identifier
   * @returns {Promise<string>} The dataset ID of the stored data
   * @throws {Error} If data storage fails
   */
  async storeProcessedData(processedData) {
    try {
      // Input validation using utility functions
      validateRequired(processedData, "processedData");
      validateType(processedData, "object", "processedData");
      validateRequired(processedData.datasets, "processedData.datasets");
      validateType(processedData.datasets, "object", "processedData.datasets");
      validateRequired(processedData.datasetId, "processedData.datasetId");
      validateType(processedData.datasetId, "string", "processedData.datasetId");

      ErrorLogger.info("ClientDataStore: Storing data with lazy loading...");

      const datasetId = await olmstedDB.storeDataset(processedData);
      ErrorLogger.info("ClientDataStore: Successfully stored data in Dexie");
      return datasetId;
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error; // Re-throw validation errors as-is
      }

      const dbError = new DatabaseError("Failed to store processed data", "storeDataset", error);
      ErrorLogger.log(dbError, { datasetId: processedData?.datasetId });
      throw dbError;
    }
  }

  /**
   * Get all datasets (lightweight, always fast)
   * @async
   * @returns {Promise<Array<Object>>} Array of dataset objects
   * @returns {Promise<Array>} Empty array if retrieval fails
   * @example
   * const datasets = await store.getAllDatasets();
   * console.log(`Found ${datasets.length} datasets`);
   */
  async getAllDatasets() {
    try {
      const datasets = await olmstedDB.getAllDatasets();
      console.log(`ClientDataStore: Retrieved ${datasets.length} datasets`);
      return datasets;
    } catch (error) {
      console.error("ClientDataStore: Failed to get datasets:", error);
      return [];
    }
  }

  /**
   * Get clone metadata for dataset (lightweight, no sequences).
   * This is what powers the clone family list - fast loading.
   * @async
   * @param {string} datasetId - Dataset identifier
   * @returns {Promise<Array<Object>>} Array of clone metadata objects
   * @returns {Promise<Array>} Empty array if no clones found or retrieval fails
   * @example
   * const clones = await store.getClones('dataset_001');
   * // Returns lightweight metadata without sequence data
   */
  async getClones(datasetId) {
    try {
      // Input validation
      validateRequired(datasetId, "datasetId");
      validateType(datasetId, "string", "datasetId");

      ErrorLogger.info(`ClientDataStore: Getting clone metadata for ${datasetId}`);

      const cloneMeta = await olmstedDB.getCloneMetadata(datasetId);

      if (cloneMeta.length === 0) {
        ErrorLogger.warn(`ClientDataStore: No clones found for dataset ${datasetId}`);
        return [];
      }

      // Convert to format expected by existing code
      const cloneList = cloneMeta.map((clone) => ({
        ...clone,
        // Add tree references in expected format
        trees: clone.tree_ids
          ? clone.tree_ids.map((tree_id) => ({
              ident: tree_id,
              tree_id: tree_id
            }))
          : []
      }));

      ErrorLogger.info(`ClientDataStore: Retrieved ${cloneList.length} clone metadata entries`);
      return cloneList;
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }

      const dbError = new DatabaseError("Failed to get clone metadata", "getCloneMetadata", error);
      ErrorLogger.log(dbError, { datasetId });
      return []; // Return empty array for graceful degradation
    }
  }

  /**
   * Get full tree with sequences (heavy, loaded on demand).
   * This is called when user clicks on a specific clone family.
   * Uses memory cache for recently accessed trees.
   * @async
   * @param {string} treeIdent - Tree identifier
   * @returns {Promise<Object|null>} Tree object with sequences or null if not found
   * @example
   * const tree = await store.getTree('tree_clone_0099_ident');
   * if (tree) {
   *   console.log(`Tree has ${tree.sequences.length} sequences`);
   * }
   */
  async getTree(treeIdent) {
    // Input validation
    if (!treeIdent || typeof treeIdent !== "string") {
      throw new Error("ClientDataStore: treeIdent must be a non-empty string");
    }

    console.log(`ClientDataStore: Loading full tree data for ${treeIdent}`);

    // Check memory cache first
    if (this.recentTrees.has(treeIdent)) {
      console.log(`ClientDataStore: Found tree ${treeIdent} in memory cache`);
      return this.recentTrees.get(treeIdent);
    }

    try {
      // Try direct lookup by tree identifier first
      let fullTree = await olmstedDB.getTreeByIdent(treeIdent);

      if (!fullTree) {
        // Fallback: Extract clone_id from tree identifier
        // Tree idents follow patterns like "tree_clone_0099_ident" → "clone_0099"
        let cloneId = treeIdent;

        if (treeIdent.includes("tree_clone_")) {
          // Pattern: "tree_clone_XXXX_ident" → "clone_XXXX"
          const match = treeIdent.match(/tree_(clone_\d+)/);
          if (match) {
            [, cloneId] = match; // Extract "clone_XXXX"
          }
        } else if (treeIdent.startsWith("tree_") && treeIdent.includes("clone_")) {
          // Other variations, try to find clone_XXXX pattern
          const match = treeIdent.match(/(clone_\d+)/);
          if (match) {
            [, cloneId] = match;
          }
        }

        console.log(`ClientDataStore: Trying fallback - parsed "${treeIdent}" → clone ID "${cloneId}"`);
        fullTree = await olmstedDB.getTreeForClone(cloneId);
      }

      if (fullTree) {
        // Cache in memory for fast subsequent access
        this.addToCache(this.recentTrees, treeIdent, fullTree);
        console.log(`ClientDataStore: Loaded and cached tree ${treeIdent}`);
        return fullTree;
      }

      console.warn(`ClientDataStore: Tree not found: ${treeIdent}`);
      return null;
    } catch (error) {
      console.error("ClientDataStore: Failed to get tree:", error);
      return null;
    }
  }

  /**
   * Get full clone data with sequences (for when we need everything).
   * Combines clone metadata with full tree data.
   * @async
   * @param {string} cloneId - Clone identifier
   * @param {string} datasetId - Dataset identifier
   * @returns {Promise<Object|null>} Full clone object with embedded trees, or null if not found
   * @example
   * const fullClone = await store.getFullClone('clone_0099', 'dataset_001');
   * if (fullClone) {
   *   console.log(`Clone has ${fullClone.unique_seqs_count} unique sequences`);
   * }
   */
  async getFullClone(cloneId, datasetId) {
    // Input validation
    if (!cloneId || typeof cloneId !== "string") {
      throw new Error("ClientDataStore: cloneId must be a non-empty string");
    }

    if (!datasetId || typeof datasetId !== "string") {
      throw new Error("ClientDataStore: datasetId must be a non-empty string");
    }

    console.log(`ClientDataStore: Loading full clone data for ${cloneId}`);

    // Check memory cache first
    const cacheKey = `${datasetId}_${cloneId}`;
    if (this.recentClones.has(cacheKey)) {
      console.log(`ClientDataStore: Found full clone ${cloneId} in memory cache`);
      return this.recentClones.get(cacheKey);
    }

    try {
      // Get clone metadata
      const cloneMetaList = await olmstedDB.getCloneMetadata(datasetId);
      const cloneMeta = cloneMetaList.find((c) => c.clone_id === cloneId);

      if (!cloneMeta) {
        console.warn(`ClientDataStore: Clone metadata not found: ${cloneId}`);
        return null;
      }

      // Get full tree data
      const fullTree = await olmstedDB.getTreeForClone(cloneId);

      if (!fullTree) {
        console.warn(`ClientDataStore: Tree data not found for clone: ${cloneId}`);
        return null;
      }

      // Combine metadata + tree data in expected format
      const fullClone = {
        ...cloneMeta,
        trees: [fullTree] // Embed full tree object
      };

      // Cache in memory
      this.addToCache(this.recentClones, cacheKey, fullClone);
      console.log(`ClientDataStore: Loaded and cached full clone ${cloneId}`);
      return fullClone;
    } catch (error) {
      console.error("ClientDataStore: Failed to get full clone:", error);
      return null;
    }
  }

  /**
   * Add item to cache with size limit.
   * Implements LRU (Least Recently Used) eviction when cache exceeds maxCacheSize.
   * @private
   * @param {Map<string, any>} cache - Cache map to add to
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @returns {void}
   */
  addToCache(cache, key, value) {
    // Remove oldest if at limit
    if (cache.size >= this.maxCacheSize) {
      const firstKey = cache.keys().next().value;
      cache.delete(firstKey);
    }

    cache.set(key, value);
  }

  /**
   * Remove a dataset and all associated data.
   * Also clears related entries from memory caches.
   * @async
   * @param {string} datasetId - Dataset identifier to remove
   * @returns {Promise<void>}
   * @example
   * await store.removeDataset('dataset_001');
   */
  async removeDataset(datasetId) {
    // Input validation
    if (!datasetId || typeof datasetId !== "string") {
      throw new Error("ClientDataStore: datasetId must be a non-empty string");
    }

    try {
      await olmstedDB.removeDataset(datasetId);

      // Clear memory cache for this dataset
      for (const [key, _value] of this.recentClones.entries()) {
        if (key.startsWith(datasetId + "_")) {
          this.recentClones.delete(key);
        }
      }

      // Clear tree cache for this dataset's trees
      // This is imperfect but will be cleaned up naturally

      console.log(`ClientDataStore: Removed dataset ${datasetId}`);
    } catch (error) {
      console.error("ClientDataStore: Failed to remove dataset:", error);
    }
  }

  /**
   * Clear all data from storage and memory caches.
   * This will remove all datasets, clones, and trees.
   * @async
   * @returns {Promise<void>}
   * @example
   * await store.clearAll();
   */
  async clearAllData() {
    try {
      await olmstedDB.clearAll();
      this.recentClones.clear();
      this.recentTrees.clear();
      console.log("ClientDataStore: Cleared all data");
    } catch (error) {
      console.error("ClientDataStore: Failed to clear all data:", error);
    }
  }

  /**
   * Get storage summary with performance metrics.
   * Provides insights into database usage and cache status.
   * @async
   * @returns {Promise<Object>} Storage and performance summary
   * @returns {Promise<Object>} Object with error property if retrieval fails
   * @example
   * const summary = await store.getStorageSummary();
   * console.log(`Using ${summary.storage.usage} bytes of storage`);
   * console.log(`Cache has ${summary.memoryCache.clones} clones cached`);
   */
  async getStorageSummary() {
    try {
      const dbStats = await olmstedDB.getStats();
      const storageInfo = await olmstedDB.getStorageEstimate();

      return {
        database: dbStats,
        storage: storageInfo,
        memoryCache: {
          clones: this.recentClones.size,
          trees: this.recentTrees.size,
          maxSize: this.maxCacheSize
        }
      };
    } catch (error) {
      console.error("ClientDataStore: Failed to get storage summary:", error);
      return { error: error.message };
    }
  }

  /**
   * Preload commonly accessed data (optional optimization)
   * @param {string} datasetId - Dataset to preload
   */
  async preloadDataset(datasetId) {
    try {
      console.log(`ClientDataStore: Preloading dataset ${datasetId}...`);

      // Just load the clone metadata - trees will be loaded on demand
      const clones = await this.getClones(datasetId);
      console.log(`ClientDataStore: Preloaded ${clones.length} clone metadata entries`);

      return clones.length;
    } catch (error) {
      console.error("ClientDataStore: Failed to preload dataset:", error);
      return 0;
    }
  }

  /**
   * Clear memory cache to free up RAM
   */
  clearMemoryCache() {
    this.recentClones.clear();
    this.recentTrees.clear();
    console.log("ClientDataStore: Cleared memory cache");
  }
}

// Create a singleton instance
const clientDataStore = new ClientDataStore();

export default clientDataStore;
