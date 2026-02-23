// ═══════════════════════ MODAL OPERATIONS ═══════════════════════
// Modal management functions for tasks, files, and related operations

import { getDefaultLaneIds } from '../domain/schema.js';

/**
 * Helper: Update store with safety - preserves all state fields
 */
function updateStoreSafely(updates, fallbackFn) {
  if (window.Petal?.store) {
    const state = window.Petal.store.getState();
    window.Petal.store.setState({
      ...state,
      ...updates
    });
    // Store auto-saves and auto-renders via subscriptions
  } else if (fallbackFn) {
    // Fallback: old pattern
    fallbackFn();
  }
}

// ═══════════════════════ TASK MODALS ═══════════════════════

/**
 * Open Add Task Modal for a specific project
 */
export function openProjectAddTaskModal(ctx, projId) {
  const { projects } = ctx;
  
  // Update global modal state
  if (typeof window !== 'undefined') {
    window.currentModalProjectId = projId;
    window.currentModalContext = 'project';
  }
  
  const p = projects.find(p => p.id === projId);
  if (!p) return;
  
  const titleEl = document.getElementById('add-task-modal-title');
  if (titleEl) titleEl.textContent = `Add Task to ${p.name}`;
  
  // Setup lane options
  const laneField = document.getElementById('modal-task-lane-field');
  const laneSelect = document.getElementById('modal-task-lane');
  if (laneField && laneSelect) {
    const allowedLanes = p.workflowLanes || getDefaultLaneIds();
    if (allowedLanes.length > 0) {
      laneField.style.display = 'block';
      laneSelect.innerHTML = '<option value="">No lane</option>' + allowedLanes.map(lane => {
        const labels = { lab: '🧪 Lab', comp: '💻 Comp', writing: '📝 Writing', presentation: '📊 Presentation' };
        return `<option value="${lane}">${labels[lane] || lane}</option>`;
      }).join('');
    } else {
      laneField.style.display = 'none';
    }
  }
  
  // Reset form
  const titleInput = document.getElementById('modal-task-title');
  const priorityInput = document.getElementById('modal-task-priority');
  const dueInput = document.getElementById('modal-task-due');
  if (titleInput) titleInput.value = '';
  if (priorityInput) priorityInput.value = 'medium';
  if (dueInput) dueInput.value = '';
  if (laneSelect) laneSelect.value = '';
  
  // Show modal
  const modal = document.getElementById('add-task-modal');
  if (modal) {
    modal.style.display = 'flex';
    if (titleInput) titleInput.focus();
  }
}

/**
 * Open Add Task Modal for Matrix view
 */
export function openMatrixAddTaskModal(ctx) {
  const { projects } = ctx;
  const selectedProjectId = typeof window.selectedProjectId !== 'undefined' ? window.selectedProjectId : null;
  
  if (!selectedProjectId) return;
  
  // Update global modal state
  if (typeof window !== 'undefined') {
    window.currentModalProjectId = selectedProjectId;
    window.currentModalContext = 'matrix';
  }
  
  const p = projects.find(p => p.id === selectedProjectId);
  if (!p) return;
  
  const titleEl = document.getElementById('add-task-modal-title');
  if (titleEl) titleEl.textContent = `Add Task to ${p.name}`;
  
  // Setup lane options
  const laneField = document.getElementById('modal-task-lane-field');
  const laneSelect = document.getElementById('modal-task-lane');
  if (laneField && laneSelect) {
    const allowedLanes = p.workflowLanes || getDefaultLaneIds();
    if (allowedLanes.length > 0) {
      laneField.style.display = 'block';
      laneSelect.innerHTML = '<option value="">No lane</option>' + allowedLanes.map(lane => {
        const labels = { lab: '🧪 Lab', comp: '💻 Comp', writing: '📝 Writing', presentation: '📊 Presentation' };
        return `<option value="${lane}">${labels[lane] || lane}</option>`;
      }).join('');
    } else {
      laneField.style.display = 'none';
    }
  }
  
  // Reset form
  const titleInput = document.getElementById('modal-task-title');
  const priorityInput = document.getElementById('modal-task-priority');
  const dueInput = document.getElementById('modal-task-due');
  if (titleInput) titleInput.value = '';
  if (priorityInput) priorityInput.value = 'medium';
  if (dueInput) dueInput.value = '';
  if (laneSelect) laneSelect.value = '';
  
  // Show modal and focus
  const modal = document.getElementById('add-task-modal');
  if (modal) {
    modal.style.display = 'flex';
    modal.focus();
    setTimeout(() => {
      if (titleInput) titleInput.focus();
    }, 100);
  }
}

