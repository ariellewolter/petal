// ═══════════════════════ EVENT HELPERS ═══════════════════════
// Shared utilities for event and recurring rule calculations
// 
// CRITICAL: This is the SINGLE SOURCE OF TRUTH for event calculation
// Used by both Today page and Planner page to ensure they always show the same events
// Both pages automatically sync when events/recurringRules change via store subscriptions

import { parseTime } from './dates.js';

/**
 * Expand recurring rules into events for a date range
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @param {Array} recurringRules - Recurring rules from state
 * @returns {Array} Expanded events
 */
export function expandRecurringRules(startDate, endDate, recurringRules) {
  const expanded = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  recurringRules.forEach(rule => {
    if (!rule.enabled) return;
    
    const current = new Date(start);
    while (current <= end) {
      const dayOfWeek = current.getDay(); // 0 = Sunday, 6 = Saturday
      if (rule.daysOfWeek && rule.daysOfWeek.includes(dayOfWeek)) {
        const eventDate = current.toISOString().split('T')[0];
        expanded.push({
          id: `evt_${rule.id}_${eventDate}`,
          title: rule.title,
          date: eventDate,
          startTime: rule.startTime,
          durationMin: rule.durationMin,
          category: rule.category,
          location: rule.location || null,
          bufferBeforeMin: rule.bufferBeforeMin || 0,
          bufferAfterMin: rule.bufferAfterMin || 0,
          recurrenceId: rule.id,
          notes: rule.notes || '',
          linkedProjectId: rule.linkedProjectId || null,
          linkedTaskId: rule.linkedTaskId || null
        });
      }
      current.setDate(current.getDate() + 1);
    }
  });
  
  return expanded;
}

/**
 * Get all events for a specific date (one-off + expanded recurring)
 * This is the SINGLE SOURCE OF TRUTH for event calculation
 * Used by both Today page and Planner page to ensure consistency
 * 
 * @param {Date} date - Date to get events for
 * @param {Array} events - One-off events from state
 * @param {Array} recurringRules - Recurring rules from state
 * @returns {Array} Sorted events for the date
 */
export function getEventsForDate(date, events, recurringRules) {
  const dateStr = date.toISOString().split('T')[0];
  
  // Get one-off events for this date
  const oneOff = (events || []).filter(e => e.date === dateStr);
  
  // Expand recurring rules for this date
  const expanded = expandRecurringRules(date, date, recurringRules || []);
  const expandedForDate = expanded.filter(e => e.date === dateStr);
  
  // Combine and sort by start time
  const allEvents = [...oneOff, ...expandedForDate];
  
  return allEvents.sort((a, b) => {
    const aTime = parseTime(a.startTime || a.time || '00:00');
    const bTime = parseTime(b.startTime || b.time || '00:00');
    return aTime - bTime;
  });
}
