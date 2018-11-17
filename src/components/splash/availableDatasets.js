import React from "react";
import { red } from "./displayError";
import { getClonalFamilies } from "../../actions/loadData";
import * as types from "../../actions/types";
import { LoadingStatus, SimpleInProgress } from "../util/loading";

class DatasetRow extends React.Component {
  constructor(props) {
    super(props);
    // This binding is necessary to make `this` work in the callback
    this.selectDataset = this.selectDataset.bind(this);
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
          dataset_id: this.props.dataset.id,
          loading: false
        });
        break;
      }
      default :{
        this.props.dispatch({
          type: types.LOADING_DATASET,
          dataset_id: this.props.dataset.id,
          loading: "LOADING"
        });
        getClonalFamilies(this.props.dispatch, this.props.dataset.id)
        break;
      }
    }    
  }

  render(){
    return (
      <tr key={this.props.dataset.id}
        style={{backgroundColor: this.props.dataset.loading ? "lightblue" : "white", cursor: "pointer", fontWeight: "400", fontSize: "94%"}}
        onClick={this.selectDataset}>
        <td>
          <LoadingStatus loadingStatus={this.props.dataset.loading} loading={<SimpleInProgress/>} done={'\u2713'} default={'\u2795'}/>
        </td>
        <td>{this.props.dataset.id}</td>
        <td>{this.props.dataset.n_subjects}</td>
        <td>{this.props.dataset.n_clonal_families}</td>
        <td>{this.props.dataset.build.time}</td>
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
            </tr>
            {this.props.availableDatasets.map((dataset) => <DatasetRow key={dataset.id} dataset={dataset} dispatch={this.props.dispatch}/> )}
          </tbody>
        </table>
      </div>
    );
  }
};
