// ═══════════════════════ WORKFLOW MATRIX RENDERING ═══════════════════════
// UI rendering functions for workflow matrix view

import { esc, escAttr, escJsonForAttr, fileIcon } from '../utils/strings.js';
import { parseDate, dueLabel, today } from '../utils/dates.js';
import { getMatrixStage, isTaskBlocked, getAllTasks } from '../domain/models.js';
import { findProjectById, filterTasksForProject } from '../utils/projectHelpers.js';

/**
 * Get matrix stage for subtask
 */
function getSubtaskMatrixStage(subtask) {
  if (subtask.done) return 'ready';
  if (subtask.lane && subtask.stage) {
    // Map subtask stage to matrix stage
    if (subtask.stage === 'doing' || subtask.stage.includes('Running') || subtask.stage.includes('Building') || subtask.stage.includes('Drafting')) {
      return 'doing';
    }
  }
  return 'planned';
}

/**
 * Render matrix task card
 */
export function renderMatrixTaskCard(ctx, task, isSubtaskTask = false, subtaskId = null, order = 0) {
  const { tasks, esc: escFn, escAttr: escAttrFn, escJsonForAttr: escJsonForAttrFn, fileIcon: fileIconFn, dueLabel: dueLabelFn, getTaskFiles: getTaskFilesFn, isTaskBlocked: isTaskBlockedFn, getAllTasks: getAllTasksFn, selectedProjectId } = ctx;
  
  // Helper functions with fallbacks
  const escFunction = escFn || esc;
  const escAttrFunction = escAttrFn || escAttr;
  const escJsonForAttrFunction = escJsonForAttrFn || escJsonForAttr;
  const fileIconFunction = fileIconFn || fileIcon;
  const dueLabelFunction = dueLabelFn || dueLabel;
  const getTaskFilesFunction = getTaskFilesFn || ((task) => []);
  const isTaskBlockedFunction = isTaskBlockedFn || isTaskBlocked;
  const getAllTasksFunction = getAllTasksFn || getAllTasks;
  const selectedProjectIdValue = selectedProjectId || (typeof window.selectedProjectId !== 'undefined' ? window.selectedProjectId : null);
  
  const blocked = isTaskBlockedFunction(task);
  const allTasksList = getAllTasksFunction(tasks || []);
  const depTask = task.dependsOn ? allTasksList.find(d => d.id === task.dependsOn) : null;
  const parentTask = task.parentTaskId ? (tasks || []).find(pt => pt.id === task.parentTaskId) : null;
  const isTaskSubtask = !!task.parentTaskId;
  
  let filesHTML = '';
  const taskFiles = getTaskFilesFunction(task);
  if (taskFiles?.length) {
    filesHTML = taskFiles.map(f => {
      const label = f.label || f.name || 'File';
      const fileLink = typeof f === 'string' ? { abs_path: f } : f;
      const safeLink = escJsonForAttrFunction(fileLink);
      const icon = fileIconFunction(fileLink.abs_path || fileLink.onedrive_rel || fileLink.share_url || '');
      return `<a href="#" class="file-chip" data-path="${escAttrFunction(JSON.stringify(fileLink))}" style="font-size:9px;color:var(--text-dim);">${icon}</a>`;
    }).join('');
  }
  
  const orderControls = isSubtaskTask ? `
    <div style="display:flex;gap:2px;margin-top:4px;">
      <button type="button" data-action="subtask:move-up" data-task-id="${task.id}" data-subtask-id="${subtaskId}" data-order="${order}" style="background:var(--bg2);border:1px solid var(--border);border-radius:3px;padding:2px 6px;font-size:8px;color:var(--text-dim);cursor:pointer;" title="Move up">↑</button>
      <button type="button" data-action="subtask:move-down" data-task-id="${task.id}" data-subtask-id="${subtaskId}" data-order="${order}" style="background:var(--bg2);border:1px solid var(--border);border-radius:3px;padding:2px 6px;font-size:8px;color:var(--text-dim);cursor:pointer;" title="Move down">↓</button>
    </div>
  ` : '';

  const projectId = task.projectId || selectedProjectIdValue || '';
  const isSubtask = task.isSubtask || false;
  
  return `<div class="matrix-task-card ${task.done ? 'done' : ''} ${blocked ? 'blocked' : ''} ${isTaskSubtask ? 'subtask-task' : ''}" 
    draggable="true" 
    data-task-id="${task.id}"
    data-subtask-id="${subtaskId || ''}"
    ondragstart="onMatrixDragStart(event, ${task.id})"
    ondragend="onMatrixDragEnd(event)">
    <div class="matrix-task-title" style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
      <div style="flex:1;min-width:0;">
        ${isTaskSubtask && parentTask ? `<span style="opacity:0.6;font-size:9px;color:var(--text-dim);">↳ ${escFunction(parentTask.title)} → </span>` : ''}
        ${escFunction(task.title)}
        ${isTaskSubtask ? `<span style="font-size:8px;color:var(--text-light);margin-left:4px;">(subtask)</span>` : ''}
      </div>
      <div style="display:flex;gap:4px;flex-shrink:0;">
        <button class="btn-del" data-action="edit-task" data-task-id="${task.id}" data-is-subtask="${isSubtask}" data-project-id="${projectId}" title="Edit" style="background:transparent;border:none;color:var(--text-dim);cursor:pointer;font-size:11px;padding:2px 4px;border-radius:3px;transition:all 0.15s;" onmouseover="this.style.background='var(--bg2)';this.style.color='var(--text)'" onmouseout="this.style.background='transparent';this.style.color='var(--text-dim)'">✎</button>
        <button class="btn-del btn-delete" data-action="delete" data-id="${String(task.id)}" data-task-id="${String(task.id)}" data-is-subtask="${isSubtask}" data-project-id="${projectId || ''}" title="Delete" style="background:transparent;border:none;color:var(--text-dim);cursor:pointer;font-size:16px;font-weight:bold;padding:2px 4px;border-radius:3px;transition:all 0.15s;opacity:1;" onmouseover="this.style.background='var(--bg2)';this.style.color='var(--overdue)'" onmouseout="this.style.background='transparent';this.style.color='var(--text-dim)'">×</button>
      </div>
    </div>
    <div class="matrix-task-meta">
      ${task.priority ? `<span class="priority-tag ${task.priority}">${task.priority}</span>` : ''}
      ${task.due ? (() => {
        const dl = dueLabelFunction(task.due, true, task.done);
        return dl ? `<span class="due-tag ${dl.cls}">${escFunction(dl.text)}</span>` : '';
      })() : ''}
      ${filesHTML}
      ${blocked ? `<span style="color:var(--overdue);font-size:9px;">🔒</span>` : ''}
    </div>
    ${orderControls}
  </div>`;
}

