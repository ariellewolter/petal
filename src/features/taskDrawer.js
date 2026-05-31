// ═══════════════════════ TASK DRAWER ═══════════════════════
// Handles the task drawer UI for viewing/editing task details, notes, files, and subtasks

import { esc, escAttr, fileIcon } from '../utils/strings.js';
import { findProjectById } from '../utils/projectHelpers.js';

function isDrawerContext(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value) && (
    'tasks' in value ||
    'projects' in value ||
    'save' in value ||
    'render' in value
  );
}

function createDrawerContext(overrides = {}) {
  const state = window.Petal?.store?.getState?.() || {};
  const base = {
    tasks: Array.isArray(state.tasks) ? state.tasks : [],
    projects: Array.isArray(state.projects) ? state.projects : [],
    save: window.Petal?.handlers?.save || window.save || (() => Promise.resolve()),
    render: window.Petal?.handlers?.render || window.render || (() => {})
  };
  if (!overrides || typeof overrides !== 'object') return base;
  if (Array.isArray(overrides.tasks)) base.tasks = overrides.tasks;
  if (Array.isArray(overrides.projects)) base.projects = overrides.projects;
  if (typeof overrides.save === 'function') base.save = overrides.save;
  if (typeof overrides.render === 'function') base.render = overrides.render;
  return base;
}

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

function taskMatchesId(task, taskId) {
  return task && (task.id === taskId || String(task.id) === String(taskId));
}

