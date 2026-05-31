// ═══════════════════════ RENDER TODAY ═══════════════════════
// Data-driven Today view renderer matching LabOS layout
// Takes state and handlers as parameters - no store peeking

import { esc } from '../utils/strings.js';
import { projectNameById } from '../utils/projectHelpers.js';
import { today, parseDate } from '../utils/dates.js';
import { getAllTasks } from '../domain/models.js';

/**
 * Render Today view with full layout (sidebar, header, grid)
 * @param {HTMLElement} containerEl - Container element to render into
 * @param {Object} state - Current app state
 * @param {Object} handlers - Event handlers
 */
export function renderToday(containerEl, state, handlers) {
  if (!containerEl) return;

  const now = new Date();
  const dayName = now.toLocaleDateString(undefined, { weekday: "long" });
  const fullDate = now.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });

  // --- tasks for today ---
  const todayKey = now.toISOString().slice(0, 10); // YYYY-MM-DD
  const allTasks = getAllTasks(state.tasks || [], state.projects || []);

  const tasksToday = allTasks.filter(t => {
    if (!t) return false;
    if (t.done) return false;
    const dueKey = typeof t.due === "string" ? t.due.slice(0, 10) : "";
    return dueKey === todayKey;
  });

  const doneToday = allTasks.filter(t => {
    const dueKey = typeof t?.due === "string" ? t.due.slice(0, 10) : "";
    return dueKey === todayKey && t.done === true;
  });

  const activeProjects = (Array.isArray(state.projects) ? state.projects : []).filter(p => p && !p.done);
  const cellLogEntries = state?.settings?.cellLog?.entries || [];
  
  // Aggregate files from both standalone files and project files
  const standaloneFiles = Array.isArray(state.files) ? state.files : [];
  const projectFiles = (state.projects || []).flatMap(p => (p.files || []).map(f => ({ ...f, projectId: p.id, projectName: p.name })));
  const allFiles = [...standaloneFiles, ...projectFiles];
  
  // Sort by lastOpened or addedAt (most recent first) and take top 5
  const recentFiles = allFiles
    .sort((a, b) => {
      const aTime = a.lastOpened || a.addedAt || a.updatedAt || 0;
      const bTime = b.lastOpened || b.addedAt || b.updatedAt || 0;
      return bTime - aTime; // Most recent first
    })
    .slice(0, 5);
  const events = Array.isArray(state.events) ? state.events : [];
  const recurringRules = Array.isArray(state.recurringRules) ? state.recurringRules : [];

  // Build HTML with full layout (sidebar is now global, so we don't include it here)
  containerEl.innerHTML = `
    <div class="today-layout">
      <!-- HEADER -->
      <header class="today-header">
        <div class="today-header-date">
          <span class="today-day">${escapeHtml(dayName)}</span>
          <span class="today-full">${escapeHtml(fullDate)}</span>
        </div>
        <div class="today-header-right">
          <div style="display:flex;align-items:center;gap:6px">
            <div class="today-status-dot"></div>
            <span class="today-header-status">${escapeHtml(getStatusLine(state, cellLogEntries))}</span>
          </div>
          <button class="today-header-btn" data-action="quick-add">+ Quick Add</button>
        </div>
      </header>

      <!-- MAIN GRID -->
      <main class="today-main">
        <!-- STATS ROW -->
        <div class="today-stats-row">
          <div class="today-stat-card c1">
            <div class="today-stat-label">Tasks Today</div>
            <div class="today-stat-value">${doneToday.length}<span style="font-size:16px;color:var(--text-dim)">/${tasksToday.length + doneToday.length}</span></div>
            <div class="today-stat-sub">${Math.max(0, tasksToday.length)} remaining</div>
          </div>
          <div class="today-stat-card c2">
            <div class="today-stat-label">Active Projects</div>
            <div class="today-stat-value">${activeProjects.length}</div>
            <div class="today-stat-sub">${escapeHtml(getProjectDeadlineLine(activeProjects))}</div>
          </div>
          <div class="today-stat-card c3">
            <div class="today-stat-label">Cell Cultures</div>
            <div class="today-stat-value">${cellLogEntries.length}</div>
            <div class="today-stat-sub">${escapeHtml(getCultureAttentionLine(cellLogEntries))}</div>
          </div>
          <div class="today-stat-card c4">
            <div class="today-stat-label">Hours Logged</div>
            <div class="today-stat-value">—</div>
            <div class="today-stat-sub">time log not enabled</div>
          </div>
        </div>

        <!-- PLANNER -->
        ${renderScheduleCard(state, now, events, recurringRules)}

        <!-- TASKS -->
        <div class="today-card today-tasks-card">
          <div class="today-card-header">
            <div class="today-card-title">
              <span class="today-dot" style="background:var(--sage)"></span>
              Tasks Due Today
            </div>
            <span class="today-card-action" data-nav="tasks">All tasks →</span>
          </div>
          <div class="today-task-list">
            ${renderTodayTasks(tasksToday, doneToday, state.projects || [])}
          </div>
        </div>

        <!-- CELL LOG -->
        <div class="today-card today-cell-card">
          <div class="today-card-header">
            <div class="today-card-title">
              <span class="today-dot" style="background:var(--soon)"></span>
              Cell Log
            </div>
            <span class="today-card-action" data-nav="cell-log">All cultures →</span>
          </div>
          <div class="today-cell-entries">
            ${renderCellLogEntries(cellLogEntries)}
          </div>
        </div>

        <!-- PROJECTS -->
        <div class="today-card today-projects-card">
          <div class="today-card-header">
            <div class="today-card-title">
              <span class="today-dot" style="background:var(--sage)"></span>
              Active Projects
            </div>
            <span class="today-card-action" data-nav="projects">All →</span>
          </div>
          <div class="today-project-list">
            ${renderProjectsCard(activeProjects)}
          </div>
        </div>

        <!-- FILES -->
        <div class="today-card today-files-card">
          <div class="today-card-header">
            <div class="today-card-title">
              <span class="today-dot" style="background:var(--mauve)"></span>
              Recent Files
            </div>
            <span class="today-card-action" data-nav="files">Browse →</span>
          </div>
          <div class="today-file-list">
            ${renderFilesCard(recentFiles)}
          </div>
        </div>
      </main>
    </div>

    <button class="today-quick-add" title="Quick Add" data-action="quick-add">+</button>
  `;

  // Delegated clicks (one listener)
  containerEl.onclick = (e) => {
    const nav = e.target.closest("[data-nav]");
    if (nav) {
      e.preventDefault();
      const view = nav.getAttribute("data-nav");
      handlers?.switchView?.(view);
      return;
    }

    const actionEl = e.target.closest("[data-action]");
    if (actionEl) {
      const action = actionEl.getAttribute("data-action");
      if (action === "quick-add") {
        handlers?.quickAdd?.();
      }
      return;
    }

    const taskRow = e.target.closest(".today-task-item[data-task-id]");
    if (taskRow) {
      const taskId = taskRow.getAttribute("data-task-id");
      if (e.target.closest(".today-task-check")) {
        handlers?.toggleTask?.(taskId);
      } else {
        handlers?.editTask?.(taskId);
      }
    }

    const projectRow = e.target.closest(".today-project-item[data-project-id]");
    if (projectRow) {
      const projectId = projectRow.getAttribute("data-project-id");
      // Open the project view
      if (window.openProjectView) {
        window.openProjectView(projectId);
      } else if (window.selectProjectForMatrix) {
        // Fallback: use selectProjectForMatrix
        handlers?.switchView?.('projects');
        window.selectProjectForMatrix(projectId);
      } else {
        // Last resort: just switch to projects view
        handlers?.switchView?.('projects');
      }
    }

    const cellEntry = e.target.closest(".today-cell-entry[data-cell-id]");
    if (cellEntry) {
      handlers?.switchView?.('cell-log');
    }
  };
}

