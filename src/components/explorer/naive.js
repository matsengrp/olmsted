import React from "react";
import { createClassFromSpec } from "react-vega";
import naiveVegaSpec from "./vega/naive";
import { getCloneChain } from "../../selectors/clonalFamilies";
import { CHAIN_TYPES } from "../../constants/chainTypes";

// Naive gene reassortment viz component
// =====================================

/**
 * Build gene region data from a clone's own data
 * With the two-clone model, each clone only has its own chain data
 * @param {Object} clone - Clone data
 * @param {string} familyLabel - Label for display (e.g., "5p", "Heavy", "Light")
 * @returns {Array} Array of region objects
 */
const buildCloneRegions = (clone, familyLabel) => {
  // Determine if this is a light chain clone (no D gene)
  const chain = getCloneChain(clone);
  const isLight = chain === CHAIN_TYPES.LIGHT;

  // Get field values directly from the clone (no _light suffixes needed)
  const germlineAlignment = clone.germline_alignment;
  const vAlignmentStart = clone.v_alignment_start;
  const vAlignmentEnd = clone.v_alignment_end;
  const dAlignmentStart = clone.d_alignment_start;
  const dAlignmentEnd = clone.d_alignment_end;
  const jAlignmentStart = clone.j_alignment_start;
  const jAlignmentEnd = clone.j_alignment_end;
  const junctionStart = clone.junction_start;
  const junctionLength = clone.junction_length;
  const cdr1Start = clone.cdr1_alignment_start;
  const cdr1End = clone.cdr1_alignment_end;
  const cdr2Start = clone.cdr2_alignment_start;
  const cdr2End = clone.cdr2_alignment_end;
  const vCall = clone.v_call;
  const dCall = clone.d_call;
  const jCall = clone.j_call;

  // Calculate sequence length
  const germlineLength = germlineAlignment ? germlineAlignment.length : 0;
  const maxEndPosition = Math.max(
    vAlignmentEnd || 0,
    dAlignmentEnd || 0,
    jAlignmentEnd || 0,
    (junctionStart || 0) + (junctionLength || 0),
    cdr1End || 0,
    cdr2End || 0
  );
  const sequenceLength = Math.max(germlineLength, maxEndPosition);

  const regions = [
    // Layer 1 (bottom): CDR regions
    {
      family: familyLabel,
      region: "CDR1",
      start: cdr1Start,
      end: cdr1End
    },
    {
      family: familyLabel,
      region: "CDR2",
      start: cdr2Start,
      end: cdr2End
    },
    {
      family: familyLabel,
      region: "CDR3",
      start: junctionStart,
      end: junctionStart !== null && junctionStart !== undefined && junctionLength !== null && junctionLength !== undefined
        ? junctionStart + junctionLength
        : null
    },
    // Layer 2 (middle): Grey background bar
    {
      family: familyLabel,
      region: "Sequence",
      start: 0,
      end: sequenceLength
    },
    // Layer 3 (top): V/D/J genes
    {
      family: familyLabel,
      region: "V gene",
      gene: vCall,
      start: vAlignmentStart,
      end: vAlignmentEnd
    }
  ];

  // Light chains have no D gene - show V-J insertion instead
  if (isLight || !dAlignmentStart || !dAlignmentEnd) {
    regions.push({
      family: familyLabel,
      region: "V-J Insertion",
      start: vAlignmentEnd,
      end: jAlignmentStart
    });
  } else {
    // Heavy chain: D gene with 5' and 3' insertions
    regions.push(
      {
        family: familyLabel,
        region: "5' Insertion",
        start: vAlignmentEnd,
        end: dAlignmentStart
      },
      {
        family: familyLabel,
        region: "D gene",
        gene: dCall,
        start: dAlignmentStart,
        end: dAlignmentEnd
      },
      {
        family: familyLabel,
        region: "3' Insertion",
        start: dAlignmentEnd,
        end: jAlignmentStart
      }
    );
  }

  regions.push({
    family: familyLabel,
    region: "J gene",
    gene: jCall,
    start: jAlignmentStart,
    end: jAlignmentEnd
  });

  return regions;
};

/**
 * Filter regions to only include valid ones
 */
const filterValidRegions = (regions) => {
  return regions.filter((region) => {
    if (region.region === "Sequence") return true;
    const { start, end } = region;
    return start !== null && start !== undefined &&
           end !== null && end !== undefined &&
           start >= 0 && end > 0 && start < end;
  });
};

/**
 * Get naive visualization data for a clone
 * With the two-clone model, just pass the clone you want to visualize
 * For "both" modes, call this separately for heavy and light clones
 * @param {Object} clone - Clone data (can be heavy or light chain)
 * @param {string} label - Optional label override (default: "5p")
 * @returns {Object} Object with source array for Vega
 */
const getNaiveVizData = (clone, label = "5p") => {
  const regions = buildCloneRegions(clone, label);
  return { source: filterValidRegions(regions) };
};

const NaiveViz = createClassFromSpec(naiveVegaSpec);

function NaiveSequence({ datum }) {
  return <NaiveViz data={getNaiveVizData(datum)} />;
}

export { NaiveSequence, getNaiveVizData };
