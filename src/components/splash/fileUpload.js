import React from "react";
import Dropzone from "react-dropzone";
import { FiUpload } from "react-icons/fi";
import { CenterContent } from "./centerContent";
import FileProcessor from "../../utils/fileProcessor";
import SplitFileProcessor from "../../utils/splitFileProcessor";
import clientDataStore from "../../utils/clientDataStore";
import { getClientDatasets } from "../../actions/clientDataLoader";
import { SimpleInProgress } from "../util/loading";

class FileUpload extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      uploadedFiles: [],
      isProcessing: false,
      error: null,
      loadingStage: "",
      loadingProgress: 0,
      dropzoneHovered: false,
      removeHoveredId: null
    };

    this.processFile = this.processFile.bind(this);
    this.onDrop = this.onDrop.bind(this);
    this.removeFile = this.removeFile.bind(this);
    this.updateLoadingStatus = this.updateLoadingStatus.bind(this);
    this.fileInputRef = React.createRef();
  }

  // Trigger file selection programmatically (called from parent via ref)
  // eslint-disable-next-line react/no-unused-class-component-methods
  triggerFileSelect() {
    if (this.fileInputRef.current) {
      this.fileInputRef.current.click();
    }
  }

  // Handle file input change
  handleFileInputChange(event) {
    const files = Array.from(event.target.files);
    if (files.length > 0) {
      this.onDrop(files);
    }
  }

  // Update loading status with stage and progress
  updateLoadingStatus(stage, progress = 0) {
    this.setState({
      loadingStage: stage,
      loadingProgress: Math.min(100, Math.max(0, progress))
    });
  }

  async processFile(file) {
    const { onFileUpload, dispatch } = this.props;
    this.setState({ error: null, isProcessing: true });
    this.updateLoadingStatus("Initializing...", 0);

    try {
      // Detect file type based on extension
      this.updateLoadingStatus("Validating file format...", 10);
      const fileName = file.name.toLowerCase();
      let fileType = null;

      if (fileName.endsWith(".json")) {
        fileType = "consolidated";
      } else if (fileName.endsWith(".gz")) {
        // Check the extension before .gz
        if (fileName.includes(".json.gz")) {
          fileType = "consolidated";
          // Note: gzip support would need additional implementation
          throw new Error("Gzipped files are not yet supported. Please upload uncompressed JSON files.");
        }
      }

      if (!fileType) {
        throw new Error(
          "Unsupported file type. Please upload olmsted-cli consolidated JSON files (.json). For split files, select all files together (datasets.json, clones.*.json, tree.*.json)."
        );
      }

      // Process file entirely client-side - no server communication!
      this.updateLoadingStatus("Reading and parsing file data...", 25);
      const result = await FileProcessor.processFile(file);

      // Add file size to the first dataset
      if (result.datasets && result.datasets.length > 0) {
        result.datasets[0].file_size = file.size;
      }

      // Store processed data in browser (IndexedDB)
      this.updateLoadingStatus("Storing data in browser database...", 75);
      const datasetId = await clientDataStore.storeProcessedData(result);

      // Add to uploaded files list
      this.updateLoadingStatus("Finalizing upload...", 90);
      this.setState((prevState) => ({
        uploadedFiles: [
          ...prevState.uploadedFiles,
          {
            fileName: file.name,
            datasetId: datasetId,
            fileType,
            dataset: result.datasets[0],
            success: true
          }
        ]
      }));

      // Notify parent component with processed data
      if (onFileUpload) {
        onFileUpload({
          datasetId: datasetId,
          dataset: result.datasets[0],
          success: true
        });
      }

      // Trigger datasets reload by refreshing the datasets list
      this.updateLoadingStatus("Upload complete! Refreshing datasets list...", 100);
      if (dispatch) {
        await getClientDatasets(dispatch);
      }

      // Clear loading status after a brief delay
      setTimeout(() => {
        this.setState({
          loadingProgress: 0
        });
      }, 500);

      console.log("Client-side processing complete:", {
        datasetId,
        datasets: result.datasets.length,
        clones: Object.keys(result.clones).length,
        trees: result.trees.length
      });
    } catch (err) {
      console.error("Client-side file processing error:", err);
      this.setState({ error: err.message || "Failed to process file" });
    } finally {
      this.setState({
        isProcessing: false,
        loadingStage: "",
        loadingProgress: 0
      });
    }
  }

  async onDrop(acceptedFiles) {
    const { onFileUpload } = this.props;
    this.setState({ error: null, isProcessing: true });
    this.updateLoadingStatus("Initializing...", 0);

    try {
      // Check if we have multiple files that might be split format
      if (acceptedFiles.length > 1) {
        this.updateLoadingStatus(`Processing ${acceptedFiles.length} files, checking format...`, 10);

        // Try split file processing first
        this.updateLoadingStatus("Reading split files...", 20);
        const splitResult = await SplitFileProcessor.processFiles(acceptedFiles);

        if (splitResult) {
          // Successfully processed as split format
          this.updateLoadingStatus("Consolidating split file data...", 40);

          // Split files are already in consolidated format, just wrap them
          this.updateLoadingStatus("Processing consolidated dataset...", 55);
          const datasetId = FileProcessor.generateDatasetId();

          const consolidatedResult = {
            datasets: [
              {
                ...splitResult.consolidatedDataset,
                dataset_id: datasetId,
                temporary: true,
                isClientSide: true,
                upload_time: new Date().toISOString(),
                original_filename: `Split files (${splitResult.fileCount} files)`
              }
            ],
            clones: { [datasetId]: splitResult.consolidatedDataset.clones || [] },
            trees: splitResult.trees,
            datasetId
          };

          // Add total file size to the first dataset
          if (consolidatedResult.datasets && consolidatedResult.datasets.length > 0) {
            const totalSize = acceptedFiles.reduce((sum, file) => sum + file.size, 0);
            consolidatedResult.datasets[0].file_size = totalSize;
          }

          // Store processed data
          this.updateLoadingStatus("Storing data in browser database...", 75);
          await clientDataStore.storeProcessedData(consolidatedResult);

          // Update UI
          this.updateLoadingStatus("Finalizing upload...", 90);
          this.setState((prevState) => ({
            uploadedFiles: [
              ...prevState.uploadedFiles,
              {
                fileName: `Split format (${acceptedFiles.length} files)`,
                datasetId: datasetId,
                fileType: "consolidated-split",
                dataset: consolidatedResult.datasets[0],
                success: true,
                fileCount: acceptedFiles.length,
                originalFiles: splitResult.originalFiles
              }
            ],

            isProcessing: false
          }));

          // Notify parent
          if (onFileUpload) {
            onFileUpload({
              datasetId: datasetId,
              dataset: consolidatedResult.datasets[0],
              success: true
            });
          }

          // Reload to show new dataset
          this.updateLoadingStatus("Upload complete! Refreshing page...", 100);
          setTimeout(() => {
            window.location.reload();
          }, 1000);

          return; // Successfully processed as split
        }
      }

      // Process as individual consolidated files
      if (acceptedFiles.length === 1) {
        this.updateLoadingStatus("Processing single file...", 30);
        await this.processFile(acceptedFiles[0]);
      } else {
        this.updateLoadingStatus(`Processing ${acceptedFiles.length} individual files...`, 30);
        // Process files in parallel for better performance
        const fileProcessingPromises = acceptedFiles.map((file) => this.processFile(file));
        const results = await Promise.allSettled(fileProcessingPromises);

        // Check for any failures
        const failures = results.filter((result) => result.status === "rejected");
        if (failures.length > 0) {
          throw new Error(`Failed to process ${failures.length} of ${acceptedFiles.length} files`);
        }
      }
    } catch (error) {
      console.error("Error processing files:", error);
      this.setState({
        error: error.message || "Failed to process files",
        isProcessing: false,
        loadingStage: "",
        loadingProgress: 0
      });
    }
  }

  removeFile(datasetId) {
    this.setState((prevState) => ({
      uploadedFiles: prevState.uploadedFiles.filter((f) => f.datasetId !== datasetId)
    }));

    // Remove data from client-side storage
    clientDataStore.removeDataset(datasetId);
    console.log("Removed dataset from client storage:", datasetId);
  }

  render() {
    const { uploadedFiles, isProcessing, error, _loadingStage, _loadingProgress, loadingProgress, loadingStage } =
      this.state;

    return (
      <CenterContent>
        <div style={{ marginTop: 40, marginBottom: 40 }}>
          {/* Hidden file input for programmatic access */}
          <input
            ref={this.fileInputRef}
            type="file"
            accept="application/json, .json"
            multiple
            style={{ display: "none" }}
            onChange={this.handleFileInputChange.bind(this)}
          />

          <Dropzone
            onDrop={this.onDrop}
            accept="application/json, application/gzip, .json, .gz"
            multiple
            disabled={isProcessing}
            onMouseEnter={() => this.setState({ dropzoneHovered: true })}
            onMouseLeave={() => this.setState({ dropzoneHovered: false })}
            style={{
              border: this.state.dropzoneHovered ? "2px dashed #042a6b" : "2px dashed #05337f",
              borderRadius: 5,
              padding: 40,
              textAlign: "center",
              cursor: "pointer",
              backgroundColor: this.state.dropzoneHovered ? "rgba(5, 51, 127, 0.08)" : "rgba(5, 51, 127, 0.03)",
              transition: "background-color 0.15s ease, border-color 0.15s ease",
              opacity: isProcessing ? 0.6 : 1,
              minHeight: 150,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center"
            }}
            activeStyle={{
              backgroundColor: "rgba(5, 51, 127, 0.15)",
              borderColor: "#042a6b"
            }}
          >
            {isProcessing ? (
              <div style={{ width: "100%", maxWidth: 400, margin: "0 auto" }}>
                <div
                  style={{
                    fontSize: 18,
                    marginBottom: 15,
                    fontWeight: "bold",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "10px"
                  }}
                >
                  <SimpleInProgress />
                  Processing Your Data
                </div>

                {/* Progress Bar */}
                <div
                  style={{
                    width: "100%",
                    height: 8,
                    backgroundColor: "#e9ecef",
                    borderRadius: 4,
                    overflow: "hidden",
                    marginBottom: 10
                  }}
                >
                  <div
                    style={{
                      width: `${loadingProgress}%`,
                      height: "100%",
                      backgroundColor: "#007bff",
                      transition: "width 0.3s ease",
                      borderRadius: 4
                    }}
                  />
                </div>

                {/* Progress Text */}
                <div
                  style={{
                    fontSize: 14,
                    color: "#666",
                    marginBottom: 5,
                    minHeight: 20
                  }}
                >
                  {loadingStage || "Initializing..."}
                </div>

                {/* Progress Percentage */}
                <div
                  style={{
                    fontSize: 12,
                    color: "#999",
                    fontWeight: "bold"
                  }}
                >
                  {loadingProgress}% Complete
                </div>
              </div>
            ) : (
              <div>
                <FiUpload
                  size={48}
                  color="#05337f"
                  style={{ marginBottom: 15, opacity: this.state.dropzoneHovered ? 1 : 0.7 }}
                />
                <div style={{ fontSize: 20, marginBottom: 10, color: "#05337f", fontWeight: 500 }}>
                  Drag & drop files here
                </div>
                <div style={{ fontSize: 16, color: "#05337f", marginBottom: 15 }}>or click to browse</div>
                <div style={{ fontSize: 14, color: "#666" }}>
                  <strong>Supported format:</strong> olmsted-cli consolidated JSON (.json)
                </div>
              </div>
            )}
          </Dropzone>

          {error && (
            <div
              style={{
                marginTop: 20,
                padding: 10,
                backgroundColor: "#fee",
                border: "1px solid #fcc",
                borderRadius: 5,
                color: "#c00",
                textAlign: "center"
              }}
            >
              {error}
            </div>
          )}

          {uploadedFiles.length > 0 && (
            <div style={{ marginTop: 30 }}>
              <h4>Uploaded Files:</h4>
              <ul style={{ listStyle: "none", padding: 0 }}>
                {uploadedFiles.map((file) => (
                  <li
                    key={file.datasetId}
                    style={{
                      padding: 10,
                      marginBottom: 5,
                      backgroundColor: "#f5f5f5",
                      borderRadius: 5,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center"
                    }}
                  >
                    <div>
                      <strong>{file.fileName}</strong>
                      <span style={{ marginLeft: 10, color: "#666" }}>
                        ({file.fileType === "consolidated-split" ? "Consolidated Split" : "Consolidated"} format)
                      </span>
                      {file.dataset && file.dataset.clone_count && (
                        <span style={{ marginLeft: 10, color: "#666" }}>
                          - {file.dataset.clone_count} clonal families
                        </span>
                      )}
                      {file.fileCount && (
                        <div style={{ fontSize: 11, color: "#888", marginTop: 3 }}>
                          Files: {file.originalFiles ? file.originalFiles.join(", ") : `${file.fileCount} files`}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => this.removeFile(file.datasetId)}
                      onMouseEnter={() => this.setState({ removeHoveredId: file.datasetId })}
                      onMouseLeave={() => this.setState({ removeHoveredId: null })}
                      style={{
                        padding: "5px 10px",
                        backgroundColor: this.state.removeHoveredId === file.datasetId ? "#bb2d3b" : "#dc3545",
                        color: "white",
                        border: "none",
                        borderRadius: 3,
                        cursor: "pointer",
                        fontSize: 12,
                        transition: "background-color 0.15s ease"
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
