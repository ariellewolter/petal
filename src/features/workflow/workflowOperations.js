// ═══════════════════════ WORKFLOW OPERATIONS ═══════════════════════
// Only place that writes to store for workflow state
// All functions use immutable updates via store.setState()

import { appStore } from '../../state/store.js';

/**
 * Set workflow placement for a task
 * @param {number|string} taskId - Task ID
 * @param {string} lane - Lane name (lab, comp, writing, presentation, unassigned)
 * @param {string} column - Column name (Backlog, Next, Doing, Blocked, Done)
 */
export function setWorkflowPlacement(taskId, lane, column) {
  const state = appStore.getState();
  const workflow = state.workflow || {};
  const placement = workflow.placement || {};
  
  // Create immutable update
  const newPlacement = {
    ...placement,
    [taskId]: { lane, column }
  };
  
  // Also update task's lane/stage if needed (for backward compatibility)
  const tasks = state.tasks || [];
  const taskIndex = tasks.findIndex(t => t.id === taskId);
  
  if (taskIndex >= 0) {
    const updatedTasks = [...tasks];
    updatedTasks[taskIndex] = {
      ...updatedTasks[taskIndex],
      lane: lane !== 'unassigned' ? lane : null,
      // Map column to stage if lane has stages
      stage: mapColumnToStage(lane, column)
    };
    
    appStore.setState({
      workflow: {
        ...workflow,
        placement: newPlacement
      },
      tasks: updatedTasks
    });
  } else {
    // Just update workflow placement
    appStore.setState({
      workflow: {
        ...workflow,
        placement: newPlacement
      }
    });
  }
  
  if (window.__DEBUG__) {
    console.log('🔧 setWorkflowPlacement:', { taskId, lane, column });
  }
}

/**
 * Map column name to stage name for a lane
 */
function mapColumnToStage(lane, column) {
  if (column === 'Done') return 'Done';
  if (column === 'Blocked') return 'Blocked';
  if (column === 'Doing') return 'Doing';
  if (column === 'Next') return 'Next';
  if (column === 'Backlog') return 'Backlog';
  return null;
}

/**
 * Bulk infer placement from tags (optional helper)
 * @param {Object} state - Current state
 */
export function bulkInferPlacementFromTags(state) {
  const { tasks, workflow } = state;
  const { rules } = workflow || {};
  const tagToLane = rules?.tagToLane || {};
  
  if (!tasks || tasks.length === 0) return;
  
  const placement = { ...(workflow.placement || {}) };
  let updated = false;
  
  tasks.forEach(task => {
    // Skip if already has placement
    if (placement[task.id]) return;
    
    // Check tags
    if (task.tags && Array.isArray(task.tags)) {
      for (const tag of task.tags) {
        const lane = tagToLane[tag];
        if (lane) {
          placement[task.id] = { lane, column: 'Next' };
          updated = true;
          break;
        }
      }
    }
  });
  
  if (updated) {
    appStore.setState({
      workflow: {
        ...workflow,
        placement
      }
    });
    
    if (window.__DEBUG__) {
      console.log('🔧 bulkInferPlacementFromTags: updated', Object.keys(placement).length, 'tasks');
    }
  }
}

/**
 * Toggle unassigned section visibility
 */
export function toggleUnassignedSection() {
  const state = appStore.getState();
  const workflow = state.workflow || {};
  const ui = workflow.ui || {};
  
  appStore.setState({
    workflow: {
      ...workflow,
      ui: {
        ...ui,
        showUnassigned: !ui.showUnassigned
      }
    }
  });
  
  if (window.__DEBUG__) {
    console.log('🔧 toggleUnassignedSection:', !ui.showUnassigned);
  }
}

/**
 * Set workflow project filter
 * @param {string|number} projectId - Project ID or "all"
 */
export function setWorkflowProjectFilter(projectId) {
  const state = appStore.getState();
  const workflow = state.workflow || {};
  const ui = workflow.ui || {};
  
  appStore.setState({
    workflow: {
      ...workflow,
      ui: {
        ...ui,
        activeProjectId: projectId === 'all' ? 'all' : String(projectId)
      }
    }
  });
  
  if (window.__DEBUG__) {
    console.log('🔧 setWorkflowProjectFilter:', projectId);
  }
}

/**
 * Toggle active files sidebar
 */
export function toggleActiveFilesPanel() {
  const state = appStore.getState();
  const workflow = state.workflow || {};
  const ui = workflow.ui || {};
  
  appStore.setState({
    workflow: {
      ...workflow,
      ui: {
        ...ui,
        showActiveFiles: !ui.showActiveFiles
      }
    }
  });
  
  if (window.__DEBUG__) {
    console.log('🔧 toggleActiveFilesPanel:', !ui.showActiveFiles);
  }
}

/**
 * Move task between columns (drag-drop handler)
 * @param {number|string} taskId - Task ID
 * @param {string} newLane - New lane
 * @param {string} newColumn - New column
 */
export function moveTask(taskId, newLane, newColumn) {
  setWorkflowPlacement(taskId, newLane, newColumn);
}
