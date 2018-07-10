import React from "react";
import {processAvailableDatasets} from "../status";
import { TOGGLE_DATASET } from "../../actions/types";
import { red } from "./displayError";

const formatDataset = (dataset, dispatch) => {
  return (
    <tr key={dataset.id}
      style={{backgroundColor: dataset.selected ? "lightblue" : "white", cursor: "pointer", fontWeight: "400", fontSize: "94%"}}
      onClick={() => dispatch({type: TOGGLE_DATASET, dataset: dataset})}>
      <td><input style={{marginLeft: "5px"}} type="checkbox" checked={dataset.selected}></input></td>
      <td>{dataset.id}</td>
      <td>{dataset.n_subjects}</td>
      <td>{dataset.n_clonal_families}</td>
      <td>{dataset.build.time}</td>
    </tr>
  );
};

export const displayAvailableDatasets = (availableDatasets, dispatch) => {
  if (!availableDatasets) {
    return (
      <div style={{fontSize: "20px", fontWeight: 400, color: red}}>
        {"There was an error fetching the datasets"}
      </div>
    );
  }
  const queries = availableDatasets;
  return (
    <div>
      <div style={{fontSize: "26px"}}>
        {"Available Datasets:"}
      </div>
      <table style={{marginLeft: "-22px"}}>
        <tbody>
          <tr>
            <th>Selected</th>
            <th>ID</th>
            <th>Subjects</th>
            <th>Clonal Families</th>
            <th>Build time</th>
          </tr>
          {queries.map((data) => formatDataset(data, dispatch))}
        </tbody>
      </table>
    </div>
  );
};
