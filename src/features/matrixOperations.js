// ═══════════════════════ MATRIX OPERATIONS ═══════════════════════
// Operations for workflow matrix view (drag-drop, task management, etc.)

import { LANE_STAGES } from '../domain/schema.js';

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
  
  const renderWorkflowMatrixFunction = renderWorkflowMatrixFn || ((ctx) => {
    if (typeof window.renderWorkflowMatrix === 'function') {
      window.renderWorkflowMatrix();
    }
  });
  
  const task = (tasks || []).find(t => t.id === draggedMatrixTaskId);
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
      task.done = true;
    } else {
      task.stage = 'planned';
      task.status = 'Todo';
      task.done = false;
    }
    
    // If moving a subtask task to a different lane, update subtask's lane too
    if (wasSubtaskTask && task.subtaskId) {
      const project = (projects || []).find(p => p.id === task.projectId);
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
 * Select project for matrix view
 */
export async function selectProjectForMatrix(ctx, projectId) {
  const { selectedProjectId: selectedProjectIdValue, renderWorkflowMatrix: renderWorkflowMatrixFn } = ctx;
  
  // Update global selectedProjectId
  if (typeof window.selectedProjectId !== 'undefined') {
    window.selectedProjectId = projectId ? parseInt(projectId) : null;
  }
  
  const createFormSection = document.getElementById('project-selector-create-section');
  const projectIdNum = projectId ? parseInt(projectId) : null;
  
  if (projectIdNum) {
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
      selectedProjectId: projectIdNum  // Set explicitly AFTER spreading (so it can't be overwritten)
    };
    
    // Verify it's set correctly
    const verifySelectedId = contextWithProjectId.selectedProjectId;
    console.log('🔍 selectProjectForMatrix: Context built', {
      hasRenderFn: !!renderWorkflowMatrixFn,
      hasWindowFn: typeof window.renderWorkflowMatrix === 'function',
      selectedProjectId: verifySelectedId,
      selectedProjectIdType: typeof verifySelectedId,
      projectIdNum,
      projectIdNumType: typeof projectIdNum,
      contextKeys: Object.keys(contextWithProjectId),
      contextHasSelectedProjectId: 'selectedProjectId' in contextWithProjectId,
      ctxHadSelectedProjectId: ctx ? 'selectedProjectId' in ctx : false,
      ctxSelectedProjectIdValue: ctxSelectedId
    });
    
    // Double-check: if it's still undefined, force it
    if (contextWithProjectId.selectedProjectId === undefined || contextWithProjectId.selectedProjectId === null) {
      console.warn('⚠️ selectedProjectId is undefined after setting, forcing it');
      contextWithProjectId.selectedProjectId = projectIdNum;
    }
    
    if (renderWorkflowMatrixFn) {
      await renderWorkflowMatrixFn(contextWithProjectId);
    } else if (window.Petal?.ui?.renderWorkflowMatrix) {
      // Call the module function directly (not the HTML wrapper)
      // The HTML wrapper calls createPageContext() which has selectedProjectId: undefined
      await window.Petal.ui.renderWorkflowMatrix(contextWithProjectId);
    } else if (typeof window.renderWorkflowMatrix === 'function') {
      // Fallback: Ensure window.selectedProjectId is set before calling HTML wrapper
      // The HTML wrapper will call createPageContext() which reads from window.selectedProjectId
      window.selectedProjectId = projectIdNum;
      console.log('🔍 Setting window.selectedProjectId to:', projectIdNum, 'before calling HTML renderWorkflowMatrix');
      // Also try calling with context if the function accepts it
      if (window.renderWorkflowMatrix.length > 0) {
        await window.renderWorkflowMatrix(contextWithProjectId);
      } else {
        await window.renderWorkflowMatrix();
      }
    }
  } else {
    const matrixView = document.getElementById('workflow-matrix-view');
    const listView = document.getElementById('project-list-view');
    if (matrixView) {
      matrixView.style.display = 'none';
    }
    if (listView) {
      listView.style.display = 'block';
    }
    // Show project creation form when back to project list
    if (createFormSection) createFormSection.style.display = '';
    // Re-render projects view
    if (window.rerenderViewIfActive) {
      window.rerenderViewIfActive('projects');
    }
  }
}

/**
 * Open project view (switches to projects view and opens the project)
 */
