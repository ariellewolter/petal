// ═══════════════════════ FILE MANAGEMENT ═══════════════════════
// Shared file management functions used across multiple tabs

import { esc, fileIcon } from '../utils/strings.js';

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

// Cache for buildFileRegistry to avoid unnecessary rebuilds
// Uses updatedAt timestamps for bulletproof invalidation
let lastRegistryBuild = {
  cacheKey: null,
  registry: null,
  buildTime: null
};

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
function computeCacheKey(tasks, projects) {
  // Get max updatedAt from tasks (or use 0 if none)
  let maxTaskUpdatedAt = 0;
  if (tasks && tasks.length > 0) {
    maxTaskUpdatedAt = Math.max(...tasks.map(t => {
      // Support multiple timestamp field names for backward compatibility
      return t.updatedAt || t.updated || t.modifiedAt || t.modified || t.createdAt || t.created || 0;
    }).filter(t => t > 0));
  }
  
  // Get max updatedAt from projects (or use 0 if none)
  let maxProjectUpdatedAt = 0;
  if (projects && projects.length > 0) {
    maxProjectUpdatedAt = Math.max(...projects.map(p => {
      return p.updatedAt || p.updated || p.modifiedAt || p.modified || p.createdAt || p.created || 0;
    }).filter(p => p > 0));
  }
  
  // Also include file references in cache key (critical for file attachment changes)
  // Count tasks/projects with files to catch file attachment changes
  const tasksWithFiles = tasks ? tasks.filter(t => t.files && t.files.length > 0).length : 0;
  const projectsWithFiles = projects ? projects.filter(p => {
    const hasProjectFiles = p.files && p.files.length > 0;
    const hasSubtaskFiles = p.subtasks && p.subtasks.some(st => st.files && st.files.length > 0);
    return hasProjectFiles || hasSubtaskFiles;
  }).length : 0;
  
  // Cache key: length, max updatedAt, and file reference counts
  return `${tasks?.length || 0}_${maxTaskUpdatedAt}_${tasksWithFiles}_${projects?.length || 0}_${maxProjectUpdatedAt}_${projectsWithFiles}`;
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
          const existingProject = fileRegistry[key].projects.find(p => p.id === project.id);
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
 */
export function buildFileRegistry(ctx) {
  const startTime = DEBUG_MODE ? performance.now() : 0;
  metrics.buildFileRegistry.calls++;
  
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
    return { 
      fileRegistry: lastRegistryBuild.registry || {}, 
      fileHistory: history || {} 
    };
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
  
  // Update store directly (store-as-source-of-truth)
  if (typeof window !== 'undefined' && window.Petal?.store) {
    window.Petal.store.setState({
      fileRegistry: result.fileRegistry,
      fileHistory: result.fileHistory
    });
  }
  
  // Update cache
  lastRegistryBuild = {
    cacheKey,
    registry: result.fileRegistry,
    buildTime: Date.now()
  };
  
  if (DEBUG_MODE) {
    const duration = performance.now() - startTime;
    console.log(`[Registry] Rebuild complete (${duration.toFixed(2)}ms, ${Object.keys(result.fileRegistry).length} files)`);
  }
  
  return result;
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
 * Track file open
 */
export async function trackFileOpen(fileLink, ctx) {
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
  
  // Update file registry
  if (fileRegistry[key]) {
    fileRegistry[key].lastOpened = Date.now();
  }
  
  // Update store if available (store-as-source-of-truth)
  if (typeof window !== 'undefined' && window.Petal?.store) {
    window.Petal.store.setState({
      fileHistory,
      fileRegistry
    });
  }
  
  // Call save if provided (for backward compatibility)
  if (save && typeof save === 'function') {
    await save();
  }
}

/**
 * Get file metadata from OS
 */
export async function refreshFileMetadata(fileLink, ctx) {
  if (!window.electronAPI || !window.electronAPI.getFileMetadata) {
    return null;
  }
  
  // Ensure ctx and fileHistory are defined
  if (!ctx) {
    ctx = {};
  }
  const fileHistory = ctx.fileHistory || window.fileHistory || {};
  
  try {
    const metadata = await window.electronAPI.getFileMetadata(fileLink);
    if (metadata.success) {
      const key = getFileKey(fileLink);
      if (!fileHistory[key]) {
        fileHistory[key] = {};
      }
      fileHistory[key].lastModified = metadata.lastModified;
      fileHistory[key].size = metadata.size;
      return metadata;
    }
  } catch (e) {
    console.error('Error refreshing file metadata:', e);
  }
  return null;
}

/**
 * Resolve fileIds to file objects from project registry
 */
export function resolveFileIds(projectId, fileIds, ctx) {
  const { projects } = ctx;
  
  if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
    return [];
  }
  
  const project = projects.find(p => p.id === projectId);
  if (!project || !project.files) {
    return [];
  }
  
  return fileIds
    .map(fileId => project.files.find(f => f && f.id === fileId))
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
  const project = projects.find(p => p.id === projectId);
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
  
  const { tasks = [], projects = [], save, currentView, renderFiles } = ctx || {};
  
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
      if (!file.projects.find(p => p.id === projectId)) {
        const project = projects.find(p => p.id === projectId);
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
  
  // Update store
  if (typeof window !== 'undefined' && window.Petal?.store) {
    window.Petal.store.setState({ fileRegistry });
  }
  
  // Invalidate cache (file status changed)
  lastRegistryBuild.cacheKey = null;
  
  if (DEBUG_MODE) {
    metrics.updateFileStatus.tasksTouched += tasksTouched;
    metrics.updateFileStatus.projectsTouched += projectsTouched;
    const duration = performance.now() - startTime;
    console.log(`[updateFileStatus] Updated ${tasksTouched} tasks, ${projectsTouched} projects (${duration.toFixed(2)}ms)`);
  }
  
  // Only save if we actually made changes
  if (needsUpdate) {
    await save();
    if (currentView === 'files' && renderFiles) {
      await renderFiles();
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
    
    // Also ensure they're in the state
    const state = window.Petal.store.getState();
    if (!state.fileRegistry || typeof state.fileRegistry !== 'object') {
      window.Petal.store.setState({ fileRegistry: {} });
    }
    if (!state.fileHistory || typeof state.fileHistory !== 'object') {
      window.Petal.store.setState({ fileHistory: {} });
    }
  }
}

/**
 * Show file relationships
 */
export function showFileRelations(fileKey, ctx) {
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
  
  const { projects } = ctx || {};
  const file = fileRegistry[fileKey];
  if (!file) return;
  
  const label = file.label || file.name || 'File';
  let html = `<div style="padding:20px;">
    <h3 style="font-family:'Cormorant Garamond',serif;font-size:20px;margin-bottom:16px;">${esc(label)}</h3>
    <div style="font-size:12px;color:var(--text-dim);margin-bottom:20px;">All tasks and projects referencing this file</div>`;
  
  if (file.tasks.length > 0) {
    html += `<div style="margin-bottom:16px;">
      <div style="font-weight:500;margin-bottom:8px;">Tasks (${file.tasks.length})</div>`;
    file.tasks.forEach(t => {
      const project = t.projectId ? projects.find(p => String(p.id) === String(t.projectId)) : null;
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
  
  if (file.projects.length > 0) {
    html += `<div>
      <div style="font-weight:500;margin-bottom:8px;">Projects (${file.projects.length})</div>`;
    file.projects.forEach(p => {
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
  
  const { tasks, projects, save, currentView, renderFiles } = ctx || {};
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
  
  // Update store
  if (typeof window !== 'undefined' && window.Petal?.store) {
    window.Petal.store.setState({ fileRegistry });
  }
  
  // Only save if we actually made changes
  if (needsUpdate) {
    await save();
    if (currentView === 'files' && renderFiles) {
      await renderFiles();
    }
  }
}
