// ═══════════════════════ DELETE HANDLERS ═══════════════════════
// Handles deletion confirmation and execution for tasks, files, projects, and subtasks

/**
 * Confirm deletion of a task
 */
export function confirmDeleteTask(ctx, taskId, isSubtask, projectId, parentTaskId) {
  const { tasks } = ctx;
  const task = tasks.find(t => t.id === taskId);
  if (!task) {
    alert('Task not found');
    return;
  }
  
  // Check for subtasks
  const subtasks = tasks.filter(t => t.parentTaskId === taskId);
  const hasSubtasks = subtasks.length > 0;
  
  const title = task.title || 'Untitled Task';
  let message = `Delete task "${title}"?`;
  if (hasSubtasks) {
    message += `\n\nThis task has ${subtasks.length} subtask${subtasks.length > 1 ? 's' : ''} that will also be deleted.`;
  }
  
  // Store pending delete info in window (will be accessed by executeDelete)
  window.pendingDelete = {
    type: 'task',
    taskId: taskId,
    isSubtask: isSubtask,
    projectId: projectId,
    parentTaskId: parentTaskId
  };
  
  const titleEl = document.getElementById('delete-confirm-title');
  const messageEl = document.getElementById('delete-confirm-message');
  const modal = document.getElementById('delete-confirm-modal');
  
  if (titleEl) titleEl.textContent = 'Delete Task';
  if (messageEl) messageEl.textContent = message;
  if (modal) modal.classList.add('active');
}

/**
 * Confirm deletion of a file from a project
 */
export function confirmDeleteFile(ctx, projectId, fileId) {
  const { projects } = ctx;
  const project = projects.find(p => p.id === projectId);
  if (!project || !project.files) {
    alert('File not found');
    return;
  }
  
  const file = project.files.find(f => f && f.id === fileId);
  if (!file) {
    alert('File not found');
    return;
  }
  
  const label = file.label || file.name || 'File';
  const message = `Remove file "${label}" from this project?\n\nThis will remove the link from the project but will not delete the actual file on disk.`;
  
  // Store pending delete info in window
  window.pendingDelete = {
    type: 'file',
    projectId: projectId,
    fileId: fileId
  };
  
  const titleEl = document.getElementById('delete-confirm-title');
  const messageEl = document.getElementById('delete-confirm-message');
  const modal = document.getElementById('delete-confirm-modal');
  
  if (titleEl) titleEl.textContent = 'Remove File';
  if (messageEl) messageEl.textContent = message;
  if (modal) modal.classList.add('active');
}

/**
 * Close the delete confirmation modal
 */
export function closeDeleteConfirmModal() {
  const modal = document.getElementById('delete-confirm-modal');
  if (modal) modal.classList.remove('active');
  window.pendingDelete = null;
}

/**
 * Execute the pending delete operation
 */
export async function executeDelete(ctx) {
  const { tasks, projects, save, render } = ctx;
  const pendingDelete = window.pendingDelete;
  
  if (!pendingDelete) return;
  
  if (pendingDelete.type === 'task') {
    await softDeleteTask(ctx, pendingDelete.taskId);
    
    // If this was a subtask in the drawer, refresh the drawer
    if (window.currentDrawerTaskId && pendingDelete.parentTaskId === window.currentDrawerTaskId) {
      if (typeof renderTaskDrawerSubtasks === 'function') {
        renderTaskDrawerSubtasks();
      }
    }
  } else if (pendingDelete.type === 'file') {
    await softDeleteFile(ctx, pendingDelete.projectId, pendingDelete.fileId);
  }
  
  closeDeleteConfirmModal();
  await save();
  if (render) render();
}

/**
 * Soft delete a task (mark as deleted instead of removing)
 */
export async function softDeleteTask(ctx, taskId) {
  const { tasks } = ctx;
  const task = tasks.find(t => t.id === taskId);
  if (!task) return;
  
  // Mark task as deleted
  task.deletedAt = new Date().toISOString();
  
  // Also soft delete all subtasks
  const subtasks = tasks.filter(t => t.parentTaskId === taskId);
  subtasks.forEach(subtask => {
    subtask.deletedAt = new Date().toISOString();
  });
}

/**
 * Soft delete a file from a project
 */
export async function softDeleteFile(ctx, projectId, fileId) {
  const { tasks, projects } = ctx;
  const project = projects.find(p => p.id === projectId);
  if (!project || !project.files) return;
  
  const file = project.files.find(f => f && f.id === fileId);
  if (!file) return;
  
  // Mark file as deleted
  file.deletedAt = new Date().toISOString();
  
  // Remove file links from tasks
  tasks.forEach(task => {
    if (task.fileIds && task.fileIds.includes(fileId)) {
      task.fileIds = task.fileIds.filter(id => id !== fileId);
    }
  });
}

/**
 * Delete a project (hard delete - removes from array)
 */
export async function delProject(ctx, id) {
  const { projects, tasks, save, render } = ctx;
  
  // Remove project from array
  const index = projects.findIndex(p => p.id === id);
  if (index === -1) return;
  projects.splice(index, 1);
  
  // Remove from open projects
  if (window.openProjects && window.openProjects.delete) {
    window.openProjects.delete(id);
  }
  
  // Clear projectId from tasks
  tasks.forEach(t => {
    if (String(t.projectId || '') === String(id)) {
      t.projectId = '';
    }
  });
  
  // Clear matrix view if deleted project was selected
  if (window.selectedProjectId === id) {
    window.selectedProjectId = null;
    const matrixSelect = document.getElementById('matrix-project-select');
    const matrixView = document.getElementById('workflow-matrix-view');
    const listView = document.getElementById('project-list-view');
    
    if (matrixSelect) matrixSelect.value = '';
    if (matrixView) matrixView.style.display = 'none';
    if (listView) listView.style.display = '';
  }
  
  // Refresh project selects
  if (typeof refreshProjectSelects === 'function') {
    refreshProjectSelects();
  }
  
  await save();
  if (render) render();
}

/**
 * Delete a task subtask (new format - subtasks are tasks with parentTaskId)
 */
export async function delTaskSubtask(ctx, taskId, subtaskId) {
  const { tasks, save, render } = ctx;
  
  // subtaskId is now a task ID - delete it as a regular task
  const index = tasks.findIndex(t => t.id === subtaskId);
  if (index !== -1) {
    tasks.splice(index, 1);
  }
  
  await save();
  if (render) render();
}

/**
 * Delete a project subtask (legacy format - subtasks are embedded in project)
 */
export async function delSubtask(ctx, projId, subId) {
  const { projects, save, render } = ctx;
  
  const p = projects.find(p => p.id === projId);
  if (!p) return;
  
  if (!p.subtasks) p.subtasks = [];
  p.subtasks = p.subtasks.filter(s => s.id !== subId);
  
  await save();
  if (render) render();
}
