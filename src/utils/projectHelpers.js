// ═══════════════════════ PROJECT HELPERS ═══════════════════════
// Utility functions for project data normalization and defaults

import { getDefaultLaneIds } from '../domain/schema.js';

/**
 * Returns default project brief structure
 */
export function defaultProjectBrief() {
  return {
    objective: '',
    hypothesis: '',
    keyOutputs: '',
    focus: '',
    definitionOfDone: '',
    nextMilestone: ''
  };
}

/**
 * Returns default project outputs structure
 */
export function defaultProjectOutputs() {
  return {
    figures: [],
    datasets: [],
    deliverables: []
  };
}

/**
 * Normalize list value (handles arrays or comma-separated strings)
 * @param {string|Array} value - Value to normalize
 * @returns {Array} Normalized array
 */
export function normalizeListValue(value) {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map(v => String(v || '').trim()).filter(Boolean);
  }
  return String(value)
    .split(',')
    .map(v => v.trim())
    .filter(Boolean);
}

/**
 * Normalize project ID value (handles string/number conversion)
 * @param {string|number} value - Project ID value to normalize
 * @returns {string|number} Normalized project ID (number if numeric, string otherwise)
 */
export function normalizeProjectIdValue(value) {
  if (value === undefined || value === null || value === '') return '';
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : String(value);
}

/**
 * Create default milestones from a project template
 * @param {string} templateId - Template ID
 * @returns {Array} Array of milestone objects
 */
export function defaultMilestonesFromTemplate(templateId) {
  const PROJECT_TEMPLATES = window.PROJECT_TEMPLATES || {};
  const template = PROJECT_TEMPLATES[templateId];
  if (!template || !template.milestones) return [];
  return template.milestones.map((title, idx) => ({
    id: Date.now() + idx + 1,
    title,
    done: false,
    linkedTaskIds: [],
    linkedFileIds: [],
    dueDate: ''
  }));
}

/**
 * Normalize project structure to ensure all fields exist
 * @param {Object} project - Project object to normalize
 * @returns {Object} Normalized project object
 */
export function normalizeProjectStructure(project) {
  const normalized = { ...project };
  const brief = project.brief || {};
  const outputs = project.outputs || {};
  
  normalized.brief = {
    objective: brief.objective || project.briefObjective || '',
    hypothesis: brief.hypothesis || project.briefHypothesis || '',
    keyOutputs: brief.keyOutputs || project.briefKeyOutputs || '',
    focus: brief.focus || project.briefFocus || '',
    definitionOfDone: brief.definitionOfDone || '',
    nextMilestone: brief.nextMilestone || ''
  };
  
  normalized.outputs = {
    figures: normalizeListValue(outputs.figures || project.outputFigures),
    datasets: normalizeListValue(outputs.datasets || project.outputDatasets),
    deliverables: normalizeListValue(outputs.deliverables || project.outputDeliverables)
  };
  
  normalized.milestones = Array.isArray(project.milestones) ? project.milestones.map((ms, idx) => ({
    id: ms.id || Date.now() + idx + 1,
    title: ms.title || '',
    dueDate: ms.dueDate || '',
    linkedTaskIds: Array.isArray(ms.linkedTaskIds) ? ms.linkedTaskIds : [],
    linkedFileIds: Array.isArray(ms.linkedFileIds) ? ms.linkedFileIds : [],
    done: !!ms.done
  })).filter(ms => ms.title) : [];
  
  normalized.workflowLanes = Array.isArray(project.workflowLanes) && project.workflowLanes.length
    ? project.workflowLanes.filter(l => getDefaultLaneIds().includes(l))
    : getDefaultLaneIds();
  
  normalized.templateId = project.templateId || '';
  normalized.checkpoints = Array.isArray(project.checkpoints) ? project.checkpoints : [];
  
  // Productivity fields
  normalized.currentFocus = project.currentFocus || '';
  normalized.nextAction = project.nextAction || '';
  normalized.workingLog = Array.isArray(project.workingLog) ? project.workingLog : [];
  
  // Cell Log (lightweight cell tracking)
  normalized.cellLog = Array.isArray(project.cellLog) ? project.cellLog : [];
  
  // Artifacts - the center of gravity (figure, dataset, build, protocol, manuscript)
  normalized.artifacts = Array.isArray(project.artifacts) ? project.artifacts.map((art, idx) => ({
    id: art.id || Date.now() + idx + 1,
    name: art.name || '',
    type: art.type || 'figure', // figure | dataset | build | protocol | manuscript
    description: art.description || '',
    notes: art.notes || '',
    fileIds: Array.isArray(art.fileIds) ? art.fileIds : [],
    subtasks: Array.isArray(art.subtasks) ? art.subtasks : [], // taskIds belonging to this artifact
    versionHistory: Array.isArray(art.versionHistory) ? art.versionHistory : [],
    status: art.status || 'draft', // draft | active | finalized | archived
    createdAt: art.createdAt || Date.now(),
    updatedAt: art.updatedAt || Date.now()
  })) : [];
  
  // Protocol Runs - multi-day experiments (dECM digestion, etc.)
  normalized.protocolRuns = Array.isArray(project.protocolRuns) ? project.protocolRuns.map((run, idx) => ({
    id: run.id || Date.now() + idx + 1,
    protocolName: run.protocolName || '',
    startDate: run.startDate || '',
    expectedEndDate: run.expectedEndDate || '',
    status: run.status || 'active', // active | paused | completed
    linkedArtifactId: run.linkedArtifactId || null,
    dailyLog: Array.isArray(run.dailyLog) ? run.dailyLog : [],
    subtasks: Array.isArray(run.subtasks) ? run.subtasks : [], // taskIds belonging to this protocol run
    createdAt: run.createdAt || Date.now(),
    updatedAt: run.updatedAt || Date.now()
  })) : [];
  
  // Ensure files have version tracking fields
  if (normalized.files && Array.isArray(normalized.files)) {
    normalized.files = normalized.files.map((file, idx) => {
      const fileObj = typeof file === 'string' ? { abs_path: file, label: file } : file;
      return {
        ...fileObj,
        id: fileObj.id || ('file-' + normalized.id + '-' + idx),
        isCurrent: fileObj.isCurrent !== undefined ? fileObj.isCurrent : true,
        supersedes: fileObj.supersedes || null,
        notes: fileObj.notes || '',
        description: fileObj.description || '',
        whatChanged: fileObj.whatChanged || '',
        whyExists: fileObj.whyExists || '',
        dependsOn: fileObj.dependsOn || [],
        version: fileObj.version || '1.0',
        createdAt: fileObj.createdAt || Date.now(),
        updatedAt: fileObj.updatedAt || Date.now()
      };
    });
  }
  
  return normalized;
}

