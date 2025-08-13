import React from "react";
import { red } from "./displayError";
import { getClonalFamilies } from "../../actions/loadData";
import { getClientClonalFamilies, loadDataSmart } from "../../actions/clientDataLoader";
import clientDataStore from "../../utils/clientDataStore";
import * as types from "../../actions/types";
import { LoadingStatus, SimpleInProgress } from "../util/loading";
import * as _ from "lodash";

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

  selectDataset(){
    console.log("select dataset")
    switch(this.props.dataset.loading){
      case "LOADING":{
        break;
      }
      case "DONE":{
        this.props.dispatch({
          type: types.LOADING_DATASET,
          dataset_id: this.props.dataset.dataset_id,
          loading: false
        });
        break;
      }
      default :{
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

  render(){
    const isClientSide = this.props.dataset.isClientSide || this.props.dataset.temporary;
    
    return (
      <tr key={this.props.dataset.dataset_id}
        style={{backgroundColor: this.props.dataset.loading ? "lightblue" : "white", cursor: "pointer", fontWeight: "400", fontSize: "94%"}}
        onClick={this.selectDataset}>
        <td>
          <LoadingStatus loadingStatus={this.props.dataset.loading} loading={<SimpleInProgress/>} done={'\u2713'} default={'\u2795'}/>
        </td>
        <td>
          {this.props.dataset.name || this.props.dataset.dataset_id}
          {isClientSide && (
            <span style={{marginLeft: "8px", fontSize: "80%", color: "#666", fontStyle: "italic"}}>
              (uploaded)
            </span>
          )}
        </td>
        <td>{this.props.dataset.subjects_count}</td>
        <td>{this.props.dataset.clone_count}</td>
        <td>{this.props.dataset.build ? this.props.dataset.build.time : 'N/A'}</td>
        {this.props.dataset.paper ? <td>{this.props.dataset.paper.url ? <a href={this.props.dataset.paper.url}>{this.props.dataset.paper.authorstring}</a> : this.props.dataset.paper.authorstring}</td>
          : this.props.showCitation ? <td></td> : null
        }
        {isClientSide && (
          <td>
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
          </td>
        )}
      </tr>
    );
  }
};

export class DatasetsTable extends React.Component {
  render(){
    if (!this.props.availableDatasets) {
      return (
        <div style={{fontSize: "20px", fontWeight: 400, color: red}}>
          {"There was an error fetching the datasets"}
        </div>
      );
    }
    // Do any of the datasets have a "paper" field
    const showCitation = _.reduce(this.props.availableDatasets,
                                  (hasPaperInfo, dataset) => hasPaperInfo || dataset.paper !== undefined,
                                  false) //base case
    // Check if any datasets are client-side/temporary
    const hasClientDatasets = this.props.availableDatasets.some(d => d.isClientSide || d.temporary);
    
    return (
      <div>
        <div style={{fontSize: "26px"}}>
          {"Available Datasets:"}
        </div>
        <table style={{marginLeft: "-22px"}}>
          <tbody>
            <tr>
              <th>Load Status</th>
              <th>ID</th>
              <th>Subjects</th>
              <th>Clonal Families</th>
              <th>Build time</th>
              {showCitation ? <th>From paper</th> : null}
              {hasClientDatasets ? <th>Actions</th> : null}
            </tr>
            {this.props.availableDatasets.map((dataset) => <DatasetRow key={dataset.dataset_id} dataset={dataset} showCitation={showCitation} dispatch={this.props.dispatch}/> )}
          </tbody>
        </table>
      </div>
    );
  }
};
