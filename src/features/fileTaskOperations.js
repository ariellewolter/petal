// ═══════════════════════ FILE-TASK OPERATIONS ═══════════════════════
// Operations for integrating files and tasks (drag & drop, quick actions, sync)

import { fileToTask, addFileToTask, removeFileFromTask, getFileKey } from '../utils/fileTaskConverter.js';

// Track file being dragged
let draggedFile = null;

/**
 * Handle file drag start
 * @param {Event} event - Drag event
 * @param {Object} fileLink - File link object
 * @param {string} fileKey - File key
 */
export function handleFileDragStart(event, fileLink, fileKey) {
  if (!event || !fileLink) return;
  
  draggedFile = {
    fileLink,
    fileKey,
  };
  
  // Set drag data
  event.dataTransfer.effectAllowed = 'link';
  event.dataTransfer.setData('text/plain', JSON.stringify({
    type: 'file',
    fileKey,
    fileLink,
  }));
  
  // Visual feedback
  if (event.target) {
    event.target.style.opacity = '0.5';
  }
  
  if (window.__DEBUG__) {
    console.log('📁 File drag started:', { fileKey, fileLink });
  }
}

/**
 * Handle file drag end
 * @param {Event} event - Drag event
 */
export function handleFileDragEnd(event) {
  // Reset visual feedback
  if (event.target) {
    event.target.style.opacity = '1';
  }
  
  draggedFile = null;
  
  if (window.__DEBUG__) {
    console.log('📁 File drag ended');
  }
}

/**
 * Handle file drop on task card
 * @param {Event} event - Drop event
 * @param {Object} task - Task object
 * @param {Object} ctx - Context (store, save, etc.)
 */
export async function handleTaskCardDrop(event, task, ctx) {
  if (!event || !task || !ctx) return;
  
  event.preventDefault();
  event.stopPropagation();
  
  // Get file data from drag
  let fileLink = null;
  let fileKey = null;
  
  try {
    const data = event.dataTransfer.getData('text/plain');
    if (data) {
      const parsed = JSON.parse(data);
      if (parsed.type === 'file') {
        fileLink = parsed.fileLink;
        fileKey = parsed.fileKey;
      }
    }
  } catch (e) {
    console.error('Error parsing drop data:', e);
  }
  
  // Fallback to draggedFile if available
  if (!fileLink && draggedFile) {
    fileLink = draggedFile.fileLink;
    fileKey = draggedFile.fileKey;
  }
  
  if (!fileLink || !fileKey) {
    console.warn('No file data in drop event');
    return;
  }
  
  // Add file to task
  const updatedTask = addFileToTask(task, fileLink);
  
  // Update task in store
  const { tasks, save, rerenderViewIfActive } = ctx;
  const taskIndex = tasks.findIndex(t => t.id === task.id);
  if (taskIndex >= 0) {
    tasks[taskIndex] = updatedTask;
    
    // Also update in projects if it's a subtask
    if (task.projectId) {
      const { projects } = ctx;
      const project = projects.find(p => p.id === task.projectId);
      if (project && project.subtasks) {
        const subtaskIndex = project.subtasks.findIndex(st => st.id === task.id);
        if (subtaskIndex >= 0) {
          project.subtasks[subtaskIndex] = updatedTask;
        }
      }
    }
    
    // Update file registry
    if (window.Petal?.features?.fileManagement?.buildFileRegistry) {
      const state = window.Petal.store.getState();
      const result = window.Petal.features.fileManagement.buildFileRegistry({
        tasks: tasks,
        projects: ctx.projects || [],
        fileRegistry: state.fileRegistry || {},
        fileHistory: state.fileHistory || {},
        files: state.files || [],
      }, { commit: true });
    }
    
    await save();
    
    // Rerender if files page is active
    if (rerenderViewIfActive) {
      rerenderViewIfActive('files');
    }
    
    // Rerender tasks
    if (window.Petal?.pages?.TasksPage?.render) {
      window.Petal.pages.TasksPage.render();
    }
    
    if (window.__DEBUG__) {
      console.log('✅ File linked to task:', { fileKey, taskId: task.id });
    }
  }
}

/**
 * Create a task from a file
 * @param {Object} fileLink - File link object
 * @param {string} fileKey - File key
 * @param {Object} ctx - Context
 */
export async function createTaskFromFile(fileLink, fileKey, ctx) {
  if (!fileLink || !fileKey || !ctx) return;
  
  const { tasks, save } = ctx;
  
  // Create task from file
  const newTask = fileToTask(fileLink, {
    title: `Work on ${fileLink.label || fileLink.name || fileKey}`,
    status: 'Todo',
    priority: 'medium',
  });
  
  // Add task
  tasks.push(newTask);
  await save();
  
  // Update file registry
  if (window.Petal?.features?.fileManagement?.buildFileRegistry) {
    const state = window.Petal.store.getState();
    const result = window.Petal.features.fileManagement.buildFileRegistry({
      tasks: tasks,
      projects: ctx.projects || [],
      fileRegistry: state.fileRegistry || {},
      fileHistory: state.fileHistory || {},
      files: state.files || [],
    }, { commit: true });
  }
  
  // Rerender
  if (window.Petal?.pages?.TasksPage?.render) {
    window.Petal.pages.TasksPage.render();
  }
  
  if (window.Petal?.pages?.FilesPage?.render) {
    window.Petal.pages.FilesPage.render();
  }
  
  // Open task drawer
  if (window.Petal?.features?.taskDrawer?.openTaskDrawer) {
    window.Petal.features.taskDrawer.openTaskDrawer(ctx, newTask.id);
  }
  
  if (window.__DEBUG__) {
    console.log('✅ Task created from file:', { fileKey, taskId: newTask.id });
  }
}

/**
 * View tasks linked to a file
 * @param {string} fileKey - File key
 * @param {Object} ctx - Context
 */
export function viewFileTasks(fileKey, ctx) {
  if (!fileKey || !ctx) return;
  
  const { tasks, projects } = ctx;
  const allTasks = [...(tasks || []), ...(projects || []).flatMap(p => p.subtasks || [])];
  
  // Find tasks linked to this file
  const linkedTasks = allTasks.filter(t => {
    if (!t) return false;
    
    // Check fileIds
    if (t.fileIds && t.fileIds.includes(fileKey)) return true;
    
    // Check files
    if (t.files) {
      return t.files.some(f => {
        const fKey = typeof f === 'string' ? f : (f.abs_path || f.onedrive_rel || f.share_url || f.key);
        return fKey === fileKey;
      });
    }
    
    return false;
  });
  
  if (linkedTasks.length === 0) {
    alert('No tasks linked to this file');
    return;
  }
  
  // Switch to tasks page and filter
  if (window.Petal?.pages?.TasksPage?.render) {
    // Set filter to show these tasks
    const state = window.Petal.store.getState();
    window.Petal.store.setState({
      ...state,
      currentPage: 'tasks',
      searchQuery: fileKey, // Use search to filter
    });
    
    window.Petal.pages.TasksPage.render();
  }
  
  if (window.__DEBUG__) {
    console.log('📋 Viewing tasks for file:', { fileKey, taskCount: linkedTasks.length });
  }
}

/**
 * Open a task from file badge click
 * @param {number} taskId - Task ID
 * @param {Object} ctx - Context
 */
export function openTaskFromFile(taskId, ctx) {
  if (!taskId || !ctx) return;
  
  // Open task drawer
  if (window.Petal?.features?.taskDrawer?.openTaskDrawer) {
    window.Petal.features.taskDrawer.openTaskDrawer(ctx, taskId);
  }
}
