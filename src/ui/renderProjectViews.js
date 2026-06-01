// ═══════════════════════ PROJECT VIEW RENDERING ═══════════════════════
// UI rendering functions for project view sections (timeline, protocols, cell log, etc.)

import { esc, escAttr, escJsonForDataAttr, fileIcon } from '../utils/strings.js';
import { findProjectById } from '../utils/projectHelpers.js';
import { parseDate, dueLabel, today } from '../utils/dates.js';
import { getMatrixStage, isTaskBlocked } from '../domain/models.js';
import { calculateProtocolDayIndex } from '../features/taskOperations.js';

/**
 * Render Today Timeline view
 */
export function renderTodayTimeline(ctx, project, projectTasks) {
  const { tasks, esc: escFn, parseDate: parseDateFn, dueLabel: dueLabelFn, calculateProtocolDayIndex: calcDayIndexFn, renderTaskItemCompact } = ctx;
  
  const contentEl = document.getElementById('today-timeline-content');
  if (!contentEl) return;
  
  const escFunction = escFn || esc;
  const parseDateFunction = parseDateFn || parseDate;
  const dueLabelFunction = dueLabelFn || dueLabel;
  const calcDayIndexFunction = calcDayIndexFn || calculateProtocolDayIndex;
  
  const todayDate = new Date();
  const dayName = todayDate.toLocaleDateString('en-US', { weekday: 'short' });
  const activeTasks = projectTasks.filter(t => !t.deletedAt && !t.done);
  
  // Group tasks by time block
  const timeBlocks = {
    'morning': [],
    'midday': [],
    'afternoon': [],
    'evening': [],
    'protocol': []
  };
  
  activeTasks.forEach(task => {
    if (task.protocol?.enabled) {
      timeBlocks.protocol.push(task);
    } else if (task.timeBlock) {
      if (timeBlocks[task.timeBlock]) {
        timeBlocks[task.timeBlock].push(task);
      }
    }
  });
  
  const protocolTasksToday = timeBlocks.protocol;
  
  let html = `<div style="font-size:13px;font-weight:600;color:var(--text);margin-bottom:16px;">Today (${dayName})</div>`;
  
  const timeBlockLabels = {
    'morning': '7:00–10:00 — Morning',
    'midday': '10:00–1:00 — Midday',
    'afternoon': '1:00–4:00 — Afternoon',
    'evening': '4:00–7:00 — Evening',
    'protocol': 'Protocol Steps Today'
  };
  
  Object.keys(timeBlocks).forEach(block => {
    const tasks = timeBlocks[block];
    if (tasks.length === 0 && block !== 'protocol') return;
    if (block === 'protocol' && protocolTasksToday.length === 0) return;
    
    html += '<div style="margin-bottom:16px;padding:12px;background:var(--bg2);border-left:3px solid var(--rose);border-radius:6px;">';
    html += `<div style="font-size:11px;font-weight:600;color:var(--text-dim);text-transform:uppercase;letter-spacing:.1em;margin-bottom:8px;">${timeBlockLabels[block] || block}</div>`;
    
    if (block === 'protocol') {
      protocolTasksToday.forEach(task => {
        const protocol = task.protocol;
        const dayIndex = task.protocol.dayIndex || calcDayIndexFunction(protocol.startAt);
        const steps = protocol.steps || [];
        const nextStep = steps.find(s => !s.done);
        
        html += '<div style="padding:8px;background:var(--surface);border-radius:4px;margin-bottom:6px;display:flex;align-items:flex-start;gap:8px;">';
        html += `<button type="button" class="check-box ${task.done?'checked':''}" data-action="task:toggle" data-task-id="${task.id}" style="flex-shrink:0;background:none;border:none;padding:0;cursor:pointer;margin-top:2px;" title="Toggle task"></button>`;
        html += '<div style="flex:1;min-width:0;">';
        html += `<div style="font-size:13px;color:var(--text);font-weight:500;">${escFunction(task.title)} (Day ${dayIndex})</div>`;
        if (nextStep) {
          html += `<div style="font-size:11px;color:var(--sage);margin-top:4px;">Next step: ${escFunction(nextStep.title)}</div>`;
        }
        html += '</div></div>';
      });
    } else {
      tasks.forEach(task => {
        html += renderTaskItemCompact ? renderTaskItemCompact(ctx, task) : renderTaskItemCompactFallback(task, escFunction, dueLabelFunction);
      });
    }
    
    html += '</div>';
  });
  
  if (html === `<div style="font-size:13px;font-weight:600;color:var(--text);margin-bottom:16px;">Today (${dayName})</div>`) {
    html += '<div style="text-align:center;padding:40px;color:var(--text-dim);font-size:12px;">No tasks scheduled for today. Add tasks with time blocks to see them here.</div>';
  }
  
  contentEl.innerHTML = html;
}

/**
 * Render Active Protocols view
 */
export function renderActiveProtocols(ctx, project, projectTasks) {
  const { esc: escFn, calculateProtocolDayIndex: calcDayIndexFn } = ctx;
  
  const contentEl = document.getElementById('active-protocols-content');
  if (!contentEl) return;
  
  const escFunction = escFn || esc;
  const calcDayIndexFunction = calcDayIndexFn || calculateProtocolDayIndex;
  
  const protocolTasks = projectTasks.filter(t => 
    !t.deletedAt && 
    !t.done && 
    t.protocol?.enabled === true
  );
  
  if (protocolTasks.length === 0) {
    contentEl.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-dim);font-size:12px;">No active protocols.</div>';
    return;
  }
  
  let html = '<div style="display:flex;flex-direction:column;gap:12px;">';
  protocolTasks.forEach(task => {
    const protocol = task.protocol;
    const startAt = protocol.startAt ? new Date(protocol.startAt) : null;
    const expectedEnd = protocol.expectedEndAt ? new Date(protocol.expectedEndAt) : null;
    
    let totalDays = 4; // default
    if (startAt && expectedEnd) {
      const diffTime = expectedEnd - startAt;
      totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
    
    const dayIndex = task.protocol.dayIndex || calcDayIndexFunction(protocol.startAt);
    const expectedEndStr = expectedEnd ? expectedEnd.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : '';
    
    const steps = protocol.steps || [];
    const nextStep = steps.find(s => !s.done);
    
    html += '<div style="padding:12px;background:var(--bg2);border:1px solid var(--border);border-radius:6px;display:flex;align-items:flex-start;gap:8px;">';
    html += `<button type="button" class="check-box ${task.done?'checked':''}" data-action="task:toggle" data-task-id="${task.id}" style="flex-shrink:0;background:none;border:none;padding:0;cursor:pointer;margin-top:2px;" title="Toggle task"></button>`;
    html += '<div style="flex:1;min-width:0;">';
    html += `<div style="font-size:14px;font-weight:600;color:var(--text);margin-bottom:6px;">${escFunction(task.title)}</div>`;
    html += `<div style="font-size:12px;color:var(--rose);margin-bottom:4px;font-weight:500;">Day ${dayIndex} of ${totalDays}</div>`;
    if (nextStep) {
      html += `<div style="font-size:12px;color:var(--sage);margin-bottom:4px;">Next step: ${escFunction(nextStep.title)}</div>`;
    }
    if (expectedEndStr) {
      html += `<div style="font-size:11px;color:var(--text-dim);">Expected completion: ${expectedEndStr}</div>`;
    }
    html += '</div></div>';
  });
  html += '</div>';
  
  contentEl.innerHTML = html;
}

