// ═══════════════════════ MATRIX OPERATIONS ═══════════════════════
// Operations for workflow matrix view (drag-drop, task management, etc.)

import { LANE_STAGES } from '../domain/schema.js';
import { findProjectById, filterTasksForProject, normalizeProjectIdValue, projectIdsMatch } from '../utils/projectHelpers.js';

function matrixItemMatchesId(item, id) {
  return item && (item.id === id || String(item.id) === String(id));
}

/** Re-render project matrix with a proper page context. */
export async function refreshWorkflowMatrix(ctx) {
  const baseCtx = ctx || window.Petal?.handlers?.createPageContext?.() || {};
  const context = {
    ...baseCtx,
    selectedProjectId:
      baseCtx.selectedProjectId ??
      (typeof window.selectedProjectId !== 'undefined' ? window.selectedProjectId : null)
  };
  if (typeof context.renderWorkflowMatrix === 'function') {
    return context.renderWorkflowMatrix(context);
  }
  if (window.Petal?.ui?.renderWorkflowMatrix) {
    return window.Petal.ui.renderWorkflowMatrix(context);
  }
  if (typeof window.renderWorkflowMatrix === 'function') {
    return window.renderWorkflowMatrix(context);
  }
}

function stageUpdatesForMatrix(stage) {
  if (stage === 'doing') {
    return { status: 'Doing', stage: 'doing', done: false };
  }
  if (stage === 'blocked') {
    return { stage: 'blocked', done: false };
  }
  if (stage === 'ready') {
    return { status: 'Done', stage: 'ready', done: true };
  }
  return { stage: 'planned', status: 'Todo', done: false };
}

/**
 * Matrix drag state (module-level variable)
 */
let draggedMatrixTaskId = null;

/**
 * Handle matrix drag start
 */
export function onMatrixDragStart(event, taskId) {
  draggedMatrixTaskId = taskId;
  event.dataTransfer.effectAllowed = 'move';
  event.currentTarget.classList.add('dragging');
}

/**
 * Handle matrix drag end
 */
export function onMatrixDragEnd(event) {
  event.currentTarget.classList.remove('dragging');
  document.querySelectorAll('.matrix-stage-column').forEach(col => col.classList.remove('drag-over'));
}

/**
 * Handle matrix drop
 */
