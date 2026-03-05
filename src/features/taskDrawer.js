// ═══════════════════════ TASK DRAWER ═══════════════════════
// Handles the task drawer UI for viewing/editing task details, notes, files, and subtasks

import { esc, escAttr, fileIcon } from '../utils/strings.js';

// Store drawer state in window (shared across module and main script)
if (typeof window !== 'undefined') {
  window.currentDrawerTaskId = window.currentDrawerTaskId || null;
  window.currentDrawerTab = window.currentDrawerTab || 'notes';
}

/**
 * Helper to find active (non-deleted) task by ID
 */
function findActiveTask(tasks, taskId) {
  if (!taskId) return null;
  return tasks.find(t => t.id === taskId && !t.deletedAt);
}

/**
 * Helper to get project name by ID
 */
function projectNameById(projects, projectId) {
  if (!projectId) return '';
  const project = projects.find((p) => String(p.id) === String(projectId));
  return project ? project.name : '';
}

/**
 * Build context from store when not provided (e.g. when openTaskDrawer(taskId) is called with one arg)
 */
function getDrawerContext(ctx) {
  if (ctx && typeof ctx === 'object' && !Array.isArray(ctx) && (ctx.tasks !== undefined || ctx.projects !== undefined)) {
    return ctx;
  }
  const state = window.Petal?.store?.getState?.() || {};
  return {
    tasks: state.tasks || [],
    projects: state.projects || [],
    save: window.Petal?.handlers?.save || (() => Promise.resolve()),
    render: window.Petal?.handlers?.render || (() => {})
  };
}

/**
 * Open the task drawer for a specific task.
 * Can be called as openTaskDrawer(ctx, taskId) or openTaskDrawer(taskId) — context is built from store if needed.
 */
export function openTaskDrawer(ctxOrTaskId, taskIdParam) {
  let ctx;
  let taskId;
  if (taskIdParam !== undefined) {
    ctx = getDrawerContext(ctxOrTaskId);
    taskId = taskIdParam;
  } else {
    ctx = getDrawerContext(null);
    taskId = ctxOrTaskId;
  }
  const { tasks, projects } = ctx;
  // Normalize taskId for comparison (handle string/number mismatch)
  const taskIdNum = Number(taskId);
  const taskIdStr = String(taskId).trim();
  
  // Only show active (non-deleted) tasks in drawer
  // Try multiple comparison methods to handle type mismatches
  const task = tasks.find(t => {
    if (t.deletedAt) return false;
    // Try exact match first
    if (t.id === taskId || t.id === taskIdNum || String(t.id) === taskIdStr) return true;
    // Try number comparison if both are valid numbers
    if (!isNaN(taskIdNum) && !isNaN(Number(t.id))) {
      return Number(t.id) === taskIdNum;
    }
    return false;
  });
  
  if (!task) {
    console.warn('Task not found or deleted:', { 
      taskId, 
      taskIdNum, 
      taskIdStr,
      tasksCount: tasks?.length,
      sampleTaskIds: tasks?.slice(0, 3).map(t => ({ id: t.id, type: typeof t.id }))
    });
    return;
  }
  
  window.currentDrawerTaskId = taskId;
  window.currentDrawerTab = 'notes';
  
  // Set title and meta
  const titleEl = document.getElementById('task-drawer-title');
  const metaEl = document.getElementById('task-drawer-meta');
  if (titleEl) titleEl.textContent = task.title || 'Untitled Task';
  
  const meta = [];
  if (task.priority) meta.push(task.priority);
  if (task.status) meta.push(task.status);
  if (task.projectId) {
    const project = projects.find(p => p.id === task.projectId);
    if (project) meta.push(project.name);
  }
  if (metaEl) metaEl.textContent = meta.join(' • ') || '';
  
  // Populate note
  const noteInput = document.getElementById('task-drawer-note-input');
  if (noteInput) noteInput.value = task.note || '';
  
  // Hide "Add New File" button in workflow view (only supports linking existing files)
  const addNewFileBtn = document.getElementById('btn-add-new-file-to-task');
  if (addNewFileBtn) {
    addNewFileBtn.style.display = (window.currentView === 'workflow') ? 'none' : '';
  }
  
  // Render log entries
  renderTaskLogEntries(ctx);
  
  // Render files
  renderTaskDrawerFiles(ctx);
  
  // Render subtasks
  renderTaskDrawerSubtasks(ctx);
  
  // Show/hide protocol tab based on task protocol
  const protocolTab = document.getElementById('task-drawer-tab-protocol');
  if (protocolTab) {
    if (task.protocol && task.protocol.enabled) {
      protocolTab.style.display = 'block';
    } else {
      protocolTab.style.display = 'none';
    }
  }
  
  // Switch to requested tab (e.g. 'files') or default 'notes'
  const initialTab = typeof window.openTaskDrawerToTab === 'string' ? window.openTaskDrawerToTab : 'notes';
  switchTaskDrawerTab(initialTab);
  window.openTaskDrawerToTab = undefined;
  
  // Show drawer
  const drawer = document.getElementById('task-drawer');
  if (drawer) drawer.style.display = 'flex';
}

