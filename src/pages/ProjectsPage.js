// ═══════════════════════ PROJECTS PAGE ═══════════════════════
// Projects view page with event delegation
// Replaces inline onclick handlers with delegated events

import { renderProjects } from '../ui/renderProjects.js';

let bound = false;

/**
 * Bind event handlers to the projects container
 * Uses event delegation - only binds once
 */
function bind(container, features) {
  if (bound) return;
  
  // Click delegation for all project and task actions
  container.addEventListener('click', (e) => {
    // First check if clicking on a task card (not a button inside it)
    const taskCard = e.target.closest('.task-card[data-id]');
    if (taskCard && !e.target.closest('button, [data-action]')) {
      // Clicked on task card itself (not a button) - open drawer
      const taskId = taskCard.getAttribute('data-id');
      if (taskId) {
        e.stopPropagation();
        console.log('🔍 Task card clicked:', taskId);
        // Get full context with all tasks from store
        const currentState = window.Petal?.store?.getState() || {};
        const ctx = {
          tasks: currentState.tasks || [],
          projects: currentState.projects || [],
          ...(window.Petal?.handlers?.createPageContext?.() || window.createPageContext?.() || {})
        };
        console.log('🔍 Task card context:', { taskId, tasksCount: ctx.tasks?.length, taskFound: ctx.tasks?.find(t => String(t.id) === String(taskId) || Number(t.id) === Number(taskId)) });
        if (window.Petal?.features?.taskDrawer?.openTaskDrawer) {
          window.Petal.features.taskDrawer.openTaskDrawer(ctx, String(taskId));
        } else if (window.openTaskDrawer) {
          window.openTaskDrawer(taskId);
        } else {
          console.error('❌ Task card click: No openTaskDrawer function available');
        }
        return;
      }
    }
    
    // Find the closest element with data attributes or button
    const btn = e.target.closest('[data-action], button');
    if (!btn) return;
    
    const action = btn.dataset.action;
    const projectId = btn.dataset.projectId || btn.getAttribute('data-project-id');
    const taskId = btn.dataset.taskId || btn.dataset.id;
    const isSubtask = btn.dataset.isSubtask === 'true';
    const parentTaskId = btn.dataset.parentTaskId;
    
    console.log('🔍 ProjectsPage click:', { action, projectId, taskId, btnText: btn.textContent?.trim() });
    
    e.stopPropagation();
    
    // Handle project actions
    if (action === 'toggle-project' || (btn.classList.contains('btn-icon') && (btn.textContent.includes('▼') || btn.textContent.includes('▶')))) {
      // Toggle project expand/collapse
      if (projectId && features?.projectOperations?.toggleProjectOpen) {
        // toggleProjectOpen expects (ctx, id) - create a minimal context
        const ctx = {
          save: () => Promise.resolve(),
          render: window.render || (() => {})
        };
        features.projectOperations.toggleProjectOpen(ctx, projectId);
      } else if (projectId && window.toggleProjectOpen) {
        window.toggleProjectOpen(projectId);
      }
      return;
    }
    
    if (action === 'open-project') {
      // Open project individual page
      // Get state from store if available
      const currentState = window.Petal?.store?.getState() || {};
      if (projectId && features?.matrixOperations?.openProjectView) {
        // openProjectView expects (ctx, projectId)
        const ctx = {
          tasks: currentState.tasks || [],
          projects: currentState.projects || [],
          createPageContext: () => ({
            tasks: currentState.tasks || [],
            projects: currentState.projects || [],
            render: window.render || (() => {})
          })
        };
        features.matrixOperations.openProjectView(ctx, projectId);
      } else if (projectId && features?.matrixOperations?.selectProjectForMatrix) {
        const ctx = window.Petal?.handlers?.createPageContext?.() || {
          tasks: currentState.tasks || [],
          projects: currentState.projects || [],
          render: window.render || (() => {})
        };
        features.matrixOperations.selectProjectForMatrix(ctx, projectId);
      } else if (projectId && window.selectProjectForMatrix) {
        window.selectProjectForMatrix(projectId);
      }
      return;
    }
    
    if (action === 'select-project-matrix' || btn.textContent.includes('📊')) {
      // Open workflow matrix for project
      if (projectId && features?.matrixOperations?.selectProjectForMatrix) {
        const ctx = window.Petal?.handlers?.createPageContext?.() || {};
        features.matrixOperations.selectProjectForMatrix(ctx, projectId);
      } else if (projectId && window.selectProjectForMatrix) {
        window.selectProjectForMatrix(projectId);
      }
      return;
    }
    
    if (action === 'add-project-task' || (btn.textContent.includes('+ Add Task') && projectId)) {
      // Open add task modal for project
      // Get projectId from button's data attribute first
      const buttonProjectId = btn.getAttribute('data-project-id') || projectId;
      console.log('🔍 add-project-task clicked:', { projectId, buttonProjectId, hasFeatures: !!features, hasModalOps: !!features?.modalOperations });
      
      if (!buttonProjectId) {
        console.warn('⚠️ add-project-task: No projectId found', { projectId, buttonProjectId, btn });
        alert('Please select a project first');
        return;
      }
      
      // Get state from store if available
      const currentState = window.Petal?.store?.getState() || {};
      const ctx = {
        tasks: currentState.tasks || [],
        projects: currentState.projects || [],
        createPageContext: () => ({
          tasks: currentState.tasks || [],
          projects: currentState.projects || [],
          render: window.render || (() => {})
        })
      };
      
      // Use buttonProjectId (from data attribute) instead of projectId
      const finalProjectId = buttonProjectId;
      
      // Try features.modalOperations first, then window.Petal.features.modalOperations, then global function
      if (features?.modalOperations?.openProjectAddTaskModal) {
        console.log('✅ Using features.modalOperations.openProjectAddTaskModal with projectId:', finalProjectId);
        features.modalOperations.openProjectAddTaskModal(ctx, finalProjectId);
      } else if (window.Petal?.features?.modalOperations?.openProjectAddTaskModal) {
        console.log('✅ Using window.Petal.features.modalOperations.openProjectAddTaskModal with projectId:', finalProjectId);
        window.Petal.features.modalOperations.openProjectAddTaskModal(ctx, finalProjectId);
      } else if (window.openProjectAddTaskModal) {
        console.log('✅ Using window.openProjectAddTaskModal with projectId:', finalProjectId);
        window.openProjectAddTaskModal(finalProjectId);
      } else {
        console.error('❌ add-project-task: No openProjectAddTaskModal function available', {
          hasFeatures: !!features,
          hasModalOps: !!features?.modalOperations,
          hasWindowPetal: !!window.Petal,
          hasWindowPetalFeatures: !!window.Petal?.features,
          hasWindowPetalFeaturesModalOps: !!window.Petal?.features?.modalOperations,
          hasWindowOpenProjectAddTaskModal: !!window.openProjectAddTaskModal
        });
      }
      return;
    }
    
    // Handle add-file-to-project action
    if (action === 'add-file-to-project') {
      const buttonProjectId = btn.getAttribute('data-project-id') || projectId;
      if (!buttonProjectId) {
        alert('Please select a project first');
        return;
      }
      
      const currentState = window.Petal?.store?.getState() || {};
      const ctx = {
        tasks: currentState.tasks || [],
        projects: currentState.projects || [],
        save: window.Petal?.handlers?.save || (() => Promise.resolve()),
        render: window.Petal?.handlers?.render || (() => {})
      };
      
      if (window.Petal?.features?.modalOperations?.openProjectAddFileModal) {
        window.Petal.features.modalOperations.openProjectAddFileModal(ctx, buttonProjectId);
      } else if (window.openProjectAddFileModal) {
        window.openProjectAddFileModal(buttonProjectId);
      }
      return;
    }
    
    // Handle task actions (inside project cards)
    if (action === 'edit-task' || action === 'edit') {
      if (taskId && features?.taskOperations?.editTask) {
        features.taskOperations.editTask(String(taskId));
      } else if (taskId && window.Petal?.features?.taskOperations?.editTask) {
        window.Petal.features.taskOperations.editTask(String(taskId));
      }
      return;
    }
    
    if (action === 'delete' || action === 'delete-task') {
      if (taskId && features?.deleteHandlers?.deleteTask) {
        features.deleteHandlers.deleteTask({ 
          taskId: String(taskId),
          projectId: projectId ? String(projectId) : undefined,
          isSubtask: isSubtask,
          parentTaskId: parentTaskId ? String(parentTaskId) : undefined
        });
      } else if (taskId && window.Petal?.features?.taskOperations?.deleteTask) {
        window.Petal.features.taskOperations.deleteTask(
          String(taskId),
          isSubtask,
          projectId ? String(projectId) : null,
          parentTaskId ? String(parentTaskId) : null
        );
      }
      return;
    }
    
    if (action === 'task:toggle' || action === 'toggle-task' || btn.classList.contains('check-box')) {
      // Toggle task done state (parity with global delegation + task:toggle markup)
      if (taskId && features?.taskOperations?.toggleTask) {
        const state = window.Petal?.store?.getState() || {};
        const ctx = {
          tasks: state.tasks || [],
          projects: state.projects || [],
          save: window.Petal?.handlers?.save || (() => Promise.resolve()),
          render: window.Petal?.handlers?.render || (() => {})
        };
        features.taskOperations.toggleTask(ctx, String(taskId));
      } else if (taskId && window.Petal?.handlers?.toggleTask) {
        window.Petal.handlers.toggleTask(taskId);
      } else if (taskId && window.toggleTask) {
        window.toggleTask(taskId);
      }
      return;
    }
    
    if (action === 'open-drawer' || btn.textContent.includes('📝')) {
      // Open task drawer
      console.log('🔍 open-drawer clicked:', { taskId, projectId });
      if (taskId) {
        // Get full context with all tasks from store
        const currentState = window.Petal?.store?.getState() || {};
        const ctx = {
          tasks: currentState.tasks || [],
          projects: currentState.projects || [],
          ...(window.Petal?.handlers?.createPageContext?.() || window.createPageContext?.() || {})
        };
        console.log('🔍 open-drawer context:', { taskId, tasksCount: ctx.tasks?.length, projectId });
        if (features?.taskDrawer?.openTaskDrawer) {
          features.taskDrawer.openTaskDrawer(ctx, String(taskId));
        } else if (window.Petal?.features?.taskDrawer?.openTaskDrawer) {
          window.Petal.features.taskDrawer.openTaskDrawer(ctx, String(taskId));
        } else if (window.openTaskDrawer) {
          window.openTaskDrawer(taskId);
        } else {
          console.error('❌ open-drawer: No openTaskDrawer function available');
        }
      }
      return;
    }
  });
  
  // Handle filter buttons
  container.querySelectorAll('.filter-chip, .proj-filter-chip').forEach(btn => {
    if (btn.dataset.bound) return;
    btn.dataset.bound = 'true';
    btn.addEventListener('click', () => {
      const filter = btn.dataset.filter || btn.textContent.trim().toLowerCase();
      if (features?.handlers?.setProjFilter) {
        features.handlers.setProjFilter(filter, btn);
      } else if (window.setProjFilter) {
        window.setProjFilter(filter, btn);
      }
    });
  });
  
  bound = true;
}