// --- helpers ---
function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getStatusLine(state, cellLogEntries) {
  const n = cellLogEntries.length;
  return `${n} culture${n !== 1 ? 's' : ''} active`;
}

function getProjectDeadlineLine(activeProjects) {
  const now = new Date();
  const weekFromNow = new Date(now);
  weekFromNow.setDate(now.getDate() + 7);
  
  const projectsThisWeek = activeProjects.filter(p => {
    if (!p.due) return false;
    const due = parseDate(p.due);
    if (!due) return false;
    return due >= now && due <= weekFromNow;
  });
  
  if (projectsThisWeek.length > 0) {
    return `${projectsThisWeek.length} deadline${projectsThisWeek.length > 1 ? 's' : ''} this week`;
  }
  return "—";
}

function getCultureAttentionLine(cellLogEntries) {
  const needsAttention = cellLogEntries.filter(e => 
    e.status === 'concern' || e.status === 'monitor'
  ).length;
  if (needsAttention > 0) {
    return `${needsAttention} need${needsAttention > 1 ? '' : 's'} attention`;
  }
  return "—";
}

function getEventsForDate(date, events, recurringRules) {
  const dateStr = date.toISOString().split('T')[0];
  const oneOff = (events || []).filter(e => {
    if (!e.date) return false;
    const eventDate = typeof e.date === 'string' ? e.date.slice(0, 10) : '';
    return eventDate === dateStr;
  });

  const expanded = [];
  const dayOfWeek = date.getDay();
  (recurringRules || []).forEach(rule => {
    if (rule.enabled === false) return;
    if (rule.daysOfWeek && rule.daysOfWeek.includes(dayOfWeek)) {
      expanded.push({
        id: `evt_${rule.id}_${dateStr}`,
        title: rule.title,
        date: dateStr,
        startTime: rule.startTime,
        durationMin: rule.durationMin,
        category: rule.category,
        location: rule.location || null,
        notes: rule.notes || ''
      });
    }
  });

  return [...oneOff, ...expanded];
}

