/**
 * Client-side data storage for processed AIRR data
 * Stores data in browser memory/sessionStorage instead of server
 */

class ClientDataStore {

  constructor() {
    this.datasets = new Map();
    this.clones = new Map();
    this.trees = new Map();
    this.storagePrefix = 'olmsted_temp_';
  }

  /**
     * Store processed AIRR data in browser storage
     * @param {Object} processedData - Data from AIRRProcessor
     */
  storeProcessedData(processedData) {
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

    // Also store in sessionStorage as backup
    try {
      console.log('ClientDataStore: Attempting to store in sessionStorage...');
      
      // Store datasets
      const datasetsJson = JSON.stringify(Array.from(this.datasets.values()));
      console.log(`ClientDataStore: Storing datasets (${(datasetsJson.length / 1024).toFixed(1)}KB)`);
      sessionStorage.setItem(`${this.storagePrefix}datasets`, datasetsJson);
      
      // Store clones
      Object.entries(clones).forEach(([id, cloneList]) => {
        const clonesJson = JSON.stringify(cloneList);
        console.log(`ClientDataStore: Storing clones for ${id} (${(clonesJson.length / 1024).toFixed(1)}KB)`);
        sessionStorage.setItem(`${this.storagePrefix}clones_${id}`, clonesJson);
      });
      
      // Store trees
      trees.forEach((tree) => {
        const treeJson = JSON.stringify(tree);
        console.log(`ClientDataStore: Storing tree ${tree.ident} (${(treeJson.length / 1024).toFixed(1)}KB)`);
        sessionStorage.setItem(`${this.storagePrefix}tree_${tree.ident}`, treeJson);
      });
      
      console.log('ClientDataStore: Successfully stored all data in sessionStorage');
      
    } catch (error) {
      console.error('ClientDataStore: Failed to store data in sessionStorage:', error);
      if (error.name === 'QuotaExceededError') {
        console.error('ClientDataStore: SessionStorage quota exceeded! Dataset too large for browser storage.');
        console.error('ClientDataStore: Data will be available in memory only during this session.');
        // Could implement fallback strategies here
      }
      // Continue without sessionStorage - data will be in memory only
    }

    return datasetId;
  }

  /**
     * Get all datasets (for datasets list view)
     * @returns {Array} Array of dataset objects
     */
  getAllDatasets() {
    const memoryDatasets = Array.from(this.datasets.values());

    // If no data in memory, try to load from sessionStorage
    if (memoryDatasets.length === 0) {
      this.loadFromSessionStorage();
      return Array.from(this.datasets.values());
    }

    return memoryDatasets;
  }

  /**
     * Get clones for a specific dataset
     * @param {string} datasetId - Dataset identifier
     * @returns {Array} Array of clone objects
     */
  getClones(datasetId) {
    console.log(`ClientDataStore: Looking for clones for dataset: ${datasetId}`);
    console.log(`ClientDataStore: Available clone keys in memory:`, Array.from(this.clones.keys()));
    
    let cloneList = this.clones.get(datasetId);

    // If not in memory, try sessionStorage
    if (!cloneList) {
      console.log(`ClientDataStore: Clones not in memory, checking sessionStorage...`);
      try {
        const stored = sessionStorage.getItem(`${this.storagePrefix}clones_${datasetId}`);
        if (stored) {
          console.log(`ClientDataStore: Found clones in sessionStorage for ${datasetId}`);
          cloneList = JSON.parse(stored);
          this.clones.set(datasetId, cloneList);
        } else {
          console.log(`ClientDataStore: No clones in sessionStorage for ${datasetId}`);
          // Check what keys ARE in sessionStorage
          const storageKeys = Object.keys(sessionStorage).filter(k => k.startsWith(this.storagePrefix + 'clones_'));
          console.log(`ClientDataStore: Available clone keys in sessionStorage:`, storageKeys.map(k => k.replace(this.storagePrefix + 'clones_', '')));
        }
      } catch (error) {
        console.warn('Failed to load clones from sessionStorage:', error);
      }
    } else {
      console.log(`ClientDataStore: Found ${cloneList.length} clones in memory for ${datasetId}`);
    }

    return cloneList || [];
  }

  /**
     * Get a specific tree by identifier
     * @param {string} treeIdent - Tree identifier
     * @returns {Object|null} Tree object or null if not found
     */
  getTree(treeIdent) {
    console.log('Looking for tree:', treeIdent);
    console.log('Available tree keys in memory:', Array.from(this.trees.keys()));

    let tree = this.trees.get(treeIdent);

    // If not in memory, try sessionStorage
    if (!tree) {
      try {
        const stored = sessionStorage.getItem(`${this.storagePrefix}tree_${treeIdent}`);
        if (stored) {
          tree = JSON.parse(stored);
          this.trees.set(treeIdent, tree);
          console.log('Found tree in sessionStorage:', treeIdent);
        }
      } catch (error) {
        console.warn('Failed to load tree from sessionStorage:', error);
      }
    }

    if (!tree) {
      console.warn('Tree not found:', treeIdent);
      // Try to see what's in sessionStorage
      const storageKeys = Object.keys(sessionStorage).filter((k) => k.startsWith(this.storagePrefix + 'tree_'));
      console.log('Available tree keys in sessionStorage:', storageKeys.map((k) => k.replace(this.storagePrefix + 'tree_', '')));
    }

    return tree || null;
  }

  /**
     * Remove a temporary dataset and all associated data
     * @param {string} datasetId - Dataset to remove
     */
  removeDataset(datasetId) {
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
            // Remove from sessionStorage
            try {
              sessionStorage.removeItem(`${this.storagePrefix}tree_${treeRef.ident}`);
            } catch (error) {
              console.warn('Failed to remove tree from sessionStorage:', error);
            }
          });
        }
      });
    }

    // Remove from sessionStorage
    try {
      sessionStorage.removeItem(`${this.storagePrefix}clones_${datasetId}`);
      // Update datasets in sessionStorage
      const remainingDatasets = Array.from(this.datasets.values());
      sessionStorage.setItem(`${this.storagePrefix}datasets`, JSON.stringify(remainingDatasets));
    } catch (error) {
      console.warn('Failed to remove data from sessionStorage:', error);
    }
  }

  /**
     * Load data from sessionStorage into memory
     */
  loadFromSessionStorage() {
    try {
      const datasetsJson = sessionStorage.getItem(`${this.storagePrefix}datasets`);
      if (datasetsJson) {
        const datasets = JSON.parse(datasetsJson);
        datasets.forEach((dataset) => {
          this.datasets.set(dataset.dataset_id, dataset);
        });
      }
    } catch (error) {
      console.warn('Failed to load datasets from sessionStorage:', error);
    }
  }

  /**
     * Clear all temporary data
     */
  clearAllData() {
    this.datasets.clear();
    this.clones.clear();
    this.trees.clear();

    // Clear from sessionStorage
    try {
      const keys = Object.keys(sessionStorage);
      keys.forEach((key) => {
        if (key.startsWith(this.storagePrefix)) {
          sessionStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.warn('Failed to clear sessionStorage:', error);
    }
  }

  /**
     * Get summary of stored data
     * @returns {Object} Data summary
     */
  getStorageSummary() {
    return {
      datasets: this.datasets.size,
      clones: this.clones.size,
      trees: this.trees.size,
      memoryUsage: this.estimateMemoryUsage()
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
