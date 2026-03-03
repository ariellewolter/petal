// ═══════════════════════ WORKFLOW-TASK OPERATIONS ═══════════════════════
// Operations for integrating workflow lanes with tasks (drag & drop, lane assignment)

import { LANES } from '../domain/schema.js';

// Track task being dragged
let draggedTaskId = null;

/**
 * Handle task drag start for workflow lanes
 * @param {Event} event - Drag event
 * @param {number} taskId - Task ID
 */
export function handleTaskDragStart(event, taskId) {
  if (!event || !taskId) return;
  
  draggedTaskId = taskId;
  
  // Set drag data
  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData('text/plain', JSON.stringify({
    type: 'task',
    taskId: taskId,
  }));
  
  // Visual feedback
  if (event.target) {
    event.target.style.opacity = '0.5';
  }
  
  if (window.__DEBUG__) {
    console.log('📋 Task drag started for workflow:', { taskId });
  }
}

/**
 * Handle task drag end
 * @param {Event} event - Drag event
 */
export function handleTaskDragEnd(event) {
  // Reset visual feedback
  if (event.target) {
    event.target.style.opacity = '1';
  }
  
  draggedTaskId = null;
  
  if (window.__DEBUG__) {
    console.log('📋 Task drag ended');
  }
}

/**
 * Handle task drop on workflow lane
 * @param {Event} event - Drop event
 * @param {string} laneName - Lane name (lab, comp, writing, etc.)
 * @param {Object} ctx - Context (store, save, etc.)
 */
export async function handleLaneDrop(event, laneName, ctx) {
  if (!event || !laneName || !ctx) return;
  
  event.preventDefault();
  event.stopPropagation();
  
  // Get task data from drag
  let taskId = null;
  
  try {
    const data = event.dataTransfer.getData('text/plain');
    if (data) {
      const parsed = JSON.parse(data);
      if (parsed.type === 'task') {
        taskId = parsed.taskId;
      }
    }
  } catch (e) {
    console.error('Error parsing drop data:', e);
  }
  
  // Fallback to draggedTaskId if available
  if (!taskId && draggedTaskId) {
    taskId = draggedTaskId;
  }
  
  if (!taskId) {
    console.warn('No task ID in drop event');
    return;
  }
  
  // Assign task to lane
  await assignTaskToLane(taskId, laneName, ctx);
  
  // Reset drag state
  draggedTaskId = null;
}

/**
 * Assign a task to a workflow lane
 * @param {number} taskId - Task ID
 * @param {string} laneName - Lane name
 * @param {Object} ctx - Context
 */
export async function assignTaskToLane(taskId, laneName, ctx) {
  if (!taskId || !laneName || !ctx) return;
  
  const { tasks, projects, save } = ctx;
  
  // Find task
  const allTasks = [...(tasks || []), ...(projects || []).flatMap(p => p.subtasks || [])];
  const task = allTasks.find(t => t.id === taskId);
  
  if (!task) {
    console.warn('Task not found:', taskId);
    return;
  }
  
  // Validate lane
  if (!LANES[laneName] && laneName !== 'unassigned') {
    console.warn('Invalid lane:', laneName);
    return;
  }
  
  // Update task's lane property
  const updatedTask = {
    ...task,
    lane: laneName === 'unassigned' ? null : laneName,
  };
  
  // Update in tasks array
  const taskIndex = tasks.findIndex(t => t.id === taskId);
  if (taskIndex >= 0) {
    tasks[taskIndex] = updatedTask;
  } else {
    // Might be a subtask - update in project
    const project = projects.find(p => p.subtasks?.some(st => st.id === taskId));
    if (project && project.subtasks) {
      const subtaskIndex = project.subtasks.findIndex(st => st.id === taskId);
      if (subtaskIndex >= 0) {
        project.subtasks[subtaskIndex] = updatedTask;
      }
    }
  }
  
  // Use workflow operations if available
  if (window.Petal?.features?.workflow?.workflowOperations?.setWorkflowPlacement) {
    // Set default column based on task status
    let column = 'Backlog';
    if (task.done) {
      column = 'Done';
    } else if (task.status === 'Doing') {
      column = 'Doing';
    } else if (task.status === 'Todo') {
      column = 'Next';
    }
    
    window.Petal.features.workflow.workflowOperations.setWorkflowPlacement(
      taskId,
      laneName === 'unassigned' ? null : laneName,
      column
    );
  }
  
  // Update store
  if (window.Petal?.store) {
    const state = window.Petal.store.getState();
    const updatedTasks = state.tasks.map(t => t.id === taskId ? updatedTask : t);
    window.Petal.store.setState({ tasks: updatedTasks });
  }
  
  await save();
  
  // Rerender views
  if (window.Petal?.pages?.TasksPage?.render) {
    window.Petal.pages.TasksPage.render();
  }
  
  if (window.Petal?.pages?.WorkflowPage?.renderWorkflowPage) {
    const state = window.Petal.store.getState();
    const containerEl = document.getElementById('view-workflow');
    if (containerEl) {
      window.Petal.pages.WorkflowPage.renderWorkflowPage(containerEl, state, window.Petal.handlers);
    }
  }
  
  if (window.__DEBUG__) {
    console.log('✅ Task assigned to lane:', { taskId, laneName });
  }
}

/**
 * View tasks in a specific lane
 * @param {string} laneName - Lane name
 * @param {Object} ctx - Context
 */
export function viewLaneTasks(laneName, ctx) {
  if (!laneName || !ctx) return;
  
  // Switch to workflow page and filter to lane
  if (window.Petal?.pages?.WorkflowPage?.renderWorkflowPage) {
    const state = window.Petal.store.getState();
    
    // Set workflow view to list and filter to lane
    window.Petal.store.setState({
      currentPage: 'workflow',
      workflow: {
        ...state.workflow,
        ui: {
          ...state.workflow?.ui,
          activeLane: laneName,
        }
      }
    });
    
    // Navigate to workflow page
    if (window.Petal?.router?.switchView) {
      window.Petal.router.switchView('workflow');
    } else if (window.switchView) {
      window.switchView('workflow');
    }
    
    // Render workflow page
    const containerEl = document.getElementById('view-workflow');
    if (containerEl) {
      window.Petal.pages.WorkflowPage.renderWorkflowPage(containerEl, window.Petal.store.getState(), window.Petal.handlers);
    }
  }
  
  if (window.__DEBUG__) {
    console.log('📋 Viewing lane tasks:', { laneName });
  }
}
