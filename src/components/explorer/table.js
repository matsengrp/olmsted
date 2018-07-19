import React from "react";
import { connect } from "react-redux";
import * as _ from 'lodash';
import * as types from "../../actions/types";
import getClonalFamiliesPageSelector from "../../selectors/clonalFamilies";

const tableStyle = {fontSize: '15px'};

const Table = ({pageUp, pageDown, toggleSort, data, mappings, pagination}) => {
  return (<table style={tableStyle}>
            <tbody>
              <tr>
                <th><a onClick={pageUp}>page up</a></th>
                <th>{pagination.page}</th>
                <th><a onClick={pageDown}>page down</a></th>
              </tr>
              <tr>
                { _.map(mappings, ([name, attribute]) =>
                  <th key={name} onClick={toggleSort.bind(this, attribute)}>{name}</th>) }
              </tr>
              {data.map((datum) =>
                <tr key={datum.ident}>
                  { _.map(mappings, ([__, attr]) =>
                    <td key={attr}>{datum[attr]}</td>) }
                </tr>
              )}
            </tbody>
          </table>)}

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
