// ═══════════════════════ RENDER PROJECTS ═══════════════════════
// Pure rendering function for projects view
// Takes state and handlers as parameters - no store peeking

import { esc } from '../utils/strings.js';
import { today, parseDate, dueLabel } from '../utils/dates.js';

/**
 * Render projects view
 * @param {HTMLElement} containerEl - Container element to render into
 * @param {Object} state - Current app state
 * @param {Object} handlers - Event handlers
 */
export function renderProjects(containerEl, state, handlers) {
  const { projects, currentProjFilter, openProjects } = state;
  
  const c = containerEl || document.getElementById('project-container');
  if (!c) return;
  
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
  
  c.innerHTML = list.map(p => renderProjectCard(p, state)).join('');
  
  // Force hide all forms immediately after rendering
  setTimeout(() => {
    if (typeof forceHideAllForms === 'function') {
      forceHideAllForms();
    }
  }, 0);
  setTimeout(() => {
    if (typeof forceHideAllForms === 'function') {
      forceHideAllForms();
    }
  }, 50);
}

/**
 * Render a single project card
 * @param {Object} project - Project object
 * @param {Object} state - Current app state
 */
function renderProjectCard(project, state) {
  const { tasks, openProjects } = state;
  const color = `var(--proj-${project.color || 1})`;
  const colorPale = `var(--proj-${project.color || 1}p)`;
  const dl = dueLabel(project.due, true);
  const isOpen = openProjects && openProjects.has(project.id);
  
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