export async function onMatrixDrop(ctx, event, lane, stage) {
  const { tasks, projects, save, renderWorkflowMatrix: renderWorkflowMatrixFn } = ctx;
  
  event.preventDefault();
  event.currentTarget.classList.remove('drag-over');
  
  if (!draggedMatrixTaskId) return;
  
  const renderWorkflowMatrixFunction = renderWorkflowMatrixFn || refreshWorkflowMatrix;

  const draggedId = draggedMatrixTaskId;
  const store = window.Petal?.store;

  const applyDropToStore = () => {
    if (!store) return false;
    const state = store.getState();
    const task = (state.tasks || []).find(t => matrixItemMatchesId(t, draggedId));

    if (task) {
      const wasSubtaskTask = task.subtaskId !== null && task.subtaskId !== undefined;
      const stagePatch = stageUpdatesForMatrix(stage);
      const updatedTasks = (state.tasks || []).map(t =>
        matrixItemMatchesId(t, draggedId) ? { ...t, lane, ...stagePatch } : t
      );
      let updatedProjects = state.projects;
      if (wasSubtaskTask && task.subtaskId) {
        updatedProjects = (state.projects || []).map(p => {
          if (!projectIdsMatch(p.id, task.projectId)) return p;
          return {
            ...p,
            subtasks: (p.subtasks || []).map(s =>
              matrixItemMatchesId(s, task.subtaskId) ? { ...s, lane } : s
            )
          };
        });
      }
      store.setState({ tasks: updatedTasks, projects: updatedProjects });
      return true;
    }

    for (const p of (state.projects || [])) {
      const subtask = (p.subtasks || []).find(s => matrixItemMatchesId(s, draggedId));
      if (subtask) {
        const stagePatch = stageUpdatesForMatrix(stage);
        const updatedProjects = (state.projects || []).map(proj => {
          if (proj.id !== p.id && !projectIdsMatch(proj.id, p.id)) return proj;
          return {
            ...proj,
            subtasks: (proj.subtasks || []).map(s =>
              matrixItemMatchesId(s, draggedId) ? { ...s, lane, ...stagePatch } : s
            )
          };
        });
        store.setState({ projects: updatedProjects });
        return true;
      }
    }
    return false;
  };

  if (applyDropToStore()) {
    await renderWorkflowMatrixFunction(ctx);
    return;
  }

  const task = (tasks || []).find(t => matrixItemMatchesId(t, draggedId));
  if (task) {
    // If task belongs to a subtask, preserve that relationship
    const wasSubtaskTask = task.subtaskId !== null && task.subtaskId !== undefined;
    
    task.lane = lane;
    // Map stage to task properties
    if (stage === 'doing') {
      task.status = 'Doing';
      task.stage = 'doing';
      task.done = false;
    } else if (stage === 'blocked') {
      task.stage = 'blocked';
      task.done = false;
    } else if (stage === 'ready') {
      task.status = 'Done';
      task.stage = 'ready';
      task.done = true;
    } else {
      task.stage = 'planned';
      task.status = 'Todo';
      task.done = false;
    }
    
    // If moving a subtask task to a different lane, update subtask's lane too
    if (wasSubtaskTask && task.subtaskId) {
      const project = findProjectById(projects, task.projectId);
      if (project) {
        const subtask = (project.subtasks || []).find(s => s.id === task.subtaskId);
        if (subtask) {
          subtask.lane = lane;
        }
      }
    }
    
    if (save) await save();
    await renderWorkflowMatrixFunction(ctx);
    return;
  }
  
  // Check if it's a subtask
  for (const p of (projects || [])) {
    const subtask = (p.subtasks || []).find(s => s.id === draggedMatrixTaskId);
    if (subtask) {
      subtask.lane = lane;
      // Map stage to task properties
      if (stage === 'doing') {
        subtask.status = 'Doing';
        subtask.stage = 'doing';
        subtask.done = false;
      } else if (stage === 'blocked') {
        subtask.stage = 'blocked';
        subtask.done = false;
      } else if (stage === 'ready') {
        subtask.done = true;
      } else {
        subtask.stage = 'planned';
        subtask.status = 'Todo';
        subtask.done = false;
      }
      if (save) await save();
      await renderWorkflowMatrixFunction(ctx);
      return;
    }
  }
}

// ═══════════════════════ MATRIX VIEW NAVIGATION ═══════════════════════

/**
 * Show the projects home: card list, not the matrix view or project dropdown.
 */
export function showProjectsListHome({ rerender = true } = {}) {
  if (typeof window.selectedProjectId !== 'undefined') {
    window.selectedProjectId = null;
  }

  const matrixView = document.getElementById('workflow-matrix-view');
  const listView = document.getElementById('project-list-view');
  const createFormSection = document.getElementById('project-selector-create-section');
  const matrixSelect = document.getElementById('matrix-project-select');

  if (matrixView) {
    matrixView.style.display = 'none';
    matrixView.style.visibility = 'hidden';
  }
  if (listView) {
    listView.style.display = 'block';
    listView.style.visibility = 'visible';
  }
  // Dropdown is for legacy matrix navigation; home uses project cards.
  if (createFormSection) {
    createFormSection.style.display = 'none';
  }
  if (matrixSelect) {
    matrixSelect.value = '';
  }

  if (rerender && window.rerenderViewIfActive) {
    window.rerenderViewIfActive('projects');
  }
}

/**
 * Select project for matrix view
 */
