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
    // Find the closest element with data attributes or button
    const btn = e.target.closest('[data-action], button');
    if (!btn) return;
    
    const action = btn.dataset.action;
    const projectId = btn.dataset.projectId || btn.getAttribute('data-project-id');
    const taskId = btn.dataset.taskId || btn.dataset.id;
    const isSubtask = btn.dataset.isSubtask === 'true';
    const parentTaskId = btn.dataset.parentTaskId;
    
    e.stopPropagation();
    
    // Handle project actions
    if (action === 'toggle-project' || btn.classList.contains('btn-icon') && btn.textContent.includes('▼') || btn.textContent.includes('▶')) {
      // Toggle project expand/collapse
      if (projectId && features?.projectOperations?.toggleProjectOpen) {
        features.projectOperations.toggleProjectOpen(projectId);
      } else if (projectId && window.toggleProjectOpen) {
        window.toggleProjectOpen(projectId);
      }
      return;
    }
    
    if (action === 'select-project-matrix' || btn.textContent.includes('📊')) {
      // Open workflow matrix for project
      if (projectId && features?.projectOperations?.selectProjectForMatrix) {
        features.projectOperations.selectProjectForMatrix(projectId);
      } else if (projectId && window.selectProjectForMatrix) {
        window.selectProjectForMatrix(projectId);
      }
      return;
    }
    
    if (action === 'add-project-task' || (btn.textContent.includes('+ Add Task') && projectId)) {
      // Open add task modal for project
      if (projectId && features?.projectOperations?.openProjectAddTaskModal) {
        features.projectOperations.openProjectAddTaskModal(projectId);
      } else if (projectId && window.openProjectAddTaskModal) {
        window.openProjectAddTaskModal(projectId);
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
    
    if (action === 'toggle-task' || btn.classList.contains('check-box')) {
      // Toggle task done state
      if (taskId && features?.taskOperations?.toggleTask) {
        features.taskOperations.toggleTask(String(taskId));
      } else if (taskId && window.Petal?.handlers?.toggleTask) {
        window.Petal.handlers.toggleTask(taskId);
      }
      return;
    }
    
    if (action === 'open-drawer' || btn.textContent.includes('📝')) {
      // Open task drawer
      if (taskId && features?.taskDrawer?.openTaskDrawer) {
        features.taskDrawer.openTaskDrawer(String(taskId));
      } else if (taskId && window.Petal?.features?.taskDrawer?.openTaskDrawer) {
        window.Petal.features.taskDrawer.openTaskDrawer(String(taskId));
      } else if (taskId && window.openTaskDrawer) {
        window.openTaskDrawer(taskId);
      }
      return;
    }
  });
  
  // Handle filter buttons
  container.querySelectorAll('.filter-chip, .proj-filter-chip').forEach(btn => {
    if (btn.dataset.bound) return;
    btn.dataset.bound = 'true';
    btn.addEventListener('click', () => {
      const filter = btn.textContent.trim().toLowerCase();
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