/**
 * Open Add Task Modal (general - no project required)
 */
export function openAddTaskModal() {
  // Update global modal state
  if (typeof window !== 'undefined') {
    window.currentModalProjectId = null;
    window.currentModalContext = 'general';
  }
  
  const titleEl = document.getElementById('add-task-modal-title');
  if (titleEl) titleEl.textContent = 'Add Task';
  
  // Hide lane field for general tasks
  const laneField = document.getElementById('modal-task-lane-field');
  if (laneField) laneField.style.display = 'none';
  
  // Reset form
  const titleInput = document.getElementById('modal-task-title');
  const priorityInput = document.getElementById('modal-task-priority');
  const dueInput = document.getElementById('modal-task-due');
  if (titleInput) titleInput.value = '';
  if (priorityInput) priorityInput.value = 'medium';
  if (dueInput) dueInput.value = '';
  
  // Show modal
  const modal = document.getElementById('add-task-modal');
  if (modal) {
    modal.style.display = 'flex';
    modal.focus();
    setTimeout(() => {
      if (titleInput) titleInput.focus();
    }, 100);
  }
}

/**
 * Close Add Task Modal
 */
export function closeAddTaskModal() {
  const modal = document.getElementById('add-task-modal');
  if (modal) modal.style.display = 'none';
  
  // Clear global modal state
  if (typeof window !== 'undefined') {
    window.currentModalProjectId = null;
    window.currentModalContext = null;
  }
}

/**
 * Submit Add Task Modal
 */
export async function submitAddTaskModal(ctx) {
  const { addTaskToProjectFromModal, addTaskToMatrixFromModal, addTaskFromModal } = ctx;
  
  const titleInput = document.getElementById('modal-task-title');
  if (!titleInput) return;
  
  const title = titleInput.value.trim();
  if (!title) {
    alert('Please enter a task title');
    return;
  }
  
  const priorityInput = document.getElementById('modal-task-priority');
  const dueInput = document.getElementById('modal-task-due');
  const laneInput = document.getElementById('modal-task-lane');
  
  const priority = priorityInput?.value || 'medium';
  const due = dueInput?.value || null;
  const lane = laneInput?.value || '';
  
  const currentModalContext = typeof window.currentModalContext !== 'undefined' ? window.currentModalContext : null;
  const currentModalProjectId = typeof window.currentModalProjectId !== 'undefined' ? window.currentModalProjectId : null;
  
  if (currentModalContext === 'project' && currentModalProjectId) {
    if (addTaskToProjectFromModal) {
      await addTaskToProjectFromModal(currentModalProjectId, title, priority, due, lane);
    }
  } else if (currentModalContext === 'matrix' && currentModalProjectId) {
    if (addTaskToMatrixFromModal) {
      await addTaskToMatrixFromModal(title, priority, due, lane);
    }
  } else if (currentModalContext === 'general') {
    if (addTaskFromModal) {
      await addTaskFromModal(title, priority, due, lane);
    }
  } else {
    alert('Unable to add task - no context specified');
    return;
  }
  
  closeAddTaskModal();
}

/**
 * Add Task from Modal (general - no project)
 */
