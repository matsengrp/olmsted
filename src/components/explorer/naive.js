import React from "react";
import { createClassFromSpec } from "react-vega";
import naiveVegaSpec from "./vega/naive";

// Naive gene reassortment viz component
// =====================================

/**
 * Build gene region data for a single chain (heavy or light)
 * @param {Object} datum - Clone family data
 * @param {string} chainType - 'heavy' or 'light'
 * @param {string} familyLabel - Label for the chain (e.g., "5p" for heavy, "light" for light)
 * @returns {Array} Array of region objects
 */
const buildChainRegions = (datum, chainType, familyLabel) => {
  const isLight = chainType === "light";
  const suffix = isLight ? "_light" : "";

  // Get field values with appropriate suffix
  const germlineAlignment = isLight ? datum.germline_alignment_light : datum.germline_alignment;
  const vAlignmentStart = datum.v_alignment_start; // Light chain doesn't have separate v_alignment positions in current data
  const vAlignmentEnd = datum.v_alignment_end;
  const dAlignmentStart = isLight ? null : datum.d_alignment_start; // Light chains have no D gene
  const dAlignmentEnd = isLight ? null : datum.d_alignment_end;
  const jAlignmentStart = datum.j_alignment_start;
  const jAlignmentEnd = datum.j_alignment_end;
  const junctionStart = isLight ? datum.junction_start_light : datum.junction_start;
  const junctionLength = isLight ? datum.junction_length_light : datum.junction_length;
  const cdr1Start = isLight ? datum.cdr1_alignment_start_light : datum.cdr1_alignment_start;
  const cdr1End = isLight ? datum.cdr1_alignment_end_light : datum.cdr1_alignment_end;
  const cdr2Start = isLight ? datum.cdr2_alignment_start_light : datum.cdr2_alignment_start;
  const cdr2End = isLight ? datum.cdr2_alignment_end_light : datum.cdr2_alignment_end;
  const vCall = isLight ? datum.v_call_light : datum.v_call;
  const dCall = isLight ? null : datum.d_call;
  const jCall = isLight ? datum.j_call_light : datum.j_call;

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
      end: junctionStart != null && junctionLength != null ? junctionStart + junctionLength : null
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

  // Add D gene and insertions only for heavy chain
  if (!isLight) {
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
  } else {
    // Light chain: single insertion between V and J
    regions.push({
      family: familyLabel,
      region: "V-J Insertion",
      start: vAlignmentEnd,
      end: jAlignmentStart
    });
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
    return start != null && end != null && start >= 0 && end > 0 && start < end;
  });
};

/**
 * Get naive visualization data for a clone family
 * @param {Object} datum - Clone family data
 * @param {string} chain - 'heavy', 'light', 'both-stacked', or 'both-side-by-side' (default: 'heavy')
 * @returns {Object} Object with source array for Vega
 */
const getNaiveVizData = (datum, chain = "heavy") => {
  let allRegions = [];

  // Normalize chain value - for single chain visualization, use the specific chain
  const showHeavy = chain === "heavy" || chain === "both-stacked" || chain === "both-side-by-side";
  const showLight = chain === "light" || chain === "both-stacked" || chain === "both-side-by-side";
  const isBothMode = chain === "both-stacked" || chain === "both-side-by-side";

  if (showHeavy && !isBothMode) {
    const heavyRegions = buildChainRegions(datum, "heavy", "5p");
    allRegions = allRegions.concat(filterValidRegions(heavyRegions));
  }

  if (showLight && !isBothMode) {
    // Only add light chain regions if the family has paired data
    if (datum.is_paired) {
      const lightRegions = buildChainRegions(datum, "light", "5p");
      allRegions = allRegions.concat(filterValidRegions(lightRegions));
    }
  }

  // For "both" modes when called directly (not from stacked/side-by-side component)
  // This shouldn't happen in normal flow since stacked mode calls this separately for each chain
  if (isBothMode) {
    const heavyRegions = buildChainRegions(datum, "heavy", "Heavy");
    allRegions = allRegions.concat(filterValidRegions(heavyRegions));
    if (datum.is_paired) {
      const lightRegions = buildChainRegions(datum, "light", "Light");
      allRegions = allRegions.concat(filterValidRegions(lightRegions));
    }
  }

  return { source: allRegions };
};

const NaiveViz = createClassFromSpec(naiveVegaSpec);

function NaiveSequence({ datum }) {
  return <NaiveViz data={getNaiveVizData(datum)} />;
}

export { NaiveSequence, getNaiveVizData };