export async function selectProjectForMatrix(ctx, projectId) {
  const { selectedProjectId: selectedProjectIdValue, renderWorkflowMatrix: renderWorkflowMatrixFn } = ctx;
  
  const resolvedProjectId =
    projectId !== undefined && projectId !== null && projectId !== ''
      ? normalizeProjectIdValue(projectId)
      : null;

  if (typeof window.selectedProjectId !== 'undefined') {
    window.selectedProjectId = resolvedProjectId;
  }

  const createFormSection = document.getElementById('project-selector-create-section');

  if (resolvedProjectId !== null && resolvedProjectId !== '') {
    // First hide the project list view
    const listView = document.getElementById('project-list-view');
    if (listView) {
      listView.style.display = 'none';
      listView.style.visibility = 'hidden';
    }
    
    // Then show the matrix view
    const matrixView = document.getElementById('workflow-matrix-view');
    if (matrixView) {
      matrixView.style.display = 'block';
      matrixView.style.visibility = 'visible';
      matrixView.style.opacity = '1';
    }
    
    // Hide project creation form when viewing a project
    if (createFormSection) createFormSection.style.display = 'none';
    
    // Render the matrix view (this will set the title)
    // Ensure context has selectedProjectId - get state if needed
    const state = window.Petal?.store?.getState() || {};
    
    // Get additional context first
    const additionalCtx = window.Petal?.handlers?.createPageContext?.() || {};
    
    // Build context - exclude selectedProjectId from ctx spread to prevent undefined from overwriting our value
    const { selectedProjectId: ctxSelectedId, ...ctxWithoutSelectedId } = ctx || {};
    const contextWithProjectId = {
      ...additionalCtx,
      ...ctxWithoutSelectedId,
      projects: ctx?.projects || state.projects || [],
      tasks: ctx?.tasks || state.tasks || [],
      selectedProjectId: resolvedProjectId  // Set explicitly AFTER spreading (so it can't be overwritten)
    };
    
    // Verify it's set correctly
    const verifySelectedId = contextWithProjectId.selectedProjectId;
    console.log('🔍 selectProjectForMatrix: Context built', {
      hasRenderFn: !!renderWorkflowMatrixFn,
      hasWindowFn: typeof window.renderWorkflowMatrix === 'function',
      selectedProjectId: verifySelectedId,
      selectedProjectIdType: typeof verifySelectedId,
      resolvedProjectId,
      resolvedProjectIdType: typeof resolvedProjectId,
      contextKeys: Object.keys(contextWithProjectId),
      contextHasSelectedProjectId: 'selectedProjectId' in contextWithProjectId,
      ctxHadSelectedProjectId: ctx ? 'selectedProjectId' in ctx : false,
      ctxSelectedProjectIdValue: ctxSelectedId
    });
    
    // Double-check: if it's still undefined, force it
    if (contextWithProjectId.selectedProjectId === undefined || contextWithProjectId.selectedProjectId === null) {
      console.warn('⚠️ selectedProjectId is undefined after setting, forcing it');
      contextWithProjectId.selectedProjectId = resolvedProjectId;
    }

    const stateForLookup = window.Petal?.store?.getState() || {};
    const projectsList = contextWithProjectId.projects || stateForLookup.projects || [];
    if (!findProjectById(projectsList, resolvedProjectId)) {
      console.warn('⚠️ selectProjectForMatrix: Project not found', resolvedProjectId);
      showProjectsListHome();
      return;
    }
    
    if (renderWorkflowMatrixFn) {
      await renderWorkflowMatrixFn(contextWithProjectId);
    } else if (window.Petal?.ui?.renderWorkflowMatrix) {
      // Call the module function directly (not the HTML wrapper)
      // The HTML wrapper calls createPageContext() which has selectedProjectId: undefined
      await window.Petal.ui.renderWorkflowMatrix(contextWithProjectId);
    } else {
      window.selectedProjectId = resolvedProjectId;
      await refreshWorkflowMatrix(contextWithProjectId);
    }
  } else {
    showProjectsListHome();
  }
}

/**
 * Open project view (switches to projects view and opens the project)
 */
export async function openProjectView(ctx, projectId) {
  if (!projectId) return;
  
  // Switch to projects view
  if (window.routerSwitchView) {
    window.routerSwitchView('projects');
  } else if (window.switchView) {
    window.switchView('projects');
  }
  
  const resolvedProjectId = normalizeProjectIdValue(projectId);
  if (typeof window.selectedProjectId !== 'undefined') {
    window.selectedProjectId = resolvedProjectId;
  }
  const matrixView = document.getElementById('workflow-matrix-view');
  const listView = document.getElementById('project-list-view');
  if (matrixView) {
    matrixView.style.display = 'block';
    matrixView.style.visibility = 'visible';
    matrixView.style.opacity = '1';
  }
  if (listView) {
    listView.style.display = 'none';
  }
  // Hide project creation form when viewing a project
  const createFormSection = document.getElementById('project-selector-create-section');
  if (createFormSection) createFormSection.style.display = 'none';
  
  // Call selectProjectForMatrix to properly render the matrix with context
  const updatedCtx = { 
    ...ctx, 
    selectedProjectId: resolvedProjectId
  };
  
  if (window.Petal?.features?.matrixOperations?.selectProjectForMatrix) {
    window.Petal.features.matrixOperations.selectProjectForMatrix(updatedCtx, projectId);
  } else if (window.selectProjectForMatrix) {
    window.selectProjectForMatrix(projectId);
  } else {
    await refreshWorkflowMatrix(updatedCtx);
  }
}

