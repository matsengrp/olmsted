/**
 * Tree-node type constants.
 *
 * Source data tags nodes as "root" or "leaf". The webapp synthesizes
 * additional types: "naive" for the germline alignment row (used as the
 * x-axis baseline in tree alignments) and "node" for intermediate nodes
 * (including original roots demoted when assembling a forest under a
 * synthetic root).
 *
 * Compatibility note: some olmsted-cli outputs (e.g. the pcp-byhand
 * golden data) tag intermediate nodes with the older value "internal".
 * fileProcessor.processConsolidatedFormat coalesces "internal" → "node"
 * on ingest so the rest of the codebase only has to deal with the
 * canonical NODE_TYPES values.
 */

export const NODE_TYPES = {
  ROOT: "root",
  LEAF: "leaf",
  NAIVE: "naive",
  NODE: "node"
};