function renderScheduleCard(state, now, events, recurringRules) {
  const todayDate = new Date(now);
  todayDate.setHours(0, 0, 0, 0);
  const todayEvents = getEventsForDate(todayDate, events, recurringRules);

  // Time slots: 08:00, 09:00, 10:00, 11:00, 12:00, 13:00, 14:00, 16:00, 18:00
  const slotTimes = [8, 9, 10, 11, 12, 13, 14, 16, 18];
  const slotHeight = 52; // pixels per slot
  
  // Calculate now line position
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const totalMinutes = hours * 60 + minutes;
  
  let nowLineTop = null;
  for (let i = 0; i < slotTimes.length; i++) {
    const slotStart = slotTimes[i] * 60;
    const slotEnd = i < slotTimes.length - 1 ? slotTimes[i + 1] * 60 : slotTimes[i] * 60 + 60;
    
    if (totalMinutes >= slotStart && totalMinutes < slotEnd) {
      const progress = (totalMinutes - slotStart) / (slotEnd - slotStart);
      nowLineTop = i * slotHeight + progress * slotHeight;
      break;
    }
  }

  // Map events to time slots
  const slotEvents = {};
  todayEvents.forEach(event => {
    const timeStr = event.startTime || event.time;
    if (timeStr) {
      const [h, m] = timeStr.split(':').map(Number);
      const eventMinutes = h * 60 + m;
      // Find closest slot
      for (let i = 0; i < slotTimes.length; i++) {
        const slotStart = slotTimes[i] * 60;
        const slotEnd = i < slotTimes.length - 1 ? slotTimes[i + 1] * 60 : slotTimes[i] * 60 + 60;
        if (eventMinutes >= slotStart && eventMinutes < slotEnd) {
          if (!slotEvents[i]) slotEvents[i] = [];
          slotEvents[i].push(event);
          break;
        }
      }
    }
  });

  const nowLineHtml = nowLineTop !== null 
    ? `<div class="today-now-line" style="top:${nowLineTop}px"></div>` 
    : '';

  const slotHtml = slotTimes.map((hour, idx) => {
    const timeStr = `${String(hour).padStart(2, '0')}:00`;
    const eventsInSlot = slotEvents[idx] || [];
    
    let eventHtml = '';
    if (eventsInSlot.length > 0) {
      const event = eventsInSlot[0]; // Show first event in slot
      const category = event.category || 'personal';
      const colorClass = category === 'lab' ? '' : category === 'comp' ? 'blue' : category === 'writing' ? 'orange' : 'pink';
      eventHtml = `
        <div class="today-slot-event ${colorClass}">
          <div class="today-slot-event-title">${escapeHtml(event.title || 'Event')}</div>
          <div class="today-slot-event-sub">${escapeHtml(event.location || '')}${(event.durationMin || event.duration) ? ` · ${event.durationMin || event.duration} min` : ''}</div>
        </div>
      `;
    }

    return `
      <div class="today-time-slot" ${idx === 4 && nowLineTop !== null ? 'style="position:relative"' : ''}>
        <div class="today-slot-time">${timeStr}</div>
        <div class="today-slot-content">${eventHtml}</div>
      </div>
    `;
  }).join('');

  return `
    <div class="today-card today-planner-card">
      <div class="today-card-header">
        <div class="today-card-title">
          <span class="today-dot" style="background:var(--rose)"></span>
          Today's Schedule
        </div>
        <span class="today-card-action" data-nav="planner">Week →</span>
      </div>
      <div class="today-time-slots" style="position:relative">
        ${nowLineHtml}
        ${slotHtml}
      </div>
    </div>
  `;
}

