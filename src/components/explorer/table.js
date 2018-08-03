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
              <span style={{padding:10}}><a onClick={this.props.pageUp}>page up</a></span>
              <span style={{padding:10}}>{this.props.pagination.page}</span>
              <span style={{padding:10}}><a onClick={this.props.pageDown}>page down</a></span>
            </div>
            { _.map(this.props.mappings, ([name, attribute]) =>
              <div className="item" key={name} onClick={ ()=> this.props.toggleSort( attribute)}>{name}</div>) }
            {this.props.data.map((datum) => {
              return _.map(this.props.mappings, ([__, attr, createComponent]) => {
                   
                    return createComponent(datum, attr, this.props.selectedFamily, this.props.selectFamily)
                         
                  }
                ) 
              }
            )}
          </div>
        )}

      }

const createNaiveAttribute = (datum, attr, selected, selectFamily) => {
  return <NaiveAttribute  datum = {datum} selectedFamily = {selected}/>
}

class NaiveAttribute extends React.Component { 
  render(){
    return <div className="item item-viz"
              style={this.props.selectedFamily? {backgroundColor: this.props.datum.ident == this.props.selectedFamily.ident ? "lightblue" : "white"} : {}}
              key={this.props.datum.ident + "-naive-sequence"}>
            <NaiveSequence datum={this.props.datum}/>
          </div>
  }
}

const createSelectAttribute = (datum, attr, selected, selectFamily) => {
  return <SelectAttribute datum = {datum} selectedFamily = {selected} selectFamily = {selectFamily}/>
}  

class SelectAttribute extends React.Component { 
  render(){
    return <div className="item"
            style={this.props.selectedFamily? {backgroundColor: this.props.datum.ident == this.props.selectedFamily.ident ? "lightblue" : "white"} : {}}
            onClick={() => {
              this.props.selectedFamily? console.log(this.props.selectedFamily.ident) : console.log("NONE")
              return this.props.selectFamily(this.props.datum)
            }
          }
            >
            <input   
              style={{marginLeft: "5px"}}
              checked={this.props.selectedFamily? (this.props.datum.ident == this.props.selectedFamily.ident): false}
              type="checkbox"
              >
            </input>
          </div>
  }
}

const createTableAttribute = (datum, attr, selected, onClick) => {
  return <TableAttribute attr = {attr} datum = {datum} selectedFamily = {selected}/>
}

class TableAttribute extends React.Component { 
  render(){
    return <div className="item" key={this.props.attr}
                style={this.props.selectedFamily? {backgroundColor: this.props.datum.ident == this.props.selectedFamily.ident ? "lightblue" : "white"} : {}}>
              {this.props.datum[this.props.attr]}
            </div>
  }
}

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
          [["Select", "select", createSelectAttribute],
          ["Naive sequence", "naive_sequence", createNaiveAttribute],
           //["ID", "id"],
           ["N seqs", "n_seqs", createTableAttribute],
           ["V gene", "v_gene", createTableAttribute],
           ["D gene", "d_gene", createTableAttribute],
           ["J gene", "j_gene", createTableAttribute],
           ["seed run", "has_seed", createTableAttribute],
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
