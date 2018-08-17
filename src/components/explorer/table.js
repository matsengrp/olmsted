import React from "react";
import { connect } from "react-redux";
import * as _ from 'lodash';
import * as types from "../../actions/types";
import * as explorerActions from "../../actions/explorer.js"
import getClonalFamiliesPageSelector from "../../selectors/clonalFamilies";
import VegaLite from 'react-vega-lite';
import * as vl from 'vega-lite';
import {NaiveSequence} from './visualization';

const MyVegaLite = args => {
  if (args.debug) {
    console.log("compiling vega-lite", args.spec)
    try {
      console.log("resulting vega", vl.compile(args.spec).spec)
    } catch (e) {
      console.error("couldn't parse vega-lite:", e)
    }
  }
  return <VegaLite {...args}/>}

const tableStyle = {fontSize: '15px'};


@connect()
class PaginationControls extends React.Component {
  render () {
    return (
      <span>
        <span style={{padding:10}}><a onClick={() => this.props.dispatch(explorerActions.pageUp)}>page up</a></span>
        <span style={{padding:10}}>{this.props.pagination.page}</span>
        <span style={{padding:10}}><a onClick={() => this.props.dispatch(explorerActions.pageDown)}>page down</a></span>
      </span>)}}


@connect()
class Table extends React.Component {
  render () {
    let nCols = this.props.mappings.length
    let templateColumnsStyle = "auto ".repeat(nCols)
    return (
          <div className="grid-container"
               style={{gridTemplateColumns: templateColumnsStyle,
                       gridTemplateAreas: "\"" + "controls ".repeat(nCols) + "\""
               }}>
            <div className="item pagination-controls" style={{gridArea: "controls"}}>
              <PaginationControls pagination={this.props.pagination} />
            </div>
            { _.map(this.props.mappings, ([name, attribute]) =>
              <div className="item" key={name} onClick={ ()=> this.props.dispatch(explorerActions.toggleSort(attribute))}>{name}</div>) }
            {this.props.data.map((datum) => {
              return _.map(this.props.mappings, ([name, AttrOrComponent]) => {
                let isAttr = ((typeof AttrOrComponent) == "string")
                let key = datum.ident + '.' + (isAttr ? AttrOrComponent : name)
                let style = this.props.selectedFamily ? {backgroundColor: datum.ident == this.props.selectedFamily.ident ? "lightblue" : "white"} : {}
                return <div className="item" key={key} style={{backgroundColor: "lightred"}}>
                  {isAttr ?
                    <span>{datum[AttrOrComponent]}</span> :
                    <AttrOrComponent datum={datum} selectedFamily={this.props.selectedFamily}/>}
                  </div>
              })})}
          </div>)}}


@connect(
  (store) => ({}),
  (dispatch) => ({
    dispatchSelect: (family) => {
      dispatch(explorerActions.selectFamily(family))}}))
class SelectAttribute extends React.Component {
  render () {
    return (
      <input
        type="checkbox"
        style={{marginLeft: "5px"}}
        checked={this.props.selectedFamily? (this.props.datum.ident == this.props.selectedFamily.ident): false}
        onClick={() => this.props.dispatchSelect(this.props.datum)}/>)}}


const makeMapStateToProps = () => {
  const getClonalFamiliesPage = getClonalFamiliesPageSelector()
  const mapStateToProps = (state) => {
    let newClonalFamiliesPage = getClonalFamiliesPage(state.clonalFamilies)
    return Object.assign({}, state.clonalFamilies, {
      visibleClonalFamilies: newClonalFamiliesPage
    })
  }
  return mapStateToProps
}

@connect(makeMapStateToProps)
class ClonalFamiliesTable extends React.Component {

  render() {
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
           ["seed run", "has_seed"],
          ]}
        pagination = {this.props.pagination}
        selectedFamily = {this.props.selectedFamily}/>
    )
  }       
}

export default ClonalFamiliesTable
