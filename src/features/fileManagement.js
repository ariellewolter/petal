// ═══════════════════════ FILE MANAGEMENT ═══════════════════════
// Shared file management functions used across multiple tabs

import { esc, fileIcon } from '../utils/strings.js';
import { openFile } from '../utils/fileHelpers.js';
import { findProjectById, projectIdsMatch } from '../utils/projectHelpers.js';
import { idsMatch } from '../utils/ids.js';

// File status options
export const FILE_STATUSES = {
  'draft': 'Draft',
  'needs-revision': 'Needs Revision',
  'submitted': 'Submitted',
  'accepted': 'Accepted',
  'archived': 'Archived',
  'raw': 'Raw',
  'analyzed': 'Analyzed',
  'figure-ready': 'Figure Ready',
  'written': 'Written'
};

/** Resolve tasks/projects from store when ctx omits them */
function resolveFileContext(ctx) {
  const storeState = window.Petal?.store?.getState() || {};
  return {
    tasks: ctx?.tasks ?? storeState.tasks ?? [],
    projects: ctx?.projects ?? storeState.projects ?? [],
    save: ctx?.save ?? (typeof window.save === 'function' ? window.save : undefined),
    currentView: ctx?.currentView ?? storeState.currentView,
    fileRegistry: ctx?.fileRegistry ?? storeState.fileRegistry ?? {}
  };
}

/** Persist file registry and optionally tasks/projects (authoritative for save pipeline) */
function persistFileChanges(fileRegistry, tasks, projects, needsSourceUpdate) {
  if (!window.Petal?.store) return;
  const patch = { fileRegistry: { ...fileRegistry } };
  if (needsSourceUpdate) {
    patch.tasks = tasks.map(t => ({ ...t, files: t.files ? t.files.map(f => ({ ...f })) : t.files }));
    patch.projects = projects.map(p => ({
      ...p,
      files: p.files ? p.files.map(f => ({ ...f })) : p.files,
      subtasks: p.subtasks
        ? p.subtasks.map(st => ({
            ...st,
            files: st.files ? st.files.map(f => ({ ...f })) : st.files
          }))
        : p.subtasks
    }));
  }
  window.Petal.store.setState(patch);
}

// Cache for buildFileRegistry to avoid unnecessary rebuilds
// Uses updatedAt timestamps for bulletproof invalidation
let lastRegistryBuild = {
  cacheKey: null,
  registry: null,
  buildTime: null,
  result: null // Store full result for re-entrancy guard
};

// Phase 3 Fix: Re-entrancy guard to prevent render → setState → render loops
let _buildingRegistry = false;

// Debug mode flag (set via window.Petal.debug = true)
const DEBUG_MODE = typeof window !== 'undefined' && window.Petal?.debug === true;

// Performance metrics (debug only)
const metrics = {
  buildFileRegistry: { calls: 0, cacheHits: 0, cacheMisses: 0, totalTime: 0 },
  updateFileStatus: { calls: 0, tasksTouched: 0, projectsTouched: 0 }
};

/**
 * Helper: Get file key for registry
 */
function getFileKey(fileLink) {
  return fileLink.onedrive_rel || fileLink.abs_path || fileLink.share_url || JSON.stringify(fileLink);
}

/**
 * Compute cache key from tasks/projects using updatedAt timestamps
 * This is bulletproof: cache invalidates whenever any task/project changes
 * Format: tasks.length_maxTasksUpdatedAt_projects.length_maxProjectsUpdatedAt
 */
/**
 * Phase 3 Fix: Cheaper cache key - uses IDs + updatedAt only (no deep traversal)
 * Prevents expensive stringification during recursion
 * Format: tasks.length#projects.length#taskIds#projectIds
 */
function computeCacheKey(tasks, projects) {
  // Use IDs + updatedAt only (fast, non-recursive)
  const tKey = (tasks || []).map(t => `${t.id}:${t.updatedAt || t.createdAt || 0}`).join('|');
  const pKey = (projects || []).map(p => `${p.id}:${p.updatedAt || p.createdAt || 0}:${(p.subtasks?.length || 0)}`).join('|');
  return `${(tasks || []).length}#${(projects || []).length}#${tKey}#${pKey}`;
}

/**
 * Build file registry from all tasks and projects (FULL REBUILD)
 * Used for consistency checks and when cache is invalid
 * This rebuilds from scratch to ensure no ghost references
 */
