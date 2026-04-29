/**
 * Tree-node type constants.
 *
 * Source data tags nodes as "root" or "leaf". The webapp synthesizes
 * additional types: "naive" for the germline alignment row (used as the
 * x-axis baseline in tree alignments) and "node" for intermediate nodes
 * (including original roots demoted when assembling a forest under a
 * synthetic root).
 *
 * Historical note: an older olmsted-cli emitted "internal" instead of
 * "node". One vestigial Vega filter accepted both, but nothing in the
 * current pipeline emits "internal" — the value has been removed.
 */

export const NODE_TYPES = {
  ROOT: "root",
  LEAF: "leaf",
  NAIVE: "naive",
  NODE: "node"
};
