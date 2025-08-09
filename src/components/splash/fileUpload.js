import React from 'react';
import Dropzone from 'react-dropzone';
import { CenterContent } from "./centerContent";
import AIRRProcessor from '../../utils/airrProcessor';
import SplitFileProcessor from '../../utils/splitFileProcessor';
import clientDataStore from '../../utils/clientDataStore';

class FileUpload extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      uploadedFiles: [],
      isProcessing: false,
      error: null
    };
    
    this.processFile = this.processFile.bind(this);
    this.onDrop = this.onDrop.bind(this);
    this.removeFile = this.removeFile.bind(this);
  }

  async processFile(file) {
    this.setState({ error: null, isProcessing: true });

    try {
      // Detect file type based on extension
      const fileName = file.name.toLowerCase();
      let fileType = null;

      if (fileName.endsWith('.json')) {
        fileType = 'airr';
      } else if (fileName.endsWith('.gz')) {
        // Check the extension before .gz
        if (fileName.includes('.json.gz')) {
          fileType = 'airr';
          // Note: gzip support would need additional implementation
          throw new Error('Gzipped files are not yet supported. Please upload uncompressed JSON files.');
        }
      }

      if (!fileType) {
        throw new Error('Unsupported file type. Please upload AIRR JSON files (.json). For split files, select all files together (datasets.json, clones.*.json, tree.*.json).');
      }

      // Process file entirely client-side - no server communication!
      console.log('Processing file client-side:', file.name);
      const result = await AIRRProcessor.processFile(file);
      
      // Store processed data in browser
      const datasetId = clientDataStore.storeProcessedData(result);
      
      // Add to uploaded files list
      this.setState(prevState => ({
        uploadedFiles: [...prevState.uploadedFiles, {
          fileName: file.name,
          datasetId: datasetId,
          fileType,
          dataset: result.datasets[0],
          success: true
        }]
      }));

      // Notify parent component with processed data
      if (this.props.onFileUpload) {
        this.props.onFileUpload({
          datasetId: datasetId,
          dataset: result.datasets[0],
          success: true
        });
      }
      
      // Trigger datasets reload by refreshing the page
      // In a production app, we'd dispatch a Redux action to reload datasets
      setTimeout(() => {
        window.location.reload();
      }, 1000);

      console.log('Client-side processing complete:', {
        datasetId,
        datasets: result.datasets.length,
        clones: Object.keys(result.clones).length,
        trees: result.trees.length
      });

    } catch (err) {
      console.error('Client-side file processing error:', err);
      this.setState({ error: err.message || 'Failed to process file' });
    } finally {
      this.setState({ isProcessing: false });
    }
  }

  async onDrop(acceptedFiles) {
    this.setState({ error: null, isProcessing: true });

    try {
      // Check if we have multiple files that might be split format
      if (acceptedFiles.length > 1) {
        console.log(`Processing ${acceptedFiles.length} files, checking for split format...`);
        
        // Try split file processing first
        const splitResult = await SplitFileProcessor.processFiles(acceptedFiles);
        
        if (splitResult) {
          // Successfully processed as split format
          console.log('Processed as split format:', splitResult);
          
          // Process the consolidated dataset using AIRR processor
          const consolidatedResult = await AIRRProcessor.processDataset(
            splitResult.consolidatedDataset,
            `Split files (${splitResult.fileCount} files)`
          );
          
          // Merge in the trees from split processing
          consolidatedResult.trees = [...consolidatedResult.trees, ...splitResult.trees];
          
          // Store processed data
          const datasetId = clientDataStore.storeProcessedData(consolidatedResult);
          
          // Update UI
          this.setState(prevState => ({
            uploadedFiles: [...prevState.uploadedFiles, {
              fileName: `Split format (${acceptedFiles.length} files)`,
              datasetId: datasetId,
              fileType: 'airr-split',
              dataset: consolidatedResult.datasets[0],
              success: true,
              fileCount: acceptedFiles.length,
              originalFiles: splitResult.originalFiles
            }],
            isProcessing: false
          }));
          
          // Notify parent
          if (this.props.onFileUpload) {
            this.props.onFileUpload({
              datasetId: datasetId,
              dataset: consolidatedResult.datasets[0],
              success: true
            });
          }
          
          // Reload to show new dataset
          setTimeout(() => {
            window.location.reload();
          }, 1000);
          
          return; // Successfully processed as split
        }
      }
      
      // Process as individual consolidated files
      for (const file of acceptedFiles) {
        await this.processFile(file);
      }
      
    } catch (error) {
      console.error('Error processing files:', error);
      this.setState({ 
        error: error.message || 'Failed to process files',
        isProcessing: false 
      });
    }
  }

  removeFile(datasetId) {
    this.setState(prevState => ({
      uploadedFiles: prevState.uploadedFiles.filter(f => f.datasetId !== datasetId)
    }));
    
    // Remove data from client-side storage
    clientDataStore.removeDataset(datasetId);
    console.log('Removed dataset from client storage:', datasetId);
  }

  render() {
    const { uploadedFiles, isProcessing, error } = this.state;

    return (
      <CenterContent>
        <div style={{ marginTop: 40, marginBottom: 40 }}>
          <h3 style={{ textAlign: 'center', marginBottom: 20 }}>
            Or upload your own data
          </h3>
          
          <Dropzone
            onDrop={this.onDrop}
            accept="application/json, application/gzip, .json, .gz"
            multiple={true}
            disabled={isProcessing}
            style={{
              border: '2px dashed #ccc',
              borderRadius: 10,
              padding: 40,
              textAlign: 'center',
              cursor: 'pointer',
              backgroundColor: '#fafafa',
              transition: 'background-color 0.2s',
              opacity: isProcessing ? 0.6 : 1,
              minHeight: 150,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center'
            }}
            activeStyle={{
              backgroundColor: '#f0f0f0'
            }}
          >
            {isProcessing ? (
              <div>
                <div style={{ fontSize: 18, marginBottom: 10 }}>Processing...</div>
                <div style={{ fontSize: 14, color: '#666' }}>
                  Please wait while we process your data
                </div>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: 20, marginBottom: 10 }}>
                  Drag & drop files here
                </div>
                <div style={{ fontSize: 14, color: '#666', marginBottom: 10 }}>
                  or click to browse
                </div>
                <div style={{ fontSize: 12, color: '#999' }}>
                  <strong>Supported formats:</strong> AIRR JSON (.json only)
                  <br />
                  • Single consolidated file from olmsted-cli (recommended)
                  <br />
                  • Multiple split files together (datasets.json, clones.*.json, tree.*.json)
                  <br />
                  <span style={{ color: '#c90', fontWeight: 'bold' }}>
                    Note: PCP CSV files must be converted to AIRR format using olmsted-cli first:
                  </span>
                  <br />
                  <code style={{ fontSize: 11, backgroundColor: '#f5f5f5', padding: '2px 4px', borderRadius: 2 }}>
                    olmsted process -i data.csv -o output.json -f pcp
                  </code>
                </div>
              </div>
            )}
          </Dropzone>

          {error && (
            <div style={{
              marginTop: 20,
              padding: 10,
              backgroundColor: '#fee',
              border: '1px solid #fcc',
              borderRadius: 5,
              color: '#c00',
              textAlign: 'center'
            }}>
              {error}
            </div>
          )}

          {uploadedFiles.length > 0 && (
            <div style={{ marginTop: 30 }}>
              <h4>Uploaded Files:</h4>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                {uploadedFiles.map(file => (
                  <li key={file.datasetId} style={{
                    padding: 10,
                    marginBottom: 5,
                    backgroundColor: '#f5f5f5',
                    borderRadius: 5,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <strong>{file.fileName}</strong>
                      <span style={{ marginLeft: 10, color: '#666' }}>
                        ({file.fileType === 'airr-split' ? 'AIRR Split' : file.fileType.toUpperCase()} format)
                      </span>
                      {file.dataset && file.dataset.clone_count && (
                        <span style={{ marginLeft: 10, color: '#666' }}>
                          - {file.dataset.clone_count} clonal families
                        </span>
                      )}
                      {file.fileCount && (
                        <div style={{ fontSize: 11, color: '#888', marginTop: 3 }}>
                          Files: {file.originalFiles ? file.originalFiles.join(', ') : `${file.fileCount} files`}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => this.removeFile(file.datasetId)}
                      style={{
                        padding: '5px 10px',
                        backgroundColor: '#dc3545',
                        color: 'white',
                        border: 'none',
                        borderRadius: 3,
                        cursor: 'pointer',
                        fontSize: 12
                      }}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </CenterContent>
    );
  }
}

export default FileUpload;