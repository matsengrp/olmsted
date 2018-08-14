import React from "react";
import { connect } from "react-redux";
import * as _ from 'lodash';
import * as types from "../../actions/types";
import getClonalFamiliesPageSelector from "../../selectors/clonalFamilies";
import {NaiveSequence} from './visualization';

const Table = ({pageUp, pageDown, toggleSort, data, mappings, pagination, selectFamily, selectedFamily}) => {
  let nCols = mappings.length
  let templateColumnsStyle = "auto ".repeat(nCols)
  return (
          <div className="grid-container"
               style={{gridTemplateColumns: templateColumnsStyle,
                       gridTemplateAreas: "\"" + "controls ".repeat(nCols) + "\""
               }}>
            <div className="item pagination-controls" style={{gridArea: "controls"}}>
              <span style={{padding:10}}><a onClick={pageUp}>page up</a></span>
              <span style={{padding:10}}>{pagination.page}</span>
              <span style={{padding:10}}><a onClick={pageDown}>page down</a></span>
            </div>
            { _.map(mappings, ([name, attribute]) =>
              <div className="item" key={name} onClick={toggleSort.bind(this, attribute)}>{name}</div>) }
            {data.map((datum) => {
              return _.map(mappings, ([__, attr]) => {
                    if(attr == "naive_sequence"){
                      return <div className="item item-viz"
                                  style={selectedFamily? {backgroundColor: datum.ident == selectedFamily.ident ? "lightblue" : "white"} : {}}
                                  key={datum.ident + "-naive-sequence"}>
                              <NaiveSequence datum={datum}/>
                            </div>
                    }
                    else if (attr == "select"){
                      return( <div className="item"
                                style={selectedFamily? {backgroundColor: datum.ident == selectedFamily.ident ? "lightblue" : "white"} : {}}
                                onClick={() => selectFamily(datum)}
                                key={datum.ident +"-select"}>
                                <input   
                                  style={{marginLeft: "5px"}}
                                  checked={selectedFamily? (datum.ident == selectedFamily.ident): false}
                                  type="checkbox"
                                  >
                                </input>
                              </div>)
                    }
                    return <div className="item" key={attr}
                                style={selectedFamily? {backgroundColor: datum.ident == selectedFamily.ident ? "lightblue" : "white"} : {}}>
                             {datum[attr]}
                           </div>
                  }
                ) 
              }
            )}
          </div>
        )}

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
          [["Select", "select"],
          ["Naive sequence", "naive_sequence"],
           //["ID", "id"],
           ["N seqs", "n_seqs"],
           ["Mean mut freq", "mean_mut_freq"],
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
