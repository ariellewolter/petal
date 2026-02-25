// ═══════════════════════ EVENT DELEGATION ═══════════════════════
// Set up event delegation on stable root container for all action buttons

import { handleEditTaskAction, handleDeleteTaskAction } from '../ui/buttonHandlers.js';

/**
 * Set up event delegation for app-wide click handling
 */
export function setupEventDelegation() {
  // Guard: prevent multiple simultaneous calls that could cause stack overflow
  if (window._eventDelegationSettingUp) {
    console.log('⏭️ setupEventDelegation: Already setting up, skipping');
    return;
  }
  
  window._eventDelegationSettingUp = true;
  
  try {
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
    
    // Debug logging
    console.log('🔘 Button clicked:', {
      action,
      target: e.target?.tagName,
      button: actionBtn.tagName,
      projectId: actionBtn.getAttribute('data-project-id'),
      taskId: actionBtn.getAttribute('data-task-id'),
      hasFeatures: !!window.Petal?.features
    });
    
    // Edit task - use helper function
    if (action === 'edit-task') {
      // Pass the button element so handleEditTaskAction can extract taskId correctly
      handleEditTaskAction(e, actionBtn);
      return;
    }
    
    // Delete task - use helper function
    if (action === 'delete-task' || action === 'delete') {
      handleDeleteTaskAction(e, actionBtn);
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
    
    // Link cell line to project
    if (action === 'link-cell-line') {
      e.stopPropagation();
      e.preventDefault();
      const projectId = actionBtn.getAttribute('data-project-id') || window.selectedProjectId;
      if (!projectId) {
        alert('Please select a project first');
        return;
      }
      
      const state = window.Petal?.store?.getState() || {};
      const baseCtx = window.Petal?.handlers?.createPageContext?.() || {};
      const ctx = {
        ...baseCtx,
        tasks: state.tasks || [],
        projects: state.projects || [],
        settings: state.settings || {},
        save: window.Petal?.handlers?.save || (() => Promise.resolve()),
        render: window.Petal?.handlers?.render || (() => {}),
        renderProjectHeader: window.Petal?.ui?.renderProjectHeader
      };
      
      if (window.Petal?.features?.projectOperations?.openLinkCellLineModal) {
        window.Petal.features.projectOperations.openLinkCellLineModal(ctx, projectId);
      } else if (window.openLinkCellLineModal) {
        window.openLinkCellLineModal(projectId);
      }
      return;
    }
    
    // Unlink cell line from project
    if (action === 'unlink-cell-line') {
      e.stopPropagation();
      e.preventDefault();
      const projectId = actionBtn.getAttribute('data-project-id');
      const cellLine = actionBtn.getAttribute('data-cell-line');
      if (!projectId || !cellLine) {
        return;
      }
      
      const state = window.Petal?.store?.getState() || {};
      const ctx = {
        tasks: state.tasks || [],
        projects: state.projects || [],
        save: window.Petal?.handlers?.save || (() => Promise.resolve()),
        render: window.Petal?.handlers?.render || (() => {}),
        renderProjectHeader: window.Petal?.ui?.renderProjectHeader,
        ...(window.Petal?.handlers?.createPageContext?.() || {})
      };
      
      if (window.Petal?.features?.projectOperations?.unlinkCellLineFromProject) {
        window.Petal.features.projectOperations.unlinkCellLineFromProject(ctx, projectId, cellLine);
      } else if (window.unlinkCellLineFromProject) {
        window.unlinkCellLineFromProject(projectId, cellLine);
      }
      return;
    }
    
    // Select cell line from modal
    if (action === 'select-cell-line') {
      e.stopPropagation();
      e.preventDefault();
      const projectId = actionBtn.getAttribute('data-project-id');
      const cellLine = actionBtn.getAttribute('data-cell-line');
      if (!projectId || !cellLine) {
        return;
      }
      
      const state = window.Petal?.store?.getState() || {};
      const ctx = {
        tasks: state.tasks || [],
        projects: state.projects || [],
        save: window.Petal?.handlers?.save || (() => Promise.resolve()),
        render: window.Petal?.handlers?.render || (() => {}),
        renderProjectHeader: window.Petal?.ui?.renderProjectHeader,
        ...(window.Petal?.handlers?.createPageContext?.() || {})
      };
      
      if (window.Petal?.features?.projectOperations?.linkCellLineToProject) {
        window.Petal.features.projectOperations.linkCellLineToProject(ctx, projectId, cellLine);
      } else if (window.linkCellLineToProject) {
        window.linkCellLineToProject(projectId, cellLine);
      }
      return;
    }
    
    // Create and link new cell line
    if (action === 'create-and-link-cell-line') {
      e.stopPropagation();
      e.preventDefault();
      const projectId = actionBtn.getAttribute('data-project-id');
      if (!projectId) {
        return;
      }
      
      const state = window.Petal?.store?.getState() || {};
      const baseCtx = window.Petal?.handlers?.createPageContext?.() || {};
      const ctx = {
        ...baseCtx,
        tasks: state.tasks || [],
        projects: state.projects || [],
        settings: state.settings || {},
        save: window.Petal?.handlers?.save || (() => Promise.resolve()),
        render: window.Petal?.handlers?.render || (() => {}),
        renderProjectHeader: window.Petal?.ui?.renderProjectHeader
      };
      
      if (window.Petal?.features?.projectOperations?.createAndLinkCellLine) {
        window.Petal.features.projectOperations.createAndLinkCellLine(ctx, projectId);
      } else if (window.createAndLinkCellLine) {
        window.createAndLinkCellLine(projectId);
      }
      return;
    }
    
    // Close link cell line modal
    if (action === 'close-link-cell-line-modal') {
      e.stopPropagation();
      e.preventDefault();
      if (window.Petal?.features?.projectOperations?.closeLinkCellLineModal) {
        window.Petal.features.projectOperations.closeLinkCellLineModal();
      } else if (window.closeLinkCellLineModal) {
        window.closeLinkCellLineModal();
      }
      return;
    }
    
    // Add milestone
    if (action === 'add-milestone') {
      e.stopPropagation();
      e.preventDefault();
      // Get projectId from button or fallback to window.selectedProjectId
      const projectId = actionBtn.getAttribute('data-project-id') || window.selectedProjectId;
      if (!projectId) {
        alert('Please select a project first');
        return;
      }
      
      // Set window.selectedProjectId if we got it from the button
      if (projectId && typeof window.selectedProjectId !== 'undefined') {
        window.selectedProjectId = projectId;
      }
      
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
      // Get projectId from button's data attribute first, then fallback to window.selectedProjectId
      const projectId = actionBtn.getAttribute('data-project-id') || window.selectedProjectId;
      if (!projectId) {
        alert('Please select a project first');
        return;
      }
      
      // Build context and call function with both ctx and projId
      const state = window.Petal?.store?.getState() || {};
      const ctx = {
        tasks: state.tasks || [],
        projects: state.projects || [],
        save: window.Petal?.handlers?.save || (() => Promise.resolve()),
        render: window.Petal?.handlers?.render || (() => {})
      };
      
      if (window.Petal?.features?.modalOperations?.openProjectAddFileModal) {
        window.Petal.features.modalOperations.openProjectAddFileModal(ctx, projectId);
      } else if (window.openProjectAddFileModal) {
        // Try calling with context if function accepts it
        if (window.openProjectAddFileModal.length === 2) {
          window.openProjectAddFileModal(ctx, projectId);
        } else {
          // Fallback: set window.selectedProjectId and call with just projectId
          if (typeof window.selectedProjectId !== 'undefined') {
            window.selectedProjectId = projectId;
          }
          window.openProjectAddFileModal(projectId);
        }
      }
      return;
    }
    
    // Specific modal handlers (check these FIRST before generic handler)
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
        console.log('🔘 modal:submit-add-task handler called');
        if (window.submitAddTaskModal) {
          console.log('✅ Calling window.submitAddTaskModal');
          window.submitAddTaskModal();
        } else {
          console.warn('⚠️ submitAddTaskModal not found');
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
      'modal:close-habit': () => {
        if (window.closeHabitModal) {
          window.closeHabitModal();
        } else {
          console.warn('closeHabitModal not found');
        }
      },
      'modal:submit-habit': () => {
        if (window.submitHabitModal) {
          window.submitHabitModal();
        } else {
          console.warn('submitHabitModal not found');
        }
      },
      'modal:close-routine': () => {
        if (window.closeRoutineModal) {
          window.closeRoutineModal();
        } else {
          console.warn('closeRoutineModal not found');
        }
      },
      'modal:submit-routine': () => {
        if (window.submitRoutineModal) {
          window.submitRoutineModal();
        } else {
          console.warn('submitRoutineModal not found');
        }
      },
    };
    
    if (modalHandlers[action]) {
      e.stopPropagation();
      modalHandlers[action]();
      return;
    }
    
    // Generic modal handler (fallback for modal actions not in specific handlers)
    // Handle with namespace pattern: "modal:close", "modal:submit", etc.
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
    if (action === 'task:open-drawer' || action === 'task:drawer' || action === 'open-drawer') {
      e.stopPropagation();
      const taskId = actionBtn.getAttribute('data-task-id');
      if (taskId) {
        if (window.Petal?.features?.taskDrawer?.openTaskDrawer) {
          window.Petal.features.taskDrawer.openTaskDrawer(taskId);
        } else if (window.openTaskDrawer) {
          window.openTaskDrawer(taskId);
        }
      }
      return;
    }
    if (action === 'task:toggle-subtasks') {
      e.stopPropagation();
      const taskId = actionBtn.getAttribute('data-task-id');
      if (taskId && window.toggleTaskSubtaskSection) {
        window.toggleTaskSubtaskSection(taskId);
      }
      return;
    }
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
    
    // Task toggle (checkbox)
    if (action === 'task:toggle') {
      e.stopPropagation();
      const taskId = actionBtn.getAttribute('data-task-id') || actionBtn.getAttribute('data-id');
      if (taskId) {
        const state = window.Petal?.store?.getState() || {};
        const ctx = {
          tasks: state.tasks || [],
          projects: state.projects || [],
          save: window.Petal?.handlers?.save || (() => Promise.resolve()),
          render: window.Petal?.handlers?.render || (() => {})
        };
        if (window.Petal?.features?.taskOperations?.toggleTask) {
          window.Petal.features.taskOperations.toggleTask(ctx, taskId);
        } else if (window.Petal?.handlers?.toggleTask) {
          window.Petal.handlers.toggleTask(taskId);
        } else if (window.toggleTask) {
          window.toggleTask(taskId);
        }
      }
      return;
    }
    
    // Project actions
    if (action === 'open-project' || action === 'project:open') {
      e.stopPropagation();
      e.preventDefault();
      const projectId = actionBtn.getAttribute('data-project-id');
      console.log('🔘 Open project:', { projectId, hasFeatures: !!window.Petal?.features?.matrixOperations });
      if (projectId) {
        // Set selectedProjectId before calling openProjectView
        if (typeof window.selectedProjectId !== 'undefined') {
          window.selectedProjectId = projectId;
        }
        const state = window.Petal?.store?.getState() || {};
        const ctx = {
          tasks: state.tasks || [],
          projects: state.projects || [],
          selectedProjectId: projectId, // Add selectedProjectId to context
          save: window.Petal?.handlers?.save || (() => Promise.resolve()),
          render: window.Petal?.handlers?.render || (() => {})
        };
        if (window.Petal?.features?.matrixOperations?.openProjectView) {
          window.Petal.features.matrixOperations.openProjectView(ctx, projectId);
        } else if (window.openProjectView) {
          window.openProjectView(projectId);
        } else {
          console.warn('⚠️ openProjectView not available');
        }
      }
      return;
    }
    if (action === 'project:toggle-done') {
      e.stopPropagation();
      e.preventDefault();
      const projectId = actionBtn.getAttribute('data-project-id');
      console.log('🔘 Toggle project done:', { projectId, hasFeatures: !!window.Petal?.features?.projectOperations });
      if (projectId) {
        const state = window.Petal?.store?.getState() || {};
        const ctx = {
          tasks: state.tasks || [],
          projects: state.projects || [],
          save: window.Petal?.handlers?.save || (() => Promise.resolve()),
          render: window.Petal?.handlers?.render || (() => {})
        };
        if (window.Petal?.features?.projectOperations?.toggleProjectDone) {
          window.Petal.features.projectOperations.toggleProjectDone(ctx, projectId);
        } else if (window.toggleProjectDone) {
          window.toggleProjectDone(projectId);
        } else {
          console.warn('⚠️ toggleProjectDone not available');
        }
      }
      return;
    }
    if (action === 'project:delete') {
      e.stopPropagation();
      e.preventDefault();
      const projectId = actionBtn.getAttribute('data-project-id');
      if (projectId && window.confirm('Are you sure you want to delete this project?')) {
        const state = window.Petal?.store?.getState() || {};
        const ctx = {
          tasks: state.tasks || [],
          projects: state.projects || [],
          save: window.Petal?.handlers?.save || (() => Promise.resolve()),
          render: window.Petal?.handlers?.render || (() => {})
        };
        if (window.Petal?.features?.deleteHandlers?.delProject) {
          window.Petal.features.deleteHandlers.delProject(ctx, projectId);
        } else if (window.delProject) {
          window.delProject(projectId);
        }
      }
      return;
    }
    if (action === 'project:toggle-open') {
      e.stopPropagation();
      e.preventDefault();
      const projectId = actionBtn.getAttribute('data-project-id');
      if (projectId) {
        const state = window.Petal?.store?.getState() || {};
        const ctx = {
          tasks: state.tasks || [],
          projects: state.projects || [],
          save: window.Petal?.handlers?.save || (() => Promise.resolve()),
          render: window.Petal?.handlers?.render || (() => {})
        };
        if (window.Petal?.features?.projectOperations?.toggleProjectOpen) {
          window.Petal.features.projectOperations.toggleProjectOpen(ctx, projectId);
        } else if (window.toggleProjectOpen) {
          window.toggleProjectOpen(projectId);
        }
      }
      return;
    }
    if (action === 'project:clear-selection') {
      e.stopPropagation();
      e.preventDefault();
      const projectId = actionBtn.getAttribute('data-project-id');
      if (projectId && window.clearSelection) {
        window.clearSelection(projectId);
      }
      return;
    }
    
    // Project files tab switching
    if (action === 'project-files:switch-tab' || action === 'switch-project-files-tab') {
      e.stopPropagation();
      e.preventDefault();
      const tab = actionBtn.getAttribute('data-tab');
      console.log('🔘 Switching project files tab:', { action, tab, hasFunction: !!window.switchProjectFilesTab });
      if (tab && window.switchProjectFilesTab) {
        window.switchProjectFilesTab(tab);
      } else {
        console.warn('⚠️ switchProjectFilesTab not available');
      }
      return;
    }
    
    // Subtask actions
    if (action === 'subtask:toggle') {
      e.stopPropagation();
      const taskId = actionBtn.getAttribute('data-task-id');
      const subtaskId = actionBtn.getAttribute('data-subtask-id');
      if (taskId && subtaskId && window.toggleTaskSubtask) {
        window.toggleTaskSubtask(taskId, subtaskId);
      }
      return;
    }
    if (action === 'task:toggle-add-subtask') {
      e.stopPropagation();
      const taskId = actionBtn.getAttribute('data-task-id');
      if (taskId && window.toggleAddSubtaskToTask) {
        window.toggleAddSubtaskToTask(taskId);
      }
      return;
    }
    if (action === 'task:add-subtask-inline') {
      e.stopPropagation();
      e.preventDefault();
      const taskId = actionBtn.getAttribute('data-task-id');
      if (taskId && window.addSubtaskToTaskInline) {
        window.addSubtaskToTaskInline(taskId);
      }
      return;
    }
    if (action === 'subtask:move-up' || action === 'subtask:move-down') {
      e.stopPropagation();
      e.preventDefault();
      const taskId = actionBtn.getAttribute('data-task-id');
      const subtaskId = actionBtn.getAttribute('data-subtask-id');
      const order = parseInt(actionBtn.getAttribute('data-order') || '0');
      const direction = action === 'subtask:move-up' ? 'up' : 'down';
      if (taskId && subtaskId && window.moveTaskInSubtask) {
        window.moveTaskInSubtask(taskId, subtaskId, order, direction);
      }
      return;
    }
    if (action === 'subtask:add-task') {
      e.stopPropagation();
      e.preventDefault();
      const projectId = actionBtn.getAttribute('data-project-id');
      const subtaskId = actionBtn.getAttribute('data-subtask-id');
      if (projectId && subtaskId && window.addTaskToSubtask) {
        window.addTaskToSubtask(projectId, subtaskId);
      }
      return;
    }
    
    // File actions
    if (action === 'file:toggle-note') {
      e.stopPropagation();
      e.preventDefault();
      const fileId = actionBtn.getAttribute('data-file-id');
      if (fileId && window.toggleFileNote) {
        window.toggleFileNote(fileId, actionBtn);
      }
      return;
    }
    
    // Artifact actions
    if (action === 'artifact:open-detail') {
      e.stopPropagation();
      const artifactId = actionBtn.getAttribute('data-artifact-id');
      if (artifactId && window.openArtifactDetail) {
        window.openArtifactDetail(artifactId);
      }
      return;
    }
    
    // Protocol actions
    if (action === 'protocol:open-run-detail') {
      e.stopPropagation();
      const runId = actionBtn.getAttribute('data-run-id');
      if (runId && window.openProtocolRunDetail) {
        window.openProtocolRunDetail(runId);
      }
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
      console.log('🔘 cell-log:add-entry handler called');
      if (window.Petal?.pages?.cellLog?.addCellLogEntry) {
        console.log('✅ Calling addCellLogEntry');
        window.Petal.pages.cellLog.addCellLogEntry();
      } else if (window.Petal?.pages?.cellLog?.addEntry) {
        console.log('✅ Calling addEntry (fallback)');
        window.Petal.pages.cellLog.addEntry();
      } else {
        console.warn('⚠️ cell-log:add-entry: No handler available', {
          hasCellLog: !!window.Petal?.pages?.cellLog,
          cellLogKeys: window.Petal?.pages?.cellLog ? Object.keys(window.Petal.pages.cellLog) : []
        });
      }
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
    
    // Color picker actions
    if (action === 'color:select') {
      e.stopPropagation();
      const colorNum = parseInt(actionBtn.getAttribute('data-color'), 10);
      if (colorNum && window.Petal?.features?.projectOperations?.selectColor) {
        const ctx = window.Petal?.handlers?.createPageContext?.() || window.createPageContext?.() || {};
        window.Petal.features.projectOperations.selectColor(ctx, colorNum, actionBtn);
      } else if (colorNum && window.selectColor) {
        window.selectColor(colorNum, actionBtn);
      }
      return;
    }
    
    // Add project task
    if (action === 'add-project-task') {
      console.log('🔘 Add project task handler reached');
      e.stopPropagation();
      e.preventDefault();
      // Get projectId from button's data attribute first, then fallback to window.selectedProjectId
      const projectId = actionBtn.getAttribute('data-project-id') || window.selectedProjectId;
      console.log('🔘 Add project task:', { projectId, hasModalOps: !!window.Petal?.features?.modalOperations });
      if (!projectId) {
        alert('Please select a project first');
        return;
      }
      
      // Build context and call function with both ctx and projId
      const state = window.Petal?.store?.getState() || {};
      const ctx = {
        tasks: state.tasks || [],
        projects: state.projects || [],
        save: window.Petal?.handlers?.save || (() => Promise.resolve()),
        render: window.Petal?.handlers?.render || (() => {})
      };
      
      if (window.Petal?.features?.modalOperations?.openProjectAddTaskModal) {
        console.log('✅ Calling openProjectAddTaskModal with projectId:', projectId);
        window.Petal.features.modalOperations.openProjectAddTaskModal(ctx, projectId);
      } else if (window.openProjectAddTaskModal) {
        console.log('✅ Calling window.openProjectAddTaskModal with projectId:', projectId);
        // Try calling with context if function accepts it
        if (window.openProjectAddTaskModal.length === 2) {
          window.openProjectAddTaskModal(ctx, projectId);
        } else {
          // Fallback: set window.selectedProjectId and call with just projectId
          if (typeof window.selectedProjectId !== 'undefined') {
            window.selectedProjectId = projectId;
          }
          window.openProjectAddTaskModal(projectId);
        }
      } else {
        console.warn('⚠️ openProjectAddTaskModal not available');
      }
      return;
    }
    
    // Project actions
    if (action === 'project:add') {
      e.stopPropagation();
      if (window.Petal?.features?.projectOperations?.addProject) {
        const ctx = window.Petal?.handlers?.createPageContext?.() || window.createPageContext?.() || {};
        window.Petal.features.projectOperations.addProject(ctx);
      } else if (window.addProject) {
        window.addProject();
      }
      return;
    }
    if (action === 'project:filter') {
      e.stopPropagation();
      const filter = actionBtn.getAttribute('data-filter');
      if (filter && window.Petal?.handlers?.setProjFilter) {
        window.Petal.handlers.setProjFilter(filter, actionBtn);
      } else if (filter && window.setProjFilter) {
        window.setProjFilter(filter, actionBtn);
      }
      return;
    }
    if (action === 'project:matrix-back') {
      e.stopPropagation();
      if (window.Petal?.features?.projectOperations?.selectProjectForMatrix) {
        const ctx = window.Petal?.handlers?.createPageContext?.() || window.createPageContext?.() || {};
        window.Petal.features.projectOperations.selectProjectForMatrix(ctx, null);
      } else if (window.selectProjectForMatrix) {
        window.selectProjectForMatrix(null);
      }
      return;
    }
    
    // Review actions
    if (action === 'review:weekly') {
      e.stopPropagation();
      if (window.Petal?.features?.reviewOperations?.startWeeklyReview) {
        const ctx = window.Petal?.handlers?.createPageContext?.() || window.createPageContext?.() || {};
        window.Petal.features.reviewOperations.startWeeklyReview(ctx);
      } else if (window.startWeeklyReview) {
        window.startWeeklyReview();
      }
      return;
    }
    
    // Task actions
    if (action === 'task:add') {
      e.stopPropagation();
      e.preventDefault();
      // Call the global addTask function which handles the form submission
      if (typeof window.addTask === 'function') {
        window.addTask();
      } else if (window.Petal?.features?.taskOperations?.addTask) {
        const ctx = window.Petal?.handlers?.createPageContext?.() || window.createPageContext?.() || {};
        window.Petal.features.taskOperations.addTask(ctx);
      } else {
        console.warn('⚠️ task:add: No handler available');
      }
      return;
    }
    
    if (action === 'task:add-matrix') {
      e.stopPropagation();
      e.preventDefault();
      // Get projectId from button's data attribute, or fallback to window.selectedProjectId
      const projectId = actionBtn.getAttribute('data-project-id') || window.selectedProjectId;
      console.log('🔘 Add task to matrix:', { 
        projectId, 
        windowSelectedProjectId: window.selectedProjectId,
        hasModalOps: !!window.Petal?.features?.modalOperations 
      });
      
      if (!projectId) {
        console.warn('⚠️ No projectId available for task:add-matrix');
        alert('Please select a project first');
        return;
      }
      
      // Ensure window.selectedProjectId is set
      if (typeof window.selectedProjectId !== 'undefined') {
        window.selectedProjectId = projectId;
      }
      
      const state = window.Petal?.store?.getState() || {};
      const ctx = {
        tasks: state.tasks || [],
        projects: state.projects || [],
        selectedProjectId: projectId, // Ensure selectedProjectId is in context
        save: window.Petal?.handlers?.save || (() => Promise.resolve()),
        render: window.Petal?.handlers?.render || (() => {})
      };
      
      if (window.Petal?.features?.modalOperations?.openMatrixAddTaskModal) {
        console.log('✅ Calling openMatrixAddTaskModal with projectId:', projectId);
        window.Petal.features.modalOperations.openMatrixAddTaskModal(ctx);
      } else if (window.openMatrixAddTaskModal) {
        window.openMatrixAddTaskModal();
      } else {
        console.warn('⚠️ openMatrixAddTaskModal not available');
      }
      return;
    }
    
    // Log actions
    if (action === 'log:add-cell') {
      e.stopPropagation();
      const ctx = window.Petal?.handlers?.createPageContext?.() || window.createPageContext?.() || {};
      if (window.Petal?.features?.projectOperations?.openAddCellLogEntry) {
        window.Petal.features.projectOperations.openAddCellLogEntry(ctx);
      } else if (window.openAddCellLogEntry) {
        window.openAddCellLogEntry();
      } else {
        console.warn('⚠️ log:add-cell: No handler available');
      }
      return;
    }
  };
  
    // Attach handler to root container (capture phase to catch early)
    appContainer.addEventListener('click', window._eventDelegationHandler, true);
    
    console.log('✅ Event delegation set up');
  } finally {
    // Clear the guard flag
    window._eventDelegationSettingUp = false;
  }
}