export async function addTaskFromModal(ctx, title, priority, due, lane) {
  const { rerenderViewIfActive } = ctx;
  
  if (!window.Petal?.store) {
    console.error('Store not available');
    return;
  }
  
  const state = window.Petal.store.getState();
  const tasks = state.tasks || [];
  
  // Convert priority string to number
  const priorityMap = { low: 1, medium: 2, high: 3 };
  const priorityNum = priorityMap[priority] || 2;
  
  // Determine stage based on lane
  const getStageForLane = (lane) => {
    if (!lane) return null;
    const laneToStage = {
      'lab': 'lab',
      'comp': 'comp',
      'writing': 'writing',
      'presentation': 'presentation'
    };
    return laneToStage[lane] || null;
  };
  
  const newTask = {
    id: Date.now(),
    title: title,
    notes: '',
    note: '',
    noteUpdatedAt: null,
    log: [],
    priority: priorityNum,
    due: due || '',
    done: false,
    status: 'Todo',
    lane: lane || null,
    stage: getStageForLane(lane),
    projectId: null,
    dependsOn: null,
    tags: [],
    fileIds: [],
    files: []
  };
  
  // Update store
  const updatedTasks = [newTask, ...tasks];
  updateStoreSafely({ tasks: updatedTasks });
  
  // Re-render tasks view
  if (window.Petal?.ui?.renderTasks) {
    const newState = window.Petal.store.getState();
    const container = document.getElementById('view-tasks');
    if (container) {
      await window.Petal.ui.renderTasks(container, newState, window.Petal.handlers);
    }
  } else if (rerenderViewIfActive) {
    await rerenderViewIfActive('tasks');
  }
}

/**
 * Add Task to Project from Modal
 */
export async function addTaskToProjectFromModal(ctx, projId, title, priority, due, lane) {
  const { projects, save, rerenderViewIfActive, normalizeProjectIdValue } = ctx;
  
  const normalizedProjId = normalizeProjectIdValue ? normalizeProjectIdValue(projId) : projId;
  const p = projects.find(p => p.id === normalizedProjId);
  if (!p) return;
  
  const newTask = {
    id: Date.now(),
    title: title,
    priority: priority,
    due: due,
    lane: lane || null,
    done: false,
    projectId: normalizedProjId,
    fileIds: [],
    files: []
  };
  
  // Use store (always available after initialization)
  if (window.Petal?.store) {
    const state = window.Petal.store.getState();
    updateStoreSafely({
      tasks: [...(state.tasks || []), newTask]
    });
  } else {
    // Fallback: store not initialized yet, log warning
    console.warn('Store not available in addTaskToProjectFromModal, task not added');
  }
  
  // Re-render projects view if visible
  if (rerenderViewIfActive) {
    await rerenderViewIfActive('projects');
  }
}

/**
 * Add Task to Matrix from Modal
 */
export async function addTaskToMatrixFromModal(ctx, title, priority, due, lane) {
  const { projects, save, renderWorkflowMatrix, normalizeProjectIdValue } = ctx;
  const selectedProjectId = typeof window.selectedProjectId !== 'undefined' ? window.selectedProjectId : null;
  
  if (!selectedProjectId) return;
  
  const normalizedProjId = normalizeProjectIdValue ? normalizeProjectIdValue(selectedProjectId) : selectedProjectId;
  const newTask = {
    id: Date.now(),
    title: title,
    priority: priority,
    due: due,
    lane: lane || null,
    done: false,
    projectId: normalizedProjId,
    fileIds: [],
    files: []
  };
  
  // Use store (always available after initialization)
  if (window.Petal?.store) {
    const state = window.Petal.store.getState();
    updateStoreSafely({
      tasks: [...(state.tasks || []), newTask]
    });
  } else {
    // Fallback: store not initialized yet, log warning
    console.warn('Store not available in addTaskToMatrixFromModal, task not added');
  }
  
  if (renderWorkflowMatrix) {
    renderWorkflowMatrix();
  }
}

// ═══════════════════════ FILE MODALS ═══════════════════════

/**
 * Open Add File Modal for a specific project
 */