/**
 * Close the task drawer
 */
export function closeTaskDrawer() {
  const drawer = document.getElementById('task-drawer');
  if (drawer) drawer.style.display = 'none';
  window.currentDrawerTaskId = null;
}

/**
 * Switch between drawer tabs
 */
export function switchTaskDrawerTab(tabName) {
  window.currentDrawerTab = tabName;
  
  // Update tab buttons
  ['notes', 'protocol', 'files', 'subtasks'].forEach(tab => {
    const btn = document.getElementById(`task-drawer-tab-${tab}`);
    const content = document.getElementById(`task-drawer-${tab}`);
    if (btn && content) {
      if (tab === tabName) {
        btn.classList.add('active');
        content.style.display = 'block';
        // Render protocol tab if switching to it
        if (tab === 'protocol' && typeof renderProtocolTab === 'function') {
          renderProtocolTab();
        }
      } else {
        btn.classList.remove('active');
        content.style.display = 'none';
      }
    }
  });
}

/**
 * Save task note from drawer (debounced)
 */
export function debounceSaveTaskNoteFromDrawer(ctx) {
  if (!window.currentDrawerTaskId) return;
  const noteInput = document.getElementById('task-drawer-note-input');
  if (!noteInput) return;
  const value = noteInput.value || '';
  
  // Use global debounce function if available
  if (typeof debounceSaveTaskNote === 'function') {
    debounceSaveTaskNote(window.currentDrawerTaskId, value);
  } else {
    // Fallback: save immediately
    const task = findActiveTask(ctx.tasks, window.currentDrawerTaskId);
    if (task) {
      task.note = value;
      task.noteUpdatedAt = new Date().toISOString();
      if (ctx.save) ctx.save();
    }
  }
}

/**
 * Render task log entries
 */
export function renderTaskLogEntries(ctx) {
  if (!window.currentDrawerTaskId) return;
  const { tasks } = ctx;
  const task = findActiveTask(tasks, window.currentDrawerTaskId);
  if (!task) return;
  
  const container = document.getElementById('task-drawer-log-entries');
  if (!container) return;
  
  if (!task.log || task.log.length === 0) {
    container.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-dim);font-size:12px;">No log entries yet</div>';
    return;
  }
  
  container.innerHTML = task.log.map(entry => {
    const date = new Date(entry.at);
    const dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    return `
      <div class="task-log-entry">
        <div class="task-log-entry-header">
          <span class="task-log-entry-time">${esc(dateStr)}</span>
          <button class="task-log-entry-delete" onclick="window.Petal?.features?.taskDrawer?.deleteTaskLogEntry('${entry.id}')" title="Delete">✕</button>
        </div>
        <div style="font-size:12px;color:var(--text);white-space:pre-wrap;">${esc(entry.text || '')}</div>
      </div>
    `;
  }).join('');
}

/**
 * Add a new log entry to the task
 */
export async function addTaskLogEntry(ctx) {
  if (!window.currentDrawerTaskId) return;
  const { tasks, save } = ctx;
  const task = findActiveTask(tasks, window.currentDrawerTaskId);
  if (!task) return;
  
  const text = prompt('Enter log entry:');
  if (!text || !text.trim()) return;
  
  if (!task.log) task.log = [];
  
  const entry = {
    id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    at: new Date().toISOString(),
    text: text.trim()
  };
  
  task.log.push(entry);
  task.log.sort((a, b) => new Date(b.at) - new Date(a.at)); // Sort newest first
  
  await save();
  renderTaskLogEntries(ctx);
}

