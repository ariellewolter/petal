// ═══════════════════════ ORDERING LOGIC ═══════════════════════
// Kanban ordering, drag/drop reorder math

import { calculateFloatOrder } from './models.js';

/**
 * Reindex a column with sequential orders
 */
export function reindexColumn(tasks, status, projectFilter = 'all') {
  const filtered = getBoardListForProjectFilter(tasks, status, projectFilter);
  filtered.forEach((t, idx) => {
    t.boardOrder = (idx + 1) * 1024;
  });
}

/**
 * Get board list for a specific status and project filter
 * @param {Array} tasks - Array of tasks
 * @param {string} status - Task status to filter by
 * @param {string|number} projectFilter - Project filter ('all' or project ID)
 * @param {number|string|null} excludeTaskId - Task ID to exclude
 * @param {string} searchQuery - Optional search query to filter tasks
 * @param {Function} matchesSearchFn - Optional function to match tasks against search query
 * @returns {Array} Filtered and sorted tasks
 */
export function getBoardListForProjectFilter(tasks, status, projectFilter = 'all', excludeTaskId = null, searchQuery = null, matchesSearchFn = null) {
  let filtered = tasks.filter(t => {
    if (t.deletedAt) return false; // Exclude deleted tasks
    if (excludeTaskId && t.id === excludeTaskId) return false;
    if (t.status !== status) return false;
    if (projectFilter !== 'all') {
      const taskProjectId = t.projectId ? (typeof t.projectId === 'number' ? t.projectId : parseInt(t.projectId)) : null;
      const filterProjectId = typeof projectFilter === 'number' ? projectFilter : parseInt(projectFilter);
      if (taskProjectId !== filterProjectId) return false;
    }
    // Apply search filter if provided
    if (searchQuery && searchQuery.trim() && matchesSearchFn) {
      if (!matchesSearchFn(t, searchQuery)) return false;
    }
    return true;
  });
  
  // Sort by boardOrder
  filtered.sort((a, b) => {
    const orderA = Number(a.boardOrder) || 0;
    const orderB = Number(b.boardOrder) || 0;
    if (orderA !== orderB) return orderA - orderB;
    // Fallback to ID sort if boardOrder is the same
    return (a.id || 0) - (b.id || 0);
  });
  
  return filtered;
}

/**
 * Calculate new order when dropping a task into a column
 */
export function calculateDropOrder(tasks, status, insertIndex, projectFilter, movedTaskId) {
  const targetList = getBoardListForProjectFilter(tasks, status, projectFilter, movedTaskId);
  const prevTask = targetList[insertIndex - 1] || null;
  const nextTask = targetList[insertIndex] || null;
  return calculateFloatOrder(prevTask, nextTask);
}
