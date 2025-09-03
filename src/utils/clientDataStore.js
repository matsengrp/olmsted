/**
 * Client-side data storage for processed AIRR data using Dexie with lazy loading
 */

import olmstedDB from './olmstedDB';

class ClientDataStore {

  constructor() {
    // Keep minimal memory cache for recently accessed data
    this.recentClones = new Map(); // Cache recently loaded full clone data
    this.recentTrees = new Map();  // Cache recently loaded trees
    this.maxCacheSize = 10; // Keep last 10 accessed items in memory
  }

  /**
   * Store processed AIRR data with lazy loading structure
   * @param {Object} processedData - Data from AIRRProcessor
   */
  async storeProcessedData(processedData) {
    console.log('ClientDataStore: Storing data with lazy loading...');
    
    try {
      const datasetId = await olmstedDB.storeDataset(processedData);
      console.log('ClientDataStore: Successfully stored data in Dexie');
      return datasetId;
    } catch (error) {
      console.error('ClientDataStore: Failed to store data:', error);
      throw error;
    }
  }

  /**
   * Get all datasets (lightweight, always fast)
   * @returns {Promise<Array>} Array of dataset objects
   */
  async getAllDatasets() {
    try {
      const datasets = await olmstedDB.getAllDatasets();
      console.log(`ClientDataStore: Retrieved ${datasets.length} datasets`);
      return datasets;
    } catch (error) {
      console.error('ClientDataStore: Failed to get datasets:', error);
      return [];
    }
  }

  /**
   * Get clone metadata for dataset (lightweight, no sequences)
   * This is what powers the clone family list - fast loading
   * @param {string} datasetId - Dataset identifier
   * @returns {Promise<Array>} Array of clone metadata objects
   */
  async getClones(datasetId) {
    console.log(`ClientDataStore: Getting clone metadata for ${datasetId}`);
    
    try {
      const cloneMeta = await olmstedDB.getCloneMetadata(datasetId);
      
      if (cloneMeta.length === 0) {
        console.warn(`ClientDataStore: No clones found for dataset ${datasetId}`);
        return [];
      }
      
      // Convert to format expected by existing code
      const cloneList = cloneMeta.map(clone => ({
        ...clone,
        // Add tree references in expected format
        trees: clone.tree_ids ? clone.tree_ids.map(tree_id => ({
          ident: tree_id,
          tree_id: tree_id
        })) : []
      }));
      
      console.log(`ClientDataStore: Retrieved ${cloneList.length} clone metadata entries`);
      return cloneList;
      
    } catch (error) {
      console.error('ClientDataStore: Failed to get clone metadata:', error);
      return [];
    }
  }

  /**
   * Get full tree with sequences (heavy, loaded on demand)
   * This is called when user clicks on a specific clone family
   * @param {string} treeIdent - Tree identifier
   * @returns {Promise<Object|null>} Tree object with sequences or null
   */
  async getTree(treeIdent) {
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
        
        if (treeIdent.includes('tree_clone_')) {
          // Pattern: "tree_clone_XXXX_ident" → "clone_XXXX"
          const match = treeIdent.match(/tree_(clone_\d+)/);
          if (match) {
            cloneId = match[1]; // Extract "clone_XXXX"
          }
        } else if (treeIdent.startsWith('tree_') && treeIdent.includes('clone_')) {
          // Other variations, try to find clone_XXXX pattern
          const match = treeIdent.match(/(clone_\d+)/);
          if (match) {
            cloneId = match[1];
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
      console.error('ClientDataStore: Failed to get tree:', error);
      return null;
    }
  }

  /**
   * Get full clone data with sequences (for when we need everything)
   * @param {string} cloneId - Clone identifier  
   * @param {string} datasetId - Dataset identifier
   * @returns {Promise<Object|null>} Full clone object with embedded trees
   */
  async getFullClone(cloneId, datasetId) {
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
      const cloneMeta = cloneMetaList.find(c => c.clone_id === cloneId);
      
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
      console.error('ClientDataStore: Failed to get full clone:', error);
      return null;
    }
  }

  /**
   * Add item to cache with size limit
   * @param {Map} cache - Cache map to add to
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
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
   * Remove a dataset and all associated data
   * @param {string} datasetId - Dataset to remove
   */
  async removeDataset(datasetId) {
    try {
      await olmstedDB.removeDataset(datasetId);
      
      // Clear memory cache for this dataset
      for (const [key, value] of this.recentClones.entries()) {
        if (key.startsWith(datasetId + '_')) {
          this.recentClones.delete(key);
        }
      }
      
      // Clear tree cache for this dataset's trees
      // This is imperfect but will be cleaned up naturally
      
      console.log(`ClientDataStore: Removed dataset ${datasetId}`);
    } catch (error) {
      console.error('ClientDataStore: Failed to remove dataset:', error);
    }
  }

  /**
   * Clear all data
   */
  async clearAllData() {
    try {
      await olmstedDB.clearAll();
      this.recentClones.clear();
      this.recentTrees.clear();
      console.log('ClientDataStore: Cleared all data');
    } catch (error) {
      console.error('ClientDataStore: Failed to clear all data:', error);
    }
  }

  /**
   * Get storage summary with performance metrics
   * @returns {Promise<Object>} Storage and performance summary
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
      console.error('ClientDataStore: Failed to get storage summary:', error);
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
      console.error('ClientDataStore: Failed to preload dataset:', error);
      return 0;
    }
  }

  /**
   * Clear memory cache to free up RAM
   */
  clearMemoryCache() {
    this.recentClones.clear();
    this.recentTrees.clear();
    console.log('ClientDataStore: Cleared memory cache');
  }
}

// Create a singleton instance
const clientDataStore = new ClientDataStore();

export default clientDataStore;