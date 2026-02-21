// ═══════════════════════ HABITS FEATURE ═══════════════════════
// Store-only mutations for habits (no UI logic)
// Habits are separate from tasks/projects - simple check-off system

import { appStore } from '../state/store.js';
import { getPeriodKey } from '../utils/periodKeys.js';

/**
 * Add a new habit
 * @param {Object} params - Habit parameters
 * @param {string} params.name - Habit name
 * @param {string} params.cadence - 'daily' or 'weekly'
 * @param {number[]} [params.daysOfWeek] - Optional array of day numbers (0-6, 0=Sunday)
 * @returns {string} New habit ID
 */
export function addHabit({ name, cadence, daysOfWeek }) {
  const state = appStore.getState();
  const habits = state.habits || [];
  
  const newHabit = {
    id: `habit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name: name.trim(),
    cadence: cadence === 'weekly' ? 'weekly' : 'daily',
    daysOfWeek: Array.isArray(daysOfWeek) && daysOfWeek.length > 0 ? daysOfWeek : undefined,
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
  
  const periodKey = getPeriodKey(habit.cadence, date);
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
  const habit = (state.habits || []).find(h => h.id === habitId);
  
  if (!habit) return false;
  
  const periodKey = getPeriodKey(habit.cadence, date);
  const checkinKey = `${periodKey}:${habitId}`;
  const habitCheckins = state.habitCheckins || {};
  
  return !!habitCheckins[checkinKey];
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
  if (habit.cadence === 'daily') {
    return true;
  }
  
  if (habit.cadence === 'weekly') {
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
