// ═══════════════════════ FILES PAGE ═══════════════════════
// Files view page with event delegation
// Replaces inline onclick handlers with delegated events

import { renderFiles } from '../ui/renderFiles.js';
import { PageHeader, Buttons, StatCard, Tabs, EmptyState } from '../ui/components.js';

let bound = false;

/**
 * Calculate file statistics
 * @param {Array} files - Array of file objects
 * @param {Object} fileHistory - File history object
 * @param {Array} tasks - Array of tasks
 * @param {Array} projects - Array of projects
 * @returns {Object} Stats object with total, active, missing, stale counts
 */
function calculateFileStats(files, fileHistory = {}, tasks = [], projects = []) {
  const total = files.length;
  let active = 0;
  let missing = 0;
  let stale = 0;
  
  const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
  
  files.forEach(file => {
    const fileLink = file.fileLink || file;
    const fileKey = file.key || fileLink.onedrive_rel || fileLink.abs_path || fileLink.share_url || '';
    const history = fileHistory[fileKey] || {};
    
    // Check if missing
    const isMissing = file.exists === false || file.isMissing === true || history.exists === false;
    if (isMissing) {
      missing++;
    }
    
    // Check if active (linked to active tasks/projects)
    const hasActiveTasks = (file.tasks || []).some(t => {
      const task = tasks.find(tt => (tt.id || tt.title) === (t.id || t.title || t));
      return task && !task.done && (t.status === 'Doing' || task.status === 'Doing');
    });
    const hasActiveProjects = (file.projects || []).some(p => {
      const project = projects.find(pp => (pp.id || pp.name) === (p.id || p.name || p));
      return project && !project.done;
    });
    
    if (hasActiveTasks || hasActiveProjects) {
      active++;
      
      // Check if stale (not modified in 30+ days but linked to active work)
      const lastMod = history.lastModified;
      if (lastMod && lastMod < thirtyDaysAgo) {
        stale++;
      }
    }
  });
  
  return { total, active, missing, stale };
}

/**
 * Bind event handlers to the files container
 * Uses event delegation - only binds once
 */