export function openProjectAddFileModal(ctx, projId) {
  const { projects } = ctx;
  
  // Update global modal state
  if (typeof window !== 'undefined') {
    window.currentModalProjectId = projId;
    window.currentModalContext = 'project';
  }
  
  const p = projects.find(p => p.id === projId);
  if (!p) return;
  
  const titleEl = document.getElementById('add-file-modal-title');
  if (titleEl) titleEl.textContent = `Add File to ${p.name}`;
  
  // Clear file container and reset drop hint
  const container = document.getElementById('modal-files-container');
  if (container) {
    container.innerHTML = '';
    container.style.borderColor = 'var(--border)';
    container.style.background = '';
  }
  const dropHint = document.getElementById('modal-files-drop-hint');
  if (dropHint) dropHint.style.display = 'none';
  
  // Update button text and hint visibility
  const addFileBtn = document.getElementById('modal-add-file-btn');
  const fileHint = document.getElementById('modal-file-hint');
  if (window.electronAPI) {
    if (addFileBtn) addFileBtn.textContent = '＋ Choose file';
    if (fileHint) fileHint.style.display = 'block';
  } else {
    if (addFileBtn) addFileBtn.textContent = '＋ Add file link';
    if (fileHint) fileHint.style.display = 'none';
  }
  
  // Show modal and focus
  const modal = document.getElementById('add-file-modal');
  if (modal) {
    modal.style.display = 'flex';
    modal.focus();
  }
}

/**
 * Open Add File Modal for Matrix view
 */
export function openMatrixAddFileModal(ctx) {
  const { projects } = ctx;
  const selectedProjectId = typeof window.selectedProjectId !== 'undefined' ? window.selectedProjectId : null;
  
  if (!selectedProjectId) return;
  
  // Update global modal state
  if (typeof window !== 'undefined') {
    window.currentModalProjectId = selectedProjectId;
    window.currentModalContext = 'matrix';
  }
  
  const p = projects.find(p => p.id === selectedProjectId);
  if (!p) return;
  
  const titleEl = document.getElementById('add-file-modal-title');
  if (titleEl) titleEl.textContent = `Add File to ${p.name}`;
  
  // Clear file container and reset drop hint
  const container = document.getElementById('modal-files-container');
  if (container) {
    container.innerHTML = '';
    container.style.borderColor = 'var(--border)';
    container.style.background = '';
  }
  const dropHint = document.getElementById('modal-files-drop-hint');
  if (dropHint) dropHint.style.display = 'none';
  
  // Update button text and hint visibility
  const addFileBtn = document.getElementById('modal-add-file-btn');
  const fileHint = document.getElementById('modal-file-hint');
  if (window.electronAPI) {
    if (addFileBtn) addFileBtn.textContent = '＋ Choose file';
    if (fileHint) fileHint.style.display = 'block';
  } else {
    if (addFileBtn) addFileBtn.textContent = '＋ Add file link';
    if (fileHint) fileHint.style.display = 'none';
  }
  
  // Show modal and focus
  const modal = document.getElementById('add-file-modal');
  if (modal) {
    modal.style.display = 'flex';
    modal.focus();
  }
}

/**
 * Close Add File Modal
 */
export function closeAddFileModal() {
  const modal = document.getElementById('add-file-modal');
  if (modal) modal.style.display = 'none';
  
  // Clear global modal state
  if (typeof window !== 'undefined') {
    window.currentModalProjectId = null;
    window.currentModalContext = null;
    if (window.currentModalTaskId) window.currentModalTaskId = null;
  }
  
  // Clear file container
  const container = document.getElementById('modal-files-container');
  if (container) container.innerHTML = '';
}

/**
 * Submit Add File Modal
 */
export async function submitAddFileModal(ctx) {
  const { addFileToProjectFromModal, addFileToMatrixFromModal, linkFilesToTaskFromModal } = ctx;
  
  const currentModalProjectId = typeof window.currentModalProjectId !== 'undefined' ? window.currentModalProjectId : null;
  if (!currentModalProjectId) return;
  
  const container = document.getElementById('modal-files-container');
  if (!container) return;
  
  const fileInputs = container.querySelectorAll('input[type="text"], input[type="file"]');
  const filesToAdd = [];
  
  for (const input of fileInputs) {
    if (input.type === 'file' && input.files && input.files.length > 0) {
      const file = input.files[0];
      if (window.electronAPI) {
        const fileObj = {
          id: Date.now() + Math.random(),
          abs_path: file.path || file.name,
          name: file.name,
          label: file.name,
          note: '',
          noteUpdatedAt: ''
        };
        filesToAdd.push(fileObj);
      }
    } else if (input.type === 'text' && input.value.trim()) {
      const url = input.value.trim();
      filesToAdd.push({
        id: Date.now() + Math.random(),
        share_url: url,
        label: url,
        note: '',
        noteUpdatedAt: ''
      });
    }
  }
  
  if (filesToAdd.length === 0) {
    alert('Please add at least one file');
    return;
  }
  
  const currentModalContext = typeof window.currentModalContext !== 'undefined' ? window.currentModalContext : null;
  if (currentModalContext === 'project') {
    if (addFileToProjectFromModal) {
      await addFileToProjectFromModal(currentModalProjectId, filesToAdd);
    }
    // If we're adding files from a task drawer, link them to the task
    if (window.currentModalTaskId && linkFilesToTaskFromModal) {
      await linkFilesToTaskFromModal(window.currentModalTaskId, filesToAdd);
      window.currentModalTaskId = null;
    }
  } else if (currentModalContext === 'matrix') {
    if (addFileToMatrixFromModal) {
      await addFileToMatrixFromModal(filesToAdd);
    }
  }
  
  closeAddFileModal();
}

