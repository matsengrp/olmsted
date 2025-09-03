/**
 * Client-side data storage for processed AIRR data
 * Stores data in browser memory and IndexedDB instead of server
 */

import indexedDBHelper from './indexedDBHelper';

class ClientDataStore {

  constructor() {
    this.datasets = new Map();
    this.clones = new Map();
    this.trees = new Map();
    this.storagePrefix = 'olmsted_temp_';
    this.dbInitialized = false;
  }

  /**
   * Store processed AIRR data in browser storage
   * @param {Object} processedData - Data from AIRRProcessor
   */
  async storeProcessedData(processedData) {
    const {
      datasets, clones, trees, datasetId
    } = processedData;

    console.log('ClientDataStore: Storing data for dataset:', datasetId);
    console.log('ClientDataStore: Data sizes:', {
      datasets: datasets?.length || 0,
      clones: Object.keys(clones || {}).length,
      trees: trees?.length || 0
    });

    // Store in memory for immediate access
    datasets.forEach((dataset) => {
      console.log('ClientDataStore: Storing dataset:', dataset.dataset_id);
      this.datasets.set(dataset.dataset_id, dataset);
    });

    Object.entries(clones).forEach(([id, cloneList]) => {
      console.log(`ClientDataStore: Storing ${cloneList?.length || 0} clones for dataset:`, id);
      this.clones.set(id, cloneList);
    });

    console.log('Storing trees:', trees.map((t) => ({ ident: t.ident, tree_id: t.tree_id, clone_id: t.clone_id })));
    trees.forEach((tree) => {
      this.trees.set(tree.ident, tree);
    });

    // Debug: Check what tree references the clones have
    Object.entries(clones).forEach(([datasetId, cloneList]) => {
      cloneList.forEach((clone) => {
        if (clone.trees && clone.trees.length > 0) {
          console.log(`Clone ${clone.clone_id} tree refs:`, clone.trees.map((t) => ({ ident: t.ident, tree_id: t.tree_id })));
        }
      });
    });

    // Store in IndexedDB for persistence
    try {
      console.log('ClientDataStore: Storing data in IndexedDB...');
      
      // Store datasets
      const datasetsToStore = Array.from(this.datasets.values());
      for (const dataset of datasetsToStore) {
        await indexedDBHelper.setItem('datasets', dataset);
        console.log(`ClientDataStore: Stored dataset ${dataset.dataset_id} in IndexedDB`);
      }
      
      // Store clones
      for (const [id, cloneList] of Object.entries(clones)) {
        const cloneData = { dataset_id: id, clones: cloneList };
        await indexedDBHelper.setItem('clones', cloneData);
        const sizeKB = (JSON.stringify(cloneList).length / 1024).toFixed(1);
        console.log(`ClientDataStore: Stored ${cloneList.length} clones for ${id} (${sizeKB}KB) in IndexedDB`);
      }
      
      // Store trees
      for (const tree of trees) {
        await indexedDBHelper.setItem('trees', tree);
        const sizeKB = (JSON.stringify(tree).length / 1024).toFixed(1);
        console.log(`ClientDataStore: Stored tree ${tree.ident} (${sizeKB}KB) in IndexedDB`);
      }
      
      console.log('ClientDataStore: Successfully stored all data in IndexedDB');
      
      // Log storage usage
      const storageInfo = await indexedDBHelper.getStorageEstimate();
      console.log('ClientDataStore: Storage usage:', storageInfo);
      
    } catch (error) {
      console.error('ClientDataStore: Failed to store data in IndexedDB:', error);
      console.warn('ClientDataStore: Data will be available in memory only during this session.');
    }

    return datasetId;
  }

  /**
   * Get all datasets (for datasets list view)
   * @returns {Promise<Array>} Array of dataset objects
   */
  async getAllDatasets() {
    const memoryDatasets = Array.from(this.datasets.values());

    // If no data in memory, try to load from IndexedDB
    if (memoryDatasets.length === 0) {
      await this.loadFromIndexedDB();
      return Array.from(this.datasets.values());
    }

    return memoryDatasets;
  }

  /**
   * Get clones for a specific dataset
   * @param {string} datasetId - Dataset identifier
   * @returns {Promise<Array>} Array of clone objects
   */
  async getClones(datasetId) {
    console.log(`ClientDataStore: Looking for clones for dataset: ${datasetId}`);
    console.log(`ClientDataStore: Available clone keys in memory:`, Array.from(this.clones.keys()));
    
    let cloneList = this.clones.get(datasetId);

    // If not in memory, try IndexedDB
    if (!cloneList) {
      console.log(`ClientDataStore: Clones not in memory, checking IndexedDB...`);
      try {
        const cloneData = await indexedDBHelper.getItem('clones', datasetId);
        if (cloneData && cloneData.clones) {
          console.log(`ClientDataStore: Found ${cloneData.clones.length} clones in IndexedDB for ${datasetId}`);
          cloneList = cloneData.clones;
          this.clones.set(datasetId, cloneList);
        } else {
          console.log(`ClientDataStore: No clones in IndexedDB for ${datasetId}`);
          // Check what keys ARE in IndexedDB
          const allCloneData = await indexedDBHelper.getAllItems('clones');
          console.log(`ClientDataStore: Available clone keys in IndexedDB:`, allCloneData.map(c => c.dataset_id));
        }
      } catch (error) {
        console.warn('Failed to load clones from IndexedDB:', error);
      }
    } else {
      console.log(`ClientDataStore: Found ${cloneList.length} clones in memory for ${datasetId}`);
    }

    return cloneList || [];
  }

