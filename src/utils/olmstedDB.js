/**
 * Dexie database for Olmsted client-side storage with lazy loading
 */

import Dexie from 'dexie';

class OlmstedDB extends Dexie {
  constructor() {
    super('OlmstedClientStorage_v3'); // Bump version for compound key fix
    
    // Define database schema with separate stores for lazy loading
    this.version(1).stores({
      // Dataset metadata (always loaded)
      datasets: 'dataset_id, name, clone_count',
      
      // Clone family metadata (lightweight, loaded for lists)
      clones: '[dataset_id+clone_id], dataset_id, sample_id, name, unique_seqs_count, mean_mut_freq',
      
      // Complete tree data (heavy, loaded on demand per family)
      trees: 'tree_id, clone_id, ident'
    });

    // Check for old database and prompt user if needed
    this.checkAndPromptForOldDatabase();
    
    // Add hooks for logging (optional)
    this.open().catch(error => {
      console.error('Failed to open OlmstedDB:', error);
    });
  }

  /**
   * Check for old database and prompt user for migration
   */
  async checkAndPromptForOldDatabase() {
    try {
      // Check if old database exists
      const databases = await Dexie.getDatabaseNames();
      const hasOldDatabase = databases.includes('OlmstedClientStorage') || databases.includes('OlmstedClientStorage_v2');
      
      if (hasOldDatabase) {
        console.log('OlmstedDB: Found old database format');
        
        // Prompt user about database upgrade
        const userConfirmed = window.confirm(
          'Olmsted has been upgraded with improved performance for large datasets.\n\n' +
          'This requires clearing your previously uploaded datasets and starting fresh.\n\n' +
          'Click OK to proceed with the upgrade and clear old data, or Cancel to continue with potential compatibility issues.\n\n' +
          'Note: Server datasets and bookmarks are not affected.'
        );
        
        if (userConfirmed) {
          await Dexie.delete('OlmstedClientStorage');
          await Dexie.delete('OlmstedClientStorage_v2');
          console.log('OlmstedDB: User approved - cleared old databases');
          
          // Show success message
          setTimeout(() => {
            alert('Database upgrade completed! You can now upload datasets with improved performance.');
          }, 100);
        } else {
          console.warn('OlmstedDB: User declined database upgrade - potential compatibility issues may occur');
          
          // Show warning message
          setTimeout(() => {
            alert('Database upgrade declined. You may experience issues with client-side dataset storage. Please refresh and accept the upgrade for best performance.');
          }, 100);
        }
      } else {
        console.log('OlmstedDB: No old database found - fresh installation');
      }
    } catch (error) {
      console.error('OlmstedDB: Failed to check for old database:', error);
    }
  }

