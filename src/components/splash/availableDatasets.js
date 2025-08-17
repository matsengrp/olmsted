import React from "react";
import * as _ from "lodash";
import { red } from "./displayError";
import { getClonalFamilies } from "../../actions/loadData";
import { getClientClonalFamilies, loadDataSmart } from "../../actions/clientDataLoader";
import clientDataStore from "../../utils/clientDataStore";
import * as types from "../../actions/types";
import { LoadingStatus, SimpleInProgress } from "../util/loading";
import { getClientDatasets } from "../../actions/clientDataLoader";

class DatasetRow extends React.Component {
  constructor(props) {
    super(props);
    // This binding is necessary to make `this` work in the callback
    this.selectDataset = this.selectDataset.bind(this);
    this.deleteDataset = this.deleteDataset.bind(this);
  }

  deleteDataset(e) {
    e.stopPropagation(); // Prevent row click event

    const datasetName = this.props.dataset.name || this.props.dataset.dataset_id;
    if (window.confirm(`Are you sure you want to delete dataset "${datasetName}"?`)) {
      // Remove from client store
      clientDataStore.removeDataset(this.props.dataset.dataset_id);

      // Dispatch action to remove from Redux state
      this.props.dispatch({
        type: types.REMOVE_DATASET,
        dataset_id: this.props.dataset.dataset_id
      });

      console.log('Deleted client-side dataset:', this.props.dataset.dataset_id);
    }
  }

  selectDataset() {
    console.log("select dataset");
    switch (this.props.dataset.loading) {
      case "LOADING": {
        break;
      }
      case "DONE": {
        this.props.dispatch({
          type: types.LOADING_DATASET,
          dataset_id: this.props.dataset.dataset_id,
          loading: false
        });
        break;
      }
      default: {
        this.props.dispatch({
          type: types.LOADING_DATASET,
          dataset_id: this.props.dataset.dataset_id,
          loading: "LOADING"
        });

        // Try client-side data first, fallback to server
        if (this.props.dataset.isClientSide) {
          getClientClonalFamilies(this.props.dispatch, this.props.dataset.dataset_id);
        } else {
          getClonalFamilies(this.props.dispatch, this.props.dataset.dataset_id);
        }
        break;
      }
    }
  }

  render() {
    const isClientSide = this.props.dataset.isClientSide || this.props.dataset.temporary;
    const isSelected = this.props.dataset.loading;

    // Define columns data for easier alternating column styling
    const columns = [
      {
        content: <LoadingStatus loadingStatus={this.props.dataset.loading} loading={<SimpleInProgress/>} done={'\u2713'} default={'\u2795'}/>,
        style: {}
      },
      {
        content: this.props.dataset.name || this.props.dataset.dataset_id,
        style: {}
      },
      {
        content: this.props.dataset.dataset_id,
        style: { fontSize: "12px", color: "#666", fontFamily: "monospace" }
      },
      {
        content: isClientSide ? "Local" : "Server",
        style: { fontSize: "12px", color: isClientSide ? "#007bff" : "#666" }
      },
      {
        content: this.props.dataset.subjects_count || '—',
        style: {}
      },
      {
        content: this.props.dataset.clone_count || '—',
        style: {}
      },
      {
        content: this.props.dataset.build ? this.props.dataset.build.time || '—' : '—',
        style: {}
      }
    ];

    // Add citation column if needed
    if (this.props.dataset.paper) {
      columns.push({
        content: this.props.dataset.paper.url ? 
          <a href={this.props.dataset.paper.url}>{this.props.dataset.paper.authorstring}</a> : 
          this.props.dataset.paper.authorstring,
        style: {}
      });
    } else if (this.props.showCitation) {
      columns.push({
        content: '',
        style: {}
      });
    }

    // Add delete button column if needed
    if (isClientSide) {
      columns.push({
        content: (
          <button
            onClick={this.deleteDataset}
            style={{
              padding: "2px 8px",
              fontSize: "12px",
              backgroundColor: "#dc3545",
              color: "white",
              border: "none",
              borderRadius: "3px",
              cursor: "pointer"
            }}
          >
            Delete
          </button>
        ),
        style: {}
      });
    }

    return (
      <tr key={this.props.dataset.dataset_id}
        style={{
          backgroundColor: isSelected ? "lightblue" : "white", 
          cursor: "pointer", 
          fontWeight: "400", 
          fontSize: "94%",
          height: "40px" // Fixed row height
        }}
        onClick={this.selectDataset}
      >
        {columns.map((column, colIndex) => {
          const isEvenColumn = colIndex % 2 === 0;
          const cellStyle = {
            ...column.style,
            padding: "8px",
            height: "40px",
            verticalAlign: "middle",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap"
          };
          
          // Apply alternating column shading only if row is not selected
          if (!isSelected && isEvenColumn) {
            cellStyle.backgroundColor = '#f8f9fa';
          }
          
          return (
            <td key={colIndex} style={cellStyle}>
              {column.content}
            </td>
          );
        })}
      </tr>
    );
  }
}

export class DatasetsTable extends React.Component {
  render() {
    if (!this.props.availableDatasets) {
      return (
        <div style={{fontSize: "20px", fontWeight: 400, color: red}}>
          There was an error fetching the datasets
        </div>
      );
    }
    // Do any of the datasets have a "paper" field
    const showCitation = _.reduce(this.props.availableDatasets,
      (hasPaperInfo, dataset) => hasPaperInfo || dataset.paper !== undefined,
      false); // base case
    // Check if any datasets are client-side/temporary
    const hasClientDatasets = this.props.availableDatasets.some((d) => d.isClientSide || d.temporary);

    return (
      <div>
        <div style={{fontSize: "26px"}}>
          Available Datasets:
        </div>
        <table style={{
          marginLeft: "-22px",
          width: "100%",
          tableLayout: "fixed",
          borderCollapse: "collapse"
        }}>
          <colgroup>
            <col style={{ width: "80px" }} /> {/* Load Status */}
            <col style={{ width: "200px" }} /> {/* Name */}
            <col style={{ width: "150px" }} /> {/* ID */}
            <col style={{ width: "80px" }} /> {/* Source */}
            <col style={{ width: "80px" }} /> {/* Subjects */}
            <col style={{ width: "120px" }} /> {/* Clonal Families */}
            <col style={{ width: "120px" }} /> {/* Build time */}
            {showCitation && <col style={{ width: "150px" }} />} {/* From paper */}
            {hasClientDatasets && <col style={{ width: "80px" }} />} {/* Actions */}
          </colgroup>
          <tbody>
            <tr style={{ height: "40px" }}>
              {[
                "Load Status",
                "Name", 
                "ID",
                "Source",
                "Subjects",
                "Clonal Families",
                "Build time",
                ...(showCitation ? ["From paper"] : []),
                ...(hasClientDatasets ? ["Actions"] : [])
              ].map((header, colIndex) => {
                const isEvenColumn = colIndex % 2 === 0;
                return (
                  <th 
                    key={colIndex}
                    style={{
                      backgroundColor: isEvenColumn ? '#e9ecef' : '#f8f9fa',
                      padding: "8px",
                      height: "40px",
                      verticalAlign: "middle",
                      textAlign: "left"
                    }}
                  >
                    {header}
                  </th>
                );
              })}
            </tr>
            {this.props.availableDatasets.map((dataset) => <DatasetRow key={dataset.dataset_id} dataset={dataset} showCitation={showCitation} dispatch={this.props.dispatch}/>)}
          </tbody>
        </table>
      </div>
    );
  }
}
