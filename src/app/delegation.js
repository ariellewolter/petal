// ═══════════════════════ EVENT DELEGATION ═══════════════════════
// Set up event delegation on stable root container for all action buttons

import { handleEditTaskAction, handleDeleteTaskAction } from '../ui/buttonHandlers.js';

/**
 * Set up event delegation for app-wide click handling
 */
export function setupEventDelegation() {
  const appContainer = document.querySelector('.app') || document.body;
  
  // Remove any existing handler
  if (window._eventDelegationHandler) {
    appContainer.removeEventListener('click', window._eventDelegationHandler, true);
  }
  
  // Create unified click handler
  window._eventDelegationHandler = function(e) {
    // Find the closest element with a data-action attribute
    // Try multiple methods to find the button
    let actionBtn = null;
    
    // Method 1: Check if target itself has data-action
    if (e.target && e.target.hasAttribute && e.target.hasAttribute('data-action')) {
      actionBtn = e.target;
    }
    
    // Method 2: Use closest() - works for nested elements (icons, text inside buttons)
    if (!actionBtn && e.target && e.target.closest) {
      actionBtn = e.target.closest('[data-action]');
    }
    
    // Method 3: Check parent elements manually (for cases where closest doesn't work)
    if (!actionBtn) {
      let element = e.target;
      let depth = 0;
      while (element && element !== appContainer && depth < 20) {
        if (element.hasAttribute && element.hasAttribute('data-action')) {
          actionBtn = element;
          break;
        }
        element = element.parentElement || element.parentNode;
        depth++;
      }
    }
    
    if (!actionBtn) {
      return;
    }
    
    const action = actionBtn.getAttribute('data-action');
    if (!action) {
      return;
    }
    
    // Edit task - use helper function
    if (action === 'edit-task') {
      handleEditTaskAction(e);
      return;
    }
    
    // Delete task - use helper function
    if (action === 'delete-task' || action === 'delete') {
      handleDeleteTaskAction(e);
      return;
    }
    
    // Delete file
    if (action === 'delete-file') {
      e.stopPropagation();
      const fileId = actionBtn.getAttribute('data-file-id');
      const projectId = actionBtn.getAttribute('data-project-id');
      
      if (fileId && projectId && window.confirmDeleteFile) {
        window.confirmDeleteFile(projectId, fileId);
      }
      return;
    }
    
    // Add milestone
    if (action === 'add-milestone') {
      e.stopPropagation();
      e.preventDefault();
      if (window.addMilestone) {
        window.addMilestone();
      }
      return;
    }
    
    // Switch project files tab
    if (action === 'switch-project-files-tab') {
      e.stopPropagation();
      e.preventDefault();
      const tab = actionBtn.getAttribute('data-tab');
      if (tab && window.switchProjectFilesTab) {
        window.switchProjectFilesTab(tab);
      }
      return;
    }
    
    // Add file to project
    if (action === 'add-file-to-project') {
      e.stopPropagation();
      e.preventDefault();
      if (window.selectedProjectId && window.openProjectAddFileModal) {
        window.openProjectAddFileModal(window.selectedProjectId);
      }
      return;
    }
    
    // Modal actions - handle with namespace pattern: "modal:close", "modal:submit", etc.
    const [namespace, modalAction] = action.includes(':') ? action.split(':') : [null, action];
    
    if (namespace === 'modal') {
      e.stopPropagation();
      
      // Get modal ID from data attribute or infer from action
      const modalId = actionBtn.getAttribute('data-modal-id');
      
      switch (modalAction) {
        case 'close':
          // Generic modal close - try to infer modal name from context
          if (modalId) {
            const closeFn = window[`close${modalId.charAt(0).toUpperCase() + modalId.slice(1)}Modal`];
            if (closeFn) {
              closeFn();
              return;
            }
          }
          // Try common modal close patterns
          const modal = actionBtn.closest('.quick-capture-modal');
          if (modal && modal.id) {
            const modalName = modal.id.replace('-modal', '').replace(/-/g, '');
            const closeFn = window[`close${modalName.charAt(0).toUpperCase() + modalName.slice(1).replace(/-([a-z])/g, (_, c) => c.toUpperCase())}Modal`];
            if (closeFn) {
              closeFn();
              return;
            }
          }
          // Fallback: try to find and hide modal
          if (modal) {
            modal.style.display = 'none';
          }
          break;
          
        case 'submit':
        case 'save':
          // Generic modal submit - try to infer modal name
          if (modalId) {
            const submitFn = window[`submit${modalId.charAt(0).toUpperCase() + modalId.slice(1)}Modal`] || 
                            window[`save${modalId.charAt(0).toUpperCase() + modalId.slice(1)}`];
            if (submitFn) {
              submitFn();
              return;
            }
          }
          const submitModal = actionBtn.closest('.quick-capture-modal');
          if (submitModal && submitModal.id) {
            const modalName = submitModal.id.replace('-modal', '').replace(/-/g, '');
            const submitFn = window[`submit${modalName.charAt(0).toUpperCase() + modalName.slice(1).replace(/-([a-z])/g, (_, c) => c.toUpperCase())}Modal`] ||
                            window[`save${modalName.charAt(0).toUpperCase() + modalName.slice(1).replace(/-([a-z])/g, (_, c) => c.toUpperCase())}`];
            if (submitFn) {
              submitFn();
              return;
            }
          }
          break;
      }
      return;
    }
    
    // Specific modal handlers (for backward compatibility and explicit control)
    const modalHandlers = {
      'modal:close-edit': () => {
        if (window.closeEditModal) {
          window.closeEditModal();
        } else {
          console.warn('closeEditModal not found');
        }
      },
      'modal:close-delete': () => {
        if (window.closeDeleteConfirmModal) {
          window.closeDeleteConfirmModal();
        } else {
          console.warn('closeDeleteConfirmModal not found');
        }
      },
      'modal:close-diagnostics': () => {
        if (window.closeDiagnosticsModal) {
          window.closeDiagnosticsModal();
        } else {
          console.warn('closeDiagnosticsModal not found');
        }
      },
      'modal:close-add-task': () => {
        if (window.closeAddTaskModal) {
          window.closeAddTaskModal();
        } else {
          console.warn('closeAddTaskModal not found');
        }
      },
      'modal:close-add-file': () => {
        if (window.closeAddFileModal) {
          window.closeAddFileModal();
        } else {
          console.warn('closeAddFileModal not found');
        }
      },
      'modal:close-file-notes': () => {
        if (window.closeFileNotesModal) {
          window.closeFileNotesModal();
        } else {
          console.warn('closeFileNotesModal not found');
        }
      },
      'modal:close-event': () => {
        if (window.closeEventModal) {
          window.closeEventModal();
        } else {
          console.warn('closeEventModal not found');
          // Fallback: manually close the modal
          const modal = document.getElementById('event-modal');
          if (modal) {
            modal.classList.remove('active');
            modal.style.display = 'none';
          }
        }
      },
      'modal:close-recurring': () => {
        if (window.closeRecurringModal) {
          window.closeRecurringModal();
        } else {
          console.warn('closeRecurringModal not found');
        }
      },
      'modal:submit-add-task': () => {
        if (window.submitAddTaskModal) {
          window.submitAddTaskModal();
        } else {
          console.warn('submitAddTaskModal not found');
        }
      },
      'modal:submit-add-file': () => {
        if (window.submitAddFileModal) {
          window.submitAddFileModal();
        } else {
          console.warn('submitAddFileModal not found');
        }
      },
      'modal:submit-event': () => {
        if (window.submitEventModal) {
          window.submitEventModal();
        } else {
          console.warn('submitEventModal not found');
        }
      },
      'modal:save-file-notes': () => {
        if (window.saveFileNotes) {
          window.saveFileNotes();
        } else {
          console.warn('saveFileNotes not found');
        }
      },
      'modal:save-edit': () => {
        if (window.saveEditModal) {
          window.saveEditModal();
        } else {
          console.warn('saveEditModal not found');
        }
      },
      'modal:delete-confirm': () => {
        if (window.executeDelete) {
          window.executeDelete();
        } else {
          console.warn('executeDelete not found');
        }
      },
      'modal:submit-recurring': () => {
        if (window.submitRecurringModal) {
          window.submitRecurringModal();
        } else {
          console.warn('submitRecurringModal not found');
        }
      },
    };
    
    if (modalHandlers[action]) {
      e.stopPropagation();
      modalHandlers[action]();
      return;
    }
    
    // Diagnostics actions
    if (action === 'diagnostics:copy') {
      e.stopPropagation();
      if (window.copyDiagnostics) window.copyDiagnostics();
      return;
    }
    if (action === 'diagnostics:open-logs') {
      e.stopPropagation();
      if (window.openLogsFolder) window.openLogsFolder();
      return;
    }
    if (action === 'diagnostics:open-vault') {
      e.stopPropagation();
      if (window.openVaultFolder) window.openVaultFolder();
      return;
    }
    if (action === 'diagnostics:refresh') {
      e.stopPropagation();
      if (window.refreshDiagnostics) window.refreshDiagnostics();
      return;
    }
    
    // Event actions
    if (action === 'event:delete') {
      e.stopPropagation();
      if (window.confirm && confirm('Delete this event?')) {
        const eventId = actionBtn.getAttribute('data-event-id') || window.editingEventId;
        if (eventId && window.deleteEvent) {
          window.deleteEvent(eventId);
          if (window.closeEventModal) window.closeEventModal();
        }
      }
      return;
    }
    
    // File actions
    if (action === 'file:add-row') {
      e.stopPropagation();
      const container = actionBtn.getAttribute('data-container') || 'modal-files-container';
      const context = actionBtn.getAttribute('data-context') || 'modal';
      if (window.addFileRow) window.addFileRow(container, context);
      return;
    }
    
    // Task drawer actions
    if (action === 'task-drawer:close') {
      e.stopPropagation();
      if (window.closeTaskDrawer) window.closeTaskDrawer();
      return;
    }
    if (action === 'task-drawer:switch-tab') {
      e.stopPropagation();
      const tab = actionBtn.getAttribute('data-tab');
      if (tab && window.switchTaskDrawerTab) window.switchTaskDrawerTab(tab);
      return;
    }
    if (action === 'task-drawer:add-log-entry') {
      e.stopPropagation();
      if (window.addTaskLogEntry) window.addTaskLogEntry();
      return;
    }
    if (action === 'task-drawer:save-protocol-entry') {
      e.stopPropagation();
      if (window.saveProtocolDailyEntry) window.saveProtocolDailyEntry();
      return;
    }
    if (action === 'task-drawer:link-file-protocol') {
      e.stopPropagation();
      if (window.linkFileToProtocolEntry) window.linkFileToProtocolEntry();
      return;
    }
    if (action === 'task-drawer:toggle-protocol-steps') {
      e.stopPropagation();
      if (window.toggleProtocolSteps) window.toggleProtocolSteps();
      return;
    }
    if (action === 'task-drawer:add-protocol-step') {
      e.stopPropagation();
      if (window.addProtocolStep) window.addProtocolStep();
      return;
    }
    if (action === 'task-drawer:link-existing-file') {
      e.stopPropagation();
      if (window.linkExistingFileToTask) window.linkExistingFileToTask();
      return;
    }
    if (action === 'task-drawer:add-new-file') {
      e.stopPropagation();
      if (window.addNewFileToTask) window.addNewFileToTask();
      return;
    }
    if (action === 'task-drawer:add-subtask') {
      e.stopPropagation();
      if (window.addSubtaskToTask) window.addSubtaskToTask();
      return;
    }
    
    // Workflow actions
    if (action === 'workflow:switch-view') {
      e.stopPropagation();
      const view = actionBtn.getAttribute('data-view');
      if (view && window.switchWorkflowView) window.switchWorkflowView(view, actionBtn);
      return;
    }
    if (action === 'workflow:toggle-filter') {
      e.stopPropagation();
      if (window.toggleWorkflowFilter) window.toggleWorkflowFilter(actionBtn);
      return;
    }
    if (action === 'workflow:close-detail') {
      e.stopPropagation();
      if (window.closeWfDetail) window.closeWfDetail();
      return;
    }
    
    // Planner actions
    if (action === 'planner:nav') {
      e.stopPropagation();
      const dir = actionBtn.getAttribute('data-dir');
      if (dir && window.plannerNav) {
        window.plannerNav(parseInt(dir, 10));
      } else if (dir && window.Petal?.handlers?.navigatePlannerDate) {
        window.Petal.handlers.navigatePlannerDate(parseInt(dir, 10));
      }
      return;
    }
    
    // Navigation actions - handle all nav:* actions generically
    if (action.startsWith('nav:')) {
      e.preventDefault();
      e.stopPropagation();
      const viewName = action.substring(4); // Remove 'nav:' prefix
      console.log('🔍 Navigation action:', viewName);
      
      if (window.routerSwitchView) {
        window.routerSwitchView(viewName).catch(err => {
          console.error('Router error:', err);
          // Fallback to old switchView if router fails
          if (window.switchView) {
            window.switchView(viewName);
          }
        });
      } else if (window.switchView) {
        window.switchView(viewName);
      } else if (window.switchViewSafe) {
        window.switchViewSafe(viewName);
      } else {
        console.error('switchView not available for navigation to:', viewName);
      }
      return false;
    }
    
    // Planner actions
    if (action === 'planner:set-view') {
      e.stopPropagation();
      const view = actionBtn.getAttribute('data-view');
      if (view) {
        if (window.setPlannerView) {
          const containerEl = actionBtn.closest('#view-planner') || document.getElementById('view-planner');
          window.setPlannerView(view, containerEl);
        } else if (window.Petal?.handlers?.setPlannerView) {
          const containerEl = actionBtn.closest('#view-planner') || document.getElementById('view-planner');
          window.Petal.handlers.setPlannerView(view, containerEl);
        }
      }
      return;
    }
    if (action === 'planner:cal-nav') {
      e.stopPropagation();
      const dir = actionBtn.getAttribute('data-dir');
      if (dir) {
        if (window.plannerCalNav) {
          window.plannerCalNav(parseInt(dir, 10));
        } else if (window.Petal?.handlers?.navigatePlannerCalendar) {
          window.Petal.handlers.navigatePlannerCalendar(parseInt(dir, 10));
          // Trigger re-render after calendar navigation
          if (window.routerSwitchView) {
            window.routerSwitchView('planner');
          }
        }
      }
      return;
    }
    if (action === 'planner:open-add-event') {
      e.stopPropagation();
      const dateStr = actionBtn.getAttribute('data-date') || null;
      if (window.openAddEventModal) window.openAddEventModal(dateStr);
      return;
    }
    
    // Habit modal actions
    if (action === 'modal:close-habit') {
      e.stopPropagation();
      if (window.closeHabitModal) window.closeHabitModal();
      return;
    }
    if (action === 'modal:submit-habit') {
      e.stopPropagation();
      if (window.submitHabitModal) window.submitHabitModal();
      return;
    }
    
    // Routine modal actions
    if (action === 'modal:close-routine') {
      e.stopPropagation();
      if (window.closeRoutineModal) window.closeRoutineModal();
      return;
    }
    if (action === 'modal:submit-routine') {
      e.stopPropagation();
      if (window.submitRoutineModal) window.submitRoutineModal();
      return;
    }
    
    // Projects view actions
    if (action === 'projects:toggle-create-form') {
      e.stopPropagation();
      if (window.toggleCreateProjectForm) window.toggleCreateProjectForm();
      return;
    }
    
    // Quick add action (for Today page and other quick add buttons)
    if (action === 'quick-add') {
      e.stopPropagation();
      if (window.Petal?.handlers?.quickAdd) {
        window.Petal.handlers.quickAdd();
      } else if (window.openAddTaskModal) {
        window.openAddTaskModal();
      } else if (window.Petal?.features?.modalOperations?.openAddTaskModal) {
        window.Petal.features.modalOperations.openAddTaskModal();
      } else {
        console.warn('quickAdd handler not available');
      }
      return;
    }
    
    // Cell log actions
    if (action === 'cell-log:add-entry') {
      e.stopPropagation();
      if (window.Petal?.pages?.cellLog?.addEntry) window.Petal.pages.cellLog.addEntry();
      return;
    }
    if (action === 'cell-log:cancel-edit') {
      e.stopPropagation();
      if (window.Petal?.pages?.cellLog?.cancelEdit) window.Petal.pages.cellLog.cancelEdit();
      return;
    }
    if (action === 'cell-log:add-cell-type') {
      e.stopPropagation();
      if (window.Petal?.pages?.cellLog?.addCellType) window.Petal.pages.cellLog.addCellType();
      return;
    }
    if (action === 'cell-log:add-media-type') {
      e.stopPropagation();
      if (window.Petal?.pages?.cellLog?.addMediaType) window.Petal.pages.cellLog.addMediaType();
      return;
    }
  };
  
  // Attach handler to root container (capture phase to catch early)
  appContainer.addEventListener('click', window._eventDelegationHandler, true);
  
  console.log('✅ Event delegation set up');
}
