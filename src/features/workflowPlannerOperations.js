// ═══════════════════════ WORKFLOW-PLANNER OPERATIONS ═══════════════════════
// Operations for integrating workflow and planner views

import { LANES } from '../domain/schema.js';

/**
 * Navigate to planner and show task
 * @param {number} taskId - Task ID
 * @param {Object} ctx - Context
 */
export function showTaskInPlanner(taskId, ctx) {
  if (!taskId || !ctx) return;
  
  const { tasks } = ctx;
  const task = tasks.find(t => String(t.id) === String(taskId));
  if (!task) {
    console.warn('Task not found:', taskId);
    return;
  }
  
  // Get scheduled date or use today
  const scheduledDate = task.scheduledDate || new Date().toISOString().split('T')[0];
  
  // Navigate to planner page
  if (window.Petal?.store) {
    window.Petal.store.setState({
      currentPage: 'planner',
      planner: {
        ...window.Petal.store.getState().planner,
        plannerViewDate: scheduledDate
      }
    });
  }
  
  // Navigate to planner
  if (window.Petal?.router?.switchView) {
    window.Petal.router.switchView('planner');
  } else if (window.switchView) {
    window.switchView('planner');
  }
  
  // Render planner page
  if (window.Petal?.pages?.PlannerPage?.render) {
    const state = window.Petal.store.getState();
    const containerEl = document.getElementById('view-planner');
    if (containerEl) {
      window.Petal.pages.PlannerPage.render(containerEl, state, window.Petal.handlers);
    }
  }
  
  // Scroll to task block after a short delay
  setTimeout(() => {
    const taskBlock = document.querySelector(`[data-task-id="${taskId}"]`);
    if (taskBlock) {
      taskBlock.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Highlight the block briefly
      taskBlock.style.boxShadow = '0 0 0 3px var(--rose)';
      setTimeout(() => {
        taskBlock.style.boxShadow = '';
      }, 2000);
    }
  }, 300);
  
  if (window.__DEBUG__) {
    console.log('📅 Showing task in planner:', { taskId, scheduledDate });
  }
}

/**
 * Schedule a workflow task in planner
 * @param {number} taskId - Task ID
 * @param {string} date - Date string (YYYY-MM-DD)
 * @param {string} startTime - Start time (HH:MM)
 * @param {number} durationMin - Duration in minutes
 * @param {Object} ctx - Context
 */
export async function scheduleWorkflowTask(taskId, date, startTime, durationMin, ctx) {
  if (!taskId || !date || !startTime || !durationMin || !ctx) return;
  
  const { tasks, save } = ctx;
  const task = tasks.find(t => String(t.id) === String(taskId));
  if (!task) {
    console.warn('Task not found:', taskId);
    return;
  }
  
  // Update task with scheduling info
  task.scheduledDate = date;
  task.scheduledStartTime = startTime;
  task.scheduledDurationMin = durationMin;
  
  // Create planner event if needed
  if (window.Petal?.features?.plannerOperations?.createEventFromTask) {
    await window.Petal.features.plannerOperations.createEventFromTask(task, ctx);
  }
  
  // Update store
  if (window.Petal?.store) {
    const state = window.Petal.store.getState();
    const updatedTasks = state.tasks.map(t => t.id === taskId ? task : t);
    window.Petal.store.setState({ tasks: updatedTasks });
  }
  
  await save();
  
  // Rerender views
  if (window.Petal?.pages?.PlannerPage?.render) {
    const state = window.Petal.store.getState();
    const containerEl = document.getElementById('view-planner');
    if (containerEl) {
      window.Petal.pages.PlannerPage.render(containerEl, state, window.Petal.handlers);
    }
  }
  
  if (window.Petal?.pages?.WorkflowPage?.renderWorkflowPage) {
    const state = window.Petal.store.getState();
    const containerEl = document.getElementById('view-workflow');
    if (containerEl) {
      window.Petal.pages.WorkflowPage.renderWorkflowPage(containerEl, state, window.Petal.handlers);
    }
  }
  
  if (window.__DEBUG__) {
    console.log('✅ Workflow task scheduled:', { taskId, date, startTime, durationMin });
  }
}

/**
 * Get workflow lane label
 * @param {string} laneId - Lane ID
 * @returns {string} Lane label
 */
export function getLaneLabel(laneId) {
  if (!laneId) return '';
  const lane = LANES[laneId];
  return lane ? lane.label : laneId;
}

/**
 * Get workflow lane color
 * @param {string} laneId - Lane ID
 * @returns {string} Lane color CSS variable
 */
export function getLaneColor(laneId) {
  if (!laneId) return 'var(--text-dim)';
  const lane = LANES[laneId];
  return lane ? lane.color : 'var(--text-dim)';
}