function buildFileRegistryFull(tasks, projects, existingRegistry, fileHistory) {
  const startTime = DEBUG_MODE ? performance.now() : 0;
  
  // Preserve standalone files (files not linked to tasks/projects)
  const standaloneFiles = {};
  if (existingRegistry) {
    Object.keys(existingRegistry).forEach(key => {
      const file = existingRegistry[key];
      // Preserve if it's marked as standalone OR if it has no tasks/projects
      if (file.standalone || ((!file.tasks || file.tasks.length === 0) && (!file.projects || file.projects.length === 0))) {
        standaloneFiles[key] = { ...file, standalone: true };
      }
    });
  }
  
  // Start fresh but preserve standalone files
  const fileRegistry = { ...standaloneFiles };
  
  // Scan tasks - rebuild reverse index from source truth
  if (tasks) {
    tasks.forEach(task => {
      if (task.files && task.files.length) {
        task.files.forEach(fileLink => {
          const key = getFileKey(fileLink);
          if (!fileRegistry[key]) {
            fileRegistry[key] = {
              ...fileLink,
              key,
              status: fileLink.status || 'draft',
              tasks: [],
              projects: [],
              lastOpened: fileHistory?.[key]?.lastOpened || null,
              submissionMeta: fileLink.submissionMeta || null
            };
          }
          // Rebuild from source: check if this task is already referenced
          const existingTask = fileRegistry[key].tasks.find(t => t.id === task.id);
          if (!existingTask) {
            fileRegistry[key].tasks.push({
              id: task.id,
              title: task.title,
              status: task.status,
              done: task.done,
              projectId: task.projectId
            });
          }
        });
      }
    });
  }
  
  // Scan projects - rebuild reverse index from source truth
  if (projects) {
    projects.forEach(project => {
      if (project.files && project.files.length) {
        project.files.forEach(fileLink => {
          const key = getFileKey(fileLink);
          if (!fileRegistry[key]) {
            fileRegistry[key] = {
              ...fileLink,
              key,
              status: fileLink.status || 'draft',
              tasks: [],
              projects: [],
              lastOpened: fileHistory?.[key]?.lastOpened || null,
              submissionMeta: fileLink.submissionMeta || null
            };
          }
          // Rebuild from source: check if this project is already referenced
          const existingProject = fileRegistry[key].projects.find(p => projectIdsMatch(p.id, project.id));
          if (!existingProject) {
            fileRegistry[key].projects.push({
              id: project.id,
              name: project.name,
              done: project.done
            });
          }
        });
      }
      
      // Scan subtasks - rebuild from source truth
      if (project.subtasks && project.subtasks.length > 0) {
        project.subtasks.forEach(subtask => {
          if (subtask.files && subtask.files.length) {
            subtask.files.forEach(fileLink => {
              const key = getFileKey(fileLink);
              if (!fileRegistry[key]) {
                fileRegistry[key] = {
                  ...fileLink,
                  key,
                  status: fileLink.status || 'draft',
                  tasks: [],
                  projects: [],
                  lastOpened: fileHistory?.[key]?.lastOpened || null,
                  submissionMeta: fileLink.submissionMeta || null
                };
              }
              // Rebuild from source: check if this subtask is already referenced
              const existingTask = fileRegistry[key].tasks.find(t => t.id === subtask.id);
              if (!existingTask) {
                fileRegistry[key].tasks.push({
                  id: subtask.id,
                  title: subtask.title,
                  status: 'subtask',
                  done: subtask.done,
                  projectId: project.id,
                  isSubtask: true
                });
              }
            });
          }
        });
      }
    });
  }
  
  // Remove ghost references: any file in registry that's no longer referenced
  // This ensures we don't accumulate stale entries
  Object.keys(fileRegistry).forEach(key => {
    const file = fileRegistry[key];
    // If not standalone and has no references, it might be a ghost
    // But we preserve it if it has metadata (lastOpened, etc.) - user might reattach
    if (!file.standalone && 
        (!file.tasks || file.tasks.length === 0) && 
        (!file.projects || file.projects.length === 0) &&
        !fileHistory?.[key]?.lastOpened) {
      // True ghost - no references and no history, safe to remove
      delete fileRegistry[key];
    }
  });
  
  if (DEBUG_MODE) {
    const duration = performance.now() - startTime;
    metrics.buildFileRegistry.totalTime += duration;
    metrics.buildFileRegistry.cacheMisses++;
  }
  
  return fileRegistry;
}

/**
 * Build file registry from all tasks and projects
 * OPTIMIZED: Uses updatedAt-based cache invalidation (bulletproof)
 * Guarantees: Always returns valid registry, never undefined
 * 
 * Phase 3 Fix: Pure function when called from render (no setState during render)
 * @param {Object} ctx - Context with tasks, projects, fileRegistry, fileHistory
 * @param {Object} options - Options object
 * @param {boolean} options.commit - If true, commit to store (default: false for render calls)
 */
export function buildFileRegistry(ctx, options = {}) {
  const { commit = false } = options;
  const startTime = DEBUG_MODE ? performance.now() : 0;
  metrics.buildFileRegistry.calls++;
  
  // Phase 3 Fix: Re-entrancy guard (prevents render loops)
  if (_buildingRegistry) {
    console.warn('[Registry] Re-entrancy detected - returning cached result');
    return lastRegistryBuild?.result || { fileRegistry: {}, fileHistory: {} };
  }
  
  _buildingRegistry = true;
  try {
    // Defensive: ensure ctx has required fields
    const { tasks = [], projects = [], fileRegistry: registry, fileHistory: history = {} } = ctx || {};
    
    // Compute cache key using updatedAt timestamps (bulletproof invalidation)
    const cacheKey = computeCacheKey(tasks, projects);
    
    // Cache check: if cache key matches, return cached registry
    if (lastRegistryBuild.cacheKey === cacheKey && lastRegistryBuild.registry) {
      if (DEBUG_MODE) {
        metrics.buildFileRegistry.cacheHits++;
        const duration = performance.now() - startTime;
        console.log(`[Registry] Cache HIT (${duration.toFixed(2)}ms)`);
      }
      // Ensure we return valid objects
      const result = { 
        fileRegistry: lastRegistryBuild.registry || {}, 
        fileHistory: history || {} 
      };
      lastRegistryBuild.result = result; // Cache full result
      return result;
    }
  
  if (DEBUG_MODE) {
    metrics.buildFileRegistry.cacheMisses++;
    console.log(`[Registry] Cache MISS - rebuilding (key: ${cacheKey})`);
  }
  
  // Get existing registry from store (preferred source)
  let existingRegistry = registry || {};
  let fileHistory = history || {};
  
  if (typeof window !== 'undefined' && window.Petal?.store) {
    const state = window.Petal.store.getState();
    if (state.fileRegistry && Object.keys(state.fileRegistry).length > 0) {
      existingRegistry = state.fileRegistry;
    }
    if (state.fileHistory && Object.keys(state.fileHistory).length > 0) {
      fileHistory = state.fileHistory;
    }
  }
  
  // Full rebuild from source truth (prevents ghost references)
  const fileRegistry = buildFileRegistryFull(tasks, projects, existingRegistry, fileHistory);
  
    // GUARANTEE: Always return valid objects, never undefined
    const result = {
      fileRegistry: fileRegistry || {},
      fileHistory: fileHistory || {}
    };
    
    // Phase 3 Fix: Only commit to store when explicitly requested (not during render)
    // Use setEphemeralState to prevent triggering saves (fileRegistry/fileHistory are derived data)
    if (commit && typeof window !== 'undefined' && window.Petal?.store) {
      queueMicrotask(() => {
        // Use setEphemeralState to update without triggering persistence saves
        // fileRegistry/fileHistory are computed from tasks/projects, not persisted
        if (window.Petal.store.setEphemeralState) {
          window.Petal.store.setEphemeralState({
            fileRegistry: result.fileRegistry,
            fileHistory: result.fileHistory
          });
        } else {
          // Fallback: use setState (will trigger save, but better than nothing)
          window.Petal.store.setState({
            fileRegistry: result.fileRegistry,
            fileHistory: result.fileHistory
          });
        }
      });
    }
    
    // Update cache
    lastRegistryBuild = {
      cacheKey,
      registry: result.fileRegistry,
      buildTime: Date.now(),
      result // Cache full result for re-entrancy guard
    };
    
    if (DEBUG_MODE) {
      const duration = performance.now() - startTime;
      console.log(`[Registry] Rebuild complete (${duration.toFixed(2)}ms, ${Object.keys(result.fileRegistry).length} files, commit: ${commit})`);
    }
    
    return result;
  } finally {
    _buildingRegistry = false;
  }
}

