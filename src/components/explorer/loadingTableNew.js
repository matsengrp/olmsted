import React from "react";
import { connect } from "react-redux";
import { LoadingStatus, SimpleInProgress } from "../util/loading";
import { countLoadedClonalFamilies } from "../../selectors/clonalFamilies";
import { ResizableTable } from "../util/resizableTable";
import * as _ from "lodash";

// Component for the citation column
class CitationCell extends React.Component {
  render() {
    const paper = this.props.datum.paper;
    if (!paper) return <span>—</span>;
    
    if (paper.url) {
      return <a href={paper.url} onClick={(e) => e.stopPropagation()}>{paper.authorstring}</a>;
    }
    return <span>{paper.authorstring}</span>;
  }
}

// Component for non-selectable load status
class LoadStatusDisplay extends React.Component {
  render() {
    return (
      <div style={{ width: '100%', textAlign: 'center' }}>
        <LoadingStatus 
          loadingStatus={this.props.datum.loading} 
          loading={<SimpleInProgress/>} 
          done={'\u2713'} 
          default=""
        />
      </div>
    );
  }
}

@connect((state) => ({
  loadedClonalFamilies: countLoadedClonalFamilies(state.datasets.availableDatasets)
}))
export default class LoadingTable extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    // Filter only loaded datasets
    const loadedDatasets = this.props.datasets.filter(d => d.loading);
    
    // Check if we need citation column
    const showCitation = _.some(loadedDatasets, d => d.paper !== undefined);

    // Build mappings for the table - same as Available Datasets but without Actions and non-selectable Load Status
    const mappings = [
      ["Status", LoadStatusDisplay, { sortable: false }],
      ["Name", (d) => (d.name || d.dataset_id), { sortKey: "name" }],
      ["ID", "dataset_id", { style: { fontSize: "11px", color: "#666", fontFamily: "monospace" } }],
      ["Source", (d) => ((d.isClientSide || d.temporary) ? "Local" : "Server"), 
        { style: { fontSize: "12px" }, sortKey: "isClientSide" }],
      ["Subjects", "subjects_count"],
      ["Families", "clone_count"],
      ["Build Time", (d) => (d.build ? d.build.time || '—' : '—'), { sortKey: "build.time" }]
    ];

    if (showCitation) {
      mappings.push(["Citation", CitationCell, { sortable: false }]);
    }

    // Define column widths
    const columnWidths = [
      60,   // Status
      200,  // Name
      150,  // ID
      80,   // Source
      80,   // Subjects
      100,  // Families
      120,  // Build time
      ...(showCitation ? [150] : [])
    ];

    return (
      <div>
        <div style={{ marginBottom: "10px" }}>
          <span>You have the following datasets loaded:</span>
        </div>
        
        <ResizableTable
          data={loadedDatasets}
          mappings={mappings}
          columnWidths={columnWidths}
          containerHeight={200}
          itemName="loaded datasets"
          componentProps={{ dispatch: this.props.dispatch }}
        />
        
        <p style={{ marginTop: "10px" }}>
          Loaded clonal families: {this.props.loadedClonalFamilies}
        </p>
      </div>
    );
  }
}