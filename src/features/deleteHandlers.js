// ═══════════════════════ DELETE HANDLERS ═══════════════════════
// Handles deletion confirmation and execution for tasks, files, projects, and subtasks

import { findProjectById, projectIdsMatch } from '../utils/projectHelpers.js';
import { idsMatch } from '../utils/ids.js';

function findTaskInList(tasks, taskId) {
  return (tasks || []).find(t => t && t.id != null && idsMatch(t.id, taskId));
}

function findLegacyProjectSubtask(projects, subtaskId, projectId) {
  const search = (p) => (p.subtasks || []).find(s => s && s.id != null && idsMatch(s.id, subtaskId));
  if (projectId) {
    const p = findProjectById(projects, projectId);
    if (p) {
      const subtask = search(p);
      if (subtask) return { project: p, subtask };
    }
  }
  for (const p of projects || []) {
    const subtask = search(p);
    if (subtask) return { project: p, subtask };
  }
  return null;
}

/**
 * Confirm deletion of a task
 */
export function confirmDeleteTask(ctx, taskId, isSubtask, projectId, parentTaskId) {
  const { tasks, projects } = ctx;
  console.log('🔍 confirmDeleteTask called', { taskId, tasksCount: tasks.length, taskIdType: typeof taskId });
  
  const taskIdStr = String(taskId);
  let task = findTaskInList(tasks, taskId);
  let legacyMatch = null;

  if (!task) {
    legacyMatch = findLegacyProjectSubtask(projects, taskId, projectId);
    if (!legacyMatch) {
      console.error('❌ Task not found', { 
        taskId, 
        taskIdStr, 
        taskIds: tasks.map(t => t?.id).slice(0, 5),
        allTaskIds: tasks.map(t => String(t?.id))
      });
      alert('Task not found');
      return;
    }
  }
  
  const itemTitle = task ? task.title : legacyMatch.subtask.title;
  const itemDeletedAt = task ? task.deletedAt : legacyMatch.subtask.deletedAt;

  console.log('✅ Item found for deletion:', { id: taskId, title: itemTitle, legacy: !!legacyMatch });

  if (itemDeletedAt) {
    alert('This task has already been deleted');
    return;
  }
  
  // Check for subtasks (normalize ID for matching)
  const taskIdStrForSubtask = String(taskId);
  const subtasks = task ? tasks.filter(t => {
    if (!t || !t.parentTaskId) return false;
    return String(t.parentTaskId) === taskIdStrForSubtask || 
           t.parentTaskId === taskId ||
           Number(t.parentTaskId) === Number(taskId);
  }) : [];
  const hasSubtasks = subtasks.length > 0;
  
  const title = itemTitle || 'Untitled Task';
  let message = `Delete task "${title}"?`;
  if (hasSubtasks) {
    message += `\n\nThis task has ${subtasks.length} subtask${subtasks.length > 1 ? 's' : ''} that will also be deleted.`;
  }
  
  window.pendingDelete = legacyMatch
    ? {
        type: 'projectSubtask',
        taskId,
        projectId: legacyMatch.project.id,
        subtaskId: legacyMatch.subtask.id
      }
    : {
        type: 'task',
        taskId,
        isSubtask,
        projectId,
        parentTaskId
      };
  
  console.log('📋 Opening delete modal', { title, message, hasSubtasks });
  
  // Clear any existing pending delete first (prevent double-open)
  if (window.pendingDelete && window.pendingDelete.taskId !== taskId) {
    console.warn('⚠️ Clearing existing pending delete before opening new one');
  }
  
  const titleEl = document.getElementById('delete-confirm-title');
  const messageEl = document.getElementById('delete-confirm-message');
  const modal = document.getElementById('delete-confirm-modal');
  
  console.log('🔍 Modal elements:', { 
    titleEl: !!titleEl, 
    messageEl: !!messageEl, 
    modal: !!modal,
    modalDisplay: modal ? getComputedStyle(modal).display : 'N/A'
  });
  
  if (!modal) {
    console.error('❌ Delete modal element not found!');
    return;
  }
  
  if (titleEl) titleEl.textContent = 'Delete Task';
  if (messageEl) messageEl.textContent = message;
  
  // Open modal
  modal.classList.add('active');
  modal.style.display = 'flex'; // Ensure it's visible
  console.log('✅ Modal activated', { hasActiveClass: modal.classList.contains('active'), display: getComputedStyle(modal).display });
}