/**
 * Toggle workflow matrix visibility
 */
export function toggleWorkflowMatrix(ctx) {
  const { projects, tasks, createPageContext: createPageContextFn } = ctx;
  
  const container = document.getElementById('workflow-matrix-container');
  const btn = document.getElementById('toggle-workflow-matrix-btn');
  if (!container || !btn) return;
  
  const isVisible = container.style.display !== 'none';
  container.style.display = isVisible ? 'none' : 'block';
  btn.textContent = isVisible ? 'View Mind Map' : 'Hide Mind Map';
  
  if (!isVisible) {
    // Get parameters for renderMindMap
    const selectedProjectId = typeof window.selectedProjectId !== 'undefined' ? window.selectedProjectId : null;
    if (selectedProjectId && window.Petal?.ui?.renderMindMap) {
      const project = findProjectById(projects || [], selectedProjectId);
      if (project) {
        const projectTasks = filterTasksForProject(tasks || [], project.id, { excludeDeleted: true });
        const projectSubtasks = project.subtasks || [];
        const tasksBySubtask = {};
        const standaloneTasks = [];
        projectTasks.forEach(task => {
          if (task.isSubtask) return;
          if (task.subtaskId) {
            if (!tasksBySubtask[task.subtaskId]) tasksBySubtask[task.subtaskId] = [];
            tasksBySubtask[task.subtaskId].push(task);
          } else {
            standaloneTasks.push(task);
          }
        });
        const laneConfig = {
          lab: { id: 'lab', label: '🧪 Lab', color: '#d4a0a0' },
          comp: { id: 'comp', label: '💻 Computational', color: '#a0a0d4' },
          writing: { id: 'writing', label: '📝 Writing', color: '#a0d4a0' },
          presentation: { id: 'presentation', label: '📊 Presentation', color: '#d4d4a0' }
        };
        const allowedLanes = project.workflowLanes || ['lab', 'comp', 'writing', 'presentation'];
        const MATRIX_LANES = allowedLanes.map(laneId => laneConfig[laneId]).filter(Boolean);
        const pageCtx = createPageContextFn ? createPageContextFn() : ctx;
        window.Petal.ui.renderMindMap(pageCtx, project, projectTasks, standaloneTasks, tasksBySubtask, MATRIX_LANES);
      }
    }
  }
}

/**
 * Add task to matrix project
 */
export async function addTaskToMatrix(ctx) {
  const { tasks, projects, normalizeProjectIdValue: normalizeProjectIdValueFn, save, renderWorkflowMatrix: renderWorkflowMatrixFn, toggleMatrixAddTask } = ctx;
  
  const normalizeProjectIdValueFunction = normalizeProjectIdValueFn || ((id) => {
    if (typeof window.normalizeProjectIdValue === 'function') {
      return window.normalizeProjectIdValue(id);
    }
    return id;
  });
  
  const renderWorkflowMatrixFunction = renderWorkflowMatrixFn || refreshWorkflowMatrix;
  
  const selectedProjectId = typeof window.selectedProjectId !== 'undefined' ? window.selectedProjectId : null;
  if (!selectedProjectId) return;
  
  const normalizedProjId = normalizeProjectIdValueFunction(selectedProjectId);
  const title = document.getElementById('matrix-task-title')?.value.trim();
  if (!title) {
    document.getElementById('matrix-task-title')?.focus();
    return;
  }
  
  const lane = document.getElementById('matrix-task-lane')?.value || '';
  const priority = document.getElementById('matrix-task-priority')?.value || 'medium';
  const due = document.getElementById('matrix-task-due')?.value || '';
  
  // Determine stage based on lane
  let stage = 'planned';
  if (lane && LANE_STAGES[lane]) {
    stage = LANE_STAGES[lane][0]; // First stage (Planned)
  }
  
  const newTask = {
    id: Date.now(),
    title,
    notes: '',
    priority,
    due,
    files: [],
    done: false,
    status: 'Todo',
    lane: lane || null,
    stage: stage,
    projectId: normalizedProjId,
    subtasks: [],
    dependsOn: null,
    boardOrder: 1024
  };
  
  if (window.Petal?.store) {
    const state = window.Petal.store.getState();
    window.Petal.store.setState({ tasks: [newTask, ...(state.tasks || [])] });
  } else {
    if (tasks) tasks.unshift(newTask);
    if (save) await save();
  }
  await renderWorkflowMatrixFunction(ctx);
  
  // Clear form
  const titleEl = document.getElementById('matrix-task-title');
  const laneEl = document.getElementById('matrix-task-lane');
  const priorityEl = document.getElementById('matrix-task-priority');
  const dueEl = document.getElementById('matrix-task-due');
  if (titleEl) titleEl.value = '';
  if (laneEl) laneEl.value = '';
  if (priorityEl) priorityEl.value = 'medium';
  if (dueEl) dueEl.value = '';
  
  // Collapse the form after adding
  if (toggleMatrixAddTask) {
    toggleMatrixAddTask();
  } else if (typeof window.toggleMatrixAddTask === 'function') {
    window.toggleMatrixAddTask();
  }
}