/**
 * Render Cell Log view
 */
export function renderCellLog(ctx, project) {
  const { esc: escFn, escAttr: escAttrFn } = ctx;
  
  const contentEl = document.getElementById('cell-log-content');
  if (!contentEl) return;
  
  const escFunction = escFn || esc;
  const escAttrFunction = escAttrFn || escAttr;
  
  // Get available cell lines from settings
  const state = window.Petal?.store?.getState() || {};
  const settings = state.settings || {};
  const cellLogSettings = settings.cellLog || {};
  const availableCellLines = Array.isArray(cellLogSettings.cellTypes) ? cellLogSettings.cellTypes : [];
  
  // Get linked cell lines for this project
  const linkedCellLines = Array.isArray(project.linkedCellLines) ? project.linkedCellLines : [];
  
  // Build HTML
  let html = '';
  
  // Section 1: Linked Cell Lines
  html += '<div style="margin-bottom:16px;padding:12px;background:var(--bg2);border:1px solid var(--border);border-radius:6px;">';
  html += '<div style="font-size:11px;color:var(--text-dim);text-transform:uppercase;letter-spacing:.1em;margin-bottom:8px;">Linked Cell Lines</div>';
  
  // Add cell line dropdown and button
  html += '<div style="display:flex;gap:8px;margin-bottom:12px;align-items:flex-end;">';
  html += '<div style="flex:1;">';
  html += '<select id="cell-line-link-select" style="width:100%;padding:6px 8px;background:var(--surface);border:1px solid var(--border);border-radius:4px;font-size:12px;color:var(--text);">';
  html += '<option value="">Select a cell line...</option>';
  availableCellLines.forEach(cellLine => {
    if (!linkedCellLines.includes(cellLine)) {
      html += `<option value="${escFunction(cellLine)}">${escFunction(cellLine)}</option>`;
    }
  });
  html += '</select>';
  html += '</div>';
  html += `<button type="button" data-action="cell-log:link-cell-line" data-project-id="${escAttrFunction(String(project.id))}" style="padding:6px 12px;background:var(--rose);color:white;border:none;border-radius:4px;font-size:11px;cursor:pointer;font-weight:500;white-space:nowrap;">+ Add</button>`;
  html += '</div>';
  
  // Display linked cell lines
  if (linkedCellLines.length === 0) {
    html += '<div style="font-size:12px;color:var(--text-dim);font-style:italic;">No cell lines linked to this project</div>';
  } else {
    html += '<div style="display:flex;flex-wrap:gap:6px;">';
    linkedCellLines.forEach(cellLine => {
      html += '<div style="display:flex;align-items:center;gap:6px;padding:6px 10px;background:var(--surface);border:1px solid var(--border);border-radius:4px;">';
      html += `<span style="font-size:12px;color:var(--text);">${escFunction(cellLine)}</span>`;
      html += `<button type="button" data-action="cell-log:unlink-cell-line" data-project-id="${escAttrFunction(String(project.id))}" data-cell-line="${escAttrFunction(cellLine)}" style="background:none;border:none;color:var(--text-dim);cursor:pointer;font-size:14px;line-height:1;padding:0;width:16px;height:16px;display:flex;align-items:center;justify-content:center;" title="Remove">×</button>`;
      html += '</div>';
    });
    html += '</div>';
  }
  html += '</div>';
  
  // Section 2: Recent Cell Log Entries
  const cellLog = project.cellLog || [];
  const recentEntries = [...cellLog]
    .sort((a, b) => {
      const dateA = a.date ? new Date(a.date).getTime() : 0;
      const dateB = b.date ? new Date(b.date).getTime() : 0;
      return dateB - dateA;
    })
    .slice(0, 10);
  
  if (recentEntries.length > 0) {
    html += '<div style="font-size:11px;color:var(--text-dim);text-transform:uppercase;letter-spacing:.1em;margin-bottom:8px;">Recent Entries</div>';
    html += '<div style="display:flex;flex-direction:column;gap:8px;">';
    recentEntries.forEach(entry => {
      const date = entry.date ? new Date(entry.date) : new Date();
      const dateStr = date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' });
      
      html += '<div style="padding:10px;background:var(--bg2);border:1px solid var(--border);border-radius:6px;">';
      html += `<div style="font-size:11px;color:var(--text-dim);margin-bottom:4px;">${dateStr}</div>`;
      html += `<div style="font-size:13px;color:var(--text);">`;
      if (entry.line) {
        html += `<strong>${escFunction(entry.line)}</strong>`;
        if (entry.passage) html += ` P${entry.passage}`;
        if (entry.seededDensity) html += ` — ${entry.seededDensity}`;
        if (entry.location) html += ` (${escFunction(entry.location)})`;
      }
      if (entry.notes) {
        html += `<div style="margin-top:4px;font-size:12px;color:var(--text-dim);">${escFunction(entry.notes)}</div>`;
      }
      html += '</div>';
      html += '</div>';
    });
    html += '</div>';
  } else {
    html += '<div style="text-align:center;padding:20px;color:var(--text-dim);font-size:12px;">No cell log entries yet. Add entries to track cell culture work.</div>';
  }
  
  contentEl.innerHTML = html;
}

/**
 * Render Computational Window view
 */
export function renderCompWindow(ctx, project, projectTasks) {
  const { tasks, isTaskBlocked: isTaskBlockedFn, renderTaskItemCompact } = ctx;
  
  const contentEl = document.getElementById('comp-window-content');
  if (!contentEl) return;
  
  const isTaskBlockedFunction = isTaskBlockedFn || isTaskBlocked;
  
  const windowSelect = document.getElementById('comp-window-select');
  const availableWindow = parseInt(windowSelect?.value || 90);
  
  const compTasks = projectTasks.filter(t => {
    if (t.deletedAt || t.done) return false;
    if (t.lane !== 'comp') return false;
    if (isTaskBlockedFunction(t, tasks || [])) return false;
    const estimated = t.estimatedMinutes || 0;
    return estimated > 0 && estimated <= availableWindow;
  }).sort((a, b) => {
    const priorityA = typeof a.priority === 'number' ? a.priority : (a.priority === 'high' ? 3 : a.priority === 'low' ? 1 : 2);
    const priorityB = typeof b.priority === 'number' ? b.priority : (b.priority === 'high' ? 3 : b.priority === 'low' ? 1 : 2);
    if (priorityB !== priorityA) return priorityB - priorityA;
    return (a.estimatedMinutes || 0) - (b.estimatedMinutes || 0);
  });
  
  if (compTasks.length === 0) {
    contentEl.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-dim);font-size:12px;">No computational tasks fit in a ${availableWindow}-minute window.</div>`;
    return;
  }
  
  const escFunction = ctx.esc || esc;
  const dueLabelFunction = ctx.dueLabel || dueLabel;
  
  let html = `<div style="font-size:11px;color:var(--text-dim);margin-bottom:12px;font-style:italic;">Comp Window (${availableWindow} min):</div>`;
  html += '<div style="display:flex;flex-direction:column;gap:8px;">';
  compTasks.forEach(task => {
    html += renderTaskItemCompact ? renderTaskItemCompact(ctx, task) : renderTaskItemCompactFallback(task, escFunction, dueLabelFunction);
  });
  html += '</div>';
  
  contentEl.innerHTML = html;
}

