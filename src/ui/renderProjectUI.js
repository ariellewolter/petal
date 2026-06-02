// ═══════════════════════ PROJECT UI RENDERING ═══════════════════════
// UI rendering functions for project-related views

import { esc, escAttr, escJsonForDataAttr, escJsonForAttr, fileIcon } from '../utils/strings.js';
import { parseDate, dueLabel, today } from '../utils/dates.js';
import { getMatrixStage, isTaskBlocked } from '../domain/models.js';
import { LANE_STAGES } from '../domain/schema.js';
import { getWorkflowLanesDisplay, filterTasksForProject, findProjectById, isProjectOpen } from '../utils/projectHelpers.js';
import { getTaskSubtasks } from '../features/taskOperations.js';
import { getTaskFiles } from '../features/fileManagement.js';

/**
 * Render Next Up strip (Next Up / Blocked / Stale cards)
 */
export function renderNextUpStrip(ctx, project, projectTasks) {
  const { tasks, esc: escFn, parseDate: parseDateFn, dueLabel: dueLabelFn, isTaskBlocked: isTaskBlockedFn, getMatrixStage: getMatrixStageFn } = ctx;
  
  const stripEl = document.getElementById('next-up-strip');
  if (!stripEl) return;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  const escFunction = escFn || esc;
  const parseDateFunction = parseDateFn || parseDate;
  const dueLabelFunction = dueLabelFn || dueLabel;
  const isTaskBlockedFunction = isTaskBlockedFn || isTaskBlocked;
  const getMatrixStageFunction = getMatrixStageFn || getMatrixStage;
  
  // Next Up: unblocked, high priority, due soon
  const nextUp = projectTasks
    .filter(t => {
      if (t.done) return false;
      if (isTaskBlockedFunction(t, tasks || [])) return false;
      return t.priority === 'high';
    })
    .sort((a, b) => {
      const aDue = parseDateFunction(a.due) || new Date(999999999999);
      const bDue = parseDateFunction(b.due) || new Date(999999999999);
      return aDue - bDue;
    })
    .slice(0, 3);
  
  // Blocked tasks
  const blocked = projectTasks
    .filter(t => {
      if (t.done) return false;
      return isTaskBlockedFunction(t, tasks || []);
    })
    .slice(0, 3);
  
  // Stale: in progress > 7 days
  const stale = projectTasks
    .filter(t => {
      if (t.done) return false;
      if (t.status !== 'Doing' && t.stage !== 'doing' && t.stage !== 'in_progress') return false;
      const updated = t.updatedAt ? parseDateFunction(t.updatedAt) : null;
      if (!updated) return false;
      return updated < sevenDaysAgo;
    })
    .slice(0, 3);
  
  let html = '';
  
  if (nextUp.length > 0) {
    html += '<div class="next-up-card"><div class="next-up-header">Next Up</div>';
    nextUp.forEach(t => {
      const stage = getMatrixStageFunction(t);
      html += `<button type="button" class="next-up-item" data-action="task:open-drawer" data-task-id="${t.id}" style="width:100%;text-align:left;background:none;border:none;padding:8px;cursor:pointer;">
        <div class="next-up-title">${escFunction(t.title || 'Untitled')}</div>
        <div class="next-up-stage ${stage}">${escFunction(stage)}</div>
      </button>`;
    });
    html += '</div>';
  }
  
  if (blocked.length > 0) {
    html += '<div class="next-up-card blocked"><div class="next-up-header">Blocked</div>';
    blocked.forEach(t => {
      html += `<button type="button" class="next-up-item" data-action="task:open-drawer" data-task-id="${t.id}" style="width:100%;text-align:left;background:none;border:none;padding:8px;cursor:pointer;">
        <div class="next-up-title">${escFunction(t.title || 'Untitled')}</div>
      </button>`;
    });
    html += '</div>';
  }
  
  if (stale.length > 0) {
    html += '<div class="next-up-card stale"><div class="next-up-header">Stale</div>';
    stale.forEach(t => {
      html += `<button type="button" class="next-up-item" data-action="task:open-drawer" data-task-id="${t.id}" style="width:100%;text-align:left;background:none;border:none;padding:8px;cursor:pointer;">
        <div class="next-up-title">${escFunction(t.title || 'Untitled')}</div>
      </button>`;
    });
    html += '</div>';
  }
  
  stripEl.innerHTML = html || '<div style="text-align:center;padding:20px;color:var(--text-dim);font-size:12px;">No items</div>';
}

/**
 * Switch files tab
 */
export function switchFilesTab(ctx, tab) {
  const tabs = ['all', 'current', 'versions', 'conflicts'];
  tabs.forEach(t => {
    const tabEl = document.getElementById(`files-tab-${t}`);
    const panelEl = document.getElementById(`files-panel-${t}`);
    if (tabEl && panelEl) {
      if (t === tab) {
        tabEl.classList.add('active');
        panelEl.style.display = 'block';
      } else {
        tabEl.classList.remove('active');
        panelEl.style.display = 'none';
      }
    }
  });
}

/**
 * Render files tab content
 */
function getProjectFilesPanelEl(tab) {
  return (
    document.getElementById(`project-files-panel-${tab}`) ||
    document.getElementById(`files-panel-${tab}`)
  );
}

