// ═══════════════════════ STATE VALIDATION ═══════════════════════
// Lightweight validation for migration safety

import { SCHEMA_VERSION } from './schema.js';

/**
 * Validate state structure (for dev mode safety checks)
 */
export function validateState(state) {
  const errors = [];
  
  // Check required top-level keys
  const requiredKeys = ['tasks', 'projects', 'openProjects', 'settings'];
  requiredKeys.forEach(key => {
    if (!(key in state)) {
      errors.push(`Missing required key: ${key}`);
    }
  });
  
  // Validate tasks array
  if (Array.isArray(state.tasks)) {
    state.tasks.forEach((task, idx) => {
      if (!task.id) errors.push(`Task at index ${idx} missing id`);
      if (!task.title) errors.push(`Task at index ${idx} missing title`);
    });
  } else {
    errors.push('tasks must be an array');
  }
  
  // Validate projects array
  if (Array.isArray(state.projects)) {
    state.projects.forEach((project, idx) => {
      if (!project.id) errors.push(`Project at index ${idx} missing id`);
      if (!project.name) errors.push(`Project at index ${idx} missing name`);
    });
  } else {
    errors.push('projects must be an array');
  }
  
  // Validate openProjects is Set-like
  if (!(state.openProjects instanceof Set) && !Array.isArray(state.openProjects)) {
    errors.push('openProjects must be a Set or Array');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate loaded state from storage
 */
export function validateLoadedState(data) {
  const errors = [];
  
  if (!data) {
    return { valid: false, errors: ['No data provided'] };
  }
  
  // Check for required keys
  if (!data.tasks) errors.push('Missing tasks array');
  if (!data.projects) errors.push('Missing projects array');
  
  // Validate schema version if present
  if (data.schema_version && data.schema_version !== SCHEMA_VERSION) {
    console.warn(`Schema version mismatch: ${data.schema_version} vs ${SCHEMA_VERSION}`);
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Normalize state (fix common issues, set defaults)
 */
export function normalizeState(state) {
  return {
    tasks: Array.isArray(state.tasks) ? state.tasks : [],
    projects: Array.isArray(state.projects) ? state.projects : [],
    openProjects: state.openProjects instanceof Set 
      ? state.openProjects 
      : new Set(Array.isArray(state.openProjects) ? state.openProjects : []),
    settings: state.settings || {},
    fileRegistry: state.fileRegistry || {},
    fileHistory: state.fileHistory || {}
  };
}
