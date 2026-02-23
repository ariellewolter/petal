// ═══════════════════════ TASKS PAGE ═══════════════════════
// Tasks view page with event delegation
// Replaces inline onclick handlers with delegated events

import { renderTasks } from '../ui/renderTasks.js';
import { asIdString, normalizeProjectId } from '../utils/ids.js';
import { getAllTasks } from '../domain/models.js';

/**
 * Bind event handlers to the tasks container
 * Uses event delegation - only binds once (container-level flag)
 */
function bind(container, features) {
  if (container.__tasksPageBound) return;
  container.__tasksPageBound = true;
  
  // Click delegation for all task actions
  container.addEventListener('click', (e) => {
    // Find the closest element with data-action attribute
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    
    const action = btn.dataset.action;
    // Normalize IDs at UI boundary (prevents coercion bugs)
    const taskId = asIdString(btn.dataset.taskId || btn.dataset.id);
    const projectId = normalizeProjectId(btn.dataset.projectId);
    const isSubtask = btn.dataset.isSubtask === 'true';
    
    e.stopPropagation();
    
    // Handle different actions using data-action format: "namespace:action"
    // Examples: "task:add", "task:edit", "task:delete", "ui:toggle-form", etc.
    const [namespace, actionName] = action.includes(':') ? action.split(':') : [null, action];
    
    switch (namespace) {
      case 'task':
        switch (actionName) {
          case 'add':
            if (features?.taskOperations?.addTask) {
              features.taskOperations.addTask();
            } else if (window.addTask) {
              window.addTask();
            }
            break;
            
          case 'edit':
          case 'edit-task':
            if (!taskId) {
              console.warn('Edit action: no valid taskId found', btn);
              return;
            }
            if (features?.taskOperations?.editTask) {
              features.taskOperations.editTask(taskId); // Already normalized string
            } else if (window.Petal?.features?.taskOperations?.editTask) {
              window.Petal.features.taskOperations.editTask(taskId);
            } else {
              console.error('No editTask handler available');
            }
            break;
            
          case 'delete':
          case 'delete-task':
            if (!taskId) {
              console.warn('Delete action: no valid taskId found', btn);
              return;
            }
            // Guard: prevent double handling if another handler already processed this
            if (e.__petalDeleteHandled) {
              console.log('🛡️ Delete event already handled, skipping');
              return;
            }
            e.__petalDeleteHandled = true;
            e.preventDefault();
            
            // Use the taskOperations wrapper (like edit does)
            if (features?.taskOperations?.deleteTask) {
              features.taskOperations.deleteTask(taskId, isSubtask, projectId, null);
            } else if (features?.deleteHandlers?.confirmDeleteTask) {
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
              features.deleteHandlers.confirmDeleteTask(ctx, taskId, isSubtask, projectId, null);
            } else if (window.Petal?.features?.taskOperations?.deleteTask) {
              window.Petal.features.taskOperations.deleteTask(taskId, isSubtask, projectId, null);
            } else {
              console.error('❌ No delete handler available');
              alert('Delete functionality not available. Please check console for details.');
            }
            break;
            
          case 'toggle':
          case 'toggle-task':
            if (!taskId) {
              console.warn('Toggle action: no valid taskId found', btn);
              return;
            }
            if (features?.taskOperations?.toggleTask) {
              features.taskOperations.toggleTask(taskId); // Already normalized string
            } else if (window.Petal?.handlers?.toggleTask) {
              window.Petal.handlers.toggleTask(taskId);
            } else {
              console.error('No toggleTask handler available');
            }
            break;
            
          case 'open-drawer':
          case 'drawer':
            if (!taskId) {
              console.warn('Open drawer action: no valid taskId found', btn);
              return;
            }
            if (features?.taskDrawer?.openDrawer) {
              features.taskDrawer.openDrawer(taskId); // Already normalized string
            } else if (window.Petal?.features?.taskDrawer?.openTaskDrawer) {
              window.Petal.features.taskDrawer.openTaskDrawer(taskId);
            } else {
              console.error('No openDrawer handler available');
            }
            break;
        }
        break;
        
      case 'ui':
        switch (actionName) {
          case 'toggle-add-form':
            if (features?.handlers?.toggleAddTaskForm) {
              features.handlers.toggleAddTaskForm();
            } else if (window.toggleAddTaskForm) {
              window.toggleAddTaskForm();
            }
            break;
            
          case 'add-file':
            const containerId = btn.dataset.container || 'files-container';
            const prefix = btn.dataset.prefix || 't';
            if (features?.fileOperations?.addFileRow) {
              features.fileOperations.addFileRow(containerId, prefix);
            } else if (window.addFileRow) {
              window.addFileRow(containerId, prefix);
            }
            break;
            
          case 'clear-search':
            if (features?.handlers?.clearSearch) {
              features.handlers.clearSearch();
            } else if (window.clearSearch) {
              window.clearSearch();
            }
            break;
        }
        break;
        
      case 'sort':
        // Sort action: data-action="sort:all", data-action="sort:day", etc.
        if (features?.handlers?.setSort) {
          features.handlers.setSort(actionName, btn);
        } else if (window.setSort) {
          window.setSort(actionName, btn);
        }
        break;
        
      case 'filter':
        // Filter action: data-action="filter:all", data-action="filter:active", etc.
        if (features?.handlers?.setFilter) {
          features.handlers.setFilter(actionName, btn);
        } else if (window.setFilter) {
          window.setFilter(actionName, btn);
        }
        break;
        
      default:
        // Fallback: try to handle as legacy action name
        switch (action) {
          case 'edit-task':
          case 'edit':
            if (taskId && features?.taskOperations?.editTask) {
              features.taskOperations.editTask(taskId); // Already normalized
            }
            break;
            
          case 'delete':
          case 'delete-task':
            if (!taskId) break;
            if (e.__petalDeleteHandled) return;
            e.__petalDeleteHandled = true;
            e.preventDefault();
            
            if (features?.taskOperations?.deleteTask) {
              features.taskOperations.deleteTask(taskId, isSubtask, projectId, null);
            } else if (features?.deleteHandlers?.confirmDeleteTask) {
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
              features.deleteHandlers.confirmDeleteTask(ctx, taskId, isSubtask, projectId, null);
            }
            break;
            
          case 'toggle':
          case 'toggle-task':
            if (taskId && features?.taskOperations?.toggleTask) {
              features.taskOperations.toggleTask(taskId); // Already normalized
            }
            break;
            
          case 'open-drawer':
          case 'drawer':
            if (taskId && features?.taskDrawer?.openDrawer) {
              features.taskDrawer.openDrawer(taskId); // Already normalized
            }
            break;
            
          default:
            console.warn('Unknown task action:', action);
        }
    }
  });
  
  // Handle search input (use data attribute instead of global ID)
  const searchInput = container.querySelector('[data-search-input]') || container.querySelector('#search-input');
  if (searchInput && !searchInput.dataset.bound) {
    searchInput.dataset.bound = 'true';
    searchInput.addEventListener('input', (e) => {
      if (features?.handlers?.handleSearch) {
        features.handlers.handleSearch(e.target.value);
      } else if (window.handleSearch) {
        window.handleSearch(e.target.value);
      }
    });
    
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && features?.handlers?.clearSearch) {
        features.handlers.clearSearch();
      } else if (e.key === 'Escape' && window.clearSearch) {
        window.clearSearch();
      }
    });
  }
  
  // Handle search clear button (use data attribute instead of global ID)
  const searchClear = container.querySelector('[data-search-clear]') || container.querySelector('#search-clear');
  if (searchClear && !searchClear.dataset.bound) {
    searchClear.dataset.bound = 'true';
    searchClear.addEventListener('click', () => {
      if (features?.handlers?.clearSearch) {
        features.handlers.clearSearch();
      } else if (window.clearSearch) {
        window.clearSearch();
      }
    });
  }
  
  // Sort buttons, filter chips, and other toolbar elements are now handled
  // via data-action attributes in the main click delegation above
  // No need for separate event listeners - they'll be caught by the delegation
}

