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
            let dataset;
            
            // Handle gzipped files
            if (file.name.endsWith('.gz')) {
                throw new Error('Gzipped files not yet supported in client-side processing');
            }
            
            try {
                dataset = JSON.parse(content);
            } catch (parseError) {
                throw new Error('Invalid JSON format');
            }
            
            return this.processDataset(dataset, file.name);
        } catch (error) {
            throw new Error(`Failed to process AIRR file: ${error.message}`);
        }
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
            reader.onerror = () => reject(new Error('File reading failed'));
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
            throw new Error('Invalid AIRR format: missing or invalid clones array');
        }
        
        if (!dataset.samples || !Array.isArray(dataset.samples)) {
            throw new Error('Invalid AIRR format: missing or invalid samples array');
        }
        
        // Generate unique dataset ID for this session
        const datasetId = this.generateDatasetId();
        
        // Process dataset metadata (same logic as Python version)
        const processedDataset = {
            ...dataset,
            dataset_id: datasetId,
            clone_count: dataset.clones.length,
            subjects_count: new Set(dataset.clones.map(c => c.subject_id)).size,
            timepoints_count: new Set(dataset.samples.map(s => s.timepoint_id)).size,
            schema_version: "2.0.0",
            temporary: true,
            upload_time: new Date().toISOString(),
            original_filename: filename,
            ident: dataset.ident || this.generateUUID()
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
        
        const clones = clonesData.map(clone => {
            // Process each clone
            const processedClone = this.processClone(clone, dataset);
            
            // Extract trees and add to global trees array
            if (processedClone.trees && Array.isArray(processedClone.trees)) {
                processedClone.trees.forEach(tree => {
                    // Add full tree to trees array
                    trees.push({
                        ...tree,
                        clone_id: processedClone.clone_id || processedClone.ident,
                        ident: tree.ident || this.generateUUID()
                    });
                });
                
                // Keep only tree metadata in clone object (remove nodes for size)
                processedClone.trees = processedClone.trees.map(tree => {
                    const { nodes, ...treeMetadata } = tree;
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
            processedClone.trees = processedClone.trees.map(tree => ({
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
        return `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    
    /**
     * Generate a UUID v4
     * @returns {string} UUID string
     */
    static generateUUID() {
        // Use crypto.randomUUID if available (modern browsers)
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            return crypto.randomUUID();
        }
        
        // Fallback UUID v4 generator
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
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
            data &&
            typeof data === 'object' &&
            Array.isArray(data.clones) &&
            Array.isArray(data.samples) &&
            data.clones.length > 0
        );
    }
}

export default AIRRProcessor;