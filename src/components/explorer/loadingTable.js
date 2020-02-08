import React from "react";
import { LoadingStatus, SimpleInProgress } from "../util/loading";
import { getAvailableClonalFamilies } from "../../selectors/clonalFamilies";
import { connect } from "react-redux";

@connect((state) => ({
    availableClonalFamiliesCount: getAvailableClonalFamilies(state).length,
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
            <p>Loaded clonal families {this.props.availableClonalFamiliesCount}</p>
        </div>
    }
}
