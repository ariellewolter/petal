// ═══════════════════════ DOMAIN MODELS ═══════════════════════
// Pure functions for task/project operations - no side effects

import { LANE_STAGES, MATRIX_STAGES } from './schema.js';

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
  const depTask = tasks.find(t => t.id === task.dependsOn);
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
 * Get all tasks including subtasks with projectId attached
 * Takes explicit tasks and projects arrays - no store peeking
 */
export function getAllTasks(tasks, projects) {
  const allTasks = [...tasks];
  projects.forEach(p => {
    (p.subtasks || []).forEach(st => {
      allTasks.push({
        ...st,
        projectId: p.id,
        projectName: p.name,
        isSubtask: true
      });
    });
  });
  return allTasks;
}

/**
 * Filter tasks by project
 */
export function getTasksByProject(tasks, projects, projectId) {
  const allTasks = getAllTasks(tasks, projects);
  return allTasks.filter(t => {
    const taskProjectId = t.projectId ? (typeof t.projectId === 'number' ? t.projectId : parseInt(t.projectId)) : null;
    return taskProjectId === projectId;
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
