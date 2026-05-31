// ═══════════════════════ RENDER FILES ═══════════════════════
// Pure rendering function for files view
// Takes state and handlers as parameters - no store peeking

import { esc, escAttr } from '../utils/strings.js';
import { fileIcon } from '../utils/strings.js';
import { projectIdsMatch } from '../utils/projectHelpers.js';

/**
 * Render files view
 * @param {HTMLElement} containerEl - Container element to render into
 * @param {Object} state - Current app state
 * @param {Object} handlers - Event handlers
 */
export async function renderFiles(containerEl, state, handlers) {
  const { files: persistedFiles, fileRegistry, fileHistory, currentFileView, currentFileProjectFilter, tasks, projects } = state;
  
  // CONTRACT: containerEl is required - no global fallback
  if (!containerEl) {
    console.error('❌ renderFiles: containerEl is required (no global fallback allowed)');
    return;
  }
  
  // Find the files list container within the provided container
  // This ensures we're scoped to the page container, not global DOM
  const c = containerEl.querySelector('#files-view-container') || containerEl.querySelector('[data-files-list]') || containerEl;
  if (!c) {
    console.error('Files view container not found within provided containerEl!');
    return;
  }
  
  // Update project filter dropdown - MUST be scoped to containerEl
  const projectFilterEl = containerEl.querySelector('#file-project-filter') || containerEl.querySelector('[data-file-project-filter]');
  if (projectFilterEl) {
    const currentValue = projectFilterEl.value || currentFileProjectFilter || 'all';
    projectFilterEl.innerHTML = '<option value="all">All Projects</option>';
    (projects || []).filter(p => !p.done).forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = p.name;
      projectFilterEl.appendChild(opt);
    });
    projectFilterEl.value = currentValue;
  }
  
  if (window.__DEBUG__) {
    console.log('🔍 renderFiles called:', {
      persistedFilesCount: persistedFiles?.length || 0,
      fileRegistryKeys: fileRegistry ? Object.keys(fileRegistry).length : 0,
      currentFileView,
      currentFileProjectFilter,
      tasksCount: tasks?.length || 0,
      projectsCount: projects?.length || 0
    });
  }
  
  // Phase 3 Fix: Read from persisted files list (authoritative), not computed registry
  // files = authoritative user-added file entries (persisted)
  // fileRegistry = derived index used for fast lookup (optional, can be computed)
  let files = Array.isArray(persistedFiles) ? persistedFiles : [];
  
  // Always build/refresh registry to ensure we have all files from tasks/projects
  let registryToUse = fileRegistry || {};
  if (window.Petal?.features?.fileManagement?.buildFileRegistry) {
    try {
      const result = window.Petal.features.fileManagement.buildFileRegistry({
        tasks: tasks || [],
        projects: projects || [],
        fileRegistry: fileRegistry || {},
        fileHistory: fileHistory || {},
        files: persistedFiles || []
      }, { commit: false });
      registryToUse = result.fileRegistry || {};
      
      if (window.__DEBUG__) {
        console.log('🔍 Built registry:', Object.keys(registryToUse).length, 'files');
      }
    } catch (e) {
      console.error('Error building file registry:', e);
    }
  }
  
  // If no persisted files, use all files from registry (not just standalone)
  if (files.length === 0 && registryToUse && Object.keys(registryToUse).length > 0) {
    // Get all files from registry
    files = Object.values(registryToUse);
    
    // Convert registry format to file format for rendering
    files = files.map(f => {
      const fileLink = f.fileLink || f;
      return {
        ...f,
        fileLink: fileLink,
        key: f.key || fileLink.abs_path || fileLink.onedrive_rel || fileLink.share_url,
        name: f.name || fileLink.label || fileLink.name || 'File',
        tasks: f.tasks || [],
        projects: f.projects || []
      };
    });
    
    if (window.__DEBUG__) {
      console.log('🔍 Using files from registry:', files.length);
    }
  } else if (files.length > 0) {
    // If we have persisted files, enrich them with registry data if available
    files = files.map(f => {
      const fileKey = f.key || f.fileLink?.abs_path || f.fileLink?.onedrive_rel || f.fileLink?.share_url;
      const registryFile = registryToUse[fileKey];
      if (registryFile) {
        // Merge registry data (tasks, projects) with persisted file
        return {
          ...f,
          tasks: registryFile.tasks || f.tasks || [],
          projects: registryFile.projects || f.projects || []
        };
      }
      return f;
    });
  }
  
  // Filter by view
  if (currentFileView === 'active' || currentFileView === 'current') {
    files = files.filter(f => {
      return (f.tasks || []).some(t => t.status === 'Doing' && !t.done) ||
             (f.projects || []).some(p => !p.done);
    });
  } else if (currentFileView === 'stale') {
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    files = files.filter(f => {
      const fileKey = f.key || f.fileLink?.abs_path || f.fileLink?.onedrive_rel || f.fileLink?.share_url;
      const lastMod = fileHistory?.[fileKey]?.lastModified;
      if (!lastMod) return false;
      return lastMod < thirtyDaysAgo && 
             (f.tasks || []).some(t => !t.done && t.status === 'Doing');
    });
  } else if (currentFileView === 'submissions') {
    files = files.filter(f => f.submissionMeta || 
                               f.status === 'submitted' || 
                               f.status === 'accepted');
  }
  
  // Filter by project if a project is selected
  if (currentFileProjectFilter && currentFileProjectFilter !== 'all') {
    const filterProjectId = currentFileProjectFilter;
    files = files.filter(f => {
      const fileProjects = f.projects || [];
      if (fileProjects.length === 0) return false;
      
      return fileProjects.some(p => {
        const pId = typeof p === 'object' && p !== null ? (p.id || p.projectId) : p;
        if (pId == null) return false;
        return projectIdsMatch(pId, filterProjectId);
      });
    });
    
    if (window.__DEBUG__) {
      console.log('🔍 Filtered by project:', filterProjectId, 'result:', files.length, 'files');
    }
  }
  
  if (files.length === 0) {
    c.innerHTML = `<div class="empty-state" style="text-align:center;padding:60px 20px;">
      <div style="font-size:20px;margin-bottom:12px;color:var(--text);">No files yet</div>
      <small style="display:block;margin-bottom:24px;color:var(--text-dim);">Link files to tasks or projects, or add files directly</small>
      <button data-action="file:add" style="background:linear-gradient(135deg,#d4a0a0 0%,#c98b8b 100%) !important;border:none !important;border-radius:10px !important;color:white !important;font-size:14px !important;padding:12px 24px !important;cursor:pointer !important;display:block !important;margin:0 auto !important;box-shadow:0 4px 14px rgba(201,139,139,.25) !important;">+ Add Your First File</button>
    </div>`;
    return;
  }
  
  // Render file cards - validate existence for files that haven't been checked recently
  const fileHtmls = await Promise.all(files.map(async f => {
    const fileLink = f.fileLink || f;
    const fileKey = f.key || fileLink.onedrive_rel || fileLink.abs_path || fileLink.share_url || '';
    const history = fileHistory?.[fileKey] || {};
    
    // Validate existence if:
    // 1. Never checked before, OR
    // 2. Last check was more than 5 minutes ago, OR
    // 3. File is marked as missing (re-check periodically)
    const lastCheck = history.lastChecked || 0;
    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
    const shouldValidate = !lastCheck || lastCheck < fiveMinutesAgo || history.exists === false;
    
    if (shouldValidate && window.Petal?.features?.fileManagement?.validateFileExistence) {
      try {
        await window.Petal.features.fileManagement.validateFileExistence(fileLink, {
          fileHistory: fileHistory,
          fileRegistry: registryToUse
        });
        // Update history timestamp
        if (!fileHistory[fileKey]) {
          fileHistory[fileKey] = {};
        }
        fileHistory[fileKey].lastChecked = Date.now();
      } catch (e) {
        console.error('Error validating file:', e);
      }
    }
    
    return renderFileCard(f, fileHistory || {});
  }));
  
  // Update container (preserve buttons and filters)
  const fileListEl = c.querySelector('#files-list') || c;
  if (fileListEl) {
    fileListEl.innerHTML = fileHtmls.join('');
  } else {
    // Fallback: replace entire container
    c.innerHTML = fileHtmls.join('');
  }
}

