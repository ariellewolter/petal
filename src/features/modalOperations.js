// ═══════════════════════ MODAL OPERATIONS ═══════════════════════
// Modal management functions for tasks, files, and related operations

import { getDefaultLaneIds } from '../domain/schema.js';
import { normalizeProjectIdValue } from '../utils/projectHelpers.js';

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

/**
 * Helper: Find project by ID with consistent normalization
 */
function findProjectById(projects, projectId) {
  if (!projects || !Array.isArray(projects) || !projectId) return null;
  
  const normalizedProjId = normalizeProjectIdValue(projectId);
  if (normalizedProjId === '' || normalizedProjId === null) return null;
  
  return projects.find(p => {
    const pId = normalizeProjectIdValue(p.id);
    return pId === normalizedProjId || 
           String(pId) === String(normalizedProjId) ||
           Number(pId) === Number(normalizedProjId);
  }) || null;
}

/**
 * Helper: Get DOM element safely with error handling
 */
function getElement(id, required = false) {
  const el = document.getElementById(id);
  if (!el && required) {
    console.error(`Required element not found: #${id}`);
  }
  return el;
}

/**
 * Helper: Show modal with consistent styling
 */
function showModal(modalId, focusElementId = null) {
  const modal = getElement(modalId, true);
  if (!modal) {
    console.error(`Modal not found: #${modalId}`);
    return false;
  }
  
  try {
    modal.style.display = 'flex';
    modal.style.setProperty('display', 'flex', 'important');
    modal.style.setProperty('visibility', 'visible', 'important');
    modal.style.setProperty('opacity', '1', 'important');
    modal.style.setProperty('z-index', '10000', 'important');
    
    if (focusElementId) {
      setTimeout(() => {
        const focusEl = getElement(focusElementId);
        if (focusEl) focusEl.focus();
      }, 100);
    } else {
      setTimeout(() => modal.focus(), 100);
    }
    
    return true;
  } catch (error) {
    console.error(`Error showing modal ${modalId}:`, error);
    return false;
  }
}

/**
 * Helper: Reset task form fields
 */
function resetTaskForm() {
  const titleInput = getElement('modal-task-title');
  const priorityInput = getElement('modal-task-priority');
  const dueInput = getElement('modal-task-due');
  const laneSelect = getElement('modal-task-lane');
  const filesContainer = getElement('modal-task-files-container');
  const projectFilesSelect = getElement('modal-task-project-files-select');
  
  if (titleInput) titleInput.value = '';
  if (priorityInput) priorityInput.value = 'medium';
  if (dueInput) dueInput.value = '';
  if (laneSelect) laneSelect.value = '';
  if (filesContainer) filesContainer.innerHTML = '';
  if (projectFilesSelect) {
    projectFilesSelect.innerHTML = '<option value="" disabled>Select project files to link...</option>';
    projectFilesSelect.selectedIndex = 0;
  }
}

/**
 * Helper: Setup lane options for a project
 */
function setupLaneOptions(project) {
  const laneField = getElement('modal-task-lane-field');
  const laneSelect = getElement('modal-task-lane');
  
  if (!laneField || !laneSelect) return;
  
  const allowedLanes = project?.workflowLanes || getDefaultLaneIds();
  const labels = { 
    lab: '🧪 Lab', 
    comp: '💻 Comp', 
    writing: '📝 Writing', 
    presentation: '📊 Presentation' 
  };
  
  if (allowedLanes.length > 0) {
    laneField.style.display = 'block';
    laneSelect.innerHTML = '<option value="">No lane</option>' + 
      allowedLanes.map(lane => 
        `<option value="${lane}">${labels[lane] || lane}</option>`
      ).join('');
  } else {
    laneField.style.display = 'none';
  }
}

/**
 * Helper: Update modal state in window
 */
function updateModalState(projectId, context) {
  if (typeof window !== 'undefined') {
    window.currentModalProjectId = projectId;
    window.currentModalContext = context;
  }
}

/**
 * Helper: Clear modal state
 */
function clearModalState() {
  if (typeof window !== 'undefined') {
    window.currentModalProjectId = null;
    window.currentModalContext = null;
    if (window.currentModalTaskId) window.currentModalTaskId = null;
  }
}

// ═══════════════════════ TASK MODALS ═══════════════════════

/**
 * Open Add Task Modal for a specific project
 */
