import React from "react";
import { red } from "./displayError";
import { getClonalFamilies } from "../../actions/loadData";
import * as types from "../../actions/types";

class InProgress extends React.Component {
  constructor(props) {
    super(props);
    this.state = {counter: 0}
  }

  componentDidMount() {
    this.timerID = setInterval(
      () => this.increment(),
      400
    );
  }

  componentWillUnmount() {
    clearInterval(this.timerID);
  }

  increment() {
    this.setState((state) => ({
      counter: state.counter+1
    }));
  }

  render(){
    return <td>{"Loading"+"...".substring(0,this.state.counter%4+1)}</td>
  }

}

class LoadingStatus extends React.Component {
  render(){
    switch(this.props.loading){
      case "LOADING":{
        return <InProgress/>
      }
      case "DONE":{
        return <td>{'\u2713'}</td>
      }
      default :{
        return <td>{'\u2795'}</td>
      }
    }
  }

}

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
        console.log("unloading")
        this.props.dispatch({
          type: types.LOADING_DATASET,
          dataset_id: this.props.dataset.id,
          loading: false
        });
        break;
      }
      default :{
        console.log("LLLLLOOOADINF")
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
        <LoadingStatus loading={this.props.dataset.loading}/>
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
