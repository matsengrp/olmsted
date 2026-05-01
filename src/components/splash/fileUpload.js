import React from "react";
import Dropzone from "react-dropzone";
import { FiUpload } from "react-icons/fi";
import { CenterContent } from "./centerContent";
import FileProcessor from "../../utils/fileProcessor";
import SplitFileProcessor from "../../utils/splitFileProcessor";
import clientDataStore from "../../utils/clientDataStore";
import olmstedDB from "../../utils/olmstedDB";
import { getMissingFieldSummary } from "../../utils/fieldDefaults";
import { getClientDatasets } from "../../actions/clientDataLoader";
import { SimpleInProgress } from "../util/loading";
import { DuplicateIdWarningModal, DuplicateNameModal } from "./duplicateUploadModals";

class FileUpload extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      uploadedFiles: [],
      dismissedWarnings: new Set(),
      isProcessing: false,
      error: null,
      loadingStage: "",
      loadingProgress: 0,
      dropzoneHovered: false,
      removeHoveredId: null,
      // Duplicate-upload guard state. When set, the corresponding modal is
      // rendered and we hold a `resolve` function that the modal callbacks
      // invoke to unblock the in-flight upload.
      pendingIdConflict: null,
      pendingNameConflict: null
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

  /**
   * Promise-returning helper that opens the duplicate-id modal and resolves
   * with `true` if the user wants to continue with a renamed source id,
   * `false` if they cancel.
   */
  presentIdConflictModal(payload) {
    return new Promise((resolve) => {
      this.setState({ pendingIdConflict: { ...payload, resolve } });
    });
  }

  /**
   * Promise-returning helper that opens the duplicate-name modal and
   * resolves with the chosen final name (a string, possibly equal to
   * `originalName` if the user keeps the duplicate) or `null` if they
   * cancel the upload.
   */
  presentNameConflictModal(payload) {
    return new Promise((resolve) => {
      this.setState({ pendingNameConflict: { ...payload, resolve } });
    });
  }

  /**
   * Run both duplicate-upload guards against the processed dataset.
   * Mutates `result.datasets[0]` (and clones[*].dataset_id refs) when the
   * user opts to continue with renamed values. Returns true if the upload
   * should proceed, false if the user cancelled.
   */
  async resolveDuplicateConflicts(result) {
    const dataset = result.datasets && result.datasets[0];
    if (!dataset) return true;

    // Check 1: original_dataset_id collision.
    const idCollision = await olmstedDB.findDatasetByOriginalId(dataset.original_dataset_id);
    if (idCollision) {
      const continueAnyway = await this.presentIdConflictModal({ existingName: idCollision.name });
      if (!continueAnyway) return false;
      dataset.original_dataset_id = await olmstedDB.makeUniqueOriginalDatasetId(dataset.original_dataset_id);
    }

    // Check 2: dataset name collision.
    const nameCollision = await olmstedDB.findDatasetByName(dataset.name);
    if (nameCollision) {
      const suggestedName = await olmstedDB.makeUniqueDatasetName(dataset.name);
      const finalName = await this.presentNameConflictModal({
        originalName: dataset.name,
        suggestedName
      });
      if (finalName === null) return false;
      dataset.name = finalName;
    }

    return true;
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

      // Guard against duplicate uploads (same source id and/or same display
      // name as an already-loaded dataset). Modals may pause the upload here.
      this.updateLoadingStatus("Checking for duplicate datasets...", 60);
      const proceed = await this.resolveDuplicateConflicts(result);
      if (!proceed) {
        this.setState({ isProcessing: false, loadingStage: "", loadingProgress: 0 });
        return;
      }

      // Store processed data in browser (IndexedDB)
      this.updateLoadingStatus("Storing data in browser database...", 75);
      const datasetId = await clientDataStore.storeProcessedData(result);

      // Check for missing fields and data modifications
      const missingFieldWarnings = getMissingFieldSummary(result.datasets[0]?.missing_fields);
      const dataModifications = result.datasets[0]?.data_modifications || [];

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
            success: true,
            missingFieldWarnings,
            dataModifications
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

          // Guard against duplicate uploads (same source id and/or same name).
          this.updateLoadingStatus("Checking for duplicate datasets...", 65);
          const proceedSplit = await this.resolveDuplicateConflicts(consolidatedResult);
          if (!proceedSplit) {
            this.setState({ isProcessing: false, loadingStage: "", loadingProgress: 0 });
            return;
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

  resolvePendingIdConflict = (continueAnyway) => {
    const { pendingIdConflict } = this.state;
    if (pendingIdConflict) {
      pendingIdConflict.resolve(continueAnyway);
    }
    this.setState({ pendingIdConflict: null });
  };

  resolvePendingNameConflict = (finalName) => {
    const { pendingNameConflict } = this.state;
    if (pendingNameConflict) {
      pendingNameConflict.resolve(finalName);
    }
    this.setState({ pendingNameConflict: null });
  };

  render() {
    const {
      uploadedFiles,
      isProcessing,
      error,
      _loadingStage,
      _loadingProgress,
      loadingProgress,
      loadingStage,
      pendingIdConflict,
      pendingNameConflict
    } = this.state;

    return (
      <CenterContent>
        {pendingIdConflict && (
          <DuplicateIdWarningModal
            existingName={pendingIdConflict.existingName}
            onCancel={() => this.resolvePendingIdConflict(false)}
            onContinue={() => this.resolvePendingIdConflict(true)}
          />
        )}
        {pendingNameConflict && (
          <DuplicateNameModal
            originalName={pendingNameConflict.originalName}
            suggestedName={pendingNameConflict.suggestedName}
            onCancel={() => this.resolvePendingNameConflict(null)}
            onAccept={(name) => this.resolvePendingNameConflict(name)}
          />
        )}
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
            accept={{ "application/json": [".json"], "application/gzip": [".gz"] }}
            multiple
            disabled={isProcessing}
          >
            {({ getRootProps, getInputProps, isDragActive }) => (
              <div
                {...getRootProps()}
                onMouseEnter={() => this.setState({ dropzoneHovered: true })}
                onMouseLeave={() => this.setState({ dropzoneHovered: false })}
                style={{
                  border: isDragActive || this.state.dropzoneHovered ? "2px dashed #042a6b" : "2px dashed #05337f",
                  borderRadius: 5,
                  padding: 40,
                  textAlign: "center",
                  cursor: "pointer",
                  backgroundColor: isDragActive
                    ? "rgba(5, 51, 127, 0.15)"
                    : this.state.dropzoneHovered
                      ? "rgba(5, 51, 127, 0.08)"
                      : "rgba(5, 51, 127, 0.03)",
                  transition: "background-color 0.15s ease, border-color 0.15s ease",
                  opacity: isProcessing ? 0.6 : 1,
                  minHeight: 150,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  alignItems: "center"
                }}
              >
                <input {...getInputProps()} />
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
              {/* Data warnings — shown between header and file list */}
              {uploadedFiles.some(
                (f) =>
                  !this.state.dismissedWarnings.has(f.datasetId) &&
                  (f.missingFieldWarnings?.length > 0 || f.dataModifications?.length > 0)
              ) && (
                <div style={{ marginBottom: 10 }}>
                  {uploadedFiles
                    .filter(
                      (f) =>
                        !this.state.dismissedWarnings.has(f.datasetId) &&
                        (f.missingFieldWarnings?.length > 0 || f.dataModifications?.length > 0)
                    )
                    .map((file) => (
                      <div
                        key={`warn-${file.datasetId}`}
                        style={{
                          marginBottom: 6,
                          padding: "10px 14px",
                          backgroundColor: "#fff3cd",
                          border: "1px solid #ffc107",
                          borderRadius: 4,
                          color: "#856404",
                          fontSize: 11
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                            marginBottom: 8
                          }}
                        >
                          <div style={{ fontSize: 14 }}>
                            <strong>{file.fileName}</strong> — uploaded successfully with warnings:
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              this.setState((prev) => ({
                                dismissedWarnings: new Set([...prev.dismissedWarnings, file.datasetId])
                              }))
                            }
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              padding: "0 2px",
                              fontSize: 16,
                              color: "#856404",
                              lineHeight: 1,
                              flexShrink: 0
                            }}
                            title="Dismiss warning"
                            aria-label="Dismiss warning"
                          >
                            &times;
                          </button>
                        </div>
                        {file.missingFieldWarnings?.length > 0 && (
                          <div style={{ marginBottom: 4 }}>
                            <strong>Missing data fields:</strong>
                            <ul style={{ margin: "4px 0 0 0", paddingLeft: 18 }}>
                              {file.missingFieldWarnings.map((w) => (
                                <li key={w}>{w}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {file.dataModifications?.length > 0 && (
                          <div>
                            <strong>Data modifications applied:</strong>
                            <ul style={{ margin: "4px 0 0 0", paddingLeft: 18 }}>
                              {file.dataModifications.map((m) => {
                                const label = typeof m === "string" ? m : m.label;
                                const items = typeof m === "object" && m.items ? m.items : [];
                                return (
                                  <li key={label}>
                                    {label}
                                    {items.length > 0 && (
                                      <ul style={{ margin: "2px 0 0 0", paddingLeft: 16 }}>
                                        {items.map((item) => (
                                          <li key={item} style={{ listStyleType: "circle" }}>
                                            {item}
                                          </li>
                                        ))}
                                      </ul>
                                    )}
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              )}
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
                    <div style={{ flex: 1 }}>
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