/**
 * Render Projects page
 * @param {HTMLElement} container - Container element (#view-projects)
 * @param {Object} state - Current app state
 * @param {Object} features - Features/handlers
 */
export function renderProjectsPage(container, state, features) {
  if (!container) {
    console.error('❌ renderProjectsPage: Container not provided');
    return;
  }
  
  console.log('🔍 renderProjectsPage: Starting', { 
    containerId: container.id, 
    hasProjectContainer: !!container.querySelector('#project-container') 
  });
  
  // CONTAINER-FIRST: Find project-container scoped to the view container only
  // Never use global selectors - this prevents rendering into wrong container
  let projectContainer = container.querySelector('#project-container');
  
  // If not found, the container itself might be #project-container (legacy case)
  if (!projectContainer && container.id === 'project-container') {
    projectContainer = container;
  }
  
  // Create or find header - must be before setting padding styles
  let projectsHeader = container.querySelector('.projects-header');
  if (!projectsHeader) {
    projectsHeader = document.createElement('header');
    projectsHeader.className = 'projects-header';
    // Insert at the very beginning, before any other content
    container.insertBefore(projectsHeader, container.firstChild);
  }
  
  // Calculate project stats
  const projects = Array.isArray(state.projects) ? state.projects : [];
  const activeProjects = projects.filter(p => p && !p.done);
  const doneProjects = projects.filter(p => p && p.done);
  
  // Render header
  projectsHeader.innerHTML = `
    <div class="projects-header-title">
      <span class="projects-header-name">Projects</span>
    </div>
    <div class="projects-header-right">
      <div style="display:flex;align-items:center;gap:6px">
        <span class="projects-header-status">${activeProjects.length} active${activeProjects.length !== 1 ? '' : ''} · ${doneProjects.length} completed</span>
      </div>
    </div>
  `;
  
  // If still not found, create it INSIDE the view container
  if (!projectContainer) {
    console.warn('⚠️ renderProjectsPage: project-container not found inside view, creating it');
    projectContainer = document.createElement('div');
    projectContainer.id = 'project-container';
    container.appendChild(projectContainer);
  }
  
  // DEBUG: Verify container is inside the correct parent
  const containerParent = projectContainer.parentElement;
  const viewContainer = containerParent?.id === 'view-projects' ? containerParent : container;
  if (viewContainer.id !== 'view-projects') {
    console.error('❌ renderProjectsPage: project-container parent is not #view-projects!', {
      containerId: projectContainer.id,
      parentId: containerParent?.id,
      parentClassName: containerParent?.className,
      viewContainerId: viewContainer.id
    });
  }
  
  console.log('🔍 renderProjectsPage: Using container', { 
    containerId: projectContainer.id,
    parentId: projectContainer.parentElement?.id 
  });

  // Projects home = card list (hide matrix + selector unless a project is open)
  if (!window.selectedProjectId && window.Petal?.features?.matrixOperations?.showProjectsListHome) {
    window.Petal.features.matrixOperations.showProjectsListHome({ rerender: false });
  }
  
  // Ensure the view container is visible - FORCE it
  // Remove any classes that might hide it FIRST
  container.classList.remove('view-projects-hidden');
  
  // Force all visibility styles - use setProperty with important to override CSS !important
  container.style.setProperty('display', 'block', 'important');
  container.style.setProperty('visibility', 'visible', 'important');
  container.style.setProperty('opacity', '1', 'important');
  container.style.setProperty('grid-column', '2', 'important');
  container.style.setProperty('grid-row', '1', 'important');
  container.style.setProperty('width', '100%', 'important');
  container.style.setProperty('max-width', '100%', 'important');
  container.style.setProperty('box-sizing', 'border-box', 'important');
    container.style.setProperty('padding', '82px 36px 100px', 'important');
    container.style.setProperty('padding-top', '82px', 'important');
  container.style.setProperty('position', 'relative', 'important');
  container.style.setProperty('top', '0', 'important');
  container.style.setProperty('height', '100vh', 'important');
  container.style.setProperty('overflow-y', 'auto', 'important');
  container.style.setProperty('overflow-x', 'hidden', 'important');
  
  // Verify it's actually visible
  const computedStyle = window.getComputedStyle(container);
  console.log('🔍 renderProjectsPage: Container visibility', {
    display: computedStyle.display,
    visibility: computedStyle.visibility,
    opacity: computedStyle.opacity,
    hasHiddenClass: container.classList.contains('view-projects-hidden'),
    offsetHeight: container.offsetHeight,
    offsetWidth: container.offsetWidth
  });
  
  // Populate the matrix-project-select dropdown
  const matrixSelect = container.querySelector('#matrix-project-select') || document.getElementById('matrix-project-select');
  if (matrixSelect) {
    const current = matrixSelect.value;
    matrixSelect.innerHTML = '<option value="">-- Select a project --</option>';
    projects.filter(p => !p.done).forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = p.name || 'Untitled Project';
      matrixSelect.appendChild(opt);
    });
    // Restore selection if still valid
    if (current && projects.some(p => String(p.id) === String(current))) {
      matrixSelect.value = current;
    }
    console.log('✅ Populated matrix-project-select with', projects.filter(p => !p.done).length, 'projects');
  } else {
    console.warn('⚠️ matrix-project-select not found');
  }
  
  // Bind event handlers (only once) - bind to the view container so it catches all events
  bind(container, features);
  
  // Render using existing renderProjects function (it expects #project-container)
  const result = renderProjects(projectContainer, state, features);
  
  console.log('✅ renderProjectsPage: Completed', { 
    rendered: !!result,
    projectContainerExists: !!projectContainer,
    projectContainerHTML: projectContainer.innerHTML.length > 0
  });
  
  return result;
}

/**
 * Cleanup (optional - for when page is unmounted)
 */
export function cleanupProjectsPage() {
  bound = false;
}
