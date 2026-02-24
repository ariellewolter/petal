// ═══════════════════════ LANE RENDERING ═══════════════════════
// Functions for rendering workflow lanes as lists

import { esc, escAttr, escJsonForAttr, fileIcon } from '../utils/strings.js';
import { parseDate, dueLabel } from '../utils/dates.js';
import { isTaskBlocked } from '../domain/models.js';
import { LANE_STAGES } from '../domain/schema.js';

/**
 * Render tasks for a specific workflow lane as a list
 * @param {Object} ctx - Page context
 * @param {string} laneName - Lane name (e.g., 'lab', 'comp', 'writing')
 * @param {Array} allTasks - All tasks to filter from
 * @returns {Promise<void>}
 */
export async function renderLane(ctx, laneName, allTasks) {
  const { 
    tasks, 
    projects,
    esc: escFn, 
    escAttr: escAttrFn, 
    escJsonForAttr: escJsonForAttrFn, 
    fileIcon: fileIconFn,
    parseDate: parseDateFn, 
    dueLabel: dueLabelFn,
    isTaskBlocked: isTaskBlockedFn,
    getTaskFiles: getTaskFilesFn,
    projectNameById: projectNameByIdFn
  } = ctx;
  
  const laneEl = document.getElementById(`lane-${laneName}`);
  if (!laneEl) return;
  
  const escFunction = escFn || esc;
  const escAttrFunction = escAttrFn || escAttr;
  const escJsonForAttrFunction = escJsonForAttrFn || escJsonForAttr;
  const fileIconFunction = fileIconFn || fileIcon;
  const parseDateFunction = parseDateFn || parseDate;
  const dueLabelFunction = dueLabelFn || dueLabel;
  const isTaskBlockedFunction = isTaskBlockedFn || isTaskBlocked;
  const getTaskFilesFunction = getTaskFilesFn || (() => []);
  const projectNameByIdFunction = projectNameByIdFn || ((id) => {
    if (!id) return '';
    const project = (projects || []).find(p => String(p.id) === String(id));
    return project ? project.name : '';
  });
  
  const laneTasks = allTasks.filter(t => t.lane === laneName);
  const stages = LANE_STAGES[laneName] || ['Todo', 'Doing', 'Done'];
  
  // Show empty state if no tasks
  if (laneTasks.length === 0) {
    laneEl.innerHTML = `<div style="text-align:center;padding:40px 20px;color:var(--text-dim);">
      <div style="font-size:14px;margin-bottom:8px;">No tasks assigned</div>
      <div style="font-size:12px;">Assign tasks to this lane from the Projects tab</div>
    </div>`;
    return;
  }
  
  // Sort tasks: group by stage, then by priority, then by due date
  const sortedTasks = laneTasks.sort((a, b) => {
    // Done tasks at the bottom
    if (a.done && !b.done) return 1;
    if (!a.done && b.done) return -1;
    
    // Get stage indices
    const getStageIndex = (task) => {
      if (task.done) return stages.length;
      const stageIdx = stages.findIndex(s => s === task.stage);
      if (stageIdx >= 0) return stageIdx;
      // Default mapping for tasks without explicit stage
      if (task.status === 'Doing') return 1;
      return 0;
    };
    
    const aStageIdx = getStageIndex(a);
    const bStageIdx = getStageIndex(b);
    if (aStageIdx !== bStageIdx) return aStageIdx - bStageIdx;
    
    // Then by priority
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    const aPriority = priorityOrder[a.priority] || 2;
    const bPriority = priorityOrder[b.priority] || 2;
    if (aPriority !== bPriority) return bPriority - aPriority;
    
    // Then by due date
    const aDue = parseDateFunction(a.due) || new Date(999999999999);
    const bDue = parseDateFunction(b.due) || new Date(999999999999);
    return aDue - bDue;
  });
  
  // Render all tasks as a list
  const cardsHtml = await Promise.all(sortedTasks.map(async t => {
    const blocked = isTaskBlockedFunction(t, tasks || []);
    const depTask = t.dependsOn ? (tasks || []).find(d => d.id === t.dependsOn) : null;
    const proj = t.projectId ? projectNameByIdFunction(t.projectId) : '';
    const dl = dueLabelFunction(t.due);
    
    // Determine current stage
    let currentStage = t.stage;
    if (!currentStage) {
      if (t.done) {
        currentStage = stages[stages.length - 1];
      } else if (t.status === 'Doing') {
        currentStage = stages[1] || stages[0];
      } else {
        currentStage = stages[0];
      }
    }
    
    let filesHtml = '';
    if (t.files?.length) {
      const taskFiles = getTaskFilesFunction(t, ctx);
      const fileHtmls = await Promise.all(taskFiles.map(async f => {
        const label = f.label || f.name || 'File';
        const fileLink = typeof f === 'string' ? { abs_path: f } : f;
        const safeLink = escJsonForAttrFunction(fileLink);
        const icon = fileIconFunction(fileLink.abs_path || fileLink.onedrive_rel || fileLink.share_url || '');
        return `<a href="#" class="file-chip" data-path="${escAttrFunction(JSON.stringify(fileLink))}" style="font-size:10px;padding:2px 6px;">${icon} ${escFunction(label)}</a>`;
      }));
      filesHtml = `<div class="task-files" style="margin-top:6px;">${fileHtmls.join('')}</div>`;
    }
    
    return `<div class="task-card ${t.done?'done':''} ${blocked?'blocked':''}" data-priority="${t.priority}">
      <div class="task-top">
        <div class="task-content">
          <button type="button" class="check-box ${t.done?'checked':''}" data-action="task:toggle" data-task-id="${t.id}" style="background:none;border:none;padding:0;cursor:pointer;" title="Toggle task"></button>
          <div class="task-body" style="flex:1;">
            <div class="task-title">${escFunction(t.title)}</div>
            <div class="task-meta-row" style="margin-top:6px;">
              ${proj ? `<span class="due-tag">${escFunction(proj)}</span>` : ''}
              <span class="priority-tag ${t.priority}">${t.priority}</span>
              <span class="due-tag" style="background:var(--bg2);">${escFunction(currentStage)}</span>
            ${t.status ? `<span class="due-tag" style="background:var(--bg2);">${escFunction(t.status)}</span>` : ''}
            ${dl ? `<span class="due-tag ${dl.cls}"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>${escFunction(dl.text)}</span>` : ''}
            ${t.tags?.length ? '<span class="task-tags">' + t.tags.map(tag => '<span class="tag-chip" data-tag="' + escFunction(tag) + '">' + escFunction(tag) + '</span>').join('') + '</span>' : ''}
          </div>
          ${blocked ? `<div style="font-size:10px;color:var(--overdue);margin-top:4px;">🔒 Blocked by: ${depTask ? escFunction(depTask.title) : 'task'}</div>` : ''}
          ${filesHtml}
          <div style="margin-top:8px;display:flex;gap:4px;align-items:center;flex-wrap:wrap;">
            <span class="due-tag" style="background:var(--bg2);">${escFunction(t.lane || 'No lane')}</span>
            <span class="due-tag" style="background:var(--bg2);">${escFunction(currentStage || 'planned')}</span>
          </div>
          </div>
        </div>
        <div class="task-actions">
          <button type="button" class="btn-del" data-action="task:open-drawer" data-task-id="${t.id}" title="Open drawer" style="font-size:11px;">📝</button>
          <button type="button" class="btn-del" data-action="edit-task" data-task-id="${t.id}" data-is-subtask="${t.isSubtask || false}" data-project-id="${t.projectId || ''}" title="Edit">✎</button>
          <button type="button" class="btn-del btn-delete" data-action="delete" data-id="${String(t.id)}" data-task-id="${String(t.id)}" data-is-subtask="${t.isSubtask || false}" data-project-id="${t.projectId || ''}" title="Delete">×</button>
        </div>
      </div>
    </div>`;
  }));
  
  laneEl.innerHTML = `<div style="max-width:100%;">${cardsHtml.join('')}</div>`;
}

