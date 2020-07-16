import React from "react";
import { LoadingStatus, SimpleInProgress } from "../util/loading";
import { countLoadedClonalFamilies } from "../../selectors/clonalFamilies";
import { connect } from "react-redux";

@connect((state) => ({
    loadedClonalFamilies: countLoadedClonalFamilies(state.datasets.availableDatasets),
}))
export default class LoadingTable extends React.Component {
    render(){
        return <div>
            <table>
                <tbody>

                    <tr>
                        <th>Dataset</th>
                        <th>Loading Status</th>
                    </tr>
                    {this.props.datasets.map((dataset) => 
                        dataset.loading &&
                        <tr key={dataset.dataset_id}>
                            <td>{dataset.dataset_id}</td>
                            <td>
                                <LoadingStatus loadingStatus={dataset.loading} loading={<SimpleInProgress/>} done={'\u2713'} default={''}/>
                            </td>
                        </tr>
                    )}
                </tbody>

            </table>
            <p>Loaded clonal families {this.props.loadedClonalFamilies}</p>
        </div>
    }
}