/**
 * Render Deadlines Horizon view
 */
export function renderDeadlinesHorizon(ctx, project, projectTasks) {
  const { parseDate: parseDateFn, esc: escFn } = ctx;
  
  const contentEl = document.getElementById('deadlines-horizon-content');
  if (!contentEl) return;
  
  const parseDateFunction = parseDateFn || parseDate;
  const escFunction = escFn || esc;
  
  const activeTasks = projectTasks.filter(t => !t.deletedAt && !t.done && t.due);
  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);
  const weekFromNow = new Date(todayDate.getTime() + 7 * 24 * 60 * 60 * 1000);
  const monthFromNow = new Date(todayDate.getTime() + 30 * 24 * 60 * 60 * 1000);
  
  const dueIn7Days = activeTasks.filter(t => {
    const due = parseDateFunction(t.due);
    if (!due) return false;
    due.setHours(0, 0, 0, 0);
    return due <= weekFromNow && due >= todayDate;
  }).sort((a, b) => parseDateFunction(a.due) - parseDateFunction(b.due));
  
  const dueIn30Days = activeTasks.filter(t => {
    const due = parseDateFunction(t.due);
    if (!due) return false;
    due.setHours(0, 0, 0, 0);
    return due <= monthFromNow && due > weekFromNow;
  }).sort((a, b) => parseDateFunction(a.due) - parseDateFunction(b.due));
  
  let html = '';
  
  if (dueIn7Days.length > 0) {
    html += '<div style="margin-bottom:20px;">';
    html += '<div style="font-size:12px;font-weight:600;color:var(--overdue);text-transform:uppercase;letter-spacing:.1em;margin-bottom:8px;">Next 7 Days</div>';
    dueIn7Days.forEach(task => {
      const due = parseDateFunction(task.due);
      const dueStr = due.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      html += '<div style="padding:10px;background:var(--bg2);border:1px solid var(--border);border-radius:6px;margin-bottom:6px;display:flex;align-items:flex-start;gap:8px;">';
      html += `<button type="button" class="check-box ${task.done?'checked':''}" data-action="task:toggle" data-task-id="${task.id}" style="flex-shrink:0;background:none;border:none;padding:0;cursor:pointer;margin-top:2px;" title="Toggle task"></button>`;
      html += '<div style="flex:1;min-width:0;">';
      html += `<div style="font-size:13px;color:var(--text);font-weight:500;">${escFunction(task.title)}</div>`;
      html += `<div style="font-size:11px;color:var(--text-dim);margin-top:4px;">Due: ${dueStr}</div>`;
      html += '</div></div>';
    });
    html += '</div>';
  }
  
  if (dueIn30Days.length > 0) {
    html += '<div style="margin-bottom:20px;">';
    html += '<div style="font-size:12px;font-weight:600;color:var(--text-dim);text-transform:uppercase;letter-spacing:.1em;margin-bottom:8px;">Next 30 Days</div>';
    dueIn30Days.forEach(task => {
      const due = parseDateFunction(task.due);
      const dueStr = due.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      html += '<div style="padding:10px;background:var(--bg2);border:1px solid var(--border);border-radius:6px;margin-bottom:6px;display:flex;align-items:flex-start;gap:8px;">';
      html += `<button type="button" class="check-box ${task.done?'checked':''}" data-action="task:toggle" data-task-id="${task.id}" style="flex-shrink:0;background:none;border:none;padding:0;cursor:pointer;margin-top:2px;" title="Toggle task"></button>`;
      html += '<div style="flex:1;min-width:0;">';
      html += `<div style="font-size:13px;color:var(--text);font-weight:500;">${escFunction(task.title)}</div>`;
      html += `<div style="font-size:11px;color:var(--text-dim);margin-top:4px;">Due: ${dueStr}</div>`;
      html += '</div></div>';
    });
    html += '</div>';
  }
  
  if (!html) {
    html = '<div style="text-align:center;padding:40px;color:var(--text-dim);font-size:12px;">No upcoming deadlines.</div>';
  }
  
  contentEl.innerHTML = html;
}

/**
 * Render Active Artifacts Filtered view
 */
export function renderActiveArtifactsFiltered(ctx, project, projectTasks) {
  const { esc: escFn, escAttr: escAttrFn } = ctx;
  
  const contentEl = document.getElementById('active-artifacts-content');
  if (!contentEl) return;
  
  const escFunction = escFn || esc;
  const escAttrFunction = escAttrFn || escAttr;
  
  const artifacts = project.artifacts || [];
  const activeArtifacts = artifacts.filter(artifact => {
    const linkedTasks = projectTasks.filter(t => 
      artifact.subtasks && artifact.subtasks.includes(t.id) && !t.done
    );
    
    if (linkedTasks.length > 0) return true;
    
    const linkedFiles = (project.files || []).filter(f => {
      const fileObj = typeof f === 'object' ? f : { abs_path: f };
      return artifact.fileIds && artifact.fileIds.includes(fileObj.id);
    });
    
    const recentFiles = linkedFiles.filter(f => {
      const fileObj = typeof f === 'object' ? f : { abs_path: f };
      if (fileObj.updatedAt) {
        const updated = new Date(fileObj.updatedAt);
        const daysSince = (Date.now() - updated.getTime()) / (24 * 60 * 60 * 1000);
        return daysSince <= 7;
      }
      return false;
    });
    
    if (recentFiles.length > 0) return true;
    
    const lastUpdate = artifact.updatedAt ? new Date(artifact.updatedAt) : new Date(artifact.createdAt || 0);
    const daysSinceUpdate = (Date.now() - lastUpdate.getTime()) / (24 * 60 * 60 * 1000);
    if (daysSinceUpdate <= 30) return true;
    
    return false;
  });
  
  if (activeArtifacts.length === 0) {
    contentEl.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-dim);font-size:12px;">No active artifacts.</div>';
    return;
  }
  
  let html = '<div style="display:flex;flex-direction:column;gap:12px;">';
  activeArtifacts.forEach(artifact => {
    const linkedTasks = projectTasks.filter(t => 
      artifact.subtasks && artifact.subtasks.includes(t.id) && !t.done
    );
    const latestVersion = artifact.versionHistory && artifact.versionHistory.length > 0
      ? artifact.versionHistory[artifact.versionHistory.length - 1].version
      : artifact.status === 'finalized' ? 'v1.0' : 'v0.1';
    
    const typeIcons = {
      figure: '📊',
      dataset: '💾',
      build: '🔧',
      protocol: '🧪',
      manuscript: '📄'
    };
    const typeIcon = typeIcons[artifact.type] || '📦';
    
    html += `<button type="button" data-action="artifact:open-detail" data-artifact-id="${escAttrFunction(String(artifact.id))}" style="width:100%;text-align:left;padding:12px;background:var(--bg2);border:1px solid var(--border);border-radius:6px;cursor:pointer;transition:all .15s;" onmouseover="this.style.borderColor='var(--rose-soft)'" onmouseout="this.style.borderColor='var(--border)'">`;
    html += `<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">`;
    html += `<span style="font-size:18px;">${typeIcon}</span>`;
    html += `<div style="flex:1;"><div style="font-size:14px;font-weight:600;color:var(--text);">${escFunction(artifact.name)} – ${latestVersion}</div>`;
    if (linkedTasks.length > 0) {
      html += `<div style="font-size:11px;color:var(--sage);margin-top:2px;">${linkedTasks.length} active task${linkedTasks.length > 1 ? 's' : ''}</div>`;
    }
    html += '</div></div>';
    html += '</button>';
  });
  html += '</div>';
  
  contentEl.innerHTML = html;
}