/**
 * Registry consistency check (debug mode only)
 * Compares cached registry with full rebuild to detect drift
 */
export function checkRegistryConsistency(ctx) {
  if (!DEBUG_MODE) return { consistent: true };
  
  const { tasks = [], projects = [], fileHistory = {} } = ctx || {};
  const cached = lastRegistryBuild.registry || {};
  
  // Full rebuild
  const rebuilt = buildFileRegistryFull(tasks, projects, cached, fileHistory);
  
  // Compare keys
  const cachedKeys = new Set(Object.keys(cached));
  const rebuiltKeys = new Set(Object.keys(rebuilt));
  
  const missingInRebuilt = [...cachedKeys].filter(k => !rebuiltKeys.has(k));
  const extraInRebuilt = [...rebuiltKeys].filter(k => !cachedKeys.has(k));
  
  // Compare reference counts for each file
  const mismatches = [];
  [...cachedKeys, ...rebuiltKeys].forEach(key => {
    const cachedFile = cached[key];
    const rebuiltFile = rebuilt[key];
    
    if (!cachedFile || !rebuiltFile) return;
    
    const cachedTaskCount = cachedFile.tasks?.length || 0;
    const rebuiltTaskCount = rebuiltFile.tasks?.length || 0;
    const cachedProjectCount = cachedFile.projects?.length || 0;
    const rebuiltProjectCount = rebuiltFile.projects?.length || 0;
    
    if (cachedTaskCount !== rebuiltTaskCount || cachedProjectCount !== rebuiltProjectCount) {
      mismatches.push({
        key,
        cached: { tasks: cachedTaskCount, projects: cachedProjectCount },
        rebuilt: { tasks: rebuiltTaskCount, projects: rebuiltProjectCount }
      });
    }
  });
  
  const consistent = missingInRebuilt.length === 0 && 
                     extraInRebuilt.length === 0 && 
                     mismatches.length === 0;
  
  if (!consistent) {
    console.warn('[Registry Consistency] MISMATCH DETECTED:', {
      missingInRebuilt,
      extraInRebuilt,
      mismatches
    });
    // Auto-fix: replace cache with rebuilt version
    lastRegistryBuild.registry = rebuilt;
    console.log('[Registry Consistency] Cache replaced with rebuilt version');
  }
  
  return { consistent, missingInRebuilt, extraInRebuilt, mismatches };
}

/**
 * Track file open - validates existence and updates tracking
 */
export async function trackFileOpen(fileLink, ctx) {
  // First validate file existence (updates last known locations)
  await validateFileExistence(fileLink, ctx);
  
  // Defensive defaults: ensure fileRegistry and fileHistory are always objects
  // Try to get from store first (store-as-source-of-truth), then from ctx, then fallback
  let fileRegistry = {};
  let fileHistory = {};
  let save = null;
  
  // Try store first
  if (typeof window !== 'undefined' && window.Petal?.store) {
    const state = window.Petal.store.getState();
    fileRegistry = state.fileRegistry || {};
    fileHistory = state.fileHistory || {};
  }
  
  // Override with ctx if provided (but ensure they're objects)
  if (ctx) {
    if (ctx.fileRegistry) fileRegistry = ctx.fileRegistry;
    if (ctx.fileHistory) fileHistory = ctx.fileHistory;
    if (ctx.save) save = ctx.save;
  }
  
  // Final safety check: ensure they're objects, not undefined
  if (!fileRegistry || typeof fileRegistry !== 'object') {
    fileRegistry = {};
  }
  if (!fileHistory || typeof fileHistory !== 'object') {
    fileHistory = {};
  }
  
  const key = getFileKey(fileLink);
  
  // Update file history
  if (!fileHistory[key]) {
    fileHistory[key] = {};
  }
  fileHistory[key].lastOpened = Date.now();
  fileHistory[key].lastAccessed = Date.now();
  
  // Update file registry
  if (fileRegistry[key]) {
    fileRegistry[key].lastOpened = Date.now();
    fileRegistry[key].lastAccessed = Date.now();
  }
  
  // Update store if available (store-as-source-of-truth)
  if (typeof window !== 'undefined' && window.Petal?.store) {
    if (window.Petal.store.setEphemeralState) {
      window.Petal.store.setEphemeralState({
        fileHistory,
        fileRegistry
      });
    } else {
      window.Petal.store.setState({
        fileHistory,
        fileRegistry
      });
    }
  }
  
  // Call save if provided (for backward compatibility)
  if (save && typeof save === 'function') {
    await save();
  }
}

/**
 * Validate file existence and update status
 * Returns { exists: boolean, metadata: object|null, lastKnownPath: string|null }
 */