/**
 * Add task to specific subtask
 */
export async function addTaskToSubtask(ctx, projectId, subtaskId) {
  const { tasks, projects, normalizeProjectIdValue: normalizeProjectIdValueFn, save, renderWorkflowMatrix: renderWorkflowMatrixFn } = ctx;
  
  const normalizeProjectIdValueFunction = normalizeProjectIdValueFn || ((id) => {
    if (typeof window.normalizeProjectIdValue === 'function') {
      return window.normalizeProjectIdValue(id);
    }
    return id;
  });
  
  const renderWorkflowMatrixFunction = renderWorkflowMatrixFn || refreshWorkflowMatrix;
  
  const selectedProjectId = typeof window.selectedProjectId !== 'undefined' ? window.selectedProjectId : null;
  if (!selectedProjectId || selectedProjectId !== projectId) return;
  
  const normalizedProjId = normalizeProjectIdValueFunction(projectId);
  const title = prompt('Enter task title:');
  if (!title) return;
  
  const project = findProjectById(projects, normalizedProjId);
  if (!project) return;
  
  const subtask = (project.subtasks || []).find(s => s.id === subtaskId);
  if (!subtask) return;
  
  // Get subtask's lane
  const lane = subtask.lane || '';
  
  // Get max order for this subtask's tasks
  const subtaskTasks = (tasks || []).filter(t => t.subtaskId === subtaskId);
  const maxOrder = subtaskTasks.length > 0 
    ? Math.max(...subtaskTasks.map(t => t.subtaskOrder || 0)) + 1 
    : 0;
  
  // Determine stage based on lane
  let stage = 'planned';
  if (lane && LANE_STAGES[lane]) {
    stage = LANE_STAGES[lane][0];
  }
  
  const newTask = {
    id: Date.now(),
    title: title.trim(),
    notes: '',
    priority: 'medium',
    due: '',
    files: [],
    done: false,
    status: 'Todo',
    lane: lane || null,
    stage: stage,
    projectId: normalizedProjId,
    subtaskId: subtaskId,
    subtaskOrder: maxOrder,
    dependsOn: null,
    boardOrder: 1024
  };
  
  if (window.Petal?.store) {
    const state = window.Petal.store.getState();
    window.Petal.store.setState({ tasks: [newTask, ...(state.tasks || [])] });
  } else {
    if (tasks) tasks.unshift(newTask);
    if (save) await save();
  }
  await renderWorkflowMatrixFunction(ctx);
}

/**
 * Move task up/down within subtask
 */
export async function moveTaskInSubtask(ctx, taskId, subtaskId, currentOrder, direction) {
  const { tasks, save, renderWorkflowMatrix: renderWorkflowMatrixFn } = ctx;
  
  const renderWorkflowMatrixFunction = renderWorkflowMatrixFn || refreshWorkflowMatrix;
  
  const task = (tasks || []).find(t => t.id === taskId);
  if (!task || task.subtaskId !== subtaskId) return;
  
  const subtaskTasks = (tasks || []).filter(t => t.subtaskId === subtaskId).sort((a, b) => {
    return (a.subtaskOrder || 0) - (b.subtaskOrder || 0);
  });
  
  const currentIndex = subtaskTasks.findIndex(t => t.id === taskId);
  if (currentIndex === -1) return;
  
  let newIndex;
  if (direction === 'up' && currentIndex > 0) {
    newIndex = currentIndex - 1;
  } else if (direction === 'down' && currentIndex < subtaskTasks.length - 1) {
    newIndex = currentIndex + 1;
  } else {
    return; // Can't move
  }
  
  const otherTask = subtaskTasks[newIndex];
  const tempOrder = task.subtaskOrder ?? currentIndex;
  const otherOrder = otherTask.subtaskOrder ?? newIndex;

  if (window.Petal?.store) {
    const state = window.Petal.store.getState();
    const updatedTasks = (state.tasks || []).map(t => {
      if (t.id === taskId) return { ...t, subtaskOrder: otherOrder };
      if (t.id === otherTask.id) return { ...t, subtaskOrder: tempOrder };
      return t;
    });
    window.Petal.store.setState({ tasks: updatedTasks });
  } else {
    task.subtaskOrder = otherOrder;
    otherTask.subtaskOrder = tempOrder;
    if (save) await save();
  }
  await renderWorkflowMatrixFunction(ctx);
}