/**
 * Render Active Files view
 */
export async function renderActiveFiles(ctx, project, projectTasks) {
  const { fileHistory, esc: escFn, escAttr: escAttrFn, escJsonForDataAttr: escJsonForDataAttrFn, fileIcon: fileIconFn, tasks, renderFileItem } = ctx;
  
  const contentEl = document.getElementById('active-files-content');
  if (!contentEl) return;
  
  const escFunction = escFn || esc;
  const escAttrFunction = escAttrFn || escAttr;
  const escJsonForDataAttrFunction = escJsonForDataAttrFn || escJsonForDataAttr;
  const fileIconFunction = fileIconFn || fileIcon;
  
  const allFiles = (project.files || []).filter(f => {
    const fileObj = typeof f === 'object' ? f : { abs_path: f };
    return !fileObj.deletedAt;
  });
  
  const currentFiles = allFiles.filter(f => {
    const fileObj = typeof f === 'object' ? f : { abs_path: f };
    return fileObj.versionCurrent || fileObj.pinned;
  }).slice(0, 5);
  
  const recentFiles = allFiles
    .map(f => {
      const fileObj = typeof f === 'object' ? f : { abs_path: f };
      const key = fileObj.onedrive_rel || fileObj.abs_path || fileObj.share_url || fileObj.id;
      const lastOpened = (fileHistory || {})[key]?.lastOpened || 0;
      return { file: f, lastOpened };
    })
    .sort((a, b) => b.lastOpened - a.lastOpened)
    .slice(0, 5)
    .map(item => item.file);
  
  const pinnedFiles = allFiles.filter(f => {
    const fileObj = typeof f === 'object' ? f : { abs_path: f };
    return fileObj.pinned === true;
  });
  
  let html = '';
  
  if (currentFiles.length > 0) {
    html += '<div style="margin-bottom:20px;">';
    html += '<div style="font-size:12px;font-weight:600;color:var(--text-dim);text-transform:uppercase;letter-spacing:.1em;margin-bottom:8px;">Current Files</div>';
    currentFiles.forEach(f => {
      html += renderFileItem ? renderFileItem(ctx, f, project, 'current') : renderFileItemFallback(f, project, 'current', escFunction, escAttrFunction, escJsonForDataAttrFunction, fileIconFunction, tasks);
    });
    html += '</div>';
  }
  
  if (recentFiles.length > 0) {
    html += '<div style="margin-bottom:20px;">';
    html += '<div style="font-size:12px;font-weight:600;color:var(--text-dim);text-transform:uppercase;letter-spacing:.1em;margin-bottom:8px;">Recently Modified</div>';
    recentFiles.forEach(f => {
      html += renderFileItem ? renderFileItem(ctx, f, project, 'recent') : renderFileItemFallback(f, project, 'recent', escFunction, escAttrFunction, escJsonForDataAttrFunction, fileIconFunction, tasks);
    });
    html += '</div>';
  }
  
  if (pinnedFiles.length > 0) {
    html += '<div style="margin-bottom:20px;">';
    html += '<div style="font-size:12px;font-weight:600;color:var(--text-dim);text-transform:uppercase;letter-spacing:.1em;margin-bottom:8px;">Pinned Outputs</div>';
    pinnedFiles.forEach(f => {
      html += renderFileItem ? renderFileItem(ctx, f, project, 'pinned') : renderFileItemFallback(f, project, 'pinned', escFunction, escAttrFunction, escJsonForDataAttrFunction, fileIconFunction, tasks);
    });
    html += '</div>';
  }
  
  const conflicts = detectFileConflicts(allFiles, escFunction);
  if (conflicts.length > 0) {
    html += '<div style="margin-top:20px;padding:12px;background:var(--rose-pale);border:1px solid var(--rose-soft);border-radius:6px;">';
    html += '<div style="font-size:11px;font-weight:600;color:var(--overdue);margin-bottom:6px;">⚠ Multiple similar versions exist</div>';
    conflicts.forEach(conflict => {
      html += `<div style="font-size:11px;color:var(--text);margin-bottom:4px;">${escFunction(conflict.baseName)}: ${conflict.files.length} versions</div>`;
    });
    html += '<div style="font-size:10px;color:var(--text-dim);margin-top:6px;">Mark one as Current to reduce confusion.</div>';
    html += '</div>';
  }
  
  if (!html) {
    html = '<div style="text-align:center;padding:40px;color:var(--text-dim);font-size:12px;">No files yet. Add files to track your work.</div>';
  }
  
  contentEl.innerHTML = html;
}

/**
 * Render Tasks section on the project (workflow matrix) page
 */
export function renderProjectTasks(ctx, project, projectTasks) {
  const contentEl = document.getElementById('project-tasks-content');
  if (!contentEl) return;

  const escFunction = ctx.esc || esc;
  const renderTaskItemFn = ctx.renderTaskItem || renderTaskItem;

  const visibleTasks = (projectTasks || []).filter(t => !t.deletedAt && !t.parentTaskId);

  if (visibleTasks.length === 0) {
    contentEl.innerHTML =
      '<div style="text-align:center;padding:24px;color:var(--text-dim);font-size:12px;">No tasks yet. Use <strong>+ Task</strong> to add one.</div>';
    return;
  }

  const sorted = [...visibleTasks].sort((a, b) => {
    if (!!a.done !== !!b.done) return a.done ? 1 : -1;
    return (a.title || '').localeCompare(b.title || '');
  });

  let html = '<div style="display:flex;flex-direction:column;gap:8px;">';
  sorted.forEach(task => {
    html += renderTaskItemFn(ctx, task);
  });
  html += '</div>';
  contentEl.innerHTML = html;
}

