// ═══════════════════════ PROJECT HELPERS ═══════════════════════
// Utility functions for project data normalization and migration

/**
 * Default project brief structure
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
 * Default project outputs structure
 */
export function defaultProjectOutputs() {
  return {
    figures: [],
    datasets: [],
    deliverables: []
  };
}

/**
 * Normalize list value (string or array) to array
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
 */
export function normalizeProjectIdValue(value) {
  if (value === undefined || value === null || value === '') return '';
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : String(value);
}

/**
 * Normalize project structure to ensure all fields exist
 */
export function normalizeProjectStructure(project, PROJECT_TEMPLATES = {}) {
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
    ? project.workflowLanes.filter(l => ['lab', 'comp', 'writing'].includes(l))
    : ['lab', 'comp', 'writing'];
  
  normalized.templateId = project.templateId || '';
  normalized.checkpoints = Array.isArray(project.checkpoints) ? project.checkpoints : [];
  
  // Productivity fields
  normalized.currentFocus = project.currentFocus || '';
  normalized.nextAction = project.nextAction || '';
  normalized.workingLog = Array.isArray(project.workingLog) ? project.workingLog : [];
  
  // Cell Log
  normalized.cellLog = Array.isArray(project.cellLog) ? project.cellLog : [];
  
  // Artifacts
  normalized.artifacts = Array.isArray(project.artifacts) ? project.artifacts.map((art, idx) => ({
    id: art.id || Date.now() + idx + 1,
    name: art.name || '',
    type: art.type || 'figure',
    description: art.description || '',
    notes: art.notes || '',
    fileIds: Array.isArray(art.fileIds) ? art.fileIds : [],
    subtasks: Array.isArray(art.subtasks) ? art.subtasks : [],
    versionHistory: Array.isArray(art.versionHistory) ? art.versionHistory : [],
    status: art.status || 'draft',
    createdAt: art.createdAt || Date.now(),
    updatedAt: art.updatedAt || Date.now()
  })) : [];
  
  // Protocol Runs
  normalized.protocolRuns = Array.isArray(project.protocolRuns) ? project.protocolRuns.map((run, idx) => ({
    id: run.id || Date.now() + idx + 1,
    protocolName: run.protocolName || '',
    startDate: run.startDate || '',
    expectedEndDate: run.expectedEndDate || '',
    status: run.status || 'active',
    linkedArtifactId: run.linkedArtifactId || null,
    dailyLog: Array.isArray(run.dailyLog) ? run.dailyLog : [],
    subtasks: Array.isArray(run.subtasks) ? run.subtasks : [],
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
 * Get default milestones from template
 */
export function defaultMilestonesFromTemplate(templateId, PROJECT_TEMPLATES = {}) {
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
