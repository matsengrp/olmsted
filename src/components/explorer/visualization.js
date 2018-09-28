import { connect } from "react-redux";
import React from "react";
import Vega from 'react-vega';
import VegaLite from 'react-vega-lite';
import * as vl from 'vega-lite';
import * as types from '../../actions/types';
import {createClassFromSpec} from 'react-vega';
import {naiveVegaSpec, clonalFamiliesVizCustomSpec, concatTreeWithAlignmentSpec, seqAlignSpec} from './vega/vega_specs.js';
import { getTipsDataSelector, getLineageDataSelector} from "../../selectors/selectedFamily";
import * as explorerActions from "../../actions/explorer.js"
import * as _ from "lodash";
import Copy from "./copy";
import DownloadFasta from "./downloadfasta";

const MyVegaLite = args => {
  if (args.debug) {
    console.log("compiling vega-lite", args.spec)
    try {
      console.log("resulting vega", vl.compile(args.spec).spec)
    } catch (e) {
      console.error("couldn't parse vega-lite:", e)
    }
  }
  return <VegaLite {...args}/>
}

const getNaiveVizData = (datum) => {
  let result = {
    source: [
    {
      family: "5p",
      region: "CDR3",
      start: datum.cdr3_start,
      end: datum.cdr3_start + datum.cdr3_length
    },
    {
      family: "5p",
      region: "V gene",
      gene: datum.v_gene,
      start: datum.v_start,
      end: datum.v_end
    },
    {
      family: "5p",
      region: "Insertion 1",
      start: datum.v_end,
      end: datum.d_start
    },
    {
      family: "5p",
      region: "D gene",
      gene: datum.d_gene,
      start: datum.d_start,
      end: datum.d_end
    },
    {
      family: "5p",
      region: "Insertion 2",
      start: datum.d_end,
      end: datum.j_start
    },
    {
      family: "5p",
      region: "J gene",
      gene: datum.j_gene,
      start: datum.j_start,
      end: datum.j_end
    }
  ]} 
  return result 
}

const NaiveViz = createClassFromSpec(naiveVegaSpec)

const NaiveSequence = ({datum}) => {
  return <NaiveViz data = {getNaiveVizData(datum)} />;
}

@connect((state) => ({
  availableClonalFamilies: state.clonalFamilies.availableClonalFamilies}))
class ClonalFamiliesViz extends React.Component {
  constructor(props) {
    super(props);
    // This binding is necessary to make `this` work in the callback
    this.updateBrushSelection = this.updateBrushSelection.bind(this);
  }

  updateBrushSelection(args){
    this.props.dispatch({type: types.UPDATE_BRUSH_SELECTION, updatedBrushData: args});
  }
  

  render() {
    return <MyVegaLite data={{values: this.props.availableClonalFamilies}}
      onSignalTooltip={/* doesn't work yet */ (...args) => console.log("Tooltip:", args)}
      onSignalHover={/* doesn't work yet */ (...args) => console.log("Hover:", args)}
      onSignalBrush_n_seqs={(...args) => {
        this.updateBrushSelection(args)
      }}
      onSignalBrush_mean_mut_freq={(...args) => {
        this.updateBrushSelection(args)
      }}
      onParseError={(...args) => console.error("parse error:", args)}
      debug={/* true for debugging */ true}
      spec={{
          width: 900,
          height: 700,
          mark: "point",
          selection: {brush: {type: "interval"}},
          encoding: {
            x: {field: "n_seqs", type: "quantitative"},
            y: {field: "mean_mut_freq", type: "quantitative"},
            color: {field: "subject.id", type: "nominal"},
            shape: {field: "sample.timepoint", type: "nominal"},
            opacity: {value: 0.35},
            }}}/>;
      }};

@connect((state) => ({
  availableClonalFamilies: state.clonalFamilies.availableClonalFamilies}))
class ClonalFamiliesVizCustom extends React.Component {
  constructor(props) {
    super(props);
    // This binding is necessary to make `this` work in the callback
    this.updateBrushSelection = this.updateBrushSelection.bind(this);
    this.xField = "n_seqs";
    this.yField = "mean_mut_freq";
    // this.state = { xField: "n_seqs",
    //                yField: "mean_mut_freq",
    //               //  colorBy: "subject.id",
    //               //  shapeBy: "sample.timepoint",
    //                brushX: [],
    //                brushY: [],
    //               };

    // How much of the width available to it should this component take up
    // this.widthFraction = 0.6
  }

  updateBrushSelection(dim, attr, data){
    let updateBrushData = [dim, attr, data]
    this.props.dispatch({type: types.UPDATE_BRUSH_SELECTION, updatedBrushData: updateBrushData});
  }
  
