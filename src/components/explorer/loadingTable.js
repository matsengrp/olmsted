import React from "react";
import { connect } from "react-redux";
import { LoadingStatus, SimpleInProgress } from "../util/loading";
import { countLoadedClonalFamilies } from "../../selectors/clonalFamilies";

@connect((state) => ({
  loadedClonalFamilies: countLoadedClonalFamilies(state.datasets.availableDatasets)
}))
export default class LoadingTable extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    return (
      <div>
        <div style={{ marginBottom: "10px" }}>
          <span>You have the following datasets loaded:</span>
        </div>
        
        <div style={{
          border: "1px solid #dee2e6",
          borderRadius: "4px",
          overflow: "hidden"
        }}>
          <div style={{
            maxHeight: "200px",
            overflowY: "auto",
            overflowX: "auto"
          }}>
            <table style={{
              width: "100%",
              tableLayout: "fixed",
              borderCollapse: "collapse"
            }}>
              <colgroup>
                <col style={{ width: "200px" }} />
                <col style={{ width: "200px" }} />
                <col style={{ width: "120px" }} />
              </colgroup>
              <thead style={{
                position: "sticky",
                top: 0,
                zIndex: 10,
                backgroundColor: "white"
              }}>
                <tr style={{ height: "40px" }}>
                  {["Name", "ID", "Loading Status"].map((header, colIndex) => {
                    const isEvenColumn = colIndex % 2 === 0;
                    return (
                      <th 
                        key={colIndex}
                        style={{
                          backgroundColor: isEvenColumn ? '#e9ecef' : '#f8f9fa',
                          padding: "8px",
                          height: "40px",
                          verticalAlign: "middle",
                          textAlign: "left",
                          borderBottom: "2px solid #dee2e6"
                        }}
                      >
                        {header}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {this.props.datasets.map((dataset) => dataset.loading
                            && (
                            <tr key={dataset.dataset_id} style={{ height: "40px" }}>
                              {[
                                dataset.name || dataset.dataset_id,
                                dataset.dataset_id,
                                <LoadingStatus loadingStatus={dataset.loading} loading={<SimpleInProgress/>} done={'\u2713'} default=""/>
                              ].map((content, colIndex) => {
                                const isEvenColumn = colIndex % 2 === 0;
                                const cellStyle = {
                                  padding: "8px",
                                  height: "40px",
                                  verticalAlign: "middle",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap"
                                };
                                
                                if (isEvenColumn) {
                                  cellStyle.backgroundColor = '#f8f9fa';
                                }
                                
                                // Special styling for ID column
                                if (colIndex === 1) {
                                  cellStyle.fontSize = "11px";
                                  cellStyle.color = "#666";
                                  cellStyle.fontFamily = "monospace";
                                }
                                
                                return (
                                  <td key={colIndex} style={cellStyle}>
                                    {content}
                                  </td>
                                );
                              })}
                            </tr>
                            ))}
              </tbody>
            </table>
          </div>
        </div>
        
        <p>
          Loaded clonal families: {this.props.loadedClonalFamilies}
        </p>
      </div>
    );
  }
}
