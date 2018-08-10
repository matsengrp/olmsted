import React from "react";
import { connect } from "react-redux";
import * as _ from 'lodash';
import * as types from "../../actions/types";
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


const PaginationControls = ({pageUp, pagination, pageDown}) => 
  <span>
    <span style={{padding:10}}><a onClick={pageUp}>page up</a></span>
    <span style={{padding:10}}>{pagination.page}</span>
    <span style={{padding:10}}><a onClick={pageDown}>page down</a></span>
  </span>


const TableAttribute = ({datum, attr}) =>
  <span>{this.props.datum[this.props.attr]}</span>


class Table extends React.Component {
  render(){
    let nCols = this.props.mappings.length
    let templateColumnsStyle = "auto ".repeat(nCols)
    return (
          <div className="grid-container"
               style={{gridTemplateColumns: templateColumnsStyle,
                       gridTemplateAreas: "\"" + "controls ".repeat(nCols) + "\""
               }}>
            <div className="item pagination-controls" style={{gridArea: "controls"}}>
              <PaginationControls pageUp={this.props.pageUp} pagination={this.props.pagination} pageDown={this.props.pageDown}/>
            </div>
            { _.map(this.props.mappings, ([name, attribute]) =>
              <div className="item" key={name} onClick={ ()=> this.props.toggleSort( attribute)}>{name}</div>) }
            {this.props.data.map((datum) => {
              return _.map(this.props.mappings, ([name, AttrOrComponent]) => {
                let isAttr = ((typeof AttrOrComponent) == "string")
                let InnerContent = isAttr ? <TableAttribute datum={datum} attr={AttrOrComponent}/> : <AttrOrComponent datum={datum} selectedFamily={this.props.selectedFamily} selectFamily={this.props.selectFamily}/>
                let key = datum.ident + '.' + (isAttr ? AttrOrComponent : name)
                let style = this.props.selectedFamily ? {backgroundColor: datum.ident == this.props.selectedFamily.ident ? "lightblue" : "white"} : {}
                //let result = <div className="item"
                            //key={key}
                            //style={style}>
                         //<InnerContent/>
                       //</div>
                //return result
                return <div className="item" key={key} style={{backgroundColor: "lightred"}}>{key}</div>
              })})}
          </div>)}}


const SelectAttribute = ({datum, selectedFamily, selectFamily}) =>
  <input   
    type="checkbox"
    style={{marginLeft: "5px"}}
    checked={selectedFamily? (datum.ident == selectedFamily.ident): false}
    onClick={() => {
      selectedFamily? console.log(selectedFamily.ident) : console.log("NONE")
      return selectFamily(datum)}}/>


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
  constructor(props) {
    super(props);
    // This binding is necessary to make `this` work in the callback
    this.pageUp = this.pageUp.bind(this);
    this.pageDown = this.pageDown.bind(this);
    this.toggleSort = this.toggleSort.bind(this);
    this.selectFamily = this.selectFamily.bind(this);
  }

  pageDown(){
    this.props.dispatch({type: types.PAGE_DOWN});
  }

  pageUp(){
    this.props.dispatch({type: types.PAGE_UP});
  }

  toggleSort(attribute){
    this.props.dispatch({type: types.TOGGLE_SORT, column: attribute});
  }

  selectFamily(family){
    this.props.dispatch({type: types.TOGGLE_FAMILY, family: family});
  }

  render() {
    return (
      <Table data={this.props.visibleClonalFamilies}
        mappings={
          [
           //["Select", SelectAttribute],
           //["Naive sequence", NaiveSequence],
           //["ID", "id"],
           ["N seqs", "n_seqs"],
           ["V gene", "v_gene"],
           ["D gene", "d_gene"],
           ["J gene", "j_gene"],
           ["seed run", "has_seed"],
          ]}
        pagination = {this.props.pagination}
        pageUp = {this.pageUp}
        pageDown = {this.pageDown}
        toggleSort = {this.toggleSort}
        selectFamily = {this.selectFamily}
        selectedFamily = {this.props.selectedFamily}/>
    )
  }       
}

export default ClonalFamiliesTable