/**
 * Add File to Project from Modal
 */
export async function addFileToProjectFromModal(ctx, projId, filesToAdd) {
  const { projects, save, rerenderViewIfActive, findOrCreateCanonicalFile } = ctx;
  
  const p = projects.find(p => p.id === projId);
  if (!p) return;
  
  if (!p.files) p.files = [];
  
  // Ensure files have canonical structure
  if (findOrCreateCanonicalFile) {
    filesToAdd.forEach(fileLink => {
      findOrCreateCanonicalFile(projId, fileLink);
    });
  }
  
  // Use store if available
  if (window.Petal?.store) {
    const state = window.Petal.store.getState();
    const updatedProjects = (state.projects || []).map(proj => {
      if (proj.id === projId) {
        return { ...proj, files: [...(proj.files || []), ...filesToAdd] };
      }
      return proj;
    });
    updateStoreSafely({ projects: updatedProjects });
  } else {
    if (save) await save();
  }
  
  // Re-render projects view if visible
  if (rerenderViewIfActive) {
    await rerenderViewIfActive('projects');
  }
}

/**
 * Add File to Matrix Project from Modal
 */
export async function addFileToMatrixFromModal(ctx, filesToAdd) {
  const { projects, save, renderWorkflowMatrix, findOrCreateCanonicalFile } = ctx;
  const selectedProjectId = typeof window.selectedProjectId !== 'undefined' ? window.selectedProjectId : null;
  
  if (!selectedProjectId) return;
  
  const p = projects.find(p => p.id === selectedProjectId);
  if (!p) return;
  
  if (!p.files) p.files = [];
  
  // Ensure files have canonical structure
  if (findOrCreateCanonicalFile) {
    filesToAdd.forEach(fileLink => {
      findOrCreateCanonicalFile(selectedProjectId, fileLink);
    });
  }
  
  // Use store if available
  if (window.Petal?.store) {
    const state = window.Petal.store.getState();
    const updatedProjects = (state.projects || []).map(proj => {
      if (proj.id === selectedProjectId) {
        return { ...proj, files: [...(proj.files || []), ...filesToAdd] };
      }
      return proj;
    });
    updateStoreSafely({ projects: updatedProjects });
  } else {
    if (save) await save();
  }
  
  if (renderWorkflowMatrix) {
    renderWorkflowMatrix();
  }
}

/**
 * Link files to task after they're added to project (called from task drawer)
 */
export async function linkFilesToTaskFromModal(ctx, taskId, filesToAdd) {
  if (!window.Petal?.store) {
    console.error('Store not available');
    return;
  }
  
  const state = window.Petal.store.getState();
  const tasks = state.tasks || [];
  const task = tasks.find(t => t.id === taskId && !t.deletedAt);
  if (!task) return;
  
  if (!task.fileIds) task.fileIds = [];
  
  // Link all added files to the task
  filesToAdd.forEach(fileLink => {
    if (fileLink.id && !task.fileIds.includes(fileLink.id)) {
      task.fileIds.push(fileLink.id);
    }
  });
  
  // Update task in store
  const updatedTasks = tasks.map(t => t.id === taskId ? task : t);
  updateStoreSafely({ tasks: updatedTasks });
  
  // Refresh task drawer files if it's open
  if (window.Petal?.features?.taskDrawer?.renderTaskDrawerFiles) {
    const ctx = window.Petal.handlers?.createPageContext?.() || { tasks, projects: state?.projects || [] };
    window.Petal.features.taskDrawer.renderTaskDrawerFiles(ctx);
  }
}