export async function renderFilesTab(ctx, tab, project) {
  const { tasks, fileHistory, esc: escFn, escAttr: escAttrFn, escJsonForDataAttr: escJsonForDataAttrFn, fileIcon: fileIconFn, getMatrixStage: getMatrixStageFn, getTaskFiles } = ctx;
  
  const panelEl = getProjectFilesPanelEl(tab);
  if (!panelEl) return;
  
  const escFunction = escFn || esc;
  const escAttrFunction = escAttrFn || escAttr;
  const escJsonForDataAttrFunction = escJsonForDataAttrFn || escJsonForDataAttr;
  const fileIconFunction = fileIconFn || fileIcon;
  const getMatrixStageFunction = getMatrixStageFn || getMatrixStage;
  
  let html = '';
  
  if (tab === 'all') {
    const allFiles = project.files || [];
    if (allFiles.length > 0) {
      html += '<div style="display:flex;flex-direction:column;gap:8px;">';
      allFiles.forEach((f, idx) => {
    const fileLink = typeof f === 'string' ? { abs_path: f } : f;
        const label = f.label || f.name || 'File';
    const fileDataAttr = escJsonForDataAttrFunction(fileLink);
    const icon = fileIconFunction(fileLink.abs_path || fileLink.onedrive_rel || fileLink.share_url || '');
        html += `<div class="file-item" data-file="${escAttrFunction(fileDataAttr)}">
          <div style="display:flex;align-items:center;gap:8px;">
            <span style="font-size:16px;">${icon}</span>
            <span style="flex:1;font-size:13px;color:var(--text);">${escFunction(label)}</span>
            <button type="button" class="file-open-btn" data-action="file:open" data-path="${escAttrFunction(JSON.stringify(fileLink))}" style="padding:4px 8px;background:var(--rose);color:white;border:none;border-radius:4px;font-size:11px;cursor:pointer;">Open</button>
          </div>
        </div>`;
      });
      html += '</div>';
    } else {
      html += '<div style="text-align:center;padding:20px;color:var(--text-dim);font-size:12px;">No files</div>';
    }
  } else if (tab === 'current') {
    const currentFiles = (project.files || []).filter(f => f.versionCurrent || f.isCurrent);
    if (currentFiles.length > 0) {
      html += '<div style="display:flex;flex-direction:column;gap:8px;">';
      currentFiles.forEach(f => {
        const fileLink = typeof f === 'string' ? { abs_path: f } : f;
        const label = f.label || f.name || 'File';
        const fileDataAttr = escJsonForDataAttrFunction(fileLink);
        const icon = fileIconFunction(fileLink.abs_path || fileLink.onedrive_rel || fileLink.share_url || '');
        html += `<div class="file-item" data-file="${escAttrFunction(fileDataAttr)}">
          <div style="display:flex;align-items:center;gap:8px;">
            <span style="font-size:16px;">${icon}</span>
            <span style="flex:1;font-size:13px;color:var(--text);">${escFunction(label)}</span>
            <span style="font-size:10px;padding:2px 6px;background:var(--sage-pale);color:var(--sage);border-radius:10px;">Current</span>
            <button type="button" class="file-open-btn" data-action="file:open" data-path="${escAttrFunction(JSON.stringify(fileLink))}" style="padding:4px 8px;background:var(--rose);color:white;border:none;border-radius:4px;font-size:11px;cursor:pointer;">Open</button>
          </div>
        </div>`;
      });
      html += '</div>';
    } else {
      html += '<div style="text-align:center;padding:20px;color:var(--text-dim);font-size:12px;">No current files</div>';
    }
  } else if (tab === 'versions') {
    const versionedFiles = (project.files || []).filter(f => f.versions && f.versions.length > 0);
    if (versionedFiles.length > 0) {
      html += '<div style="display:flex;flex-direction:column;gap:12px;">';
      versionedFiles.forEach(f => {
        const fileLink = typeof f === 'string' ? { abs_path: f } : f;
        const label = f.label || f.name || 'File';
        const fileDataAttr = escJsonForDataAttrFunction(fileLink);
        const icon = fileIconFunction(fileLink.abs_path || fileLink.onedrive_rel || fileLink.share_url || '');
        html += `<div class="file-item" data-file="${escAttrFunction(fileDataAttr)}">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
            <span style="font-size:16px;">${icon}</span>
            <span style="flex:1;font-size:13px;color:var(--text);">${escFunction(label)}</span>
            <button type="button" class="file-open-btn" data-action="file:open" data-path="${escAttrFunction(JSON.stringify(fileLink))}" style="padding:4px 8px;background:var(--rose);color:white;border:none;border-radius:4px;font-size:11px;cursor:pointer;">Open</button>
          </div>
          <div style="padding-left:24px;font-size:11px;color:var(--text-dim);">
            ${(f.versions || []).map(v => `v${escFunction(v.version || v)}`).join(', ')}
          </div>
        </div>`;
      });
    html += '</div>';
    } else {
      html += '<div style="text-align:center;padding:20px;color:var(--text-dim);font-size:12px;">No versioned files</div>';
    }
  } else if (tab === 'conflicts') {
    const allFiles = project.files || [];
    const conflicts = [];
    allFiles.forEach(f => {
      const fileLink = typeof f === 'string' ? { abs_path: f } : f;
      const name = f.label || f.name || '';
      const baseName = name.replace(/[_\-]?v?\d+[\.\-]?\d*[_\-]?(final|revised|FINAL|USE_THIS)?/gi, '').trim();
      if (baseName && baseName.length > 3) {
        const conflict = conflicts.find(c => c.baseName === baseName);
        if (conflict) {
          conflict.files.push(fileLink);
        } else {
          conflicts.push({ baseName, files: [fileLink] });
        }
      }
    });
    const actualConflicts = conflicts.filter(c => c.files.length > 1);
    if (actualConflicts.length > 0) {
      html += '<div style="display:flex;flex-direction:column;gap:12px;">';
      actualConflicts.forEach(conflict => {
        html += `<div style="background:var(--bg2);border:1px solid var(--border);border-radius:6px;padding:12px;">
          <div style="font-size:12px;font-weight:600;color:var(--text);margin-bottom:8px;">${escFunction(conflict.baseName)}</div>
          <div style="display:flex;flex-direction:column;gap:6px;">`;
        conflict.files.forEach(f => {
          const fileLink = typeof f === 'string' ? { abs_path: f } : f;
          const label = f.label || f.name || 'File';
          const icon = fileIconFunction(fileLink.abs_path || fileLink.onedrive_rel || fileLink.share_url || '');
          html += `<div style="display:flex;align-items:center;gap:8px;">
            <span style="font-size:14px;">${icon}</span>
            <span style="flex:1;font-size:12px;color:var(--text-dim);">${escFunction(label)}</span>
            <button type="button" class="file-open-btn" data-action="file:open" data-path="${escAttrFunction(JSON.stringify(fileLink))}" style="padding:4px 8px;background:var(--rose);color:white;border:none;border-radius:4px;font-size:11px;cursor:pointer;">Open</button>
          </div>`;
        });
        html += '</div></div>';
      });
      html += '</div>';
    } else {
      html += '<div style="text-align:center;padding:20px;color:var(--text-dim);font-size:12px;">No conflicts detected</div>';
    }
  }
  
  panelEl.innerHTML = html;
}

