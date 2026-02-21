// ═══════════════════════ RENDER PROJECTS ═══════════════════════
// Pure rendering function for projects view
// Takes state and handlers as parameters - no store peeking

import { esc } from '../utils/strings.js';
import { today, parseDate, dueLabel } from '../utils/dates.js';

/**
 * Render projects view
 * Phase 3 Fix: Added debug logging and error handling
 * @param {HTMLElement} containerEl - Container element to render into
 * @param {Object} state - Current app state
 * @param {Object} handlers - Event handlers
 */
export function renderProjects(containerEl, state, handlers) {
  try {
    // Normalize openProjects to a Set (handles Array, null, undefined)
    // This prevents "openProjects.has is not a function" crashes
    const openSet =
      state.openProjects instanceof Set
        ? state.openProjects
        : new Set(Array.isArray(state.openProjects) ? state.openProjects : []);

    // Diagnostic logging: capture input shapes to catch nondeterministic failures
    console.log('DEBUG renderProjects:', {
      projectsType: Array.isArray(state.projects) ? 'array' : typeof state.projects,
      projectsCount: state.projects?.length,
      openProjectsType: state.openProjects instanceof Set ? 'Set' : Array.isArray(state.openProjects) ? 'Array' : typeof state.openProjects,
      openProjectsValue: state.openProjects instanceof Set ? Array.from(state.openProjects) : state.openProjects,
      currentProjFilter: state.currentProjFilter
    });
    
    const { projects, currentProjFilter } = state;
    
    const c = containerEl || document.getElementById('project-container');
    if (!c) {
      console.error('❌ renderProjects: project-container element not found!');
      return;
    }
    
    // Filter projects
    let list = (projects || []).filter(p => {
      if (currentProjFilter === 'active' && p.done) return false;
      if (currentProjFilter === 'done' && !p.done) return false;
      return true;
    });
    
    if (!list.length) {
      c.innerHTML = '<div class="empty-state">No projects yet<small>Create a project above</small></div>';
      return;
    }
    
    // Pass openSet down so renderProjectCard never touches raw state.openProjects
    c.innerHTML = list.map(p => renderProjectCard(p, state, openSet)).join('');
  
    // Phase 3 Fix: Post-render invariant check (detect "projects exist but UI blank")
    // Use queueMicrotask to check immediately after DOM update, before any other code runs
    queueMicrotask(() => {
      const s = state;
      const cards = document.querySelectorAll('#project-container .project-card').length;
      const projectsCount = (s.projects || []).length;

      if (projectsCount > 0 && cards === 0) {
        console.error('❌ INVARIANT FAIL: projects exist but no cards rendered', {
          projectsCount,
          sampleProjects: (s.projects || []).slice(0, 3).map(p => ({ id: p.id, name: p.name })),
          containerHTMLPreview: (document.getElementById('project-container')?.innerHTML || '').slice(0, 200),
          filteredListLength: list.length
        });
      }
    });
  
    // NOTE: this is a global side effect; keep, but guard it tightly
    setTimeout(() => {
      try {
        if (typeof forceHideAllForms === 'function') forceHideAllForms();
      } catch (e) {
        console.error('forceHideAllForms crashed:', e);
        console.error(e?.stack);
      }
      
      // Phase 3 Fix: Sanity probe - check if forceHideAllForms hid the container
      setTimeout(() => {
        const el = document.getElementById('project-container');
        if (el) {
          const cs = getComputedStyle(el);
          if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0) {
            console.error('🧪 project-container visibility issue detected:', {
              display: cs.display,
              visibility: cs.visibility,
              opacity: cs.opacity,
              parentDisplay: getComputedStyle(el.parentElement)?.display
            });
          }
        }
      }, 60);
    }, 0);

    setTimeout(() => {
      try {
        if (typeof forceHideAllForms === 'function') forceHideAllForms();
      } catch (e) {
        console.error('forceHideAllForms crashed:', e);
        console.error(e?.stack);
      }
    }, 50);
  } catch (e) {
    console.error('❌ renderProjects crashed:', e);
    console.error(e?.stack);
    // Show error in UI
    const c = containerEl || document.getElementById('project-container');
    if (c) {
      c.innerHTML = `<div class="empty-state" style="color:var(--error,red);">
        Projects failed to render
        <small>See console for error</small>
      </div>`;
    }
  }
}

/**
 * Render a single project card
 * @param {Object} project - Project object
 * @param {Object} state - Current app state
 * @param {Set} openSet - Normalized Set of open project IDs
 */
function renderProjectCard(project, state, openSet) {
  const { tasks } = state;
  const color = `var(--proj-${project.color || 1})`;
  const colorPale = `var(--proj-${project.color || 1}p)`;
  const dl = dueLabel(project.due, true);
  const isOpen = openSet.has(project.id);
  
  // Project metrics: tasks in this project
  const projectTasks = (tasks || []).filter(t => String(t.projectId) === String(project.id));
  const totalTasks = projectTasks.length;
  const inProgressTasks = projectTasks.filter(t => t.status === 'Doing' && !t.done).length;
  const doneTasks = projectTasks.filter(t => t.done).length;
  const donePct = totalTasks ? Math.round(doneTasks / totalTasks * 100) : 0;
  const overdueTasks = projectTasks.filter(t => {
    if (t.done) return false;
    const due = parseDate(t.due);
    return due && due < today();
  }).length;
  
  return `<div class="project-card" id="proj-${project.id}">
    <div class="project-header">
      <div class="project-color-bar" style="background:${color};"></div>
      <div class="project-title-row">
        <h3 class="project-name">${esc(project.name || 'Untitled Project')}</h3>
        <div class="project-actions">
          <button onclick="selectProjectForMatrix(${project.id})" class="btn-icon" title="Open workflow">📊</button>
          <button onclick="toggleProjectOpen(${project.id})" class="btn-icon" title="${isOpen ? 'Collapse' : 'Expand'}">${isOpen ? '▼' : '▶'}</button>
        </div>
      </div>
      ${project.description ? `<p class="project-desc">${esc(project.description)}</p>` : ''}
    </div>
    <div class="project-metrics">
      <div class="metric">
        <span class="metric-value">${totalTasks}</span>
        <span class="metric-label">Tasks</span>
      </div>
      <div class="metric">
        <span class="metric-value">${inProgressTasks}</span>
        <span class="metric-label">Active</span>
      </div>
      <div class="metric">
        <span class="metric-value">${donePct}%</span>
        <span class="metric-label">Done</span>
      </div>
      ${overdueTasks > 0 ? `<div class="metric overdue">
        <span class="metric-value">${overdueTasks}</span>
        <span class="metric-label">Overdue</span>
      </div>` : ''}
    </div>
    ${dl ? `<div class="project-due ${dl.class}">${dl.label}</div>` : ''}
    ${isOpen ? `<div class="project-details">Project details expanded...</div>` : ''}
  </div>`;
}
