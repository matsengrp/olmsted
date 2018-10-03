import React from "react";
import { connect } from "react-redux";
import * as _ from 'lodash';
import * as explorerActions from "../../actions/explorer.js"
import getClonalFamiliesPageSelector from "../../selectors/clonalFamilies";
import {NaiveSequence} from './visualization';


@connect(null,
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
    return (
      <span>
        <span style={{padding:10}}><a onClick={() => this.props.dispatchPageUp()}>page up</a></span>
        {/* We compute page based on starting from 0 for our own sake, but for the user's sake we display it as if we start with 1*/}
        <span style={{padding:10}}>{this.props.pagination.page+1}</span>
        <span style={{padding:10}}><a onClick={() => this.props.dispatchPageDown()}>page down</a></span>
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
                       maxWidth: nCols*80 + 400
               }}>
            {/* Pagination controls */}
            <div className="grid-item pagination-controls" style={{gridArea: "controls"}}>
              <PaginationControls pagination={this.props.pagination} />
            </div>
            {/* Table Headers */}
            { _.map(this.props.mappings, ([name, AttrOrComponent]) => {
              // check to make sure its an attribute so we can sort by it (onclick)
              let isAttr = ((typeof AttrOrComponent) == "string");
              return <div className="grid-item"
                          key={name} 
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
                let style = this.props.selectedFamily ? {backgroundColor: datum.ident == this.props.selectedFamily.ident ? "lightblue" : "white"} : {}
                return <div className="grid-item" key={key} style={style}>
                  {isAttr ?
                    <div style={{marginTop: 5, marginBottom: 5}}>{String(_.get(datum, AttrOrComponent))}</div> :
                    <AttrOrComponent datum={datum} selectedFamily={this.props.selectedFamily}/>}
                  </div>
              })})}
          </div>)}}


@connect((store) => ({}),
        (dispatch) => ({
          dispatchSelect: (family_id) => {
            dispatch(explorerActions.selectFamily(family_id))
          }
        })
      )
class SelectAttribute extends React.Component {
  render () {
    return (
      <input
        type="checkbox"
        style={{marginLeft: "5px"}}
        checked={this.props.selectedFamily? (this.props.datum.ident == this.props.selectedFamily.ident): false}
        onClick={() => this.props.dispatchSelect(this.props.datum.ident)}/>
    )
  }
}


const makeMapStateToProps = () => {
  const getClonalFamiliesPage = getClonalFamiliesPageSelector()
  const mapStateToProps = (state) => {
    let newClonalFamiliesPage = getClonalFamiliesPage(state.clonalFamilies)
    return {
      visibleClonalFamilies: newClonalFamiliesPage,
      pagination: state.clonalFamilies.pagination,
      selectedFamily: state.clonalFamilies.selectedFamily
    }
  }
  return mapStateToProps
}

@connect(makeMapStateToProps)
class ClonalFamiliesTable extends React.Component {

  render() {
    this.selectedFamily = _.find(this.props.visibleClonalFamilies, {"ident": this.props.selectedFamily})
    return (
      <Table data={this.props.visibleClonalFamilies}
        mappings={
          [
           ["Select", SelectAttribute],
           ["Naive sequence", NaiveSequence],
           ["ID", "id"],
           ["N seqs", "n_seqs"],
           ["V gene", "v_gene"],
           ["D gene", "d_gene"],
           ["J gene", "j_gene"],
           ["Seed run", "has_seed"],
           ["Subject ID", "subject.id"]
          ]}
        pagination = {this.props.pagination}
        selectedFamily = {this.selectedFamily}/>
    )
  }       
}

export default ClonalFamiliesTable
