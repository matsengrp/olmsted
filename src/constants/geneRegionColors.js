/**
 * Color scheme for gene region visualizations
 *
 * This defines the colors used in the naive sequence visualization
 * for different gene regions and CDRs.
 */

export const GENE_REGION_COLORS = {
  // V/D/J genes and insertions
  V_GENE: "#762a83",        // Purple
  FIVE_PRIME_INSERTION: "#af8dc3",  // Light purple
  D_GENE: "#000000",        // Black
  THREE_PRIME_INSERTION: "#d9f0d3", // Very light green
  J_GENE: "#7fbf7b",        // Medium green

  // CDR regions - Dark2 palette blended ~50% with white
  CDR1: "#8dcebb",          // Pastel teal (Dark2[0] + white)
  CDR2: "#ecaf80",          // Pastel orange (Dark2[1] + white)
  CDR3: "#bab7d9",          // Pastel purple (Dark2[2] + white)

  // Background sequence
  SEQUENCE: "#cccccc"       // Grey
};

/**
 * Domain array for Vega color scale (ordinal scale domain)
 * Order must match the range array
 */
export const GENE_REGION_DOMAIN = [
  "V gene",
  "5' Insertion",
  "D gene",
  "3' Insertion",
  "J gene",
  "CDR1",
  "CDR2",
  "CDR3",
  "Sequence"
];

/**
 * Range array for Vega color scale (ordinal scale range)
 * Order must match the domain array
 */
export const GENE_REGION_RANGE = [
  GENE_REGION_COLORS.V_GENE,
  GENE_REGION_COLORS.FIVE_PRIME_INSERTION,
  GENE_REGION_COLORS.D_GENE,
  GENE_REGION_COLORS.THREE_PRIME_INSERTION,
  GENE_REGION_COLORS.J_GENE,
  GENE_REGION_COLORS.CDR1,
  GENE_REGION_COLORS.CDR2,
  GENE_REGION_COLORS.CDR3,
  GENE_REGION_COLORS.SEQUENCE
];
