/**
 * Immunoglobulin and T-cell receptor locus constants.
 *
 * Used wherever locus values need to be compared or defaulted in code.
 * Raw input data (clones, samples) is still tagged with the literal AIRR
 * strings; these constants exist so internal code paths don't carry bare
 * locus literals.
 */

export const LOCI = {
  IGH: "IGH",
  IGK: "IGK",
  IGL: "IGL",
  TRA: "TRA",
  TRB: "TRB"
};

/** Default locus when input data leaves it unset and downstream logic needs one. */
export const DEFAULT_LOCUS = LOCI.IGH;
