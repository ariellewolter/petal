// ═══════════════════════ ROUTINES FEATURE ═══════════════════════
// Store-only mutations for routines (no UI logic)
// Routines are recurring items with optional time-of-day and duration
// Separate from tasks/projects - simple check-off system

import { appStore } from '../state/store.js';
import { getPeriodKey } from '../utils/periodKeys.js';

/**
 * Add a new routine
 * @param {Object} params - Routine parameters
 * @param {string} params.name - Routine name
 * @param {string} params.cadence - 'daily' or 'weekly'
 * @param {string} [params.icon] - Optional emoji icon
 * @param {string} [params.timeOfDay] - Optional time in HH:MM format
 * @param {number} [params.durationMin] - Optional duration in minutes
 * @param {number[]} [params.daysOfWeek] - Optional array of day numbers (0-6, 0=Sunday)
 * @param {string} [params.goalId] - Optional goal ID to link this routine to
 * @returns {string} New routine ID
 */
export function addRoutine({ name, cadence, icon, timeOfDay, durationMin, daysOfWeek, goalId }) {
  const state = appStore.getState();
  const routines = state.routines || [];
  
  const newRoutine = {
    id: `routine_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name: name.trim(),
    cadence: cadence === 'weekly' ? 'weekly' : 'daily',
    icon: (icon && typeof icon === 'string' && icon.trim()) ? icon.trim() : undefined,
    timeOfDay: timeOfDay && /^\d{2}:\d{2}$/.test(timeOfDay) ? timeOfDay : undefined,
    durationMin: typeof durationMin === 'number' && durationMin > 0 ? durationMin : undefined,
    daysOfWeek: Array.isArray(daysOfWeek) && daysOfWeek.length > 0 ? daysOfWeek : undefined,
    goalId: goalId && String(goalId).trim() ? String(goalId).trim() : undefined,
    createdAt: new Date().toISOString(),
    archived: false
  };
  
  appStore.setState({
    routines: [...routines, newRoutine]
  });
  
  return newRoutine.id;
}

/**
 * Toggle routine check-off for a specific date/period
 * @param {string} routineId - Routine ID
 * @param {Date} [date] - Date to check off (defaults to today)
 */
export function toggleRoutine(routineId, date = new Date()) {
  const state = appStore.getState();
  const routine = (state.routines || []).find(r => r.id === routineId && !r.archived);
  
  if (!routine) {
    console.warn('Routine not found:', routineId);
    return;
  }
  
  const periodKey = getPeriodKey(routine.cadence, date);
  const checkinKey = `${periodKey}:${routineId}`;
  const routineCheckins = { ...(state.routineCheckins || {}) };
  
  if (routineCheckins[checkinKey]) {
    // Remove check-off
    delete routineCheckins[checkinKey];
  } else {
    // Add check-off (store timestamp)
    routineCheckins[checkinKey] = new Date().toISOString();
  }
  
  appStore.setState({ routineCheckins });
}

/**
 * Check if a routine is checked off for a specific date/period
 * @param {string} routineId - Routine ID
 * @param {Date} [date] - Date to check (defaults to today)
 * @returns {boolean} True if checked off
 */
export function isRoutineChecked(routineId, date = new Date()) {
  const state = appStore.getState();
  const routine = (state.routines || []).find(r => r.id === routineId);
  
  if (!routine) return false;
  
  const periodKey = getPeriodKey(routine.cadence, date);
  const checkinKey = `${periodKey}:${routineId}`;
  const routineCheckins = state.routineCheckins || {};
  
  return !!routineCheckins[checkinKey];
}

/**
 * Update an existing routine
 * @param {string} routineId - Routine ID
 * @param {Object} params - Fields to update (name, cadence, icon, timeOfDay, durationMin, daysOfWeek)
 * @returns {boolean} True if updated
 */
export function updateRoutine(routineId, { name, cadence, icon, timeOfDay, durationMin, daysOfWeek }) {
  const state = appStore.getState();
  const routines = state.routines || [];
  const idx = routines.findIndex(r => r.id === routineId);
  if (idx === -1) return false;

  const existing = routines[idx];
  const updated = {
    ...existing,
    name: name != null ? name.trim() : existing.name,
    cadence: cadence === 'weekly' ? 'weekly' : (cadence === 'daily' ? 'daily' : existing.cadence),
    icon: (icon !== undefined && icon !== null && String(icon).trim()) ? String(icon).trim() : existing.icon,
    timeOfDay: timeOfDay && /^\d{2}:\d{2}$/.test(timeOfDay) ? timeOfDay : (timeOfDay === '' || timeOfDay == null ? undefined : existing.timeOfDay),
    durationMin: typeof durationMin === 'number' && durationMin > 0 ? durationMin : (durationMin == null || durationMin === '' ? undefined : existing.durationMin),
    daysOfWeek: Array.isArray(daysOfWeek) && daysOfWeek.length > 0 ? daysOfWeek : (daysOfWeek == null ? existing.daysOfWeek : undefined)
  };

  const next = routines.slice();
  next[idx] = updated;
  appStore.setState({ routines: next });
  return true;
}

/**
 * Archive a routine (soft delete)
 * @param {string} routineId - Routine ID
 */
export function archiveRoutine(routineId) {
  const state = appStore.getState();
  const routines = (state.routines || []).map(r => 
    r.id === routineId ? { ...r, archived: true } : r
  );
  
  appStore.setState({ routines });
}

/**
 * Set or clear the goal linked to a routine
 * @param {string} routineId - Routine ID
 * @param {string|null|undefined} goalId - Goal ID to link, or null/undefined to unlink
 */
export function setRoutineGoalId(routineId, goalId) {
  const state = appStore.getState();
  const routines = (state.routines || []).map(r =>
    r.id === routineId ? { ...r, goalId: goalId && String(goalId).trim() ? String(goalId).trim() : undefined } : r
  );
  appStore.setState({ routines });
}

/**
 * Get active (non-archived) routines
 * @returns {Array} Array of active routines
 */
export function getActiveRoutines() {
  const state = appStore.getState();
  return (state.routines || []).filter(r => !r.archived);
}

/**
 * Check if a routine should be shown for a specific date
 * (for weekly routines with daysOfWeek restriction)
 * @param {Object} routine - Routine object
 * @param {Date} date - Date to check
 * @returns {boolean} True if routine should be shown
 */
export function shouldShowRoutine(routine, date) {
  if (routine.cadence === 'daily') {
    return true;
  }
  
  if (routine.cadence === 'weekly') {
    // If no daysOfWeek restriction, show always
    if (!routine.daysOfWeek || routine.daysOfWeek.length === 0) {
      return true;
    }
    
    // Check if today's day of week is in the allowed days
    const dayOfWeek = date.getDay();
    return routine.daysOfWeek.includes(dayOfWeek);
  }
  
  return false;
}
