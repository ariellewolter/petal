// ═══════════════════════ ID NORMALIZATION ═══════════════════════
// Utilities for consistent ID handling at UI boundaries
// Prevents "task not found" bugs from ID coercion issues

/**
 * Convert a value to a normalized ID string
 * Handles null, undefined, empty strings, and string 'null'/'undefined'
 * @param {*} x - Value to convert
 * @returns {string|null} - Normalized ID string or null if invalid
 */
export function asIdString(x) {
  if (x === null || x === undefined) return null;
  const str = String(x);
  // Treat empty string, 'null', and 'undefined' as invalid
  if (str === '' || str === 'null' || str === 'undefined') return null;
  return str;
}

/**
 * Check if an ID value is nil (null, undefined, empty, or string 'null'/'undefined')
 * @param {*} x - Value to check
 * @returns {boolean} - True if the value is nil
 */
export function isNilId(x) {
  if (x === null || x === undefined) return true;
  const str = String(x);
  return str === '' || str === 'null' || str === 'undefined';
}

/**
 * Normalize a project ID value (handles string 'null' and converts to number if needed)
 * @param {*} x - Value to normalize
 * @returns {number|null} - Normalized project ID or null
 */
export function normalizeProjectId(x) {
  if (x === null || x === undefined) return null;
  const str = String(x);
  if (str === '' || str === 'null' || str === 'undefined') return null;
  const num = parseInt(str, 10);
  return isNaN(num) ? null : num;
}