/**
 * Delete a log entry
 */
export async function deleteTaskLogEntry(ctx, entryId) {
  if (!window.currentDrawerTaskId) return;
  const { tasks, save } = ctx;
  const task = findActiveTask(tasks, window.currentDrawerTaskId);
  if (!task || !task.log) return;
  
  task.log = task.log.filter(e => e.id !== entryId);
  await save();
  renderTaskLogEntries(ctx);
}

/**
 * Render files in the task drawer
 */
export function renderTaskDrawerFiles(ctx) {
  if (!window.currentDrawerTaskId) return;
  const { tasks } = ctx;
  const task = findActiveTask(tasks, window.currentDrawerTaskId);
  if (!task) return;
  
  const container = document.getElementById('task-drawer-files-list');
  if (!container) return;
  
  // Get task files using file management module
  const getTaskFiles = window.Petal?.features?.fileManagement?.getTaskFiles;
  const taskFiles = getTaskFiles ? getTaskFiles(task) : [];
  
  if (taskFiles.length === 0) {
    container.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-dim);font-size:12px;">No files linked</div>';
    return;
  }
  
  container.innerHTML = taskFiles.map(file => {
    const label = file.label || file.name || 'File';
    const note = file.note ? `<div class="task-drawer-file-note">${esc(file.note)}</div>` : '';
    const icon = fileIcon(file.abs_path || file.onedrive_rel || file.share_url || '');
    const fileKey = file.id || (file.abs_path || file.onedrive_rel || file.share_url || '');
    const unlinkId = file.id ? file.id : 'legacy:' + fileKey;
    return `
      <div class="task-drawer-file-item">
        <div class="task-drawer-file-info">
          <div class="task-drawer-file-name">${icon} ${esc(label)}</div>
          ${note}
        </div>
        <div class="task-drawer-file-actions">
          <button type="button" class="file-open-btn" data-action="file:open" data-path="${escAttr(JSON.stringify(file))}" style="padding:4px 8px;background:var(--bg2);border:1px solid var(--border);border-radius:4px;font-size:11px;cursor:pointer;">Open</button>
          <button type="button" class="task-drawer-unlink-file" data-file-unlink-id="${escAttr(unlinkId)}" style="padding:4px 8px;background:none;border:1px solid var(--border);border-radius:4px;font-size:11px;cursor:pointer;color:var(--text-dim);">Unlink</button>
        </div>
      </div>
    `;
  }).join('');

  container.querySelectorAll('.task-drawer-unlink-file').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-file-unlink-id');
      if (id != null) unlinkFileFromTask(ctx, id);
    });
  });

  // Re-hydrate Lucide icons after innerHTML (fixes "halo" issue)
  if (window.lucide?.createIcons) {
    window.lucide.createIcons();
  }
}

/**
 * Open the "Link file" modal for a task (from any task card).
 * Lets user choose: link an existing file in Petal, or add a new file.
 * @param {string|number} taskId - Task ID to link the file to
 */
