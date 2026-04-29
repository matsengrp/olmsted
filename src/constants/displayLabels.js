/**
 * Shared display labels for surfacing absent/missing values in the UI.
 *
 * As of olmsted-cli matsengrp/olmsted-cli#17, the PCP pipeline no longer
 * fabricates literal placeholder values for reference fields it has no real
 * data for (e.g. "pcp-subject", "merged"). Use UNSPECIFIED_LABEL anywhere a
 * blank cell or option would otherwise render.
 */

export const UNSPECIFIED_LABEL = "<unspecified>";

/**
 * Return the value as a display string, falling back to UNSPECIFIED_LABEL
 * when the value is null, undefined, or the empty string.
 *
 * @param {*} value
 * @returns {string}
 */
export const displayOrUnspecified = (value) => {
  if (value === null || value === undefined || value === "") {
    return UNSPECIFIED_LABEL;
  }
  return value;
};
