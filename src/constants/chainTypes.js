/**
 * Chain type constants for paired heavy/light chain data
 *
 * These constants define the chain selection modes available when viewing
 * paired antibody sequence data (heavy + light chains).
 */

export const CHAIN_TYPES = {
  /** Heavy chain only */
  HEAVY: 'heavy',

  /** Light chain only (kappa or lambda) */
  LIGHT: 'light',

  /** Both chains displayed vertically stacked */
  BOTH_STACKED: 'both-stacked',

  /** Both chains displayed side-by-side */
  BOTH_SIDE_BY_SIDE: 'both-side-by-side'
};

/**
 * Helper function to check if a chain mode displays both chains
 * @param {string} chain - The chain type to check
 * @returns {boolean} True if the mode displays both chains
 */
export const isBothChainsMode = (chain) => {
  return chain === CHAIN_TYPES.BOTH_STACKED || chain === CHAIN_TYPES.BOTH_SIDE_BY_SIDE;
};

/**
 * Helper function to check if a chain mode is stacked
 * @param {string} chain - The chain type to check
 * @returns {boolean} True if the mode is stacked
 */
export const isStackedMode = (chain) => {
  return chain === CHAIN_TYPES.BOTH_STACKED;
};

/**
 * Helper function to check if a chain mode is side-by-side
 * @param {string} chain - The chain type to check
 * @returns {boolean} True if the mode is side-by-side
 */
export const isSideBySideMode = (chain) => {
  return chain === CHAIN_TYPES.BOTH_SIDE_BY_SIDE;
};
