// ═══════════════════════ TODAY PAGE ═══════════════════════
// Self-contained page module for Today View tab

import { esc, escJsonForDataAttr, fileIcon } from '../utils/strings.js';
import { getAllTasks } from '../domain/models.js';
import { getTaskFiles } from '../features/fileManagement.js';

/**
 * Parse date string to Date object
 */
function parseDate(s) {
  return s ? new Date(s + 'T00:00:00') : null;
}

/**
 * Get today's date (normalized to midnight)
 */
function today() {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return t;
}

/**
 * Generate due date label with styling class
 */
function dueLabel(due, small) {
  if (!due) return null;
  const d = parseDate(due);
  const t = today();
  const diff = Math.round((d - t) / 86400000);
  if (diff < 0) return { cls: 'overdue', text: `Overdue${small ? '' : ` by ${Math.abs(diff)}d`}` };
  if (diff === 0) return { cls: 'soon', text: 'Today' };
  if (diff <= 3) return { cls: 'soon', text: `In ${diff}d` };
  return { cls: '', text: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: d.getFullYear() !== t.getFullYear() ? 'numeric' : undefined }) };
}

/**
 * Get project name by ID
 */
function projectNameById(projects, projectId) {
  if (!projectId) return '';
  const project = projects.find((p) => String(p.id) === String(projectId));
  return project ? project.name : '';
}

/**
 * Get protocol badge HTML for a task
 */
function getProtocolBadge(task) {
  if (!task.protocol || !task.protocol.enabled) return '';
  
  const dayIndex = task.protocol.dayIndex || calculateProtocolDayIndex(task.protocol.startAt);
  const startDate = task.protocol.startAt ? new Date(task.protocol.startAt) : null;
  const endDate = task.protocol.expectedEndAt ? new Date(task.protocol.expectedEndAt) : null;
  
  let badgeText = `Protocol Day ${dayIndex}`;
  if (endDate && new Date() > endDate) {
    badgeText = 'Protocol ended';
  } else if (startDate && new Date() < startDate) {
    badgeText = 'Protocol pending';
  } else {
    badgeText = `Protocol Day ${dayIndex}`;
  }
  
  return `<span class="protocol-badge" style="display:inline-flex;align-items:center;gap:4px;padding:2px 8px;background:var(--sage-pale);color:var(--sage);border-radius:12px;font-size:10px;letter-spacing:.05em;text-transform:uppercase;cursor:pointer;" onclick="event.stopPropagation();window.Petal?.features?.taskDrawer?.openTaskDrawer(window.createPageContext(), ${task.id});window.Petal?.features?.taskDrawer?.switchTaskDrawerTab('protocol');" title="Click to view protocol">⚗️ ${badgeText}</span>`;
}

/**
 * Calculate protocol day index from start date
 */
function calculateProtocolDayIndex(startAt) {
  if (!startAt) return 1;
  const start = new Date(startAt);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  start.setHours(0, 0, 0, 0);
  const diff = Math.floor((today - start) / (1000 * 60 * 60 * 24));
  return Math.max(1, diff + 1);
}

/**
 * Render a single task card for the Today view
 */
