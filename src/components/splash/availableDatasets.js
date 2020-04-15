import React from "react";
import { red } from "./displayError";
import { getClonalFamilies } from "../../actions/loadData";
import * as types from "../../actions/types";
import { LoadingStatus, SimpleInProgress } from "../util/loading";
import * as _ from "lodash";

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
        getClonalFamilies(this.props.dispatch, this.props.dataset.dataset_id)
        break;
      }
    }    
  }

  render(){
    return (
      <tr key={this.props.dataset.dataset_id}
        style={{backgroundColor: this.props.dataset.loading ? "lightblue" : "white", cursor: "pointer", fontWeight: "400", fontSize: "94%"}}
        onClick={this.selectDataset}>
        <td>
          <LoadingStatus loadingStatus={this.props.dataset.loading} loading={<SimpleInProgress/>} done={'\u2713'} default={'\u2795'}/>
        </td>
        <td>{this.props.dataset.dataset_id}</td>
        <td>{this.props.dataset.subjects_count}</td>
        <td>{this.props.dataset.clone_count}</td>
        <td>{this.props.dataset.build.time}</td>
        {this.props.dataset.paper ? <td>{this.props.dataset.paper.url ? <a href={this.props.dataset.paper.url}>{this.props.dataset.paper.authorstring}</a> : this.props.dataset.paper.authorstring}</td>
          : null
        }
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
            </tr>
            {this.props.availableDatasets.map((dataset) => <DatasetRow key={dataset.dataset_id} dataset={dataset} dispatch={this.props.dispatch}/> )}
          </tbody>
        </table>
      </div>
    );
  }
};