function bind(container, features) {
  if (bound) return;
  bound = true;
  
  // Click delegation for all file actions
  container.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    
    const action = btn.dataset.action;
    e.stopPropagation();
    
    // Handle different actions using data-action format
    const [namespace, actionName] = action.includes(':') ? action.split(':') : [null, action];
    
    switch (namespace) {
      case 'file':
        switch (actionName) {
          case 'add':
          case 'add-to-registry':
            if (features?.fileManagement?.addFileToRegistry) {
              features.fileManagement.addFileToRegistry();
            } else if (window.addFileToRegistry) {
              window.addFileToRegistry();
            }
            break;
            
          case 'open':
            const filePath = btn.dataset.path;
            if (filePath) {
              try {
                const fileLink = JSON.parse(filePath);
                // Use the openFile function from fileManagement (which is re-exported from fileHelpers)
                // This ensures consistent file opening behavior across the app
                const openFileFn = features?.fileManagement?.openFile || 
                                  window.Petal?.features?.fileManagement?.openFile ||
                                  window.openFile;
                
                if (openFileFn && typeof openFileFn === 'function') {
                  openFileFn(fileLink);
                } else {
                  console.error('❌ openFile function not available', {
                    hasFeatures: !!features,
                    hasFileManagement: !!features?.fileManagement,
                    hasOpenFile: !!features?.fileManagement?.openFile,
                    hasWindowPetal: !!window.Petal,
                    hasWindowOpenFile: !!window.openFile
                  });
                  // Last resort: try to import and use directly
                  import('../utils/fileHelpers.js').then(module => {
                    if (module.openFile) {
                      module.openFile(fileLink);
                    } else {
                      alert('Could not open file: openFile function not available');
                    }
                  }).catch(err => {
                    console.error('Failed to import fileHelpers:', err);
                    alert('Could not open file: ' + (err.message || 'Unknown error'));
                  });
                }
              } catch (e) {
                console.error('Error parsing file path:', e);
                alert('Error opening file: ' + (e.message || 'Invalid file data'));
              }
            }
            break;
            
          case 'show-relations':
            const fileKey = btn.dataset.fileKey;
            if (fileKey && features?.fileManagement?.showFileRelations) {
              features.fileManagement.showFileRelations(fileKey);
            } else if (fileKey && window.Petal?.features?.fileManagement?.showFileRelations) {
              window.Petal.features.fileManagement.showFileRelations(fileKey);
            }
            break;
            
          case 'show-tasks':
            const tasksFileKey = btn.dataset.fileKey;
            if (tasksFileKey && features?.fileManagement?.showFileLinkedTasks) {
              features.fileManagement.showFileLinkedTasks(tasksFileKey, {
                navigate: true,
                view: 'tasks'
              });
            } else if (tasksFileKey && window.Petal?.features?.fileManagement?.showFileLinkedTasks) {
              window.Petal.features.fileManagement.showFileLinkedTasks(tasksFileKey, {
                navigate: true,
                view: 'tasks'
              });
            }
            break;
            
          case 'show-projects':
            const projectsFileKey = btn.dataset.fileKey;
            if (projectsFileKey && features?.fileManagement?.showFileLinkedProjects) {
              features.fileManagement.showFileLinkedProjects(projectsFileKey, {
                navigate: true,
                view: 'projects'
              });
            } else if (projectsFileKey && window.Petal?.features?.fileManagement?.showFileLinkedProjects) {
              window.Petal.features.fileManagement.showFileLinkedProjects(projectsFileKey, {
                navigate: true,
                view: 'projects'
              });
            }
            break;
            
          case 'locate':
            const locateFileKey = btn.dataset.fileKey;
            const locateFilePath = btn.dataset.path;
            if (locateFileKey && features?.fileManagement?.locateFile) {
              features.fileManagement.locateFile(locateFileKey, locateFilePath ? JSON.parse(locateFilePath) : null);
            } else if (locateFileKey && window.Petal?.features?.fileManagement?.locateFile) {
              window.Petal.features.fileManagement.locateFile(locateFileKey, locateFilePath ? JSON.parse(locateFilePath) : null);
            }
            break;
            
          case 'notes':
          case 'open-notes':
            const fileId = btn.dataset.fileId;
            if (fileId && features?.fileManagement?.openFileNotesModal) {
              features.fileManagement.openFileNotesModal(fileId);
            } else if (fileId && window.openFileNotesModal) {
              window.openFileNotesModal(fileId);
            }
            break;
            
          case 'hook':
            const hookFileKey = btn.dataset.fileKey;
            const hookFilePath = btn.dataset.path;
            if (hookFileKey && hookFilePath) {
              try {
                const fileLink = JSON.parse(hookFilePath);
                // Get context for the hook function
                const ctx = features?.handlers?.createPageContext?.() || 
                           window.Petal?.handlers?.createPageContext?.() || 
                           {};
                
                if (features?.fileManagement?.hookFileToTaskOrProject) {
                  features.fileManagement.hookFileToTaskOrProject(hookFileKey, fileLink, ctx);
                } else if (window.Petal?.features?.fileManagement?.hookFileToTaskOrProject) {
                  window.Petal.features.fileManagement.hookFileToTaskOrProject(hookFileKey, fileLink, ctx);
                } else {
                  // Fallback: import and use directly
                  import('../features/fileManagement.js').then(module => {
                    if (module.hookFileToTaskOrProject) {
                      module.hookFileToTaskOrProject(hookFileKey, fileLink, ctx);
                    } else {
                      alert('Hook function not available');
                    }
                  }).catch(err => {
                    console.error('Failed to import fileManagement:', err);
                    alert('Could not hook file: ' + (err.message || 'Unknown error'));
                  });
                }
              } catch (e) {
                console.error('Error parsing file path:', e);
                alert('Error hooking file: ' + (e.message || 'Invalid file data'));
              }
            }
            break;
            
          case 'view-tasks':
            const viewTasksFileKey = btn.dataset.fileKey;
            if (viewTasksFileKey && features?.fileTaskOperations?.viewFileTasks) {
              const ctx = features?.handlers?.createPageContext?.() || 
                         window.Petal?.handlers?.createPageContext?.() || 
                         {};
              features.fileTaskOperations.viewFileTasks(viewTasksFileKey, ctx);
            } else if (viewTasksFileKey && window.Petal?.features?.fileTaskOperations?.viewFileTasks) {
              const ctx = window.Petal?.handlers?.createPageContext?.() || {};
              window.Petal.features.fileTaskOperations.viewFileTasks(viewTasksFileKey, ctx);
            }
            break;
            
          case 'create-task':
            const createTaskFileKey = btn.dataset.fileKey;
            const createTaskFilePath = btn.dataset.path;
            if (createTaskFileKey && createTaskFilePath) {
              try {
                const fileLink = JSON.parse(createTaskFilePath);
                const ctx = features?.handlers?.createPageContext?.() || 
                           window.Petal?.handlers?.createPageContext?.() || 
                           {};
                
                if (features?.fileTaskOperations?.createTaskFromFile) {
                  features.fileTaskOperations.createTaskFromFile(fileLink, createTaskFileKey, ctx);
                } else if (window.Petal?.features?.fileTaskOperations?.createTaskFromFile) {
                  window.Petal.features.fileTaskOperations.createTaskFromFile(fileLink, createTaskFileKey, ctx);
                }
              } catch (e) {
                console.error('Error parsing file path:', e);
                alert('Error creating task: ' + (e.message || 'Invalid file data'));
              }
            }
            break;
            
          case 'open-task':
            const taskId = btn.dataset.taskId;
            if (taskId && features?.fileTaskOperations?.openTaskFromFile) {
              const ctx = features?.handlers?.createPageContext?.() || 
                         window.Petal?.handlers?.createPageContext?.() || 
                         {};
              features.fileTaskOperations.openTaskFromFile(parseInt(taskId), ctx);
            } else if (taskId && window.Petal?.features?.fileTaskOperations?.openTaskFromFile) {
              const ctx = window.Petal?.handlers?.createPageContext?.() || {};
              window.Petal.features.fileTaskOperations.openTaskFromFile(parseInt(taskId), ctx);
            }
            break;
            
          case 'open-project':
            const projectId = btn.dataset.projectId;
            if (projectId && features?.fileProjectOperations?.viewProjectFromFile) {
              const ctx = features?.handlers?.createPageContext?.() || 
                         window.Petal?.handlers?.createPageContext?.() || 
                         {};
              features.fileProjectOperations.viewProjectFromFile(projectId, ctx);
            } else if (projectId && window.Petal?.features?.fileProjectOperations?.viewProjectFromFile) {
              const ctx = window.Petal?.handlers?.createPageContext?.() || {};
              window.Petal.features.fileProjectOperations.viewProjectFromFile(projectId, ctx);
            } else if (projectId && window.Petal?.features?.matrixOperations?.openProjectView) {
              const ctx = window.Petal?.handlers?.createPageContext?.() || {};
              window.Petal.features.matrixOperations.openProjectView(ctx, projectId);
            }
            break;
            
          case 'view-projects':
            const viewProjectsFileKey = btn.dataset.fileKey;
            if (viewProjectsFileKey && features?.fileProjectOperations?.viewFileProjects) {
              const ctx = features?.handlers?.createPageContext?.() || 
                         window.Petal?.handlers?.createPageContext?.() || 
                         {};
              features.fileProjectOperations.viewFileProjects(viewProjectsFileKey, ctx);
            } else if (viewProjectsFileKey && window.Petal?.features?.fileProjectOperations?.viewFileProjects) {
              const ctx = window.Petal?.handlers?.createPageContext?.() || {};
              window.Petal.features.fileProjectOperations.viewFileProjects(viewProjectsFileKey, ctx);
            }
            break;
            
          case 'add-to-project':
            const addToProjectFileKey = btn.dataset.fileKey;
            const addToProjectFilePath = btn.dataset.path;
            if (addToProjectFileKey && addToProjectFilePath) {
              try {
                const fileLink = JSON.parse(addToProjectFilePath);
                const ctx = features?.handlers?.createPageContext?.() || 
                           window.Petal?.handlers?.createPageContext?.() || 
                           {};
                
                if (features?.fileProjectOperations?.addFileToProject) {
                  features.fileProjectOperations.addFileToProject(fileLink, addToProjectFileKey, ctx);
                } else if (window.Petal?.features?.fileProjectOperations?.addFileToProject) {
                  window.Petal.features.fileProjectOperations.addFileToProject(fileLink, addToProjectFileKey, ctx);
                }
              } catch (e) {
                console.error('Error parsing file path:', e);
                alert('Error adding file to project: ' + (e.message || 'Invalid file data'));
              }
            }
            break;
        }
        break;
        
      case 'view':
        // File view tabs: data-action="view:all", "view:active", etc.
        // Update state and re-render
        if (window.Petal?.store) {
          window.Petal.store.setState({ currentFileView: actionName });
          const state = window.Petal.store.getState();
          const container = document.getElementById('view-files');
          if (container) {
            renderFilesPage(container, state, features);
          }
        } else if (features?.handlers?.setFileView) {
          features.handlers.setFileView(actionName, btn);
        } else if (window.setFileView) {
          window.setFileView(actionName, btn);
        }
        break;
        
      case 'stat':
        // Stat card click - filter to that view
        if (window.Petal?.store) {
          let viewToSet = 'all';
          if (actionName === 'total') {
            viewToSet = 'all';
          } else if (actionName === 'active') {
            viewToSet = 'active';
          } else if (actionName === 'missing') {
            viewToSet = 'missing'; // Custom filter
          } else if (actionName === 'stale') {
            viewToSet = 'stale';
          }
          
          window.Petal.store.setState({ currentFileView: viewToSet });
          const state = window.Petal.store.getState();
          const container = document.getElementById('view-files');
          if (container) {
            renderFilesPage(container, state, features);
          }
        } else if (features?.handlers?.setFileView) {
          // Fallback to handler if store not available
          if (actionName === 'total' || actionName === 'active' || actionName === 'stale') {
            features.handlers.setFileView(actionName === 'total' ? 'all' : actionName, btn);
          }
        }
        break;
        
      default:
        // Fallback for legacy actions
        switch (action) {
          case 'add-file':
          case 'addFileToRegistry':
            if (window.addFileToRegistry) {
              window.addFileToRegistry();
            }
            break;
        }
    }
  });
  
  // Handle project filter change
  const projectFilter = container.querySelector('#file-project-filter') || container.querySelector('[data-file-project-filter]');
  if (projectFilter && !projectFilter.dataset.bound) {
    projectFilter.dataset.bound = 'true';
    projectFilter.addEventListener('change', async (e) => {
      const selectedProjectId = e.target.value;
      
      // Update state
      if (window.Petal?.store) {
        window.Petal.store.setState({ currentFileProjectFilter: selectedProjectId });
        
        // Re-render using router (proper way)
        const switchViewFn = window.routerSwitchView || window.switchView;
        if (switchViewFn) {
          try {
            await switchViewFn('files', { force: true });
          } catch (err) {
            console.error('Error re-rendering files view:', err);
            // Fallback: direct re-render
            const state = window.Petal.store.getState();
            renderFilesPage(container, state, features);
          }
        } else {
          // Fallback: direct re-render
          const state = window.Petal.store.getState();
          renderFilesPage(container, state, features);
        }
      } else if (window.setFileProjectFilter) {
        // Use existing handler if available
        await window.setFileProjectFilter(selectedProjectId);
      } else if (features?.handlers?.setFileProjectFilter) {
        features.handlers.setFileProjectFilter(selectedProjectId);
        // Re-render if handler doesn't do it automatically
        const state = window.Petal?.store?.getState() || {};
        renderFilesPage(container, state, features);
      }
    });
  }
}

