// ═══════════════════════ HABITS FEATURE ═══════════════════════
// Store-only mutations for habits (no UI logic)
// Habits are separate from tasks/projects - simple check-off system

import { appStore } from '../state/store.js';
import { getPeriodKey, getDayKey } from '../utils/periodKeys.js';

/**
 * Effective cadence: Habits page uses `freq` ('daily'/'weekly'), planner/addHabit use `cadence`
 * @param {Object} habit - Habit object
 * @returns {string} 'daily' or 'weekly'
 */
function getCadence(habit) {
  if (habit.cadence === 'daily' || habit.cadence === 'weekly') return habit.cadence;
  if (habit.freq === 'weekly') return 'weekly';
  return 'daily';
}

/**
 * Add a new habit
 * @param {Object} params - Habit parameters
 * @param {string} params.name - Habit name
 * @param {string} params.cadence - 'daily' or 'weekly'
 * @param {number[]} [params.daysOfWeek] - Optional array of day numbers (0-6, 0=Sunday)
 * @param {string} [params.timeOfDay] - Optional time in HH:MM format (e.g. 09:00)
 * @param {number} [params.durationMin] - Optional duration in minutes
 * @param {string} [params.goalId] - Optional goal ID to link this habit to
 * @returns {string} New habit ID
 */
export function addHabit({ name, cadence, daysOfWeek, timeOfDay, durationMin, goalId }) {
  const state = appStore.getState();
  const habits = state.habits || [];
  
  const newHabit = {
    id: `habit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name: name.trim(),
    cadence: cadence === 'weekly' ? 'weekly' : 'daily',
    daysOfWeek: Array.isArray(daysOfWeek) && daysOfWeek.length > 0 ? daysOfWeek : undefined,
    timeOfDay: timeOfDay && /^\d{2}:\d{2}$/.test(timeOfDay) ? timeOfDay : undefined,
    durationMin: typeof durationMin === 'number' && durationMin > 0 ? durationMin : undefined,
    goalId: goalId && String(goalId).trim() ? String(goalId).trim() : undefined,
    createdAt: new Date().toISOString(),
    archived: false
  };
  
  appStore.setState({
    habits: [...habits, newHabit]
  });
  
  return newHabit.id;
}

/**
 * Toggle habit check-off for a specific date/period
 * @param {string} habitId - Habit ID
 * @param {Date} [date] - Date to check off (defaults to today)
 */
export function toggleHabit(habitId, date = new Date()) {
  const state = appStore.getState();
  const habit = (state.habits || []).find(h => h.id === habitId && !h.archived);
  
  if (!habit) {
    console.warn('Habit not found:', habitId);
    return;
  }
  
  const cadence = getCadence(habit);
  const periodKey = getPeriodKey(cadence, date);
  const checkinKey = `${periodKey}:${habitId}`;
  const habitCheckins = { ...(state.habitCheckins || {}) };
  
  if (habitCheckins[checkinKey]) {
    // Remove check-off
    delete habitCheckins[checkinKey];
  } else {
    // Add check-off (store timestamp)
    habitCheckins[checkinKey] = new Date().toISOString();
  }
  
  appStore.setState({ habitCheckins });
}

/**
 * Check if a habit is checked off for a specific date/period
 * @param {string} habitId - Habit ID
 * @param {Date} [date] - Date to check (defaults to today)
 * @returns {boolean} True if checked off
 */
export function isHabitChecked(habitId, date = new Date()) {
  const state = appStore.getState();
  const habit = (state.habits || []).find(h => String(h.id) === String(habitId));
  
  if (!habit) return false;
  
  const cadence = getCadence(habit);
  const periodKey = getPeriodKey(cadence, date);
  const checkinKey = `${periodKey}:${habitId}`;
  const habitCheckins = state.habitCheckins || {};
  
  // Flat format (planner/addHabit): habitCheckins['YYYY-MM-DD:habitId']
  if (habitCheckins[checkinKey]) return true;
  
  // Nested format (Habits page): habitCheckins[habitId]['YYYY-MM-DD']
  const dayKey = getDayKey(date);
  const byHabit = habitCheckins[habitId];
  if (byHabit && typeof byHabit === 'object' && byHabit[dayKey]) return true;
  
  return false;
}

/**
 * Archive a habit (soft delete)
 * @param {string} habitId - Habit ID
 */
export function archiveHabit(habitId) {
  const state = appStore.getState();
  const habits = (state.habits || []).map(h => 
    h.id === habitId ? { ...h, archived: true } : h
  );
  
  appStore.setState({ habits });
}

/**
 * Set or clear the goal linked to a habit
 * @param {string} habitId - Habit ID
 * @param {string|null|undefined} goalId - Goal ID to link, or null/undefined to unlink
 */
export function setHabitGoalId(habitId, goalId) {
  const state = appStore.getState();
  const habits = (state.habits || []).map(h =>
    h.id === habitId ? { ...h, goalId: goalId && String(goalId).trim() ? String(goalId).trim() : undefined } : h
  );
  appStore.setState({ habits });
}

/**
 * Get active (non-archived) habits
 * @returns {Array} Array of active habits
 */
export function getActiveHabits() {
  const state = appStore.getState();
  return (state.habits || []).filter(h => !h.archived);
}

/**
 * Check if a habit should be shown for a specific date
 * (for weekly habits with daysOfWeek restriction)
 * @param {Object} habit - Habit object
 * @param {Date} date - Date to check
 * @returns {boolean} True if habit should be shown
 */
export function shouldShowHabit(habit, date) {
  const cadence = getCadence(habit);
  if (cadence === 'daily') {
    return true;
  }
  
  if (cadence === 'weekly') {
    // If no daysOfWeek restriction, show always
    if (!habit.daysOfWeek || habit.daysOfWeek.length === 0) {
      return true;
    }
    
    // Check if today's day of week is in the allowed days
    const dayOfWeek = date.getDay();
    return habit.daysOfWeek.includes(dayOfWeek);
  }
  
  return false;
}
