import React from "react";
import { connect } from "react-redux";
import * as _ from 'lodash';
import * as explorerActions from "../../actions/explorer.js"
import {getClonalLineagesPage, getLastPage} from "../../selectors/clonalLineages";
import {NaiveSequence} from './naive';


@connect((state) => ({last_page: getLastPage(state)}),
        (dispatch) => ({
          dispatchPageUp: () => {
            dispatch(explorerActions.pageUp)
          },
          dispatchPageDown: () => {
            dispatch(explorerActions.pageDown)
          }
        })
      )
class PaginationControls extends React.Component {
  render () {
    let is_first_page = this.props.pagination.page == 0
    let is_last_page = this.props.pagination.page == this.props.last_page
    return (
      <span className="non-selectable-text">
        {<span style={{padding:10}}><a style={{color: is_first_page ? 'white': 'black'}} onClick={() => !is_first_page && this.props.dispatchPageUp()}>{'\u25c0'}</a></span>}
        {/* We compute page based on starting from 0 for our own sake, but for the user's sake we display it as if we start with 1*/}
        <span style={{padding:10}}>{`${this.props.pagination.page+1}/${this.props.last_page+1}`}</span>
        {<span style={{padding:10}}><a style={{color: is_last_page ? 'white': 'black'}} onClick={() => !is_last_page && this.props.dispatchPageDown() }>{'\u25b6'}</a></span>}
      </span>)}}


@connect()
class Table extends React.Component {
  render () {
    let nCols = this.props.mappings.length
    let templateColumnsStyle = "auto ".repeat(nCols)
    return (
          <div className="grid-container"
               style={{gridTemplateColumns: templateColumnsStyle,
                       gridTemplateAreas: "\"" + "controls ".repeat(nCols) + "\"",
                       maxWidth: nCols*80 + 400,
                       fontSize: 12
               }}>
            {/* Pagination controls */}
            <div className="grid-item pagination-controls" style={{gridArea: "controls"}}>
              <PaginationControls pagination={this.props.pagination} />
            </div>
            {/* Table Headers */}
            { _.map(this.props.mappings, ([name, AttrOrComponent]) => {
              // if we are sorting by this column show asc or desc arrow
              let is_sorting = this.props.pagination.order_by == AttrOrComponent
              if(is_sorting){
                let sorting_arrow = this.props.pagination.desc ? ' \u25BC' : ' \u25B2'
                name = name + sorting_arrow
              }
              let style = is_sorting ? {fontSize:  14, fontWeight: "bold"} : {fontSize: 13}
              // check to make sure its an attribute so we can sort by it (onclick)
              let isAttr = ((typeof AttrOrComponent) == "string");
              // set to click cursor if we can sort on it
              if(isAttr){
                style.cursor = "pointer"
              }
              return <div className="grid-item"
                          key={name} 
                          style={style}
                          onClick={ ()=> {isAttr && this.props.dispatch(explorerActions.toggleSort(AttrOrComponent))}}
                     >
                        {name}
                     </div>
            })}
            {/* Table Items */}
            {this.props.data.map((datum) => {
              return _.map(this.props.mappings, ([name, AttrOrComponent]) => {
                let isAttr = ((typeof AttrOrComponent) == "string")
                let key = datum.ident + '.' + (isAttr ? AttrOrComponent : name)
                let style = this.props.selectedLineage ? {backgroundColor: datum.ident == this.props.selectedLineage.ident ? "lightblue" : "white"} : {}
                style = Object.assign(style, {padding: 3})
                return <div className="grid-item" key={key} style={style}>
                  {isAttr ?
                    <div style={{marginTop: 5, marginBottom: 5}}>{String(_.get(datum, AttrOrComponent))}</div> :
                    <AttrOrComponent datum={datum} selectedLineage={this.props.selectedLineage}/>}
                  </div>
              })})}
          </div>)}}


@connect((store) => ({}),
        (dispatch) => ({
          dispatchSelect: (lineage_ident) => {
            dispatch(explorerActions.selectLineage(lineage_ident))
          }
        })
      )
class SelectAttribute extends React.Component {
  render () {
    return (
      <input
        type="checkbox"
        style={{cursor: "pointer"}}
        checked={this.props.selectedLineage? (this.props.datum.ident == this.props.selectedLineage.ident): false}
        onChange={() => this.props.dispatchSelect(this.props.datum.ident)}/>
    )
  }
}


const mapStateToProps = (state) => {
    let newClonalLineagesPage = getClonalLineagesPage(state)
    return {
      visibleClonalLineages: newClonalLineagesPage,
      pagination: state.clonalLineages.pagination,
      selectedLineage: state.clonalLineages.selectedLineage,
      selectingStatus: state.clonalLineages.brushSelecting
    }
}


@connect(mapStateToProps,
  {
    selectLineage: explorerActions.selectLineage
  }
  )
class ClonalLineagesTable extends React.Component {

  componentDidUpdate(prevProps) {
    // Checks:
    // 1. prevProps.selectingStatus: We were previously doing a brush selection
    // 2. !this.props.selectingStatus: We are done doing the brush selection
    // 3. this.props.visibleClonalLineages.length > 0: There is at least one clonal lineage in the selection to autoselect for detail view
    if (prevProps.selectingStatus && !this.props.selectingStatus && this.props.visibleClonalLineages.length > 0) {
      this.props.selectLineage(this.props.visibleClonalLineages[0].ident);
    }
  }

  render() {
    this.selectedLineage = _.find(this.props.visibleClonalLineages, {"ident": this.props.selectedLineage})
    return (
      <Table data={this.props.visibleClonalLineages}
        mappings={
          [
           ["Select", SelectAttribute],
           ["Naive sequence", NaiveSequence],
           ["ID", "clone_id"],
           // TODO decide on language for unique seqs vs rearrangement count
           ["Unique seqs", "unique_seqs_count"],
           ["V gene", "v_call"],
           ["D gene", "d_call"],
           ["J gene", "j_call"],
           ["Seed run", "has_seed"],
           ["Subject", "subject_id"],
           ["Sample", "sample_id"],
           ["Timepoint", "sample.timepoint_id"],
           ["Mut freq", "mean_mut_freq"],
           //["Path", 'path'],
           //["Entity", ({datum}) => _.toString(_.toPairs(datum))],
           ["Dataset", "dataset_id"],
           ["Ident", "ident"]
        ]}
        pagination = {this.props.pagination}
        selectedLineage = {this.selectedLineage}/>
    )
  }       
}

export default ClonalLineagesTable
