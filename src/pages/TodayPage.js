// ═══════════════════════ TODAY PAGE ═══════════════════════
// Today view page with LabOS-style dashboard layout
// Takes state and handlers as parameters - no store peeking

import { esc } from '../utils/strings.js';
import { today, parseDate } from '../utils/dates.js';
import { getAllTasks } from '../domain/models.js';
import { setupEventDelegation } from '../app/delegation.js';

// Helper functions for planner format (matching planner daily view)
function parseTime(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

function formatTime(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

// Get all events for a specific date (one-off + expanded recurring)
function getEventsForDate(date, events, recurringRules) {
  const dateStr = date.toISOString().split('T')[0];
  
  // Get one-off events
  const oneOff = events.filter(e => e.date === dateStr);
  
  // Expand recurring rules for this date
  const expanded = [];
  const dayOfWeek = date.getDay();
  recurringRules.forEach(rule => {
    if (!rule.enabled) return;
    if (rule.daysOfWeek && rule.daysOfWeek.includes(dayOfWeek)) {
      expanded.push({
        id: `evt_${rule.id}_${dateStr}`,
        title: rule.title,
        date: dateStr,
        startTime: rule.startTime,
        durationMin: rule.durationMin,
        category: rule.category,
        location: rule.location || null,
        bufferBeforeMin: rule.bufferBeforeMin || 0,
        bufferAfterMin: rule.bufferAfterMin || 0,
        recurrenceId: rule.id,
        notes: rule.notes || '',
        linkedProjectId: rule.linkedProjectId || null,
        linkedTaskId: rule.linkedTaskId || null
      });
    }
  });
  
  return [...oneOff, ...expanded].sort((a, b) => {
    const aTime = parseTime(a.startTime || a.time || '00:00');
    const bTime = parseTime(b.startTime || b.time || '00:00');
    return aTime - bTime;
  });
}

/**
 * Render Today page
 * @param {HTMLElement} containerEl - Container element to render into
 * @param {Object} state - Current app state
 * @param {Object} handlers - Event handlers
 */
export async function renderTodayPage(containerEl, state, handlers) {
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
    if (t.deletedAt) return false; // Exclude deleted tasks
    const dueKey = typeof t.due === "string" ? t.due.slice(0, 10) : "";
    return dueKey === todayKey;
  });
  
  // Debug logging to help diagnose missing tasks (always log)
  const tasksWithProjectId = allTasks.filter(t => t.projectId && !t.deletedAt);
  const sampleTasks = tasksWithProjectId.slice(0, 5).map(t => {
    const dueKey = typeof t.due === "string" ? t.due.slice(0, 10) : "";
    const isToday = dueKey === todayKey;
    return {
      id: t.id,
      title: t.title?.substring(0, 30),
      projectId: t.projectId,
      due: t.due,
      dueKey: dueKey,
      isToday: isToday,
      done: t.done,
      deletedAt: t.deletedAt
    };
  });
  
  console.log('🔍 TodayPage: Tasks breakdown', {
    allTasksCount: allTasks.length,
    tasksWithProjectId: tasksWithProjectId.length,
    tasksTodayCount: tasksToday.length,
    todayKey,
    sampleTasks: sampleTasks
  });
  
  if (tasksToday.length === 0 && tasksWithProjectId.length > 0) {
    console.warn('⚠️ No tasks due today, but tasks exist with projectId');
    console.log('Sample tasks:', sampleTasks);
  }

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
            <div class="today-stat-value">${getActiveCellLinesCount(cellLogEntries)}</div>
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
            ${renderProjectsCard(activeProjects, state)}
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
        // Check if task belongs to a project - if so, open that project on click
        const task = (state.tasks || []).find(t => String(t.id) === String(taskId));
        if (task && task.projectId) {
          // Task belongs to a project - open that project
          if (window.openProjectView) {
            window.openProjectView(task.projectId);
          } else if (window.selectProjectForMatrix) {
            handlers?.switchView?.('projects');
            window.selectProjectForMatrix(task.projectId);
          } else {
            // Fallback: just edit the task
            handlers?.editTask?.(taskId);
          }
        } else {
          // Task has no project - edit it normally
          handlers?.editTask?.(taskId);
        }
      }
      return;
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
      return;
    }

    const cellEntry = e.target.closest(".today-cell-entry[data-cell-id]");
    if (cellEntry) {
      handlers?.switchView?.('cell-log');
    }
  };

  // Set up global event delegation (all hookups start here)
  // This ensures all app-wide event handlers are initialized when Today page loads
  // Only set up if not already set up (prevents stack overflow from recursive calls)
  if (!window._eventDelegationHandler) {
    setupEventDelegation();
  }
  
  // Add "Add block" buttons to schedule time slots (similar to planner)
  setTimeout(() => {
    const scheduleContainer = containerEl.querySelector('.today-time-slots');
    if (scheduleContainer) {
      const todayDateStr = now.toISOString().split('T')[0];
      const rows = scheduleContainer.querySelectorAll('.t-row');
      rows.forEach((row, index) => {
        const slot = row.querySelector('.t-slot');
        if (!slot) return;
        
        // Check if slot already has a ghost button
        if (slot.querySelector('.t-ghost')) return;
        
        const ghost = document.createElement('button');
        ghost.className = 't-ghost';
        ghost.textContent = '+ Add block';
        ghost.setAttribute('data-action', 'planner:open-add-event');
        ghost.setAttribute('data-date', todayDateStr);
        ghost.setAttribute('data-hour', index);
        ghost.onclick = (e) => {
          e.stopPropagation();
          if (typeof window.openAddEventModal === 'function') {
            window.openAddEventModal(todayDateStr);
            const startInput = document.getElementById('event-start-time');
            if (startInput) startInput.value = formatTime(index * 60);
            const durationInput = document.getElementById('event-duration');
            if (durationInput) durationInput.value = '60';
          }
        };
        slot.appendChild(ghost);
      });
    }
  }, 0);
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
  // Count unique active cell lines (not total entries)
  // A cell line is active if it has at least one non-frozen entry
  const activeCellTypes = new Set();
  cellLogEntries.forEach(entry => {
    if (entry.cellType && entry.isFrozen !== true) {
      activeCellTypes.add(entry.cellType);
    }
  });
  const n = activeCellTypes.size;
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

