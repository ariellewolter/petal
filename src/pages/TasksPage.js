// ═══════════════════════ TASKS PAGE ═══════════════════════
// Tasks view page with event delegation
// Replaces inline onclick handlers with delegated events

import { renderTasks } from '../ui/renderTasks.js';
import { asIdString, normalizeProjectId } from '../utils/ids.js';
import { getAllTasks } from '../domain/models.js';
import { PageHeader, StatCard } from '../ui/components.js';

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
      case 'workflow':
        switch (actionName) {
          case 'view-lane':
            const laneName = btn.dataset.lane;
            if (laneName && features?.workflowTaskOperations?.viewLaneTasks) {
              const ctx = {
                tasks: window.Petal?.store?.getState()?.tasks || [],
                projects: window.Petal?.store?.getState()?.projects || [],
                save: window.Petal?.handlers?.save || window.save,
              };
              features.workflowTaskOperations.viewLaneTasks(laneName, ctx);
            } else if (laneName && window.Petal?.features?.workflowTaskOperations?.viewLaneTasks) {
              const ctx = {
                tasks: window.Petal?.store?.getState()?.tasks || [],
                projects: window.Petal?.store?.getState()?.projects || [],
                save: window.Petal?.handlers?.save || window.save,
              };
              window.Petal.features.workflowTaskOperations.viewLaneTasks(laneName, ctx);
            }
            break;
        }
        break;
        
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
            const editCtx = window.Petal?.handlers?.createPageContext?.() || { tasks: [], projects: [] };
            if (features?.taskOperations?.editTask) {
              features.taskOperations.editTask(editCtx, String(taskId));
            } else if (window.Petal?.features?.taskOperations?.editTask) {
              window.Petal.features.taskOperations.editTask(editCtx, String(taskId));
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
          case 'open-drawer-files':
            if (!taskId) {
              console.warn('Open drawer action: no valid taskId found', btn);
              return;
            }
            if (btn.dataset.tab === 'files') {
              window.openTaskDrawerToTab = 'files';
            }
            const state = window.Petal?.store?.getState?.() || {};
            const drawerCtx = {
              tasks: state.tasks || [],
              projects: state.projects || [],
              save: features?.handlers?.save || window.Petal?.handlers?.save || (() => Promise.resolve()),
              render: features?.handlers?.render || window.Petal?.handlers?.render || (() => {})
            };
            if (features?.taskDrawer?.openDrawer) {
              features.taskDrawer.openDrawer(taskId);
            } else if (window.Petal?.features?.taskDrawer?.openTaskDrawer) {
              window.Petal.features.taskDrawer.openTaskDrawer(drawerCtx, taskId);
            } else if (window.openTaskDrawer) {
              window.openTaskDrawer(drawerCtx, taskId);
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
        } else if (features?.setSort) {
          features.setSort(actionName, btn);
        } else if (window.setSort) {
          window.setSort(actionName, btn);
        }
        break;
        
      case 'filter':
        // Filter action: data-action="filter:all", data-action="filter:active", etc.
        if (features?.handlers?.setFilter) {
          features.handlers.setFilter(actionName, btn);
        } else if (features?.setFilter) {
          features.setFilter(actionName, btn);
        } else if (window.setFilter) {
          window.setFilter(actionName, btn);
        }
        break;
        
      default:
        // Fallback: try to handle as legacy action name
        switch (action) {
          case 'edit-task':
          case 'edit':
            if (taskId) {
              const editCtx2 = window.Petal?.handlers?.createPageContext?.() || { tasks: [], projects: [] };
              if (features?.taskOperations?.editTask) {
                features.taskOperations.editTask(editCtx2, String(taskId));
              }
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
  
  // Calculate task stats
  const tasks = Array.isArray(state.tasks) ? state.tasks : [];
  const projects = Array.isArray(state.projects) ? state.projects : [];
  const allTasks = getAllTasks(tasks, projects);
  const activeTasks = allTasks.filter(t => t && !t.done && !t.deletedAt && !t.parentTaskId);
  const completedTasks = allTasks.filter(t => t && t.done && !t.deletedAt && !t.parentTaskId);
  const overdueTasks = activeTasks.filter(t => {
    if (!t.due) return false;
    const dueDate = new Date(t.due);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return dueDate < today;
  });
  const subtasks = allTasks.filter(t => t && t.parentTaskId && !t.deletedAt);
  
  // Preserve add-task form and task-container (so "＋ Choose new file" and other buttons keep working).
  // Only insert header and stats if not already present; never wipe the container.
  let header = container.querySelector('.page-header');
  if (!header) {
    header = document.createElement('header');
    header.className = 'page-header';
    header.innerHTML = PageHeader({
      title: 'Tasks',
      icon: '⊡',
      status: `${activeTasks.length} active · ${completedTasks.length} completed`,
      actions: [
        {
          type: 'primary',
          text: '+ Add Task',
          action: 'ui:toggle-add-form'
        }
      ]
    });
    container.insertBefore(header, container.firstChild);
  }
  let statsContainer = container.querySelector('.tasks-stats-container');
  if (!statsContainer) {
    statsContainer = document.createElement('div');
    statsContainer.className = 'tasks-stats-container';
    statsContainer.style.cssText = 'display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; padding: 20px 28px; background: var(--surface);';
    statsContainer.innerHTML = `
    ${StatCard({ 
      label: 'Active', 
      value: String(activeTasks.length), 
      subtitle: 'tasks',
      variant: 1 
    })}
    ${StatCard({ 
      label: 'Completed', 
      value: String(completedTasks.length), 
      subtitle: 'tasks',
      variant: 2 
    })}
    ${StatCard({ 
      label: 'Overdue', 
      value: String(overdueTasks.length), 
      subtitle: 'tasks',
      variant: 3 
    })}
    ${StatCard({ 
      label: 'Subtasks', 
      value: String(subtasks.length), 
      subtitle: 'total',
      variant: 4 
    })}
  `;
    container.insertBefore(statsContainer, header.nextSibling);
  } else {
    // Refresh stats numbers
    statsContainer.innerHTML = `
    ${StatCard({ label: 'Active', value: String(activeTasks.length), subtitle: 'tasks', variant: 1 })}
    ${StatCard({ label: 'Completed', value: String(completedTasks.length), subtitle: 'tasks', variant: 2 })}
    ${StatCard({ label: 'Overdue', value: String(overdueTasks.length), subtitle: 'tasks', variant: 3 })}
    ${StatCard({ label: 'Subtasks', value: String(subtasks.length), subtitle: 'total', variant: 4 })}
  `;
  }
  
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