export function openLinkFileForTask(taskId) {
  if (taskId == null) return;
  const ctx = getDrawerContext(null);
  const { tasks, projects } = ctx;
  const task = findActiveTask(tasks, taskId);
  if (!task) return;

  const modal = document.createElement('div');
  modal.className = 'quick-capture-modal';
  modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:10000;';
  modal.onclick = (e) => {
    if (e.target === modal) document.body.removeChild(modal);
  };

  modal.innerHTML = `
    <div class="quick-capture-box" style="max-width:400px;background:var(--surface);border-radius:12px;padding:24px;" onclick="event.stopPropagation()">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;">
        <h3 style="font-family:'Cormorant Garamond',serif;font-size:22px;font-weight:400;color:var(--rose);margin:0;">Link file to task</h3>
        <button type="button" onclick="this.closest('.quick-capture-modal').remove()" style="background:none;border:none;font-size:20px;color:var(--text-dim);cursor:pointer;padding:0;width:28px;height:28px;display:flex;align-items:center;justify-content:center;border-radius:50%;" title="Close">✕</button>
      </div>
      <p style="margin:0 0 16px;font-size:13px;color:var(--text-dim);">Choose how to add a file to this task:</p>
      <div style="display:flex;flex-direction:column;gap:10px;">
        <button type="button" id="link-file-existing-btn" class="btn-secondary" style="padding:12px 16px;text-align:left;display:flex;align-items:center;gap:10px;" title="Pick a file already in Petal">
          <span style="font-size:18px;">📎</span>
          <span>Link existing file in Petal</span>
        </button>
        <button type="button" id="link-file-new-btn" class="btn-submit" style="padding:12px 16px;text-align:left;display:flex;align-items:center;gap:10px;" title="Add a new file and link it">
          <span style="font-size:18px;">➕</span>
          <span>Add new file</span>
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const existingBtn = modal.querySelector('#link-file-existing-btn');
  const newBtn = modal.querySelector('#link-file-new-btn');

  function closeChoiceModal() {
    if (modal.parentNode) modal.parentNode.removeChild(modal);
  }

  existingBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    closeChoiceModal();
    window.currentDrawerTaskId = taskId;
    // Use window wrapper so ctx is built the same way as drawer; fallback to direct call with our ctx
    setTimeout(() => {
      if (typeof window.linkExistingFileToTask === 'function') {
        window.linkExistingFileToTask();
      } else {
        linkExistingFileToTask(ctx);
      }
    }, 0);
  });

  newBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    closeChoiceModal();
    window.currentDrawerTaskId = taskId;
    window.currentModalTaskId = taskId;
    setTimeout(() => {
      if (typeof window.addNewFileToTask === 'function') {
        window.addNewFileToTask();
      } else {
        addNewFileToTask();
      }
    }, 0);
  });

}

/**
 * Collect all files "in Petal" for linking: project files (when task has project) + state.files + all projects' files for standalone
 */
function getAllFilesForLinking(task, ctx) {
  const { projects } = ctx;
  const state = window.Petal?.store?.getState?.() || {};
  const stateFiles = state.files || [];
  const list = [];
  const seen = new Set();

  function addFile(fileObj, sourceId) {
    const link = fileObj.fileLink || fileObj;
    const path = link.onedrive_rel || link.abs_path || link.share_url || link.key || '';
    const key = path || (fileObj.id && `id:${fileObj.id}`) || JSON.stringify(link);
    if (!key || seen.has(key)) return;
    seen.add(key);
    const label = fileObj.label || fileObj.name || link.label || link.name || (path ? path.split(/[/\\]/).pop() : 'File');
    list.push({ key, label, link: { ...link, label }, id: fileObj.id, sourceId });
  }

  if (task.projectId) {
    const project = projects.find(p => p.id === task.projectId);
    if (project?.files?.length) {
      project.files.forEach(f => f && addFile(f, project.id));
      return { files: list, projectOnly: true };
    }
  }

  (stateFiles || []).forEach(f => f && addFile(f, 'state'));
  (projects || []).forEach(p => {
    (p.files || []).forEach(f => f && addFile(f, p.id));
  });
  return { files: list, projectOnly: false };
}

/**
 * Link an existing file (from project or from anywhere in Petal) to the task.
 * Project tasks: can link project files (task.fileIds) or any file (task.files legacy).
 * Standalone tasks: link any file into task.files (legacy).
 * Can be called with no args when invoked from drawer (uses currentDrawerTaskId + getDrawerContext).
 */
export async function linkExistingFileToTask(ctx) {
  if (!window.currentDrawerTaskId) return;
  ctx = ctx || getDrawerContext(null);
  const { tasks, projects, save } = ctx;
  const task = findActiveTask(tasks, window.currentDrawerTaskId);
  if (!task) return;

  const { files: availableFiles, projectOnly } = getAllFilesForLinking(task, ctx);

  const existingFileIds = task.fileIds || [];
  const existingLegacyKeys = new Set((task.files || []).map(f => {
    const o = typeof f === 'string' ? { abs_path: f } : f;
    return o.onedrive_rel || o.abs_path || o.share_url || '';
  }));

  const toShow = availableFiles.filter(f => {
    if (projectOnly && f.id && existingFileIds.includes(f.id)) return false;
    if (!projectOnly && existingLegacyKeys.has(f.key)) return false;
    if (!projectOnly && f.id && task.projectId && f.sourceId === task.projectId && existingFileIds.includes(f.id)) return false;
    return true;
  });

  if (toShow.length === 0) {
    alert(projectOnly ? 'All project files are already linked to this task.' : 'No other files in Petal to link, or they\'re already linked. Add a new file instead.');
    return;
  }

  const modal = document.createElement('div');
  modal.className = 'quick-capture-modal';
  modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:10000;';
  modal.onclick = (e) => { if (e.target === modal) document.body.removeChild(modal); };

  const checkboxes = toShow.map((file) => {
    const value = file.id && projectOnly ? file.id : file.key;
    const dataLink = escAttr(JSON.stringify(file.link));
    return `
      <label style="display:flex;align-items:center;gap:8px;padding:8px;cursor:pointer;border-radius:4px;transition:background 0.15s;" onmouseover="this.style.background='var(--bg2)'" onmouseout="this.style.background='transparent'">
        <input type="checkbox" value="${escAttr(value)}" data-link="${dataLink}" data-id="${file.id || ''}" data-source-id="${file.sourceId || ''}" style="cursor:pointer;">
        <span>${esc(file.label)}</span>
      </label>
    `;
  }).join('');

  modal.innerHTML = `
    <div class="quick-capture-box" style="max-width:500px;background:var(--surface);border-radius:12px;padding:24px;" onclick="event.stopPropagation()">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;">
        <h3 style="font-family:'Cormorant Garamond',serif;font-size:22px;font-weight:400;color:var(--rose);margin:0;">Link Files to Task</h3>
        <button type="button" onclick="this.closest('.quick-capture-modal').remove()" style="background:none;border:none;font-size:20px;color:var(--text-dim);cursor:pointer;padding:0;width:28px;height:28px;display:flex;align-items:center;justify-content:center;border-radius:50%;" title="Close">✕</button>
      </div>
      <div style="max-height:400px;overflow-y:auto;margin-bottom:20px;border:1px solid var(--border);border-radius:8px;padding:12px;background:var(--bg);">
        ${checkboxes}
      </div>
      <div style="display:flex;gap:10px;justify-content:flex-end;padding-top:8px;border-top:1px solid var(--border);">
        <button type="button" onclick="this.closest('.quick-capture-modal').remove()" class="btn-secondary">Cancel</button>
        <button type="button" class="btn-submit" id="link-files-submit">Link Selected</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const submitBtn = modal.querySelector('#link-files-submit');
  submitBtn.onclick = async () => {
    const checked = modal.querySelectorAll('input[type="checkbox"]:checked');
    if (checked.length === 0) {
      alert('Please select at least one file');
      return;
    }

    const project = task.projectId ? projects.find(p => p.id === task.projectId) : null;
    if (!task.files) task.files = [];
    if (!task.fileIds) task.fileIds = [];

    checked.forEach(cb => {
      const id = cb.getAttribute('data-id');
      const sourceId = cb.getAttribute('data-source-id');
      const linkJson = cb.getAttribute('data-link');
      if (projectOnly && id && sourceId === task.projectId) {
        if (!task.fileIds.includes(id)) task.fileIds.push(id);
      } else if (linkJson) {
        try {
          const link = JSON.parse(linkJson);
          const key = link.onedrive_rel || link.abs_path || link.share_url || '';
          if (key && !existingLegacyKeys.has(key)) {
            task.files.push(link);
            existingLegacyKeys.add(key);
          }
        } catch (_) {}
      }
    });

    await save();
    renderTaskDrawerFiles(ctx);
    document.body.removeChild(modal);
  };
}