export function openProjectAddTaskModal(ctx, projId) {
  try {
    console.log('🔘 openProjectAddTaskModal called:', { projId, projectsCount: ctx?.projects?.length });
    
    if (!ctx || !ctx.projects) {
      console.warn('⚠️ Invalid context provided to openProjectAddTaskModal');
      return;
    }
    
    const { projects } = ctx;
    updateModalState(projId, 'project');
    
    const project = findProjectById(projects, projId);
    if (!project) {
      console.warn('⚠️ Project not found for ID:', projId);
      return;
    }
    
    const titleEl = getElement('add-task-modal-title');
    if (titleEl) titleEl.textContent = `Add Task to ${project.name}`;
    
    setupLaneOptions(project);
    resetTaskForm();
    
    if (!showModal('add-task-modal', 'modal-task-title')) {
      console.error('❌ Failed to show add-task-modal');
    }
  } catch (error) {
    console.error('❌ Error in openProjectAddTaskModal:', error);
  }
}

/**
 * Open Add Task Modal for Matrix view
 */
export function openMatrixAddTaskModal(ctx) {
  try {
    console.log('🔘 openMatrixAddTaskModal called:', { 
      hasCtx: !!ctx, 
      ctxSelectedProjectId: ctx?.selectedProjectId,
      windowSelectedProjectId: typeof window.selectedProjectId !== 'undefined' ? window.selectedProjectId : null,
      projectsCount: ctx?.projects?.length 
    });
    
    if (!ctx || !ctx.projects) {
      console.warn('⚠️ Invalid context provided to openMatrixAddTaskModal');
      return;
    }
    
    const { projects } = ctx;
    const selectedProjectId = ctx?.selectedProjectId || 
      (typeof window.selectedProjectId !== 'undefined' ? window.selectedProjectId : null);
    
    if (!selectedProjectId) {
      console.warn('⚠️ No selectedProjectId in openMatrixAddTaskModal');
      return;
    }
    
    updateModalState(selectedProjectId, 'matrix');
    
    const project = findProjectById(projects, selectedProjectId);
    if (!project) {
      console.warn('⚠️ Project not found for ID:', selectedProjectId);
      return;
    }
    
    const titleEl = getElement('add-task-modal-title');
    if (titleEl) titleEl.textContent = `Add Task to ${project.name}`;
    
    setupLaneOptions(project);
    resetTaskForm();
    
    if (!showModal('add-task-modal', 'modal-task-title')) {
      console.error('❌ Failed to show add-task-modal');
    }
  } catch (error) {
    console.error('❌ Error in openMatrixAddTaskModal:', error);
  }
}

/**
 * Open Add Task Modal (general - no project required)
 */
export function openAddTaskModal() {
  try {
    updateModalState(null, 'general');
    
    const titleEl = getElement('add-task-modal-title');
    if (titleEl) titleEl.textContent = 'Add Task';
    
    // Hide lane field for general tasks
    const laneField = getElement('modal-task-lane-field');
    if (laneField) laneField.style.display = 'none';
    
    resetTaskForm();
    
    if (!showModal('add-task-modal', 'modal-task-title')) {
      console.error('❌ Failed to show add-task-modal');
    }
  } catch (error) {
    console.error('❌ Error in openAddTaskModal:', error);
  }
}

/**
 * Close Add Task Modal
 */
export function closeAddTaskModal() {
  try {
    const modal = getElement('add-task-modal');
    if (modal) modal.style.display = 'none';
    clearModalState();
  } catch (error) {
    console.error('❌ Error in closeAddTaskModal:', error);
  }
}

/**
 * Submit Add Task Modal
 */