function persistProjectFiles(projectId, filesToAdd) {
  const store = window.Petal?.store;
  if (!store || !filesToAdd.length) return false;

  const state = store.getState();
  const updatedProjects = (state.projects || []).map(proj => {
    if (projectIdsMatch(proj.id, projectId)) {
      return { ...proj, files: [...(proj.files || []), ...filesToAdd] };
    }
    return proj;
  });
  store.setState({ projects: updatedProjects });
  return true;
}

/**
 * Add file to matrix project
 */
export async function addFileToMatrixProject(ctx) {
  const { projects, getFileLinks, getFileLinksNormalized, save, renderWorkflowMatrix: renderWorkflowMatrixFn, toggleMatrixAddFile } = ctx;
  
  const renderWorkflowMatrixFunction = renderWorkflowMatrixFn || refreshWorkflowMatrix;
  
  const selectedProjectId = typeof window.selectedProjectId !== 'undefined' ? window.selectedProjectId : null;
  if (!selectedProjectId) return;
  
  const project = findProjectById(projects, selectedProjectId);
  if (!project) return;
  
  const files = window.electronAPI 
    ? (getFileLinksNormalized ? await getFileLinksNormalized('matrix-project-files-container', 'p-matrix') : [])
    : (getFileLinks ? getFileLinks('matrix-project-files-container', 'p-matrix') : []);
  
  if (files.length === 0) {
    alert('Please add at least one file');
    return;
  }
  
  if (!persistProjectFiles(selectedProjectId, files)) {
    const existingFiles = project.files || [];
    project.files = [...existingFiles, ...files];
    if (save) await save();
  }
  await renderWorkflowMatrixFunction(ctx);
  
  // Clear file container
  const container = document.getElementById('matrix-project-files-container');
  if (container) container.innerHTML = '';
  
  // Collapse the form after adding
  if (toggleMatrixAddFile) {
    toggleMatrixAddFile();
  } else if (typeof window.toggleMatrixAddFile === 'function') {
    window.toggleMatrixAddFile();
  }
}

/**
 * Add file to project from active matrix view
 */
export async function addFileToProjectFromActive(ctx) {
  const { projects, getFileLinks, getFileLinksNormalized, save, renderWorkflowMatrix: renderWorkflowMatrixFn } = ctx;
  
  const renderWorkflowMatrixFunction = renderWorkflowMatrixFn || refreshWorkflowMatrix;
  
  const selectedProjectId = typeof window.selectedProjectId !== 'undefined' ? window.selectedProjectId : null;
  if (!selectedProjectId) return;
  
  const project = findProjectById(projects, selectedProjectId);
  if (!project) return;
  
  const files = window.electronAPI 
    ? (getFileLinksNormalized ? await getFileLinksNormalized('active-project-files-container', 'p-active') : [])
    : (getFileLinks ? getFileLinks('active-project-files-container', 'p-active') : []);
  
  if (files.length === 0) {
    alert('Please add at least one file');
    return;
  }
  
  if (!persistProjectFiles(selectedProjectId, files)) {
    const existingFiles = project.files || [];
    project.files = [...existingFiles, ...files];
    if (save) await save();
  }
  await renderWorkflowMatrixFunction(ctx);
  
  // Clear file container and hide form
  const container = document.getElementById('active-project-files-container');
  if (container) container.innerHTML = '';
  
  // Toggle the form section closed
  const toggleAddProjectFileToActive = typeof window.toggleAddProjectFileToActive === 'function' 
    ? window.toggleAddProjectFileToActive 
    : (() => {
        const section = document.getElementById('add-project-file-active-section');
        if (section) section.style.display = 'none';
      });
  toggleAddProjectFileToActive();
}
