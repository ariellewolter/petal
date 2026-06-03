// ═══════════════════════ UI HELPER FUNCTIONS ═══════════════════════
// Helper functions for UI operations and DOM manipulation

import { parseDate, today } from '../utils/dates.js';

/** Mark-done checkbox used wherever a task row is rendered */
export function taskDoneToggleButton(task, style = '') {
  const done = !!task.done;
  const label = done ? 'Mark as not done' : 'Mark as done';
  const id = task.id;
  return `<button type="button" class="check-box ${done ? 'checked' : ''}" data-action="task:toggle" data-task-id="${id}" title="${label}" aria-label="${label}" style="flex-shrink:0;background:none;border:none;padding:0;cursor:pointer;${style}"></button>`;
}
import { findProjectById, filterTasksForProject } from '../utils/projectHelpers.js';

/**
 * Generate group key for task grouping (by due date)
 * @param {Object} task - Task object
 * @param {Function} parseDateFn - Parse date function
 * @param {Function} todayFn - Today function
 * @returns {Object} Group key with label and sort value
 */
export function groupKey(task, parseDateFn = parseDate, todayFn = today) {
  const due = parseDateFn(task.due);
  if (!due) return { label: 'Someday', sort: '9999' };
  const t = todayFn();
  const diff = Math.round((due - t) / 86400000);
  if (diff < 0) return { label: '🌸 Overdue', sort: '0000' };
  if (diff === 0) return { label: '✦ Today', sort: '0001' };
  if (diff === 1) return { label: 'Tomorrow', sort: '0002' };
  return {
    label: due.toLocaleDateString('en-US', {
      weekday: diff < 7 ? 'long' : undefined,
      month: 'long',
      day: 'numeric',
      year: due.getFullYear() !== t.getFullYear() ? 'numeric' : undefined
    }),
    sort: task.due
  };
}

/**
 * Hide all collapsible forms
 * @param {Function} forceHideAllForms - Function to force hide all forms
 */
export function hideAllForms(forceHideAllForms) {
  if (forceHideAllForms) {
    forceHideAllForms();
  }
  
  // Reset toggle indicators
  const matrixTaskToggle = document.getElementById('matrix-add-task-toggle');
  const matrixFileToggle = document.getElementById('matrix-add-file-toggle');
  if (matrixTaskToggle) matrixTaskToggle.textContent = '▶';
  if (matrixFileToggle) matrixFileToggle.textContent = '▶';
}

/**
 * Toggle workflow lanes section visibility
 * @param {number|string} projId - Project ID
 */
export function toggleWorkflowLanesSection(projId) {
  const section = document.getElementById('workflow-lanes-section-' + projId);
  const toggle = document.getElementById('workflow-lanes-toggle-' + projId);
  if (section && toggle) {
    const isOpen = section.style.display !== 'none';
    section.style.display = isOpen ? 'none' : 'block';
    toggle.textContent = isOpen ? '▼' : '▶';
  }
}

/**
 * Toggle project tasks section visibility
 * @param {number|string} projId - Project ID
 */
export function toggleProjectTasksSection(projId) {
  const section = document.getElementById('project-tasks-section-' + projId);
  const toggle = document.getElementById('project-tasks-toggle-' + projId);
  if (section && toggle) {
    const isOpen = section.style.display !== 'none';
    section.style.display = isOpen ? 'none' : 'block';
    toggle.textContent = isOpen ? '▼' : '▶';
  }
}

/**
 * Update comp window (placeholder - may need project-specific rendering)
 * @param {Object} ctx - Page context with selectedProjectId, projects, tasks
 */
export function updateCompWindow(ctx) {
  const selectedProjectId = typeof window.selectedProjectId !== 'undefined' ? window.selectedProjectId : null;
  if (!selectedProjectId) return;
  
  const { projects, tasks } = ctx;
  const project = findProjectById(projects, selectedProjectId);
  if (!project) return;
  
  const projectTasks = filterTasksForProject(tasks || [], project.id, { excludeDeleted: true });
  
  // This function may need to call renderCompWindow or similar
  // For now, it's a placeholder that can be extended
  if (typeof window.renderCompWindow === 'function') {
    window.renderCompWindow(project, projectTasks);
  }
}

/**
 * Update task selected files (placeholder)
 * This can be used to show a preview of selected files if needed
 */
export function updateTaskSelectedFiles() {
  // This can be used to show a preview of selected files if needed
  // For now, the selection is handled in addTask
}