function renderTodayTasks(tasksToday, doneToday, projects) {
  const all = [...doneToday, ...tasksToday];
  if (all.length === 0) {
    return `
      <div class="today-task-item" style="cursor:default">
        <div class="today-task-body">
          <div class="today-task-name" style="color:var(--text-dim)">No tasks due today</div>
          <div class="today-task-meta"><span>Set a due date to populate this list.</span></div>
        </div>
      </div>
    `;
  }
  return all.map(t => {
    const id = String(t.id);
    const done = !!t.done;
    // Normalize projectId comparison to handle decimal projectIds
    let projectName = '';
    if (t.projectId) {
      projectName = projectNameById(projects, t.projectId);
    }
    const lane = t.lane || '';
    const tagClass = lane === 'lab' ? 'tag-green' : lane === 'comp' ? 'tag-blue' : 'tag-orange';
    return `
      <div class="today-task-item" data-task-id="${id}">
        <div class="today-task-check ${done ? "done" : ""}"></div>
        <div class="today-task-body">
          <div class="today-task-name ${done ? "done" : ""}">${escapeHtml(t.title || 'Untitled')}</div>
          <div class="today-task-meta">
            <span>${escapeHtml(projectName || "Independent")}</span>
            ${lane ? `<span class="today-task-tag ${tagClass}">${escapeHtml(lane)}</span>` : ''}
          </div>
        </div>
      </div>
    `;
  }).join("");
}

function renderCellLogEntries(entries) {
  if (entries.length === 0) {
    return `
      <div class="today-cell-entry" style="cursor:default">
        <div class="today-cell-name" style="color:var(--text-dim)">No cell cultures logged</div>
      </div>
    `;
  }
  
  return entries.slice(0, 4).map(entry => {
    // Format date if available
    const dateStr = entry.dayDone ? (() => {
      try {
        const date = new Date(entry.dayDone);
        if (!isNaN(date.getTime())) {
          return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }
      } catch (e) {}
      return entry.dayDone;
    })() : '';
    
    return `
      <div class="today-cell-entry" data-cell-id="${escapeHtml(String(entry.id || ''))}">
        <div class="today-cell-entry-header">
          <span class="today-cell-name">${escapeHtml(entry.cellType || 'Unknown')}</span>
          ${entry.passage !== null && entry.passage !== undefined && entry.passage !== '' ? `<span class="today-cell-passage">P${escapeHtml(String(entry.passage))}</span>` : ''}
        </div>
        ${entry.taskPerformed ? `
        <div class="today-cell-status-row">
          <span class="today-cell-badge" style="background:var(--bg2);color:var(--text-dim)">${escapeHtml(entry.taskPerformed)}</span>
        </div>
        ` : ''}
        <div class="today-cell-metrics">
          ${entry.confluence !== null && entry.confluence !== undefined ? `
          <div class="today-cell-metric">
            <span class="today-cell-metric-label">Confluence</span>
            <span class="today-cell-metric-value">${escapeHtml(String(entry.confluence))}%</span>
          </div>
          ` : ''}
          ${entry.viability !== null && entry.viability !== undefined ? `
          <div class="today-cell-metric">
            <span class="today-cell-metric-label">Viability</span>
            <span class="today-cell-metric-value">${escapeHtml(String(entry.viability))}%</span>
          </div>
          ` : ''}
          ${entry.plateType ? `
          <div class="today-cell-metric">
            <span class="today-cell-metric-label">Flask</span>
            <span class="today-cell-metric-value">${escapeHtml(entry.plateType)}</span>
          </div>
          ` : ''}
          ${entry.mediaType ? `
          <div class="today-cell-metric">
            <span class="today-cell-metric-label">Media</span>
            <span class="today-cell-metric-value">${escapeHtml(entry.mediaType)}</span>
          </div>
          ` : ''}
          ${entry.wellCount !== null && entry.wellCount !== undefined && entry.wellCount !== '' ? `
          <div class="today-cell-metric">
            <span class="today-cell-metric-label">Wells</span>
            <span class="today-cell-metric-value">${escapeHtml(String(entry.wellCount))}</span>
          </div>
          ` : ''}
          ${entry.isFrozen ? `
          <div class="today-cell-metric">
            <span class="today-cell-metric-label">Frozen</span>
            <span class="today-cell-metric-value">${entry.vialsCount ? `${escapeHtml(String(entry.vialsCount))} vials` : 'Yes'}</span>
          </div>
          ` : ''}
          ${dateStr ? `
          <div class="today-cell-metric">
            <span class="today-cell-metric-label">Date</span>
            <span class="today-cell-metric-value">${escapeHtml(dateStr)}</span>
          </div>
          ` : ''}
        </div>
        ${entry.notes ? `
        <div class="today-cell-notes" style="margin-top:8px;padding-top:8px;border-top:1px solid var(--border);font-size:11px;color:var(--text-dim);line-height:1.4;">
          ${escapeHtml(entry.notes)}
        </div>
        ` : ''}
      </div>
    `;
  }).join('');
}