/**
 * Normalize all projects data (uses store if available)
 */
export function normalizeProjectsData() {
  const store = window.Petal?.store;
  if (!store) {
    console.warn('Store not available for normalizeProjectsData');
    return;
  }
  
  const state = store.getState();
  const projects = state.projects || [];
  
  const normalized = projects.map(p => normalizeProjectStructure(p));
  
  // Update store if projects changed
  if (JSON.stringify(projects) !== JSON.stringify(normalized)) {
    store.setState({ projects: normalized });
  }
}

/**
 * Get workflow lanes display text
 * @param {Object} project - Project object
 * @returns {string} HTML string for workflow lanes display
 */
export function getWorkflowLanesDisplay(project) {
  const lanes = project.workflowLanes || [];
  if (lanes.length === 0) {
    return '<div style="font-size:11px;color:var(--text-dim);">All lanes allowed</div>';
  }
  const labels = { lab: '🧪 Lab', comp: '💻 Comp', writing: '📝 Writing', presentation: '📊 Presentation' };
  return '<div style="font-size:11px;color:var(--text);">' + lanes.map(l => labels[l] || l).join(' • ') + '</div>';
}

/**
 * Toggle workflow lanes edit mode
 * @param {number|string} projectId - Project ID
 */
export function toggleWorkflowLanesEdit(projectId) {
  const displayEl = document.getElementById(`workflow-lanes-display-${projectId}`);
  const editEl = document.getElementById(`workflow-lanes-edit-${projectId}`);
  if (displayEl && editEl) {
    displayEl.style.display = 'none';
    editEl.style.display = 'block';
  }
}

/**
 * Cancel workflow lanes edit
 * @param {number|string} projectId - Project ID
 */
export function cancelWorkflowLanesEdit(projectId) {
  const displayEl = document.getElementById(`workflow-lanes-display-${projectId}`);
  const editEl = document.getElementById(`workflow-lanes-edit-${projectId}`);
  if (displayEl && editEl) {
    displayEl.style.display = 'block';
    editEl.style.display = 'none';
  }
}

/**
 * Save workflow lanes for a project
 * @param {Object} ctx - Page context with projects, tasks, save, rerenderViewIfActive
 * @param {number|string} projectId - Project ID
 */
export async function saveWorkflowLanes(ctx, projectId) {
  const { projects, tasks, save, rerenderViewIfActive } = ctx;
  
  const project = projects.find(p => p.id === projectId);
  if (!project) return;
  
  const workflowLanes = [];
  const labCheckbox = document.getElementById(`edit-workflow-lab-${projectId}`);
  const compCheckbox = document.getElementById(`edit-workflow-comp-${projectId}`);
  const writingCheckbox = document.getElementById(`edit-workflow-writing-${projectId}`);
  const presentationCheckbox = document.getElementById(`edit-workflow-presentation-${projectId}`);
  
  if (labCheckbox && labCheckbox.checked) workflowLanes.push('lab');
  if (compCheckbox && compCheckbox.checked) workflowLanes.push('comp');
  if (writingCheckbox && writingCheckbox.checked) workflowLanes.push('writing');
  if (presentationCheckbox && presentationCheckbox.checked) workflowLanes.push('presentation');
  
  project.workflowLanes = workflowLanes.length > 0 ? workflowLanes : null;
  
  // Update any tasks that are assigned to lanes not in the new list
  (tasks || []).filter(t => String(t.projectId) === String(projectId)).forEach(t => {
    if (t.lane && workflowLanes.length > 0 && !workflowLanes.includes(t.lane)) {
      t.lane = null;
      t.stage = null;
    }
  });
  
  if (save) {
    await save();
  }
  
  // Re-render projects view if visible
  if (rerenderViewIfActive) {
    await rerenderViewIfActive('projects');
  }
}

// Expose globally for backward compatibility
window.defaultProjectBrief = defaultProjectBrief;
window.defaultProjectOutputs = defaultProjectOutputs;
window.normalizeListValue = normalizeListValue;
window.normalizeProjectIdValue = normalizeProjectIdValue;
window.defaultMilestonesFromTemplate = defaultMilestonesFromTemplate;
window.normalizeProjectStructure = normalizeProjectStructure;
window.normalizeProjectsData = normalizeProjectsData;
window.getWorkflowLanesDisplay = getWorkflowLanesDisplay;
window.toggleWorkflowLanesEdit = toggleWorkflowLanesEdit;
window.cancelWorkflowLanesEdit = cancelWorkflowLanesEdit;
window.saveWorkflowLanes = saveWorkflowLanes;