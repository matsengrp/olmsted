import React from "react";
import { createClassFromSpec } from "react-vega";
import naiveVegaSpec from "./vega/naive";

// Naive gene reassortment viz component
// =====================================

const getNaiveVizData = (datum) => {
  // Calculate full sequence length - use germline_alignment length if available,
  // otherwise use the maximum end position across all regions
  const germlineLength = datum.germline_alignment ? datum.germline_alignment.length : 0;
  const maxEndPosition = Math.max(
    datum.v_alignment_end || 0,
    datum.d_alignment_end || 0,
    datum.j_alignment_end || 0,
    (datum.junction_start || 0) + (datum.junction_length || 0),
    datum.cdr1_alignment_end || 0,
    datum.cdr2_alignment_end || 0,
    datum.cdr3_alignment_end || 0
  );
  const sequenceLength = Math.max(germlineLength, maxEndPosition);

  const regions = [
    // Layer 1 (bottom): CDR regions (only include if they have valid positions)
    {
      family: "5p",
      region: "CDR1",
      start: datum.cdr1_alignment_start,
      end: datum.cdr1_alignment_end
    },
    {
      family: "5p",
      region: "CDR2",
      start: datum.cdr2_alignment_start,
      end: datum.cdr2_alignment_end
    },
    {
      family: "5p",
      region: "CDR3",
      start: datum.junction_start,
      end: datum.junction_start + datum.junction_length
    },
    // Layer 2 (middle): Grey background bar - full sequence length (always include)
    {
      family: "5p",
      region: "Sequence",
      start: 0,
      end: sequenceLength
    },
    // Layer 3 (top): V/D/J genes and insertions (only include if they have valid positions)
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
  ];

  // Filter out regions with invalid positions (undefined/null values, or start >= end)
  // But always keep the Sequence region
  const validRegions = regions.filter((region) => {
    if (region.region === "Sequence") return true; // Always keep the grey bar
    const start = region.start;
    const end = region.end;
    // Check for valid positions: start and end must be defined (not null/undefined) and start < end
    // Note: position 0 is valid (AIRR data uses 0-based indexing after conversion)
    return start != null && end != null && start >= 0 && end > 0 && start < end;
  });

  return { source: validRegions };
};

const NaiveViz = createClassFromSpec(naiveVegaSpec);

function NaiveSequence({ datum }) {
  return <NaiveViz data={getNaiveVizData(datum)} />;
}

export { NaiveSequence, getNaiveVizData };
