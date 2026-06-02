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

/** Loose ID equality (string vs number, etc.). */
export function idsMatch(a, b) {
  if (a == null || b == null) return false;
  if (String(a) === String(b) || a === b) return true;
  const aNum = Number(a);
  const bNum = Number(b);
  return !isNaN(aNum) && !isNaN(bNum) && aNum === bNum;
}

export function findById(list, id, idField = 'id') {
  return (list || []).find(
    item => item && item[idField] != null && idsMatch(item[idField], id)
  );
}

/** Expanded recurring instances (not stored one-offs) set recurrenceId when built. */
export function isExpandedRecurringEvent(event) {
  return !!(event && event.recurrenceId);
}

/** Whether a calendar event id refers to a stored one-off (editable) vs virtual recurring instance. */
export function canEditPlannerEventById(eventId, events = []) {
  if (findById(events, eventId)) return true;
  return !/^evt_.+_\d{4}-\d{2}-\d{2}$/.test(String(eventId));
}

/** Lookup workflow placement regardless of string/number key type. */
export function getPlacementForTask(placement, taskId) {
  if (!placement || taskId == null) return {};
  if (placement[taskId]) return placement[taskId];
  const key = Object.keys(placement).find(k => idsMatch(k, taskId));
  return key ? placement[key] : {};
}