function renderProjectsCard(activeProjects) {
  const top = activeProjects.slice(0, 4);
  if (top.length === 0) {
    return `
      <div class="today-project-item" style="cursor:default">
        <div><div class="today-project-name" style="color:var(--text-dim)">No active projects</div></div>
      </div>
    `;
  }
  
  return top.map(p => {
    // Calculate progress (simplified - could use task completion)
    const subtasks = p.subtasks || [];
    const doneSubtasks = subtasks.filter(s => s.done).length;
    const progress = subtasks.length > 0 ? Math.round((doneSubtasks / subtasks.length) * 100) : 0;
    
    // Count tasks
    const taskCount = subtasks.length;
    const connectedFiles = (p.files || []).length;
    
    // Format due date
    let dueText = 'No deadline';
    if (p.due) {
      const due = parseDate(p.due);
      if (due) {
        const now = new Date();
        const diff = Math.round((due - now) / 86400000);
        if (diff < 0) dueText = `Overdue`;
        else if (diff === 0) dueText = 'Due today';
        else if (diff <= 7) dueText = `Due in ${diff}d`;
        else dueText = due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }
    }
    
    return `
      <div class="today-project-item" data-project-id="${String(p.id)}">
        <div>
          <div class="today-project-name">${escapeHtml(p.name || 'Untitled')}</div>
          <div class="today-project-meta">${taskCount} task${taskCount !== 1 ? 's' : ''} · ${connectedFiles} connected · ${dueText}</div>
          <div class="today-project-progress-bar">
            <div class="today-project-progress-fill" style="width:${progress}%"></div>
          </div>
        </div>
        <div class="today-project-pct">${progress}%</div>
      </div>
    `;
  }).join("");
}

function renderFilesCard(files) {
  if (files.length === 0) {
    return `
      <div class="today-file-item" style="cursor:default">
        <div><div class="today-file-name" style="color:var(--text-dim)">No recent files</div></div>
      </div>
    `;
  }
  
  return files.map(f => {
    // Handle both file objects and file links (strings)
    const name = f.name || f.label || (typeof f === 'string' ? f.split('/').pop() : 'Untitled');
    const note = f.note || '';
    const projectName = f.projectName || '';
    const type = (f.type || name.split('.').pop() || '').toLowerCase();
    const iconClass = type.includes('pdf') ? 'pdf' : type.includes('png') || type.includes('jpg') || type.includes('tiff') ? 'img' : type.includes('r') || type.includes('py') ? 'data' : 'doc';
    const icon = iconClass === 'pdf' ? '📄' : iconClass === 'img' ? '🔬' : iconClass === 'data' ? '📊' : '📝';
    
    // Format time if available
    let timeText = '—';
    if (f.lastOpened || f.addedAt || f.updatedAt) {
      const time = f.lastOpened || f.addedAt || f.updatedAt;
      if (typeof time === 'number') {
        const date = new Date(time);
        const now = new Date();
        const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
        if (diffDays === 0) timeText = 'Today';
        else if (diffDays === 1) timeText = 'Yesterday';
        else if (diffDays < 7) timeText = `${diffDays}d ago`;
        else timeText = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }
    }
    
    return `
      <div class="today-file-item" data-file-id="${escapeHtml(String(f.id || ''))}" ${f.projectId ? `data-project-id="${f.projectId}"` : ''}>
        <div class="today-file-icon ${iconClass}">${icon}</div>
        <div>
          <div class="today-file-name">${escapeHtml(name)}</div>
          <div class="today-file-meta">${projectName ? escapeHtml(projectName) + ' · ' : ''}${escapeHtml(note || '')}</div>
        </div>
        <div class="today-file-time">${timeText}</div>
      </div>
    `;
  }).join("");
}
