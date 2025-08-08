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
        const { datasets, clones, trees, datasetId } = processedData;
        
        // Store in memory for immediate access
        datasets.forEach(dataset => {
            this.datasets.set(dataset.dataset_id, dataset);
        });
        
        Object.entries(clones).forEach(([id, cloneList]) => {
            this.clones.set(id, cloneList);
        });
        
        trees.forEach(tree => {
            this.trees.set(tree.ident, tree);
        });
        
        // Also store in sessionStorage as backup
        try {
            sessionStorage.setItem(`${this.storagePrefix}datasets`, JSON.stringify(Array.from(this.datasets.values())));
            Object.entries(clones).forEach(([id, cloneList]) => {
                sessionStorage.setItem(`${this.storagePrefix}clones_${id}`, JSON.stringify(cloneList));
            });
            trees.forEach(tree => {
                sessionStorage.setItem(`${this.storagePrefix}tree_${tree.ident}`, JSON.stringify(tree));
            });
        } catch (error) {
            console.warn('Failed to store data in sessionStorage:', error);
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
        let cloneList = this.clones.get(datasetId);
        
        // If not in memory, try sessionStorage
        if (!cloneList) {
            try {
                const stored = sessionStorage.getItem(`${this.storagePrefix}clones_${datasetId}`);
                if (stored) {
                    cloneList = JSON.parse(stored);
                    this.clones.set(datasetId, cloneList);
                }
            } catch (error) {
                console.warn('Failed to load clones from sessionStorage:', error);
            }
        }
        
        return cloneList || [];
    }
    
    /**
     * Get a specific tree by identifier
     * @param {string} treeIdent - Tree identifier
     * @returns {Object|null} Tree object or null if not found
     */
    getTree(treeIdent) {
        let tree = this.trees.get(treeIdent);
        
        // If not in memory, try sessionStorage
        if (!tree) {
            try {
                const stored = sessionStorage.getItem(`${this.storagePrefix}tree_${treeIdent}`);
                if (stored) {
                    tree = JSON.parse(stored);
                    this.trees.set(treeIdent, tree);
                }
            } catch (error) {
                console.warn('Failed to load tree from sessionStorage:', error);
            }
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
            cloneList.forEach(clone => {
                if (clone.trees) {
                    clone.trees.forEach(treeRef => {
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
                datasets.forEach(dataset => {
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
            keys.forEach(key => {
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