/**
 * Render subtask group with its tasks
 */
export function renderSubtaskGroup(ctx, subtask, subtaskTasks, laneId, stage) {
  const { renderMatrixTaskCard: renderMatrixTaskCardFn, selectedProjectId } = ctx;
  const renderMatrixTaskCardFunction = renderMatrixTaskCardFn || renderMatrixTaskCard;
  const selectedProjectIdValue = selectedProjectId || (typeof window.selectedProjectId !== 'undefined' ? window.selectedProjectId : null);
  
  const subtaskStage = getSubtaskMatrixStage(subtask);
  const isSubtaskInStage = subtaskStage === stage;
  const hasTasks = subtaskTasks.length > 0;
  
  if (!isSubtaskInStage && !hasTasks) return '';
  
  const escFunction = ctx.esc || esc;
  
  const subtaskHTML = isSubtaskInStage ? `
    <div class="matrix-subtask-header" style="background:var(--bg2);border:1px solid var(--border);border-radius:6px;padding:8px;margin-bottom:6px;font-size:11px;font-weight:500;color:var(--text);display:flex;align-items:center;gap:6px;">
      <span style="opacity:0.7;">📁</span>
      <span>${escFunction(subtask.title)}</span>
      <button type="button" data-action="subtask:add-task" data-project-id="${selectedProjectIdValue}" data-subtask-id="${subtask.id}" style="margin-left:auto;background:var(--rose-pale);border:1px solid var(--rose-soft);border-radius:4px;padding:2px 6px;font-size:9px;color:var(--rose);cursor:pointer;" title="Add task to subtask">+ Task</button>
    </div>
  ` : '';
  
  const tasksHTML = subtaskTasks.map((task, idx) => {
    const taskCard = renderMatrixTaskCardFunction(ctx, task, true, subtask.id, idx);
    return `<div style="margin-left:16px;margin-bottom:4px;">${taskCard}</div>`;
  }).join('');
  
  return subtaskHTML + tasksHTML;
}

/**
 * Render matrix sidebar
 */
