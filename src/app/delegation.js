// ═══════════════════════ EVENT DELEGATION ═══════════════════════
// Set up event delegation on stable root container for all action buttons

import { handleEditTaskAction, handleDeleteTaskAction } from '../ui/buttonHandlers.js';
import { canEditPlannerEventById } from '../utils/ids.js';

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
    window._eventDelegationHandler = async function(e) {
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

    // Avoid duplicate handling: page-level modules already handle these actions.
    // Global delegation runs in capture phase, so without this guard we can fire twice.
    const inTasksView = !!actionBtn.closest('#view-tasks');
    if (inTasksView && /^(task:|ui:|sort:|filter:|edit-task|delete-task|delete|toggle-task|toggle|open-drawer|drawer)/.test(action)) {
      return;
    }
    const inFilesView = !!actionBtn.closest('#view-files');
    if (inFilesView && /^(file:|view:|add-file|addFileToRegistry)/.test(action)) {
      return;
    }
    const inTodayView = !!actionBtn.closest('#view-today');
    if (inTodayView && action === 'quick-add') {
      return;
    }
    const inSettingsView = !!actionBtn.closest('#view-settings');
    if (inSettingsView && /^(set-theme|open-vault-folder|choose-vault-folder|copy-from-vault-folder|refresh-vault-status|export-data|import-data|recover-data)$/.test(action)) {
      return;
    }
    
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
      
      const ctx = window.Petal?.handlers?.createPageContext?.() || window.createPageContext?.() || {};
      if (window.Petal?.features?.projectOperations?.addMilestone) {
        window.Petal.features.projectOperations.addMilestone(ctx);
      } else if (window.addMilestone) {
        window.addMilestone();
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
      e.preventDefault();
      e.stopPropagation();
      modalHandlers[action]();
      return;
    }
    
    // Generic modal handler (fallback for modal actions not in specific handlers)
    // Handle with namespace pattern: "modal:close", "modal:submit", etc.
    const [namespace, modalAction] = action.includes(':') ? action.split(':') : [null, action];
    
    if (namespace === 'modal') {
      e.preventDefault();
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
        const state = window.Petal?.store?.getState?.() || {};
        const drawerCtx = {
          tasks: Array.isArray(state.tasks) ? state.tasks : [],
          projects: Array.isArray(state.projects) ? state.projects : [],
          save: window.Petal?.handlers?.save || (() => Promise.resolve()),
          render: window.Petal?.handlers?.render || (() => {})
        };
        if (window.Petal?.features?.taskDrawer?.openTaskDrawer) {
          window.Petal.features.taskDrawer.openTaskDrawer(drawerCtx, taskId);
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
      e.preventDefault();
      e.stopPropagation();
      if (window.closeTaskDrawer) window.closeTaskDrawer();
      return;
    }
    if (action === 'task-drawer:switch-tab') {
      e.preventDefault();
      e.stopPropagation();
      const tab = actionBtn.getAttribute('data-tab');
      if (tab && window.switchTaskDrawerTab) window.switchTaskDrawerTab(tab);
      return;
    }
    if (action === 'task-drawer:add-log-entry') {
      e.preventDefault();
      e.stopPropagation();
      if (window.addTaskLogEntry) window.addTaskLogEntry();
      return;
    }
    if (action === 'task-drawer:save-protocol-entry') {
      e.preventDefault();
      e.stopPropagation();
      if (window.saveProtocolDailyEntry) window.saveProtocolDailyEntry();
      return;
    }
    if (action === 'task-drawer:link-file-protocol') {
      e.preventDefault();
      e.stopPropagation();
      if (window.linkFileToProtocolEntry) window.linkFileToProtocolEntry();
      return;
    }
    if (action === 'task-drawer:toggle-protocol-steps') {
      e.preventDefault();
      e.stopPropagation();
      if (window.toggleProtocolSteps) window.toggleProtocolSteps();
      return;
    }
    if (action === 'task-drawer:add-protocol-step') {
      e.preventDefault();
      e.stopPropagation();
      if (window.addProtocolStep) window.addProtocolStep();
      return;
    }
    if (action === 'task-drawer:link-existing-file') {
      e.preventDefault();
      e.stopPropagation();
      if (window.linkExistingFileToTask) window.linkExistingFileToTask();
      return;
    }
    if (action === 'task-drawer:add-new-file') {
      e.preventDefault();
      e.stopPropagation();
      if (window.addNewFileToTask) window.addNewFileToTask();
      return;
    }
    if (action === 'task-drawer:add-subtask') {
      e.preventDefault();
      e.stopPropagation();
      if (window.addSubtaskToTask) window.addSubtaskToTask();
      return;
    }

    if (action === 'task-drawer:delete-log-entry') {
      e.stopPropagation();
      const entryId = actionBtn.getAttribute('data-entry-id');
      const ctx = window.Petal?.handlers?.createPageContext?.() || window.createPageContext?.() || {};
      if (entryId && window.Petal?.features?.taskDrawer?.deleteTaskLogEntry) {
        await window.Petal.features.taskDrawer.deleteTaskLogEntry(ctx, entryId);
      } else if (entryId && window.deleteTaskLogEntry) {
        await window.deleteTaskLogEntry(entryId);
      }
      return;
    }

    if (action === 'task-drawer:unlink-file') {
      e.stopPropagation();
      const fileId = actionBtn.getAttribute('data-file-id');
      const ctx = window.Petal?.handlers?.createPageContext?.() || window.createPageContext?.() || {};
      if (fileId && window.Petal?.features?.taskDrawer?.unlinkFileFromTask) {
        await window.Petal.features.taskDrawer.unlinkFileFromTask(ctx, fileId);
      } else if (fileId && window.unlinkFileFromTask) {
        window.unlinkFileFromTask(fileId);
      }
      return;
    }
    
    // Task toggle (checkbox) — `toggle-task` is legacy markup; prefer `task:toggle`
    if (action === 'task:toggle' || action === 'toggle-task') {
      e.preventDefault();
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
    
    // Project files tab switching (expanded project card / files sidebar)
    if (action === 'project-files:switch-tab' || action === 'switch-project-files-tab') {
      e.stopPropagation();
      e.preventDefault();
      const tab = actionBtn.getAttribute('data-tab');
      const ctx = window.Petal?.handlers?.createPageContext?.() || window.createPageContext?.() || {};
      if (tab && window.Petal?.ui?.switchProjectFilesTab) {
        await window.Petal.ui.switchProjectFilesTab(ctx, tab);
      } else if (tab && window.switchProjectFilesTab) {
        await window.switchProjectFilesTab(tab);
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
    
    if (action === 'file:open' || action === 'open-file') {
      if (actionBtn.closest('#view-files')) {
        return;
      }
      e.stopPropagation();
      e.preventDefault();
      const path =
        actionBtn.getAttribute('data-path') ||
        actionBtn.getAttribute('data-file') ||
        actionBtn.closest('.file-open-btn, .file-chip, .file-open-div')?.getAttribute('data-path');
      if (path) {
        try {
          const fileLink = JSON.parse(path);
          const openFileFn =
            window.Petal?.features?.fileManagement?.openFile ||
            window.Petal?.handlers?.openFile ||
            window.openFile;
          if (openFileFn) {
            await openFileFn(fileLink);
          }
        } catch (err) {
          console.error('Error opening file:', err);
        }
      }
      return;
    }

    // File actions
    if (action === 'file:notes') {
      e.stopPropagation();
      e.preventDefault();
      const fileId = actionBtn.getAttribute('data-file-id');
      if (fileId && window.Petal?.features?.modalOperations?.openFileNotesModal) {
        window.Petal.features.modalOperations.openFileNotesModal(fileId);
      } else if (fileId && window.openFileNotesModal) {
        window.openFileNotesModal(fileId);
      }
      return;
    }
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
      const ctx = window.Petal?.handlers?.createPageContext?.() || window.createPageContext?.() || {};
      if (artifactId && window.Petal?.features?.projectOperations?.openArtifactDetail) {
        window.Petal.features.projectOperations.openArtifactDetail(ctx, artifactId);
      } else if (artifactId && window.openArtifactDetail) {
        window.openArtifactDetail(artifactId);
      }
      return;
    }
    
    // Protocol actions
    if (action === 'protocol:open-run-detail') {
      e.stopPropagation();
      const runId = actionBtn.getAttribute('data-run-id');
      const ctx = window.Petal?.handlers?.createPageContext?.() || window.createPageContext?.() || {};
      if (runId && window.Petal?.features?.projectOperations?.openProtocolRunDetail) {
        window.Petal.features.projectOperations.openProtocolRunDetail(ctx, runId);
      } else if (runId && window.openProtocolRunDetail) {
        window.openProtocolRunDetail(runId);
      }
      return;
    }
    
    // Workflow actions
    if (action === 'workflow:toggle-expand') {
      e.stopPropagation();
      const projectId = actionBtn.getAttribute('data-project-id');
      if (projectId != null && window.toggleWorkflowExpand) {
        window.toggleWorkflowExpand(projectId);
      }
      return;
    }
    if (action === 'workflow:toggle-timeline') {
      e.stopPropagation();
      const timelineId = actionBtn.getAttribute('data-timeline-id');
      if (timelineId && window.toggleTlExpand) {
        window.toggleTlExpand(timelineId);
      }
      return;
    }
    if (action === 'workflow:open-project') {
      e.stopPropagation();
      const projectId = actionBtn.getAttribute('data-project-id');
      if (projectId != null && window.Petal?.handlers?.openProject) {
        window.Petal.handlers.openProject(projectId);
      }
      return;
    }
    if (action === 'workflow:scroll-bottleneck') {
      e.stopPropagation();
      const bottleneckType = actionBtn.getAttribute('data-bottleneck-type');
      if (bottleneckType && window.scrollToBottleneck) {
        window.scrollToBottleneck(bottleneckType);
      }
      return;
    }
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
    if (action === 'workflow:export-list') {
      e.stopPropagation();
      if (window.exportWorkflowList) window.exportWorkflowList();
      return;
    }
    if (action === 'workflow:new-project') {
      e.stopPropagation();
      if (window.workflowNewProject) {
        window.workflowNewProject();
      } else if (window.routerSwitchView) {
        window.routerSwitchView('projects');
      }
      return;
    }
    if (action === 'workflow:toggle-sort') {
      e.stopPropagation();
      if (window.toggleWorkflowListSort) window.toggleWorkflowListSort();
      return;
    }
    if (action === 'workflow:toggle-group') {
      e.stopPropagation();
      if (window.toggleWorkflowListGroup) window.toggleWorkflowListGroup();
      return;
    }
    
    // Planner actions
    if (action === 'planner:nav') {
      e.preventDefault();
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
      e.preventDefault();
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
      e.preventDefault();
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
      e.preventDefault();
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

    if (action === 'today:open-event') {
      e.stopPropagation();
      e.preventDefault();
      const eventId = actionBtn.getAttribute('data-event-id');
      const events = window.Petal?.store?.getState()?.events || [];
      if (canEditPlannerEventById(eventId, events)) {
        if (window.Petal?.features?.plannerOperations?.editEvent) {
          const ctx = window.Petal?.handlers?.createPageContext?.() || {};
          window.Petal.features.plannerOperations.editEvent(ctx, eventId);
          return;
        }
        if (typeof window.editEvent === 'function') {
          window.editEvent(eventId);
          return;
        }
      }
      if (window.routerSwitchView) {
        window.routerSwitchView('planner');
      } else if (window.switchView) {
        window.switchView('planner');
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
    if (action === 'cell-log:set-tab') {
      e.stopPropagation();
      const tab = actionBtn.getAttribute('data-tab');
      if (tab != null && window.Petal?.pages?.cellLog?.setCellLogTab) {
        window.Petal.pages.cellLog.setCellLogTab(tab);
      }
      return;
    }
    if (action === 'cell-log:remove-cell-type') {
      e.stopPropagation();
      const cellType = actionBtn.getAttribute('data-cell-type');
      if (cellType && window.Petal?.pages?.cellLog?.removeCellType) {
        window.Petal.pages.cellLog.removeCellType(cellType);
      }
      return;
    }
    if (action === 'cell-log:remove-media-type') {
      e.stopPropagation();
      const mediaType = actionBtn.getAttribute('data-media-type');
      if (mediaType && window.Petal?.pages?.cellLog?.removeMediaType) {
        window.Petal.pages.cellLog.removeMediaType(mediaType);
      }
      return;
    }
    if (action === 'cell-log:edit-entry') {
      e.stopPropagation();
      const entryId = actionBtn.getAttribute('data-entry-id');
      if (entryId && window.Petal?.pages?.cellLog?.editEntry) {
        window.Petal.pages.cellLog.editEntry(entryId);
      }
      return;
    }
    if (action === 'cell-log:delete-entry') {
      e.stopPropagation();
      const entryId = actionBtn.getAttribute('data-entry-id');
      if (entryId && window.confirm('Delete this cell log entry?')) {
        if (window.Petal?.pages?.cellLog?.deleteEntry) {
          window.Petal.pages.cellLog.deleteEntry(entryId);
        }
      }
      return;
    }
    if (action === 'cell-log:open-entry') {
      e.stopPropagation();
      const entryId = actionBtn.getAttribute('data-entry-id');
      if (entryId && window.Petal?.pages?.cellLog?.openCellLogEntry) {
        await window.Petal.pages.cellLog.openCellLogEntry(
          entryId,
          window.Petal?.handlers
        );
      }
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
      e.stopPropagation();
      e.preventDefault();
      const projectId = actionBtn.getAttribute('data-project-id') || window.selectedProjectId;
      if (!projectId) {
        alert('Please select a project first');
        return;
      }

      const state = window.Petal?.store?.getState() || {};
      const ctx = {
        tasks: state.tasks || [],
        projects: state.projects || [],
        save: window.Petal?.handlers?.save || (() => Promise.resolve()),
        render: window.Petal?.handlers?.render || (() => {})
      };

      if (window.Petal?.features?.modalOperations?.openProjectAddTaskModal) {
        window.Petal.features.modalOperations.openProjectAddTaskModal(ctx, projectId);
      } else if (window.openProjectAddTaskModal) {
        if (window.openProjectAddTaskModal.length === 2) {
          window.openProjectAddTaskModal(ctx, projectId);
        } else {
          if (typeof window.selectedProjectId !== 'undefined') {
            window.selectedProjectId = projectId;
          }
          window.openProjectAddTaskModal(projectId);
        }
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
      if (window.Petal?.features?.matrixOperations?.selectProjectForMatrix) {
        const ctx = window.Petal?.handlers?.createPageContext?.() || window.createPageContext?.() || {};
        window.Petal.features.matrixOperations.selectProjectForMatrix(ctx, null);
      } else if (window.selectProjectForMatrix) {
        window.selectProjectForMatrix(null);
      }
      return;
    }

    if (action === 'project:switch-tab') {
      e.stopPropagation();
      const tab = actionBtn.getAttribute('data-tab');
      const ctx = window.Petal?.handlers?.createPageContext?.() || window.createPageContext?.() || {};
      if (tab && window.Petal?.features?.projectOperations?.switchProjectPageTab) {
        window.Petal.features.projectOperations.switchProjectPageTab(ctx, tab);
      } else if (tab && window.switchProjectPageTab) {
        window.switchProjectPageTab(tab);
      }
      return;
    }

    if (action === 'project:add-log-entry') {
      e.stopPropagation();
      const ctx = window.Petal?.handlers?.createPageContext?.() || window.createPageContext?.() || {};
      if (window.Petal?.features?.projectOperations?.addWorkingLogEntry) {
        window.Petal.features.projectOperations.addWorkingLogEntry(ctx);
      } else if (window.addWorkingLogEntry) {
        window.addWorkingLogEntry();
      }
      return;
    }

    if (action === 'project:create-artifact') {
      e.stopPropagation();
      const ctx = window.Petal?.handlers?.createPageContext?.() || window.createPageContext?.() || {};
      if (window.Petal?.features?.projectOperations?.openCreateArtifactModal) {
        window.Petal.features.projectOperations.openCreateArtifactModal(ctx);
      } else if (window.openCreateArtifactModal) {
        window.openCreateArtifactModal();
      }
      return;
    }

    if (action === 'project:create-protocol-run') {
      e.stopPropagation();
      const ctx = window.Petal?.handlers?.createPageContext?.() || window.createPageContext?.() || {};
      if (window.Petal?.features?.projectOperations?.openCreateProtocolRunModal) {
        window.Petal.features.projectOperations.openCreateProtocolRunModal(ctx);
      } else if (window.openCreateProtocolRunModal) {
        window.openCreateProtocolRunModal();
      }
      return;
    }

    if (action === 'artifact:close') {
      e.stopPropagation();
      if (window.Petal?.features?.projectOperations?.closeArtifactDetail) {
        window.Petal.features.projectOperations.closeArtifactDetail();
      } else if (window.closeArtifactDetail) {
        window.closeArtifactDetail();
      }
      return;
    }

    if (action === 'artifact:add-file') {
      e.stopPropagation();
      const artifactId = actionBtn.getAttribute('data-artifact-id');
      const ctx = window.Petal?.handlers?.createPageContext?.() || window.createPageContext?.() || {};
      const id = artifactId && !Number.isNaN(Number(artifactId)) ? Number(artifactId) : artifactId;
      if (id != null && window.Petal?.features?.projectOperations?.addFileToArtifact) {
        await window.Petal.features.projectOperations.addFileToArtifact(ctx, id);
      } else if (id != null && window.addFileToArtifact) {
        window.addFileToArtifact(id);
      }
      return;
    }

    if (action === 'artifact:save-notes') {
      e.stopPropagation();
      const artifactId = actionBtn.getAttribute('data-artifact-id');
      const ctx = window.Petal?.handlers?.createPageContext?.() || window.createPageContext?.() || {};
      const id = artifactId && !Number.isNaN(Number(artifactId)) ? Number(artifactId) : artifactId;
      if (id != null && window.Petal?.features?.projectOperations?.saveArtifactNotes) {
        await window.Petal.features.projectOperations.saveArtifactNotes(ctx, id);
      } else if (id != null && window.saveArtifactNotes) {
        window.saveArtifactNotes(id);
      }
      return;
    }

    if (action === 'artifact:edit-file-notes') {
      e.stopPropagation();
      const fileId = actionBtn.getAttribute('data-file-id');
      const ctx = window.Petal?.handlers?.createPageContext?.() || window.createPageContext?.() || {};
      if (fileId && window.Petal?.features?.projectOperations?.editFileNotes) {
        await window.Petal.features.projectOperations.editFileNotes(ctx, fileId);
      } else if (fileId && window.editFileNotes) {
        window.editFileNotes(fileId);
      }
      return;
    }

    if (action === 'protocol:close') {
      e.stopPropagation();
      if (window.Petal?.features?.projectOperations?.closeProtocolRunDetail) {
        window.Petal.features.projectOperations.closeProtocolRunDetail();
      } else if (window.closeProtocolRunDetail) {
        window.closeProtocolRunDetail();
      }
      return;
    }

    if (action === 'protocol:add-log-entry') {
      e.stopPropagation();
      const runId = actionBtn.getAttribute('data-run-id');
      const ctx = window.Petal?.handlers?.createPageContext?.() || window.createPageContext?.() || {};
      const id = runId && !Number.isNaN(Number(runId)) ? Number(runId) : runId;
      if (id != null && window.Petal?.features?.projectOperations?.addProtocolRunLogEntry) {
        await window.Petal.features.projectOperations.addProtocolRunLogEntry(ctx, id);
      } else if (id != null && window.addProtocolRunLogEntry) {
        window.addProtocolRunLogEntry(id);
      }
      return;
    }

    if (action === 'protocol:open-linked-artifact') {
      e.stopPropagation();
      const artifactId = actionBtn.getAttribute('data-artifact-id');
      const ctx = window.Petal?.handlers?.createPageContext?.() || window.createPageContext?.() || {};
      const id = artifactId && !Number.isNaN(Number(artifactId)) ? Number(artifactId) : artifactId;
      if (window.Petal?.features?.projectOperations?.closeProtocolRunDetail) {
        window.Petal.features.projectOperations.closeProtocolRunDetail();
      } else if (window.closeProtocolRunDetail) {
        window.closeProtocolRunDetail();
      }
      if (id != null && window.Petal?.features?.projectOperations?.openArtifactDetail) {
        window.Petal.features.projectOperations.openArtifactDetail(ctx, id);
      } else if (id != null && window.openArtifactDetail) {
        window.openArtifactDetail(id);
      }
      return;
    }

    if (action === 'milestone:delete') {
      e.stopPropagation();
      const projectId = actionBtn.getAttribute('data-project-id');
      const milestoneId = actionBtn.getAttribute('data-milestone-id');
      const ctx = window.Petal?.handlers?.createPageContext?.() || window.createPageContext?.() || {};
      if (projectId && milestoneId && window.Petal?.features?.projectOperations?.deleteMilestone) {
        await window.Petal.features.projectOperations.deleteMilestone(ctx, projectId, milestoneId);
      } else if (projectId && milestoneId && window.deleteMilestone) {
        window.deleteMilestone(projectId, milestoneId);
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
        await window.Petal.features.projectOperations.openAddCellLogEntry(ctx);
      } else if (window.openAddCellLogEntry) {
        await window.openAddCellLogEntry();
      } else {
        console.warn('⚠️ log:add-cell: No handler available');
      }
      return;
    }

    if (action === 'cell-log:link-cell-line') {
      e.stopPropagation();
      e.preventDefault();
      const projectId = actionBtn.getAttribute('data-project-id');
      if (!projectId) return;
      const selectEl = document.querySelector(`[data-cell-line-select="${projectId}"]`);
      const cellLine = selectEl?.value?.trim();
      if (cellLine && window.Petal?.features?.projectOperations?.addCellLineToProject) {
        await window.Petal.features.projectOperations.addCellLineToProject(projectId);
        return;
      }
      const state = window.Petal?.store?.getState() || {};
      const baseCtx = window.Petal?.handlers?.createPageContext?.() || {};
      const ctx = {
        ...baseCtx,
        tasks: state.tasks || [],
        projects: state.projects || [],
        save: window.Petal?.handlers?.save || (() => Promise.resolve()),
        render: window.Petal?.handlers?.render || (() => {})
      };
      if (window.Petal?.features?.projectOperations?.openLinkCellLineModal) {
        window.Petal.features.projectOperations.openLinkCellLineModal(ctx, projectId);
      }
      return;
    }

    if (action === 'cell-log:unlink-cell-line') {
      e.stopPropagation();
      const projectId = actionBtn.getAttribute('data-project-id');
      const cellLine = actionBtn.getAttribute('data-cell-line');
      if (projectId && cellLine != null) {
        const state = window.Petal?.store?.getState() || {};
        const ctx = {
          tasks: state.tasks || [],
          projects: state.projects || [],
          save: window.Petal?.handlers?.save || (() => Promise.resolve()),
          render: window.Petal?.handlers?.render || (() => {})
        };
        if (window.Petal?.features?.projectOperations?.unlinkCellLineFromProject) {
          await window.Petal.features.projectOperations.unlinkCellLineFromProject(ctx, projectId, cellLine);
        } else if (window.Petal?.features?.projectOperations?.removeCellLineFromProject) {
          await window.Petal.features.projectOperations.removeCellLineFromProject(projectId, cellLine);
        }
      }
      return;
    }

    // Planner habits & routines (sidebar)
    if (action === 'planner:add-habit') {
      e.stopPropagation();
      if (window.Petal?.features?.plannerOperations?.openAddHabitModal) {
        window.Petal.features.plannerOperations.openAddHabitModal();
      } else if (typeof window.openAddHabitModal === 'function') {
        window.openAddHabitModal();
      }
      return;
    }
    if (action === 'planner:toggle-habit') {
      e.stopPropagation();
      const habitId = actionBtn.getAttribute('data-habit-id');
      const dateStr = actionBtn.getAttribute('data-date');
      if (habitId && window.Petal?.features?.habits?.toggleHabit) {
        window.Petal.features.habits.toggleHabit(habitId, dateStr ? new Date(dateStr) : new Date());
        if (typeof window.buildPlannerSidebar === 'function') window.buildPlannerSidebar();
      }
      return;
    }
    if (action === 'planner:delete-habit') {
      e.stopPropagation();
      const habitId = actionBtn.getAttribute('data-habit-id');
      if (habitId && confirm('Delete this habit?') && window.Petal?.features?.habits?.archiveHabit) {
        window.Petal.features.habits.archiveHabit(habitId);
        if (typeof window.buildPlannerSidebar === 'function') window.buildPlannerSidebar();
      }
      return;
    }
    if (action === 'planner:add-routine') {
      e.stopPropagation();
      if (window.Petal?.features?.plannerOperations?.openAddRoutineModal) {
        window.Petal.features.plannerOperations.openAddRoutineModal();
      } else if (typeof window.openAddRoutineModal === 'function') {
        window.openAddRoutineModal();
      }
      return;
    }
    if (action === 'planner:toggle-routine') {
      e.stopPropagation();
      const routineId = actionBtn.getAttribute('data-routine-id');
      const dateStr = actionBtn.getAttribute('data-date');
      if (routineId && window.Petal?.features?.routines?.toggleRoutine) {
        window.Petal.features.routines.toggleRoutine(routineId, dateStr ? new Date(dateStr) : new Date());
        if (typeof window.buildPlannerSidebar === 'function') window.buildPlannerSidebar();
      }
      return;
    }
    if (action === 'planner:delete-routine') {
      e.stopPropagation();
      const routineId = actionBtn.getAttribute('data-routine-id');
      if (routineId && confirm('Delete this routine?') && window.Petal?.features?.routines?.archiveRoutine) {
        window.Petal.features.routines.archiveRoutine(routineId);
        if (typeof window.buildPlannerSidebar === 'function') window.buildPlannerSidebar();
      }
      return;
    }
  };
  
    // Attach handler to root container (capture phase to catch early)
    appContainer.addEventListener('click', window._eventDelegationHandler, true);

    if (window._eventDelegationChangeHandler) {
      appContainer.removeEventListener('change', window._eventDelegationChangeHandler, true);
    }
    window._eventDelegationChangeHandler = async function(e) {
      const target = e.target.closest?.('[data-action="milestone:toggle"]');
      if (!target) return;

      e.stopPropagation();
      const projectId = target.getAttribute('data-project-id');
      const milestoneId = target.getAttribute('data-milestone-id');
      const ctx = window.Petal?.handlers?.createPageContext?.() || window.createPageContext?.() || {};
      if (projectId && milestoneId && window.Petal?.features?.projectOperations?.toggleMilestone) {
        await window.Petal.features.projectOperations.toggleMilestone(ctx, projectId, milestoneId);
      } else if (projectId && milestoneId && window.toggleMilestone) {
        await window.toggleMilestone(projectId, milestoneId);
      }
    };
    appContainer.addEventListener('change', window._eventDelegationChangeHandler, true);
    
    console.log('✅ Event delegation set up');
  } finally {
    // Clear the guard flag
    window._eventDelegationSettingUp = false;
  }
}