/**
 * Switch project files tab
 */
export async function switchProjectFilesTab(ctx, tab) {
  const tabs = ['all', 'current', 'versions', 'conflicts'];
  if (!tabs.includes(tab)) return;

  if (typeof window !== 'undefined') {
    window.currentFilesTab = tab;
  }

  tabs.forEach(t => {
    const tabEl =
      document.getElementById(`project-files-tab-${t}`) ||
      document.getElementById(`files-tab-${t}`);
    const panelEl = getProjectFilesPanelEl(t);
    if (tabEl && panelEl) {
      if (t === tab) {
        tabEl.classList.add('active');
        panelEl.style.display = 'block';
      } else {
        tabEl.classList.remove('active');
        panelEl.style.display = 'none';
      }
    }
  });

  const selectedProjectId =
    ctx?.selectedProjectId ??
    (typeof window.selectedProjectId !== 'undefined' ? window.selectedProjectId : null);
  const projects = ctx?.projects || window.Petal?.store?.getState()?.projects || [];
  const project = findProjectById(projects, selectedProjectId);
  if (project) {
    await renderFilesTab(ctx, tab, project);
  }
}

/**
 * Render project files sidebar
 */
export async function renderProjectFilesSidebar(ctx, tab, project) {
  const { tasks, fileHistory, esc: escFn, escAttr: escAttrFn, escJsonForDataAttr: escJsonForDataAttrFn, fileIcon: fileIconFn, getMatrixStage: getMatrixStageFn, getTaskFiles } = ctx;
  
  const sidebarEl = document.getElementById('project-files-sidebar');
  if (!sidebarEl) return;
  
  const escFunction = escFn || esc;
  const escAttrFunction = escAttrFn || escAttr;
  const escJsonForDataAttrFunction = escJsonForDataAttrFn || escJsonForDataAttr;
  const fileIconFunction = fileIconFn || fileIcon;
  const getMatrixStageFunction = getMatrixStageFn || getMatrixStage;
  
  // Render tabs
  const tabsEl = document.getElementById('project-files-tabs');
  if (tabsEl) {
    tabsEl.innerHTML = `
      <button type="button" id="project-files-tab-all" class="tab-btn ${tab === 'all' ? 'active' : ''}" data-action="project-files:switch-tab" data-tab="all">All</button>
      <button type="button" id="project-files-tab-current" class="tab-btn ${tab === 'current' ? 'active' : ''}" data-action="project-files:switch-tab" data-tab="current">Current</button>
      <button type="button" id="project-files-tab-versions" class="tab-btn ${tab === 'versions' ? 'active' : ''}" data-action="project-files:switch-tab" data-tab="versions">Versions</button>
      <button type="button" id="project-files-tab-conflicts" class="tab-btn ${tab === 'conflicts' ? 'active' : ''}" data-action="project-files:switch-tab" data-tab="conflicts">Conflicts</button>
    `;
  }
  
  // Render panels
  ['all', 'current', 'versions', 'conflicts'].forEach(t => {
    const panelEl = document.getElementById(`project-files-panel-${t}`);
    if (panelEl) {
      panelEl.style.display = t === tab ? 'block' : 'none';
    }
  });
  
  // Render content for active tab
  await renderFilesTab(ctx, tab, project);
}

/**
 * Render project brief (legacy alias — same target as header when no brief panel exists).
 */
export function renderProjectBrief(ctx, project) {
  return renderProjectHeader(ctx, project);
}

/**
 * Render project header
 */