export async function renderMatrixSidebar(ctx, project, projectTasks) {
  const { getMatrixStage: getMatrixStageFn, isTaskBlocked: isTaskBlockedFn, getAllTasks: getAllTasksFn, fileHistory, esc: escFn, escAttr: escAttrFn, escJsonForAttr: escJsonForAttrFn, fileIcon: fileIconFn } = ctx;
  
  // Helper functions with fallbacks
  const getMatrixStageFunction = getMatrixStageFn || getMatrixStage;
  const isTaskBlockedFunction = isTaskBlockedFn || isTaskBlocked;
  const getAllTasksFunction = getAllTasksFn || getAllTasks;
  const escFunction = escFn || esc;
  const escAttrFunction = escAttrFn || escAttr;
  const escJsonForAttrFunction = escJsonForAttrFn || escJsonForAttr;
  const fileIconFunction = fileIconFn || fileIcon;
  const fileHistoryData = fileHistory || (typeof window.fileHistory !== 'undefined' ? window.fileHistory : {});
  
  // Active files (files from tasks in "in_progress" stage + project-level files)
  const doingTasks = projectTasks.filter(t => {
    const stage = getMatrixStageFunction(t);
    return (stage === 'in_progress' || stage === 'doing') && !t.done;
  });
  const activeFiles = new Set();
  
  // Add files from tasks in "doing" stage
  doingTasks.forEach(t => {
    if (t.files) {
      t.files.forEach(f => {
        const fileLink = typeof f === 'string' ? { abs_path: f } : f;
        const key = fileLink.onedrive_rel || fileLink.abs_path || fileLink.share_url || JSON.stringify(fileLink);
        activeFiles.add(JSON.stringify({ key, file: fileLink, task: t.title, source: 'task' }));
      });
    }
  });
  
  // Add project-level files
  if (project.files) {
    project.files.forEach(f => {
      const fileLink = typeof f === 'string' ? { abs_path: f } : f;
      const key = fileLink.onedrive_rel || fileLink.abs_path || fileLink.share_url || JSON.stringify(fileLink);
      activeFiles.add(JSON.stringify({ key, file: fileLink, task: project.name, source: 'project' }));
    });
  }
  
  const activeFilesHTML = Array.from(activeFiles).slice(0, 15).map(item => {
    const { file, task, source } = JSON.parse(item);
    const label = file.label || file.name || 'File';
    const safeLink = escFunction(JSON.stringify(file).replace(/'/g, "\\'"));
    const icon = fileIconFunction(file.abs_path || file.onedrive_rel || file.share_url || '');
    const sourceLabel = source === 'project' ? 'Project file' : escFunction(task);
    return `<div class="matrix-sidebar-item file-open-div" data-path="${escAttrFunction(JSON.stringify(file))}">
      <div class="matrix-sidebar-item-title">${icon} ${escFunction(label)}</div>
      <div class="matrix-sidebar-item-meta">${sourceLabel}</div>
    </div>`;
  }).join('') || '<div style="font-size:11px;color:var(--text-light);">No active files</div>';

  const activeFilesEl = document.getElementById('matrix-active-files');
  if (activeFilesEl) activeFilesEl.innerHTML = activeFilesHTML;

  // Blocked tasks
  const blockedTasks = projectTasks.filter(t => isTaskBlockedFunction(t) && !t.done);
  const allTasksList = getAllTasksFunction(projectTasks);
  const blockedHTML = blockedTasks.slice(0, 10).map(t => {
    const depTask = t.dependsOn ? allTasksList.find(d => d.id === t.dependsOn) : null;
    return `<div class="matrix-sidebar-item">
      <div class="matrix-sidebar-item-title">${escFunction(t.title)}</div>
      <div class="matrix-sidebar-item-meta">Blocked by: ${depTask ? escFunction(depTask.title) : 'task'}</div>
    </div>`;
  }).join('') || '<div style="font-size:11px;color:var(--text-light);">No blocked tasks</div>';

  const blockedTasksEl = document.getElementById('matrix-blocked-tasks');
  if (blockedTasksEl) blockedTasksEl.innerHTML = blockedHTML;

  // Recently modified files
  const allFiles = [];
  projectTasks.forEach(t => {
    if (t.files) {
      t.files.forEach(f => {
        const fileLink = typeof f === 'string' ? { abs_path: f } : f;
        const key = fileLink.onedrive_rel || fileLink.abs_path || fileLink.share_url || JSON.stringify(fileLink);
        const lastOpened = fileHistoryData[key]?.lastOpened || 0;
        allFiles.push({ file: fileLink, lastOpened, task: t.title });
      });
    }
  });
  
  if (project.files) {
    project.files.forEach(f => {
      const fileLink = typeof f === 'string' ? { abs_path: f } : f;
      const key = fileLink.onedrive_rel || fileLink.abs_path || fileLink.share_url || JSON.stringify(fileLink);
      const lastOpened = fileHistoryData[key]?.lastOpened || 0;
      allFiles.push({ file: fileLink, lastOpened, task: project.name });
    });
  }

  const recentFiles = allFiles
    .sort((a, b) => b.lastOpened - a.lastOpened)
    .slice(0, 10)
    .map(({ file, task }) => {
      const label = file.label || file.name || 'File';
      const safeLink = escJsonForAttrFunction(file);
      const icon = fileIconFunction(file.abs_path || file.onedrive_rel || file.share_url || '');
      return `<div class="matrix-sidebar-item file-open-div" data-path="${escAttrFunction(JSON.stringify(file))}">
        <div class="matrix-sidebar-item-title">${icon} ${escFunction(label)}</div>
        <div class="matrix-sidebar-item-meta">${escFunction(task)}</div>
      </div>`;
    }).join('') || '<div style="font-size:11px;color:var(--text-light);">No recent files</div>';

  const recentFilesEl = document.getElementById('matrix-recent-files');
  if (recentFilesEl) recentFilesEl.innerHTML = recentFiles;
}

/**
 * Render workflow matrix (main function)
 */
export async function renderWorkflowMatrix(ctx) {
  // Handle case where ctx might be undefined or not an object
  if (!ctx || typeof ctx !== 'object') {
    console.warn('⚠️ renderWorkflowMatrix: Invalid context, using window state');
    const state = window.Petal?.store?.getState() || {};
    ctx = {
      projects: state.projects || [],
      tasks: state.tasks || [],
      selectedProjectId: window.selectedProjectId,
      ...(window.Petal?.handlers?.createPageContext?.() || {})
    };
  }
  
  // Get selectedProjectId BEFORE destructuring - access it directly first
  // The property exists in the object but might be undefined when destructured
  let selectedProjectIdValue = ctx.selectedProjectId;
  
  console.log('🔍 renderWorkflowMatrix: Checking selectedProjectId', {
    directAccess: ctx.selectedProjectId,
    hasProperty: 'selectedProjectId' in ctx,
    type: typeof ctx.selectedProjectId,
    value: ctx.selectedProjectId
  });
  
  // If it's undefined or null, try window
  if (!selectedProjectIdValue && selectedProjectIdValue !== 0 && typeof window.selectedProjectId !== 'undefined') {
    selectedProjectIdValue = window.selectedProjectId;
    console.log('📌 Got selectedProjectId from window:', selectedProjectIdValue);
  }
  
  // Also try to get it from the project selector dropdown
  if (!selectedProjectIdValue && selectedProjectIdValue !== 0) {
    const selector = document.getElementById('matrix-project-select');
    if (selector && selector.value) {
      selectedProjectIdValue = selector.value;
      console.log('📌 Got selectedProjectId from dropdown:', selectedProjectIdValue);
    }
  }
  
  // Now destructure the rest (excluding selectedProjectId since we already got it)
  const { projects, tasks, currentProjFilter, parseDate: parseDateFn, today: todayFn, getMatrixStage: getMatrixStageFn, esc: escFn, escAttr: escAttrFn, renderTodayTimeline, renderActiveProtocols, renderCellLog, renderCompWindow, renderDeadlinesHorizon, renderProjectTasks, renderMatrixSidebar: renderMatrixSidebarFn, selectProjectForMatrix } = ctx;
  
  // Helper functions with fallbacks
  const parseDateFunction = parseDateFn || parseDate;
  const todayFunction = todayFn || today;
  const getMatrixStageFunction = getMatrixStageFn || getMatrixStage;
  const renderMatrixSidebarFunction = renderMatrixSidebarFn || renderMatrixSidebar;
  const escFunction = escFn || esc;
  const escAttrFunction = escAttrFn || escAttr;
  
  const currentProjFilterValue = currentProjFilter || (typeof window.currentProjFilter !== 'undefined' ? window.currentProjFilter : 'all');
  
  // Check if we have a valid selectedProjectId (including 0 as valid)
  if (selectedProjectIdValue === undefined || selectedProjectIdValue === null || selectedProjectIdValue === '') {
    console.warn('⚠️ renderWorkflowMatrix: No selectedProjectId', {
      ctxType: typeof ctx,
      ctxKeys: ctx ? Object.keys(ctx) : 'no ctx',
      ctxHasSelectedProjectId: ctx ? 'selectedProjectId' in ctx : false,
      ctxSelectedProjectIdValue: ctx?.selectedProjectId,
      ctxSelectedProjectIdType: typeof ctx?.selectedProjectId,
      fromWindow: typeof window.selectedProjectId !== 'undefined' ? window.selectedProjectId : 'undefined',
      fromDropdown: document.getElementById('matrix-project-select')?.value || 'none',
      rawCtxSelectedProjectId: ctx.selectedProjectId
    });
    return;
  }
  
  console.log('✅ renderWorkflowMatrix: Using selectedProjectId:', selectedProjectIdValue, 'from context:', ctx?.selectedProjectId === selectedProjectIdValue);
  
  // Ensure forms are hidden by default
  const taskSection = document.getElementById('matrix-add-task-section');
  const fileSection = document.getElementById('matrix-add-file-section');
  if (taskSection) {
    taskSection.style.display = 'none';
    taskSection.style.setProperty('display', 'none', 'important');
  }
  if (fileSection) {
    fileSection.style.display = 'none';
    fileSection.style.setProperty('display', 'none', 'important');
  }
  const taskToggle = document.getElementById('matrix-add-task-toggle');
  const fileToggle = document.getElementById('matrix-add-file-toggle');
  if (taskToggle) taskToggle.textContent = '▶';
  if (fileToggle) fileToggle.textContent = '▶';
  
  const project = findProjectById(projects || [], selectedProjectIdValue);
  
  if (!project) {
    console.warn('⚠️ renderWorkflowMatrix: Project not found', {
      selectedProjectIdValue,
      selectedProjectIdValueType: typeof selectedProjectIdValue,
      projectsCount: (projects || []).length,
      projectIds: (projects || []).map(p => ({ id: p.id, idType: typeof p.id, name: p.name }))
    });
    if (selectProjectForMatrix) {
      selectProjectForMatrix(null);
    } else if (typeof window.selectProjectForMatrix === 'function') {
      window.selectProjectForMatrix(null);
    }
    return;
  }
  
  console.log('✅ renderWorkflowMatrix: Found project', { id: project.id, name: project.name });
  
  // Update file button hint for matrix view
  const fileHint = document.getElementById('file-hint-matrix');
  const fileBtn = document.getElementById('btn-add-file-matrix');
  if (fileHint && fileBtn) {
    const hasElectron = window.electronAPI && window.electronAPI.chooseFile;
    fileBtn.textContent = hasElectron ? '＋ Choose file' : '＋ Attach a file link';
    fileHint.style.display = hasElectron ? 'block' : 'none';
  }
  
  // Update file hint for active files section
  const activeFileHint = document.getElementById('file-hint-active');
  if (activeFileHint) {
    const hasElectron = window.electronAPI && window.electronAPI.chooseFile;
    activeFileHint.style.display = hasElectron ? 'block' : 'none';
  }
  
  // Update lane selector to show only allowed lanes for this project
  const laneSelect = document.getElementById('matrix-task-lane');
  if (laneSelect) {
    const allowedLanes = project.workflowLanes || ['lab', 'comp', 'writing'];
    const currentLane = laneSelect.value;
    
    laneSelect.innerHTML = '<option value="">No lane</option>';
    if (allowedLanes.includes('lab')) {
      laneSelect.innerHTML += '<option value="lab">🧪 Lab</option>';
    }
    if (allowedLanes.includes('comp')) {
      laneSelect.innerHTML += '<option value="comp">💻 Computational</option>';
    }
    if (allowedLanes.includes('writing')) {
      laneSelect.innerHTML += '<option value="writing">📝 Writing</option>';
    }
    
    // Restore selection if still valid
    if (currentLane && allowedLanes.includes(currentLane)) {
      laneSelect.value = currentLane;
    }
  }
  
  // Update project selector - handle type mismatches for ID comparison
  const selector = document.getElementById('matrix-project-select');
  if (selector) {
    const current = selector.value;
    selector.innerHTML = '<option value="">-- Select a project --</option>';
    (projects || []).filter(p => !p.done || currentProjFilterValue === 'all').forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = p.name || 'Untitled Project';
      // Normalize both IDs to strings for comparison
      const pIdStr = String(p.id).trim();
      const selectedIdStr = String(selectedProjectIdValue).trim();
      if (pIdStr === selectedIdStr) {
        opt.selected = true;
      }
      selector.appendChild(opt);
    });
    console.log('✅ Updated matrix-project-select with', (projects || []).filter(p => !p.done || currentProjFilterValue === 'all').length, 'projects');
  } else {
    console.warn('⚠️ matrix-project-select not found in renderWorkflowMatrix');
  }
  
  // Update all "Add Task" buttons in matrix view to include projectId
  // This ensures buttons work even if window.selectedProjectId isn't set
  const addTaskButtons = document.querySelectorAll('#workflow-matrix-view [data-action="task:add-matrix"]');
  addTaskButtons.forEach(btn => {
    if (selectedProjectIdValue) {
      btn.setAttribute('data-project-id', selectedProjectIdValue);
      console.log('✅ Updated Add Task button with projectId:', selectedProjectIdValue);
    }
  });
  
  const projectTasks = filterTasksForProject(tasks || [], project.id, { excludeDeleted: true });
  
  // Update project title - ensure elements exist and are visible
  // First ensure workflow-matrix-view is visible
  const matrixView = document.getElementById('workflow-matrix-view');
  if (matrixView) {
    matrixView.style.display = 'block';
  }
  
  // Wait a moment for DOM to be ready
  await new Promise(resolve => setTimeout(resolve, 50));
  
  // Find title element - try multiple ways
  let titleEl = document.getElementById('project-title-display');
  if (!titleEl && matrixView) {
    titleEl = matrixView.querySelector('#project-title-display');
  }
  if (!titleEl && matrixView) {
    titleEl = matrixView.querySelector('h2#project-title-display');
  }
  
  let descEl = document.getElementById('project-desc-display');
  if (!descEl && matrixView) {
    descEl = matrixView.querySelector('#project-desc-display');
  }
  if (!descEl && matrixView) {
    descEl = matrixView.querySelector('p#project-desc-display');
  }
  
  console.log('🔍 renderWorkflowMatrix: Title element check', {
    titleElExists: !!titleEl,
    descElExists: !!descEl,
    matrixViewExists: !!matrixView,
    projectName: project.name,
    projectId: project.id
  });
  
  if (!titleEl) {
    console.error('❌ project-title-display element not found anywhere');
    // Create it if it doesn't exist
    if (matrixView) {
      const mainContent = matrixView.querySelector('div[style*="flex:1"]');
      if (mainContent) {
        const titleContainer = document.createElement('div');
        titleContainer.style.marginTop = '24px';
        titleContainer.style.marginBottom = '16px';
        titleEl = document.createElement('h2');
        titleEl.id = 'project-title-display';
        titleEl.style.fontFamily = "'Cormorant Garamond',serif";
        titleEl.style.fontSize = '28px';
        titleEl.style.fontWeight = '400';
        titleEl.style.color = 'var(--text)';
        titleEl.style.margin = '0 0 4px 0';
        titleEl.style.display = 'block';
        titleEl.style.visibility = 'visible';
        titleContainer.appendChild(titleEl);
        if (project.desc) {
          descEl = document.createElement('p');
          descEl.id = 'project-desc-display';
          descEl.style.fontSize = '13px';
          descEl.style.color = 'var(--text-dim)';
          descEl.style.margin = '0';
          descEl.style.display = 'block';
          titleContainer.appendChild(descEl);
        }
        // Insert after the back button container
        const backButtonContainer = matrixView.querySelector('div[style*="margin-bottom:16px"]');
        if (backButtonContainer && backButtonContainer.nextElementSibling) {
          const flexContainer = backButtonContainer.nextElementSibling;
          const firstChild = flexContainer.querySelector('div[style*="flex:1"]');
          if (firstChild) {
            firstChild.insertBefore(titleContainer, firstChild.firstChild);
          }
        }
        console.log('✅ Created title element');
      }
    }
  }
  
  if (titleEl) {
    // Set the title text - use innerHTML to ensure it's set
    const projectName = project.name || 'Untitled Project';
    titleEl.textContent = projectName;
    titleEl.innerHTML = projectName;
    
    // Force visibility with !important via setProperty
    titleEl.style.setProperty('display', 'block', 'important');
    titleEl.style.setProperty('visibility', 'visible', 'important');
    titleEl.style.setProperty('opacity', '1', 'important');
    titleEl.style.setProperty('color', 'var(--text)', 'important');
    titleEl.style.setProperty('font-size', '28px', 'important');
    titleEl.style.setProperty('font-weight', '400', 'important');
    titleEl.style.setProperty('margin', '0 0 4px 0', 'important');
    titleEl.style.setProperty('font-family', "'Cormorant Garamond',serif", 'important');
    
    console.log('✅ Updated project title:', {
      name: project.name,
      textContent: titleEl.textContent,
      innerHTML: titleEl.innerHTML,
      display: window.getComputedStyle(titleEl).display,
      visibility: window.getComputedStyle(titleEl).visibility,
      opacity: window.getComputedStyle(titleEl).opacity,
      color: window.getComputedStyle(titleEl).color
    });
    
    // Ensure the parent container is visible
    const titleContainer = titleEl.parentElement;
    if (titleContainer) {
      titleContainer.style.setProperty('display', 'block', 'important');
      titleContainer.style.setProperty('visibility', 'visible', 'important');
      titleContainer.style.setProperty('opacity', '1', 'important');
      titleContainer.style.setProperty('margin-top', '24px', 'important');
      titleContainer.style.setProperty('margin-bottom', '16px', 'important');
      console.log('✅ Title container styled:', {
        display: window.getComputedStyle(titleContainer).display,
        visibility: window.getComputedStyle(titleContainer).visibility
      });
    }
  } else {
    console.error('❌ Title element still not found after all attempts');
  }
  
  if (descEl) {
    descEl.textContent = project.desc || '';
    descEl.innerHTML = project.desc || '';
    if (project.desc) {
      descEl.style.display = 'block';
      descEl.style.visibility = 'visible';
      descEl.style.opacity = '1';
    } else {
      descEl.style.display = 'none';
    }
  }
  
  // Render linked cell lines section
  let cellLinesEl = document.getElementById('project-cell-lines-display');
  if (!cellLinesEl && matrixView) {
    // Create cell lines container if it doesn't exist
    const titleContainer = titleEl?.parentElement;
    if (titleContainer) {
      cellLinesEl = document.createElement('div');
      cellLinesEl.id = 'project-cell-lines-display';
      cellLinesEl.style.marginTop = '12px';
      cellLinesEl.style.marginBottom = '16px';
      titleContainer.appendChild(cellLinesEl);
    }
  }
  
  if (cellLinesEl) {
    const linkedCellLines = Array.isArray(project.linkedCellLines) ? project.linkedCellLines : [];
    const projectId = project.id;
    
    let cellLinesHTML = '';
    if (linkedCellLines.length > 0) {
      cellLinesHTML = `
        <div class="project-linked-cell-lines" style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;">
          <span style="font-size:11px;color:var(--text-dim);font-weight:500;">Cell Lines:</span>
          ${linkedCellLines.map(cellLine => `
            <span class="cell-line-chip" style="display:inline-flex;align-items:center;gap:4px;padding:4px 8px;background:var(--bg2);border:1px solid var(--border);border-radius:12px;font-size:11px;color:var(--text);">
              ${escFunction(cellLine)}
              <button type="button" 
                      data-action="unlink-cell-line" 
                      data-project-id="${projectId}" 
                      data-cell-line="${escAttrFunction(cellLine)}"
                      style="background:transparent;border:none;color:var(--text-dim);cursor:pointer;padding:0;margin:0;font-size:14px;line-height:1;width:16px;height:16px;display:flex;align-items:center;justify-content:center;border-radius:50%;transition:all 0.15s;"
                      onmouseover="this.style.background='var(--bg3)';this.style.color='var(--overdue)'"
                      onmouseout="this.style.background='transparent';this.style.color='var(--text-dim)'"
                      title="Remove cell line">×</button>
            </span>
          `).join('')}
          <button type="button" 
                  data-action="link-cell-line" 
                  data-project-id="${projectId}"
                  style="padding:4px 8px;background:var(--bg2);border:1px solid var(--border);border-radius:12px;font-size:11px;color:var(--text);cursor:pointer;display:inline-flex;align-items:center;gap:4px;transition:all 0.15s;"
                  onmouseover="this.style.background='var(--bg3)';this.style.borderColor='var(--rose)'"
                  onmouseout="this.style.background='var(--bg2)';this.style.borderColor='var(--border)'"
                  title="Link cell line">+ Add</button>
        </div>
      `;
    } else {
      cellLinesHTML = `
        <div class="project-linked-cell-lines" style="display:flex;align-items:center;gap:8px;">
          <span style="font-size:11px;color:var(--text-dim);">No cell lines linked</span>
          <button type="button" 
                  data-action="link-cell-line" 
                  data-project-id="${projectId}"
                  style="padding:4px 8px;background:var(--bg2);border:1px solid var(--border);border-radius:12px;font-size:11px;color:var(--text);cursor:pointer;display:inline-flex;align-items:center;gap:4px;transition:all 0.15s;"
                  onmouseover="this.style.background='var(--bg3)';this.style.borderColor='var(--rose)'"
                  onmouseout="this.style.background='var(--bg2)';this.style.borderColor='var(--border)'"
                  title="Link cell line">+ Link Cell Line</button>
        </div>
      `;
    }
    
    cellLinesEl.innerHTML = cellLinesHTML;
    cellLinesEl.style.display = 'block';
    cellLinesEl.style.visibility = 'visible';
  }
  
  // Render research orchestration dashboard (fall back to Petal.ui when ctx omits render fns)
  const ui = window.Petal?.ui || {};
  const renderTodayTimelineFn = renderTodayTimeline || ui.renderTodayTimeline;
  const renderActiveProtocolsFn = renderActiveProtocols || ui.renderActiveProtocols;
  const renderCellLogFn = renderCellLog || ui.renderCellLog;
  const renderCompWindowFn = renderCompWindow || ui.renderCompWindow;
  const renderDeadlinesHorizonFn = renderDeadlinesHorizon || ui.renderDeadlinesHorizon;
  const renderProjectTasksFn = renderProjectTasks || ui.renderProjectTasks;

  if (renderTodayTimelineFn) renderTodayTimelineFn(ctx, project, projectTasks);
  if (renderActiveProtocolsFn) renderActiveProtocolsFn(ctx, project, projectTasks);
  if (renderCellLogFn) renderCellLogFn(ctx, project);
  if (renderCompWindowFn) renderCompWindowFn(ctx, project, projectTasks);
  if (renderDeadlinesHorizonFn) renderDeadlinesHorizonFn(ctx, project, projectTasks);
  if (renderProjectTasksFn) renderProjectTasksFn(ctx, project, projectTasks);
  
  // Render sidebar
  await renderMatrixSidebarFunction(ctx, project, projectTasks);
}