export async function renderTodayTask(ctx, t, dl, proj) {
  const { tasks, projects } = ctx;
  
  // Handle subtasks - get project name if it's a subtask
  const projectName = t.isSubtask ? (t.projectName || projectNameById(projects, t.projectId)) : proj;
  
  let filesHtml = '';
  const taskFiles = getTaskFiles(ctx, t); // Use canonical registry
  if (taskFiles?.length) {
    const fileHtmls = await Promise.all(taskFiles.map(async f => {
      const label = f.label || f.name || 'File';
      const fileLink = typeof f === 'string' ? { abs_path: f } : f;
      const fileDataAttr = escJsonForDataAttr(fileLink);
      const icon = fileIcon(fileLink.abs_path || fileLink.onedrive_rel || fileLink.share_url || '');
      return `<a href="#" class="file-chip" data-file-link='${fileDataAttr}' onclick="event.preventDefault();window.openFile(JSON.parse(this.getAttribute('data-file-link')))">${icon} ${esc(label)}</a>`;
    }));
    filesHtml = `<div class="task-files">${fileHtmls.join('')}</div>`;
  }
  
  const toggleOnclick = t.isSubtask ? `window.Petal?.features?.taskOperations?.toggleSubtask(window.createPageContext(), ${t.projectId}, ${t.id})` : `window.Petal?.features?.taskOperations?.toggleTask(window.createPageContext(), ${t.id})`;
  return `<div class="task-card ${t.done ? 'done' : ''}" data-priority="${t.priority}">
    <div class="task-top">
      <div class="check-box ${t.done ? 'checked' : ''}" onclick="${toggleOnclick}"></div>
      <div class="task-body">
        <div class="task-title">${t.isSubtask ? '<span style="opacity:0.6;font-size:11px;">📁 ' + esc(projectName || 'Project') + ' →</span> ' : ''}${esc(t.title)}</div>
        <div class="task-meta-row">
          <span class="priority-tag ${t.priority}">${t.priority}</span>
          ${getProtocolBadge(t)}
          ${t.artifactTag ? '<span class="due-tag" style="background:var(--sage-pale);color:var(--sage);" title="Artifact: ' + esc(t.artifactTag) + '">🏷️ ' + esc(t.artifactTag) + '</span>' : ''}
          ${t.estimatedMinutes ? '<span class="due-tag" style="background:var(--blush);color:var(--mauve);" title="Estimated time">⏱️ ' + Math.round(t.estimatedMinutes / 60 * 10) / 10 + 'h</span>' : ''}
          ${projectName && !t.isSubtask ? '<span class="due-tag">' + esc(projectName) + '</span>' : ''}
          ${dl ? '<span class="due-tag ' + dl.cls + '"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>' + esc(dl.text) + '</span>' : ''}
          ${t.tags?.length ? '<span class="task-tags">' + t.tags.map(tag => '<span class="tag-chip" data-tag="' + esc(tag) + '">' + esc(tag) + '</span>').join('') + '</span>' : ''}
        </div>
        ${t.notes ? '<div class="task-notes-section"><div class="task-notes-toggle ' + (t.notes && t.notes.length > 100 ? '' : 'expanded') + '" onclick="window.toggleTaskNotes(' + t.id + ', this)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg><span>Notes</span></div><div class="task-notes-content ' + (t.notes && t.notes.length > 100 ? 'collapsed' : 'expanded') + '" id="notes-' + t.id + '"><div class="task-notes-full">' + esc(t.notes) + '</div></div></div>' : ''}
        ${filesHtml}
      </div>
      <button class="btn-del" onclick="window.Petal?.features?.taskDrawer?.openTaskDrawer(window.createPageContext(), ${t.id})" title="Open drawer (Notes, Files, Subtasks)">📝</button>
      <button class="btn-del" data-action="edit-task" data-task-id="${t.id}" data-is-subtask="${t.isSubtask || false}" data-project-id="${t.projectId || ''}" onclick="window.handleEditTaskAction(event, this)" title="Edit">✎</button>
      <button class="btn-del" data-action="delete-task" data-task-id="${t.id}" data-is-subtask="${t.isSubtask || false}" data-project-id="${t.projectId || ''}" onclick="window.handleDeleteTaskAction(event, this)" title="Delete">✕</button>
    </div>
  </div>`;
}

/**
 * Render the Today view page
 */