  /**
   * Store complete dataset with lazy loading structure
   */
  async storeDataset(processedData) {
    const { datasets, clones, trees, datasetId } = processedData;
    
    console.log('OlmstedDB: Storing dataset with ID:', datasetId);
    console.log('OlmstedDB: Datasets to store:', datasets.length);
    console.log('OlmstedDB: Clone groups:', Object.keys(clones));
    console.log('OlmstedDB: Trees to store:', trees.length);
    
    try {
      await this.transaction('rw', this.datasets, this.clones, this.trees, async () => {
        // Store dataset metadata
        for (const dataset of datasets) {
          await this.datasets.put(dataset);
        }
        
        // Store clone metadata and separate heavy data
        for (const [dataset_id, cloneList] of Object.entries(clones)) {
          console.log(`OlmstedDB: Storing ${cloneList.length} clones for dataset_id: ${dataset_id}`);
          for (const clone of cloneList) {
            // Lightweight clone metadata (no embedded trees)
            const finalDatasetId = clone.dataset_id || dataset_id;
            console.log(`OlmstedDB: Clone ${clone.clone_id} -> dataset_id: ${finalDatasetId}`);
            const cloneMeta = {
              clone_id: clone.clone_id,
              ident: clone.ident || clone.clone_id,
              dataset_id: finalDatasetId,
              subject_id: clone.subject_id,
              sample_id: clone.sample_id || (clone.sample ? clone.sample.sample_id : null),
              name: clone.name || clone.clone_id,
              unique_seqs_count: clone.unique_seqs_count,
              mean_mut_freq: clone.mean_mut_freq,
              junction_length: clone.junction_length,
              junction_start: clone.junction_start,
              v_call: clone.v_call,
              d_call: clone.d_call,
              j_call: clone.j_call,
              v_alignment_start: clone.v_alignment_start,
              v_alignment_end: clone.v_alignment_end,
              d_alignment_start: clone.d_alignment_start,
              d_alignment_end: clone.d_alignment_end,
              j_alignment_start: clone.j_alignment_start,
              j_alignment_end: clone.j_alignment_end,
              germline_alignment: clone.germline_alignment,
              has_seed: clone.has_seed,
              sample: clone.sample,
              // Store just references to trees, not full objects
              tree_ids: clone.trees ? clone.trees.map(t => t.ident || t.tree_id) : []
            };
            
            await this.clones.put(cloneMeta);
          }
          
        }
        
        // Store complete tree data (like SessionStorage did)
        for (const tree of trees) {
          
          // Store the complete tree object with all nodes intact
          const completeTreeData = {
            tree_id: tree.tree_id,
            ident: tree.ident,
            clone_id: tree.clone_id,
            newick: tree.newick,
            root_node: tree.root_node,
            nodes: tree.nodes, // Store complete nodes object as-is
            // Add any other tree properties that might be needed
            downsampling_strategy: tree.downsampling_strategy,
            tree_type: tree.tree_type
          };
          
          await this.trees.put(completeTreeData);
        }
        
      });
      
      
      return datasetId;
      
    } catch (error) {
      console.error('OlmstedDB: Failed to store dataset:', error);
      throw error;
    }
  }

  /**
   * Get all datasets (lightweight)
   */
  async getAllDatasets() {
    try {
      const datasets = await this.datasets.orderBy('name').toArray();
      return datasets;
    } catch (error) {
      console.error('OlmstedDB: Failed to get datasets:', error);
      return [];
    }
  }

  /**
   * Get clone metadata for a dataset (lightweight, no sequences)
   */
  async getCloneMetadata(datasetId) {
    try {
      console.log('OlmstedDB: Searching for clones with dataset_id:', datasetId);
      
      // Debug: Get all clones to see what's actually stored
      const allClones = await this.clones.toArray();
      console.log('OlmstedDB: All stored clones:', allClones.length);
      if (allClones.length > 0) {
        console.log('OlmstedDB: Sample clone dataset_ids:', allClones.slice(0, 3).map(c => c.dataset_id));
      }
      
      const clones = await this.clones
        .where('dataset_id')
        .equals(datasetId)
        .toArray();
      
      console.log('OlmstedDB: Found clones for dataset:', clones.length);
      return clones;
    } catch (error) {
      console.error('OlmstedDB: Failed to get clone metadata:', error);
      return [];
    }
  }

  /**
   * Get full tree data by tree identifier (heavy, loaded on demand)
   */
  async getTreeByIdent(treeIdent) {
    try {
      
      // Get complete tree by ident (now stored as complete object)
      const completeTree = await this.trees.where('ident').equals(treeIdent).first();
      
      if (!completeTree) {
        return null;
      }
      
      // Convert nodes from object format to array format expected by tree selectors
      const nodesArray = [];
      if (completeTree.nodes) {
        for (const [nodeId, nodeData] of Object.entries(completeTree.nodes)) {
          const nodeForSelector = {
            sequence_id: nodeId, // IMPORTANT: Use sequence_id not node_id for tree selectors
            parent: nodeData.parent,
            sequence_alignment: nodeData.sequence_alignment,
            sequence_alignment_aa: nodeData.sequence_alignment_aa,
            distance: nodeData.distance,
            length: nodeData.length,
            lbi: nodeData.lbi,
            lbr: nodeData.lbr,
            affinity: nodeData.affinity,
            type: nodeData.type,
            multiplicity: nodeData.multiplicity,
            timepoint_multiplicities: nodeData.timepoint_multiplicities
          };
          nodesArray.push(nodeForSelector);
        }
      }
      
      // Return tree with nodes array (tree selectors expect this format)
      const treeForSelectors = {
        ...completeTree,
        nodes: nodesArray  // Convert from object to array format
      };
      
      return treeForSelectors;
      
    } catch (error) {
      console.error('OlmstedDB: Failed to get tree by ident:', error);
      return null;
    }
  }

