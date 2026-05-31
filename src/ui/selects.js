// ═══════════════════════ SELECT DROPDOWN UTILITIES ═══════════════════════
// Functions for populating and updating select dropdowns

import { esc } from '../utils/strings.js';
import { getDefaultLaneIds } from '../domain/schema.js';
import { findProjectById } from '../utils/projectHelpers.js';

/**
 * Normalize project ID value (handles string/number conversion)
 */
function normalizeProjectIdValue(value) {
  if (value === undefined || value === null || value === '') return '';
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : String(value);
}

/**
 * Refresh project select dropdowns throughout the app
 * Reads from store only (single source of truth)
 */
export function refreshProjectSelects() {
  try {
    const store = window.Petal?.store;
    if (!store) {
      console.error('❌ refreshProjectSelects: Store not available!');
      return;
    }
    
    const state = store.getState();
    console.log('🔍 DEBUG projects snapshot (refreshProjectSelects):', {
      storeProjects: state.projects?.length || 0,
      storeProjectIds: (state.projects || []).map(p => p.id)
    });
    
    // Phase 3: Read ONLY from store (single source of truth)
    const projectsFromStore = state.projects || [];
    
    // Update project selects
    document.querySelectorAll('#in-project, #pr-project').forEach(sel => {
      if (!sel) return;
      const current = sel.value;
      sel.innerHTML = '<option value="">No project</option>';
      projectsFromStore.filter(p => !p.done).forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = p.name;
        sel.appendChild(opt);
      });
      if (current) sel.value = current;
    });

    // Update cell log project select
    const cellLogProjectSelect = document.getElementById('cell-log-project-select');
    if (cellLogProjectSelect) {
      const selected = cellLogProjectSelect.value;
      cellLogProjectSelect.innerHTML = '<option value="">No project</option>' +
        projectsFromStore.filter(p => !p.done).map((p) => `<option value="${p.id}">${esc(p.name)}</option>`).join('');
      if (selected) {
        cellLogProjectSelect.value = projectsFromStore.some((p) => String(p.id) === selected) ? selected : '';
      }
    }
    
    // Update lane options and project files select
    updateLaneOptions();
    updateProjectFilesSelect();

    // Also populate depends-on dropdown (use tasks from store)
    const tasksFromStore = state.tasks || [];
    document.querySelectorAll('#in-depends-on').forEach(sel => {
      if (!sel) return;
      const current = sel.value;
      sel.innerHTML = '<option value="">None</option>';
      tasksFromStore.filter(t => !t.done).forEach(t => {
        const opt = document.createElement('option');
        opt.value = t.id;
        opt.textContent = t.title;
        sel.appendChild(opt);
      });
      if (current) sel.value = current;
    });
  } catch (e) {
    console.error('❌ refreshProjectSelects crashed:', e);
    console.error('Stack:', e?.stack);
  }
}

/**
 * Update lane options based on selected project
 */
export function updateLaneOptions() {
  const projectSelect = document.getElementById('in-project');
  const laneSelect = document.getElementById('in-lane');
  if (!projectSelect || !laneSelect) return;
  
  const projectId = projectSelect.value;
  const currentLane = laneSelect.value;
  
  const store = window.Petal?.store;
  const state = store?.getState() || {};
  const projects = state.projects || [];
  
  if (!projectId) {
    // No project selected - show all lanes
    laneSelect.innerHTML = `
      <option value="">None</option>
      <option value="lab">🧪 Lab</option>
      <option value="comp">💻 Computational</option>
      <option value="writing">📝 Writing</option>
      <option value="presentation">📊 Presentation</option>
      <option value="personal">👤 Personal</option>
      <option value="product">🚀 Product</option>
    `;
  } else {
    const project = projects.find(p => String(p.id) === String(projectId));
    const allowedLanes = project?.workflowLanes || getDefaultLaneIds();
    
    const laneLabels = {
      lab: '🧪 Lab',
      comp: '💻 Computational',
      writing: '📝 Writing',
      presentation: '📊 Presentation',
      personal: '👤 Personal',
      product: '🚀 Product'
    };
    
    laneSelect.innerHTML = '<option value="">None</option>' +
      allowedLanes.map(lane => `<option value="${lane}">${laneLabels[lane]}</option>`).join('');
  }
  
  // Restore current selection if still valid
  if (currentLane && Array.from(laneSelect.options).some(opt => opt.value === currentLane)) {
    laneSelect.value = currentLane;
  } else {
    laneSelect.value = '';
  }
}

/**
 * Update project files select dropdown when project is selected (for add task form)
 */
export function updateProjectFilesSelect() {
  const projectSelect = document.getElementById('in-project');
  const filesSelectContainer = document.getElementById('task-project-files-select-container');
  const filesSelect = document.getElementById('task-project-files-select');
  
  if (!projectSelect || !filesSelectContainer || !filesSelect) return;
  
  const projectId = normalizeProjectIdValue(projectSelect.value || '');
  
  const store = window.Petal?.store;
  const state = store?.getState() || {};
  const projects = state.projects || [];
  
  if (!projectId) {
    filesSelectContainer.style.display = 'none';
    filesSelect.innerHTML = '<option value="" disabled>Select project files to link...</option>';
    return;
  }
  
  const project = findProjectById(projects, projectId);
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

// Expose globally for backward compatibility
window.refreshProjectSelects = refreshProjectSelects;
window.updateLaneOptions = updateLaneOptions;
window.updateProjectFilesSelect = updateProjectFilesSelect;
