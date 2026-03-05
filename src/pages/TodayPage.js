// ═══════════════════════ TODAY PAGE ═══════════════════════
// Today view page with LabOS-style dashboard layout
// Takes state and handlers as parameters - no store peeking

import { esc } from '../utils/strings.js';
import { escapeHtml } from '../utils/strings.js';
import { today, parseDate, parseTime, formatTime, formatScheduledWork } from '../utils/dates.js';
import { getAllTasks } from '../domain/models.js';
import { setupEventDelegation } from '../app/delegation.js';
import { getTaskScheduledWorkForDisplay } from '../utils/taskEventConverter.js';
import { getEventsForDate } from '../utils/eventHelpers.js';
import { PageHeader } from '../ui/components.js';
import { getActiveHabits, isHabitChecked, shouldShowHabit } from '../features/habits.js';
import { getActiveRoutines, isRoutineChecked, shouldShowRoutine } from '../features/routines.js';

// Event calculation functions moved to shared utility: src/utils/eventHelpers.js
// Imported above to ensure consistency with Planner page
// parseTime and formatTime imported from dates.js (shared utility)

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
  
  // Goals with milestones due this month
  const goals = Array.isArray(state.goals) ? state.goals : [];
  const nowDate = new Date();
  const monthStart = `${nowDate.getFullYear()}-${String(nowDate.getMonth() + 1).padStart(2, '0')}-01`;
  const monthEnd = `${nowDate.getFullYear()}-${String(nowDate.getMonth() + 1).padStart(2, '0')}-${String(new Date(nowDate.getFullYear(), nowDate.getMonth() + 1, 0).getDate()).padStart(2, '0')}`;
  
  const goalsThisMonth = goals.filter(g => {
    if (g.progress >= 100) return false; // Skip completed goals
    const milestones = g.milestones || [];
    return milestones.some(ms => !ms.done && ms.date && ms.date >= monthStart && ms.date <= monthEnd);
  });

  // Habits and routines due today (same logic as Planner sidebar)
  const allHabits = getActiveHabits();
  const visibleHabits = allHabits.filter(h => shouldShowHabit(h, now));
  const allRoutines = getActiveRoutines();
  const visibleRoutines = allRoutines.filter(r => shouldShowRoutine(r, now));

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
            ${renderTodayTasks(tasksToday, doneToday, state.projects || [], state.events || [])}
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

        <!-- GOALS -->
        ${goalsThisMonth.length > 0 ? `
        <div class="today-card today-goals-card">
          <div class="today-card-header">
            <div class="today-card-title">
              <span class="today-dot" style="background:var(--rose)"></span>
              Goals This Month
            </div>
            <span class="today-card-action" data-nav="goals">All goals →</span>
          </div>
          <div class="today-goal-list">
            ${renderGoalsCard(goalsThisMonth, monthStart, monthEnd)}
          </div>
        </div>
        ` : ''}

        <!-- HABITS TODAY -->
        ${visibleHabits.length > 0 ? `
        <div class="today-card today-habits-card">
          <div class="today-card-header">
            <div class="today-card-title">
              <span class="today-dot" style="background:var(--mauve)"></span>
              Habits Today
            </div>
            <span class="today-card-action" data-nav="habits">All habits →</span>
          </div>
          <div class="today-habits-list">
            ${renderHabitsCard(visibleHabits, now)}
          </div>
        </div>
        ` : ''}

        <!-- ROUTINES TODAY -->
        ${visibleRoutines.length > 0 ? `
        <div class="today-card today-routines-card">
          <div class="today-card-header">
            <div class="today-card-title">
              <span class="today-dot" style="background:var(--soon)"></span>
              Routines Today
            </div>
            <span class="today-card-action" data-nav="routines">All routines →</span>
          </div>
          <div class="today-routines-list">
            ${renderRoutinesCard(visibleRoutines, now)}
          </div>
        </div>
        ` : ''}

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
      return;
    }

    const goalRow = e.target.closest(".today-goal-item[data-goal-id]");
    if (goalRow) {
      const goalId = goalRow.getAttribute("data-goal-id");
      // Navigate to Goals page and open the goal drawer
      handlers?.switchView?.('goals');
      // The Goals page will handle opening the drawer if needed
      setTimeout(() => {
        const goalEl = document.querySelector(`[data-gid="${goalId}"]`);
        if (goalEl) {
          goalEl.click();
        }
      }, 300);
      return;
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
            // Use setTimeout to ensure modal is fully rendered before setting values
            setTimeout(() => {
              const startInput = document.getElementById('event-start-time');
              if (startInput) startInput.value = formatTime(index * 60);
              const durationInput = document.getElementById('event-duration');
              if (durationInput) durationInput.value = '60';
              // Update end time after setting start time and duration
              if (typeof window.updateEventEndTimeFromDuration === 'function') {
                window.updateEventEndTimeFromDuration();
              }
            }, 0);
          }
        };
        slot.appendChild(ghost);
      });

      // Scroll to current time so the "now" line is in view (~150px from top)
      const nowMins = now.getHours() * 60 + now.getMinutes();
      const scrollTo = Math.max(0, Math.min(scheduleContainer.scrollHeight - scheduleContainer.clientHeight, nowMins - 150));
      scheduleContainer.scrollTop = scrollTo;
    }
  }, 0);
}

