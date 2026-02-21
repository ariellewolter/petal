// ═══════════════════════ PERIOD KEY UTILITIES ═══════════════════════
// Utilities for generating period keys for habits and routines
// Daily: YYYY-MM-DD
// Weekly: YYYY-W## (ISO week) or week-start date key

/**
 * Get day key (YYYY-MM-DD) for a date
 * @param {Date} date - Date object
 * @returns {string} Day key in YYYY-MM-DD format
 */
export function getDayKey(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get week key (YYYY-W##) for a date using ISO week
 * ISO week: Week starts on Monday, week 1 is the first week with a Thursday
 * @param {Date} date - Date object
 * @returns {string} Week key in YYYY-W## format
 */
export function getWeekKey(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  
  // Get Thursday of the week (ISO week definition)
  const thursday = new Date(d);
  const dayOfWeek = d.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const daysToThursday = (4 - dayOfWeek + 7) % 7; // Days to get to Thursday
  thursday.setDate(d.getDate() + daysToThursday);
  
  const year = thursday.getFullYear();
  
  // Calculate week number - simpler approach
  const jan1 = new Date(year, 0, 1);
  const msPerDay = 24 * 60 * 60 * 1000;
  const daysSinceJan1 = Math.floor((thursday - jan1) / msPerDay);
  const jan1DayOfWeek = jan1.getDay();
  const week = Math.ceil((daysSinceJan1 + jan1DayOfWeek + 1) / 7);
  
  return `${year}-W${String(week).padStart(2, '0')}`;
}

/**
 * Get period key based on cadence and date
 * @param {string} cadence - 'daily' or 'weekly'
 * @param {Date} date - Date object
 * @returns {string} Period key
 */
export function getPeriodKey(cadence, date) {
  if (cadence === 'daily') {
    return getDayKey(date);
  } else if (cadence === 'weekly') {
    return getWeekKey(date);
  }
  throw new Error(`Unknown cadence: ${cadence}`);
}
