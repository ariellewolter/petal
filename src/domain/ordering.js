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
 */
export function getBoardListForProjectFilter(tasks, status, projectFilter = 'all', excludeTaskId = null) {
  let filtered = tasks.filter(t => {
    if (excludeTaskId && t.id === excludeTaskId) return false;
    if (t.status !== status) return false;
    if (projectFilter !== 'all') {
      const taskProjectId = t.projectId ? (typeof t.projectId === 'number' ? t.projectId : parseInt(t.projectId)) : null;
      const filterProjectId = typeof projectFilter === 'number' ? projectFilter : parseInt(projectFilter);
      return taskProjectId === filterProjectId;
    }
    return true;
  });
  
  // Sort by boardOrder
  filtered.sort((a, b) => {
    const orderA = Number(a.boardOrder) || 0;
    const orderB = Number(b.boardOrder) || 0;
    return orderA - orderB;
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