  /**
   * Get a specific tree by identifier
   * @param {string} treeIdent - Tree identifier
   * @returns {Promise<Object|null>} Tree object or null if not found
   */
  async getTree(treeIdent) {
    console.log('Looking for tree:', treeIdent);
    console.log('Available tree keys in memory:', Array.from(this.trees.keys()));

    let tree = this.trees.get(treeIdent);

    // If not in memory, try IndexedDB
    if (!tree) {
      try {
        tree = await indexedDBHelper.getItem('trees', treeIdent);
        if (tree) {
          this.trees.set(treeIdent, tree);
          console.log('Found tree in IndexedDB:', treeIdent);
        }
      } catch (error) {
        console.warn('Failed to load tree from IndexedDB:', error);
      }
    }

    if (!tree) {
      console.warn('Tree not found:', treeIdent);
      // Try to see what's in IndexedDB
      try {
        const allTrees = await indexedDBHelper.getAllItems('trees');
        console.log('Available tree keys in IndexedDB:', allTrees.map(t => t.ident));
      } catch (error) {
        console.warn('Failed to list trees from IndexedDB:', error);
      }
    }

    return tree || null;
  }

  /**
   * Remove a temporary dataset and all associated data
   * @param {string} datasetId - Dataset to remove
   */
  async removeDataset(datasetId) {
    // Remove from memory
    this.datasets.delete(datasetId);
    const cloneList = this.clones.get(datasetId);
    this.clones.delete(datasetId);

    // Remove associated trees
    if (cloneList) {
      cloneList.forEach((clone) => {
        if (clone.trees) {
          clone.trees.forEach((treeRef) => {
            this.trees.delete(treeRef.ident);
          });
        }
      });
    }

    // Remove from IndexedDB
    try {
      await indexedDBHelper.removeItem('datasets', datasetId);
      await indexedDBHelper.removeItem('clones', datasetId);
      
      // Remove associated trees from IndexedDB
      if (cloneList) {
        for (const clone of cloneList) {
          if (clone.trees) {
            for (const treeRef of clone.trees) {
              await indexedDBHelper.removeItem('trees', treeRef.ident);
            }
          }
        }
      }
      
      console.log('Removed dataset from IndexedDB:', datasetId);
    } catch (error) {
      console.warn('Failed to remove data from IndexedDB:', error);
    }
  }

  /**
   * Load data from IndexedDB into memory
   */
  async loadFromIndexedDB() {
    try {
      console.log('ClientDataStore: Loading data from IndexedDB...');
      
      const datasets = await indexedDBHelper.getAllItems('datasets');
      datasets.forEach((dataset) => {
        this.datasets.set(dataset.dataset_id, dataset);
      });
      
      console.log(`ClientDataStore: Loaded ${datasets.length} datasets from IndexedDB`);
    } catch (error) {
      console.warn('Failed to load datasets from IndexedDB:', error);
    }
  }

  /**
   * Clear all temporary data
   */
  async clearAllData() {
    this.datasets.clear();
    this.clones.clear();
    this.trees.clear();

    // Clear from IndexedDB
    try {
      await indexedDBHelper.clearAll();
      console.log('Cleared all data from IndexedDB');
    } catch (error) {
      console.warn('Failed to clear IndexedDB:', error);
    }
  }

  /**
   * Get summary of stored data
   * @returns {Promise<Object>} Data summary
   */
  async getStorageSummary() {
    const storageInfo = await indexedDBHelper.getStorageEstimate();
    
    return {
      datasets: this.datasets.size,
      clones: this.clones.size,
      trees: this.trees.size,
      memoryUsage: this.estimateMemoryUsage(),
      indexedDBUsage: storageInfo
    };
  }

  /**
   * Estimate memory usage (rough calculation)
   * @returns {string} Memory usage estimate
   */
  estimateMemoryUsage() {
    try {
      const dataSize = JSON.stringify({
        datasets: Array.from(this.datasets.values()),
        clones: Array.from(this.clones.entries()),
        trees: Array.from(this.trees.values())
      }).length;

      const mb = (dataSize / (1024 * 1024)).toFixed(2);
      return `~${mb} MB`;
    } catch (error) {
      return 'Unknown';
    }
  }
}

// Create a singleton instance
const clientDataStore = new ClientDataStore();

export default clientDataStore;