  /**
   * Get full tree data for a specific clone (heavy, loaded on demand)
   */
  async getTreeForClone(cloneId) {
    try {
      
      // Get complete tree - try both by clone_id and by ident
      let completeTree = await this.trees.where('clone_id').equals(cloneId).first();
      
      if (!completeTree) {
        // Try searching by ident field (tree identifier)
        completeTree = await this.trees.where('ident').equals(cloneId).first();
      }
      
      if (!completeTree) {
        // Try partial matching - sometimes tree ident contains clone_id
        const allTrees = await this.trees.toArray();
        completeTree = allTrees.find(tree => 
          tree.clone_id === cloneId || 
          tree.ident === cloneId ||
          tree.ident.includes(cloneId) ||
          tree.tree_id.includes(cloneId)
        );
        
        if (completeTree) {
        }
      }
      
      if (!completeTree) {
        console.warn(`OlmstedDB: No tree found for clone ${cloneId}`);
        return null;
      }
      
      // Convert nodes from object format to array format expected by tree selectors
      const nodesArray = [];
      if (completeTree.nodes) {
        for (const [nodeId, nodeData] of Object.entries(completeTree.nodes)) {
          const nodeForSelector = {
            sequence_id: nodeId, // IMPORTANT: Use sequence_id not node_id for tree selectors
            parent: nodeData.parent,
            sequence_alignment: nodeData.sequence_alignment,
            sequence_alignment_aa: nodeData.sequence_alignment_aa,
            distance: nodeData.distance,
            length: nodeData.length,
            lbi: nodeData.lbi,
            lbr: nodeData.lbr,
            affinity: nodeData.affinity,
            type: nodeData.type,
            multiplicity: nodeData.multiplicity,
            timepoint_multiplicities: nodeData.timepoint_multiplicities
          };
          nodesArray.push(nodeForSelector);
        }
      }
      
      // Return tree with nodes array (tree selectors expect this format)
      const treeForSelectors = {
        ...completeTree,
        nodes: nodesArray  // Convert from object to array format
      };
      
      return treeForSelectors;
      
    } catch (error) {
      console.error('OlmstedDB: Failed to get tree for clone:', error);
      return null;
    }
  }

  /**
   * Remove a dataset and all associated data
   */
  async removeDataset(datasetId) {
    try {
      await this.transaction('rw', this.datasets, this.clones, this.trees, async () => {
        // Get all clones for this dataset
        const clones = await this.clones.where('dataset_id').equals(datasetId).toArray();
        const cloneIds = clones.map(c => c.clone_id);
        
        // Remove dataset
        await this.datasets.delete(datasetId);
        
        // Remove clones
        await this.clones.where('dataset_id').equals(datasetId).delete();
        
        // Remove trees for these clones
        for (const cloneId of cloneIds) {
          await this.trees.where('clone_id').equals(cloneId).delete();
        }
      });
      
    } catch (error) {
      console.error('OlmstedDB: Failed to remove dataset:', error);
    }
  }

  /**
   * Clear all data
   */
  async clearAll() {
    try {
      await this.transaction('rw', this.datasets, this.clones, this.trees, async () => {
        await this.datasets.clear();
        await this.clones.clear();
        await this.trees.clear();
      });
      
    } catch (error) {
      console.error('OlmstedDB: Failed to clear all data:', error);
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
    return { message: 'Storage estimation not supported' };
  }

  /**
   * Get database statistics
   */
  async getStats() {
    try {
      const stats = await this.transaction('r', this.datasets, this.clones, this.trees, async () => {
        const datasetCount = await this.datasets.count();
        const cloneCount = await this.clones.count();
        const treeCount = await this.trees.count();
        
        return {
          datasets: datasetCount,
          clones: cloneCount,
          trees: treeCount
        };
      });
      
      return stats;
    } catch (error) {
      console.error('OlmstedDB: Failed to get stats:', error);
      return { error: error.message };
    }
  }
}

// Create singleton instance
const olmstedDB = new OlmstedDB();

export default olmstedDB;