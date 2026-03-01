// ═══════════════════════ RENDER FILES ═══════════════════════
// Pure rendering function for files view
// Takes state and handlers as parameters - no store peeking

import { esc, escAttr } from '../utils/strings.js';
import { fileIcon } from '../utils/strings.js';
import { EmptyState } from '../ui/components.js';

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
    // Get current value from state (preferred) or from element
    const currentValue = currentFileProjectFilter || projectFilterEl.value || 'all';
    
    // Clear and rebuild options
    projectFilterEl.innerHTML = '<option value="all">All Projects</option>';
    (projects || []).filter(p => !p.done).forEach(p => {
      const opt = document.createElement('option');
      opt.value = String(p.id); // Ensure string for comparison
      opt.textContent = p.name;
      projectFilterEl.appendChild(opt);
    });
    
    // Set the value from state
    projectFilterEl.value = String(currentValue);
    
    if (window.__DEBUG__) {
      console.log('🔍 Project filter updated:', {
        currentValue,
        stateValue: currentFileProjectFilter,
        elementValue: projectFilterEl.value,
        availableProjects: (projects || []).filter(p => !p.done).length
      });
    }
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
  } else if (currentFileView === 'missing') {
    // Filter to missing files
    files = files.filter(f => {
      const fileKey = f.key || f.fileLink?.abs_path || f.fileLink?.onedrive_rel || f.fileLink?.share_url;
      const history = fileHistory?.[fileKey] || {};
      return f.exists === false || f.isMissing === true || history.exists === false;
    });
  } else if (currentFileView === 'submissions') {
    files = files.filter(f => f.submissionMeta || 
                               f.status === 'submitted' || 
                               f.status === 'accepted');
  }
  
  // Filter by project if a project is selected
  if (currentFileProjectFilter && currentFileProjectFilter !== 'all') {
    const projectIdNum = parseInt(currentFileProjectFilter);
    const projectIdStr = String(currentFileProjectFilter);
    
    if (window.__DEBUG__) {
      console.log('🔍 Filtering files by project:', {
        projectIdNum,
        projectIdStr,
        currentFileProjectFilter,
        totalFilesBefore: files.length
      });
    }
    
    files = files.filter(f => {
      // Check if file is linked to the selected project in two ways:
      // 1. Directly linked to project (in f.projects)
      // 2. Linked via tasks that belong to the project (in f.tasks[].projectId)
      
      // Check direct project links
      const fileProjects = f.projects || [];
      const hasDirectProjectLink = fileProjects.some(p => {
        const pId = typeof p === 'object' && p !== null ? (p.id || p.projectId) : p;
        if (pId == null) return false;
        const pIdNum = typeof pId === 'number' ? pId : parseInt(pId);
        const pIdStr = String(pId);
        return pIdNum === projectIdNum || pIdStr === projectIdStr;
      });
      
      if (hasDirectProjectLink) {
        if (window.__DEBUG__) {
          console.log('  File matches project (direct):', f.name || f.key);
        }
        return true;
      }
      
      // Check indirect links via tasks
      const fileTasks = f.tasks || [];
      const hasTaskLink = fileTasks.some(t => {
        // Task can have projectId as a property or nested in task object
        const taskProjectId = t.projectId || (typeof t === 'object' && t !== null ? t.projectId : null);
        if (taskProjectId == null) return false;
        
        const taskPIdNum = typeof taskProjectId === 'number' ? taskProjectId : parseInt(taskProjectId);
        const taskPIdStr = String(taskProjectId);
        
        const match = taskPIdNum === projectIdNum || taskPIdStr === projectIdStr;
        
        if (window.__DEBUG__ && match) {
          console.log('  File matches project (via task):', {
            fileName: f.name || f.key,
            taskId: t.id || t.title,
            taskProjectId: taskProjectId,
            filterProjectId: projectIdNum
          });
        }
        
        return match;
      });
      
      if (hasTaskLink) {
        if (window.__DEBUG__) {
          console.log('  File matches project (via task):', f.name || f.key);
        }
        return true;
      }
      
      // No match found
      if (window.__DEBUG__) {
        console.log('  File does not match project:', {
          fileName: f.name || f.key,
          hasProjects: fileProjects.length > 0,
          hasTasks: fileTasks.length > 0,
          projectIds: fileProjects.map(p => typeof p === 'object' ? (p.id || p.projectId) : p),
          taskProjectIds: fileTasks.map(t => t.projectId).filter(Boolean)
        });
      }
      
      return false;
    });
    
    if (window.__DEBUG__) {
      console.log('🔍 Filtered by project result:', {
        projectId: projectIdNum,
        filesAfter: files.length,
        fileNames: files.map(f => f.name || f.key).slice(0, 5)
      });
    }
  }
  
  if (files.length === 0) {
    // Context-aware empty states
    let emptyStateConfig = {
      icon: '📁',
      message: 'No files yet',
      subtitle: 'Link files to tasks or projects, or add files directly',
      action: {
        text: '+ Add Your First File',
        action: 'file:add'
      }
    };
    
    if (currentFileView === 'active') {
      emptyStateConfig = {
        icon: '⚡',
        message: 'No active files right now',
        subtitle: 'Files linked to active tasks or projects will appear here',
        action: {
          text: 'View All Files',
          action: 'view:all'
        }
      };
    } else if (currentFileView === 'stale') {
      emptyStateConfig = {
        icon: '⏰',
        message: 'No stale files',
        subtitle: 'All your active files are up to date!',
        action: {
          text: 'View All Files',
          action: 'view:all'
        }
      };
    } else if (currentFileView === 'missing') {
      emptyStateConfig = {
        icon: '✅',
        message: 'No missing files',
        subtitle: 'All your files are accessible!',
        action: {
          text: 'View All Files',
          action: 'view:all'
        }
      };
    } else if (currentFileView === 'submissions') {
      emptyStateConfig = {
        icon: '📤',
        message: 'No submission files',
        subtitle: 'Files marked as submissions will appear here',
        action: {
          text: 'View All Files',
          action: 'view:all'
        }
      };
    } else if (currentFileProjectFilter && currentFileProjectFilter !== 'all') {
      const project = (projects || []).find(p => p.id == currentFileProjectFilter);
      emptyStateConfig = {
        icon: '📁',
        message: `No files for ${project?.name || 'this project'}`,
        subtitle: 'Link files to this project to see them here',
        action: {
          text: 'View All Files',
          action: 'view:all'
        }
      };
    }
    
    c.innerHTML = EmptyState(emptyStateConfig);
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
    
    return renderFileCard(f, fileHistory || {}, tasks || []);
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
 * @param {Array} allTasks - All tasks from state (for resolving task details)
 */
function renderFileCard(file, fileHistory, allTasks = []) {
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
  
  // Get linked tasks - resolve task IDs/objects to full task objects
  const linkedTasks = [];
  (file.tasks || []).forEach(t => {
    if (!t) return;
    
    // If t is already a full task object, use it
    if (typeof t === 'object' && t.id && t.title) {
      linkedTasks.push(t);
      return;
    }
    
    // If t is a task ID, find the task in allTasks
    const taskId = typeof t === 'object' ? (t.id || t.taskId) : t;
    if (taskId) {
      const fullTask = allTasks.find(tt => String(tt.id) === String(taskId));
      if (fullTask) {
        linkedTasks.push(fullTask);
      }
    }
  });
  
  // Determine status badge
  let statusBadge = '';
  const isStale = lastMod && (Date.now() - lastMod.getTime()) > (30 * 24 * 60 * 60 * 1000) && 
                  (file.tasks || []).some(t => !t.done && t.status === 'Doing');
  const isActive = (file.tasks || []).some(t => !t.done && t.status === 'Doing') ||
                   (file.projects || []).some(p => !p.done);
  
  if (isMissing) {
    statusBadge = '<span class="file-status-badge file-status-missing" style="display:inline-flex;align-items:center;gap:4px;padding:3px 8px;background:var(--overdue);color:white;border-radius:12px;font-size:10px;font-weight:500;text-transform:uppercase;">⚠️ Missing</span>';
  } else if (isStale) {
    statusBadge = '<span class="file-status-badge file-status-stale" style="display:inline-flex;align-items:center;gap:4px;padding:3px 8px;background:var(--soon);color:white;border-radius:12px;font-size:10px;font-weight:500;text-transform:uppercase;">⏰ Stale</span>';
  } else if (isActive) {
    statusBadge = '<span class="file-status-badge file-status-active" style="display:inline-flex;align-items:center;gap:4px;padding:3px 8px;background:#4ade80;color:white;border-radius:12px;font-size:10px;font-weight:500;text-transform:uppercase;">⚡ Active</span>';
  }
  
  // Render task badges (showing status and priority)
  const taskBadges = linkedTasks.slice(0, 3).map(t => {
    const taskStatus = t.status || 'Todo';
    const taskPriority = t.priority === 3 ? 'high' : t.priority === 1 ? 'low' : 'medium';
    const taskDone = t.done || false;
    const priorityColor = taskPriority === 'high' ? 'var(--overdue)' : taskPriority === 'low' ? 'var(--text-dim)' : 'var(--soon)';
    const statusColor = taskDone ? 'var(--text-dim)' : taskStatus === 'Doing' ? '#4ade80' : taskStatus === 'Done' ? 'var(--text-dim)' : 'var(--blush)';
    
    return `<span class="file-task-badge" data-task-id="${esc(t.id || '')}" style="display:inline-flex;align-items:center;gap:3px;padding:3px 8px;background:${statusColor}20;border:1px solid ${statusColor};border-left:3px solid ${priorityColor};border-radius:6px;font-size:10px;color:${taskDone ? 'var(--text-dim)' : 'var(--text)'};font-weight:500;cursor:pointer;transition:all 0.15s;" onmouseover="this.style.background='${statusColor}40';this.style.transform='scale(1.05)'" onmouseout="this.style.background='${statusColor}20';this.style.transform='scale(1)'" title="${esc(t.title || 'Task')} - ${taskStatus} (${taskPriority} priority)" data-action="file:open-task" data-task-id="${esc(t.id || '')}">${taskDone ? '✓' : '○'} ${esc(taskStatus)}</span>`;
  }).join('');
  
  const moreTasksCount = linkedTasks.length > 3 ? linkedTasks.length - 3 : 0;
  
  return `<div class="file-card ${isMissing ? 'file-missing' : ''}" data-file-id="${esc(fileId)}" data-file-key="${esc(fileKey)}" draggable="true" style="background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:16px;margin-bottom:16px;transition:all 0.2s;cursor:grab;" ondragstart="window.Petal?.features?.fileTaskOperations?.handleFileDragStart?.(event, ${esc(JSON.stringify(fileLink))}, '${esc(fileKey)}')">
    <div class="file-card-header" style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:12px;">
      <div style="display:flex;align-items:flex-start;gap:12px;flex:1;min-width:0;">
        <span style="font-size:24px;flex-shrink:0;">${icon}</span>
        <div style="flex:1;min-width:0;">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;flex-wrap:wrap;">
            <div style="font-weight:600;color:var(--text);font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1;min-width:0;">${esc(label)}</div>
            ${statusBadge}
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:12px;font-size:11px;color:var(--text-dim);margin-top:6px;">
            ${addedAt ? `<span>Added: ${addedAt.toLocaleDateString()}</span>` : ''}
            ${lastMod ? `<span>Modified: ${lastMod.toLocaleDateString()}</span>` : ''}
            ${isMissing && missingSince ? `<span style="color:var(--overdue);">Missing since: ${missingSince.toLocaleDateString()}</span>` : ''}
          </div>
          ${isMissing && lastKnownPath ? `<div style="font-size:10px;color:var(--text-dim);margin-top:4px;font-style:italic;overflow:hidden;text-overflow:ellipsis;">Last known: ${esc(lastKnownPath.length > 60 ? '...' + lastKnownPath.slice(-57) : lastKnownPath)}</div>` : ''}
        </div>
      </div>
      <div style="display:flex;gap:6px;flex-shrink:0;">
        <button class="file-open-btn btn-secondary" data-action="file:open" data-path="${escAttr(JSON.stringify(fileLink))}" style="font-size:11px;padding:6px 12px;white-space:nowrap;" title="Open file">Open</button>
        <button data-action="file:hook" data-file-id="${esc(fileId)}" data-file-key="${esc(fileKey)}" data-path="${escAttr(JSON.stringify(fileLink))}" class="btn-secondary" style="font-size:11px;padding:6px 12px;" title="Hook this file to a task or project">🔗</button>
      </div>
    </div>
    
    ${warnings.length > 0 ? `<div style="padding:8px 12px;background:var(--bg2);border-left:3px solid var(--soon);border-radius:4px;margin-bottom:12px;font-size:11px;color:var(--soon);">⚠️ ${warnings.join(', ')}</div>` : ''}
    ${isOutsideVault ? `<div style="padding:8px 12px;background:var(--bg2);border-left:3px solid var(--text-dim);border-radius:4px;margin-bottom:12px;font-size:11px;color:var(--text-dim);">⚠️ Outside vault</div>` : ''}
    
    <div class="file-card-meta" style="display:flex;gap:16px;margin-bottom:12px;font-size:12px;flex-wrap:wrap;">
      ${tasksCount > 0 ? `<span data-action="file:show-tasks" data-file-key="${esc(fileKey)}" style="display:inline-flex;align-items:center;gap:4px;padding:4px 10px;background:var(--bg2);border:1px solid var(--border);border-radius:8px;cursor:pointer;transition:all 0.15s;color:var(--rose);font-weight:500;" onmouseover="this.style.background='var(--bg3)';this.style.borderColor='var(--rose)'" onmouseout="this.style.background='var(--bg2)';this.style.borderColor='var(--border)'" title="Click to view ${tasksCount} task${tasksCount > 1 ? 's' : ''}">📋 ${tasksCount} task${tasksCount > 1 ? 's' : ''}</span>` : ''}
      ${projectsCount > 0 ? `<span data-action="file:show-projects" data-file-key="${esc(fileKey)}" style="display:inline-flex;align-items:center;gap:4px;padding:4px 10px;background:var(--bg2);border:1px solid var(--border);border-radius:8px;cursor:pointer;transition:all 0.15s;color:var(--rose);font-weight:500;" onmouseover="this.style.background='var(--bg3)';this.style.borderColor='var(--rose)'" onmouseout="this.style.background='var(--bg2)';this.style.borderColor='var(--border)'" title="Click to view ${projectsCount} project${projectsCount > 1 ? 's' : ''}">📁 ${projectsCount} project${projectsCount > 1 ? 's' : ''}</span>` : ''}
      ${file.status ? `<span style="padding:4px 10px;background:var(--bg2);border:1px solid var(--border);border-radius:8px;color:var(--text-dim);">Status: ${esc(file.status)}</span>` : ''}
    </div>
    
    ${taskBadges ? `<div class="file-task-badges" style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px;padding:8px 12px;background:var(--bg2);border:1px solid var(--border);border-radius:8px;">
      ${taskBadges}
      ${moreTasksCount > 0 ? `<span style="display:inline-flex;align-items:center;gap:3px;padding:3px 8px;background:var(--bg3);border:1px solid var(--border);border-radius:6px;font-size:10px;color:var(--text-dim);">+${moreTasksCount} more</span>` : ''}
    </div>` : ''}
    
    ${file.notes ? `<div style="margin-bottom:12px;padding:10px 12px;background:var(--bg2);border:1px solid var(--border);border-radius:6px;font-size:11px;color:var(--text-dim);line-height:1.5;max-height:80px;overflow:hidden;text-overflow:ellipsis;white-space:pre-wrap;">${esc(file.notes.length > 150 ? file.notes.substring(0, 150) + '...' : file.notes)}</div>` : ''}
    
    <div class="file-card-actions" style="display:flex;gap:8px;flex-wrap:wrap;padding-top:12px;border-top:1px solid var(--border);">
      ${isMissing ? `<button class="btn-secondary" data-action="file:locate" data-file-key="${esc(fileKey)}" data-path="${escAttr(JSON.stringify(fileLink))}" style="font-size:11px;padding:6px 12px;background:var(--rose);color:white;">🔍 Locate File</button>` : ''}
      ${tasksCount > 0 ? `<button class="btn-secondary" data-action="file:view-tasks" data-file-key="${esc(fileKey)}" style="font-size:11px;padding:6px 12px;background:var(--rose);color:white;" title="View linked tasks">📋 View Tasks</button>` : ''}
      <button class="btn-secondary" data-action="file:create-task" data-file-key="${esc(fileKey)}" data-path="${escAttr(JSON.stringify(fileLink))}" style="font-size:11px;padding:6px 12px;background:var(--sage);color:white;" title="Create task from this file">➕ Create Task</button>
      ${file.key ? `<button data-action="file:show-relations" data-file-key="${esc(file.key)}" class="btn-secondary" style="font-size:11px;padding:6px 12px;">Relations</button>` : ''}
      <button data-action="file:notes" data-file-id="${esc(fileId)}" class="btn-secondary" style="font-size:11px;padding:6px 12px;" title="Add or edit notes for this file">${file.notes ? '📝 Edit Notes' : '📄 Add Notes'}</button>
    </div>
  </div>`;
}
