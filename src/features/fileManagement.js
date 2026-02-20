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

/**
 * Helper: Get file key for registry
 */
function getFileKey(fileLink) {
  return fileLink.onedrive_rel || fileLink.abs_path || fileLink.share_url || JSON.stringify(fileLink);
}

/**
 * Build file registry from all tasks and projects
 */
export function buildFileRegistry(ctx) {
  const { tasks, projects, fileRegistry: registry, fileHistory: history } = ctx;
  
  let fileRegistry = registry || {};
  let fileHistory = history || {};
  
  // Preserve standalone files (files not linked to tasks/projects)
  const standaloneFiles = {};
  Object.keys(fileRegistry).forEach(key => {
    const file = fileRegistry[key];
    // Preserve if it's marked as standalone OR if it has no tasks/projects
    if (file.standalone || ((!file.tasks || file.tasks.length === 0) && (!file.projects || file.projects.length === 0))) {
      standaloneFiles[key] = { ...file, standalone: true };
    }
  });
  
  // Start fresh but preserve standalone files
  fileRegistry = { ...standaloneFiles };
  
  // Scan tasks
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
            lastOpened: fileHistory[key]?.lastOpened || null,
            submissionMeta: fileLink.submissionMeta || null
          };
        }
        fileRegistry[key].tasks.push({
          id: task.id,
          title: task.title,
          status: task.status,
          done: task.done,
          projectId: task.projectId
        });
      });
    }
  });
  
  // Scan projects
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
            lastOpened: fileHistory[key]?.lastOpened || null,
            submissionMeta: fileLink.submissionMeta || null
          };
        }
        fileRegistry[key].projects.push({
          id: project.id,
          name: project.name,
          done: project.done
        });
      });
    }
    
    // Scan subtasks
    (project.subtasks || []).forEach(subtask => {
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
              lastOpened: fileHistory[key]?.lastOpened || null,
              submissionMeta: fileLink.submissionMeta || null
            };
          }
          fileRegistry[key].tasks.push({
            id: subtask.id,
            title: subtask.title,
            status: 'subtask',
            done: subtask.done,
            projectId: project.id,
            isSubtask: true
          });
        });
      }
    });
  });
  
  return { fileRegistry, fileHistory };
}

/**
 * Track file open
 */
export async function trackFileOpen(fileLink, ctx) {
  const { fileHistory, fileRegistry, save } = ctx;
  const key = getFileKey(fileLink);
  
  if (!fileHistory[key]) {
    fileHistory[key] = {};
  }
  fileHistory[key].lastOpened = Date.now();
  
  // Update file registry
  if (fileRegistry[key]) {
    fileRegistry[key].lastOpened = Date.now();
  }
  
  await save();
}

/**
 * Get file metadata from OS
 */
export async function refreshFileMetadata(fileLink, ctx) {
  if (!window.electronAPI || !window.electronAPI.getFileMetadata) {
    return null;
  }
  
  const { fileHistory } = ctx;
  
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
 */
export async function updateFileStatus(fileKey, status, ctx) {
  const { tasks, projects, fileRegistry, save, currentView, renderFiles } = ctx;
  
  if (!fileRegistry[fileKey]) return;
  
  fileRegistry[fileKey].status = status;
  
  // Update in all tasks/projects
  const fileLink = fileRegistry[fileKey];
  
  // Update in tasks
  tasks.forEach(task => {
    if (task.files) {
      task.files = task.files.map(f => {
        const key = getFileKey(f);
        if (key === fileKey) {
          return { ...f, status };
        }
        return f;
      });
    }
  });
  
  // Update in projects
  projects.forEach(project => {
    if (project.files) {
      project.files = project.files.map(f => {
        const key = getFileKey(f);
        if (key === fileKey) {
          return { ...f, status };
        }
        return f;
      });
    }
    
    // Update in subtasks
    (project.subtasks || []).forEach(subtask => {
      if (subtask.files) {
        subtask.files = subtask.files.map(f => {
          const key = getFileKey(f);
          if (key === fileKey) {
            return { ...f, status };
          }
          return f;
        });
      }
    });
  });
  
  await save();
  if (currentView === 'files' && renderFiles) {
    await renderFiles();
  }
}

/**
 * Show file relationships
 */
export function showFileRelations(fileKey, ctx) {
  const { fileRegistry, projects } = ctx;
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
 */
export async function editSubmissionMeta(fileKey, ctx) {
  const { fileRegistry, tasks, projects, save, currentView, renderFiles } = ctx;
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
  
  // Update in tasks/projects
  const fileLink = fileRegistry[fileKey];
  tasks.forEach(task => {
    if (task.files) {
      task.files = task.files.map(f => {
        const key = getFileKey(f);
        if (key === fileKey) {
          return { ...f, submissionMeta: newMeta };
        }
        return f;
      });
    }
  });
  
  projects.forEach(project => {
    if (project.files) {
      project.files = project.files.map(f => {
        const key = getFileKey(f);
        if (key === fileKey) {
          return { ...f, submissionMeta: newMeta };
        }
        return f;
      });
    }
  });
  
  await save();
  if (currentView === 'files' && renderFiles) {
    await renderFiles();
  }
}
