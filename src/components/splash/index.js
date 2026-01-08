import React from "react";
import { connect } from "react-redux";
import Flex from "../framework/flex";
import { changePage } from "../../actions/navigation";
import { DatasetManagementTable } from "./DatasetManagementTable";
import { CenterContent } from "./centerContent";
import { displayError } from "./displayError";
import { getSelectedDatasets } from "../../reducers/datasets";
import FileUpload from "./fileUpload";
import clientDataStore from "../../utils/clientDataStore";
import { NAV_BAR_HEIGHT } from "../framework/nav-bar";
import { CollapseHelpTitle } from "../util/collapseHelpTitle";
import { FiHelpCircle, FiCompass, FiUpload, FiTrash2 } from "react-icons/fi";
import * as explorerActions from "../../actions/explorer";

@connect((state) => ({
  availableDatasets: state.datasets.availableDatasets,
  errorMessage: state.datasets.errorMessage
}))
class Splash extends React.Component {
  constructor(props) {
    super(props);
    this.fileUploadRef = React.createRef();
    this.state = {
      exploreHovered: false,
      uploadHovered: false,
      clearHovered: false
    };
  }

  componentDidMount() {
    const { dispatch } = this.props;
    // Load starred datasets from sessionStorage
    try {
      const savedStarred = sessionStorage.getItem("olmsted_starred_datasets");
      if (savedStarred) {
        const starredDatasets = JSON.parse(savedStarred);
        if (Array.isArray(starredDatasets) && starredDatasets.length > 0) {
          dispatch(explorerActions.setStarredDatasets(starredDatasets));
        }
      }
    } catch (e) {
      console.warn("Failed to load starred datasets from sessionStorage:", e);
    }
  }