/**
 * Render unassigned tasks lane as a list
 * @param {Object} ctx - Page context
 * @param {Array} allTasks - All tasks to filter from
 * @returns {Promise<void>}
 */
export async function renderUnassignedLane(ctx, allTasks) {
  const { 
    tasks, 
    projects,
    esc: escFn, 
    escAttr: escAttrFn, 
    escJsonForAttr: escJsonForAttrFn, 
    fileIcon: fileIconFn,
    parseDate: parseDateFn, 
    dueLabel: dueLabelFn,
    isTaskBlocked: isTaskBlockedFn,
    getTaskFiles: getTaskFilesFn,
    projectNameById: projectNameByIdFn
  } = ctx;
  
  const laneEl = document.getElementById('lane-unassigned');
  if (!laneEl) return;
  
  const escFunction = escFn || esc;
  const escAttrFunction = escAttrFn || escAttr;
  const escJsonForAttrFunction = escJsonForAttrFn || escJsonForAttr;
  const fileIconFunction = fileIconFn || fileIcon;
  const parseDateFunction = parseDateFn || parseDate;
  const dueLabelFunction = dueLabelFn || dueLabel;
  const isTaskBlockedFunction = isTaskBlockedFn || isTaskBlocked;
  const getTaskFilesFunction = getTaskFilesFn || (() => []);
  const projectNameByIdFunction = projectNameByIdFn || ((id) => {
    if (!id) return '';
    const project = (projects || []).find(p => String(p.id) === String(id));
    return project ? project.name : '';
  });
  
  const unassignedTasks = allTasks.filter(t => !t.lane || t.lane === 'none' || t.lane === '');
  
  if (unassignedTasks.length === 0) {
    laneEl.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-dim);font-size:12px;">All tasks assigned to workflow lanes</div>';
    return;
  }
  
  // Sort tasks: active first, then by priority, then by due date
  const sortedTasks = unassignedTasks.sort((a, b) => {
    // Done tasks at the bottom
    if (a.done && !b.done) return 1;
    if (!a.done && b.done) return -1;
    // Then by priority
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    const aPriority = priorityOrder[a.priority] || 2;
    const bPriority = priorityOrder[b.priority] || 2;
    if (aPriority !== bPriority) return bPriority - aPriority;
    // Then by due date
    const aDue = parseDateFunction(a.due) || new Date(999999999999);
    const bDue = parseDateFunction(b.due) || new Date(999999999999);
    return aDue - bDue;
  });
  
  const cardsHtml = await Promise.all(sortedTasks.map(async t => {
    const blocked = isTaskBlockedFunction(t, tasks || []);
    const depTask = t.dependsOn ? (tasks || []).find(d => d.id === t.dependsOn) : null;
    const proj = t.projectId ? projectNameByIdFunction(t.projectId) : '';
    const dl = dueLabelFunction(t.due);
    
    let filesHtml = '';
    if (t.files?.length) {
      const taskFiles = getTaskFilesFunction(t, ctx);
      const fileHtmls = await Promise.all(taskFiles.map(async f => {
        const label = f.label || f.name || 'File';
        const fileLink = typeof f === 'string' ? { abs_path: f } : f;
        const safeLink = escJsonForAttrFunction(fileLink);
        const icon = fileIconFunction(fileLink.abs_path || fileLink.onedrive_rel || fileLink.share_url || '');
        return `<a href="#" class="file-chip" data-path="${escAttrFunction(JSON.stringify(fileLink))}" style="font-size:10px;padding:2px 6px;">${icon} ${escFunction(label)}</a>`;
      }));
      filesHtml = `<div class="task-files" style="margin-top:6px;">${fileHtmls.join('')}</div>`;
    }
    
    return `<div class="task-card ${t.done?'done':''} ${blocked?'blocked':''}" data-priority="${t.priority}">
      <div class="task-top">
        <div class="task-content">
          <button type="button" class="check-box ${t.done?'checked':''}" data-action="task:toggle" data-task-id="${t.id}" style="background:none;border:none;padding:0;cursor:pointer;" title="Toggle task"></button>
          <div class="task-body" style="flex:1;">
            <div class="task-title">${escFunction(t.title)}</div>
            <div class="task-meta-row" style="margin-top:6px;">
              ${proj ? `<span class="due-tag">${escFunction(proj)}</span>` : ''}
              <span class="priority-tag ${t.priority}">${t.priority}</span>
              ${t.status ? `<span class="due-tag" style="background:var(--bg2);">${escFunction(t.status)}</span>` : ''}
              ${dl ? `<span class="due-tag ${dl.cls}"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>${escFunction(dl.text)}</span>` : ''}
              ${t.tags?.length ? '<span class="task-tags">' + t.tags.map(tag => '<span class="tag-chip" data-tag="' + escFunction(tag) + '">' + escFunction(tag) + '</span>').join('') + '</span>' : ''}
            </div>
            ${blocked ? `<div style="font-size:10px;color:var(--overdue);margin-top:4px;">🔒 Blocked by: ${depTask ? escFunction(depTask.title) : 'task'}</div>` : ''}
            ${filesHtml}
            <div style="margin-top:8px;display:flex;gap:4px;align-items:center;flex-wrap:wrap;">
              <span class="due-tag" style="background:var(--bg2);">No lane</span>
            </div>
          </div>
        </div>
        <div class="task-actions">
          <button type="button" class="btn-del" data-action="task:open-drawer" data-task-id="${t.id}" title="Open drawer" style="font-size:11px;">📝</button>
          <button type="button" class="btn-del" data-action="edit-task" data-task-id="${t.id}" data-is-subtask="${t.isSubtask || false}" data-project-id="${t.projectId || ''}" title="Edit">✎</button>
          <button type="button" class="btn-del btn-delete" data-action="delete" data-id="${String(t.id)}" data-task-id="${String(t.id)}" data-is-subtask="${t.isSubtask || false}" data-project-id="${t.projectId || ''}" title="Delete">×</button>
        </div>
      </div>
    </div>`;
  }));
  
  laneEl.innerHTML = `<div style="max-width:100%;">${cardsHtml.join('')}</div>`;
}