function persistTaskUpdate(taskId, updater) {
  const store = window.Petal?.store;
  if (!store) return false;
  const state = store.getState();
  const updatedTasks = (state.tasks || []).map(t =>
    taskMatchesId(t, taskId) ? updater({ ...t }) : t
  );
  store.setState({ tasks: updatedTasks });
  return true;
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
 * Open the task drawer for a specific task
 */
export function openTaskDrawer(ctx, taskId) {
  if (!isDrawerContext(ctx)) {
    taskId = ctx;
    ctx = createDrawerContext();
  } else {
    ctx = createDrawerContext(ctx);
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
    const project = findProjectById(projects, task.projectId);
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
  
  // Switch to notes tab
  switchTaskDrawerTab('notes');
  
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
          <button type="button" class="task-log-entry-delete" data-action="task-drawer:delete-log-entry" data-entry-id="${escAttr(entry.id)}" title="Delete">✕</button>
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

  const entry = {
    id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    at: new Date().toISOString(),
    text: text.trim()
  };

  const taskId = window.currentDrawerTaskId;
  if (persistTaskUpdate(taskId, (t) => {
    const log = [...(t.log || []), entry];
    log.sort((a, b) => new Date(b.at) - new Date(a.at));
    return { ...t, log };
  })) {
    renderTaskLogEntries(createDrawerContext(ctx));
    return;
  }

  task.log = [...(task.log || []), entry];
  task.log.sort((a, b) => new Date(b.at) - new Date(a.at));
  if (save) await save();
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
  
  const taskId = window.currentDrawerTaskId;
  if (persistTaskUpdate(taskId, (t) => ({
    ...t,
    log: (t.log || []).filter(e => e.id !== entryId)
  }))) {
    renderTaskLogEntries(createDrawerContext(ctx));
    return;
  }

  task.log = task.log.filter(e => e.id !== entryId);
  if (save) await save();
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
  const taskFiles = getTaskFiles ? getTaskFiles(task, ctx) : [];
  
  if (taskFiles.length === 0) {
    container.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-dim);font-size:12px;">No files linked</div>';
    return;
  }
  
  container.innerHTML = taskFiles.map(file => {
    const label = file.label || file.name || 'File';
    const note = file.note ? `<div class="task-drawer-file-note">${esc(file.note)}</div>` : '';
    const icon = fileIcon(file.abs_path || file.onedrive_rel || file.share_url || '');
    return `
      <div class="task-drawer-file-item">
        <div class="task-drawer-file-info">
          <div class="task-drawer-file-name">${icon} ${esc(label)}</div>
          ${note}
        </div>
        <div class="task-drawer-file-actions">
          <button type="button" class="file-open-btn" data-action="file:open" data-path="${escAttr(JSON.stringify(file))}" style="padding:4px 8px;background:var(--bg2);border:1px solid var(--border);border-radius:4px;font-size:11px;cursor:pointer;">Open</button>
          <button type="button" data-action="task-drawer:unlink-file" data-file-id="${escAttr(String(file.id))}" style="padding:4px 8px;background:none;border:1px solid var(--border);border-radius:4px;font-size:11px;cursor:pointer;color:var(--text-dim);">Unlink</button>
        </div>
      </div>
    `;
  }).join('');
  
  // Re-hydrate Lucide icons after innerHTML (fixes "halo" issue)
  if (window.lucide?.createIcons) {
    window.lucide.createIcons();
  }
}

/**
 * Link an existing file from the project to the task
 */
export async function linkExistingFileToTask(ctx) {
  if (!window.currentDrawerTaskId) return;
  const { tasks, projects, save } = ctx;
  const task = findActiveTask(tasks, window.currentDrawerTaskId);
  if (!task || !task.projectId) {
    alert('Task must be in a project to link files');
    return;
  }
  
  const project = findProjectById(projects, task.projectId);
  if (!project || !project.files || project.files.length === 0) {
    alert('No files available in this project. Add files to the project first.');
    return;
  }
  
  // Create a modal for file selection
  const modal = document.createElement('div');
  modal.className = 'quick-capture-modal';
  modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:10000;';
  modal.onclick = (e) => {
    if (e.target === modal) {
      document.body.removeChild(modal);
    }
  };
  
  const existingFileIds = task.fileIds || [];
  const availableFiles = project.files.filter(f => f.id && !existingFileIds.includes(f.id));
  
  if (availableFiles.length === 0) {
    alert('All project files are already linked to this task');
    return;
  }
  
  const checkboxes = availableFiles.map((file, i) => {
    const label = file.label || file.name || 'File';
    return `
      <label style="display:flex;align-items:center;gap:8px;padding:8px;cursor:pointer;border-radius:4px;transition:background 0.15s;" onmouseover="this.style.background='var(--bg2)'" onmouseout="this.style.background='transparent'">
        <input type="checkbox" value="${file.id}" style="cursor:pointer;">
        <span>${esc(label)}</span>
      </label>
    `;
  }).join('');
  
  modal.innerHTML = `
    <div class="quick-capture-box" style="max-width:500px;background:var(--surface);border-radius:12px;padding:24px;" onclick="event.stopPropagation()">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;">
        <h3 style="font-family:'Cormorant Garamond',serif;font-size:22px;font-weight:400;color:var(--rose);margin:0;">Link Files to Task</h3>
        <button onclick="this.closest('.quick-capture-modal').remove()" style="background:none;border:none;font-size:20px;color:var(--text-dim);cursor:pointer;padding:0;width:28px;height:28px;display:flex;align-items:center;justify-content:center;border-radius:50%;transition:all .15s;line-height:1;" onmouseover="this.style.background='var(--bg2)';this.style.color='var(--text)'" onmouseout="this.style.background='none';this.style.color='var(--text-dim)'" title="Close">✕</button>
      </div>
      <div style="max-height:400px;overflow-y:auto;margin-bottom:20px;border:1px solid var(--border);border-radius:8px;padding:12px;background:var(--bg);">
        ${checkboxes}
      </div>
      <div style="display:flex;gap:10px;justify-content:flex-end;padding-top:8px;border-top:1px solid var(--border);">
        <button onclick="this.closest('.quick-capture-modal').remove()" class="btn-secondary">Cancel</button>
        <button class="btn-submit" id="link-files-submit">Link Selected</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Handle submit
  const submitBtn = modal.querySelector('#link-files-submit');
  submitBtn.onclick = async () => {
    const selected = Array.from(modal.querySelectorAll('input[type="checkbox"]:checked'))
      .map(cb => cb.value);
    
    if (selected.length === 0) {
      alert('Please select at least one file');
      return;
    }
    
    if (persistTaskUpdate(window.currentDrawerTaskId, (t) => {
      const fileIds = [...(t.fileIds || [])];
      selected.forEach(fileId => {
        if (!fileIds.includes(fileId)) fileIds.push(fileId);
      });
      return { ...t, fileIds };
    })) {
      renderTaskDrawerFiles(ctx);
      document.body.removeChild(modal);
      return;
    }

    if (!task.fileIds) task.fileIds = [];
    selected.forEach(fileId => {
      if (!task.fileIds.includes(fileId)) {
        task.fileIds.push(fileId);
      }
    });
    
    await save();
    renderTaskDrawerFiles(ctx);
    document.body.removeChild(modal);
  };
}

/**
 * Add a new file to the task (opens modal)
 */
export function addNewFileToTask() {
  if (!window.currentDrawerTaskId) return;
  const { tasks, projects } = window.Petal?.store?.getState() || {};
  const task = (tasks || []).find(t => t.id === window.currentDrawerTaskId && !t.deletedAt);
  if (!task) return;
  
  // If task is in a project, add file to project and link it
  // If task is standalone, we'll need to handle it differently
  if (task.projectId) {
    // Use the existing add file modal for the project
    if (typeof window.openProjectAddFileModal === 'function') {
      window.currentModalTaskId = window.currentDrawerTaskId; // Store task ID for linking after file is added
      window.openProjectAddFileModal(task.projectId);
    } else {
      alert('Unable to open file modal. Please add files to the project first, then link them to the task.');
    }
  } else {
    alert('Standalone tasks cannot have files. Add the task to a project first.');
  }
}

/**
 * Unlink a file from the task
 */
export async function unlinkFileFromTask(ctx, fileId) {
  if (!window.currentDrawerTaskId) return;
  const { tasks, save } = ctx;
  const task = findActiveTask(tasks, window.currentDrawerTaskId);
  if (!task) return;
  
  if (persistTaskUpdate(window.currentDrawerTaskId, (t) => ({
    ...t,
    fileIds: (t.fileIds || []).filter(id => id !== fileId)
  }))) {
    renderTaskDrawerFiles(createDrawerContext(ctx));
    return;
  }

  if (!task.fileIds) task.fileIds = [];
  task.fileIds = task.fileIds.filter(id => id !== fileId);
  if (save) await save();
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

    inputEl.value = '';

    const store = window.Petal?.store;
    if (store) {
      const state = store.getState();
      store.setState({ tasks: [newSubtask, ...(state.tasks || [])] });
      renderTaskDrawerSubtasks(createDrawerContext(ctx));
      return;
    }

    tasks.push(newSubtask);
    if (save) await save();
    renderTaskDrawerSubtasks(ctx);
  } catch (error) {
    console.error('Error in addSubtaskToTask:', error);
  }
}