/**
 * Render a single file card
 * @param {Object} file - File object from registry
 * @param {Object} fileHistory - File history object
 */
function renderFileCard(file, fileHistory) {
  // Phase 3 Fix: Handle both persisted file format and registry format
  const fileLink = file.fileLink || file; // Persisted files have fileLink, registry files are the link
  const filePath = file.path || fileLink.onedrive_rel || fileLink.abs_path || fileLink.share_url || '';
  const fileKey = file.key || filePath;
  const icon = fileIcon(filePath);
  const label = file.name || fileLink.label || fileLink.name || 'File';
  
  // Get metadata
  const history = fileHistory?.[fileKey] || {};
  const lastMod = history.lastModified ? new Date(history.lastModified) : null;
  const lastOpened = file.lastOpened || fileLink.lastOpened ? new Date(file.lastOpened || fileLink.lastOpened) : null;
  const addedAt = file.addedAt ? new Date(file.addedAt) : null;
  
  // Check if file is missing (broken link)
  const isMissing = file.exists === false || file.isMissing === true || history.exists === false;
  const missingSince = history.missingSince ? new Date(history.missingSince) : null;
  const lastKnownPath = history.lastResolvedPath || history.abs_path_last_known || history.onedrive_rel_last_known || filePath;
  
  // Check for warnings (only for registry files with task/project links)
  const warnings = [];
  if (isMissing) {
    warnings.push('File not found');
  }
  if (file.tasks && Array.isArray(file.tasks)) {
    if (file.tasks.some(t => t.done && lastMod && lastMod > new Date(t.done))) {
      warnings.push('Modified after task completed');
    }
    if (lastMod && (Date.now() - lastMod.getTime()) > (30 * 24 * 60 * 60 * 1000) && 
        file.tasks.some(t => !t.done && t.status === 'Doing')) {
      warnings.push('Stale (not modified in 30+ days)');
    }
  }
  
  // Check if outside vault
  const isOutsideVault = !fileLink.isInOneDrive && fileLink.abs_path;
  
  const tasksCount = (file.tasks || []).length;
  const projectsCount = (file.projects || []).length;
  const fileId = file.id || fileKey;
  
  return `<div class="file-card ${isMissing ? 'file-missing' : ''}" data-file-id="${esc(fileId)}" data-file-key="${esc(fileKey)}">
    <div class="file-card-header">
      <div style="display:flex;align-items:center;gap:8px;flex:1;">
        <span style="font-size:18px;">${icon}</span>
        <div style="flex:1;min-width:0;">
          <div style="font-weight:500;color:var(--text);font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:flex;align-items:center;gap:6px;">
            ${esc(label)}
            ${isMissing ? '<span style="color:var(--overdue);font-size:12px;" title="File not found at last known location">⚠️</span>' : ''}
          </div>
          ${addedAt ? `<div style="font-size:11px;color:var(--text-dim);margin-top:2px;">Added: ${addedAt.toLocaleDateString()}</div>` : ''}
          ${lastMod ? `<div style="font-size:11px;color:var(--text-dim);margin-top:2px;">Modified: ${lastMod.toLocaleDateString()}</div>` : ''}
          ${isMissing && missingSince ? `<div style="font-size:11px;color:var(--overdue);margin-top:2px;">Missing since: ${missingSince.toLocaleDateString()}</div>` : ''}
          ${isMissing && lastKnownPath ? `<div style="font-size:10px;color:var(--text-dim);margin-top:2px;font-style:italic;">Last known: ${esc(lastKnownPath.length > 50 ? '...' + lastKnownPath.slice(-47) : lastKnownPath)}</div>` : ''}
        </div>
      </div>
      ${warnings.length > 0 ? `<div style="color:var(--soon);font-size:12px;">⚠️ ${warnings.join(', ')}</div>` : ''}
      ${isOutsideVault ? `<div style="color:var(--text-dim);font-size:11px;">⚠️ Outside vault</div>` : ''}
    </div>
    <div class="file-card-meta" style="display:flex;gap:12px;margin-top:12px;font-size:11px;color:var(--text-dim);flex-wrap:wrap;">
      ${tasksCount > 0 ? `<span data-action="file:show-tasks" data-file-key="${esc(fileKey)}" style="cursor:pointer;text-decoration:underline;color:var(--rose);" title="Click to view ${tasksCount} task${tasksCount > 1 ? 's' : ''}">📋 ${tasksCount} task${tasksCount > 1 ? 's' : ''}</span>` : ''}
      ${projectsCount > 0 ? `<span data-action="file:show-projects" data-file-key="${esc(fileKey)}" style="cursor:pointer;text-decoration:underline;color:var(--rose);" title="Click to view ${projectsCount} project${projectsCount > 1 ? 's' : ''}">📁 ${projectsCount} project${projectsCount > 1 ? 's' : ''}</span>` : ''}
      ${file.status ? `<span>Status: ${file.status}</span>` : ''}
    </div>
    ${file.notes ? `<div style="margin-top:12px;padding:8px 12px;background:var(--bg2);border:1px solid var(--border);border-radius:6px;font-size:11px;color:var(--text-dim);line-height:1.5;max-height:60px;overflow:hidden;text-overflow:ellipsis;white-space:pre-wrap;">${esc(file.notes.length > 100 ? file.notes.substring(0, 100) + '...' : file.notes)}</div>` : ''}
    <div class="file-card-actions" style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap;">
      ${isMissing ? `<button class="btn-secondary" data-action="file:locate" data-file-key="${esc(fileKey)}" data-path="${escAttr(JSON.stringify(fileLink))}" style="font-size:11px;padding:6px 12px;background:var(--rose);color:white;">🔍 Locate File...</button>` : ''}
      <button class="file-open-btn btn-secondary" data-action="file:open" data-path="${escAttr(JSON.stringify(fileLink))}" style="font-size:11px;padding:6px 12px;${isMissing ? 'opacity:0.6;' : ''}">Open</button>
      ${file.key ? `<button data-action="file:show-relations" data-file-key="${esc(file.key)}" class="btn-secondary" style="font-size:11px;padding:6px 12px;">Relations</button>` : ''}
      <button data-action="file:notes" data-file-id="${esc(fileId)}" class="btn-secondary" style="font-size:11px;padding:6px 12px;" title="Add or edit notes for this file">${file.notes ? '📝' : '📄'} Notes</button>
    </div>
  </div>`;
}