/**
 * Render Tasks page
 * @param {HTMLElement} container - Container element (#view-tasks)
 * @param {Object} state - Current app state
 * @param {Object} features - Features/handlers
 */
export async function renderTasksPage(container, state, features) {
  if (!container) {
    console.error('❌ renderTasksPage: Container not provided');
    return;
  }
  
  // Create or find header
  let tasksHeader = container.querySelector('.tasks-header');
  if (!tasksHeader) {
    tasksHeader = document.createElement('header');
    tasksHeader.className = 'tasks-header';
    // Insert at the very beginning of the container
    container.insertBefore(tasksHeader, container.firstChild);
  }
  
  // Calculate task stats
  const tasks = Array.isArray(state.tasks) ? state.tasks : [];
  const projects = Array.isArray(state.projects) ? state.projects : [];
  const allTasks = getAllTasks(tasks, projects);
  const activeTasks = allTasks.filter(t => t && !t.done && !t.deletedAt && !t.parentTaskId);
  const completedTasks = allTasks.filter(t => t && t.done && !t.deletedAt && !t.parentTaskId);
  
  // Render header
  tasksHeader.innerHTML = `
    <div class="tasks-header-title">
      <span class="tasks-header-name">Tasks</span>
    </div>
    <div class="tasks-header-right">
      <div style="display:flex;align-items:center;gap:6px">
        <span class="tasks-header-status">${activeTasks.length} active${activeTasks.length !== 1 ? '' : ''} · ${completedTasks.length} completed</span>
      </div>
    </div>
  `;
  
  // Bind event handlers (only once)
  bind(container, features);
  
  // Render using existing renderTasks function
  await renderTasks(container, state, features);
}

/**
 * Cleanup (optional - for when page is unmounted)
 */
export function cleanupTasksPage(container) {
  if (container) {
    container.__tasksPageBound = false;
  }
}