/**
 * Render Progress Momentum view
 */
export function renderProgressMomentum(ctx, project, projectTasks) {
  const { isTaskBlocked: isTaskBlockedFn, esc: escFn } = ctx;
  
  const contentEl = document.getElementById('progress-momentum-content');
  if (!contentEl) return;
  
  const isTaskBlockedFunction = isTaskBlockedFn || isTaskBlocked;
  const escFunction = escFn || esc;
  
  const totalTasks = projectTasks.filter(t => !t.deletedAt).length;
  const doneTasks = projectTasks.filter(t => !t.deletedAt && t.done).length;
  const activeTasks = projectTasks.filter(t => !t.deletedAt && !t.done && (t.status === 'Doing' || t.stage === 'doing' || t.stage === 'in_progress')).length;
  const blockedTasks = projectTasks.filter(t => !t.deletedAt && !t.done && isTaskBlockedFunction(t, ctx.tasks || [])).length;
  const plannedTasks = totalTasks - doneTasks - activeTasks - blockedTasks;
  
  const milestones = project.milestones || [];
  const doneMilestones = milestones.filter(m => m.done).length;
  const nextMilestone = milestones.find(m => !m.done);
  
  let html = '<div style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:16px;">';
  html += `<div style="flex:1;min-width:120px;"><div style="font-size:11px;color:var(--text-dim);text-transform:uppercase;letter-spacing:.1em;margin-bottom:4px;">Tasks</div>`;
  html += `<div style="font-size:24px;font-weight:600;color:var(--text);">${totalTasks} total</div>`;
  html += `<div style="font-size:12px;color:var(--text-dim);margin-top:4px;">${doneTasks} complete • ${activeTasks} active • ${blockedTasks} blocked • ${plannedTasks} planned</div>`;
  html += '</div>';
  
  if (milestones.length > 0) {
    html += `<div style="flex:1;min-width:120px;"><div style="font-size:11px;color:var(--text-dim);text-transform:uppercase;letter-spacing:.1em;margin-bottom:4px;">Milestones</div>`;
    html += `<div style="font-size:24px;font-weight:600;color:var(--text);">${doneMilestones}/${milestones.length}</div>`;
    if (nextMilestone) {
      html += `<div style="font-size:12px;color:var(--rose);margin-top:4px;font-weight:500;">Next: ${escFunction(nextMilestone.title)}</div>`;
    }
    html += '</div>';
  }
  
  html += '</div>';
  
  const progressPct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
  html += '<div style="margin-top:12px;">';
  html += '<div style="height:8px;background:var(--bg2);border-radius:4px;overflow:hidden;">';
  html += `<div style="height:100%;background:linear-gradient(90deg,var(--rose),var(--sage));width:${progressPct}%;transition:width .3s;"></div>`;
  html += '</div>';
  html += `<div style="font-size:11px;color:var(--text-dim);margin-top:4px;text-align:center;">${progressPct}% complete</div>`;
  html += '</div>';
  
  contentEl.innerHTML = html;
}

/**
 * Render Working Log view
 */
export function renderWorkingLog(ctx, project) {
  const { esc: escFn } = ctx;
  
  const contentEl = document.getElementById('working-log-content');
  if (!contentEl) return;
  
  const escFunction = escFn || esc;
  
  const log = project.workingLog || [];
  const sortedLog = [...log].sort((a, b) => {
    const dateA = a.at ? new Date(a.at).getTime() : 0;
    const dateB = b.at ? new Date(b.at).getTime() : 0;
    return dateB - dateA;
  });
  
  if (sortedLog.length === 0) {
    contentEl.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-dim);font-size:12px;">No log entries yet. Add entries to track your progress.</div>';
    return;
  }
  
  let html = '<div style="display:flex;flex-direction:column;gap:12px;">';
  sortedLog.forEach(entry => {
    const date = entry.at ? new Date(entry.at) : new Date();
    const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined });
    const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    
    html += '<div style="padding:12px;background:var(--bg2);border-left:3px solid var(--rose);border-radius:6px;">';
    html += `<div style="font-size:10px;color:var(--text-dim);margin-bottom:4px;">${dateStr} at ${timeStr}</div>`;
    html += `<div style="font-size:13px;color:var(--text);line-height:1.5;">${escFunction(entry.text || '')}</div>`;
    if (entry.fileIds && entry.fileIds.length > 0) {
      html += '<div style="font-size:10px;color:var(--text-dim);margin-top:6px;">📎 ' + entry.fileIds.length + ' file' + (entry.fileIds.length > 1 ? 's' : '') + '</div>';
    }
    html += '</div>';
  });
  html += '</div>';
  
  contentEl.innerHTML = html;
}

// Helper functions (fallbacks if not provided in ctx)

/**
 * Render a compact task item (used in timeline views)
 * @param {Object} ctx - Page context
 * @param {Object} task - Task object
 * @returns {string} HTML string
 */
export function renderTaskItemCompact(ctx, task) {
  const { esc: escFn, dueLabel: dueLabelFn } = ctx;
  const escFunction = escFn || esc;
  const dueLabelFunction = dueLabelFn || dueLabel;
  
  const tdl = dueLabelFunction(task.due, true, task.done);
  const estimated = task.estimatedMinutes ? `<span style="font-size:10px;color:var(--text-dim);margin-left:8px;">(${task.estimatedMinutes} min)</span>` : '';
  
  let html = '<div style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:var(--bg2);border:1px solid var(--border);border-radius:6px;margin-bottom:6px;">';
  html += `<button type="button" class="check-box ${task.done?'checked':''}" data-action="task:toggle" data-task-id="${task.id}" style="flex-shrink:0;background:none;border:none;padding:0;cursor:pointer;" title="Toggle task"></button>`;
  html += '<div style="flex:1;min-width:0;">';
  html += `<div style="font-size:13px;color:var(--text);display:flex;align-items:center;gap:6px;">${escFunction(task.title)}${estimated}</div>`;
  if (tdl) {
    html += `<div style="font-size:10px;color:var(--text-dim);margin-top:2px;">${escFunction(tdl.text)}</div>`;
  }
  html += '</div>';
  html += '</div>';
  return html;
}

/**
 * Render a task item with optional stale warning and dependency info
 * @param {Object} ctx - Page context
 * @param {Object} task - Task object
 * @param {boolean} isStale - Whether task is stale
 * @param {Object} depTask - Dependent task (if blocked)
 * @returns {string} HTML string
 */