/**
 * Render Mind Map visualization
 */
export function renderMindMap(ctx, project, projectTasks, standaloneTasks, tasksBySubtask, lanes) {
  const { tasks, esc: escFn, dueLabel: dueLabelFn, editTask: editTaskFn } = ctx;
  
  // Helper functions with fallbacks
  const escFunction = escFn || esc;
  const dueLabelFunction = dueLabelFn || dueLabel;
  const editTaskFunction = editTaskFn || ((id) => {
    if (typeof window.editTask === 'function') {
      window.editTask(id);
    }
  });
  
  const svg = document.getElementById('mind-map-svg');
  const nodesContainer = document.getElementById('mind-map-nodes');
  if (!svg || !nodesContainer) return;
  
  // Clear previous content
  svg.innerHTML = '';
  nodesContainer.innerHTML = '';
  
  // Filter out deleted tasks
  const activeTasks = projectTasks.filter(t => !t.deletedAt);
  if (activeTasks.length === 0) {
    nodesContainer.innerHTML = '<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center;color:var(--text-dim);font-size:14px;">No tasks yet. Add tasks to see them in the mind map.</div>';
    return;
  }
  
  // Get container dimensions
  const container = document.getElementById('mind-map-container');
  const width = container.offsetWidth || 800;
  const height = container.offsetHeight || 600;
  const centerX = width / 2;
  const centerY = height / 2;
  
  // Set SVG viewBox
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.setAttribute('width', width);
  svg.setAttribute('height', height);
  
  // Lane colors
  const laneColors = {
    lab: '#d4a0a0',
    comp: '#a0a0d4',
    writing: '#a0d4a0',
    presentation: '#d4d4a0'
  };
  
  // Calculate positions for tasks in radial layout
  const nodePositions = {};
  
  // Position project in center
  nodePositions['project'] = { x: centerX, y: centerY, type: 'project' };
  
  // Group tasks by lane for better organization
  const tasksByLaneGroup = {};
  lanes.forEach(lane => {
    tasksByLaneGroup[lane.id] = activeTasks.filter(t => t.lane === lane.id);
  });
  const unassigned = activeTasks.filter(t => !t.lane || !lanes.find(l => l.id === t.lane));
  if (unassigned.length > 0) {
    tasksByLaneGroup['unassigned'] = unassigned;
  }
  
  // Position tasks in sectors by lane
  const laneCount = Object.keys(tasksByLaneGroup).length;
  const sectorAngle = laneCount > 0 ? (2 * Math.PI) / laneCount : 0;
  let currentSectorAngle = -Math.PI / 2; // Start at top
  
  Object.keys(tasksByLaneGroup).forEach((laneId, laneIdx) => {
    const laneTasks = tasksByLaneGroup[laneId];
    if (laneTasks.length === 0) return;
    
    const tasksInLane = laneTasks.length;
    const angleStep = tasksInLane > 1 ? sectorAngle / tasksInLane : 0;
    const baseRadius = Math.min(width, height) * 0.25;
    
    laneTasks.forEach((task, taskIdx) => {
      // Position in a spiral pattern within the sector
      const angle = currentSectorAngle + (taskIdx * angleStep);
      const radius = baseRadius + (task.parentTaskId ? 100 : 0) + (taskIdx * 15);
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      
      nodePositions[task.id] = { 
        x, 
        y, 
        task, 
        angle,
        radius,
        type: task.parentTaskId ? 'subtask' : 'task',
        lane: task.lane || 'unassigned'
      };
    });
    
    currentSectorAngle += sectorAngle;
  });
  
  // Draw connections (dependencies and parent-child)
  activeTasks.forEach(task => {
    // Draw connection to parent task
    if (task.parentTaskId) {
      const parentPos = nodePositions[task.parentTaskId];
      const taskPos = nodePositions[task.id];
      if (parentPos && taskPos) {
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', parentPos.x);
        line.setAttribute('y1', parentPos.y);
        line.setAttribute('x2', taskPos.x);
        line.setAttribute('y2', taskPos.y);
        line.setAttribute('stroke', '#d4a0a0');
        line.setAttribute('stroke-width', '2');
        line.setAttribute('stroke-dasharray', '4,4');
        line.setAttribute('opacity', '0.4');
        svg.appendChild(line);
      }
    }
    
    // Draw connection for dependencies
    if (task.dependsOn) {
      const depPos = nodePositions[task.dependsOn];
      const taskPos = nodePositions[task.id];
      if (depPos && taskPos) {
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', depPos.x);
        line.setAttribute('y1', depPos.y);
        line.setAttribute('x2', taskPos.x);
        line.setAttribute('y2', taskPos.y);
        line.setAttribute('stroke', '#c47a7a');
        line.setAttribute('stroke-width', '2');
        line.setAttribute('opacity', '0.5');
        svg.appendChild(line);
        
        // Add arrow marker
        const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
        marker.setAttribute('id', `arrow-${task.id}`);
        marker.setAttribute('markerWidth', '10');
        marker.setAttribute('markerHeight', '10');
        marker.setAttribute('refX', '9');
        marker.setAttribute('refY', '3');
        marker.setAttribute('orient', 'auto');
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', 'M0,0 L0,6 L9,3 z');
        path.setAttribute('fill', '#c47a7a');
        marker.appendChild(path);
        svg.appendChild(marker);
        line.setAttribute('marker-end', `url(#arrow-${task.id})`);
      }
    }
  });
      
  // Draw connection from project to each top-level task
  activeTasks.filter(t => !t.parentTaskId).forEach(task => {
    const taskPos = nodePositions[task.id];
    if (taskPos) {
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', centerX);
      line.setAttribute('y1', centerY);
      line.setAttribute('x2', taskPos.x);
      line.setAttribute('y2', taskPos.y);
      const laneColor = laneColors[task.lane] || '#c98b8b';
      line.setAttribute('stroke', laneColor);
      line.setAttribute('stroke-width', '2');
      line.setAttribute('opacity', '0.3');
      svg.appendChild(line);
    }
  });
  
  // Render project node (center)
  const projectNode = document.createElement('div');
  projectNode.className = 'mind-map-node mind-map-project';
  projectNode.style.cssText = `
    position:absolute;
    left:${centerX - 60}px;
    top:${centerY - 30}px;
    width:120px;
    padding:16px;
    background:linear-gradient(135deg,#d4a0a0,#c98b8b);
    color:white;
    border-radius:12px;
    text-align:center;
    font-weight:600;
    font-size:14px;
    box-shadow:0 4px 12px rgba(201,139,139,.3);
    pointer-events:all;
    cursor:pointer;
    z-index:10;
  `;
  projectNode.textContent = escFunction(project.name);
  nodesContainer.appendChild(projectNode);
  
  // Render task nodes
  activeTasks.forEach(task => {
    const pos = nodePositions[task.id];
    if (!pos) return;
    
    const laneColor = laneColors[task.lane] || '#c98b8b';
    const isDone = task.done;
    const isBlocked = task.dependsOn && (tasks || []).find(t => t.id === task.dependsOn && t.done);
    
    const taskNode = document.createElement('div');
    taskNode.className = 'mind-map-node mind-map-task';
    taskNode.style.cssText = `
      position:absolute;
      left:${pos.x - 80}px;
      top:${pos.y - 40}px;
      width:160px;
      padding:10px 12px;
      background:${isDone ? 'var(--bg2)' : 'var(--surface)'};
      border:2px solid ${laneColor};
      border-radius:8px;
      font-size:12px;
      color:var(--text);
      box-shadow:0 2px 8px rgba(0,0,0,.1);
      pointer-events:all;
      cursor:pointer;
      z-index:10;
      opacity:${isDone ? '0.6' : '1'};
      ${isBlocked ? 'border-color:var(--overdue);' : ''}
    `;
    
    const title = document.createElement('div');
    title.style.cssText = 'font-weight:500;margin-bottom:4px;line-height:1.3;';
    title.textContent = escFunction(task.title);
    if (isDone) title.style.textDecoration = 'line-through';
    taskNode.appendChild(title);
    
    const meta = document.createElement('div');
    meta.style.cssText = 'display:flex;gap:4px;align-items:center;flex-wrap:wrap;font-size:10px;color:var(--text-dim);';
    
    if (task.priority) {
      const priority = document.createElement('span');
      priority.className = `priority-tag ${task.priority}`;
      priority.textContent = task.priority;
      meta.appendChild(priority);
    }
    
    if (task.due) {
      const dl = dueLabelFunction(task.due, true, task.done);
      if (dl) {
        const due = document.createElement('span');
        due.className = `due-tag ${dl.cls}`;
        due.textContent = dl.text;
        meta.appendChild(due);
      }
    }
    
    if (isBlocked) {
      const blocked = document.createElement('span');
      blocked.textContent = '🔒';
      blocked.title = 'Blocked';
      meta.appendChild(blocked);
    }
    
    taskNode.appendChild(meta);
    
    // Add click handlers
    taskNode.onclick = (e) => {
      e.stopPropagation();
      editTaskFunction(task.id);
    };
    
    nodesContainer.appendChild(taskNode);
  });
}