  render() {
    console.log('rerender')
    return <Vega
      onSignalXField={(...args) => {
        let result = args.slice(1)[0]
        this.xField = result

        // if(result !== this.state.xField){
        //   this.setState({xField: result})
        // }
      }}
      onSignalYField={(...args) => {
        let result = args.slice(1)[0]
        this.yField = result
        // if(result !== this.state.yField){
        //   this.setState({yField: result})
        // }
      }}
      // onSignalColorBy={(...args) => {
      //   let result = args.slice(1)[0];
      //   if(result !== this.state.colorBy){
      //     this.setState({colorBy: result})
      //   }
      // }}
      // onSignalShapeBy={(...args) => {
      //   let result = args.slice(1)[0]

      //   if(result !== this.state.shapeBy){
      //     this.setState({shapeBy: result})
      //   }
      // }}
      // onSignalBrush_x={(...args) => {
      //   let result = args.slice(1)[0]
      //   console.log(result, this.state.brushX)
      //   if(result !== this.state.brushX){
      //     this.setState({brushX: result})
      //   }
      // }}
      // onSignalBrush_y={(...args) => {
      //   let result = args.slice(1)[0]
      //   console.log(result, this.state.brushY)
      //   if(result !== this.state.brushY){
      //     this.setState({brushY: result})
      //   }
      // }}
      onSignalBrush_x_field={(...args) => {
        let result = args.slice(1)[0]
        console.log(result)
        this.updateBrushSelection("x", this.xField, result)
        // this.updateBrushSelection("x", this.state.xField, result)
      }}
      onSignalBrush_y_field={(...args) => {
        let result = args.slice(1)[0]
        this.updateBrushSelection("y", this.yField, result)
        // this.updateBrushSelection("y", this.state.yField, result)
      }}
      onParseError={(...args) => console.error("parse error:", args)}
      debug={/* true for debugging */ true}
      // spec={clonalFamiliesVizCustomSpec(this.props.availableClonalFamilies, this.state, this.props.availableWidth*this.widthFraction)}/>;
      spec={clonalFamiliesVizCustomSpec(this.props.availableClonalFamilies, null, null)}/>;
    }
};

const mapStateToPropsTips = (state) => {
  return {
    selectedFamily: getTipsDataSelector(state.clonalFamilies),
    treeScale: state.clonalFamilies.treeScale
  }
}

const mapDispatchToProps = (dispatch) => ( {
  dispatchTreeScale: (val) => {
    dispatch(explorerActions.updateTreeScale(val))
  },
  dispatchSelectedSeq: (seq) => {
    dispatch(explorerActions.updateSelectedSeq(seq))
  }
})

@connect(mapStateToPropsTips, mapDispatchToProps , null,
  {areStatesEqual: (next, prev) => {
    return _.isEqual(prev.clonalFamilies.selectedFamily, next.clonalFamilies.selectedFamily) && _.isEqual(prev.clonalFamilies.treeScale, next.clonalFamilies.treeScale)}})
class TreeViz extends React.Component {
  render() {
    // clone for assign by value
    this.treeScale = _.clone(this.props.treeScale);
    return <div>
            <h2>Clonal family details</h2>
            <Vega onParseError={(...args) => console.error("parse error:", args)}
            onSignalBranchScale={(...args) => {
              let branch_scale = args.slice(1)[0];
              this.treeScale.branch_scale = branch_scale
            }}
            onSignalHeightScale={(...args) => {
              let height_scale = args.slice(1)[0];
              this.treeScale.height_scale = height_scale
            }}
            onSignalPts_tuple={(...args) => {
              let node = args.slice(1)[0]
              if(node.parent){
                // update selected sequence for lineage mode if it has a parent ie if it is not a bad request
                this.props.dispatchTreeScale(this.treeScale)
                this.props.dispatchSelectedSeq(node)
              }
            }}
            debug={/* true for debugging */ false}
            spec={concatTreeWithAlignmentSpec(this.props.selectedFamily, this.treeScale)}
            />
            <DownloadFasta sequencesSet={this.props.selectedFamily.download_unique_family_seqs.slice()}
                           filename={this.props.selectedFamily.sample.id.concat('-',this.props.selectedFamily.id, '.fasta')}
                           label="Download Fasta: Unique Sequences In This Family"/>
          </div>
            }};

const mapStateToPropsLineage = (state) => {
    return {
      selectedFamily: getLineageDataSelector(state.clonalFamilies),
      selectedSeq: state.clonalFamilies.selectedSeq,
    }
}

@connect(mapStateToPropsLineage, null, null, 
  {areStatesEqual: (next, prev) => {
    return _.isEqual(prev.clonalFamilies.selectedFamily, next.clonalFamilies.selectedFamily) && _.isEqual(prev.clonalFamilies.selectedSeq, next.clonalFamilies.selectedSeq)}})
class Lineage extends React.Component {
  render() {
        return <div>
          <h2>{this.props.selectedSeq.label}</h2>
          <h3>Amino acid sequence:</h3>
          <h3>{this.props.selectedSeq.aa_seq}</h3>
          <Copy value={this.props.selectedSeq.nt_seq ? this.props.selectedSeq.nt_seq: "NO NUCLEOTIDE SEQUENCE"} buttonLabel="Copy nucleotide sequence to clipboard"/>
          <DownloadFasta sequencesSet={this.props.selectedFamily.download_lineage_seqs.slice()}
                           filename={this.props.selectedSeq.id.concat('-lineage.fasta')}
                           label="Download Fasta: Lineage Sequences"/>
          <h3>Lineage</h3>
          <Vega
          onParseError={(...args) => console.error("parse error:", args)}
          debug={/* true for debugging */ false}
          spec={seqAlignSpec(this.props.selectedFamily)}
          />
        </div>
        }};

export {ClonalFamiliesViz, ClonalFamiliesVizCustom, TreeViz, NaiveSequence, Lineage}