// --- helpers ---
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

/**
 * Render schedule card for Today page
 * Uses the SAME event calculation logic as Planner page via shared getEventsForDate utility
 * This ensures both pages show identical events and sync automatically when events change
 * 
 * @param {Object} state - App state (contains events, recurringRules, projects, tasks)
 * @param {Date} now - Current date/time
 * @param {Array} events - One-off events from state
 * @param {Array} recurringRules - Recurring rules from state
 * @returns {string} HTML for schedule card
 */
function renderScheduleCard(state, now, events, recurringRules) {
  // Get today's events using the SAME logic as planner (shared utility ensures consistency)
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
  // Event structure: { startTime, durationMin, category, title, location, linkedProjectId, linkedTaskId }
  const eventBlocks = dayEvents.map(e => {
    // Use standard format (startTime/durationMin) - same as planner
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

function renderTodayTasks(tasksToday, doneToday, projects, events = []) {
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
    const work = getTaskScheduledWorkForDisplay(t, events);
    const scheduledWork = work ? formatScheduledWork(work.scheduledDate, work.scheduledStartTime, work.scheduledDurationMin) : '';
    return `
      <div class="today-task-item" data-task-id="${id}">
        <div class="today-task-check ${done ? "done" : ""}"></div>
        <div class="today-task-body">
          <div class="today-task-name ${done ? "done" : ""}">${escapeHtml(t.title || 'Untitled')}</div>
          <div class="today-task-meta">
            <span>${escapeHtml(projectName || "Independent")}</span>
            ${lane ? `<span class="today-task-tag ${tagClass}">${escapeHtml(lane)}</span>` : ''}
            ${scheduledWork ? `<span class="today-task-tag" style="background:var(--sage-pale);color:var(--sage);">📅 ${escapeHtml(scheduledWork)}</span>` : ''}
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

function renderHabitsCard(visibleHabits, date) {
  return visibleHabits.slice(0, 6).map(habit => {
    const checked = isHabitChecked(habit.id, date);
    return `
      <div class="today-habit-item" data-action="habit-toggle" data-habit-id="${escapeHtml(habit.id)}" role="button" tabindex="0"
           style="display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:4px;cursor:pointer;transition:background 0.13s;">
        <input type="checkbox" ${checked ? 'checked' : ''} style="cursor:pointer;width:16px;height:16px;accent-color:var(--mauve);pointer-events:none;">
        <span style="font-size:13px;color:var(--text);${checked ? 'text-decoration:line-through;opacity:0.6;' : ''}">${escapeHtml(habit.name)}</span>
        ${habit.cadence === 'weekly' ? '<span style="font-size:10px;color:var(--text-dim);">(weekly)</span>' : ''}
      </div>
    `;
  }).join('');
}

function renderRoutinesCard(visibleRoutines, date) {
  return visibleRoutines.slice(0, 6).map(routine => {
    const checked = isRoutineChecked(routine.id, date);
    const meta = [routine.timeOfDay, routine.durationMin ? `${routine.durationMin}m` : ''].filter(Boolean).join(' · ');
    return `
      <div class="today-routine-item" data-action="routine-toggle" data-routine-id="${escapeHtml(routine.id)}" role="button" tabindex="0"
           style="display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:4px;cursor:pointer;transition:background 0.13s;">
        <input type="checkbox" ${checked ? 'checked' : ''} style="cursor:pointer;width:16px;height:16px;accent-color:var(--soon);pointer-events:none;">
        <span style="font-size:13px;color:var(--text);${checked ? 'text-decoration:line-through;opacity:0.6;' : ''}">${routine.icon || '📋'} ${escapeHtml(routine.name)}</span>
        ${meta ? `<span style="font-size:10px;color:var(--text-dim);">${escapeHtml(meta)}</span>` : ''}
      </div>
    `;
  }).join('');
}

function renderGoalsCard(goalsThisMonth, monthStart, monthEnd) {
  if (goalsThisMonth.length === 0) {
    return `
      <div class="today-goal-item" style="cursor:default">
        <div><div class="today-goal-name" style="color:var(--text-dim)">No milestones this month</div></div>
      </div>
    `;
  }
  
  // Flatten goals with their milestones due this month
  const items = goalsThisMonth.flatMap(g => {
    const milestones = (g.milestones || []).filter(ms => !ms.done && ms.date && ms.date >= monthStart && ms.date <= monthEnd);
    return milestones.map(ms => ({ goal: g, milestone: ms }));
  });
  
  if (items.length === 0) {
    return `
      <div class="today-goal-item" style="cursor:default">
        <div><div class="today-goal-name" style="color:var(--text-dim)">No milestones this month</div></div>
      </div>
    `;
  }
  
  // Sort by milestone date (earliest first)
  items.sort((a, b) => {
    if (!a.milestone.date) return 1;
    if (!b.milestone.date) return -1;
    return a.milestone.date.localeCompare(b.milestone.date);
  });
  
  // Format date helper
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr + 'T00:00:00');
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const milestoneDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const diffDays = Math.round((milestoneDate - today) / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) return 'Today';
      if (diffDays === 1) return 'Tomorrow';
      if (diffDays === -1) return 'Yesterday';
      if (diffDays > 0 && diffDays <= 7) return `In ${diffDays}d`;
      if (diffDays < 0 && diffDays >= -7) return `${Math.abs(diffDays)}d ago`;
      
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch (e) {
      return dateStr;
    }
  };
  
  return items.slice(0, 4).map(({ goal, milestone }) => {
    const pct = goal.progress || 0;
    const catColors = {
      career: 'var(--rose)',
      health: 'var(--sage)',
      mind: 'var(--mauve)',
      finance: 'var(--soon)',
      personal: '#7a9cbf',
      phd: '#8b7aa8',
      lab: '#7aa8a8'
    };
    const color = catColors[goal.cat] || 'var(--rose)';
    const dateText = formatDate(milestone.date);
    
    const milestoneTitleEsc = escapeHtml(milestone.title).replace(/"/g, '&quot;');
    return `
      <div class="today-goal-item" data-goal-id="${goal.id}" data-milestone="${escapeHtml(milestone.title)}">
        <div style="flex:1;min-width:0;">
          <div class="today-goal-name">
            <span style="font-size:14px;margin-right:6px;">${goal.emoji || '◎'}</span>
            ${escapeHtml(milestone.title)}
          </div>
          <div class="today-goal-meta">
            <span style="color:${color}">${escapeHtml(goal.name)}</span>
            ${dateText ? `<span style="font-size:10px;color:var(--text-dim);margin-right:8px;">${escapeHtml(dateText)}</span>` : ''}
            <span style="margin-left:auto;font-size:10px;color:var(--text-dim)">${pct}%</span>
          </div>
          <div class="today-goal-progress-bar">
            <div class="today-goal-progress-fill" style="width:${pct}%;background:${color}"></div>
          </div>
        </div>
        <button type="button" class="today-goal-add-btn" data-action="goal-add-to-today" data-goal-id="${escapeHtml(goal.id)}" data-milestone-title="${milestoneTitleEsc}" title="Add task due today">+ Today</button>
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