export function renderProjectHeader(ctx, project) {
  const { esc: escFn, escAttr: escAttrFn, dueLabel: dueLabelFn } = ctx;
  const escFunction = escFn || esc;
  const escAttrFunction = escAttrFn || escAttr;
  const dueLabelFunction = dueLabelFn || dueLabel;
  
  const headerEl = document.getElementById('project-header');
  if (!headerEl) return;
  
  const dl = dueLabelFunction(project.due, true);
  const color = `var(--proj-${project.color || 1})`;
  
  // Get linked cell lines
  const linkedCellLines = Array.isArray(project.linkedCellLines) ? project.linkedCellLines : [];
  const projectId = project.id;
  
  // Render linked cell lines section
  let cellLinesHTML = '';
  if (linkedCellLines.length > 0) {
    cellLinesHTML = `
      <div class="project-linked-cell-lines" style="margin-top:12px;display:flex;flex-wrap:wrap;gap:6px;align-items:center;">
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
      <div class="project-linked-cell-lines" style="margin-top:12px;display:flex;align-items:center;gap:8px;">
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
  
  headerEl.innerHTML = `
    <div class="project-header-content">
      <div class="project-color-bar" style="background:${color};"></div>
      <div class="project-title-section">
        <h1 class="project-title">${escFunction(project.name || 'Untitled Project')}</h1>
        ${project.desc ? `<p class="project-description">${escFunction(project.desc)}</p>` : ''}
        ${dl ? `<div class="project-due ${dl.cls}">${escFunction(dl.text)}</div>` : ''}
        ${cellLinesHTML}
      </div>
    </div>
  `;
}

/**
 * Render project files
 */
export async function renderProjectFiles(ctx) {
  const { projects, tasks, fileHistory, esc: escFn, escAttr: escAttrFn, escJsonForDataAttr: escJsonForDataAttrFn, fileIcon: fileIconFn, getMatrixStage: getMatrixStageFn, toggleAddPinnedFile, removePinnedFile } = ctx;
  
  const filesEl = document.getElementById('project-files-content');
  if (!filesEl) return;
  
  const escFunction = escFn || esc;
  const escAttrFunction = escAttrFn || escAttr;
  const escJsonForDataAttrFunction = escJsonForDataAttrFn || escJsonForDataAttr;
  const fileIconFunction = fileIconFn || fileIcon;
  const getMatrixStageFunction = getMatrixStageFn || getMatrixStage;
  
  const selectedProjectId = typeof window.selectedProjectId !== 'undefined' ? window.selectedProjectId : null;
  if (!selectedProjectId) {
    filesEl.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-dim);font-size:12px;">No project selected</div>';
    return;
  }
  
  const project = findProjectById(projects, selectedProjectId);
  if (!project) {
    filesEl.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-dim);font-size:12px;">Project not found</div>';
    return;
  }
  
  const allFiles = project.files || [];
  const currentTab = typeof window.currentProjectFilesTab !== 'undefined' ? window.currentProjectFilesTab : 'all';
  
  let html = '<div class="project-files-container">';
  
  if (allFiles.length > 0) {
    html += '<div style="display:flex;flex-direction:column;gap:8px;">';
    allFiles.forEach((f, idx) => {
      const fileLink = typeof f === 'string' ? { abs_path: f } : f;
      const label = f.label || f.name || 'File';
      const fileDataAttr = escJsonForDataAttrFunction(fileLink);
      const icon = fileIconFunction(fileLink.abs_path || fileLink.onedrive_rel || fileLink.share_url || '');
      const stage = getMatrixStageFunction(t);
      html += `<div class="file-item" data-file="${escAttrFunction(fileDataAttr)}">
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="font-size:16px;">${icon}</span>
          <span style="flex:1;font-size:13px;color:var(--text);">${escFunction(label)}</span>
          <button type="button" class="file-open-btn" data-action="file:open" data-path="${escAttrFunction(JSON.stringify(fileLink))}" style="padding:4px 8px;background:var(--rose);color:white;border:none;border-radius:4px;font-size:11px;cursor:pointer;">Open</button>
        </div>
      </div>`;
    });
    html += '</div>';
  } else {
    html += '<div style="text-align:center;padding:20px;color:var(--text-dim);font-size:12px;">No files</div>';
  }
  html += '</div>';
  
  filesEl.innerHTML = html;
}

/**
 * Generate HTML for a project card (used in projects list view)
 * @param {Object} ctx - Page context with tasks, projects, and helper functions
 * @param {Object} p - Project object
 * @param {Array} tasksFromStore - Tasks from store (optional, falls back to ctx.tasks)
 * @param {Set} openProjectsFromStore - Set of open project IDs (optional, falls back to window.openProjects)
 * @returns {string} HTML string for project card
 */
export function projectHTML(ctx, p, tasksFromStore = null, openProjectsFromStore = null) {
  const { tasks, projects, esc: escFn, escAttr: escAttrFn, escJsonForAttr: escJsonForAttrFn, escJsonForDataAttr: escJsonForDataAttrFn, fileIcon: fileIconFn, parseDate: parseDateFn, dueLabel: dueLabelFn, today: todayFn, getTaskSubtasks: getTaskSubtasksFn, getTaskFiles: getTaskFilesFn, getWorkflowLanesDisplay: getWorkflowLanesDisplayFn } = ctx;
  
  // Use provided tasks/openProjects or fall back to context/globals
  const tasksToUse = tasksFromStore || tasks || [];
  const openProjectsToUse = openProjectsFromStore || (typeof window.openProjects !== 'undefined' ? window.openProjects : new Set());
  const openTaskSubtasks = typeof window.openTaskSubtasks !== 'undefined' ? window.openTaskSubtasks : new Set();
  
  // Helper functions with fallbacks
  const escFunction = escFn || esc;
  const escAttrFunction = escAttrFn || escAttr;
  const escJsonForAttrFunction = escJsonForAttrFn || escJsonForAttr;
  const escJsonForDataAttrFunction = escJsonForDataAttrFn || escJsonForDataAttr;
  const fileIconFunction = fileIconFn || fileIcon;
  const parseDateFunction = parseDateFn || parseDate;
  const dueLabelFunction = dueLabelFn || dueLabel;
  const todayFunction = todayFn || today;
  const getTaskSubtasksFunction = getTaskSubtasksFn || ((ctx, taskId) => getTaskSubtasks(ctx, taskId));
  const getTaskFilesFunction = getTaskFilesFn || ((task, ctx) => getTaskFiles(task, ctx));
  const getWorkflowLanesDisplayFunction = getWorkflowLanesDisplayFn || getWorkflowLanesDisplay;
  
  const color = `var(--proj-${p.color || 1})`;
  const colorPale = `var(--proj-${p.color || 1}p)`;
  const dl = dueLabelFunction(p.due, true);
  const isOpen = isProjectOpen(openProjectsToUse, p.id);
  
  const projectTasks = filterTasksForProject(tasksToUse, p.id, { excludeDeleted: true });
  const totalTasks = projectTasks.length;
  const inProgressTasks = projectTasks.filter(t => t.status === 'Doing' && !t.done).length;
  const doneTasks = projectTasks.filter(t => t.done).length;
  const donePct = totalTasks ? Math.round(doneTasks / totalTasks * 100) : 0;
  const overdueTasks = projectTasks.filter(t => {
    if (t.done) return false;
    const due = parseDateFunction(t.due);
    return due && due < todayFunction();
  }).length;

  // Calculate subtask completion across all tasks
  let totalSubtasks = 0;
  let doneSubtasks = 0;
  projectTasks.forEach(t => {
    const taskSubtasks = getTaskSubtasksFunction(ctx, t.id);
    totalSubtasks += taskSubtasks.length;
    doneSubtasks += taskSubtasks.filter(s => s.done).length;
  });
  const subtaskPct = totalSubtasks ? Math.round(doneSubtasks / totalSubtasks * 100) : 0;

  return `<div class="project-card" id="proj-${p.id}">
    <div class="project-header">
      <div class="project-color-bar" style="background:${color};"></div>
      <button type="button" data-action="open-project" data-project-id="${p.id}" style="flex:1;min-width:0;padding-left:8px;text-align:left;background:none;border:none;cursor:pointer;" title="Click to open project view">
        <div class="project-name" style="${p.done?'text-decoration:line-through;opacity:.6':''};display:flex;align-items:center;gap:8px;">
          ${escFunction(p.name)}
          <span style="font-size:11px;color:var(--text-light);font-weight:normal;">→ View Project</span>
        </div>
        ${p.desc?`<div class="project-desc">${escFunction(p.desc)}</div>`:''}
        ${totalTasks > 0 ? `<div class="project-metrics">
          <span class="metric-item"><span class="metric-value">${totalTasks}</span> tasks</span>
          ${inProgressTasks > 0 ? `<span class="metric-item">${inProgressTasks} in progress</span>` : ''}
          <span class="metric-item"><span class="metric-value">${donePct}%</span> done</span>
          ${overdueTasks > 0 ? `<span class="metric-item" style="color:var(--overdue);"><span class="metric-value">${overdueTasks}</span> overdue</span>` : ''}
        </div>` : ''}
      </button>
      <div class="project-meta" onclick="event.stopPropagation()">
        ${dl?`<span class="project-due ${dl.cls}"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>${escFunction(dl.text)}</span>`:''}
        ${p.files?.length?`<span style="font-size:11px;color:var(--text-dim);">📎 ${p.files.length}</span>`:''}
        <div class="project-progress-wrap">
          <div class="project-progress-bar"><div class="project-progress-fill" style="width:${donePct}%;background:${color};"></div></div>
          <div class="project-progress-pct">${doneTasks}/${totalTasks} tasks${totalSubtasks > 0 ? ` • ${doneSubtasks}/${totalSubtasks} subtasks` : ''}</div>
        </div>
        <div class="project-actions">
          <button type="button" class="btn-del" data-action="project:toggle-done" data-project-id="${p.id}" title="${p.done?'Reopen':'Complete'}" style="font-size:14px;">${p.done?'↩':'✓'}</button>
          <button type="button" class="btn-del" data-action="project:delete" data-project-id="${p.id}" title="Delete">✕</button>
        </div>
      </div>
      <button type="button" class="project-chevron ${isOpen?'open':''}" id="chev-${p.id}" data-action="project:toggle-open" data-project-id="${p.id}" style="background:none;border:none;cursor:pointer;" title="Toggle details">▶</button>
    </div>

    <!-- Workflow Lanes Section -->
    <div style="padding:12px 20px 12px 32px;border-top:1px solid var(--border);margin-top:8px;">
      <div style="font-size:11px;color:var(--text-dim);font-weight:500;margin-bottom:6px;">🛤️ Workflow Lanes</div>
      <div id="workflow-lanes-display-${p.id}">
        ${getWorkflowLanesDisplayFunction(p)}
      </div>
    </div>

    <!-- Project Tasks Section - Enhanced with Files -->
    <div style="padding:12px 20px 12px 32px;border-top:1px solid var(--border);margin-top:8px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
        <div style="display:flex;align-items:center;gap:8px;">
          <h3 style="font-size:14px;font-weight:600;color:var(--text);margin:0;">📋 Tasks ${totalTasks > 0 ? `(${totalTasks})` : ''}</h3>
        </div>
        <button data-action="add-project-task" data-project-id="${p.id}" style="padding:8px 16px;background:var(--rose);color:white;border:none;border-radius:6px;font-size:12px;font-weight:500;cursor:pointer;transition:all .15s;" onmouseover="this.style.background='var(--rose-dark)'" onmouseout="this.style.background='var(--rose)'">
          ➕ Add Task
        </button>
      </div>

      ${totalTasks > 0 ? `<div id="project-tasks-section-${p.id}" style="margin-top:12px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
          <div style="font-size:11px;color:var(--text-dim);font-weight:500;">Assign to Workflow Lanes</div>
        <div id="bulk-actions-${p.id}" style="display:none;gap:8px;align-items:center;">
          <span id="selected-count-${p.id}" style="font-size:11px;color:var(--text-dim);">0 selected</span>
          <select id="bulk-lane-${p.id}" onchange="bulkAssignLane(${p.id}, this.value)" style="font-size:11px;padding:4px 8px;border:1px solid var(--border);border-radius:4px;background:var(--surface);color:var(--text);">
            <option value="">Assign selected to...</option>
            ${(p.workflowLanes || ['lab', 'comp', 'writing', 'presentation']).map(lane => {
              const labels = { lab: '🧪 Lab', comp: '💻 Comp', writing: '📝 Writing', presentation: '📊 Presentation' };
              return `<option value="${lane}">${labels[lane]}</option>`;
            }).join('')}
            <option value="none">Remove lane</option>
          </select>
          <button type="button" data-action="project:clear-selection" data-project-id="${p.id}" style="font-size:11px;padding:4px 8px;background:var(--bg2);border:1px solid var(--border);border-radius:4px;color:var(--text-dim);cursor:pointer;">Clear</button>
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:8px;">
        ${projectTasks.map(t => {
          const laneLabel = t.lane === 'lab' ? '🧪 Lab' : t.lane === 'comp' ? '💻 Comp' : t.lane === 'writing' ? '📝 Writing' : t.lane === 'presentation' ? '📊 Presentation' : 'No lane';
          const stageLabel = t.stage || t.status || 'No stage';
          const taskSubtasks = getTaskSubtasksFunction(ctx, t.id);
          const taskSubtasksOpen = openTaskSubtasks && openTaskSubtasks.has(t.id);
          
          // Get allowed lanes for this project
          const allowedLanes = p.workflowLanes || ['lab', 'comp', 'writing', 'presentation', 'personal', 'product'];
          const laneOptions = [];
          laneOptions.push(`<option value="" ${!t.lane || t.lane === 'none' ? 'selected' : ''}>No lane</option>`);
          if (allowedLanes.includes('lab')) laneOptions.push(`<option value="lab" ${t.lane === 'lab' ? 'selected' : ''}>🧪 Lab</option>`);
          if (allowedLanes.includes('comp')) laneOptions.push(`<option value="comp" ${t.lane === 'comp' ? 'selected' : ''}>💻 Comp</option>`);
          if (allowedLanes.includes('writing')) laneOptions.push(`<option value="writing" ${t.lane === 'writing' ? 'selected' : ''}>📝 Writing</option>`);
          if (allowedLanes.includes('presentation')) laneOptions.push(`<option value="presentation" ${t.lane === 'presentation' ? 'selected' : ''}>📊 Presentation</option>`);
          
          // Render subtasks as tasks with visual indication
          const subtasksHTML = taskSubtasks.map(st => {
            const sdl = dueLabelFunction(st.due, true, st.done);
            const stLaneLabel = st.lane === 'lab' ? '🧪 Lab' : st.lane === 'comp' ? '💻 Comp' : st.lane === 'writing' ? '📝 Writing' : st.lane === 'presentation' ? '📊 Presentation' : '';
            // Render subtask files
            const subtaskFiles = getTaskFilesFunction(st, ctx); // Use canonical registry
            const subtaskFilesHTML = subtaskFiles && subtaskFiles.length > 0 ? subtaskFiles.map(f => {
              const fileLink = typeof f === 'string' ? { abs_path: f } : f;
              const label = f.label || f.name || 'File';
              const safeLink = escJsonForAttrFunction(fileLink);
              const icon = fileIconFunction(fileLink.abs_path || fileLink.onedrive_rel || fileLink.share_url || '');
              return `<a href="#" class="file-chip" data-action="file:open" data-path="${escAttrFunction(JSON.stringify(fileLink))}" style="font-size:9px;padding:3px 6px;background:var(--bg2);border:1px solid var(--border);border-radius:3px;color:var(--text-dim);text-decoration:none;display:inline-flex;align-items:center;gap:3px;">${icon} ${escFunction(label)}</a>`;
            }).join('') : '';
            return `<div class="subtask-item ${st.done?'done':''}" style="margin-left:24px;margin-top:6px;background:var(--bg);border:1px solid var(--border);border-radius:4px;padding:8px;">
              <div style="display:flex;align-items:flex-start;gap:8px;">
                <button type="button" class="subtask-check ${st.done?'checked':''}" data-action="subtask:toggle" data-task-id="${t.id}" data-subtask-id="${st.id}" style="margin-top:2px;background:none;border:none;padding:0;cursor:pointer;" title="Toggle subtask"></button>
                <div class="subtask-body" style="flex:1;">
                  <div class="subtask-title" style="font-weight:500;font-size:13px;">${escFunction(st.title)}</div>
                  <div class="subtask-meta" style="display:flex;gap:6px;align-items:center;margin-top:4px;flex-wrap:wrap;">
                    <span class="sub-priority ${st.priority}" style="font-size:10px;">${st.priority}</span>
                    ${stLaneLabel ? `<span style="font-size:9px;color:var(--text-dim);">${escFunction(stLaneLabel)}</span>` : ''}
                    ${sdl?`<span class="sub-due ${sdl.cls}" style="font-size:9px;"><svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>${escFunction(sdl.text)}</span>`:''}
                    <span style="font-size:9px;color:var(--text-light);">↳ subtask</span>
                  </div>
                  ${subtaskFilesHTML ? `<div style="margin-top:6px;padding-top:6px;border-top:1px solid var(--border);display:flex;flex-wrap:wrap;gap:4px;">
                    <span style="font-size:9px;color:var(--text-dim);margin-right:2px;">📎</span>
                    ${subtaskFilesHTML}
                  </div>` : ''}
                </div>
                <div style="display:flex;gap:4px;flex-shrink:0;">
                  <button class="btn-del" data-action="edit-task" data-task-id="${st.id}" data-is-subtask="false" data-project-id="${t.projectId || ''}" title="Edit">✎</button>
                  <button class="btn-del btn-delete" data-action="delete" data-id="${String(st.id)}" data-task-id="${String(st.id)}" data-parent-task-id="${String(t.id)}" data-is-subtask="false" data-project-id="${t.projectId || ''}" title="Delete">×</button>
                </div>
              </div>
            </div>`;
          }).join('');
          
          // Render task files
          const taskFiles = getTaskFilesFunction(t, ctx); // Use canonical registry
          const taskFilesHTML = taskFiles && taskFiles.length > 0 ? taskFiles.map(f => {
            const fileLink = typeof f === 'string' ? { abs_path: f } : f;
            const label = f.label || f.name || 'File';
            const safeLink = escJsonForAttrFunction(fileLink);
            const icon = fileIconFunction(fileLink.abs_path || fileLink.onedrive_rel || fileLink.share_url || '');
            return `<a href="#" class="file-chip" data-action="file:open" data-path="${escAttrFunction(JSON.stringify(fileLink))}" style="font-size:10px;padding:4px 8px;background:var(--bg);border:1px solid var(--border);border-radius:4px;color:var(--text-dim);text-decoration:none;display:inline-flex;align-items:center;gap:4px;">${icon} ${escFunction(label)}</a>`;
          }).join('') : '';
          
          const tdl = dueLabelFunction(t.due, true, t.done);
          
          const priorityClass = t.priority === 3 ? 'high' : t.priority === 1 ? 'low' : 'medium';
          return `<div class="task-card ${t.done ? 'done' : ''}" data-id="${t.id}" data-priority="${priorityClass}">
            <div class="task-top">
              <div class="task-content">
                <input type="checkbox" class="task-select-checkbox" data-project-id="${p.id}" data-task-id="${t.id}" onchange="updateSelection(${p.id})" style="cursor:pointer;flex-shrink:0;width:18px;height:18px;margin-top:2px;display:none;">
                <button type="button" class="check-box ${t.done ? 'checked' : ''}" data-action="task:toggle" data-task-id="${t.id}" style="background:none;border:none;padding:0;cursor:pointer;" title="Toggle task"></button>
                
                <div class="task-body">
                  <div class="task-title">
                    ${escFunction(t.title || 'Untitled')}
                    ${laneLabel && laneLabel !== 'No lane' ? `<span class="tag-chip">${escFunction(laneLabel)}</span>` : ''}
                    ${(t.tags || []).map(tag => 
                      `<span class="tag-chip" data-tag="${escFunction(tag)}">${escFunction(tag)}</span>`
                    ).join('')}
                  </div>
                  
                  <div class="task-meta-row">
                    <span class="priority-tag ${priorityClass}">${priorityClass}</span>
                    ${tdl ? `<span class="due-tag ${tdl.class || tdl.cls}">${escFunction(tdl.label || tdl.text)}</span>` : ''}
                    ${t.lane && t.lane !== 'none' && stageLabel !== 'No stage' ? `<span style="font-size:10px;color:var(--text-dim);">• ${escFunction(stageLabel)}</span>` : ''}
                  </div>
                  
                  ${t.notes ? `<div class="task-notes">${escFunction(t.notes)}</div>` : ''}
                </div>
              </div>
              
              <div class="task-actions" style="display:flex;gap:4px;align-items:center;">
                <select onchange="updateTaskLane(${t.id}, this.value); window.rerenderViewIfActive('projects');" style="font-size:11px;padding:4px 6px;border:1px solid var(--border);border-radius:4px;background:var(--surface);color:var(--text);cursor:pointer;" title="Assign lane">
                  ${laneOptions.join('')}
                </select>
                ${t.lane && t.lane !== 'none' && LANE_STAGES[t.lane] ? `<select onchange="updateTaskStage(${t.id}, '${t.lane}', this.value); window.rerenderViewIfActive('projects');" style="font-size:11px;padding:4px 6px;border:1px solid var(--border);border-radius:4px;background:var(--surface);color:var(--text);cursor:pointer;" title="Change stage">
                  ${LANE_STAGES[t.lane].map(s => `<option value="${s}" ${t.stage === s ? 'selected' : ''}>${escFunction(s)}</option>`).join('')}
                </select>` : ''}
                <button class="btn-del" data-action="task:open-drawer" data-task-id="${String(t.id)}" title="Open drawer (Notes, Files, Subtasks)" style="font-size:13px;line-height:1;min-width:28px;min-height:28px;color:var(--text-dim);">📝</button>
                <button class="btn-del" data-action="task:toggle-subtasks" data-task-id="${String(t.id)}" title="Toggle subtasks" style="font-size:12px;">${taskSubtasks.length > 0 ? (taskSubtasksOpen ? '▼' : '▶') : ''}</button>
                <button class="btn-del btn-edit" data-action="edit-task" data-task-id="${String(t.id)}" title="Edit" style="font-size:13px;line-height:1;min-width:28px;min-height:28px;color:var(--text-dim);">✎</button>
                <button class="btn-del btn-delete" data-action="delete" data-id="${String(t.id)}" data-task-id="${String(t.id)}" data-is-subtask="false" data-project-id="${t.projectId || ''}" title="Delete" style="font-size:16px;line-height:1;min-width:28px;min-height:28px;color:var(--text-dim);cursor:pointer;display:flex;align-items:center;justify-content:center;font-weight:bold;opacity:1;">×</button>
              </div>
            </div>
            ${taskFilesHTML ? `<div style="margin-top:8px;padding-top:8px;border-top:1px solid var(--border);display:flex;flex-wrap:wrap;gap:6px;">
              <span style="font-size:10px;color:var(--text-dim);margin-right:4px;">📎 Files:</span>
              ${taskFilesHTML}
            </div>` : ''}
            ${taskSubtasks.length > 0 ? `<div id="task-subtasks-${t.id}" style="display:${taskSubtasksOpen ? 'block' : 'none'};margin-top:8px;padding-top:8px;border-top:1px solid var(--border);">
              ${subtasksHTML}
              <button type="button" data-action="task:toggle-add-subtask" data-task-id="${t.id}" style="width:100%;padding:6px;background:var(--surface);border:1px solid var(--border);border-radius:4px;color:var(--text-dim);font-size:11px;margin-top:8px;cursor:pointer;">+ Add Subtask</button>
              <div id="add-subtask-to-task-${t.id}" style="display:none;margin-top:8px;padding:10px;background:var(--bg);border:1px solid var(--border);border-radius:4px;">
                <input type="text" id="subtask-title-${t.id}" placeholder="Subtask title..." style="width:100%;margin-bottom:6px;padding:6px;font-size:12px;">
                <div style="display:flex;gap:6px;">
                  <select id="subtask-pri-${t.id}" style="flex:1;padding:6px;font-size:11px;">
                    <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="low">Low</option>
          </select>
                  <input type="date" id="subtask-due-${t.id}" style="flex:1;padding:6px;font-size:11px;">
                  <button type="button" data-action="task:add-subtask-inline" data-task-id="${t.id}" class="btn-add-sub" style="padding:6px 12px;font-size:11px;">Add</button>
        </div>
          </div>
            </div>` : `<div style="margin-top:8px;">
              <button type="button" data-action="task:toggle-add-subtask" data-task-id="${t.id}" style="width:100%;padding:6px;background:var(--surface);border:1px solid var(--border);border-radius:4px;color:var(--text-dim);font-size:11px;cursor:pointer;">+ Add Subtask</button>
              <div id="add-subtask-to-task-${t.id}" style="display:none;margin-top:8px;padding:10px;background:var(--bg);border:1px solid var(--border);border-radius:4px;">
                <input type="text" id="subtask-title-${t.id}" placeholder="Subtask title..." style="width:100%;margin-bottom:6px;padding:6px;font-size:12px;">
                <div style="display:flex;gap:6px;">
                  <select id="subtask-pri-${t.id}" style="flex:1;padding:6px;font-size:11px;">
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="low">Low</option>
                  </select>
                  <input type="date" id="subtask-due-${t.id}" style="flex:1;padding:6px;font-size:11px;">
                  <button type="button" data-action="task:add-subtask-inline" data-task-id="${t.id}" class="btn-add-sub" style="padding:6px 12px;font-size:11px;">Add</button>
        </div>
      </div>
            </div>`}
          </div>`;
        }).join('')}
      </div>` : totalTasks === 0 ? `<div style="text-align:center;padding:24px;color:var(--text-dim);font-size:12px;">
        <div style="margin-bottom:8px;">No tasks yet</div>
        <div style="font-size:11px;opacity:0.7;">Click "Add Task" above to create your first task</div>
      </div>` : ''}
    </div>

    <!-- Files Section - Collapsible -->
    <div style="padding:12px 20px 12px 32px;border-top:1px solid var(--border);margin-top:8px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
        <h3 style="font-size:14px;font-weight:600;color:var(--text);margin:0;">📎 Files ${p.files?.length > 0 ? `(${p.files.length})` : ''}</h3>
        <button data-action="add-file-to-project" data-project-id="${p.id}" style="padding:8px 16px;background:var(--bg2);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:12px;font-weight:500;cursor:pointer;transition:all .15s;" onmouseover="this.style.background='var(--rose-pale)';this.style.borderColor='var(--rose-soft)'" onmouseout="this.style.background='var(--bg2)';this.style.borderColor='var(--border)'">
          ➕ Add File
        </button>
      </div>
      
      <!-- Existing Files -->
      ${p.files?.length > 0 ? `<div style="display:flex;flex-direction:column;gap:8px;">${p.files.map((f, idx)=>{
        const fileLink = typeof f === 'string' ? { abs_path: f } : f;
        const label = f.label || f.name || 'File';
        const safeLink = escJsonForAttrFunction(fileLink);
        const icon = fileIconFunction(fileLink.abs_path || fileLink.onedrive_rel || fileLink.share_url || '');
        const fileId = f.id || ('file-' + p.id + '-' + idx);
        const fileNote = f.note || '';
        return `<div class="file-entry" style="background:var(--bg2);border:1px solid var(--border);border-radius:6px;padding:10px;">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:${fileNote ? '6px' : '0'};">
            <a href="#" class="file-chip" data-action="file:open" data-path="${escAttrFunction(JSON.stringify(fileLink))}" style="flex:1;display:flex;align-items:center;gap:6px;text-decoration:none;">${icon} ${escFunction(label)}</a>
            ${fileNote ? `<span class="file-note-icon" title="Has note">📝</span>` : ''}
            <button type="button" class="file-note-toggle-btn" data-action="file:toggle-note" data-file-id="${fileId}" style="padding:4px 8px;background:var(--surface);border:1px solid var(--border);border-radius:4px;color:var(--text-dim);font-size:10px;cursor:pointer;">${fileNote ? '📝 Note' : '📝 Add note'}</button>
          </div>
          ${fileNote ? `<button type="button" class="file-note-preview" data-action="file:toggle-note" data-file-id="${fileId}" style="width:100%;text-align:left;font-size:11px;color:var(--text-dim);cursor:pointer;padding:6px;background:var(--bg);border:1px solid var(--border);border-radius:4px;margin-top:4px;">
            ${escFunction(fileNote.trim().split('\n')[0].substring(0, 80))}${fileNote.trim().split('\n')[0].length > 80 ? '...' : ''}
          </button>` : ''}
          <div class="file-note-content collapsed" id="file-note-${fileId}" style="display:none;margin-top:6px;">
            <textarea class="file-note-textarea" data-file-id="${fileId}" data-project-id="${p.id}" data-file-index="${idx}" placeholder="Add note..." oninput="debounceSaveFileNote('${fileId}', ${p.id}, ${idx}, this.value)" style="width:100%;min-height:60px;padding:8px;font-size:12px;background:var(--surface);border:1px solid var(--border);border-radius:4px;resize:vertical;">${escFunction(fileNote)}</textarea>
          </div>
        </div>`;
      }).join('')}</div>` : '<div style="font-size:12px;color:var(--text-dim);">No files yet</div>'}
    </div>
  </div>`;
}
