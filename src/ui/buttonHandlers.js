// ═══════════════════════ BUTTON ACTION HELPERS ═══════════════════════
// Helper functions to handle edit/delete actions from buttons
// Can be called from onclick handlers or event delegation

/**
 * Handle edit task action from button click
 */
export function handleEditTaskAction(event, buttonElement) {
  if (event) {
    event.stopPropagation();
    event.preventDefault();
  }
  
  // Find the button element - try multiple methods for Electron compatibility
  let btn = null;
  
  // Method 1: Use buttonElement parameter (passed from delegation or onclick)
  const editAction = buttonElement?.getAttribute?.('data-action');
  if (buttonElement && (editAction === 'edit-task' || editAction === 'edit')) {
    btn = buttonElement;
  }
  // Method 2: Use event.target and closest
  else if (event && event.target) {
    btn = event.target.closest?.('[data-action="edit-task"], [data-action="edit"]') || null;
    if (!btn && event.target.getAttribute) {
      const a = event.target.getAttribute('data-action');
      if (a === 'edit-task' || a === 'edit') btn = event.target;
    }
  }
  // Method 3: Try to find from currentTarget
  else if (event?.currentTarget?.getAttribute) {
    const a = event.currentTarget.getAttribute('data-action');
    if (a === 'edit-task' || a === 'edit') btn = event.currentTarget;
  }
  
  if (!btn) {
    btn = event?.target?.closest?.('[data-action="edit-task"], [data-action="edit"]') || null;
  }
  
  const btnAction = btn?.getAttribute?.('data-action');
  if (!btn || (btnAction !== 'edit-task' && btnAction !== 'edit')) {
    console.warn('Could not find edit button element', { event, buttonElement, btn });
    return;
  }
  
  const taskIdAttr = btn.getAttribute('data-task-id');
  if (!taskIdAttr) {
    console.warn('Edit task button missing data-task-id attribute');
    return;
  }
  
  // Keep ID as string - never truncate with parseInt/Number
  const taskId = String(taskIdAttr);
  
  const isSubtask = btn.getAttribute('data-is-subtask') === 'true';
  const projectId = btn.getAttribute('data-project-id');
  
  try {
    // Create context for editTask (it expects ctx, id)
    // Get state directly from store to avoid circular calls
    const state = window.Petal?.store?.getState() || {};
    const ctx = {
      tasks: state.tasks || [],
      projects: state.projects || [],
      events: state.events || [],
      recurringRules: state.recurringRules || [],
      settings: state.settings || {},
      fileRegistry: window.fileRegistry || {},
      fileHistory: window.fileHistory || {},
      render: window.render || (() => {}),
      save: window.Petal?.handlers?.save || (() => Promise.resolve())
    };
    
    if (isSubtask && projectId) {
      if (window.editSubtask) {
        window.editSubtask(String(projectId), taskId);
      }
    } else if (taskId) {
      // editTask expects (ctx, id) - pass context
      if (window.Petal?.features?.taskOperations?.editTask) {
        window.Petal.features.taskOperations.editTask(ctx, taskId);
      } else if (window.editTask) {
        // Fallback: try calling with just taskId (legacy support)
        try {
          window.editTask(taskId);
        } catch (err) {
          // If that fails, try with context
          if (typeof window.editTask === 'function' && window.editTask.length === 2) {
            window.editTask(ctx, taskId);
          }
        }
      }
    }
  } catch (error) {
    console.error('Error handling edit-task action:', error);
    alert('Error opening edit modal: ' + error.message);
  }
}

/**
 * Handle delete task action from button click
 */
export function handleDeleteTaskAction(event, buttonElement) {
  if (event) {
    event.stopPropagation();
    event.preventDefault();
  }
  
  // Find the button element - try multiple methods for Electron compatibility
  let btn = null;
  
  // Method 1: Use buttonElement parameter (passed from onclick handler)
  if (buttonElement && buttonElement.getAttribute && buttonElement.getAttribute('data-action') === 'delete-task') {
    btn = buttonElement;
  }
  // Method 2: Use event.target and closest
  else if (event && event.target) {
    btn = event.target.closest ? event.target.closest('[data-action="delete-task"]') : null;
    if (!btn && event.target.getAttribute && event.target.getAttribute('data-action') === 'delete-task') {
      btn = event.target;
    }
  }
  // Method 3: Try to find from currentTarget
  else if (event && event.currentTarget && event.currentTarget.getAttribute && event.currentTarget.getAttribute('data-action') === 'delete-task') {
    btn = event.currentTarget;
  }
  
  // Try multiple selectors for compatibility
  if (!btn) {
    btn = event?.target?.closest?.('button.btn-del, button.btn-delete, [data-action="delete"], [data-action="delete-task"]');
  }
  
  if (!btn || (btn.getAttribute('data-action') !== 'delete-task' && btn.getAttribute('data-action') !== 'delete')) {
    // Silently return - this is likely from an old handler, don't log as error
    return;
  }
  
  const taskIdAttr = btn.getAttribute('data-task-id') || btn.getAttribute('data-id');
  if (!taskIdAttr) {
    return;
  }
  
  // Keep ID as string - never truncate with parseInt/Number
  const taskId = String(taskIdAttr);
  
  const isSubtask = btn.getAttribute('data-is-subtask') === 'true';
  const projectId = btn.getAttribute('data-project-id') || null;
  const parentTaskId = btn.getAttribute('data-parent-task-id') || null;
  
  console.log('handleDeleteTaskAction calling deleteTask wrapper', { taskId, isSubtask, projectId, parentTaskId });
  
  // Use the taskOperations wrapper (like edit does) - builds context from store at click time
  if (window.Petal?.features?.taskOperations?.deleteTask) {
    window.Petal.features.taskOperations.deleteTask(taskId, isSubtask, projectId, parentTaskId);
  } else if (window.Petal?.features?.deleteHandlers?.confirmDeleteTask) {
    // Fallback: build context from store
    const store = window.Petal?.store;
    const state = store?.getState?.() || {};
    const ctx = {
      store,
      state,
      tasks: Array.isArray(state.tasks) ? state.tasks : [],
      projects: Array.isArray(state.projects) ? state.projects : [],
      save: window.Petal?.handlers?.save || window.save,
      render: window.Petal?.handlers?.render || window.render,
    };
    window.Petal.features.deleteHandlers.confirmDeleteTask(ctx, taskId, isSubtask, projectId, parentTaskId);
  } else if (window.confirmDeleteTask) {
    window.confirmDeleteTask(taskId, isSubtask, projectId, parentTaskId);
  } else {
    console.error('No delete handler available');
    alert('Delete functionality not available. Please refresh the page.');
  }
}

// Expose globally for backward compatibility
window.handleEditTaskAction = handleEditTaskAction;
window.handleDeleteTaskAction = handleDeleteTaskAction;
