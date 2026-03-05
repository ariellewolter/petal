// ═══════════════════════ TASK-EVENT CONVERTER ═══════════════════════
// Utilities for converting between tasks and planner events
// Enables bidirectional linking between tasks and planner blocks

import { parseTime } from './dates.js';

/**
 * Get task category based on task properties
 * Used to determine event category when converting task to event
 */
function getTaskCategory(task, projects = []) {
  // Use lane if available
  if (task.lane) {
    const laneCategoryMap = {
      'lab': 'work',
      'comp': 'work',
      'writing': 'work',
      'presentation': 'work',
      'product': 'work',
      'personal': 'personal'
    };
    return laneCategoryMap[task.lane] || 'personal';
  }
  
  // Use project category if task belongs to project
  if (task.projectId) {
    const project = projects.find(p => String(p.id) === String(task.projectId));
    if (project) {
      return 'work';
    }
  }
  
  // Default based on priority
  return task.priority >= 3 ? 'work' : 'personal';
}

/**
 * Convert a task to a planner event
 * @param {Object} task - Task object
 * @param {string} dateOverride - Optional date override (YYYY-MM-DD)
 * @param {Array} projects - Optional projects array for category determination
 * @returns {Object} Event object
 */
export function taskToEvent(task, dateOverride = null, projects = []) {
  // Determine scheduled date
  const scheduledDate = dateOverride || task.scheduledDate || task.due || new Date().toISOString().split('T')[0];
  
  // Determine start time (default to 9am if not specified)
  const startTime = task.scheduledStartTime || '09:00';
  
  // Determine duration (use estimatedMinutes or default to 1 hour)
  const duration = task.scheduledDurationMin || task.estimatedMinutes || 60;
  
  // Determine category
  const category = getTaskCategory(task, projects);
  
  // Create event ID that includes task ID for easy lookup
  const eventId = task.plannerEventId || `evt_task_${task.id}_${Date.now()}`;
  
  return {
    id: eventId,
    title: task.title,
    date: scheduledDate,
    startTime: startTime,
    durationMin: duration,
    category: category,
    location: null,
    bufferBeforeMin: 0,
    bufferAfterMin: 0,
    notes: task.notes || task.note || '',
    linkedProjectId: task.projectId || null,
    linkedTaskId: task.id, // Bidirectional link
    isTaskBlock: true, // Flag to identify task-derived blocks
    taskPriority: task.priority || 2,
    taskStatus: task.status || 'Todo',
    taskDone: task.done || false,
    taskLane: task.lane || null, // Workflow lane
    taskStage: task.stage || null // Workflow stage
  };
}

/**
 * Convert a planner event back to task scheduling info
 * @param {Object} event - Event object
 * @returns {Object} Task scheduling fields
 */
export function eventToTaskScheduling(event) {
  return {
    scheduledDate: event.date,
    scheduledStartTime: event.startTime,
    scheduledDurationMin: event.durationMin,
    plannerEventId: event.id
  };
}

/**
 * Check if a task should create a planner block
 * @param {Object} task - Task object
 * @returns {boolean} True if task should create a block
 */
export function shouldCreateBlockForTask(task) {
  // Create block if:
  // 1. Task has autoCreateBlock flag set to true, OR
  // 2. Task has scheduledDate and scheduledStartTime set
  return task.autoCreateBlock === true || 
         (task.scheduledDate && task.scheduledStartTime);
}

/**
 * Get all tasks that should appear in planner for a given date
 * @param {Array} tasks - All tasks
 * @param {Date|string} date - Date to check (Date object or YYYY-MM-DD string)
 * @returns {Array} Tasks that should appear in planner for this date
 */
export function getTasksForPlannerDate(tasks, date) {
  const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0];
  
  return tasks.filter(task => {
    // Skip deleted or done tasks (unless they have a linked event)
    if (task.deletedAt) return false;
    
    // Include tasks with linked events for this date
    if (task.plannerEventId) {
      // We'll check if the event exists and matches the date in the planner render
      return true;
    }
    
    // Include tasks with scheduled date matching
    if (task.scheduledDate === dateStr) {
      return true;
    }
    
    // Include tasks with due date matching (optional - can be enabled/disabled)
    if (task.due && task.due.split('T')[0] === dateStr && !task.done) {
      return true;
    }
    
    return false;
  });
}

/**
 * Update task with scheduling information from event
 * @param {Object} task - Task object to update
 * @param {Object} event - Event object with scheduling info
 * @returns {Object} Updated task object
 */
export function updateTaskFromEvent(task, event) {
  return {
    ...task,
    scheduledDate: event.date,
    scheduledStartTime: event.startTime,
    scheduledDurationMin: event.durationMin,
    plannerEventId: event.id,
    // Update estimatedMinutes if it was changed in event
    estimatedMinutes: event.durationMin !== task.estimatedMinutes ? event.durationMin : task.estimatedMinutes
  };
}

/**
 * Get scheduled work info for display (task fields or from linked event if task not synced yet)
 * @param {Object} task - Task object
 * @param {Array} [events] - All events (to find one with linkedTaskId === task.id)
 * @returns {{ scheduledDate: string, scheduledStartTime: string, scheduledDurationMin: number } | null}
 */
export function getTaskScheduledWorkForDisplay(task, events = []) {
  if (task.scheduledDate || task.plannerEventId) {
    if (task.scheduledDate)
      return {
        scheduledDate: task.scheduledDate,
        scheduledStartTime: task.scheduledStartTime || '',
        scheduledDurationMin: task.scheduledDurationMin || null
      };
  }
  const linked = (events || []).find(e => e.linkedTaskId != null && String(e.linkedTaskId) === String(task.id));
  if (linked && linked.date)
    return {
      scheduledDate: linked.date,
      scheduledStartTime: linked.startTime || '',
      scheduledDurationMin: linked.durationMin || null
    };
  return null;
}

/**
 * Clear scheduling information from task
 * @param {Object} task - Task object
 * @returns {Object} Task with scheduling cleared
 */
export function clearTaskScheduling(task) {
  const updated = { ...task };
  delete updated.scheduledDate;
  delete updated.scheduledStartTime;
  delete updated.scheduledDurationMin;
  delete updated.plannerEventId;
  delete updated.autoCreateBlock;
  return updated;
}