/**
 * Confirm deletion of a file from a project
 */
export function confirmDeleteFile(ctx, projectId, fileId) {
  const { projects } = ctx;
  const project = findProjectById(projects, projectId);
  if (!project || !project.files) {
    alert('File not found');
    return;
  }
  
  const file = project.files.find(f => f && f.id != null && idsMatch(f.id, fileId));
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
  if (modal) {
    modal.classList.add('active');
    modal.style.display = 'flex';
  }
}

/**
 * Close the delete confirmation modal
 */
export function closeDeleteConfirmModal() {
  const modal = document.getElementById('delete-confirm-modal');
  if (modal) {
    modal.classList.remove('active');
    modal.style.display = 'none'; // Force hide
    window.pendingDelete = null;
    console.log('✅ Delete modal closed');
  } else {
    console.warn('⚠️ Delete modal element not found');
  }
}

/**
 * Execute the pending delete operation
 */
export async function executeDelete(ctx) {
  console.log('🗑️ executeDelete (module) called', { pendingDelete: window.pendingDelete, hasCtx: !!ctx });
  
  if (!ctx) {
    console.error('❌ executeDelete called without context');
    closeDeleteConfirmModal();
    return;
  }
  
  const { tasks, projects, save, render } = ctx;
  const pendingDelete = window.pendingDelete;
  
  if (!pendingDelete) {
    console.warn('⚠️ No pending delete found');
    closeDeleteConfirmModal();
    return;
  }
  
  console.log('🗑️ Executing delete', { type: pendingDelete.type, taskId: pendingDelete.taskId });
  
  try {
    if (pendingDelete.type === 'task') {
      await softDeleteTask(ctx, pendingDelete.taskId);
      
      if (window.currentDrawerTaskId && idsMatch(pendingDelete.taskId, window.currentDrawerTaskId)) {
        if (window.Petal?.features?.taskDrawer?.closeTaskDrawer) {
          window.Petal.features.taskDrawer.closeTaskDrawer();
        } else if (window.closeTaskDrawer) {
          window.closeTaskDrawer();
        }
      } else if (window.currentDrawerTaskId && pendingDelete.parentTaskId === window.currentDrawerTaskId) {
        if (typeof renderTaskDrawerSubtasks === 'function') {
          renderTaskDrawerSubtasks();
        }
      }
    } else if (pendingDelete.type === 'projectSubtask') {
      await softDeleteLegacyProjectSubtask(ctx, pendingDelete.projectId, pendingDelete.subtaskId);
    } else if (pendingDelete.type === 'file') {
      await softDeleteFile(ctx, pendingDelete.projectId, pendingDelete.fileId);
    }
    
    console.log('✅ Delete executed, closing modal and saving');
    closeDeleteConfirmModal();
    
    if (save) {
      await save();
    }
    
    if (render) {
      render();
    }
  } catch (error) {
    console.error('❌ Error executing delete:', error);
    closeDeleteConfirmModal();
    alert('Error deleting item: ' + error.message);
  }
}

/**
 * Soft delete a task (mark as deleted instead of removing)
 */
export async function softDeleteLegacyProjectSubtask(ctx, projectId, subtaskId) {
  const store = window.Petal?.store;
  const deletedAt = new Date().toISOString();

  if (store) {
    const state = store.getState();
    const updatedProjects = (state.projects || []).map(p => {
      if (!projectIdsMatch(p.id, projectId)) return p;
      return {
        ...p,
        subtasks: (p.subtasks || []).filter(s => !idsMatch(s.id, subtaskId))
      };
    });
    store.setState({ projects: updatedProjects });
    return;
  }

  const { projects } = ctx;
  const p = findProjectById(projects, projectId);
  if (p?.subtasks) {
    p.subtasks = p.subtasks.filter(s => !idsMatch(s.id, subtaskId));
  }
}