/**
 * Render Files page
 * @param {HTMLElement} container - Container element (#view-files)
 * @param {Object} state - Current app state
 * @param {Object} features - Features/handlers
 */
export async function renderFilesPage(container, state, features) {
  if (!container) {
    console.error('❌ renderFilesPage: Container not provided');
    return;
  }
  
  // Get all files for stats calculation
  const persistedFiles = Array.isArray(state.files) ? state.files : [];
  const fileRegistry = state.fileRegistry || {};
  const tasks = Array.isArray(state.tasks) ? state.tasks : [];
  const projects = Array.isArray(state.projects) ? state.projects : [];
  const fileHistory = state.fileHistory || {};
  
  // Build complete file list for stats
  let allFiles = [...persistedFiles];
  if (allFiles.length === 0 && fileRegistry && Object.keys(fileRegistry).length > 0) {
    allFiles = Object.values(fileRegistry).map(f => {
      const fileLink = f.fileLink || f;
      return {
        ...f,
        fileLink: fileLink,
        key: f.key || fileLink.abs_path || fileLink.onedrive_rel || fileLink.share_url,
        name: f.name || fileLink.label || fileLink.name || 'File',
        tasks: f.tasks || [],
        projects: f.projects || []
      };
    });
  } else if (allFiles.length > 0) {
    // Enrich persisted files with registry data
    allFiles = allFiles.map(f => {
      const fileKey = f.key || f.fileLink?.abs_path || f.fileLink?.onedrive_rel || f.fileLink?.share_url;
      const registryFile = fileRegistry[fileKey];
      if (registryFile) {
        return {
          ...f,
          tasks: registryFile.tasks || f.tasks || [],
          projects: registryFile.projects || f.projects || []
        };
      }
      return f;
    });
  }
  
  // Calculate stats
  const stats = calculateFileStats(allFiles, fileHistory, tasks, projects);
  const currentView = state.currentFileView || 'all';
  
  // Clear container and build structure
  container.innerHTML = '';
  
  // Create header
  const header = document.createElement('header');
  header.className = 'page-header';
  header.innerHTML = PageHeader({
    title: 'Files',
    icon: '⊟',
    status: `${stats.total} total · ${stats.active} active · ${stats.missing} missing · ${stats.stale} stale`,
    actions: [
      {
        type: 'primary',
        text: '+ Add File',
        action: 'file:add'
      }
    ]
  });
  container.appendChild(header);
  
  // Create tabs container
  const tabsContainer = document.createElement('div');
  tabsContainer.className = 'files-tabs-container';
  tabsContainer.style.cssText = 'padding: 16px 28px 0; background: var(--surface); border-bottom: 1px solid var(--border);';
  // Create tabs manually with correct action format
  tabsContainer.innerHTML = `
    <div class="tabs" id="files-view-tabs">
      <button class="tab ${currentView === 'all' ? 'active' : ''}" data-action="view:all">All Files</button>
      <button class="tab ${currentView === 'active' ? 'active' : ''}" data-action="view:active">Active</button>
      <button class="tab ${currentView === 'stale' ? 'active' : ''}" data-action="view:stale">Stale</button>
      <button class="tab ${currentView === 'submissions' ? 'active' : ''}" data-action="view:submissions">Submissions</button>
    </div>
  `;
  container.appendChild(tabsContainer);
  
  // Create stats cards container
  const statsContainer = document.createElement('div');
  statsContainer.className = 'files-stats-container';
  statsContainer.style.cssText = 'display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; padding: 20px 28px; background: var(--surface);';
  statsContainer.innerHTML = `
    ${StatCard({ 
      label: 'Total', 
      value: String(stats.total), 
      subtitle: 'files',
      variant: 1 
    })}
    ${StatCard({ 
      label: 'Active', 
      value: String(stats.active), 
      subtitle: 'files',
      variant: 2 
    })}
    ${StatCard({ 
      label: 'Missing', 
      value: String(stats.missing), 
      subtitle: 'files',
      variant: 3 
    })}
    ${StatCard({ 
      label: 'Stale', 
      value: String(stats.stale), 
      subtitle: 'files',
      variant: 4 
    })}
  `;
  container.appendChild(statsContainer);
  
  // Make stat cards clickable - they'll be handled by the bind function
  statsContainer.querySelectorAll('.stat-card').forEach((card, index) => {
    const actions = ['total', 'active', 'missing', 'stale'];
    card.style.cursor = 'pointer';
    card.style.transition = 'transform 0.15s, box-shadow 0.15s';
    card.setAttribute('data-action', `stat:${actions[index]}`);
    card.addEventListener('mouseenter', () => {
      card.style.transform = 'translateY(-2px)';
      card.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = 'translateY(0)';
      card.style.boxShadow = '';
    });
  });
  
  // Create filters container
  const filtersContainer = document.createElement('div');
  filtersContainer.className = 'files-filters-container';
  filtersContainer.style.cssText = 'padding: 12px 28px; background: var(--surface); border-bottom: 1px solid var(--border); display: flex; gap: 12px; align-items: center;';
  filtersContainer.innerHTML = `
    <label style="font-size: 12px; color: var(--text-dim);">Filter by:</label>
    <select id="file-project-filter" data-file-project-filter style="padding: 6px 12px; border: 1px solid var(--border); border-radius: 6px; background: var(--bg2); color: var(--text); font-size: 12px;">
      <option value="all">All Projects</option>
    </select>
  `;
  container.appendChild(filtersContainer);
  
  // Create files view container
  const filesViewContainer = document.createElement('div');
  filesViewContainer.id = 'files-view-container';
  filesViewContainer.style.cssText = 'padding: 20px 28px;';
  container.appendChild(filesViewContainer);
  
  // Bind event handlers (only once)
  bind(container, features);
  
  // Render files using existing renderFiles function
  await renderFiles(container, state, features);
}

/**
 * Cleanup (optional - for when page is unmounted)
 */
export function cleanupFilesPage() {
  bound = false;
}
