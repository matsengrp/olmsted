/**
 * Split file processor for handling multiple AIRR JSON files
 * Combines split datasets, clones, and trees files back into a unified structure
 */

class SplitFileProcessor {

  /**
     * Process multiple uploaded files that may represent split AIRR data
     * @param {File[]} files - Array of uploaded files
     * @returns {Promise<Object>} Processed data structure or null if not split format
     */
  static async processFiles(files) {
    try {
      // Read all files with proper error handling for each file
      const fileContents = await Promise.all(
        files.map(async (file) => {
          try {
            const fileContent = await this.readFile(file);
            let parsedContent;
            
            try {
              parsedContent = JSON.parse(fileContent);
            } catch (parseError) {
              throw new Error(`Failed to parse JSON from ${file.name}: ${parseError.message}`);
            }
            
            return {
              name: file.name,
              content: parsedContent,
              originalFile: file
            };
          } catch (error) {
            // Include file name in error for better debugging
            throw new Error(`Error processing file "${file.name}": ${error.message}`);
          }
        })
      );

      // Check if this looks like split format
      if (!this.isSplitFormat(fileContents)) {
        return null; // Not split format, let single file processor handle it
      }

      console.log('Detected split AIRR format, combining files...');

      // Categorize files
      const datasets = this.extractDatasets(fileContents);
      const clones = this.extractClones(fileContents);
      const trees = this.extractTrees(fileContents);

      if (datasets.length === 0) {
        throw new Error('No dataset files found. Expected at least one datasets.json file.');
      }

      // Combine into unified structure for each dataset
      const processedResults = datasets.map((dataset) => {
        const datasetId = dataset.dataset_id || dataset.ident;

        // Find clones for this dataset
        const datasetClones = clones.filter((clone) => clone.dataset_id === datasetId
                    || clone.sample_id === datasetId
                    // If no explicit dataset_id, assume they belong together
                    || (!clone.dataset_id && datasets.length === 1));

        // Find trees for this dataset
        const datasetTrees = trees.filter((tree) => tree.clone_id && datasetClones.some((clone) => clone.clone_id === tree.clone_id
                        || clone.ident === tree.clone_id));

        // Create consolidated dataset structure
        const consolidatedDataset = {
          ...dataset,
          clones: datasetClones,
          // Add samples array if not present (required for AIRR validation)
          samples: dataset.samples || this.inferSamplesFromClones(datasetClones)
        };

        return {
          dataset: consolidatedDataset,
          trees: datasetTrees,
          originalFiles: files.map((f) => f.name)
        };
      });

      // For now, handle only single dataset uploads
      // Could be extended to handle multiple datasets
      if (processedResults.length > 1) {
        throw new Error('Multiple datasets found. Please upload one dataset at a time.');
      }

      const result = processedResults[0];

      console.log('Split file processing complete:', {
        datasets: 1,
        clones: result.dataset.clones.length,
        trees: result.trees.length,
        files: files.length
      });

      return {
        consolidatedDataset: result.dataset,
        trees: result.trees,
        fileCount: files.length,
        originalFiles: result.originalFiles
      };

    } catch (error) {
      throw new Error(`Failed to process split files: ${error.message}`);
    }
  }

  /**
     * Check if the uploaded files represent split format
     * @param {Array} fileContents - Array of {name, content} objects
     * @returns {boolean} Whether this appears to be split format
     */
  static isSplitFormat(fileContents) {
    const fileNames = fileContents.map((f) => f.name.toLowerCase());

    // Look for characteristic split file patterns
    const hasDatasetFile = fileNames.some((name) => name.includes('dataset'));
    const hasClonesFiles = fileNames.some((name) => name.includes('clones.'));
    const hasTreeFiles = fileNames.some((name) => name.includes('tree.'));

    // Also check file contents
    const hasArrayContent = fileContents.some((f) => Array.isArray(f.content));
    const hasDatasetContent = fileContents.some((f) => f.content && typeof f.content === 'object'
            && f.content.dataset_id && !Array.isArray(f.content));

    // Consider it split format if we have multiple files with either:
    // 1. Characteristic naming patterns, OR
    // 2. Mixed array/object content structure
    return fileContents.length > 1 && (
      (hasDatasetFile && (hasClonesFiles || hasTreeFiles))
            || (hasArrayContent && hasDatasetContent)
    );
  }