export async function softDeleteTask(ctx, taskId) {
  const { tasks, projects } = ctx;
  console.log('🗑️ softDeleteTask called', { taskId, tasksCount: tasks.length, taskIdType: typeof taskId });
  
  const taskIdStr = String(taskId);
  const task = findTaskInList(tasks, taskId);
  
  if (!task) {
    const legacy = findLegacyProjectSubtask(projects, taskId);
    if (legacy) {
      await softDeleteLegacyProjectSubtask(ctx, legacy.project.id, legacy.subtask.id);
      return;
    }
    console.error('❌ Task not found for deletion', { 
      taskId, 
      taskIdStr, 
      sampleTaskIds: tasks.slice(0, 5).map(t => ({ id: t?.id, idStr: String(t?.id) }))
    });
    return;
  }
  
  // Skip if already deleted
  if (task.deletedAt) {
    console.warn('⚠️ Task already deleted:', { taskId: task.id, deletedAt: task.deletedAt });
    return;
  }
  
  // Mark task as deleted
  const deletedAt = new Date().toISOString();
  
  // Find all subtasks that need to be deleted
  const subtasks = tasks.filter(t => {
    if (!t || !t.parentTaskId || t.deletedAt) return false;
    return String(t.parentTaskId) === taskIdStr || 
           t.parentTaskId === taskId ||
           Number(t.parentTaskId) === Number(taskId);
  });
  
  // Update store with immutable updates (CRITICAL: prevents data loss)
  const store = window.Petal?.store;
  if (store) {
    const state = store.getState();
    const currentTasks = state.tasks || [];
    
    // SAFETY CHECK: Ensure we have tasks before proceeding
    if (currentTasks.length === 0) {
      console.error('❌ CRITICAL: No tasks in store! Aborting delete to prevent data loss.');
      alert('Error: No tasks found in store. Cannot delete task. Please check your data.');
      return;
    }
    
    // Count how many tasks will be marked as deleted (should be 1 + subtasks)
    let tasksToDelete = 0;
    const updatedTasks = currentTasks.map(t => {
      // Check if this is the task to delete
      const tIdStr = String(t.id);
      const tIdNum = Number(t.id);
      const taskIdNum = Number(taskId);
      const isTargetTask = idsMatch(t.id, taskId);
      
      const isSubtask = t.parentTaskId && idsMatch(t.parentTaskId, taskId);
      
      if (isTargetTask || isSubtask) {
        tasksToDelete++;
        // Return updated task with deletedAt timestamp
        return { ...t, deletedAt };
      }
      
      return t;
    });
    
    // SAFETY CHECK: If a broad ID match would wipe a large dataset, abort.
    // Allow intentional deletions in tiny datasets (for example a single task in a new project).
    const remainingTasks = updatedTasks.filter(t => !t.deletedAt).length;
    if (remainingTasks === 0 && currentTasks.length > 25) {
      console.error('❌ CRITICAL: Delete would remove ALL tasks! Aborting to prevent data loss.', {
        originalCount: currentTasks.length,
        tasksToDelete,
        taskId
      });
      alert('Error: This operation would delete all tasks. Aborted to prevent data loss.');
      return;
    }
    
    // SAFETY CHECK: Block suspiciously broad deletions on larger datasets.
    if (currentTasks.length > 25 && tasksToDelete > currentTasks.length * 0.5) {
      console.error('❌ CRITICAL: Delete would remove more than 50% of tasks! Aborting.', {
        originalCount: currentTasks.length,
        tasksToDelete,
        percentage: (tasksToDelete / currentTasks.length * 100).toFixed(1) + '%'
      });
      alert(`Error: This operation would delete ${tasksToDelete} out of ${currentTasks.length} tasks (${(tasksToDelete / currentTasks.length * 100).toFixed(1)}%). Aborted to prevent data loss.`);
      return;
    }
    
    // Update store with immutable task array
    store.setState({ tasks: updatedTasks });
    console.log('✅ Task and subtasks marked as deleted in store', { 
      taskId, 
      deletedAt, 
      subtasksDeleted: subtasks.length,
      tasksToDelete,
      remainingTasks,
      updatedTasksCount: updatedTasks.length
    });
  } else {
    // Fallback: mutate directly (not ideal, but for backward compatibility)
    console.warn('⚠️ Store not available, using direct mutation (fallback)');
    task.deletedAt = deletedAt;
    subtasks.forEach(subtask => {
      subtask.deletedAt = deletedAt;
    });
  }
}