export async function submitAddTaskModal(ctx) {
  try {
    console.log('🔘 submitAddTaskModal called:', {
      hasCtx: !!ctx,
      ctxKeys: ctx ? Object.keys(ctx) : [],
      currentModalContext: typeof window.currentModalContext !== 'undefined' ? window.currentModalContext : null,
      currentModalProjectId: typeof window.currentModalProjectId !== 'undefined' ? window.currentModalProjectId : null
    });
    
    // Validate required elements
    const titleInput = getElement('modal-task-title', true);
    if (!titleInput) {
      console.warn('⚠️ submitAddTaskModal: titleInput not found');
      return;
    }
    
    const title = titleInput.value.trim();
    if (!title) {
      // Use notification instead of alert for better UX
      if (typeof window.showNotification === 'function') {
        window.showNotification({
          message: 'Please enter a task title',
          type: 'warning',
          duration: 3000
        });
      } else {
        // Fallback: try to import and use
        import('../ui/components.js').then(module => {
          if (module.showNotification) {
            module.showNotification({
              message: 'Please enter a task title',
              type: 'warning',
              duration: 3000
            });
          }
        }).catch(() => {
          // Fallback to alert if notification not available
          alert('Please enter a task title');
        });
      }
      return;
    }
    
    // Get form values
    const priorityInput = getElement('modal-task-priority');
    const dueInput = getElement('modal-task-due');
    const laneInput = getElement('modal-task-lane');
    
    const priority = priorityInput?.value || 'medium';
    const due = dueInput?.value || null;
    const lane = laneInput?.value || '';
    
    // Get file links from modal
    const getFileLinks = window.Petal?.features?.fileOperations?.getFileLinks;
    const getFileLinksNormalized = window.Petal?.features?.fileOperations?.getFileLinksNormalized;
    const fileLinks = window.electronAPI && getFileLinksNormalized
      ? await getFileLinksNormalized('modal-task-files-container', 'mt')
      : (getFileLinks ? getFileLinks('modal-task-files-container', 'mt') : []);
    
    // Get modal context
    const currentModalContext = typeof window.currentModalContext !== 'undefined' ? window.currentModalContext : null;
    const currentModalProjectId = typeof window.currentModalProjectId !== 'undefined' ? window.currentModalProjectId : null;
    
    // Get handler functions (prefer features namespace, fallback to context)
    const getHandler = (name) => {
      return window.Petal?.features?.modalOperations?.[name] || ctx?.[name];
    };
    
    const addTaskToProjectFromModal = getHandler('addTaskToProjectFromModal');
    const addTaskToMatrixFromModal = getHandler('addTaskToMatrixFromModal');
    const addTaskFromModal = getHandler('addTaskFromModal');
    
    // Ensure we have a context for the functions that need it
    const finalCtx = ctx || window.Petal?.handlers?.createPageContext?.() || {};
    
    // Route to appropriate handler
    let success = false;
    if (currentModalContext === 'project' && currentModalProjectId) {
      if (addTaskToProjectFromModal) {
        console.log('✅ Calling addTaskToProjectFromModal');
        await addTaskToProjectFromModal(finalCtx, currentModalProjectId, title, priority, due, lane, fileLinks);
        success = true;
      } else {
        console.warn('⚠️ addTaskToProjectFromModal not available');
      }
    } else if (currentModalContext === 'matrix' && currentModalProjectId) {
      if (addTaskToMatrixFromModal) {
        console.log('✅ Calling addTaskToMatrixFromModal');
        await addTaskToMatrixFromModal(finalCtx, title, priority, due, lane, fileLinks);
        success = true;
      } else {
        console.warn('⚠️ addTaskToMatrixFromModal not available');
      }
    } else if (currentModalContext === 'general') {
      if (addTaskFromModal) {
        console.log('✅ Calling addTaskFromModal');
        await addTaskFromModal(finalCtx, title, priority, due, lane, fileLinks);
        success = true;
      } else {
        console.warn('⚠️ addTaskFromModal not available');
      }
    } else {
      console.warn('⚠️ submitAddTaskModal: No context specified', {
        currentModalContext,
        currentModalProjectId
      });
      alert('Unable to add task - no context specified');
      return;
    }
    
    if (success) {
      closeAddTaskModal();
      // Show success notification
      if (typeof window.showNotification === 'function') {
        window.showNotification({
          message: `Task "${title}" created successfully`,
          type: 'success',
          duration: 3000
        });
      } else {
        // Import and use if available
        import('../ui/components.js').then(module => {
          if (module.showNotification) {
            module.showNotification({
              message: `Task "${title}" created successfully`,
              type: 'success',
              duration: 3000
            });
          }
        }).catch(() => {
          // Notification system not available, skip
        });
      }
    } else {
      // Use notification instead of alert
      if (typeof window.showNotification === 'function') {
        window.showNotification({
          message: 'Failed to add task - handler function not available',
          type: 'error',
          duration: 4000
        });
      } else {
        alert('Failed to add task - handler function not available');
      }
    }
  } catch (error) {
    console.error('❌ Error in submitAddTaskModal:', error);
    // Use notification instead of alert
    if (typeof window.showNotification === 'function') {
      window.showNotification({
        message: 'An error occurred while adding the task. Please try again.',
        type: 'error',
        duration: 4000
      });
    } else {
      alert('An error occurred while adding the task. Please try again.');
    }
  }
}