export function renderTaskItem(ctx, task, isStale = false, depTask = null) {
  const { esc: escFn, dueLabel: dueLabelFn } = ctx;
  const escFunction = escFn || esc;
  const dueLabelFunction = dueLabelFn || dueLabel;
  
  const tdl = dueLabelFunction(task.due, true, task.done);
  const protocolBadge = task.protocol?.enabled ? (ctx.getProtocolBadge ? ctx.getProtocolBadge(task) : '') : '';
  const staleWarning = isStale ? '<span style="color:var(--overdue);font-size:10px;margin-left:8px;">⚠ Stale</span>' : '';
  
  let html = '<div style="display:flex;align-items:center;gap:8px;padding:10px 12px;background:var(--bg2);border:1px solid var(--border);border-radius:6px;margin-bottom:6px;">';
  html += `<button type="button" class="check-box ${task.done?'checked':''}" data-action="task:toggle" data-task-id="${task.id}" style="flex-shrink:0;background:none;border:none;padding:0;cursor:pointer;" title="Toggle task"></button>`;
  html += '<div style="flex:1;min-width:0;">';
  html += `<div style="font-size:13px;color:var(--text);display:flex;align-items:center;gap:6px;">${escFunction(task.title)}${protocolBadge}${staleWarning}</div>`;
  if (depTask) {
    html += `<div style="font-size:10px;color:var(--text-dim);margin-top:2px;">→ Waiting on: ${escFunction(depTask.title)}</div>`;
  }
  if (tdl) {
    html += `<div style="font-size:10px;color:var(--text-dim);margin-top:2px;">${escFunction(tdl.text)}</div>`;
  }
  html += '</div>';
  html += `<button data-action="edit-task" data-task-id="${task.id}" data-is-subtask="${task.isSubtask || false}" data-project-id="${task.projectId || ''}" style="padding:4px 8px;background:var(--surface);border:1px solid var(--border);border-radius:4px;color:var(--text-dim);font-size:10px;cursor:pointer;">Edit</button>`;
  html += '</div>';
  return html;
}

function renderTaskItemCompactFallback(task, escFn, dueLabelFn) {
  const tdl = dueLabelFn(task.due, true, task.done);
  const estimated = task.estimatedMinutes ? `<span style="font-size:10px;color:var(--text-dim);margin-left:8px;">(${task.estimatedMinutes} min)</span>` : '';
  
  let html = '<div style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:var(--bg2);border:1px solid var(--border);border-radius:6px;margin-bottom:6px;">';
  html += `<button type="button" class="check-box ${task.done?'checked':''}" data-action="task:toggle" data-task-id="${task.id}" style="flex-shrink:0;background:none;border:none;padding:0;cursor:pointer;" title="Toggle task"></button>`;
  html += '<div style="flex:1;min-width:0;">';
  html += `<div style="font-size:13px;color:var(--text);display:flex;align-items:center;gap:6px;">${escFn(task.title)}${estimated}</div>`;
  if (tdl) {
    html += `<div style="font-size:10px;color:var(--text-dim);margin-top:2px;">${escFn(tdl.text)}</div>`;
  }
  html += '</div>';
  html += '</div>';
  return html;
}

/**
 * Render a file item (used in project views)
 * @param {Object} ctx - Page context
 * @param {Object} file - File object
 * @param {Object} project - Project object
 * @param {string} type - File type ('current', 'recent', 'pinned', etc.)
 * @returns {string} HTML string
 */
export function renderFileItem(ctx, file, project, type) {
  const { esc: escFn, escAttr: escAttrFn, escJsonForDataAttr: escJsonForDataAttrFn, fileIcon: fileIconFn, tasks } = ctx;
  const escFunction = escFn || esc;
  const escAttrFunction = escAttrFn || escAttr;
  const escJsonForDataAttrFunction = escJsonForDataAttrFn || escJsonForDataAttr;
  const fileIconFunction = fileIconFn || fileIcon;
  
  const fileObj = typeof file === 'object' ? file : { abs_path: file };
  const label = fileObj.label || fileObj.name || 'File';
  const fileDataAttr = escJsonForDataAttrFunction(fileObj);
  const icon = fileIconFunction(fileObj.abs_path || fileObj.onedrive_rel || fileObj.share_url || '');
  const version = fileObj.versionCurrent || '';
  const isCurrent = type === 'current' || fileObj.versionCurrent;
  
  const linkedTasks = (tasks || []).filter(t => {
    if (!t.fileIds || !Array.isArray(t.fileIds)) return false;
    return t.fileIds.includes(fileObj.id);
  });
  
  let html = '<div style="display:flex;align-items:center;gap:8px;padding:10px 12px;background:var(--bg2);border:1px solid var(--border);border-radius:6px;margin-bottom:6px;">';
  html += `<span style="font-size:16px;flex-shrink:0;">${icon}</span>`;
  html += '<div style="flex:1;min-width:0;">';
  html += `<div style="font-size:13px;color:var(--text);font-weight:500;display:flex;align-items:center;gap:6px;">${escFunction(label)}`;
  if (isCurrent) {
    html += '<span style="font-size:10px;padding:2px 6px;background:var(--sage-pale);color:var(--sage);border-radius:10px;">Current</span>';
  }
  html += '</div>';
  if (version) {
    html += `<div style="font-size:10px;color:var(--rose);margin-top:2px;">v${escFunction(version)}</div>`;
  }
  if (linkedTasks.length > 0) {
    html += `<div style="font-size:10px;color:var(--text-dim);margin-top:2px;">Linked to ${linkedTasks.length} task${linkedTasks.length > 1 ? 's' : ''}</div>`;
  }
  html += '</div>';
  html += `<button type="button" class="file-open-btn" data-action="file:open" data-path="${escAttrFunction(JSON.stringify(fileObj))}" style="padding:4px 8px;background:var(--rose);color:white;border:none;border-radius:4px;font-size:10px;cursor:pointer;">Open</button>`;
  html += '</div>';
  return html;
}

function renderFileItemFallback(file, project, type, escFn, escAttrFn, escJsonForDataAttrFn, fileIconFn, tasks) {
  const fileObj = typeof file === 'object' ? file : { abs_path: file };
  const label = fileObj.label || fileObj.name || 'File';
  const fileDataAttr = escJsonForDataAttrFn(fileObj);
  const icon = fileIconFn(fileObj.abs_path || fileObj.onedrive_rel || fileObj.share_url || '');
  const version = fileObj.versionCurrent || '';
  const isCurrent = type === 'current' || fileObj.versionCurrent;
  
  const linkedTasks = (tasks || []).filter(t => {
    if (!t.fileIds || !Array.isArray(t.fileIds)) return false;
    return t.fileIds.includes(fileObj.id);
  });
  
  let html = '<div style="display:flex;align-items:center;gap:8px;padding:10px 12px;background:var(--bg2);border:1px solid var(--border);border-radius:6px;margin-bottom:6px;">';
  html += `<span style="font-size:16px;flex-shrink:0;">${icon}</span>`;
  html += '<div style="flex:1;min-width:0;">';
  html += `<div style="font-size:13px;color:var(--text);font-weight:500;display:flex;align-items:center;gap:6px;">${escFn(label)}`;
  if (isCurrent) {
    html += '<span style="font-size:10px;padding:2px 6px;background:var(--sage-pale);color:var(--sage);border-radius:10px;">Current</span>';
  }
  html += '</div>';
  if (version) {
    html += `<div style="font-size:10px;color:var(--rose);margin-top:2px;">v${escFn(version)}</div>`;
  }
  if (linkedTasks.length > 0) {
    html += `<div style="font-size:10px;color:var(--text-dim);margin-top:2px;">Linked to ${linkedTasks.length} task${linkedTasks.length > 1 ? 's' : ''}</div>`;
  }
  html += '</div>';
  html += `<button type="button" class="file-open-btn" data-action="file:open" data-path="${escAttrFn(JSON.stringify(fileObj))}" style="padding:4px 8px;background:var(--rose);color:white;border:none;border-radius:4px;font-size:10px;cursor:pointer;">Open</button>`;
  html += '</div>';
  return html;
}