/**
 * Soft delete a file from a project
 */
export async function softDeleteFile(ctx, projectId, fileId) {
  const store = window.Petal?.store;
  const deletedAt = new Date().toISOString();

  if (store) {
    const state = store.getState();
    const updatedProjects = (state.projects || []).map(p => {
      if (!projectIdsMatch(p.id, projectId)) return p;
      return {
        ...p,
        files: (p.files || []).map(f =>
          f && idsMatch(f.id, fileId) ? { ...f, deletedAt } : f
        )
      };
    });
    const updatedTasks = (state.tasks || []).map(task => {
      if (!task.fileIds || !task.fileIds.some(id => idsMatch(id, fileId))) return task;
      return {
        ...task,
        fileIds: task.fileIds.filter(id => !idsMatch(id, fileId))
      };
    });
    store.setState({ projects: updatedProjects, tasks: updatedTasks });
    return;
  }

  // Fallback: mutate context directly
  const { tasks, projects } = ctx;
  const project = findProjectById(projects, projectId);
  if (!project || !project.files) return;

  const file = project.files.find(f => f && f.id != null && idsMatch(f.id, fileId));
  if (!file) return;

  file.deletedAt = deletedAt;
  tasks.forEach(task => {
    if (task.fileIds && task.fileIds.some(id => idsMatch(id, fileId))) {
      task.fileIds = task.fileIds.filter(id => !idsMatch(id, fileId));
    }
  });
}

/**
 * Delete a project (hard delete - removes from array)
 */
export async function delProject(ctx, id) {
  const { projects, tasks, save, render } = ctx;
  
  // Use store for immutable updates
  const store = window.Petal?.store;
  if (store) {
    const state = store.getState();
    
    // Remove project from array (immutable)
    const updatedProjects = (state.projects || []).filter(p => !projectIdsMatch(p.id, id));
    
    // Remove from open projects (Array, not Set)
    const open = Array.isArray(state.openProjects) ? state.openProjects : [];
    const updatedOpenProjects = open.filter(pid => !projectIdsMatch(pid, id));
    
    // Clear projectId from tasks (immutable)
    const updatedTasks = (state.tasks || []).map(t => {
      if (String(t.projectId || '') === String(id)) {
        return { ...t, projectId: '' };
      }
      return t;
    });
    
    // Update store with all changes
    store.setState({
      projects: updatedProjects,
      openProjects: updatedOpenProjects,
      tasks: updatedTasks
    });
  } else {
    // Fallback: store not initialized (shouldn't happen in normal flow)
    console.warn('Store not available in delProject, project not deleted');
    return;
  }
  
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
  // Phase 3 Fix: Prefer handler pattern if available, fallback to global
  if (window.Petal?.handlers?.refreshProjectSelects) {
    const state = window.Petal.store?.getState();
    if (state) {
      window.Petal.handlers.refreshProjectSelects(state);
    }
  } else if (typeof refreshProjectSelects === 'function') {
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

  const store = window.Petal?.store;
  if (store) {
    const state = store.getState();
    const updatedTasks = (state.tasks || []).filter(t =>
      t.id !== subtaskId && String(t.id) !== String(subtaskId)
    );
    store.setState({ tasks: updatedTasks });
  } else {
    const index = tasks.findIndex(t => t.id === subtaskId || String(t.id) === String(subtaskId));
    if (index !== -1) {
      tasks.splice(index, 1);
    }
  }

  await save();
  if (render) render();
}

/**
 * Delete a project subtask (legacy format - subtasks are embedded in project)
 */
export async function delSubtask(ctx, projId, subId) {
  const { projects, save, render } = ctx;

  const store = window.Petal?.store;
  if (store) {
    const state = store.getState();
    const updatedProjects = (state.projects || []).map(p => {
      if (!projectIdsMatch(p.id, projId)) return p;
      return {
        ...p,
        subtasks: (p.subtasks || []).filter(s => s.id !== subId && String(s.id) !== String(subId))
      };
    });
    store.setState({ projects: updatedProjects });
  } else {
    const p = findProjectById(projects, projId);
    if (!p) return;
    if (!p.subtasks) p.subtasks = [];
    p.subtasks = p.subtasks.filter(s => s.id !== subId);
  }

  await save();
  if (render) render();
}
