// ═══════════════════════ DOMAIN MODELS ═══════════════════════
// Pure functions for task/project operations - no side effects

import { LANE_STAGES, MATRIX_STAGES } from './schema.js';
import { projectIdsMatch } from '../utils/projectHelpers.js';

/**
 * Get default stage for a lane based on status
 */
export function getStageForLane(lane, status) {
  if (!lane) return status;
  const stages = LANE_STAGES[lane];
  if (!stages) return status;
  
  // Map common statuses to lane stages
  if (status === 'Inbox' || status === 'Todo' || status === 'Backlog') return stages[0];
  if (status === 'Doing') return stages[1];
  if (status === 'Done') return stages[stages.length - 1];
  return status;
}

/**
 * Map task to matrix stage (simplified 4-stage system)
 * Takes explicit tasks array - no store peeking
 */
export function getMatrixStage(task, tasks) {
  if (task.done) return 'ready';
  if (isTaskBlocked(task, tasks)) return 'blocked';
  if (task.status === 'Doing' || task.stage === 'doing') return 'doing';
  return 'planned';
}

/**
 * Check if a task is blocked by dependencies
 * Takes explicit tasks array - no store peeking
 */
export function isTaskBlocked(task, tasks) {
  if (!task.dependsOn) return false;
  
  // Find dependency in tasks array
  const depTask = tasks.find(t => projectIdsMatch(t.id, task.dependsOn));
  if (!depTask) return false;
  
  return !depTask.done;
}

/**
 * Calculate task order for Kanban board
 */
export function calculateFloatOrder(prevTask, nextTask) {
  const prevOrder = prevTask ? Number(prevTask.boardOrder) : null;
  const nextOrder = nextTask ? Number(nextTask.boardOrder) : null;
  if (prevOrder !== null && nextOrder !== null) return (prevOrder + nextOrder) / 2;
  if (prevOrder !== null) return prevOrder + 1024;
  if (nextOrder !== null) return nextOrder - 1024;
  return 1024;
}

/**
 * Generate a stable key for a task/subtask for deduplication
 * Phase 3 Fix: Handles tasks with IDs, subtasks with IDs, and anonymous tasks
 */
function stableTaskKey(t) {
  // Prefer explicit ids
  if (t.id != null) return `task:${t.id}`;
  if (t.taskId != null) return `task:${t.taskId}`;
  
  // Fallback for subtasks without ids (use project + title as composite key)
  if (t.projectId != null && t.title) {
    return `sub:${t.projectId}:${t.title}`;
  }
  
  // Last resort: use multiple fields to create a stable key
  return `anon:${JSON.stringify([t.projectId, t.title, t.due, t.createdAt])}`;
}

/**
 * Deduplicate tasks by stable key
 * Phase 3 Fix: Prevents double-counting even with missing IDs or legacy duplicates
 */
function dedupeTasks(list) {
  const seen = new Set();
  const out = [];
  for (const t of list) {
    const k = stableTaskKey(t);
    if (seen.has(k)) {
      console.warn('⚠️ Duplicate task detected (deduplicated):', k, t);
      continue;
    }
    seen.add(k);
    out.push(t);
  }
  return out;
}

/**
 * Get all tasks including subtasks with projectId attached
 * Takes explicit tasks and projects arrays - no store peeking
 * 
 * Phase 3 Fix: Deduplicates to prevent double-counting
 * Uses stable keys to handle tasks with/without IDs, subtasks, and legacy duplicates
 */
export function getAllTasks(tasks, projects) {
  // Filter out deleted tasks first
  const activeTasks = (tasks || []).filter(t => !t.deletedAt);
  const allTasks = [...activeTasks];
  const taskIds = new Set(activeTasks.map(t => t.id).filter(id => id != null));
  
  // Add project subtasks, but only if they're not already in tasks array
  (projects || []).forEach(p => {
    (p.subtasks || []).forEach(st => {
      // Skip deleted subtasks
      if (st.deletedAt) return;
      
      // Skip if this subtask is already in the tasks array (by ID)
      // This prevents double-counting when subtasks have been migrated to tasks
      if (st.id && taskIds.has(st.id)) {
        return; // Already in tasks array, skip
      }
      
      allTasks.push({
        ...st,
        projectId: p.id,
        projectName: p.name,
        isSubtask: true
      });
    });
  });
  
  // Phase 3 Fix: Deduplicate by stable key (handles edge cases)
  return dedupeTasks(allTasks);
}

/**
 * Filter tasks by project
 */
export function getTasksByProject(tasks, projects, projectId) {
  const allTasks = getAllTasks(tasks, projects);
  // Normalize projectId comparison to handle both string and number types
  // Also handle decimal projectIds (e.g., 1771714801103.9167 should match project 1771714801103)
  const normalizedProjectId = String(projectId).trim();
  const projectIdAsNumber = Number(projectId);
  
  return allTasks.filter(t => {
    if (!t.projectId) return false;
    
    // Try exact string match first
    const taskProjectId = String(t.projectId).trim();
    if (taskProjectId === normalizedProjectId) return true;
    
    // If task projectId is a decimal number, check if the integer part matches
    // This handles cases where task.projectId = 1771714801103.9167 and project.id = 1771714801103
    const taskProjectIdNum = Number(t.projectId);
    if (!isNaN(taskProjectIdNum) && !isNaN(projectIdAsNumber)) {
      // Compare integer parts (floor both values)
      if (Math.floor(taskProjectIdNum) === Math.floor(projectIdAsNumber)) {
        return true;
      }
    }
    
    return false;
  });
}

/**
 * Filter tasks by lane
 */
export function getTasksByLane(tasks, lane) {
  return tasks.filter(t => t.lane === lane);
}

/**
 * Filter tasks by stage
 */
export function getTasksByStage(tasks, stage) {
  return tasks.filter(t => {
    const taskStage = getMatrixStage(t, tasks);
    return taskStage === stage;
  });
}