/**
 * Detect file naming conflicts (files with similar base names)
 * @param {Array} files - Array of file objects
 * @param {Function} escFn - HTML escape function (optional)
 * @returns {Array} Array of conflict objects
 */
export function detectFileConflicts(files, escFn) {
  const conflicts = {};
  files.forEach(f => {
    const fileObj = typeof f === 'object' ? f : { abs_path: f };
    const name = fileObj.label || fileObj.name || '';
    const baseName = name.replace(/[_\-]?v?\d+[\.\-]?\d*[_\-]?(final|revised|FINAL|USE_THIS)?/gi, '').trim();
    if (baseName && baseName.length > 3) {
      if (!conflicts[baseName]) {
        conflicts[baseName] = { baseName, files: [] };
      }
      conflicts[baseName].files.push(fileObj);
    }
  });
  
  return Object.values(conflicts).filter(c => c.files.length > 1);
}

/**
 * Render Artifacts section
 */
export function renderArtifacts(ctx) {
  const { projects, esc: escFn, selectedProjectId: selectedProjectIdValue } = ctx;
  const escFunction = escFn || esc;
  
  const selectedProjectId = selectedProjectIdValue || (typeof window.selectedProjectId !== 'undefined' ? window.selectedProjectId : null);
  if (!selectedProjectId) return;
  
  const project = findProjectById(projects, selectedProjectId);
  if (!project) return;
  
  const contentEl = document.getElementById('artifacts-content');
  if (!contentEl) return;
  
  const artifacts = project.artifacts || [];
  const activeArtifacts = artifacts.filter(a => a.status !== 'archived');
  
  if (activeArtifacts.length === 0) {
    contentEl.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-dim);font-size:12px;">No artifacts yet. Create an artifact to group related files (e.g., "Figure 2A", "GelPredict GUI", "Dataset v1").</div>';
    return;
  }
  
  let html = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px;">';
  
  activeArtifacts.forEach(artifact => {
    const fileCount = artifact.fileIds ? artifact.fileIds.length : 0;
    const subtaskCount = artifact.subtasks ? artifact.subtasks.length : 0;
    const latestVersion = artifact.versionHistory && artifact.versionHistory.length > 0 
      ? artifact.versionHistory[artifact.versionHistory.length - 1].version 
      : null;
    const lastUpdated = artifact.updatedAt ? new Date(artifact.updatedAt).toLocaleDateString() : '';
    const isToday = artifact.updatedAt && new Date(artifact.updatedAt).toDateString() === new Date().toDateString();
    
    const statusColors = {
      draft: 'var(--text-dim)',
      active: 'var(--sage)',
      finalized: 'var(--rose)',
      archived: 'var(--text-light)'
    };
    const statusColor = statusColors[artifact.status] || 'var(--text-dim)';
    
    const typeIcons = {
      figure: '📊',
      dataset: '💾',
      build: '🔨',
      protocol: '📋',
      manuscript: '📄'
    };
    const typeIcon = typeIcons[artifact.type] || '📦';
    
    html += `<button type="button" data-action="artifact:open-detail" data-artifact-id="${artifact.id}" style="width:100%;text-align:left;background:var(--bg2);border:1px solid var(--border);border-radius:8px;padding:16px;cursor:pointer;transition:all .15s;" onmouseover="this.style.borderColor='var(--rose-soft)';this.style.transform='translateY(-2px)'" onmouseout="this.style.borderColor='var(--border)';this.style.transform='translateY(0)'">`;
    html += `<div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:10px;">`;
    html += `<span style="font-size:20px;flex-shrink:0;">${typeIcon}</span>`;
    html += `<div style="flex:1;min-width:0;">`;
    html += `<div style="font-size:15px;font-weight:600;color:var(--text);margin-bottom:4px;">${escFunction(artifact.name)}</div>`;
    if (artifact.description) {
      html += `<div style="font-size:12px;color:var(--text-dim);line-height:1.4;margin-bottom:6px;">${escFunction(artifact.description)}</div>`;
    }
    html += `</div>`;
    html += `<span style="font-size:10px;padding:3px 8px;background:${statusColor}20;color:${statusColor};border-radius:12px;text-transform:uppercase;letter-spacing:.08em;white-space:nowrap;flex-shrink:0;">${artifact.status}</span>`;
    html += `</div>`;
    html += `<div style="display:flex;flex-wrap:gap:8px;font-size:11px;color:var(--text-dim);margin-top:10px;padding-top:10px;border-top:1px solid var(--border);">`;
    if (latestVersion) {
      html += `<span>Version: <strong>${escFunction(latestVersion)}</strong></span>`;
    }
    html += `<span>📎 ${fileCount} file${fileCount !== 1 ? 's' : ''}</span>`;
    if (subtaskCount > 0) {
      html += `<span>✓ ${subtaskCount} task${subtaskCount !== 1 ? 's' : ''}</span>`;
    }
    if (lastUpdated) {
      html += `<span style="margin-left:auto;${isToday ? 'color:var(--sage);font-weight:500;' : ''}">${isToday ? 'Today' : lastUpdated}</span>`;
    }
    html += `</div>`;
    html += `</button>`;
  });
  
  html += '</div>';
  contentEl.innerHTML = html;
}

/**
 * Render Protocol Runs section (Lab Memory)
 */