function getActiveCellLinesCount(cellLogEntries) {
  // Count unique active cell lines (not total entries)
  // A cell line is active if it has at least one non-frozen entry
  const activeCellTypes = new Set();
  cellLogEntries.forEach(entry => {
    if (entry.cellType && entry.isFrozen !== true) {
      activeCellTypes.add(entry.cellType);
    }
  });
  return activeCellTypes.size;
}

function getCultureAttentionLine(cellLogEntries) {
  // Count cell lines that need attention (have entries with concern/monitor status)
  // OR have low viability (< 70%) in recent entries
  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(now.getDate() - 30);
  
  const cellLinesNeedingAttention = new Set();
  
  cellLogEntries.forEach(entry => {
    if (!entry.cellType || entry.isFrozen === true) return;
    
    // Check if entry is recent (within 30 days)
    let isRecent = false;
    if (entry.dayDone) {
      try {
        const entryDate = new Date(entry.dayDone);
        isRecent = entryDate >= thirtyDaysAgo;
      } catch (e) {
        // Invalid date, skip
      }
    }
    
    // Check for concern/monitor status
    if (entry.status === 'concern' || entry.status === 'monitor') {
      cellLinesNeedingAttention.add(entry.cellType);
    }
    
    // Check for low viability in recent entries
    if (isRecent && entry.viability !== null && entry.viability !== undefined && entry.viability < 70) {
      cellLinesNeedingAttention.add(entry.cellType);
    }
  });
  
  const count = cellLinesNeedingAttention.size;
  if (count > 0) {
    return `${count} need${count > 1 ? '' : 's'} attention`;
  }
  return "—";
}