/**
 * Add a new file to the task.
 * Project task: opens project add-file modal (file goes to project and task.fileIds).
 * Standalone task: opens a simple modal to choose/paste a file, then add to task.files.
 */
export function addNewFileToTask() {
  if (!window.currentDrawerTaskId) return;
  const ctx = getDrawerContext(null);
  const { tasks, projects, save } = ctx;
  const task = findActiveTask(tasks, window.currentDrawerTaskId);
  if (!task) return;

  if (task.projectId) {
    if (typeof window.openProjectAddFileModal === 'function') {
      window.currentModalTaskId = window.currentDrawerTaskId;
      window.openProjectAddFileModal(task.projectId);
    } else if (window.Petal?.features?.modalOperations?.openProjectAddFileModal) {
      window.currentModalTaskId = window.currentDrawerTaskId;
      window.Petal.features.modalOperations.openProjectAddFileModal(ctx, task.projectId);
    } else {
      alert('Unable to open file modal. Please try again.');
    }
    return;
  }

  // Standalone task: show simple "Add file" modal (choose file or enter path/label)
  const modal = document.createElement('div');
  modal.className = 'quick-capture-modal';
  modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:10000;';
  modal.onclick = (e) => { if (e.target === modal) document.body.removeChild(modal); };

  modal.innerHTML = `
    <div class="quick-capture-box" style="max-width:420px;background:var(--surface);border-radius:12px;padding:24px;" onclick="event.stopPropagation()">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;">
        <h3 style="font-family:'Cormorant Garamond',serif;font-size:22px;font-weight:400;color:var(--rose);margin:0;">Add file to task</h3>
        <button type="button" onclick="this.closest('.quick-capture-modal').remove()" style="background:none;border:none;font-size:20px;color:var(--text-dim);cursor:pointer;padding:0;width:28px;height:28px;" title="Close">✕</button>
      </div>
      <div style="margin-bottom:12px;">
        <label style="display:block;font-size:12px;color:var(--text-dim);margin-bottom:4px;">Label</label>
        <input type="text" id="standalone-file-label" placeholder="e.g. Report draft" style="width:100%;padding:8px 12px;border:1px solid var(--border);border-radius:6px;background:var(--surface);color:var(--text);font-size:13px;">
      </div>
      <div style="margin-bottom:16px;">
        <label style="display:block;font-size:12px;color:var(--text-dim);margin-bottom:4px;">Path or URL</label>
        <input type="text" id="standalone-file-path" placeholder="File path or https://..." style="width:100%;padding:8px 12px;border:1px solid var(--border);border-radius:6px;background:var(--surface);color:var(--text);font-size:13px;">
      </div>
      <div style="display:flex;gap:8px;justify-content:flex-end;">
        <button type="button" class="btn-secondary" onclick="this.closest('.quick-capture-modal').remove()">Cancel</button>
        <button type="button" class="btn-submit" id="standalone-file-choose-btn" style="margin-right:auto;">📁 Choose file</button>
        <button type="button" class="btn-submit" id="standalone-file-submit">Add to task</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const labelInput = modal.querySelector('#standalone-file-label');
  const pathInput = modal.querySelector('#standalone-file-path');
  const chooseBtn = modal.querySelector('#standalone-file-choose-btn');
  const submitBtn = modal.querySelector('#standalone-file-submit');

  chooseBtn.onclick = async () => {
    if (window.electronAPI?.chooseFile) {
      try {
        const fileLink = await window.electronAPI.chooseFile();
        if (fileLink) {
          pathInput.value = fileLink.abs_path || fileLink.onedrive_rel || fileLink.share_url || '';
          if (fileLink.label && !labelInput.value) labelInput.value = fileLink.label;
        }
      } catch (e) {
        console.error('File picker error:', e);
        alert('Could not open file picker. Enter path or URL manually.');
      }
    } else {
      pathInput.focus();
      alert('No file picker in this environment. Enter the file path or URL above.');
    }
  };

  submitBtn.onclick = async () => {
    const label = (labelInput.value || '').trim() || 'File';
    const path = (pathInput.value || '').trim();
    if (!path) {
      alert('Enter a file path or URL, or use Choose file.');
      return;
    }
    const link = path.startsWith('http://') || path.startsWith('https://')
      ? { share_url: path, label, abs_path: null, onedrive_rel: null }
      : { abs_path: path, label, onedrive_rel: null, share_url: null };
    if (!task.files) task.files = [];
    task.files.push(link);
    await save();
    renderTaskDrawerFiles(ctx);
    document.body.removeChild(modal);
  };
}

/**
 * Unlink a file from the task.
 * Can be called as unlinkFileFromTask(fileId) or unlinkFileFromTask(ctx, fileId).
 * fileId can be a project file id, or "legacy:" + path for task.files (standalone) entries.
 */
export async function unlinkFileFromTask(ctxOrFileId, fileIdParam) {
  const ctx = (typeof ctxOrFileId === 'object' && ctxOrFileId !== null && !Array.isArray(ctxOrFileId))
    ? ctxOrFileId
    : getDrawerContext(null);
  const fileId = fileIdParam !== undefined ? fileIdParam : ctxOrFileId;
  if (fileId == null || fileId === '') return;
  if (!window.currentDrawerTaskId) return;
  const { tasks, save } = ctx;
  const task = findActiveTask(tasks, window.currentDrawerTaskId);
  if (!task) return;

  if (String(fileId).startsWith('legacy:')) {
    const path = String(fileId).slice(7);
    if (task.files && task.files.length) {
      task.files = task.files.filter(f => {
        const o = typeof f === 'string' ? { abs_path: f } : f;
        const k = o.onedrive_rel || o.abs_path || o.share_url || '';
        return k !== path;
      });
    }
  } else {
    if (!task.fileIds) task.fileIds = [];
    task.fileIds = task.fileIds.filter(id => id !== fileId);
  }
  await save();
  renderTaskDrawerFiles(ctx);
}

/**
 * Render subtasks in the task drawer
 */
export function renderTaskDrawerSubtasks(ctx) {
  if (!window.currentDrawerTaskId) return;
  const { tasks } = ctx;
  const task = findActiveTask(tasks, window.currentDrawerTaskId);
  if (!task) return;
  
  const container = document.getElementById('task-drawer-subtasks-list');
  if (!container) return;
  
  // Find subtasks (tasks with parentTaskId matching this task), excluding deleted
  const subtasks = tasks.filter(t => t.parentTaskId === task.id && !t.deletedAt);
  
  if (subtasks.length === 0) {
    container.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-dim);font-size:12px;">No subtasks</div>';
    return;
  }
  
  container.innerHTML = subtasks.map(st => `
    <div style="background:var(--bg2);border:1px solid var(--border);border-radius:8px;padding:12px;display:flex;justify-content:space-between;align-items:center;">
      <span style="font-size:13px;color:var(--text);">${esc(st.title)}</span>
      <div style="display:flex;gap:6px;">
        <button data-action="edit-task" data-task-id="${st.id}" data-is-subtask="false" data-project-id="${st.projectId || ''}" style="padding:4px 8px;background:var(--bg2);border:1px solid var(--border);border-radius:4px;font-size:11px;cursor:pointer;color:var(--text-dim);">Edit</button>
        <button class="btn-del btn-delete" data-action="delete" data-task-id="${st.id}" data-is-subtask="false" data-project-id="${st.projectId || ''}" data-parent-task-id="${st.parentTaskId || ''}" title="Delete" style="padding:4px 8px;min-width:28px;min-height:28px;background:none;border:1px solid var(--border);border-radius:4px;font-size:13px;cursor:pointer;color:var(--text-dim);display:flex;align-items:center;justify-content:center;">✕</button>
      </div>
    </div>
  `).join('');
  
  // Re-hydrate Lucide icons after innerHTML (fixes "halo" issue)
  if (window.lucide?.createIcons) {
    window.lucide.createIcons();
  }
}

/**
 * Add a subtask to the current task
 */
export async function addSubtaskToTask(ctx) {
  try {
    if (!window.currentDrawerTaskId) {
      console.warn('addSubtaskToTask: No task drawer open');
      return;
    }
    const { tasks, save, render } = ctx;
    const task = findActiveTask(tasks, window.currentDrawerTaskId);
    if (!task) {
      console.warn('addSubtaskToTask: Task not found or deleted:', window.currentDrawerTaskId);
      return;
    }
    
    const inputEl = document.getElementById('subtask-input');
    if (!inputEl) return;
    
    const title = inputEl.value;
    if (!title || !title.trim()) return;
    
    const newSubtask = {
      id: Date.now(),
      title: title.trim(),
      note: '',
      priority: 2,
      due: '',
      fileIds: [],
      files: [],
      done: false,
      status: 'Todo',
      projectId: task.projectId || null,
      parentTaskId: task.id,
      boardOrder: 1024
    };
    
    tasks.push(newSubtask);
    inputEl.value = '';
    
    await save();
    // Don't call render() here - it re-renders the entire page and can affect the drawer
    // We only need to update the subtasks list, which renderTaskDrawerSubtasks does
    renderTaskDrawerSubtasks(ctx);
  } catch (error) {
    console.error('Error in addSubtaskToTask:', error);
  }
}
