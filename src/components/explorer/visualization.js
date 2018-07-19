import { connect } from "react-redux";
import React from "react";
import Vega from 'react-vega';
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


@connect((state) => ({
  availableClonalFamilies: state.clonalFamilies.availableClonalFamilies}))
class ClonalFamiliesViz extends React.Component {
  render() {
    return <MyVegaLite data={{values: this.props.availableClonalFamilies}}
      onSignalTooltip={/* doesn't work yet */ (...args) => console.log("Tooltip:", args)}
      onSignalHover={/* doesn't work yet */ (...args) => console.log("Hover:", args)}
      onSignalBrush_n_seqs={(...args) => console.log("Brushed n_seqs:", args)}
      onSignalBrush_mean_mut_freq={(...args) => console.log("Brushed mut_freqs:", args)}
      onParseError={(...args) => console.error("parse error:", args)}
      debug={/* true for debugging */ false}
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
class ClonalFamiliesViz2 extends React.Component {
  render() {
    return <VegaLite data={{values: this.props.availableClonalFamilies}}
      onSignalHover={(...args) => console.log(args)}
      onParseError={(...args) => console.error("vega parse error!:", args)}
      spec={{
          width: 900,
          height: 700,
          mark: "point",
          transform: [{
            bin: true,
            field: "subject.id",
            as: "subject_id" 
          }],
          selection: {
            picked: {
              type: "single", 
              fields:["subject_id"],
              bind: {input: "select", options: ["QA255", "MG505"]},
              resolve: "global",
              empty: "all"
            }
          },
          encoding: {
            x: {field: "n_seqs", type: "quantitative"},
            y: {field: "mean_mut_freq", type: "quantitative"},
            color: {
              condition: {
                selection: "picked", 
                type: "nominal",
                value: "black"
              },
              field: "subject.id",
              type: "nominal"
            },
            shape: {field: "sample.timepoint", type: "nominal"},
            opacity: {value: 0.35},
          }
          
          }}/>;
      }};

export {ClonalFamiliesViz, ClonalFamiliesViz2}