function renderScheduleCard(state, now, events, recurringRules) {
  // Get today's events using the same logic as planner
  const todayDate = new Date(now);
  todayDate.setHours(0, 0, 0, 0);
  const dayEvents = getEventsForDate(todayDate, events, recurringRules);
  
  // Use same format as planner daily view
  const PIXELS_PER_MINUTE = 1;
  const HOURS = Array.from({length: 24}, (_, i) => i); // 0-23 (all 24 hours)
  
  // Calculate total height (24 hours = 1440 minutes)
  const totalMinutes = 24 * 60;
  const maxHeight = Math.min(totalMinutes * PIXELS_PER_MINUTE, 600); // Limit to 600px for Today page
  
  // Build hour rows (exact same format as planner daily view)
  const hourRows = HOURS.map(h => {
    let timeLabel = '';
    if (h === 0) {
      timeLabel = '12am';
    } else if (h < 12) {
      timeLabel = `${h}am`;
    } else if (h === 12) {
      timeLabel = '12pm';
    } else {
      timeLabel = `${h - 12}pm`;
    }
    
    return `
      <div class="t-row" style="position:absolute;top:${h * 60 * PIXELS_PER_MINUTE}px;left:0;right:0;z-index:1;">
        <div class="t-label" style="font-size:8px;color:var(--text-muted);letter-spacing:0.05em;padding:4px 6px 0 0;text-align:right;flex-shrink:0;line-height:1;margin-top:-6px;width:42px;">${timeLabel}</div>
        <div class="t-slot" style="padding:5px 0 5px 14px;display:flex;flex-direction:column;gap:4px;position:relative;min-height:60px;"></div>
      </div>
    `;
  }).join('');
  
  // Add 15-minute interval markers (same as planner)
  const intervalMarkers = [];
  HOURS.forEach(h => {
    for (let q = 1; q < 4; q++) {
      const markerTop = (h * 60 * PIXELS_PER_MINUTE) + (q * 15 * PIXELS_PER_MINUTE);
      intervalMarkers.push(`
        <div style="position:absolute;top:${markerTop}px;left:52px;right:0;height:1px;background:var(--border);opacity:0.3;pointer-events:none;z-index:0;"></div>
      `);
    }
  });
  
  // Position events absolutely (exact same format as planner daily view)
  const eventBlocks = dayEvents.map(e => {
    // Handle both event formats: startTime/durationMin (planner) or time/duration (legacy)
    const startTime = e.startTime || e.time || '00:00';
    const durationMin = e.durationMin || e.duration || 60;
    const startMins = parseTime(startTime);
    const startHour = Math.floor(startMins / 60);
    
    // Only show events in visible hours (0-23)
    if (startHour < 0 || startHour >= 24) return '';
    
    const categoryColors = {personal: 'yellow', lab: 'red', equipment: 'green', travel: 'muted', writing: 'blue', comp: 'green'};
    const color = categoryColors[e.category] || 'muted';
    const timeStr = `${formatTime(parseTime(startTime))} – ${formatTime(parseTime(startTime) + durationMin)}`;
    
    // Get linked project and task info (same as planner)
    let linkedInfo = '';
    if (e.linkedProjectId && state.projects) {
      const project = state.projects.find(p => String(p.id) === String(e.linkedProjectId));
      if (project) {
        linkedInfo += `<span style="font-size:8px;color:var(--text-dim);">📁 ${escapeHtml(project.name)}</span>`;
      }
    }
    if (e.linkedTaskId && state.tasks) {
      const task = getAllTasks(state.tasks || [], state.projects || []).find(t => String(t.id) === String(e.linkedTaskId));
      if (task) {
        linkedInfo += `<span style="font-size:8px;color:var(--text-dim);margin-left:6px;">✓ ${escapeHtml(task.title)}</span>`;
      }
    }
    
    // Height based on exact duration (same as planner)
    const blockHeight = e.durationMin * PIXELS_PER_MINUTE;
    
    return `
      <div class="t-block ${color}" style="position:absolute;top:${startMins * PIXELS_PER_MINUTE}px;left:52px;right:0;z-index:2;height:${blockHeight}px;border-radius:10px;padding:10px 14px;border-left:3px solid transparent;cursor:pointer;transition:transform 0.13s,filter 0.13s;overflow:hidden;">
        <div class="t-block-title" style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-family:'Jost',sans-serif;font-size:11.5px;font-weight:600;color:var(--text);margin-bottom:3px;">
          <span>${escapeHtml(e.title || 'Event')}</span>
          <span style="font-size:9px;color:var(--text-dim);font-weight:400;white-space:nowrap;">${timeStr}</span>
        </div>
        ${linkedInfo ? `<div class="t-block-meta" style="display:flex;align-items:center;gap:4px;flex-wrap:wrap;margin-top:2px;font-size:8.5px;color:var(--text-dim);letter-spacing:0.03em;">${linkedInfo}</div>` : ''}
        ${e.location ? `<div class="t-block-meta" style="font-size:8.5px;color:var(--text-dim);letter-spacing:0.03em;">${escapeHtml(e.location)}</div>` : ''}
        <div class="t-block-footer" style="display:flex;align-items:center;gap:6px;margin-top:7px;">
          <span class="t-block-dur" style="font-size:8px;color:var(--text-muted);margin-left:auto;letter-spacing:0.04em;">${Math.round(durationMin / 60 * 10) / 10}h</span>
        </div>
      </div>
    `;
  }).join('');
  
  // Now marker (exact same as planner)
  const nowH = now.getHours() + now.getMinutes() / 60;
  const nowMarker = nowH >= 0 && nowH < 24
    ? `<div class="now-marker" style="position:absolute;top:${nowH * 60 * PIXELS_PER_MINUTE}px;left:52px;right:0;height:2px;background:var(--rose);z-index:10;box-shadow:0 0 4px var(--rose);"></div>`
    : '';

  return `
    <div class="today-card today-planner-card">
      <div class="today-card-header">
        <div class="today-card-title">
          <span class="today-dot" style="background:var(--rose)"></span>
          Today's Schedule
        </div>
        <span class="today-card-action" data-nav="planner">Week →</span>
      </div>
      <div class="today-time-slots" style="position:relative;min-height:${maxHeight}px;max-height:${maxHeight}px;overflow-y:auto;">
        ${hourRows}
        ${intervalMarkers.join('')}
        ${eventBlocks}
        ${nowMarker}
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
      const taskProjectIdNum = Number(t.projectId);
      const project = projects.find(p => {
        const pId = Number(p.id);
        if (!isNaN(taskProjectIdNum) && !isNaN(pId)) {
          // Compare integer parts for decimal projectIds
          return Math.floor(taskProjectIdNum) === Math.floor(pId);
        }
        // Fallback to string comparison
        return String(p.id) === String(t.projectId);
      });
      projectName = project?.name || '';
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
    
    const viability = entry.viability !== null && entry.viability !== undefined ? entry.viability : null;
    const viabilityColor = viability !== null 
      ? (viability >= 90 ? 'var(--sage)' : viability >= 70 ? 'var(--soon)' : 'var(--overdue)')
      : 'var(--border2)';
    
    return `
      <div class="today-cell-entry" data-cell-id="${escapeHtml(String(entry.id || ''))}">
        <div class="today-cell-entry-header">
          <span class="today-cell-name">${escapeHtml(entry.cellType || 'Unknown')}</span>
          ${entry.passage !== null && entry.passage !== undefined && entry.passage !== '' ? `<span class="today-cell-passage">P${escapeHtml(String(entry.passage))}</span>` : ''}
          ${dateStr ? `<span class="today-cell-date" style="margin-left:auto;font-size:11px;color:var(--text-dim);">${escapeHtml(dateStr)}</span>` : ''}
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
          ${viability !== null ? `
          <div class="today-cell-metric">
            <span class="today-cell-metric-label">Viability</span>
            <span class="today-cell-metric-value">${escapeHtml(String(viability))}%</span>
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
        </div>
        ${viability !== null ? `
        <div class="today-cell-viability-bar">
          <div class="today-cell-viability-fill" style="width:${viability}%;background:${viabilityColor}"></div>
        </div>
        ` : ''}
        ${entry.notes ? `
        <div class="today-cell-notes" style="margin-top:8px;padding-top:8px;border-top:1px solid var(--border);font-size:11px;color:var(--text-dim);line-height:1.4;">
          ${escapeHtml(entry.notes)}
        </div>
        ` : ''}
      </div>
    `;
  }).join('');
}

