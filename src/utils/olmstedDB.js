/**
 * Dexie database for Olmsted client-side storage with lazy loading
 */

import Dexie from "dexie";

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
            // Lightweight clone metadata (no embedded trees)
            const cloneMeta = {
              clone_id: clone.clone_id,
              ident: clone.ident || clone.clone_id,
              dataset_id: clone.dataset_id || dataset_id,
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
              cdr1_alignment_start: clone.cdr1_alignment_start,
              cdr1_alignment_end: clone.cdr1_alignment_end,
              cdr2_alignment_start: clone.cdr2_alignment_start,
              cdr2_alignment_end: clone.cdr2_alignment_end,
              germline_alignment: clone.germline_alignment,
              has_seed: clone.has_seed,
              sample: clone.sample,
              // Paired data fields
              is_paired: clone.is_paired,
              light_chain_type: clone.light_chain_type,
              v_call_light: clone.v_call_light,
              j_call_light: clone.j_call_light,
              germline_alignment_light: clone.germline_alignment_light,
              cdr1_alignment_start_light: clone.cdr1_alignment_start_light,
              cdr1_alignment_end_light: clone.cdr1_alignment_end_light,
              cdr2_alignment_start_light: clone.cdr2_alignment_start_light,
              cdr2_alignment_end_light: clone.cdr2_alignment_end_light,
              junction_start_light: clone.junction_start_light,
              junction_length_light: clone.junction_length_light,
              // Store just references to trees, not full objects
              tree_ids: clone.trees ? clone.trees.map((t) => t.ident || t.tree_id) : []
            };

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
          tree_type: tree.tree_type
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
   * Get full tree data by tree identifier (heavy, loaded on demand)
   */
  async getTreeByIdent(treeIdent) {
    try {
      // Get complete tree by ident (now stored as complete object)
      const completeTree = await this.trees.where("ident").equals(treeIdent).first();

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
            // Light chain sequence data for paired families
            sequence_alignment_light: nodeData.sequence_alignment_light,
            sequence_alignment_light_aa: nodeData.sequence_alignment_light_aa,
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
        nodes: nodesArray // Convert from object to array format
      };

      return treeForSelectors;
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
            tree.ident.includes(cloneId) ||
            tree.tree_id.includes(cloneId)
        );
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
            // Light chain sequence data for paired families
            sequence_alignment_light: nodeData.sequence_alignment_light,
            sequence_alignment_light_aa: nodeData.sequence_alignment_light_aa,
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
        nodes: nodesArray // Convert from object to array format
      };

      return treeForSelectors;
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
      await this.transaction("rw", this.datasets, this.clones, this.trees, async () => {
        await this.datasets.clear();
        await this.clones.clear();
        await this.trees.clear();
      });
    } catch (error) {
      console.error("OlmstedDB: Failed to clear all data:", error);
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
      const stats = await this.transaction("r", this.datasets, this.clones, this.trees, async () => {
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
      console.error("OlmstedDB: Failed to get stats:", error);
      return { error: error.message };
    }
  }
}

// Create singleton instance
const olmstedDB = new OlmstedDB();

export default olmstedDB;