export function openProjectView(ctx, projectId) {
  if (!projectId) return;
  
  // Switch to projects view
  if (window.routerSwitchView) {
    window.routerSwitchView('projects');
  } else if (window.switchView) {
    window.switchView('projects');
  }
  
  // Set the selected project and open the matrix view
  const projectIdNum = projectId ? parseInt(projectId) : null;
  if (typeof window.selectedProjectId !== 'undefined') {
    window.selectedProjectId = projectIdNum;
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
    selectedProjectId: projectIdNum
  };
  
  if (window.Petal?.features?.matrixOperations?.selectProjectForMatrix) {
    window.Petal.features.matrixOperations.selectProjectForMatrix(updatedCtx, projectId);
  } else if (window.selectProjectForMatrix) {
    window.selectProjectForMatrix(projectId);
  } else if (typeof window.renderWorkflowMatrix === 'function') {
    // Fallback: call renderWorkflowMatrix with context if available
    if (window.renderWorkflowMatrix.length > 0) {
      window.renderWorkflowMatrix(updatedCtx);
    } else {
      window.renderWorkflowMatrix();
    }
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
      const project = (projects || []).find(p => p.id === selectedProjectId);
      if (project) {
        // Normalize projectId comparison to handle both string and number types
        const normalizedProjectId = String(selectedProjectId).trim();
        const projectTasks = (tasks || []).filter(t => {
          if (!t.projectId) return false;
          const taskProjectId = String(t.projectId).trim();
          return taskProjectId === normalizedProjectId;
        });
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
    } else if (typeof window.renderMindMap === 'function') {
      window.renderMindMap();
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
  
  const renderWorkflowMatrixFunction = renderWorkflowMatrixFn || ((ctx) => {
    if (typeof window.renderWorkflowMatrix === 'function') {
      window.renderWorkflowMatrix();
    }
  });
  
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
  
  if (tasks) tasks.unshift(newTask);
  if (save) await save();
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
  
  const renderWorkflowMatrixFunction = renderWorkflowMatrixFn || ((ctx) => {
    if (typeof window.renderWorkflowMatrix === 'function') {
      window.renderWorkflowMatrix();
    }
  });
  
  const selectedProjectId = typeof window.selectedProjectId !== 'undefined' ? window.selectedProjectId : null;
  if (!selectedProjectId || selectedProjectId !== projectId) return;
  
  const normalizedProjId = normalizeProjectIdValueFunction(projectId);
  const title = prompt('Enter task title:');
  if (!title) return;
  
  const project = (projects || []).find(p => p.id === normalizedProjId);
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
  
  if (tasks) tasks.unshift(newTask);
  if (save) await save();
  await renderWorkflowMatrixFunction(ctx);
}

/**
 * Move task up/down within subtask
 */
export async function moveTaskInSubtask(ctx, taskId, subtaskId, currentOrder, direction) {
  const { tasks, save, renderWorkflowMatrix: renderWorkflowMatrixFn } = ctx;
  
  const renderWorkflowMatrixFunction = renderWorkflowMatrixFn || ((ctx) => {
    if (typeof window.renderWorkflowMatrix === 'function') {
      window.renderWorkflowMatrix();
    }
  });
  
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
  
  // Swap orders
  const otherTask = subtaskTasks[newIndex];
  const tempOrder = task.subtaskOrder || currentIndex;
  task.subtaskOrder = otherTask.subtaskOrder || newIndex;
  otherTask.subtaskOrder = tempOrder;
  
  if (save) await save();
  await renderWorkflowMatrixFunction(ctx);
}

/**
 * Add file to matrix project
 */
export async function addFileToMatrixProject(ctx) {
  const { projects, getFileLinks, getFileLinksNormalized, save, renderWorkflowMatrix: renderWorkflowMatrixFn, toggleMatrixAddFile } = ctx;
  
  const renderWorkflowMatrixFunction = renderWorkflowMatrixFn || ((ctx) => {
    if (typeof window.renderWorkflowMatrix === 'function') {
      window.renderWorkflowMatrix();
    }
  });
  
  const selectedProjectId = typeof window.selectedProjectId !== 'undefined' ? window.selectedProjectId : null;
  if (!selectedProjectId) return;
  
  const project = (projects || []).find(p => p.id === selectedProjectId);
  if (!project) return;
  
  const files = window.electronAPI 
    ? (getFileLinksNormalized ? await getFileLinksNormalized('matrix-project-files-container', 'p-matrix') : [])
    : (getFileLinks ? getFileLinks('matrix-project-files-container', 'p-matrix') : []);
  
  if (files.length === 0) {
    alert('Please add at least one file');
    return;
  }
  
  // Add files to project
  const existingFiles = project.files || [];
  project.files = [...existingFiles, ...files];
  
  if (save) await save();
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
  
  const renderWorkflowMatrixFunction = renderWorkflowMatrixFn || ((ctx) => {
    if (typeof window.renderWorkflowMatrix === 'function') {
      window.renderWorkflowMatrix();
    }
  });
  
  const selectedProjectId = typeof window.selectedProjectId !== 'undefined' ? window.selectedProjectId : null;
  if (!selectedProjectId) return;
  
  const project = (projects || []).find(p => p.id === selectedProjectId);
  if (!project) return;
  
  const files = window.electronAPI 
    ? (getFileLinksNormalized ? await getFileLinksNormalized('active-project-files-container', 'p-active') : [])
    : (getFileLinks ? getFileLinks('active-project-files-container', 'p-active') : []);
  
  if (files.length === 0) {
    alert('Please add at least one file');
    return;
  }
  
  // Add files to project
  const existingFiles = project.files || [];
  project.files = [...existingFiles, ...files];
  
  if (save) await save();
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