// ═══════════════════════ FILE NOTES MODAL ═══════════════════════

/**
 * Helper function to compute file key (used by file notes modal)
 */
function getFileKey(file) {
  return file.key || 
         file.fileLink?.abs_path || 
         file.fileLink?.onedrive_rel || 
         file.fileLink?.share_url ||
         file.id ||
         '';
}

// Current file being edited (stores file ID/key)
let currentFileNotesId = null;

/**
 * Open File Notes Modal
 */
export function openFileNotesModal(fileId) {
  if (!window.Petal?.store) {
    console.error('Store not available');
    return;
  }
  
  const state = window.Petal.store.getState();
  const files = state.files || [];
  const registry = state.fileRegistry || {};
  
  // First, try to find in persisted files
  let file = files.find(f => {
    const fKey = getFileKey(f);
    return f.id === fileId || 
           f.key === fileId || 
           fKey === fileId ||
           (f.fileLink && (
             f.fileLink.abs_path === fileId || 
             f.fileLink.onedrive_rel === fileId || 
             f.fileLink.share_url === fileId
           ));
  });
  
  // If not found in persisted files, try registry
  if (!file) {
    let registryFile = registry[fileId];
    
    // If not found, search all registry entries
    if (!registryFile) {
      for (const key in registry) {
        const regFile = registry[key];
        const regKey = getFileKey(regFile);
        if (key === fileId || regKey === fileId || 
            regFile.abs_path === fileId || 
            regFile.onedrive_rel === fileId || 
            regFile.share_url === fileId) {
          registryFile = regFile;
          fileId = key; // Update to use the registry key
          break;
        }
      }
    }
    
    if (registryFile) {
      // Check if there's a persisted file with this key
      const fileKey = getFileKey(registryFile);
      const persistedFile = files.find(f => getFileKey(f) === fileKey);
      
      if (persistedFile) {
        file = persistedFile;
      } else {
        // Create a temporary file entry from registry
        file = {
          key: fileId,
          fileLink: registryFile,
          name: registryFile.label || registryFile.name || 'File',
          notes: registryFile.notes || ''
        };
      }
    }
  }
  
  if (!file) {
    console.error('File not found:', fileId, { 
      persistedFilesCount: files.length, 
      registryKeysCount: Object.keys(registry).length
    });
    alert('File not found. Please try refreshing the file list.');
    return;
  }
  
  // Determine the identifier to use for saving
  currentFileNotesId = file.id || file.key || getFileKey(file) || fileId;
  populateFileNotesModal(file);
}

/**
 * Populate File Notes Modal
 */
export function populateFileNotesModal(file) {
  const modal = document.getElementById('file-notes-modal');
  const titleEl = document.getElementById('file-notes-modal-title');
  const fileNameEl = document.getElementById('file-notes-file-name');
  const notesTextarea = document.getElementById('file-notes-content');
  
  if (!modal || !titleEl || !fileNameEl || !notesTextarea) {
    console.error('File notes modal elements not found');
    return;
  }
  
  // Get file name
  const fileName = file.name || 
                   file.fileLink?.label || 
                   file.fileLink?.name || 
                   file.fileLink?.onedrive_rel || 
                   file.fileLink?.abs_path || 
                   file.fileLink?.share_url || 
                   'File';
  
  fileNameEl.textContent = fileName;
  notesTextarea.value = file.notes || '';
  
  // Show modal
  modal.style.display = 'flex';
  modal.focus();
  
  // Focus textarea
  setTimeout(() => notesTextarea.focus(), 100);
}

/**
 * Close File Notes Modal
 */
export function closeFileNotesModal() {
  const modal = document.getElementById('file-notes-modal');
  if (modal) {
    modal.style.display = 'none';
  }
  currentFileNotesId = null;
  
  // Clear textarea
  const notesTextarea = document.getElementById('file-notes-content');
  if (notesTextarea) {
    notesTextarea.value = '';
  }
}