  handleClearAll = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to delete ALL datasets from the database?\n\n" +
        "This action cannot be undone and will permanently remove all uploaded datasets and their data.\n\n" +
        "Click OK to confirm deletion, or Cancel to keep your data."
    );

    if (confirmed) {
      try {
        await clientDataStore.clearAllData();

        // Refresh the page to update the datasets table
        window.location.reload();

        // Optional: Show success message
        // alert('All datasets have been successfully deleted.');
      } catch (error) {
        console.error("Error clearing datasets:", error);
        alert("Error deleting datasets. Please try again or check the console for details.");
      }
    }
  };

  render() {
    const { errorMessage, availableDatasets, dispatch } = this.props;
    return (
      <div style={{ justifyContent: "space-around", display: "flex", marginRight: 50, paddingTop: NAV_BAR_HEIGHT + 20 }}>
        <div className="static container">
          <div style={{ marginBottom: 35 }}>
            <Flex justifyContent="center">
              {/* eslint-disable-next-line global-require */}
              <img alt="logo" src={require("../../images/olmsted.svg")} />
            </Flex>
          </div>
          <div className="row">
            <h1 style={{ textAlign: "center", marginTop: "10px", fontSize: "29px" }}>
              {" "}
              B-cell repertoire and clonal family tree explorer{" "}
            </h1>
          </div>
          {/* First: either display the error message or the intro-paragraph */}
          {errorMessage ? (
            <CenterContent>{displayError(errorMessage)}</CenterContent>
          ) : (
            <p
              style={{
                maxWidth: 600,
                marginTop: 0,
                marginRight: "auto",
                marginBottom: 20,
                marginLeft: "auto",
                textAlign: "center",
                fontSize: 16,
                fontWeight: 300,
                lineHeight: 1.42857143
              }}
            >
              Olmsted is an open source tool for visualizing B-cell repertoire data.
            </p>
          )}

          {/* Resource links */}
          <p
            style={{
              maxWidth: 700,
              marginTop: 20,
              marginRight: "auto",
              marginBottom: 20,
              marginLeft: "auto",
              textAlign: "center",
              fontSize: 16,
              fontWeight: 300,
              lineHeight: 1.42857143
            }}
          >
            To get started, upload your dataset below and click &quot;Explore!&quot; to visualize your data.
            Click the{" "}
            <FiHelpCircle style={{ verticalAlign: "middle", marginBottom: "2px" }} />
            {" "}icons next to sectional headers for detailed usage descriptions.
            For information on data formats and usage, see the{" "}
            <a
              href="https://github.com/matsengrp/olmsted#readme"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#05337f", textDecoration: "underline" }}
            >
              Olmsted README
            </a>
            {" "}and{" "}
            <a
              href="https://github.com/matsengrp/olmsted-cli#readme"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#05337f", textDecoration: "underline" }}
            >
              olmsted-cli README
            </a>
          .
          </p>

          {/* Dataset Manager Section */}
          <div style={{ marginBottom: 20 }}>
            <CollapseHelpTitle
              titleText="Dataset Manager"
              helpText={
                <div>
                  The Dataset Manager allows you to upload, view, and delete datasets stored in your browser&apos;s
                  local storage (IndexedDB). The typical workflow is to upload one or more datasets, select them
                  for loading, and click &quot;Explore!&quot; to visualize clonal families in the interactive explorer.
                  Datasets persist between browser sessions until you manually delete them.
                  <br />
                  <br />
                  <strong>Important:</strong> Olmsted only accepts a special JSON format generated by{" "}
                  <a href="https://github.com/matsengrp/olmsted-cli" target="_blank" rel="noopener noreferrer">
                    olmsted-cli
                  </a>
                  . This tool converts standard AIRR and PCP formats into Olmsted-compatible JSON files.
                  Raw AIRR or other formats cannot be uploaded directly.
                  <br />
                  <br />
                  <strong>Uploading Datasets:</strong>
                  <ul style={{ marginTop: "5px", paddingLeft: "20px", marginBottom: "10px" }}>
                    <li>
                      <strong>Drag and Drop:</strong> Drag one or more Olmsted JSON files onto the upload area below
                      the table. Files will be processed and added to your local database automatically.
                    </li>
                    <li>
                      <strong>Upload Button:</strong> Click the &quot;Upload Data&quot; button to open a file browser
                      and select files to upload.
                    </li>
                  </ul>
                  <strong>Managing Datasets:</strong>
                  <ul style={{ marginTop: "5px", paddingLeft: "20px", marginBottom: "10px" }}>
                    <li>
                      <strong>Loading datasets:</strong> Click the row to load or unload a dataset. The Load column indicates the status of the dataset.
                    </li>
                    <li>
                      <strong>Info button:</strong> Click the info button to view all dataset metadata in a modal.
                    </li>
                    <li>
                      <strong>Deleting datasets:</strong> Click the delete button in the Actions column to
                      remove a dataset from your local storage. This action cannot be undone.
                    </li>
                    <li>
                      <strong>Delete All:</strong> Use the &quot;Delete All Datasets&quot; button to remove all datasets
                      at once. You will be prompted to confirm this action.
                    </li>
                  </ul>
                  <strong>Table Controls:</strong>
                  <ul style={{ marginTop: "5px", paddingLeft: "20px", marginBottom: "10px" }}>
                    <li>
                      <strong>Sorting:</strong> Click column headers to sort. Click again to toggle ascending/descending order.
                    </li>
                    <li>
                      <strong>Resizing columns:</strong> Drag column borders to resize. Double-click to auto-fit content.
                    </li>
                  </ul>
                  <strong>Exploring Data:</strong>
                  <ul style={{ marginTop: "5px", paddingLeft: "20px", marginBottom: "10px" }}>
                    <li>
                      Load one or more datasets, then click &quot;Explore!&quot; to visualize clonal families in the
                      interactive explorer.
                    </li>
                    <li>You can modify which datasets are loaded from the exploration page as well.</li>
                  </ul>
                  <strong>Starring Datasets:</strong>
                  <ul style={{ marginTop: "5px", paddingLeft: "20px", marginBottom: "10px" }}>
                    <li><strong>Star icon:</strong> Click the star in any row to mark it for easy reference</li>
                    <li><strong>Starred first:</strong> Check this option to sort starred datasets to the top of the table</li>
                    <li><strong>Only starred:</strong> Check this option to filter and show only starred datasets</li>
                    <li><strong>Bulk actions:</strong> Use &quot;Star All&quot; or &quot;Unstar All&quot; to quickly star or unstar all currently visible datasets. Use &quot;Clear Stars&quot; to remove all stars</li>
                  </ul>
                  <strong>Export:</strong> Click &quot;Download Table as CSV&quot; to export the current table view (with applied filters and sorting) to a CSV file.
                </div>
              }
            />
            <DatasetManagementTable availableDatasets={availableDatasets} dispatch={dispatch} />
          </div>

          <CenterContent>
            <div
              style={{
                display: "flex",
                gap: "15px",
                justifyContent: "center",
                marginTop: 20
              }}
            >
              <button
                type="button"
                style={{
                  border: "0px",
                  backgroundColor: this.state.exploreHovered ? "#042a6b" : "#05337f",
                  borderRadius: 5,
                  cursor: "pointer",
                  padding: 20,
                  fontFamily: "Lato",
                  color: "white",
                  fontWeight: 400,
                  fontSize: 18,
                  outline: 0,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  transition: "background-color 0.15s ease"
                }}
                onMouseEnter={() => this.setState({ exploreHovered: true })}
                onMouseLeave={() => this.setState({ exploreHovered: false })}
                onClick={(_e) =>
                  dispatch(
                    changePage({
                      path: "/app",
                      query: {
                        selectedDatasets: getSelectedDatasets(availableDatasets).map((dataset) => dataset.dataset_id)
                      }
                    })
                  )
                }
              >
                <FiCompass size={20} />
                Explore!
              </button>
              <button
                type="button"
                style={{
                  border: "2px solid #05337f",
                  backgroundColor: this.state.uploadHovered ? "rgba(5, 51, 127, 0.1)" : "transparent",
                  borderRadius: 5,
                  cursor: "pointer",
                  padding: 20,
                  fontFamily: "Lato",
                  color: "#05337f",
                  fontWeight: 400,
                  fontSize: 18,
                  outline: 0,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  transition: "background-color 0.15s ease"
                }}
                onMouseEnter={() => this.setState({ uploadHovered: true })}
                onMouseLeave={() => this.setState({ uploadHovered: false })}
                onClick={() => {
                  // Trigger file selection
                  if (this.fileUploadRef.current) {
                    this.fileUploadRef.current.triggerFileSelect();
                  }
                }}
              >
                <FiUpload size={20} />
                Upload Data
              </button>
              <button
                type="button"
                style={{
                  border: "2px solid #dc3545",
                  backgroundColor: this.state.clearHovered ? "rgba(220, 53, 69, 0.1)" : "transparent",
                  borderRadius: 5,
                  cursor: "pointer",
                  padding: 20,
                  fontFamily: "Lato",
                  color: "#dc3545",
                  fontWeight: 400,
                  fontSize: 18,
                  outline: 0,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  transition: "background-color 0.15s ease"
                }}
                onMouseEnter={() => this.setState({ clearHovered: true })}
                onMouseLeave={() => this.setState({ clearHovered: false })}
                onClick={this.handleClearAll}
              >
                <FiTrash2 size={20} />
                Delete All Datasets
              </button>
            </div>
          </CenterContent>
          {/* File Upload Section */}
          <FileUpload
            ref={this.fileUploadRef}
            dispatch={dispatch}
            onFileUpload={(result) => {
              // Reload datasets after successful upload
              // TODO: Add the uploaded dataset to availableDatasets
              console.log("File uploaded:", result);
            }}
          />
        </div>
      </div>
    );
  }
}

export default Splash;