export async function validateFileExistence(fileLink, ctx) {
  if (!window.electronAPI || !window.electronAPI.getFileMetadata) {
    // Browser context - can't validate, assume exists if share_url present
    return {
      exists: !!fileLink.share_url,
      metadata: null,
      lastKnownPath: fileLink.share_url || fileLink.abs_path || fileLink.onedrive_rel || null
    };
  }
  
  // Ensure ctx and fileHistory are defined
  if (!ctx) {
    ctx = {};
  }
  let fileRegistry = {};
  let fileHistory = ctx.fileHistory || {};
  
  if (typeof window !== 'undefined' && window.Petal?.store) {
    const state = window.Petal.store.getState();
    fileRegistry = state.fileRegistry || {};
    fileHistory = state.fileHistory || fileHistory;
  }
  if (ctx?.fileRegistry) {
    fileRegistry = ctx.fileRegistry;
  }
  if (ctx?.fileHistory) {
    fileHistory = ctx.fileHistory;
  }
  
  const key = getFileKey(fileLink);
  const file = fileRegistry[key] || fileLink;
  
  try {
    const metadata = await window.electronAPI.getFileMetadata(fileLink);
    if (metadata.success && metadata.exists) {
      // File exists - update last known location and clear missing status
      if (!fileHistory[key]) {
        fileHistory[key] = {};
      }
      
      // Store last known good paths
      const resolvedPath = metadata.path || fileLink.abs_path || fileLink.onedrive_rel;
      if (resolvedPath) {
        fileHistory[key].lastResolvedPath = resolvedPath;
        fileHistory[key].lastSeenAt = Date.now();
        
        // Store last known paths for each type
        if (fileLink.abs_path) {
          fileHistory[key].abs_path_last_known = fileLink.abs_path;
        }
        if (fileLink.onedrive_rel) {
          fileHistory[key].onedrive_rel_last_known = fileLink.onedrive_rel;
        }
      }
      
      fileHistory[key].lastModified = metadata.lastModified;
      fileHistory[key].size = metadata.size;
      fileHistory[key].exists = true;
      fileHistory[key].missingSince = null;
      
      // Update file registry
      if (fileRegistry[key]) {
        fileRegistry[key].exists = true;
        fileRegistry[key].isMissing = false;
        fileRegistry[key].lastSeenAt = Date.now();
      }
      
      // Update store
      if (typeof window !== 'undefined' && window.Petal?.store) {
        if (window.Petal.store.setEphemeralState) {
          window.Petal.store.setEphemeralState({ fileHistory, fileRegistry });
        } else {
          window.Petal.store.setState({ fileHistory, fileRegistry });
        }
      }
      
      return {
        exists: true,
        metadata: metadata,
        lastKnownPath: resolvedPath
      };
    } else {
      // File doesn't exist - mark as missing but preserve last known location
      if (!fileHistory[key]) {
        fileHistory[key] = {};
      }
      
      // Preserve last known paths if not already set
      if (!fileHistory[key].abs_path_last_known && fileLink.abs_path) {
        fileHistory[key].abs_path_last_known = fileLink.abs_path;
      }
      if (!fileHistory[key].onedrive_rel_last_known && fileLink.onedrive_rel) {
        fileHistory[key].onedrive_rel_last_known = fileLink.onedrive_rel;
      }
      if (!fileHistory[key].lastResolvedPath) {
        fileHistory[key].lastResolvedPath = fileLink.abs_path || fileLink.onedrive_rel || fileLink.share_url;
      }
      
      // Mark as missing
      fileHistory[key].exists = false;
      if (!fileHistory[key].missingSince) {
        fileHistory[key].missingSince = Date.now();
      }
      
      // Update file registry
      if (fileRegistry[key]) {
        fileRegistry[key].exists = false;
        fileRegistry[key].isMissing = true;
      }
      
      // Update store
      if (typeof window !== 'undefined' && window.Petal?.store) {
        if (window.Petal.store.setEphemeralState) {
          window.Petal.store.setEphemeralState({ fileHistory, fileRegistry });
        } else {
          window.Petal.store.setState({ fileHistory, fileRegistry });
        }
      }
      
      return {
        exists: false,
        metadata: null,
        lastKnownPath: fileHistory[key].lastResolvedPath || fileLink.abs_path || fileLink.onedrive_rel || fileLink.share_url
      };
    }
  } catch (e) {
    console.error('Error validating file existence:', e);
    // On error, assume missing but preserve last known location
    return {
      exists: false,
      metadata: null,
      lastKnownPath: fileLink.abs_path || fileLink.onedrive_rel || fileLink.share_url || null
    };
  }
}

/**
 * Get file metadata from OS (legacy - now uses validateFileExistence)
 */
export async function refreshFileMetadata(fileLink, ctx) {
  const result = await validateFileExistence(fileLink, ctx);
  return result.exists ? result.metadata : null;
}

/**
 * Resolve fileIds to file objects from project registry
 */
export function resolveFileIds(projectId, fileIds, ctx) {
  const { projects } = ctx;
  
  if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
    return [];
  }
  
  const project = findProjectById(projects, projectId);
  if (!project || !project.files) {
    return [];
  }
  
  return fileIds
    .map(fileId => project.files.find(f => f && f.id != null && idsMatch(f.id, fileId)))
    .filter(f => f !== undefined && !f.deletedAt); // Filter out deleted files
}

/**
 * Get all files for a task (from fileIds, with fallback to legacy files)
 */
export function getTaskFiles(task, ctx) {
  if (!task) return [];
  
  const { projects } = ctx;
  
  // Prefer fileIds (canonical registry)
  if (task.fileIds && Array.isArray(task.fileIds) && task.fileIds.length > 0) {
    const resolved = resolveFileIds(task.projectId, task.fileIds, ctx);
    if (resolved.length > 0) {
      return resolved;
    }
  }
  
  // Fallback to legacy embedded files
  if (task.files && Array.isArray(task.files) && task.files.length > 0) {
    return task.files.map(f => typeof f === 'string' ? { abs_path: f, label: f } : f);
  }
  
  return [];
}

/**
 * Find or create a canonical file in project registry
 * Returns the file ID
 */
