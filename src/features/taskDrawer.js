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
 * Open the task drawer for a specific task
 */
export function openTaskDrawer(ctx, taskId) {
  const { tasks, projects } = ctx;
  // Only show active (non-deleted) tasks in drawer
  const task = tasks.find(t => t.id === taskId && !t.deletedAt);
  if (!task) {
    console.warn('Task not found or deleted:', taskId);
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
    return `
      <div class="task-drawer-file-item">
        <div class="task-drawer-file-info">
          <div class="task-drawer-file-name">${icon} ${esc(label)}</div>
          ${note}
        </div>
        <div class="task-drawer-file-actions">
          <button class="file-open-btn" data-path="${escAttr(JSON.stringify(file))}" style="padding:4px 8px;background:var(--bg2);border:1px solid var(--border);border-radius:4px;font-size:11px;cursor:pointer;">Open</button>
          <button onclick="window.Petal?.features?.taskDrawer?.unlinkFileFromTask('${file.id}')" style="padding:4px 8px;background:none;border:1px solid var(--border);border-radius:4px;font-size:11px;cursor:pointer;color:var(--text-dim);">Unlink</button>
        </div>
      </div>
    `;
  }).join('');
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
  
  const project = projects.find(p => p.id === task.projectId);
  if (!project || !project.files || project.files.length === 0) {
    alert('No files available in this project');
    return;
  }
  
  // Simple prompt for now - could be enhanced with a modal
  const fileLabels = project.files.map((f, i) => `${i + 1}. ${f.label || f.name || 'File'}`).join('\n');
  const choice = prompt(`Select file number:\n\n${fileLabels}`);
  const index = parseInt(choice) - 1;
  
  if (isNaN(index) || index < 0 || index >= project.files.length) return;
  
  const file = project.files[index];
  if (!file || !file.id) return;
  
  if (!task.fileIds) task.fileIds = [];
  if (!task.fileIds.includes(file.id)) {
    task.fileIds.push(file.id);
    await save();
    renderTaskDrawerFiles(ctx);
  }
}

/**
 * Add a new file to the task (opens modal)
 */
export function addNewFileToTask() {
  if (!window.currentDrawerTaskId) return;
  // For now, just show a message
  alert('Use the Files view to add files to the project, then link them here');
}

/**
 * Unlink a file from the task
 */
export async function unlinkFileFromTask(ctx, fileId) {
  if (!window.currentDrawerTaskId) return;
  const { tasks, save } = ctx;
  const task = findActiveTask(tasks, window.currentDrawerTaskId);
  if (!task) return;
  
  if (!task.fileIds) task.fileIds = [];
  task.fileIds = task.fileIds.filter(id => id !== fileId);
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
        <button data-action="edit-task" data-task-id="${st.id}" onclick="handleEditTaskAction(event, this)" style="padding:4px 8px;background:var(--bg2);border:1px solid var(--border);border-radius:4px;font-size:11px;cursor:pointer;">Edit</button>
        <button data-action="delete-task" data-task-id="${st.id}" onclick="handleDeleteTaskAction(event, this)" style="padding:4px 8px;background:none;border:1px solid var(--border);border-radius:4px;font-size:11px;cursor:pointer;color:var(--text-dim);">Delete</button>
      </div>
    </div>
  `).join('');
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
    if (render) render();
    renderTaskDrawerSubtasks(ctx);
  } catch (error) {
    console.error('Error in addSubtaskToTask:', error);
  }
}