  /**
     * Extract dataset objects from file contents
     * @param {Array} fileContents - Array of {name, content} objects
     * @returns {Array} Array of dataset objects
     */
  static extractDatasets(fileContents) {
    const datasets = [];

    for (const file of fileContents) {
      const {content} = file;

      // Check if this is a dataset file
      if (this.isDatasetContent(content)) {
        if (Array.isArray(content)) {
          // Array of datasets
          datasets.push(...content);
        } else {
          // Single dataset
          datasets.push(content);
        }
      }
    }

    return datasets;
  }

  /**
     * Extract clone objects from file contents
     * @param {Array} fileContents - Array of {name, content} objects
     * @returns {Array} Array of clone objects
     */
  static extractClones(fileContents) {
    const allClones = [];

    for (const file of fileContents) {
      const {content} = file;

      // Check if this is a clones file
      if (this.isClonesContent(content)) {
        if (Array.isArray(content)) {
          allClones.push(...content);
        } else if (content.clone_id || content.ident) {
          // Single clone object
          allClones.push(content);
        }
      }
    }

    return allClones;
  }

  /**
     * Extract tree objects from file contents
     * @param {Array} fileContents - Array of {name, content} objects
     * @returns {Array} Array of tree objects
     */
  static extractTrees(fileContents) {
    const allTrees = [];

    for (const file of fileContents) {
      const {content} = file;

      // Check if this is a tree file
      if (this.isTreeContent(content)) {
        if (Array.isArray(content)) {
          allTrees.push(...content);
        } else if (content.newick || content.tree_id || content.ident) {
          // Single tree object
          allTrees.push(content);
        }
      }
    }

    return allTrees;
  }

  /**
     * Check if content represents a dataset
     * @param {*} content - File content to check
     * @returns {boolean} Whether this is dataset content
     */
  static isDatasetContent(content) {
    if (Array.isArray(content)) {
      return content.length > 0 && content.every((item) => item && typeof item === 'object'
                && (item.dataset_id || item.ident)
                && !item.clone_id && !item.newick);
    }

    return content && typeof content === 'object'
            && (content.dataset_id || content.ident)
            && !content.clone_id && !content.newick && !Array.isArray(content);
  }

  /**
     * Check if content represents clones
     * @param {*} content - File content to check
     * @returns {boolean} Whether this is clones content
     */
  static isClonesContent(content) {
    if (Array.isArray(content)) {
      return content.length > 0 && content.every((item) => item && typeof item === 'object'
                && (item.clone_id || item.ident)
                && !item.newick && !item.dataset_id);
    }

    return content && typeof content === 'object'
            && (content.clone_id || content.ident)
            && !content.dataset_id && !content.newick && !Array.isArray(content);
  }

  /**
     * Check if content represents trees
     * @param {*} content - File content to check
     * @returns {boolean} Whether this is tree content
     */
  static isTreeContent(content) {
    if (Array.isArray(content)) {
      return content.length > 0 && content.every((item) => item && typeof item === 'object'
                && (item.newick || item.tree_id));
    }

    return content && typeof content === 'object'
            && (content.newick || content.tree_id) && !Array.isArray(content);
  }

  /**
     * Infer samples array from clones if not present in dataset
     * @param {Array} clones - Array of clone objects
     * @returns {Array} Inferred samples array
     */
  static inferSamplesFromClones(clones) {
    const sampleIds = new Set();
    const samples = [];

    for (const clone of clones) {
      const sampleId = clone.sample_id || clone.subject_id || 'unknown';
      if (!sampleIds.has(sampleId)) {
        sampleIds.add(sampleId);
        samples.push({
          sample_id: sampleId,
          timepoint_id: clone.timepoint_id || 'unknown',
          locus: clone.locus || 'IGH', // Default to IGH
          // Add other sample metadata if available in clones
          subject_id: clone.subject_id
        });
      }
    }

    return samples;
  }

  /**
     * Read file content using FileReader API
     * @param {File} file - File to read
     * @returns {Promise<string>} File content as string
     */
  static readFile(file) {
    return new Promise((resolve, reject) => {
      if (!file) {
        reject(new Error('No file provided'));
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (error) => {
        reject(new Error(`Failed to read file "${file.name}": ${error.message || 'Unknown error'}`));
      };
      
      try {
        reader.readAsText(file);
      } catch (error) {
        reject(new Error(`Failed to initiate file read for "${file.name}": ${error.message}`));
      }
    });
  }
}

export default SplitFileProcessor;
