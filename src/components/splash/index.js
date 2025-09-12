import React from "react";
import { connect } from "react-redux";
import Title from "../framework/title";
import Flex from "../framework/flex";
import { changePage } from "../../actions/navigation";
import { DatasetsTable } from "./availableDatasets";
import { CenterContent } from "./centerContent";
import { displayError } from "./displayError";
import { getSelectedDatasets } from "../../reducers/datasets";
import FileUpload from "./fileUpload";
import clientDataStore from "../../utils/clientDataStore";

@connect((state) => ({
  availableDatasets: state.datasets.availableDatasets,
  errorMessage: state.datasets.errorMessage
}))
class Splash extends React.Component {
  constructor(props) {
    super(props);
    this.fileUploadRef = React.createRef();
  }

  handleClearAll = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to delete ALL datasets from the database?\n\n"
        + "This action cannot be undone and will permanently remove all uploaded datasets and their data.\n\n"
        + "Click OK to confirm deletion, or Cancel to keep your data."
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
    return (
      <div style={{ justifyContent: "space-around", display: "flex", marginRight: 50 }}>
        <div className="static container">
          <div style={{ marginBottom: 35 }}>
            <Flex justifyContent="center">
              <img alt="logo" src={require("../../images/olmsted.svg")} />
            </Flex>
          </div>
          <Flex justifyContent="center">
            <Title />
          </Flex>
          <div className="row">
            <h1 style={{ textAlign: "center", marginTop: "-10px", fontSize: "29px" }}>
              {" "}
              B-cell repertoire and clonal family tree explorer
              {" "}
            </h1>
          </div>
          {/* First: either display the error message or the intro-paragraph */}
          {this.props.errorMessage ? (
            <CenterContent>{displayError(this.props.errorMessage)}</CenterContent>
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
          {/* Secondly, list the available datasets */}

          <p
            style={{
              maxWidth: 600,
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
            Select datasets below and click "Explore!" to visualize clonal families.
          </p>

          {/* Full width table section */}
          <div style={{ marginLeft: "-15px", marginRight: "-15px", marginBottom: 20 }}>
            <DatasetsTable availableDatasets={this.props.availableDatasets} dispatch={this.props.dispatch} />
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
                style={{
                  border: "0px",
                  backgroundColor: "#05337f",
                  borderRadius: 5,
                  cursor: "pointer",
                  padding: 20,
                  fontFamily: "Lato",
                  color: "white",
                  fontWeight: 400,
                  fontSize: 18,
                  outline: 0
                }}
                onClick={(_e) => this.props.dispatch(
                  changePage({
                    path: "/app",
                    query: {
                      selectedDatasets: getSelectedDatasets(this.props.availableDatasets).map(
                        (dataset) => dataset.dataset_id
                      )
                    }
                  })
                )}
              >
                Explore!
              </button>
              <button
                style={{
                  border: "2px solid #05337f",
                  backgroundColor: "transparent",
                  borderRadius: 5,
                  cursor: "pointer",
                  padding: 20,
                  fontFamily: "Lato",
                  color: "#05337f",
                  fontWeight: 400,
                  fontSize: 18,
                  outline: 0
                }}
                onClick={() => {
                  // Trigger file selection
                  if (this.fileUploadRef.current) {
                    this.fileUploadRef.current.triggerFileSelect();
                  }
                }}
              >
                Upload Data
              </button>
              <button
                style={{
                  border: "2px solid #dc3545",
                  backgroundColor: "transparent",
                  borderRadius: 5,
                  cursor: "pointer",
                  padding: 20,
                  fontFamily: "Lato",
                  color: "#dc3545",
                  fontWeight: 400,
                  fontSize: 18,
                  outline: 0
                }}
                onClick={this.handleClearAll}
              >
                Clear All Datasets
              </button>
            </div>
          </CenterContent>
          {/* File Upload Section */}
          <FileUpload
            ref={this.fileUploadRef}
            dispatch={this.props.dispatch}
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