function renderProjectsCard(activeProjects, state) {
  if (activeProjects.length === 0) {
    return `
      <div class="today-project-item" style="cursor:default">
        <div><div class="today-project-name" style="color:var(--text-dim)">No active projects</div></div>
      </div>
    `;
  }
  
  // Get all tasks to count project tasks properly
  const allTasks = getAllTasks(state.tasks || [], state.projects || []);
  
  return activeProjects.map(p => {
    // Count all tasks for this project (including standalone tasks with projectId)
    const normalizedProjectId = String(p.id).trim();
    const projectIdAsNumber = Number(p.id);
    const projectTasks = allTasks.filter(t => {
      if (!t.projectId || t.deletedAt) return false;
      const taskProjectId = String(t.projectId).trim();
      // Try exact string match first
      if (taskProjectId === normalizedProjectId) return true;
      // If task projectId is a decimal number, check if the integer part matches
      const taskProjectIdNum = Number(t.projectId);
      if (!isNaN(taskProjectIdNum) && !isNaN(projectIdAsNumber)) {
        if (Math.floor(taskProjectIdNum) === Math.floor(projectIdAsNumber)) {
          return true;
        }
      }
      return false;
    });
    
    // Calculate progress from tasks
    const doneTasks = projectTasks.filter(t => t.done).length;
    const progress = projectTasks.length > 0 ? Math.round((doneTasks / projectTasks.length) * 100) : 0;
    
    // Count tasks (all tasks, not just subtasks)
    const taskCount = projectTasks.length;
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
