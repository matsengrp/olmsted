/**
 * Color scheme for amino acid visualizations
 *
 * This defines the colors used for amino acid mutations in the alignment view.
 * Based on Tableau 20 color scheme with transparent added for gaps and unknown amino acids.
 *
 * See: https://github.com/matsengrp/olmsted/issues/48
 */

/**
 * Domain array for amino acid color scale (ordinal scale domain)
 * Defines the order in which we specify corresponding colors
 * Order must match the range array
 */
export const AMINO_ACID_DOMAIN = [
  "-",  // Gap (insertion / deletion)
  "X",  // Any amino acid
  "A",  // Ala - Alanine
  "C",  // Cys - Cysteine
  "D",  // Asp - Aspartic Acid
  "E",  // Glu - Glutamic Acid
  "F",  // Phe - Phenylalanine
  "G",  // Gly - Glycine
  "H",  // His - Histidine
  "I",  // Ile - Isoleucine
  "K",  // Lys - Lysine
  "L",  // Leu - Leucine
  "M",  // Met - Methionine
  "N",  // Asn - Asparagine
  "P",  // Pro - Proline
  "Q",  // Gln - Glutamine
  "R",  // Arg - Arginine
  "S",  // Ser - Serine
  "T",  // Thr - Threonine
  "V",  // Val - Valine
  "W",  // Trp - Tryptophan
  "Y"   // Tyr - Tyrosine
];

/**
 * Range array for amino acid color scale (ordinal scale range)
 * Tableau 20 color scheme with transparent added for gaps and unknown amino acids
 * We use text rather than color to distinguish gaps and unknown amino acids
 * Order must match the domain array
 */
export const AMINO_ACID_RANGE = [
  "transparent", // '-' Gap (insertion / deletion)
  "transparent", //  X - (Any amino acid)
  "#1f77b4",     //  A - Ala - Alanine
  "#aec7e8",     //  C - Cys - Cysteine
  "#ff7f0e",     //  D - Asp - Aspartic Acid
  "#ffbb78",     //  E - Glu - Glutamic Acid
  "#2ca02c",     //  F - Phe - Phenylalanine
  "#98df8a",     //  G - Gly - Glycine
  "#d62728",     //  H - His - Histidine
  "#ff9896",     //  I - Ile - Isoleucine
  "#9467bd",     //  K - Lys - Lysine
  "#c5b0d5",     //  L - Leu - Leucine
  "#8c564b",     //  M - Met - Methionine
  "#c49c94",     //  N - Asn - Asparagine
  "#e377c2",     //  P - Pro - Proline
  "#f7b6d2",     //  Q - Gln - Glutamine
  "#7f7f7f",     //  R - Arg - Arginine
  "#c7c7c7",     //  S - Ser - Serine
  "#bcbd22",     //  T - Thr - Threonine
  "#dbdb8d",     //  V - Val - Valine
  "#17becf",     //  W - Trp - Tryptophan
  "#9edae5"      //  Y - Tyr - Tyrosine
];

/**
 * Alternative color scheme from IMGT Scientific Chart
 * http://www.imgt.org/IMGTScientificChart/RepresentationRules/colormenu.php#h1_0
 *
 * Note: These colors are more vibrant and harder to look at.
 * Kept for reference but not currently used.
 */
export const IMGT_SCIENTIFIC_CHART_COLORS = [
  "transparent", // '-' Gap (insertion / deletion)
  "transparent", //  X - (Any amino acid)
  "#CCFFFF",     //  A - Ala - Alanine
  "#00FFFF",     //  C - Cys - Cysteine
  "#FFCC99",     //  D - Asp - Aspartic Acid
  "#FFCC00",     //  E - Glu - Glutamic Acid
  "#00CCFF",     //  F - Phe - Phenylalanine
  "#00FF00",     //  G - Gly - Glycine
  "#FFFF99",     //  H - His - Histidine
  "#000080",     //  I - Ile - Isoleucine
  "#C64200",     //  K - Lys - Lysine
  "#3366FF",     //  L - Leu - Leucine
  "#99CCFF",     //  M - Met - Methionine
  "#FF9900",     //  N - Asn - Asparagine
  "#FFFF00",     //  P - Pro - Proline
  "#FF6600",     //  Q - Gln - Glutamine
  "#E60606",     //  R - Arg - Arginine
  "#CCFF99",     //  S - Ser - Serine
  "#00FF99",     //  T - Thr - Threonine
  "#0000FF",     //  V - Val - Valine
  "#CC99FF",     //  W - Trp - Tryptophan
  "#CCFFCC"      //  Y - Tyr - Tyrosine
];