/**
 * Helper: Convert priority string to number
 */
function priorityToNumber(priority) {
  const priorityMap = { low: 1, medium: 2, high: 3 };
  return priorityMap[priority] || 2;
}

/**
 * Helper: Determine stage based on lane
 */
function getStageForLane(lane) {
  if (!lane) return null;
  const laneToStage = {
    'lab': 'lab',
    'comp': 'comp',
    'writing': 'writing',
    'presentation': 'presentation'
  };
  return laneToStage[lane] || null;
}

/**
 * Add Task from Modal (general - no project)
 */
export async function addTaskFromModal(ctx, title, priority, due, lane) {
  try {
    if (!title || !title.trim()) {
      console.warn('⚠️ addTaskFromModal: Invalid title');
      return;
    }
    
    if (!window.Petal?.store) {
      console.error('❌ Store not available in addTaskFromModal');
      return;
    }
    
    const state = window.Petal.store.getState();
    const tasks = state.tasks || [];
    
    const newTask = {
      id: Date.now(),
      title: title.trim(),
      notes: '',
      note: '',
      noteUpdatedAt: null,
      log: [],
      priority: priorityToNumber(priority),
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
    updateStoreSafely({ tasks: [newTask, ...tasks] });
    
    // Re-render tasks view
    const { rerenderViewIfActive } = ctx || {};
    if (window.Petal?.ui?.renderTasks) {
      const newState = window.Petal.store.getState();
      const container = getElement('view-tasks');
      if (container) {
        await window.Petal.ui.renderTasks(container, newState, window.Petal.handlers);
      }
    } else if (rerenderViewIfActive) {
      await rerenderViewIfActive('tasks');
    }
  } catch (error) {
    console.error('❌ Error in addTaskFromModal:', error);
    throw error;
  }
}

/**
 * Add Task to Project from Modal
 */
export async function addTaskToProjectFromModal(ctx, projId, title, priority, due, lane, fileLinks = []) {
  try {
    if (!title || !title.trim()) {
      console.warn('⚠️ addTaskToProjectFromModal: Invalid title');
      return;
    }
    
    if (!window.Petal?.store) {
      console.error('❌ Store not available in addTaskToProjectFromModal');
      return;
    }
    
    console.log('🔘 addTaskToProjectFromModal called:', {
      projId,
      title,
      hasStore: !!window.Petal?.store,
      hasCtx: !!ctx,
      fileLinksCount: fileLinks?.length || 0
    });
    
    // Get projects from store (more reliable than context)
    const state = window.Petal.store.getState();
    const projects = state?.projects || ctx?.projects || [];
    
    const project = findProjectById(projects, projId);
    if (!project) {
      console.warn('⚠️ addTaskToProjectFromModal: Project not found:', {
        projId,
        availableProjectIds: projects.map(p => ({ id: p.id, type: typeof p.id, name: p.name }))
      });
      return;
    }
    
    console.log('✅ addTaskToProjectFromModal: Project found:', project.name);
    
    const normalizedProjId = normalizeProjectIdValue(projId);
    
    // Convert file links to canonical registry and get fileIds
    const fileIds = [];
    const findOrCreateCanonicalFile = window.Petal?.features?.fileManagement?.findOrCreateCanonicalFile;
    
    if (normalizedProjId && fileLinks && fileLinks.length > 0 && findOrCreateCanonicalFile) {
      fileLinks.forEach(fileLink => {
        const fileId = findOrCreateCanonicalFile(normalizedProjId, fileLink);
        if (fileId && !fileIds.includes(fileId)) {
          fileIds.push(fileId);
        }
      });
    }
    
    const newTask = {
      id: Date.now(),
      title: title.trim(),
      priority: priorityToNumber(priority),
      due: due || '',
      lane: lane || null,
      done: false,
      projectId: normalizedProjId,
      fileIds: fileIds,
      files: fileLinks || []
    };
    
    // Update store
    const currentTasks = state.tasks || [];
    updateStoreSafely({
      tasks: [...currentTasks, newTask]
    });
    
    // Verify the task was added
    const updatedState = window.Petal.store.getState();
    const taskWasAdded = updatedState.tasks?.some(t => t.id === newTask.id);
    console.log('✅ addTaskToProjectFromModal: Store updated, task added:', taskWasAdded);
    
    // Re-render projects view if visible
    const { rerenderViewIfActive } = ctx || {};
    if (rerenderViewIfActive) {
      await rerenderViewIfActive('projects');
    }
  } catch (error) {
    console.error('❌ Error in addTaskToProjectFromModal:', error);
    throw error;
  }
}

/**
 * Add Task to Matrix from Modal
 */
export async function addTaskToMatrixFromModal(ctx, title, priority, due, lane, fileLinks = []) {
  try {
    if (!title || !title.trim()) {
      console.warn('⚠️ addTaskToMatrixFromModal: Invalid title');
      return;
    }
    
    const selectedProjectId = typeof window.selectedProjectId !== 'undefined' ? window.selectedProjectId : null;
    
    if (!selectedProjectId) {
      console.warn('⚠️ addTaskToMatrixFromModal: No selectedProjectId');
      return;
    }
    
    if (!window.Petal?.store) {
      console.error('❌ Store not available in addTaskToMatrixFromModal');
      return;
    }
    
    console.log('🔘 addTaskToMatrixFromModal called:', {
      selectedProjectId,
      title,
      hasStore: !!window.Petal?.store,
      fileLinksCount: fileLinks?.length || 0
    });
    
    // Get projects from store to verify project exists
    const state = window.Petal.store.getState();
    const projects = state?.projects || ctx?.projects || [];
    
    const project = findProjectById(projects, selectedProjectId);
    if (!project) {
      console.warn('⚠️ addTaskToMatrixFromModal: Project not found:', {
        selectedProjectId,
        availableProjectIds: projects.map(p => ({ id: p.id, type: typeof p.id, name: p.name }))
      });
      return;
    }
    
    const normalizedProjId = normalizeProjectIdValue(selectedProjectId);
    
    // Convert file links to canonical registry and get fileIds
    const fileIds = [];
    const findOrCreateCanonicalFile = window.Petal?.features?.fileManagement?.findOrCreateCanonicalFile;
    
    if (normalizedProjId && fileLinks && fileLinks.length > 0 && findOrCreateCanonicalFile) {
      fileLinks.forEach(fileLink => {
        const fileId = findOrCreateCanonicalFile(normalizedProjId, fileLink);
        if (fileId && !fileIds.includes(fileId)) {
          fileIds.push(fileId);
        }
      });
    }
    
    const newTask = {
      id: Date.now(),
      title: title.trim(),
      priority: priorityToNumber(priority),
      due: due || '',
      lane: lane || null,
      done: false,
      projectId: normalizedProjId,
      fileIds: fileIds,
      files: fileLinks || []
    };
    
    // Update store
    const currentTasks = state.tasks || [];
    updateStoreSafely({
      tasks: [...currentTasks, newTask]
    });
    
    // Verify the task was added
    const updatedState = window.Petal.store.getState();
    const taskWasAdded = updatedState.tasks?.some(t => t.id === newTask.id);
    console.log('✅ addTaskToMatrixFromModal: Store updated, task added:', taskWasAdded);
    
    // Re-render matrix
    const { renderWorkflowMatrix } = ctx || {};
    if (renderWorkflowMatrix) {
      renderWorkflowMatrix();
    }
  } catch (error) {
    console.error('❌ Error in addTaskToMatrixFromModal:', error);
    throw error;
  }
}

// ═══════════════════════ FILE MODALS ═══════════════════════

/**
 * Helper: Reset file modal UI
 */
function resetFileModalUI() {
  const container = getElement('modal-files-container');
  if (container) {
    container.innerHTML = '';
    container.style.borderColor = 'var(--border)';
    container.style.background = '';
  }
  
  const dropHint = getElement('modal-files-drop-hint');
  if (dropHint) dropHint.style.display = 'none';
  
  // Update button text and hint visibility based on environment
  const addFileBtn = getElement('modal-add-file-btn');
  const fileHint = getElement('modal-file-hint');
  if (window.electronAPI) {
    if (addFileBtn) addFileBtn.textContent = '＋ Choose file';
    if (fileHint) fileHint.style.display = 'block';
  } else {
    if (addFileBtn) addFileBtn.textContent = '＋ Add file link';
    if (fileHint) fileHint.style.display = 'none';
  }
}

/**
 * Open Add File Modal for a specific project
 */
export function openProjectAddFileModal(ctx, projId) {
  try {
    if (!ctx || !ctx.projects) {
      console.warn('⚠️ Invalid context provided to openProjectAddFileModal');
      return;
    }
    
    const { projects } = ctx;
    updateModalState(projId, 'project');
    
    const project = findProjectById(projects, projId);
    if (!project) {
      console.warn('⚠️ Project not found for ID:', projId);
      return;
    }
    
    const titleEl = getElement('add-file-modal-title');
    if (titleEl) titleEl.textContent = `Add File to ${project.name}`;
    
    resetFileModalUI();
    
    if (!showModal('add-file-modal')) {
      console.error('❌ Failed to show add-file-modal');
    }
  } catch (error) {
    console.error('❌ Error in openProjectAddFileModal:', error);
  }
}

/**
 * Open Add File Modal for Matrix view
 */
export function openMatrixAddFileModal(ctx) {
  try {
    if (!ctx || !ctx.projects) {
      console.warn('⚠️ Invalid context provided to openMatrixAddFileModal');
      return;
    }
    
    const { projects } = ctx;
    const selectedProjectId = typeof window.selectedProjectId !== 'undefined' ? window.selectedProjectId : null;
    
    if (!selectedProjectId) {
      console.warn('⚠️ No selectedProjectId in openMatrixAddFileModal');
      return;
    }
    
    updateModalState(selectedProjectId, 'matrix');
    
    const project = findProjectById(projects, selectedProjectId);
    if (!project) {
      console.warn('⚠️ Project not found for ID:', selectedProjectId);
      return;
    }
    
    const titleEl = getElement('add-file-modal-title');
    if (titleEl) titleEl.textContent = `Add File to ${project.name}`;
    
    resetFileModalUI();
    
    if (!showModal('add-file-modal')) {
      console.error('❌ Failed to show add-file-modal');
    }
  } catch (error) {
    console.error('❌ Error in openMatrixAddFileModal:', error);
  }
}

/**
 * Close Add File Modal
 */
export function closeAddFileModal() {
  try {
    const modal = getElement('add-file-modal');
    if (modal) modal.style.display = 'none';
    
    clearModalState();
    
    // Clear file container
    const container = getElement('modal-files-container');
    if (container) container.innerHTML = '';
  } catch (error) {
    console.error('❌ Error in closeAddFileModal:', error);
  }
}

/**
 * Submit Add File Modal
 */
export async function submitAddFileModal(ctx) {
  try {
    const currentModalProjectId = typeof window.currentModalProjectId !== 'undefined' ? window.currentModalProjectId : null;
    if (!currentModalProjectId) {
      console.warn('⚠️ submitAddFileModal: No currentModalProjectId');
      return;
    }
    
    const container = getElement('modal-files-container', true);
    if (!container) {
      console.warn('⚠️ submitAddFileModal: Container not found');
      return;
    }
    
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
    const { addFileToProjectFromModal, addFileToMatrixFromModal, linkFilesToTaskFromModal } = ctx || {};
    
    if (currentModalContext === 'project') {
      if (addFileToProjectFromModal) {
        await addFileToProjectFromModal(ctx, currentModalProjectId, filesToAdd);
      }
      // If we're adding files from a task drawer, link them to the task
      if (window.currentModalTaskId && linkFilesToTaskFromModal) {
        await linkFilesToTaskFromModal(ctx, window.currentModalTaskId, filesToAdd);
        window.currentModalTaskId = null;
      }
    } else if (currentModalContext === 'matrix') {
      if (addFileToMatrixFromModal) {
        await addFileToMatrixFromModal(ctx, filesToAdd);
      }
    }
    
    closeAddFileModal();
  } catch (error) {
    console.error('❌ Error in submitAddFileModal:', error);
    alert('An error occurred while adding files. Please try again.');
  }
}

/**
 * Add File to Project from Modal
 */
export async function addFileToProjectFromModal(ctx, projId, filesToAdd) {
  try {
    if (!filesToAdd || !Array.isArray(filesToAdd) || filesToAdd.length === 0) {
      console.warn('⚠️ addFileToProjectFromModal: No files to add');
      return;
    }
    
    if (!window.Petal?.store) {
      console.error('❌ Store not available in addFileToProjectFromModal');
      return;
    }
    
    const state = window.Petal.store.getState();
    const projects = state?.projects || ctx?.projects || [];
    
    const project = findProjectById(projects, projId);
    if (!project) {
      console.warn('⚠️ addFileToProjectFromModal: Project not found:', projId);
      return;
    }
    
    // Ensure files have canonical structure
    const { findOrCreateCanonicalFile } = ctx || {};
    if (findOrCreateCanonicalFile) {
      filesToAdd.forEach(fileLink => {
        findOrCreateCanonicalFile(projId, fileLink);
      });
    }
    
    // Update store
    const normalizedProjId = normalizeProjectIdValue(projId);
    const updatedProjects = (state.projects || []).map(proj => {
      const projIdNormalized = normalizeProjectIdValue(proj.id);
      if (projIdNormalized === normalizedProjId || String(projIdNormalized) === String(normalizedProjId)) {
        return { ...proj, files: [...(proj.files || []), ...filesToAdd] };
      }
      return proj;
    });
    updateStoreSafely({ projects: updatedProjects });
    
    // Re-render projects view if visible
    const { rerenderViewIfActive } = ctx || {};
    if (rerenderViewIfActive) {
      await rerenderViewIfActive('projects');
    }
  } catch (error) {
    console.error('❌ Error in addFileToProjectFromModal:', error);
    throw error;
  }
}

/**
 * Add File to Matrix Project from Modal
 */
export async function addFileToMatrixFromModal(ctx, filesToAdd) {
  try {
    if (!filesToAdd || !Array.isArray(filesToAdd) || filesToAdd.length === 0) {
      console.warn('⚠️ addFileToMatrixFromModal: No files to add');
      return;
    }
    
    const selectedProjectId = typeof window.selectedProjectId !== 'undefined' ? window.selectedProjectId : null;
    if (!selectedProjectId) {
      console.warn('⚠️ addFileToMatrixFromModal: No selectedProjectId');
      return;
    }
    
    if (!window.Petal?.store) {
      console.error('❌ Store not available in addFileToMatrixFromModal');
      return;
    }
    
    const state = window.Petal.store.getState();
    const projects = state?.projects || ctx?.projects || [];
    
    const project = findProjectById(projects, selectedProjectId);
    if (!project) {
      console.warn('⚠️ addFileToMatrixFromModal: Project not found:', selectedProjectId);
      return;
    }
    
    // Ensure files have canonical structure
    const { findOrCreateCanonicalFile } = ctx || {};
    if (findOrCreateCanonicalFile) {
      filesToAdd.forEach(fileLink => {
        findOrCreateCanonicalFile(selectedProjectId, fileLink);
      });
    }
    
    // Update store
    const normalizedProjId = normalizeProjectIdValue(selectedProjectId);
    const updatedProjects = (state.projects || []).map(proj => {
      const projIdNormalized = normalizeProjectIdValue(proj.id);
      if (projIdNormalized === normalizedProjId || String(projIdNormalized) === String(normalizedProjId)) {
        return { ...proj, files: [...(proj.files || []), ...filesToAdd] };
      }
      return proj;
    });
    updateStoreSafely({ projects: updatedProjects });
    
    // Re-render matrix
    const { renderWorkflowMatrix } = ctx || {};
    if (renderWorkflowMatrix) {
      renderWorkflowMatrix();
    }
  } catch (error) {
    console.error('❌ Error in addFileToMatrixFromModal:', error);
    throw error;
  }
}

/**
 * Link files to task after they're added to project (called from task drawer)
 */
export async function linkFilesToTaskFromModal(ctx, taskId, filesToAdd) {
  try {
    if (!filesToAdd || !Array.isArray(filesToAdd) || filesToAdd.length === 0) {
      console.warn('⚠️ linkFilesToTaskFromModal: No files to link');
      return;
    }
    
    if (!window.Petal?.store) {
      console.error('❌ Store not available in linkFilesToTaskFromModal');
      return;
    }
    
    const state = window.Petal.store.getState();
    const tasks = state.tasks || [];
    const task = tasks.find(t => t.id === taskId && !t.deletedAt);
    
    if (!task) {
      console.warn('⚠️ linkFilesToTaskFromModal: Task not found:', taskId);
      return;
    }
    
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
      const pageCtx = window.Petal.handlers?.createPageContext?.() || { tasks, projects: state?.projects || [] };
      window.Petal.features.taskDrawer.renderTaskDrawerFiles(pageCtx);
    }
  } catch (error) {
    console.error('❌ Error in linkFilesToTaskFromModal:', error);
    throw error;
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
 * Populate File Notes Modal (internal helper)
 * @private
 */
function populateFileNotesModal(file) {
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
