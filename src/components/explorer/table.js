import React from "react";
import { connect } from "react-redux";
import * as _ from 'lodash';
import * as types from "../../actions/types";
import getClonalFamiliesPageSelector from "../../selectors/clonalFamilies";
import VegaLite from 'react-vega-lite';
import * as vl from 'vega-lite';


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

const Table = ({pageUp, pageDown, toggleSort, data, mappings, pagination}) => {
  return (
          <div className="container">
            <div className="item"><a onClick={pageUp}>page up</a></div>
            <div className="item">{pagination.page}</div>
            <div className="item item-filler"><a onClick={pageDown}>page down</a></div>
            { _.map(mappings, ([name, attribute]) =>
              <div className="item" key={name} onClick={toggleSort.bind(this, attribute)}>{name}</div>) }
            {data.map((datum) => {
              return _.map(mappings, ([__, attr]) => {
                    if(attr == "naive_sequence"){
                      return <div className="item item-viz" key={attr}>
                              <MyVegaLite data={{values: data}}
                                onParseError={(...args) => console.error("parse error:", args)}
                                debug={/* true for debugging */ false}
                                spec={{
                                    width: 200,
                                    height: 150,
                                    mark: "point",
                                    encoding: {
                                      x: {field: "n_seqs", type: "quantitative"},
                                      y: {field: "mean_mut_freq", type: "quantitative"},
                                      color: {field: "subject.id", type: "nominal"},
                                      shape: {field: "sample.timepoint", type: "nominal"},
                                      opacity: {value: 0.35},
                                      }}}/>
                            </div>
                    }
                    return <div className="item" key={attr}>{datum[attr]}</div>
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
  }

  pageDown(){
    this.props.dispatch({type: types.PAGE_DOWN});
  }

  pageUp(){
    this.props.dispatch({type: types.PAGE_UP});
  }

  toggleSort(attribute){
    this.props.dispatch({type: types.TOGGLE_SORT, column: attribute})
  }

  render() {
    return (  
      <Table data={this.props.visibleClonalFamilies}
        mappings={
          [["ID", "id"],
           ["N seqs", "n_seqs"],
           ["V gene", "v_gene"],
           ["D gene", "d_gene"],
           ["J gene", "j_gene"],
           ["Naive sequence", "naive_sequence"]
            //["seed run", "has_seed"],
          ]}
        pagination = {this.props.pagination}
        pageUp = {this.pageUp}
        pageDown = {this.pageDown}
        toggleSort = {this.toggleSort}/>
    )
  }       
}

export default ClonalFamiliesTable
