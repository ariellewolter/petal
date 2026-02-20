// ═══════════════════════ UI HELPERS ═══════════════════════
// Helper functions for UI updates (dropdowns, selects, etc.)

import { esc } from '../utils/strings.js';
import { normalizeProjectIdValue } from '../utils/projectHelpers.js';

/**
 * Refresh all project select dropdowns
 */
export function refreshProjectSelects(state) {
  const { tasks, projects } = state;
  
  // Refresh project selects
  document.querySelectorAll('#in-project, #pr-project').forEach(sel => {
    if (!sel) return;
    const current = sel.value;
    sel.innerHTML = '<option value="">No project</option>';
    (projects || []).filter(p => !p.done).forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = p.name;
      sel.appendChild(opt);
    });
    if (current) sel.value = current;
  });

  const cellLogProjectSelect = document.getElementById('cell-log-project-select');
  if (cellLogProjectSelect) {
    const selected = cellLogProjectSelect.value;
    cellLogProjectSelect.innerHTML = '<option value="">No project</option>' +
      (projects || []).filter(p => !p.done).map((p) => `<option value="${p.id}">${esc(p.name)}</option>`).join('');
    if (selected) {
      cellLogProjectSelect.value = (projects || []).some((p) => String(p.id) === selected) ? selected : '';
    }
  }
  
  // Update lane options based on selected project
  updateLaneOptions(state);
  
  // Update project files select if a project is selected
  updateProjectFilesSelect(state);
  
  // Refresh dependency selects
  document.querySelectorAll('#in-depends-on').forEach(sel => {
    if (!sel) return;
    const current = sel.value;
    sel.innerHTML = '<option value="">None</option>';
    (tasks || []).filter(t => !t.done).forEach(t => {
      const opt = document.createElement('option');
      opt.value = t.id;
      opt.textContent = t.title;
      sel.appendChild(opt);
    });
    if (current) sel.value = current;
  });
}

/**
 * Update lane options based on selected project
 */
export function updateLaneOptions(state) {
  const { projects } = state;
  const projectSelect = document.getElementById('in-project');
  const laneSelect = document.getElementById('in-lane');
  
  if (!projectSelect || !laneSelect) return;
  
  const projectId = normalizeProjectIdValue(projectSelect.value || '');
  
  if (!projectId) {
    // No project selected - show all lanes
    laneSelect.innerHTML = `
      <option value="">None</option>
      <option value="lab">🧪 Lab</option>
      <option value="comp">💻 Computational</option>
      <option value="writing">📝 Writing</option>
      <option value="presentation">📊 Presentation</option>
    `;
    return;
  }
  
  const project = (projects || []).find(p => String(p.id) === String(projectId));
  if (!project) return;
  
  const lanes = project.workflowLanes || ['lab', 'comp', 'writing'];
  const current = laneSelect.value;
  
  laneSelect.innerHTML = '<option value="">None</option>';
  if (lanes.includes('lab')) {
    laneSelect.appendChild(new Option('🧪 Lab', 'lab'));
  }
  if (lanes.includes('comp')) {
    laneSelect.appendChild(new Option('💻 Computational', 'comp'));
  }
  if (lanes.includes('writing')) {
    laneSelect.appendChild(new Option('📝 Writing', 'writing'));
  }
  if (lanes.includes('presentation')) {
    laneSelect.appendChild(new Option('📊 Presentation', 'presentation'));
  }
  
  if (current && lanes.includes(current)) {
    laneSelect.value = current;
  }
}

/**
 * Update project files select dropdown when project is selected
 */
export function updateProjectFilesSelect(state) {
  const { projects } = state;
  const projectSelect = document.getElementById('in-project');
  const filesSelectContainer = document.getElementById('task-project-files-select-container');
  const filesSelect = document.getElementById('task-project-files-select');
  
  if (!projectSelect || !filesSelectContainer || !filesSelect) return;
  
  const projectId = normalizeProjectIdValue(projectSelect.value || '');
  
  if (!projectId) {
    filesSelectContainer.style.display = 'none';
    filesSelect.innerHTML = '<option value="" disabled>Select project files to link...</option>';
    return;
  }
  
  const project = (projects || []).find(p => String(p.id) === String(projectId));
  if (!project || !project.files || project.files.length === 0) {
    filesSelectContainer.style.display = 'none';
    filesSelect.innerHTML = '<option value="" disabled>No files in this project yet</option>';
    return;
  }
  
  // Show the select and populate with project files
  filesSelectContainer.style.display = 'block';
  filesSelect.innerHTML = '<option value="" disabled>Select project files to link...</option>';
  
  // Add project files (excluding deleted)
  project.files.filter(f => f && !f.deletedAt).forEach(file => {
    const option = document.createElement('option');
    option.value = file.id;
    option.textContent = file.label || file.name || 'Unnamed file';
    filesSelect.appendChild(option);
  });
}

/**
 * Update project files select in edit modal
 */
export function updateEditModalProjectFiles(projectId, currentFileIds = [], state) {
  const { projects } = state;
  const filesSection = document.getElementById('edit-project-files-section');
  const filesSelect = document.getElementById('edit-project-files-select');
  
  if (!filesSection || !filesSelect) return;
  
  if (!projectId) {
    filesSection.style.display = 'none';
    filesSelect.innerHTML = '<option value="" disabled>Select project files to link...</option>';
    return;
  }
  
  const project = (projects || []).find(p => String(p.id) === String(projectId));
  if (!project || !project.files || project.files.length === 0) {
    filesSection.style.display = 'none';
    filesSelect.innerHTML = '<option value="" disabled>No files in this project yet</option>';
    return;
  }
  
  filesSection.style.display = 'block';
  filesSelect.innerHTML = '<option value="" disabled>Select project files to link...</option>';
  
  project.files.filter(f => f && !f.deletedAt).forEach(file => {
    const option = document.createElement('option');
    option.value = file.id;
    option.textContent = file.label || file.name || 'Unnamed file';
    option.selected = currentFileIds.includes(file.id);
    filesSelect.appendChild(option);
  });
}