/**
 * Save File Notes
 */
export async function saveFileNotes() {
  if (!window.Petal?.store || !currentFileNotesId) {
    console.error('Store not available or no file selected');
    return;
  }
  
  const notesTextarea = document.getElementById('file-notes-content');
  if (!notesTextarea) {
    console.error('Notes textarea not found');
    return;
  }
  
  const notes = notesTextarea.value.trim();
  const state = window.Petal.store.getState();
  const files = state.files || [];
  const registry = state.fileRegistry || {};
  
  // Find the file in persisted files
  let fileIndex = files.findIndex(f => {
    const fKey = getFileKey(f);
    return f.id === currentFileNotesId || 
           f.key === currentFileNotesId || 
           fKey === currentFileNotesId ||
           (f.fileLink && (
             f.fileLink.abs_path === currentFileNotesId || 
             f.fileLink.onedrive_rel === currentFileNotesId || 
             f.fileLink.share_url === currentFileNotesId
           ));
  });
  
  if (fileIndex === -1) {
    // File not in persisted files, check registry
    let registryFile = registry[currentFileNotesId];
    let registryKey = currentFileNotesId;
    
    // If not found, search all registry entries
    if (!registryFile) {
      for (const key in registry) {
        const regFile = registry[key];
        const regKey = getFileKey(regFile);
        if (key === currentFileNotesId || regKey === currentFileNotesId || 
            regFile.abs_path === currentFileNotesId || 
            regFile.onedrive_rel === currentFileNotesId || 
            regFile.share_url === currentFileNotesId) {
          registryFile = regFile;
          registryKey = key;
          break;
        }
      }
    }
    
    if (registryFile) {
      // Create a new persisted file entry for this file
      const newFile = {
        id: Date.now() + Math.random(),
        key: registryKey,
        fileLink: registryFile,
        name: registryFile.label || registryFile.name || 'File',
        notes: notes,
        addedAt: Date.now()
      };
      
      // Add to files array
      const updatedFiles = [...files, newFile];
      updateStoreSafely({ files: updatedFiles });
      
      closeFileNotesModal();
      
      // Re-render files view
      if (window.Petal?.ui?.renderFiles) {
        const newState = window.Petal.store.getState();
        const container = document.getElementById('files-view-container');
        if (container) {
          window.Petal.ui.renderFiles(container, newState, window.Petal.handlers);
        }
      }
      
      return;
    } else {
      console.error('File not found in registry:', currentFileNotesId);
      alert('File not found. Please try refreshing the file list.');
      return;
    }
  }
  
  // Update existing file
  const updatedFiles = [...files];
  updatedFiles[fileIndex] = {
    ...updatedFiles[fileIndex],
    notes: notes
  };
  
  updateStoreSafely({ files: updatedFiles });
  
  closeFileNotesModal();
  
  // Re-render files view
  if (window.Petal?.ui?.renderFiles) {
    const newState = window.Petal.store.getState();
    const container = document.getElementById('files-view-container');
    if (container) {
      window.Petal.ui.renderFiles(container, newState, window.Petal.handlers);
    }
  }
}

// ═══════════════════════ DRAG AND DROP HANDLERS ═══════════════════════

/**
 * Handle file drag over in modal
 */
export function onModalFileDragOver(event) {
  event.preventDefault();
  event.stopPropagation();
  event.currentTarget.style.borderColor = 'var(--rose)';
  event.currentTarget.style.background = 'var(--rose-pale)';
  const hint = document.getElementById('modal-files-drop-hint');
  if (hint) hint.style.display = 'block';
}

/**
 * Handle file drag enter in modal
 */
export function onModalFileDragEnter(event) {
  event.preventDefault();
  event.stopPropagation();
}

/**
 * Handle file drag leave in modal
 */
export function onModalFileDragLeave(event) {
  event.preventDefault();
  event.stopPropagation();
  // Only reset if we're leaving the container (not entering a child)
  if (event.currentTarget === event.target) {
    event.currentTarget.style.borderColor = 'var(--border)';
    event.currentTarget.style.background = '';
    const hint = document.getElementById('modal-files-drop-hint');
    if (hint) hint.style.display = 'none';
  }
}