export async function renderToday(ctx) {
  const { tasks, projects } = ctx;
  const c = document.getElementById('today-container');
  if (!c) return;
  
  const todayDate = today();
  const weekFromNow = new Date(todayDate);
  weekFromNow.setDate(todayDate.getDate() + 7);
  const monthFromNow = new Date(todayDate);
  monthFromNow.setDate(todayDate.getDate() + 30);
  
  const allTasks = getAllTasks(tasks, projects).filter(t => !t.done);
  
  // Helper: Check if task is due soon (within 7 days)
  const isDueSoon = (task) => {
    const due = parseDate(task.due);
    if (!due) return false;
    due.setHours(0, 0, 0, 0);
    return due >= todayDate && due <= weekFromNow;
  };
  
  // Helper: Check if task is due in month
  const isDueInMonth = (task) => {
    const due = parseDate(task.due);
    if (!due) return false;
    due.setHours(0, 0, 0, 0);
    return due > weekFromNow && due <= monthFromNow;
  };
  
  // Lab today (lane === 'lab' + due today/soon)
  const labToday = allTasks.filter(t => {
    if (t.lane !== 'lab') return false;
    const due = parseDate(t.due);
    if (!due) return false;
    due.setHours(0, 0, 0, 0);
    return due >= todayDate && due <= weekFromNow; // Today or within week
  }).sort((a, b) => {
    const aDue = parseDate(a.due) || new Date(999999999999);
    const bDue = parseDate(b.due) || new Date(999999999999);
    return aDue - bDue;
  });
  
  // Comp window today (lane === 'comp' + due today/soon, pre-filtered by estimatedMinutes if available)
  const compToday = allTasks.filter(t => {
    if (t.lane !== 'comp') return false;
    const due = parseDate(t.due);
    if (!due) return false;
    due.setHours(0, 0, 0, 0);
    return due >= todayDate && due <= weekFromNow; // Today or within week
  }).sort((a, b) => {
    // Prefer tasks with estimatedMinutes (smaller windows first)
    if (a.estimatedMinutes && !b.estimatedMinutes) return -1;
    if (!a.estimatedMinutes && b.estimatedMinutes) return 1;
    if (a.estimatedMinutes && b.estimatedMinutes) {
      return a.estimatedMinutes - b.estimatedMinutes;
    }
    const aDue = parseDate(a.due) || new Date(999999999999);
    const bDue = parseDate(b.due) || new Date(999999999999);
    return aDue - bDue;
  });
  
  // Due soon (week/month) - talks/papers don't disappear
  const dueSoon = allTasks.filter(t => {
    const due = parseDate(t.due);
    if (!due) return false;
    due.setHours(0, 0, 0, 0);
    return due > todayDate && due <= monthFromNow;
  }).sort((a, b) => {
    const aDue = parseDate(a.due) || new Date(999999999999);
    const bDue = parseDate(b.due) || new Date(999999999999);
    return aDue - bDue;
  });
  
  // Overdue tasks
  const overdue = allTasks.filter(t => {
    const due = parseDate(t.due);
    if (!due) return false;
    return due < todayDate;
  });
  
  let html = '';
  
  // Overdue section (always show if exists)
  if (overdue.length > 0) {
    html += `<div class="today-section">
      <div class="today-section-header">
        <span class="today-section-title overdue">⚠️ Overdue (${overdue.length})</span>
      </div>`;
    const overdueHtml = await Promise.all(overdue.map(async t => {
      const dl = dueLabel(t.due);
      const proj = projectNameById(projects, t.projectId);
      return renderTodayTask(ctx, t, dl, proj);
    }));
    html += overdueHtml.join('');
    html += '</div>';
  }
  
  // Lab Today section
  if (labToday.length > 0) {
    const totalMinutes = labToday.reduce((sum, t) => sum + (t.estimatedMinutes || 0), 0);
    const timeDisplay = totalMinutes > 0 ? ` (~${Math.round(totalMinutes / 60 * 10) / 10}h)` : '';
    html += `<div class="today-section">
      <div class="today-section-header">
        <span class="today-section-title">🧪 Lab Today (${labToday.length}${timeDisplay})</span>
      </div>`;
    const labHtml = await Promise.all(labToday.map(async t => {
      const dl = dueLabel(t.due);
      const proj = projectNameById(projects, t.projectId);
      return renderTodayTask(ctx, t, dl, proj);
    }));
    html += labHtml.join('');
    html += '</div>';
  }
  
  // Comp Window Today section
  if (compToday.length > 0) {
    const totalMinutes = compToday.reduce((sum, t) => sum + (t.estimatedMinutes || 0), 0);
    const timeDisplay = totalMinutes > 0 ? ` (~${Math.round(totalMinutes / 60 * 10) / 10}h)` : '';
    html += `<div class="today-section">
      <div class="today-section-header">
        <span class="today-section-title">💻 Comp Window Today (${compToday.length}${timeDisplay})</span>
      </div>`;
    const compHtml = await Promise.all(compToday.map(async t => {
      const dl = dueLabel(t.due);
      const proj = projectNameById(projects, t.projectId);
      return renderTodayTask(ctx, t, dl, proj);
    }));
    html += compHtml.join('');
    html += '</div>';
  }
  
  // Due Soon (Next 7 days)
  const dueNext7Days = dueSoon.filter(t => isDueSoon(t));
  if (dueNext7Days.length > 0) {
    html += `<div class="today-section">
      <div class="today-section-header">
        <span class="today-section-title">📅 Due Next 7 Days (${dueNext7Days.length})</span>
      </div>`;
    const soonHtml = await Promise.all(dueNext7Days.map(async t => {
      const dl = dueLabel(t.due);
      const proj = projectNameById(projects, t.projectId);
      return renderTodayTask(ctx, t, dl, proj);
    }));
    html += soonHtml.join('');
    html += '</div>';
  }
  
  // Due Soon (Next 30 days) - talks/papers
  const dueNext30Days = dueSoon.filter(t => isDueInMonth(t));
  if (dueNext30Days.length > 0) {
    html += `<div class="today-section">
      <div class="today-section-header">
        <span class="today-section-title">📆 Due Next 30 Days (${dueNext30Days.length})</span>
      </div>`;
    const monthHtml = await Promise.all(dueNext30Days.map(async t => {
      const dl = dueLabel(t.due);
      const proj = projectNameById(projects, t.projectId);
      return renderTodayTask(ctx, t, dl, proj);
    }));
    html += monthHtml.join('');
    html += '</div>';
  }
  
  // Recently touched (tasks edited in last 7 days)
  const recentlyTouched = allTasks
    .filter(t => {
      if (t.updatedAt) {
        const updated = new Date(t.updatedAt);
        const daysAgo = (todayDate - updated) / (1000 * 60 * 60 * 24);
        return daysAgo <= 7;
      }
      return false;
    })
    .sort((a, b) => {
      const aUpdated = new Date(a.updatedAt || 0);
      const bUpdated = new Date(b.updatedAt || 0);
      return bUpdated - aUpdated;
    })
    .slice(0, 10);
  
  if (recentlyTouched.length > 0) {
    html += `<div class="today-section">
      <div class="today-section-header">
        <span class="today-section-title">🔄 Recently Touched (${recentlyTouched.length})</span>
      </div>`;
    const recentHtml = await Promise.all(recentlyTouched.map(async t => {
      const dl = dueLabel(t.due);
      const proj = projectNameById(projects, t.projectId);
      return renderTodayTask(ctx, t, dl, proj);
    }));
    html += recentHtml.join('');
    html += '</div>';
  }
  
  if (!html) {
    html = '<div class="empty-state">Nothing scheduled for today<small>Enjoy your free time!</small></div>';
  }
  
  c.innerHTML = html;
}
