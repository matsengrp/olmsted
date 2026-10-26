/**
 * Minimal URL query-string parse/stringify, replacing the `query-string` package
 * (v9 is ESM-only and cannot be loaded by Jest's CommonJS runtime).
 * Matches the subset of behavior the app relies on: repeated keys become arrays,
 * keys are sorted on stringify, and null/undefined values are handled like query-string.
 */

const strictEncode = (str) =>
  encodeURIComponent(str).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);

const decode = (str) => {
  const spaced = str.replace(/\+/g, " ");
  try {
    return decodeURIComponent(spaced);
  } catch (_e) {
    return spaced;
  }
};

/**
 * Parse a query string (with or without leading "?") into an object.
 * @param {string} search
 * @returns {Object<string, string|null|Array<string|null>>}
 */
export const parse = (search) => {
  const result = {};
  const trimmed = (search || "").trim().replace(/^[?#&]/, "");
  if (!trimmed) {
    return result;
  }
  trimmed.split("&").forEach((part) => {
    if (!part) {
      return;
    }
    const idx = part.indexOf("=");
    const key = decode(idx === -1 ? part : part.slice(0, idx));
    const value = idx === -1 ? null : decode(part.slice(idx + 1));
    if (!(key in result)) {
      result[key] = value;
    } else {
      result[key] = [].concat(result[key], value);
    }
  });
  return result;
};

/**
 * Serialize an object to a query string (no leading "?"). Keys are sorted,
 * array values repeat the key, undefined values are skipped, null yields a bare key.
 * @param {Object} obj
 * @returns {string}
 */
export const stringify = (obj) => {
  if (!obj) {
    return "";
  }
  return Object.keys(obj)
    .sort()
    .map((key) => {
      const value = obj[key];
      if (value === undefined) {
        return null;
      }
      if (value === null) {
        return strictEncode(key);
      }
      if (Array.isArray(value)) {
        return value
          .filter((v) => v !== undefined)
          .map((v) => (v === null ? strictEncode(key) : `${strictEncode(key)}=${strictEncode(String(v))}`))
          .join("&");
      }
      return `${strictEncode(key)}=${strictEncode(String(value))}`;
    })
    .filter((s) => s)
    .join("&");
};
