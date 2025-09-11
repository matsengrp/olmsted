import React from "react";
import { createClassFromSpec } from "react-vega";
import * as _ from "lodash";
import naiveVegaSpec from "./vega/naive.js";

// Naive gene reassortment viz component
// =====================================

const getNaiveVizData = (datum) => {
  const result = {
    source: [
      {
        family: "5p",
        region: "CDR3",
        start: datum.junction_start,
        end: datum.junction_start + datum.junction_length
      },
      {
        family: "5p",
        region: "V gene",
        gene: datum.v_call,
        start: datum.v_alignment_start,
        end: datum.v_alignment_end
      },
      {
        family: "5p",
        region: "5' Insertion",
        start: datum.v_alignment_end,
        end: datum.d_alignment_start
      },
      {
        family: "5p",
        region: "D gene",
        gene: datum.d_call,
        start: datum.d_alignment_start,
        end: datum.d_alignment_end
      },
      {
        family: "5p",
        region: "3' Insertion",
        start: datum.d_alignment_end,
        end: datum.j_alignment_start
      },
      {
        family: "5p",
        region: "J gene",
        gene: datum.j_call,
        start: datum.j_alignment_start,
        end: datum.j_alignment_end
      }
    ]
  };
  return result;
};

const NaiveViz = createClassFromSpec(naiveVegaSpec);

const NaiveSequence = ({ datum }) => <NaiveViz data={getNaiveVizData(datum)} />;

export { NaiveSequence, getNaiveVizData };