/**
 * Handle file drop in modal
 */
export async function onModalFileDrop(event, ctx) {
  const { esc, addFileRow } = ctx;
  
  event.preventDefault();
  event.stopPropagation();
  
  // Reset visual feedback
  const container = event.currentTarget;
  container.style.borderColor = 'var(--border)';
  container.style.background = '';
  const hint = document.getElementById('modal-files-drop-hint');
  if (hint) hint.style.display = 'none';
  
  const containerId = 'modal-files-container';
  const prefix = 'modal';
  
  // Get dropped files
  const files = [];
  if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
    // Browser File API
    for (let i = 0; i < event.dataTransfer.files.length; i++) {
      files.push(event.dataTransfer.files[i]);
    }
  } else if (event.dataTransfer.items) {
    // Electron file paths
    for (let i = 0; i < event.dataTransfer.items.length; i++) {
      const item = event.dataTransfer.items[i];
      if (item.kind === 'file') {
        const file = item.getAsFile();
        if (file) files.push(file);
      }
    }
  }
  
  if (files.length === 0) return;
  
  // Process each dropped file
  for (const file of files) {
    const id = Date.now() + Math.random();
    const row = document.createElement('div');
    row.className = 'file-link-row';
    row.dataset.id = id;
    
    if (window.electronAPI) {
      // Electron: dropped files should have a path property
      let filePath = file.path || '';
      let fileName = file.name || (filePath ? filePath.split(/[/\\]/).pop() : 'File');
      
      const fileLink = {
        label: fileName,
        abs_path: filePath || file.name,
        name: fileName
      };
      
      // Try to create OneDrive-relative path if possible
      if (filePath && window.electronAPI.getOneDriveRoot) {
        try {
          const oneDriveRoot = await window.electronAPI.getOneDriveRoot();
          if (oneDriveRoot) {
            const normalizedPath = filePath.replace(/\\/g, '/').toLowerCase();
            const normalizedOneDrive = oneDriveRoot.replace(/\\/g, '/').toLowerCase();
            if (normalizedPath.startsWith(normalizedOneDrive)) {
              const relative = filePath.substring(oneDriveRoot.length).replace(/^[/\\]/, '').replace(/\\/g, '/');
              fileLink.onedrive_rel = relative;
              fileLink.isInOneDrive = true;
            }
          }
        } catch (e) {
          console.warn('Could not determine OneDrive path:', e);
        }
      }
      
      // Extract file extension
      const ext = fileName.split('.').pop()?.toLowerCase();
      if (ext && ext !== fileName) fileLink.type = ext;
      
      const escFn = esc || ((s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'));
      row.innerHTML = `
        <input type="text" placeholder="Label" id="${prefix}fn-${id}" value="${escFn(fileLink.label)}">
        <input type="text" placeholder="File path" id="${prefix}fu-${id}" value="${escFn(fileLink.abs_path || '')}" readonly style="background:var(--bg2);">
        <input type="hidden" id="${prefix}fl-${id}" value="${escFn(JSON.stringify(fileLink))}">
        <button class="btn-remove" onclick="this.parentElement.remove()">✕</button>`;
    } else {
      // Browser: use file name and create blob URL
      const fileLink = {
        label: file.name,
        name: file.name,
        share_url: URL.createObjectURL(file)
      };
      
      // Extract file extension
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext && ext !== file.name) fileLink.type = ext;
      
      const escFn = esc || ((s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'));
      row.innerHTML = `
        <input type="text" placeholder="Label" id="${prefix}fn-${id}" value="${escFn(fileLink.label)}">
        <input type="text" placeholder="File" id="${prefix}fu-${id}" value="${escFn(file.name)}" readonly style="background:var(--bg2);">
        <input type="hidden" id="${prefix}fl-${id}" value="${escFn(JSON.stringify(fileLink))}">
        <button class="btn-remove" onclick="this.parentElement.remove()">✕</button>`;
    }
    
    const c = document.getElementById(containerId);
    if (c) {
      c.appendChild(row);
    }
  }
}