export function findOrCreateCanonicalFile(projectId, fileLink, ctx) {
  const { projects } = ctx;
  const project = findProjectById(projects, projectId);
  if (!project) {
    console.warn('Project not found:', projectId);
    return null;
  }
  
  if (!project.files) {
    project.files = [];
  }
  
  // Normalize fileLink to object
  const fileObj = typeof fileLink === 'string' 
    ? { abs_path: fileLink, label: fileLink }
    : fileLink;
  
  if (!fileObj || typeof fileObj !== 'object') {
    return null;
  }
  
  // Try to find existing file
  const existing = project.files.find(f => {
    if (!f) return false;
    // Match by onedrive_rel (preferred), abs_path, or share_url
    if (f.onedrive_rel && fileObj.onedrive_rel && f.onedrive_rel === fileObj.onedrive_rel) return true;
    if (f.abs_path && fileObj.abs_path && f.abs_path === fileObj.abs_path) return true;
    if (f.share_url && fileObj.share_url && f.share_url === fileObj.share_url) return true;
    return false;
  });
  
  if (existing) {
    // Update existing file with any new fields
    if (fileObj.label && !existing.label) existing.label = fileObj.label;
    if (fileObj.type && !existing.type) existing.type = fileObj.type;
    return existing.id;
  }
  
  // Create new canonical file
  const canonicalFile = {
    id: fileObj.id || `file_${project.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    label: fileObj.label || fileObj.name || (fileObj.abs_path ? fileObj.abs_path.split(/[/\\]/).pop() : ''),
    abs_path: fileObj.abs_path || null,
    onedrive_rel: fileObj.onedrive_rel || null,
    share_url: fileObj.share_url || null,
    type: fileObj.type || null,
    note: fileObj.note || '',
    noteUpdatedAt: fileObj.noteUpdatedAt || '',
    versions: fileObj.versions || [],
    versionCurrent: fileObj.versionCurrent || null,
    pinned: fileObj.pinned || false,
    isCurrent: fileObj.isCurrent !== undefined ? fileObj.isCurrent : true,
    artifactTag: fileObj.artifactTag || null
  };
  
  project.files.push(canonicalFile);
  return canonicalFile.id;
}

/**
 * Update file status across all tasks/projects
 * OPTIMIZED: Only updates tasks/projects that actually reference this file
 * PREVENTS GHOST REFERENCES: Rebuilds reverse index from source truth
 */
export async function updateFileStatus(fileKey, status, ctx) {
  const startTime = DEBUG_MODE ? performance.now() : 0;
  metrics.updateFileStatus.calls++;
  
  // Defensive defaults: ensure fileRegistry is always an object
  let fileRegistry = {};
  if (typeof window !== 'undefined' && window.Petal?.store) {
    const state = window.Petal.store.getState();
    fileRegistry = state.fileRegistry || {};
  }
  if (ctx?.fileRegistry) {
    fileRegistry = ctx.fileRegistry;
  }
  if (!fileRegistry || typeof fileRegistry !== 'object') {
    fileRegistry = {};
  }
  
  const { tasks, projects, save, currentView } = resolveFileContext(ctx);
  
  if (!fileRegistry[fileKey]) {
    if (DEBUG_MODE) {
      console.warn(`[updateFileStatus] File not found in registry: ${fileKey}`);
    }
    return;
  }
  
  fileRegistry[fileKey].status = status;
  
  // CRITICAL: Rebuild reverse index from source truth to prevent ghost references
  // Don't trust cached registry - verify against actual tasks/projects
  const file = fileRegistry[fileKey];
  let needsUpdate = false;
  let tasksTouched = 0;
  let projectsTouched = 0;
  
  // Find tasks that ACTUALLY reference this file (verify from source)
  const taskIds = new Set();
  tasks.forEach(task => {
    if (task.files && task.files.some(f => getFileKey(f) === fileKey)) {
      taskIds.add(task.id);
      task.files = task.files.map(f => {
        const key = getFileKey(f);
        if (key === fileKey) {
          needsUpdate = true;
          tasksTouched++;
          return { ...f, status };
        }
        return f;
      });
    }
  });
  
  // Find projects that ACTUALLY reference this file (verify from source)
  const projectIds = new Set();
  projects.forEach(project => {
    let projectHasFile = false;
    
    // Check project files
    if (project.files && project.files.some(f => getFileKey(f) === fileKey)) {
      projectHasFile = true;
      project.files = project.files.map(f => {
        const key = getFileKey(f);
        if (key === fileKey) {
          needsUpdate = true;
          return { ...f, status };
        }
        return f;
      });
    }
    
    // Check subtask files
    if (project.subtasks && project.subtasks.length > 0) {
      project.subtasks.forEach(subtask => {
        if (subtask.files && subtask.files.some(f => getFileKey(f) === fileKey)) {
          projectHasFile = true;
          subtask.files = subtask.files.map(f => {
            const key = getFileKey(f);
            if (key === fileKey) {
              needsUpdate = true;
              tasksTouched++;
              return { ...f, status };
            }
            return f;
          });
        }
      });
    }
    
    if (projectHasFile) {
      projectIds.add(project.id);
      projectsTouched++;
    }
  });
  
  // Update registry's reverse index to match source truth (prevent ghost references)
  if (file.tasks) {
    // Remove tasks that no longer reference this file
    file.tasks = file.tasks.filter(t => taskIds.has(t.id));
    // Add any missing tasks
    taskIds.forEach(taskId => {
      if (!file.tasks.find(t => t.id === taskId)) {
        const task = tasks.find(t => t.id === taskId);
        if (task) {
          file.tasks.push({
            id: task.id,
            title: task.title,
            status: task.status,
            done: task.done,
            projectId: task.projectId
          });
        }
      }
    });
  }
  
  if (file.projects) {
    // Remove projects that no longer reference this file
    file.projects = file.projects.filter(p => projectIds.has(p.id));
    // Add any missing projects
    projectIds.forEach(projectId => {
      const alreadyLinked = (file.projects || []).some(p => projectIdsMatch(p.id, projectId));
      if (!alreadyLinked) {
        const project = findProjectById(projects, projectId);
        if (project) {
          file.projects.push({
            id: project.id,
            name: project.name,
            done: project.done
          });
        }
      }
    });
  }
  
  persistFileChanges(fileRegistry, tasks, projects, needsUpdate);
  
  // Invalidate cache (file status changed)
  lastRegistryBuild.cacheKey = null;
  
  if (DEBUG_MODE) {
    metrics.updateFileStatus.tasksTouched += tasksTouched;
    metrics.updateFileStatus.projectsTouched += projectsTouched;
    const duration = performance.now() - startTime;
    console.log(`[updateFileStatus] Updated ${tasksTouched} tasks, ${projectsTouched} projects (${duration.toFixed(2)}ms)`);
  }
  
  // Only save if we actually made changes
  if (needsUpdate && save) {
    await save();
    // Re-render files view if currently active (use router instead of direct render call)
    if (currentView === 'files') {
      if (window.routerSwitchView) {
        await window.routerSwitchView('files').catch(err => {
          console.error('Router error re-rendering files view:', err);
        });
      } else if (window.Petal?.ui?.renderFiles) {
        // Fallback: direct module call if router not available
        const containerEl = document.getElementById('files-view-container');
        if (containerEl) {
          const state = window.Petal.store?.getState() || {};
          await window.Petal.ui.renderFiles(containerEl, state, window.Petal.handlers);
        }
      }
    }
  }
}

/**
 * Initialize registry guarantee - call at app startup
 * Ensures fileRegistry and fileHistory are always defined
 */
export function ensureRegistryInitialized() {
  if (typeof window !== 'undefined' && window.Petal?.store) {
    window.Petal.store.ensureRegistryInitialized();
    
    // Also ensure they're in the state (use setEphemeralState to prevent saves)
    const state = window.Petal.store.getState();
    if (!state.fileRegistry || typeof state.fileRegistry !== 'object') {
      if (window.Petal.store.setEphemeralState) {
        window.Petal.store.setEphemeralState({ fileRegistry: {} });
      } else {
        window.Petal.store.setState({ fileRegistry: {} });
      }
    }
    if (!state.fileHistory || typeof state.fileHistory !== 'object') {
      if (window.Petal.store.setEphemeralState) {
        window.Petal.store.setEphemeralState({ fileHistory: {} });
      } else {
        window.Petal.store.setState({ fileHistory: {} });
      }
    }
  }
}

/**
 * Show file relationships
 */
export function showFileRelations(fileKey, ctx) {
  const resolved = resolveFileContext(ctx || {});
  const { projects } = resolved;
  let fileRegistry = resolved.fileRegistry;
  const file = fileRegistry[fileKey];
  if (!file) return;
  
  const label = file.label || file.name || 'File';
  const linkedTasks = Array.isArray(file.tasks) ? file.tasks : [];
  const linkedProjects = Array.isArray(file.projects) ? file.projects : [];
  let html = `<div style="padding:20px;">
    <h3 style="font-family:'Cormorant Garamond',serif;font-size:20px;margin-bottom:16px;">${esc(label)}</h3>
    <div style="font-size:12px;color:var(--text-dim);margin-bottom:20px;">All tasks and projects referencing this file</div>`;
  
  if (linkedTasks.length > 0) {
    html += `<div style="margin-bottom:16px;">
      <div style="font-weight:500;margin-bottom:8px;">Tasks (${linkedTasks.length})</div>`;
    linkedTasks.forEach(t => {
      const project = t.projectId ? findProjectById(projects, t.projectId) : null;
      const projName = project ? project.name : '';
      html += `<div style="padding:8px;background:var(--bg2);border-radius:6px;margin-bottom:6px;">
        <div style="font-weight:500;">${esc(t.title)}</div>
        <div style="font-size:11px;color:var(--text-dim);margin-top:4px;">
          Status: ${t.status || 'none'} ${t.done ? '✓ Done' : ''} ${projName ? `• Project: ${esc(projName)}` : ''}
        </div>
      </div>`;
    });
    html += `</div>`;
  }
  
  if (linkedProjects.length > 0) {
    html += `<div>
      <div style="font-weight:500;margin-bottom:8px;">Projects (${linkedProjects.length})</div>`;
    linkedProjects.forEach(p => {
      html += `<div style="padding:8px;background:var(--bg2);border-radius:6px;margin-bottom:6px;">
        <div style="font-weight:500;">${esc(p.name)}</div>
        <div style="font-size:11px;color:var(--text-dim);margin-top:4px;">
          ${p.done ? '✓ Done' : 'Active'}
        </div>
      </div>`;
    });
    html += `</div>`;
  }
  
  html += `</div>`;
  
  // Show in modal or alert (simplified for now)
  alert(html.replace(/<[^>]*>/g, '\n').replace(/\n+/g, '\n'));
}

/**
 * Edit submission metadata
 * OPTIMIZED: Only updates tasks/projects that actually reference this file
 */
export async function editSubmissionMeta(fileKey, ctx) {
  // Defensive defaults: ensure fileRegistry is always an object
  let fileRegistry = {};
  if (typeof window !== 'undefined' && window.Petal?.store) {
    const state = window.Petal.store.getState();
    fileRegistry = state.fileRegistry || {};
  }
  if (ctx?.fileRegistry) {
    fileRegistry = ctx.fileRegistry;
  }
  if (!fileRegistry || typeof fileRegistry !== 'object') {
    fileRegistry = {};
  }
  
  const { tasks, projects, save, currentView } = resolveFileContext(ctx);
  const file = fileRegistry[fileKey];
  if (!file) return;
  
  const meta = file.submissionMeta || {};
  const journal = prompt('Journal/Conference:', meta.journal || '');
  if (journal === null) return;
  
  const version = prompt('Version:', meta.version || '');
  const submitted = prompt('Submitted date (YYYY-MM-DD):', meta.submittedDate || '');
  const decision = prompt('Decision date (YYYY-MM-DD):', meta.decisionDate || '');
  
  const newMeta = {
    journal: journal || undefined,
    version: version || undefined,
    submittedDate: submitted || undefined,
    decisionDate: decision || undefined
  };
  
  // Update file registry
  fileRegistry[fileKey].submissionMeta = Object.keys(newMeta).length > 0 ? newMeta : null;
  
  // OPTIMIZATION: Use file registry to find which tasks/projects reference this file
  let needsUpdate = false;
  
  // Update in tasks that reference this file (from registry)
  if (file.tasks && file.tasks.length > 0) {
    const taskIds = new Set(file.tasks.map(t => t.id));
    tasks.forEach(task => {
      if (taskIds.has(task.id) && task.files) {
        task.files = task.files.map(f => {
          const key = getFileKey(f);
          if (key === fileKey) {
            needsUpdate = true;
            return { ...f, submissionMeta: newMeta };
          }
          return f;
        });
      }
    });
  }
  
  // Update in projects that reference this file (from registry)
  if (file.projects && file.projects.length > 0) {
    const projectIds = new Set(file.projects.map(p => p.id));
    projects.forEach(project => {
      if (projectIds.has(project.id) && project.files) {
        project.files = project.files.map(f => {
          const key = getFileKey(f);
          if (key === fileKey) {
            needsUpdate = true;
            return { ...f, submissionMeta: newMeta };
          }
          return f;
        });
      }
    });
  }
  
  persistFileChanges(fileRegistry, tasks, projects, needsUpdate);
  
  // Only save if we actually made changes
  if (needsUpdate && save) {
    await save();
    // Re-render files view if currently active (use router instead of direct render call)
    if (currentView === 'files') {
      if (window.routerSwitchView) {
        await window.routerSwitchView('files').catch(err => {
          console.error('Router error re-rendering files view:', err);
        });
      } else if (window.Petal?.ui?.renderFiles) {
        // Fallback: direct module call if router not available
        const containerEl = document.getElementById('files-view-container');
        if (containerEl) {
          const state = window.Petal.store?.getState() || {};
          await window.Petal.ui.renderFiles(containerEl, state, window.Petal.handlers);
        }
      }
    }
  }
}

// Debounce timers for file note saves (module-level state)
const fileNoteSaveTimers = {};

/**
 * Toggle file note visibility
 */
export function toggleFileNote(fileId, btnEl) {
  const contentEl = document.getElementById('file-note-' + fileId);
  if (!contentEl) return;
  
  const isExpanded = contentEl.classList.contains('expanded');
  if (isExpanded) {
    contentEl.classList.remove('expanded');
    contentEl.classList.add('collapsed');
    contentEl.style.display = 'none';
  } else {
    contentEl.classList.remove('collapsed');
    contentEl.classList.add('expanded');
    contentEl.style.display = 'block';
    const textarea = contentEl.querySelector('.file-note-textarea');
    if (textarea) {
      setTimeout(() => textarea.focus(), 50);
    }
  }
}

/**
 * Debounce save file note
 */
export function debounceSaveFileNote(ctx, fileId, projectId, fileIndex, value) {
  const { projects, save, rerenderViewIfActive } = ctx;
  
  // Clear existing timer
  const timerKey = 'file-' + fileId;
  if (fileNoteSaveTimers[timerKey]) {
    clearTimeout(fileNoteSaveTimers[timerKey]);
  }
  
  // Set new timer (750ms debounce)
  fileNoteSaveTimers[timerKey] = setTimeout(async () => {
    const project = findProjectById(projects, projectId);
    if (project && project.files && project.files[fileIndex]) {
      const file = project.files[fileIndex];
      if (typeof file === 'object') {
        file.note = value || '';
        file.noteUpdatedAt = new Date().toISOString();
      } else {
        // Convert string to object
        project.files[fileIndex] = {
          label: file,
          abs_path: file,
          note: value || '',
          noteUpdatedAt: new Date().toISOString()
        };
      }
      
      // Use store if available
      if (window.Petal?.store) {
        const state = window.Petal.store.getState();
        const updatedProjects = (state.projects || []).map(p => {
          if (projectIdsMatch(p.id, projectId) && p.files && p.files[fileIndex]) {
            const updatedFiles = [...p.files];
            const file = updatedFiles[fileIndex];
            if (typeof file === 'object') {
              updatedFiles[fileIndex] = { ...file, note: value || '', noteUpdatedAt: new Date().toISOString() };
            } else {
              updatedFiles[fileIndex] = {
                label: file,
                abs_path: file,
                note: value || '',
                noteUpdatedAt: new Date().toISOString()
              };
            }
            return { ...p, files: updatedFiles };
          }
          return p;
        });
        window.Petal.store.setState({ projects: updatedProjects });
      } else {
        await save();
        // Re-render projects view if visible
        if (rerenderViewIfActive) {
          await rerenderViewIfActive('projects');
        }
      }
    }
    delete fileNoteSaveTimers[timerKey];
  }, 750);
}

/**
 * Edit file note from Files view
 */
export function editFileNote(ctx, fileKey) {
  const { projects, save, rerenderViewIfActive } = ctx;
  
  // Find the file in the canonical registry
  let targetFile = null;
  let targetProject = null;
  let targetIndex = -1;
  
  for (const project of projects) {
    if (!project.files) continue;
    const index = project.files.findIndex(f => {
      if (!f || typeof f !== 'object') return false;
      const key = f.onedrive_rel || f.abs_path || f.share_url || '';
      return key === fileKey || f.id === fileKey;
    });
    if (index >= 0) {
      targetFile = project.files[index];
      targetProject = project;
      targetIndex = index;
      break;
    }
  }
  
  if (!targetFile || !targetProject) {
    alert('File not found in canonical registry');
    return;
  }
  
  const currentNote = targetFile.note || '';
  const newNote = prompt('Edit file note:', currentNote);
  if (newNote === null) return; // User cancelled
  
  targetFile.note = newNote || '';
  targetFile.noteUpdatedAt = new Date().toISOString();
  
  // Use store if available
  if (window.Petal?.store) {
    const state = window.Petal.store.getState();
    const updatedProjects = (state.projects || []).map(p => {
      if (projectIdsMatch(p.id, targetProject.id) && p.files && p.files[targetIndex]) {
        const updatedFiles = [...p.files];
        updatedFiles[targetIndex] = { ...p.files[targetIndex], note: newNote || '', noteUpdatedAt: new Date().toISOString() };
        return { ...p, files: updatedFiles };
      }
      return p;
    });
    window.Petal.store.setState({ projects: updatedProjects });
  } else {
    save();
    // Re-render files view if visible
    if (rerenderViewIfActive) {
      rerenderViewIfActive('files');
    }
  }
}

/**
 * Show tasks linked to a file
 * @param {Object|string} ctxOrFileKey - Context object or fileKey (for backward compatibility)
 * @param {string|Object} fileKeyOrOptions - FileKey or options object
 */
export function showFileLinkedTasks(ctxOrFileKey, fileKeyOrOptions) {
  // Handle both old signature (ctx, fileKey) and new signature (fileKey, options)
  let ctx, fileKey, options;
  if (typeof ctxOrFileKey === 'string') {
    // New signature: (fileKey, options)
    fileKey = ctxOrFileKey;
    options = fileKeyOrOptions || {};
    ctx = {
      tasks: window.Petal?.store?.getState()?.tasks || [],
      projects: window.Petal?.store?.getState()?.projects || [],
      openTaskDrawer: window.Petal?.features?.taskDrawer?.openTaskDrawer,
      routerSwitchView: window.routerSwitchView || window.Petal?.router?.switchView
    };
  } else {
    // Old signature: (ctx, fileKey)
    ctx = ctxOrFileKey;
    fileKey = fileKeyOrOptions;
    options = {};
  }
  
  const { tasks, projects, openTaskDrawer, routerSwitchView } = ctx;
  
  // Get file registry to find file
  let fileRegistry = {};
  if (typeof window !== 'undefined' && window.Petal?.store) {
    const state = window.Petal.store.getState();
    fileRegistry = state.fileRegistry || {};
  }
  if (ctx?.fileRegistry) {
    fileRegistry = ctx.fileRegistry;
  }
  
  const file = fileRegistry[fileKey];
  if (!file) {
    // Fallback: search tasks directly
    const linkedTasks = [];
    for (const task of tasks) {
      if (task.files && task.files.some(f => getFileKey(f) === fileKey)) {
        linkedTasks.push(task);
      }
    }
    
    if (linkedTasks.length === 0) {
      alert('No tasks linked to this file');
      return;
    }
    
    if (options.navigate && routerSwitchView) {
      // Navigate to tasks view with file filter
      routerSwitchView('tasks', { force: true }).then(() => {
        // TODO: Apply filter to highlight tasks
        if (linkedTasks.length === 1 && openTaskDrawer) {
          openTaskDrawer(linkedTasks[0].id);
        }
      });
      return;
    }
    
    const taskList = linkedTasks.map(t => `• ${t.title}`).join('\n');
    const choice = confirm(`Tasks linked to this file:\n\n${taskList}\n\nOpen first task?`);
    if (choice && linkedTasks[0] && openTaskDrawer) {
      openTaskDrawer(linkedTasks[0].id);
    }
    return;
  }
  
  // Use file registry
  const linkedTasks = file.tasks || [];
  
  if (linkedTasks.length === 0) {
    alert('No tasks linked to this file');
    return;
  }
  
  if (options.navigate && routerSwitchView) {
    // Navigate to tasks view
    routerSwitchView('tasks', { force: true }).then(() => {
      // TODO: Apply filter to highlight tasks
      if (linkedTasks.length === 1 && openTaskDrawer) {
        const task = tasks.find(t => t.id === linkedTasks[0].id);
        if (task) {
          openTaskDrawer(task.id);
        }
      }
    });
    return;
  }
  
  const taskList = linkedTasks.map(t => `• ${t.title || t.id}`).join('\n');
  const choice = confirm(`Tasks linked to this file:\n\n${taskList}\n\nOpen first task?`);
  if (choice && linkedTasks[0] && openTaskDrawer) {
    const task = tasks.find(t => t.id === linkedTasks[0].id);
    if (task) {
      openTaskDrawer(task.id);
    }
  }
}

/**
 * Show projects linked to a file
 * @param {string} fileKey - File key
 * @param {Object} options - Options { navigate: boolean, view: string }
 */
export function showFileLinkedProjects(fileKey, options = {}) {
  const ctx = {
    projects: window.Petal?.store?.getState()?.projects || [],
    routerSwitchView: window.routerSwitchView || window.Petal?.router?.switchView
  };
  
  // Get file registry
  let fileRegistry = {};
  if (typeof window !== 'undefined' && window.Petal?.store) {
    const state = window.Petal.store.getState();
    fileRegistry = state.fileRegistry || {};
  }
  
  const file = fileRegistry[fileKey];
  if (!file) {
    alert('File not found in registry');
    return;
  }
  
  const linkedProjects = file.projects || [];
  
  if (linkedProjects.length === 0) {
    alert('No projects linked to this file');
    return;
  }
  
  if (options.navigate && ctx.routerSwitchView) {
    // Navigate to projects view
    ctx.routerSwitchView('projects', { force: true }).then(() => {
      // TODO: Apply filter to highlight projects
      if (linkedProjects.length === 1) {
        // Could scroll to or highlight the project
      }
    });
    return;
  }
  
  const projectList = linkedProjects.map(p => `• ${p.name || p.id}`).join('\n');
  alert(`Projects linked to this file:\n\n${projectList}`);
}

/**
 * Locate a missing file - opens file picker to relocate
 * @param {string} fileKey - File key
 * @param {Object} fileLink - Current file link object
 */
export async function locateFile(fileKey, fileLink) {
  if (!window.electronAPI || !window.electronAPI.pickFile) {
    alert('File picker not available in this context');
    return;
  }
  
  try {
    // Open file picker
    const result = await window.electronAPI.pickFile({
      title: 'Locate missing file',
      defaultPath: fileLink?.abs_path_last_known || fileLink?.abs_path || fileLink?.onedrive_rel_last_known || fileLink?.onedrive_rel
    });
    
    if (!result || !result.success || !result.path) {
      return; // User cancelled
    }
    
    const newPath = result.path;
    
    const state = window.Petal?.store?.getState() || {};
    const projects = state.projects || [];
    let updated = false;
    let oneDriveRoot = null;
    if (window.electronAPI?.getOneDriveRoot) {
      try {
        oneDriveRoot = await window.electronAPI.getOneDriveRoot();
      } catch (e) {
        // Ignore
      }
    }

    const updatedProjects = projects.map(project => {
      if (!project.files) return project;
      const fileIndex = project.files.findIndex(f => {
        if (!f || typeof f !== 'object') return false;
        const key = f.onedrive_rel || f.abs_path || f.share_url || '';
        return key === fileKey || f.id === fileKey;
      });
      if (fileIndex < 0) return project;

      const file = project.files[fileIndex];
      const updatedFile = { ...file };

      if (oneDriveRoot && newPath.startsWith(oneDriveRoot)) {
        const relativePath = newPath.slice(oneDriveRoot.length).replace(/^[\/\\]+/, '').replace(/\\/g, '/');
        updatedFile.onedrive_rel = relativePath;
      }

      updatedFile.abs_path = newPath;
      updatedFile.exists = true;
      updatedFile.isMissing = false;

      if (!updatedFile.previousPaths) updatedFile.previousPaths = [];
      if (file.abs_path && file.abs_path !== newPath) {
        updatedFile.previousPaths.push({ path: file.abs_path, type: 'abs_path', updatedAt: Date.now() });
      }
      if (file.onedrive_rel && file.onedrive_rel !== updatedFile.onedrive_rel) {
        updatedFile.previousPaths.push({ path: file.onedrive_rel, type: 'onedrive_rel', updatedAt: Date.now() });
      }

      updated = true;
      const files = [...project.files];
      files[fileIndex] = updatedFile;
      return { ...project, files };
    });
    
    // Update file registry
    const fileRegistry = state.fileRegistry || {};
    if (fileRegistry[fileKey]) {
      fileRegistry[fileKey].abs_path = newPath;
      fileRegistry[fileKey].exists = true;
      fileRegistry[fileKey].isMissing = false;
      fileRegistry[fileKey].lastSeenAt = Date.now();
    }
    
    // Update file history
    const fileHistory = state.fileHistory || {};
    if (fileHistory[fileKey]) {
      fileHistory[fileKey].exists = true;
      fileHistory[fileKey].missingSince = null;
      fileHistory[fileKey].lastResolvedPath = newPath;
      fileHistory[fileKey].lastSeenAt = Date.now();
    }
    
    if (window.Petal?.store) {
      window.Petal.store.setState({
        projects: updatedProjects,
        fileRegistry,
        fileHistory
      });
    }
    
    if (updated && typeof window.save === 'function') {
      await window.save();
    }
    
    // Re-validate file existence
    if (window.Petal?.features?.fileManagement?.validateFileExistence) {
      const updatedFileLink = { ...fileLink, abs_path: newPath };
      await window.Petal.features.fileManagement.validateFileExistence(updatedFileLink, {
        fileHistory,
        fileRegistry
      });
    }
    
    // Refresh files view
    if (window.routerSwitchView) {
      await window.routerSwitchView('files', { force: true });
    }
    
    alert(`File location updated successfully!\n\nNew path: ${newPath}`);
  } catch (error) {
    console.error('Error locating file:', error);
    alert('Error locating file: ' + (error.message || 'Unknown error'));
  }
}

/**
 * Open file (re-exported from fileHelpers for convenience)
 * @param {Object|string} fileLink - File link object or string path
 */
export { openFile };