export function renderProtocolRuns(ctx) {
  const { projects, esc: escFn, selectedProjectId: selectedProjectIdValue } = ctx;
  const escFunction = escFn || esc;
  
  const selectedProjectId = selectedProjectIdValue || (typeof window.selectedProjectId !== 'undefined' ? window.selectedProjectId : null);
  if (!selectedProjectId) return;
  
  const project = findProjectById(projects, selectedProjectId);
  if (!project) return;
  
  const contentEl = document.getElementById('protocol-runs-content');
  if (!contentEl) return;
  
  const runs = project.protocolRuns || [];
  const activeRuns = runs.filter(r => r.status === 'active' || r.status === 'paused');
  
  if (activeRuns.length === 0) {
    contentEl.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-dim);font-size:12px;">No active protocol runs. Create a protocol run for multi-day experiments (e.g., "dECM Digestion – Batch 4").</div>';
    return;
  }
  
  let html = '<div style="display:flex;flex-direction:column;gap:12px;">';
  
  activeRuns.forEach(run => {
    const startDate = run.startDate ? new Date(run.startDate) : null;
    const expectedEnd = run.expectedEndDate ? new Date(run.expectedEndDate) : null;
    const today = new Date();
    const daysElapsed = startDate ? Math.floor((today - startDate) / (1000 * 60 * 60 * 24)) + 1 : 0;
    const daysExpected = expectedEnd && startDate ? Math.floor((expectedEnd - startDate) / (1000 * 60 * 60 * 24)) : null;
    
    const linkedArtifact = run.linkedArtifactId 
      ? (project.artifacts || []).find(a => a.id === run.linkedArtifactId)
      : null;
    
    html += `<button type="button" data-action="protocol:open-run-detail" data-run-id="${run.id}" style="width:100%;text-align:left;background:var(--bg2);border:1px solid var(--border);border-radius:8px;padding:16px;cursor:pointer;transition:all .15s;" onmouseover="this.style.borderColor='var(--rose-soft)'" onmouseout="this.style.borderColor='var(--border)'">`;
    html += `<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;">`;
    html += `<div style="flex:1;">`;
    html += `<div style="font-size:15px;font-weight:600;color:var(--text);margin-bottom:4px;">${escFunction(run.protocolName)}</div>`;
    if (daysExpected) {
      html += `<div style="font-size:12px;color:var(--text-dim);">Day ${daysElapsed} of ${daysExpected}</div>`;
    } else if (daysElapsed > 0) {
      html += `<div style="font-size:12px;color:var(--text-dim);">Day ${daysElapsed}</div>`;
    }
    if (linkedArtifact) {
      html += `<div style="font-size:11px;color:var(--sage);margin-top:4px;">📦 Linked: ${escFunction(linkedArtifact.name)}</div>`;
    }
    html += `</div>`;
    html += `<span style="font-size:10px;padding:3px 8px;background:${run.status === 'active' ? 'var(--sage-pale)' : 'var(--bg)'};color:${run.status === 'active' ? 'var(--sage)' : 'var(--text-dim)'};border-radius:12px;text-transform:uppercase;letter-spacing:.08em;">${run.status}</span>`;
    html += `</div>`;
    if (run.dailyLog && run.dailyLog.length > 0) {
      const latestLog = run.dailyLog[run.dailyLog.length - 1];
      html += `<div style="margin-top:8px;padding-top:8px;border-top:1px solid var(--border);font-size:12px;color:var(--text-dim);line-height:1.4;">${escFunction(latestLog.entry || latestLog)}</div>`;
    }
    html += `</button>`;
  });
  
  html += '</div>';
  contentEl.innerHTML = html;
}

/**
 * Render Milestones Timeline
 */
export function renderMilestonesTimeline(ctx) {
  const {
    projects,
    esc: escFn,
    escAttr: escAttrFn,
    selectedProjectId: selectedProjectIdValue,
    normalizeProjectIdValue
  } = ctx;
  const escFunction = escFn || esc;
  const escAttrFunction = escAttrFn || escAttr;

  let selectedProjectId = selectedProjectIdValue ||
    (typeof window.selectedProjectId !== 'undefined' ? window.selectedProjectId : null);
  if (!selectedProjectId) {
    const selector = document.getElementById('matrix-project-select');
    if (selector?.value) {
      selectedProjectId = normalizeProjectIdValue
        ? normalizeProjectIdValue(selector.value)
        : selector.value;
    }
  }

  const timelineEl = document.getElementById('milestones-timeline');
  const legacyPanelEl = document.getElementById('project-milestones-panel-content');
  if (legacyPanelEl) {
    legacyPanelEl.innerHTML = '';
    legacyPanelEl.style.display = 'none';
  }
  if (!timelineEl) return;

  if (!selectedProjectId) {
    timelineEl.innerHTML =
      '<div style="font-size:12px;color:var(--text-dim);padding:40px;text-align:center;">Please select a project first</div>';
    return;
  }

  const project = findProjectById(projects, selectedProjectId);
  if (!project) {
    timelineEl.innerHTML =
      '<div style="font-size:12px;color:var(--text-dim);padding:40px;text-align:center;">Project not found</div>';
    return;
  }

  const milestones = project.milestones || [];
  const projectIdAttr = escAttrFunction(String(project.id));

  let html = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">';
  html += '<h3 style="font-size:14px;font-weight:600;color:var(--text);margin:0;">Milestones</h3>';
  html += '<button type="button" data-action="add-milestone" style="padding:6px 12px;background:var(--rose);color:white;border:none;border-radius:6px;font-size:12px;cursor:pointer;">＋ Add</button>';
  html += '</div>';

  if (milestones.length === 0) {
    html += '<div style="text-align:center;padding:40px;color:var(--text-dim);font-size:12px;">No milestones yet. Click Add to create one.</div>';
    timelineEl.innerHTML = html;
    return;
  }

  html += '<div style="position:relative;padding-left:24px;">';
  html += '<div style="position:absolute;left:8px;top:0;bottom:0;width:2px;background:var(--border);"></div>';

  milestones.forEach((m) => {
    const dueDate = m.dueDate ? new Date(m.dueDate).toLocaleDateString() : '';
    const milestoneIdAttr = escAttrFunction(String(m.id));
    html += '<div style="position:relative;margin-bottom:20px;">';
    html += `<div style="position:absolute;left:-20px;top:4px;width:12px;height:12px;border-radius:50%;background:${m.done ? 'var(--sage)' : 'var(--rose)'};border:2px solid var(--surface);"></div>`;
    html += '<div style="background:var(--bg2);border:1px solid var(--border);border-radius:8px;padding:12px;">';
    html += '<div style="display:flex;align-items:flex-start;gap:8px;">';
    html += `<input type="checkbox" ${m.done ? 'checked' : ''} data-action="milestone:toggle" data-project-id="${projectIdAttr}" data-milestone-id="${milestoneIdAttr}" style="margin-top:2px;cursor:pointer;">`;
    html += '<div style="flex:1;">';
    html += `<div style="font-size:14px;font-weight:500;color:var(--text);${m.done ? 'text-decoration:line-through;opacity:0.6;' : ''}">${escFunction(m.title)}</div>`;
    if (dueDate) {
      html += `<div style="font-size:11px;color:var(--text-dim);margin-top:4px;">Due: ${escFunction(dueDate)}</div>`;
    }
    if (m.linkedTaskIds?.length) {
      html += `<div style="font-size:11px;color:var(--text-dim);margin-top:4px;">Linked to ${m.linkedTaskIds.length} task(s)</div>`;
    }
    if (m.linkedFileIds?.length) {
      html += `<div style="font-size:11px;color:var(--text-dim);margin-top:4px;">Linked to ${m.linkedFileIds.length} file(s)</div>`;
    }
    html += '</div>';
    html += `<button type="button" data-action="milestone:delete" data-project-id="${projectIdAttr}" data-milestone-id="${milestoneIdAttr}" style="padding:4px 8px;background:var(--bg2);border:1px solid var(--border);border-radius:4px;color:var(--text-dim);font-size:10px;cursor:pointer;">Delete</button>`;
    html += '</div></div></div>';
  });

  html += '</div>';
  timelineEl.innerHTML = html;
}
