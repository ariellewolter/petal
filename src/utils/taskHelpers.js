// ═══════════════════════ TASK HELPER FUNCTIONS ═══════════════════════
// Helper functions for task operations and queries

import { parseDate, today } from './dates.js';
import { isTaskBlocked } from '../domain/models.js';

/** Normalize priority to numeric rank (3 = high, 2 = medium, 1 = low) */
function priorityRank(priority) {
  if (typeof priority === 'number') return priority;
  const value = String(priority || '').toLowerCase();
  if (value === 'high') return 3;
  if (value === 'low') return 1;
  return 2;
}

/**
 * Get all tasks including project subtasks
 * @param {Array} tasks - Array of tasks
 * @param {Array} projects - Array of projects
 * @returns {Array} All tasks including project subtasks
 */
export function getAllTasks(tasks, projects) {
  // Filter out deleted tasks
  const activeTasks = (tasks || []).filter(t => !t.deletedAt);
  const allTasks = [...activeTasks];
  
  // Add project subtasks as tasks with project reference (legacy support)
  (projects || []).forEach(p => {
    (p.subtasks || []).forEach(st => {
      // Also filter out deleted subtasks
      if (!st.deletedAt) {
        allTasks.push({
          ...st,
          projectId: p.id,
          projectName: p.name,
          isSubtask: true
        });
      }
    });
  });
  
  // Tasks with parentTaskId are already in tasks array, no need to add separately
  return allTasks;
}

/**
 * Get tasks for a specific subtask (ordered)
 * @param {Array} tasks - Array of tasks
 * @param {number|string} subtaskId - Subtask ID
 * @returns {Array} Filtered and sorted tasks
 */
export function getTasksForSubtask(tasks, subtaskId) {
  return (tasks || []).filter(t => t.subtaskId === subtaskId).sort((a, b) => {
    return (a.subtaskOrder || 0) - (b.subtaskOrder || 0);
  });
}

/**
 * Get next 3 tasks (high priority or due soon)
 * @param {Array} activeTasks - Array of active tasks
 * @param {Array} allTasks - All tasks (for dependency checking)
 * @returns {Array} Next 3 tasks
 */
export function getNext3Tasks(activeTasks, allTasks = []) {
  const todayDate = today();
  const parseDateFn = parseDate;
  const isTaskBlockedFn = isTaskBlocked;
  
  // Get tasks that are: not done, not blocked, due soon OR manually prioritized
  const candidates = (activeTasks || []).filter(t => {
    if (t.done || isTaskBlockedFn(t, allTasks)) return false;
    if (priorityRank(t.priority) === 3) return true;
    if (t.due) {
      const due = parseDateFn(t.due);
      if (due) {
        const daysUntilDue = (due - todayDate) / (24 * 60 * 60 * 1000);
        if (daysUntilDue <= 3 && daysUntilDue >= 0) return true;
      }
    }
    return false;
  });
  
  // Sort by priority and due date
  candidates.sort((a, b) => {
    const aRank = priorityRank(a.priority);
    const bRank = priorityRank(b.priority);
    if (aRank !== bRank) return bRank - aRank;
    if (a.due && b.due) {
      const aDue = parseDateFn(a.due);
      const bDue = parseDateFn(b.due);
      if (aDue && bDue) {
        return aDue - bDue;
      }
    }
    return 0;
  });
  
  return candidates.slice(0, 3);
}
