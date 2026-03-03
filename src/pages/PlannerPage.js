// ═══════════════════════ PLANNER PAGE ═══════════════════════
// Planner view renderer - extracted from tasklist.html

import { renderPlannerGoals } from '../ui/renderPlannerGoals.js';
import { renderPlannerHabits } from '../ui/renderPlannerHabits.js';
import { renderPlannerRoutines } from '../ui/renderPlannerRoutines.js';
import { parseTime, formatTime } from '../utils/dates.js';
import { esc } from '../utils/strings.js';
import { expandRecurringRules, getEventsForDate } from '../utils/eventHelpers.js';
import { PageHeader } from '../ui/components.js';

/**
 * Get planner state from store state
 * Single source of truth - reads from state parameter
 */
function getPlannerState(state) {
  return {
    plannerViewDate: state.plannerViewDate || new Date(),
    plannerWeekOffset: state.plannerWeekOffset || 0,
    plannerCalYear: state.plannerCalYear !== null ? state.plannerCalYear : new Date().getFullYear(),
    plannerCalMonth: state.plannerCalMonth !== null ? state.plannerCalMonth : new Date().getMonth(),
    currentPlannerView: state.currentPlannerView || 'daily'
  };
}

// Event calculation functions moved to shared utility: src/utils/eventHelpers.js
// Imported above to ensure consistency with Today page

/**
 * Calculate available time blocks for a day
 * @param {Array} dayEvents - Events for the day
 * @returns {Array} Available and fixed time blocks
 */
function calculateAvailableBlocks(dayEvents) {
  const dayStart = 0; // Midnight (0:00) in minutes
  const dayEnd = 24 * 60; // 11:59 PM (1440 minutes) - full 24-hour day
  
  // Sort events by start time
  const sorted = [...dayEvents].sort((a, b) => {
    const aStart = parseTime(a.startTime) + (a.bufferBeforeMin || 0);
    const bStart = parseTime(b.startTime) + (b.bufferBeforeMin || 0);
    return aStart - bStart;
  });
  
  const blocks = [];
  let current = dayStart;
  
  sorted.forEach(event => {
    const eventStart = parseTime(event.startTime);
    const bufferBefore = event.bufferBeforeMin || 0;
    const bufferAfter = event.bufferAfterMin || 0;
    const eventEnd = eventStart + event.durationMin + bufferAfter;
    const actualStart = eventStart - bufferBefore;
    
    if (actualStart > current) {
      blocks.push({
        type: 'available',
        start: current,
        end: actualStart,
        duration: actualStart - current
      });
    }
    
    blocks.push({
      type: 'fixed',
      start: actualStart,
      end: eventEnd,
      duration: eventEnd - actualStart,
      event: event
    });
    
    current = Math.max(current, eventEnd);
  });
  
  if (current < dayEnd) {
    blocks.push({
      type: 'available',
      start: current,
      end: dayEnd,
      duration: dayEnd - current
    });
  }
  
  return blocks;
}

/**
 * Detect overlaps and tight transitions
 * @param {Array} dayEvents - Events for the day
 * @returns {Array} Conflicts detected
 */
function detectConflicts(dayEvents) {
  const conflicts = [];
  const sorted = [...dayEvents].sort((a, b) => {
    const aStart = parseTime(a.startTime) - (a.bufferBeforeMin || 0);
    const bStart = parseTime(b.startTime) - (b.bufferBeforeMin || 0);
    return aStart - bStart;
  });
  
  for (let i = 0; i < sorted.length - 1; i++) {
    const current = sorted[i];
    const next = sorted[i + 1];
    const currentEnd = parseTime(current.startTime) + current.durationMin + (current.bufferAfterMin || 0);
    const nextStart = parseTime(next.startTime) - (next.bufferBeforeMin || 0);
    
    if (currentEnd > nextStart) {
      conflicts.push({
        type: 'overlap',
        event1: current,
        event2: next,
        overlapMinutes: currentEnd - nextStart
      });
    } else if (currentEnd < nextStart && (nextStart - currentEnd) < 15) {
      conflicts.push({
        type: 'tight',
        event1: current,
        event2: next,
        gapMinutes: nextStart - currentEnd
      });
    }
  }
  
  return conflicts;
}

/**
 * Render the planner page
 * @param {HTMLElement} containerEl - Container element
 * @param {Object} state - App state
 * @param {Object} handlers - Event handlers
 */
export async function renderPlannerPage(containerEl, state, handlers) {
  // CONTRACT: containerEl is required - no global fallback
  if (!containerEl) {
    console.error('❌ renderPlannerPage: containerEl is required (no global fallback allowed)');
    return;
  }

  // Calculate planner stats
  const events = Array.isArray(state.events) ? state.events : [];
  const recurringRules = Array.isArray(state.recurringRules) ? state.recurringRules : [];
  const activeRecurring = recurringRules.filter(r => r && r.enabled);
  const totalEvents = events.length + activeRecurring.length;
  
  // Create or find header - must be first element
  let plannerHeader = containerEl.querySelector('.page-header');
  if (!plannerHeader) {
    plannerHeader = document.createElement('header');
    plannerHeader.className = 'page-header';
    // Insert at the very beginning of the container, before any existing content
    const firstChild = containerEl.firstChild;
    if (firstChild && firstChild.nodeType === 1) { // Element node
      containerEl.insertBefore(plannerHeader, firstChild);
    } else {
      containerEl.insertBefore(plannerHeader, containerEl.firstChild);
    }
  }
  
  // Render header using standard component
  plannerHeader.innerHTML = PageHeader({
    title: 'Planner',
    icon: '📅',
    status: `${events.length} event${events.length !== 1 ? 's' : ''} · ${activeRecurring.length} recurring`,
    actions: []
  });

  // Get planner state from store (single source of truth)
  const plannerState = getPlannerState(state);
  
  // Initialize planner state if needed
  if (!plannerState.plannerViewDate || plannerState.plannerViewDate.toString() === 'Invalid Date') {
    if (handlers?.setPlannerViewDate) {
      handlers.setPlannerViewDate(new Date());
    }
    if (handlers?.setPlannerWeekOffset) {
      handlers.setPlannerWeekOffset(0);
    }
    if (handlers?.setPlannerCalYear) {
      handlers.setPlannerCalYear(new Date().getFullYear());
    }
    if (handlers?.setPlannerCalMonth) {
      handlers.setPlannerCalMonth(new Date().getMonth());
    }
  }

  // Ensure day view is active by default
  if (!plannerState.currentPlannerView || plannerState.currentPlannerView === 'weekly') {
    if (handlers?.setCurrentPlannerView) {
      handlers.setCurrentPlannerView('daily');
    }
  }

  // Initialize the view switcher - MUST be scoped to containerEl
  const dayBtn = containerEl.querySelector('#planner-vbtn-day') || containerEl.querySelector('[data-planner-view-btn="day"]');
  const weekBtn = containerEl.querySelector('#planner-vbtn-week') || containerEl.querySelector('[data-planner-view-btn="week"]');
  
  // Update button states based on current view
  const currentView = plannerState.currentPlannerView || 'daily';
  if (dayBtn && weekBtn) {
    if (currentView === 'daily') {
      dayBtn.classList.add('active');
      weekBtn.classList.remove('active');
    } else {
      dayBtn.classList.remove('active');
      weekBtn.classList.add('active');
    }
  }

  const dayView = containerEl.querySelector('#planner-view-day') || containerEl.querySelector('[data-planner-view="day"]');
  const weekView = containerEl.querySelector('#planner-view-week') || containerEl.querySelector('[data-planner-view="week"]');
  if (dayView) dayView.style.display = currentView === 'daily' ? 'flex' : 'none';
  if (weekView) weekView.style.display = currentView === 'weekly' ? 'flex' : 'none';

  // Update period label - use container-scoped selector
  const periodLabel = containerEl.querySelector('#planner-period-label') || containerEl.querySelector('[data-planner-period-label]');
  if (periodLabel) {
    updatePlannerPeriodLabel(periodLabel, plannerState);
  }

  // Render planner content - use local renderPlanner function, NOT window.renderPlanner
  if (currentView === 'weekly') {
    await renderWeeklyPlanner(containerEl, state, handlers);
  } else {
    await renderDailyPlanner(containerEl, state, handlers);
  }

  // Build sidebar and calendar in background - scoped to container
  // Note: These functions are still global during migration, but will be extracted
  setTimeout(() => {
    if (typeof window.buildPlannerSidebar === 'function') {
      window.buildPlannerSidebar();
    }
    if (typeof window.buildPlannerCalendar === 'function') {
      window.buildPlannerCalendar();
    }
  }, 0);

  // Ensure goals, habits, and routines render - scoped to container (same integration pattern as Today page)
  setTimeout(() => {
    const goalsContainer = containerEl.querySelector('#planner-goals-card') || containerEl.querySelector('[data-planner-goals]');
    const habitsContainer = containerEl.querySelector('#planner-habits-card') || containerEl.querySelector('[data-planner-habits]');
    const routinesContainer = containerEl.querySelector('#planner-routines-card') || containerEl.querySelector('[data-planner-routines]');
    
    const viewDate = plannerState.plannerViewDate || new Date();
    if (goalsContainer && renderPlannerGoals) {
      renderPlannerGoals(goalsContainer, state, viewDate);
    }
    if (habitsContainer && renderPlannerHabits) {
      renderPlannerHabits(habitsContainer, state, viewDate);
    }
    if (routinesContainer && renderPlannerRoutines) {
      renderPlannerRoutines(routinesContainer, state, viewDate);
    }
  }, 100);
}

/**
 * Main planner render function
 * Delegates to daily or weekly renderer
 * @param {HTMLElement} containerEl - Container element
 * @param {Object} state - App state
 * @param {Object} handlers - Event handlers
 */
async function renderPlanner(containerEl, state, handlers) {
  const plannerState = getPlannerState(state);
  const currentView = plannerState.currentPlannerView || 'daily';
  if (currentView === 'weekly') {
    await renderWeeklyPlanner(containerEl, state, handlers);
  } else {
    await renderDailyPlanner(containerEl, state, handlers);
  }
}

/**
 * Render weekly planner view
 * @param {HTMLElement} containerEl - Container element
 * @param {Object} state - App state
 * @param {Object} handlers - Event handlers
 */
async function renderWeeklyPlanner(containerEl, state, handlers) {
  const wch = containerEl.querySelector('#planner-wch');
  const grid = containerEl.querySelector('#planner-wgrid');
  if (!wch || !grid) return;
  
  const plannerState = getPlannerState(state);
  const plannerViewDate = plannerState.plannerViewDate || new Date();
  const today = new Date();
  const now = new Date();
  const startOfWeek = new Date(plannerViewDate);
  startOfWeek.setDate(plannerViewDate.getDate() - plannerViewDate.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  
  const days = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(startOfWeek);
    date.setDate(startOfWeek.getDate() + i);
    days.push(date);
  }
  
  // Get events and recurring rules from state
  const events = state.events || [];
  const recurringRules = state.recurringRules || [];
  const tasks = state.tasks || [];
  const projects = state.projects || [];
  
  // Column headers
  wch.innerHTML = '<div class="wch-corner"></div>';
  days.forEach(d => {
    const dayEvents = getEventsForDate(d, events, recurringRules);
    const dotColors = [...new Set(dayEvents.map(e => {
      const categoryColors = {personal: 'yellow', lab: 'red', equipment: 'green', travel: 'muted', writing: 'blue', comp: 'green'};
      return categoryColors[e.category] || 'muted';
    }))].slice(0, 4);
    const dots = dotColors.map(c => {
      const colorMap = {yellow: 'var(--rose)', green: 'var(--sage)', red: 'var(--overdue)', blue: 'var(--mauve)', muted: 'var(--border2)'};
      return `<div class="wch-dot" style="background:${colorMap[c] || 'var(--border2)'}"></div>`;
    }).join('');
    const col = document.createElement('div');
    col.className = 'wch-day';
    if (d.toDateString() === today.toDateString()) col.classList.add('is-today');
    if (d.toDateString() === plannerViewDate.toDateString()) col.classList.add('is-selected');
    const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    col.innerHTML = `<div class="wch-name">${dayNames[d.getDay()]}</div><div class="wch-num">${d.getDate()}</div><div class="wch-dots">${dots}</div>`;
    col.onclick = () => {
      if (handlers?.setPlannerViewDate) {
        handlers.setPlannerViewDate(new Date(d));
      }
      if (handlers?.setPlannerView) {
        handlers.setPlannerView('daily', containerEl);
      }
    };
    wch.appendChild(col);
  });
  
  // Grid
  grid.innerHTML = '';
  
  // Time gutter
  const tg = document.createElement('div');
  tg.className = 'wg-time-col';
  const HOURS = Array.from({length: 24}, (_, i) => i); // 0 (midnight) - 23 (11pm) - all 24 hours
  HOURS.forEach(h => {
    const cell = document.createElement('div');
    cell.className = 'wg-time-cell';
    const sp = document.createElement('span');
    if (h === 0) {
      sp.textContent = '12am';
    } else if (h < 12) {
      sp.textContent = `${h}am`;
    } else if (h === 12) {
      sp.textContent = '12pm';
    } else {
      sp.textContent = `${h - 12}pm`;
    }
    cell.appendChild(sp);
    tg.appendChild(cell);
  });
  grid.appendChild(tg);
  
  // Day columns
  const nowH = now.getHours() + now.getMinutes() / 60;
  days.forEach(d => {
    const col = document.createElement('div');
    col.className = 'wg-day-col';
    if (d.toDateString() === today.toDateString()) col.classList.add('is-today');
    
    // Hour cells
    HOURS.forEach(() => {
      const c = document.createElement('div');
      c.className = 'wg-hour';
      col.appendChild(c);
    });
    
    // Events - positioned based on exact start time and duration
    const dayEvents = getEventsForDate(d, events, recurringRules);
    dayEvents.forEach(e => {
      const ev = document.createElement('div');
      const categoryColors = {personal: 'yellow', lab: 'red', equipment: 'green', travel: 'muted', writing: 'blue', comp: 'green'};
      const color = categoryColors[e.category] || 'muted';
      ev.className = `w-event ${color}`;
      const startMins = parseTime(e.startTime);
      // Calculate top position: startMins in pixels (1px per minute)
      // Hour cells are 60px high, so 1px per minute
      const top = startMins;
      // Height based on exact duration in minutes (2 hours = 120px)
      const h = e.durationMin;
      ev.style.cssText = `top:${top}px;height:${h}px;`;
      const timeStr = `${formatTime(startMins)} – ${formatTime(startMins + e.durationMin)}`;
      
      // Get linked project and task info
      let linkedInfo = '';
      if (e.linkedProjectId) {
        const project = projects.find(p => String(p.id) === String(e.linkedProjectId));
        if (project) {
          linkedInfo += `<span style="font-size:7px;color:var(--text-dim);opacity:0.8;">📁 ${esc(project.name)}</span>`;
        }
      }
      if (e.linkedTaskId) {
        const task = tasks.find(t => String(t.id) === String(e.linkedTaskId));
        if (task) {
          linkedInfo += `<span style="font-size:7px;color:var(--text-dim);opacity:0.8;margin-left:4px;">✓ ${esc(task.title)}</span>`;
        }
      }
      
      ev.innerHTML = `<div class="w-event-title" style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
        <span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(e.title)}</span>
        <span style="font-size:7.5px;color:var(--text-dim);font-weight:400;white-space:nowrap;flex-shrink:0;">${timeStr}</span>
      </div>
      ${linkedInfo ? `<div class="w-event-time" style="display:flex;align-items:center;gap:4px;flex-wrap:wrap;margin-top:2px;">${linkedInfo}</div>` : ''}`;
      ev.onclick = evt => {
        evt.stopPropagation();
        if (handlers?.setPlannerViewDate) {
          handlers.setPlannerViewDate(new Date(d));
        }
        if (handlers?.setPlannerView) {
          handlers.setPlannerView('daily', containerEl);
        }
      };
      col.appendChild(ev);
    });
    
    // Now line - positioned at exact current time
    if (d.toDateString() === today.toDateString() && nowH >= 0 && nowH < 24) {
      const nl = document.createElement('div');
      nl.className = 'w-nowline';
      // Calculate exact position: (currentHour*60 + currentMinute)
      const nowMins = now.getHours() * 60 + now.getMinutes();
      nl.style.top = nowMins + 'px';
      col.appendChild(nl);
    }
    
    grid.appendChild(col);
  });
}

/**
 * Render daily planner view
 * @param {HTMLElement} containerEl - Container element
 * @param {Object} state - App state
 * @param {Object} handlers - Event handlers
 */
async function renderDailyPlanner(containerEl, state, handlers) {
  const dayTitle = containerEl.querySelector('#planner-day-title');
  const dayMeta = containerEl.querySelector('#planner-day-meta');
  const alldayEvents = containerEl.querySelector('#planner-allday-events');
  const timeline = containerEl.querySelector('#planner-timeline');
  
  if (!dayTitle || !dayMeta || !alldayEvents || !timeline) return;
  
  const plannerState = getPlannerState(state);
  const plannerViewDate = plannerState.plannerViewDate || new Date();
  const date = new Date(plannerViewDate);
  date.setHours(0, 0, 0, 0);
  const dateStr = date.toISOString().split('T')[0];
  
  // Get events and recurring rules from state
  const events = state.events || [];
  const recurringRules = state.recurringRules || [];
  const tasks = state.tasks || [];
  const projects = state.projects || [];
  
  // Get tasks with scheduling info for this date
  const { getTasksForPlannerDate, taskToEvent } = await import('../utils/taskEventConverter.js');
  const tasksForToday = getTasksForPlannerDate(tasks, dateStr);
  
  // Convert tasks to events for display (only tasks without existing linked events)
  const taskEvents = tasksForToday
    .filter(t => {
      // Only include tasks that don't already have a linked event in dayEvents
      if (t.plannerEventId) {
        // Check if the linked event is already in dayEvents
        return !events.some(e => String(e.id) === String(t.plannerEventId) && e.date === dateStr);
      }
      // Include tasks with scheduledDate matching today
      return t.scheduledDate === dateStr;
    })
    .map(t => taskToEvent(t, dateStr, projects));
  
  // Combine regular events with task-derived events
  const dayEvents = [...getEventsForDate(date, events, recurringRules), ...taskEvents];
  const blocks = calculateAvailableBlocks(dayEvents);
  const conflicts = detectConflicts(dayEvents);
  
  // Header
  dayTitle.textContent = date.toLocaleDateString('en-US', {weekday: 'long', month: 'long', day: 'numeric'});
  const totalH = dayEvents.reduce((s, e) => s + e.durationMin, 0) / 60;
  dayMeta.textContent = `${dayEvents.length} block${dayEvents.length !== 1 ? 's' : ''} · ${Math.round(totalH * 10) / 10}h scheduled`;
  
  // All-day events (currently empty, but structure ready)
  alldayEvents.innerHTML = '';
  
  // Timeline
  timeline.innerHTML = '';
  timeline.style.position = 'relative';
  
  const HOURS = Array.from({length: 24}, (_, i) => i); // 0 (midnight) - 23 (11pm) - all 24 hours
  const PIXELS_PER_MINUTE = 1; // 1px per minute for precise positioning
  
  // Calculate total height needed (24 hours = 1440 minutes)
  const totalMinutes = 24 * 60;
  timeline.style.minHeight = (totalMinutes * PIXELS_PER_MINUTE) + 'px';
  timeline.dataset.viewDate = dateStr;
  
  // Create hour rows as visual guides
  HOURS.forEach(h => {
    const row = document.createElement('div');
    row.className = 't-row';
    row.style.position = 'absolute';
    row.style.top = (h * 60 * PIXELS_PER_MINUTE) + 'px';
    row.style.left = '0';
    row.style.right = '0';
    row.style.zIndex = '1';
    
    const lbl = document.createElement('div');
    lbl.className = 't-label';
    if (h === 0) {
      lbl.textContent = '12am';
    } else if (h < 12) {
      lbl.textContent = `${h}am`;
    } else if (h === 12) {
      lbl.textContent = '12pm';
    } else {
      lbl.textContent = `${h - 12}pm`;
    }
    
    const slot = document.createElement('div');
    slot.className = 't-slot';
    slot.style.position = 'relative';
    slot.style.minHeight = '60px';
    slot.ondragover = (e) => {
      e.preventDefault();
      e.stopPropagation();
      slot.classList.add('drag-over');
    };
    slot.ondragleave = (e) => {
      e.preventDefault();
      e.stopPropagation();
      slot.classList.remove('drag-over');
    };
    slot.ondrop = (e) => {
      e.preventDefault();
      e.stopPropagation();
      slot.classList.remove('drag-over');
      if (typeof window.handleTimelineDrop === 'function') {
        window.handleTimelineDrop(e, h, dateStr);
      }
    };
    
    // Add ghost button for this hour (must also be a drop target so drops on "+ Add block" work)
    const ghost = document.createElement('button');
    ghost.className = 't-ghost';
    ghost.type = 'button';
    ghost.textContent = '+ Add block';
    ghost.ondragover = (e) => {
      e.preventDefault();
      e.stopPropagation();
      slot.classList.add('drag-over');
    };
    ghost.ondragleave = (e) => {
      e.preventDefault();
      e.stopPropagation();
      slot.classList.remove('drag-over');
    };
    ghost.ondrop = (e) => {
      e.preventDefault();
      e.stopPropagation();
      slot.classList.remove('drag-over');
      if (typeof window.handleTimelineDrop === 'function') {
        window.handleTimelineDrop(e, h, dateStr);
      }
    };
    ghost.onclick = () => {
      // Note: openAddEventModal is still a global function during migration
      // This will be moved to handlers in a future refactor
      if (typeof window.openAddEventModal === 'function') {
        window.openAddEventModal(dateStr);
        // Use setTimeout to ensure modal is fully rendered before setting values
        setTimeout(() => {
          const startInput = document.getElementById('event-start-time');
          if (startInput) startInput.value = formatTime(h * 60);
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
    
    row.appendChild(lbl);
    row.appendChild(slot);
    timeline.appendChild(row);
    
    // Add 15-minute interval markers (subtle lines)
    for (let q = 1; q < 4; q++) {
      const marker = document.createElement('div');
      marker.style.position = 'absolute';
      marker.style.top = ((h * 60 * PIXELS_PER_MINUTE) + (q * 15 * PIXELS_PER_MINUTE)) + 'px';
      marker.style.left = '52px';
      marker.style.right = '0';
      marker.style.height = '1px';
      marker.style.background = 'var(--border)';
      marker.style.opacity = '0.3';
      marker.style.pointerEvents = 'none';
      marker.style.zIndex = '0';
      timeline.appendChild(marker);
    }
  });
  
  // Fallback drop handler for when drop lands on an event block (z-index above slots) or empty timeline area
  timeline.ondragover = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };
  timeline.ondrop = (e) => {
    if (e.target.closest('.t-slot')) return;
    e.preventDefault();
    e.stopPropagation();
    const rect = timeline.getBoundingClientRect();
    const scrollTop = timeline.scrollTop || 0;
    const dropY = e.clientY - rect.top + scrollTop;
    const hour = Math.max(0, Math.min(23, Math.floor(dropY / (60 * PIXELS_PER_MINUTE))));
    const viewDate = timeline.dataset.viewDate || dateStr;
    if (typeof window.handleTimelineDrop === 'function') {
      window.handleTimelineDrop(e, hour, viewDate);
    }
  };
  
  // Position events absolutely based on their exact start time and duration
  dayEvents.forEach(e => {
    const startMins = parseTime(e.startTime);
    const startHour = Math.floor(startMins / 60);
    const endMins = startMins + e.durationMin;
    const endHour = Math.floor(endMins / 60);
    
    // Show all events (full 24-hour day)
    if (startHour < 0 || startHour >= 24) return;
    
    const blk = document.createElement('div');
    const isTaskBlock = e.isTaskBlock || false;
    
    // Visual distinction for task blocks
    if (isTaskBlock) {
      blk.className = 't-block task-block';
      // Use priority-based color for task blocks
      const priority = e.taskPriority || 2;
      const priorityColors = {
        1: 'var(--blush)', // low priority
        2: 'var(--sage)',  // medium priority
        3: 'var(--rose)'   // high priority
      };
      const priorityColor = priorityColors[priority] || priorityColors[2];
      blk.style.borderLeft = `3px solid ${priorityColor}`;
      blk.style.background = 'var(--bg2)';
      
      // Add task icon
      const taskIcon = e.taskDone ? '✓' : '📋';
      blk.setAttribute('data-task-id', e.linkedTaskId);
      blk.setAttribute('data-is-task-block', 'true');
    } else {
      // Regular event styling
      const categoryColors = {personal: 'yellow', lab: 'red', equipment: 'green', travel: 'muted', writing: 'blue', comp: 'green'};
      const color = categoryColors[e.category] || 'muted';
      blk.className = `t-block ${color}`;
    }
    
    blk.style.position = 'absolute';
    // Position at exact start time (S_HOUR is 0, so just use startMins)
    blk.style.top = (startMins * PIXELS_PER_MINUTE) + 'px';
    blk.style.left = '52px';
    blk.style.right = '0';
    blk.style.zIndex = '2';
    // Height based on exact duration in minutes (2 hours = 120px)
    blk.style.height = (e.durationMin * PIXELS_PER_MINUTE) + 'px';
    
    // Draggable so user can move event to a different time slot
    blk.draggable = true;
    blk.setAttribute('data-event-id', e.id);
    blk.ondragstart = (ev) => {
      ev.stopPropagation();
      ev.dataTransfer.setData('application/x-planner-move-event', JSON.stringify({
        eventId: e.id,
        isTaskBlock: !!isTaskBlock,
        linkedTaskId: e.linkedTaskId || null
      }));
      ev.dataTransfer.effectAllowed = 'move';
      blk.classList.add('t-block-dragging');
    };
    blk.ondragend = () => blk.classList.remove('t-block-dragging');
    
    const timeStr = `${formatTime(parseTime(e.startTime))} – ${formatTime(parseTime(e.startTime) + e.durationMin)}`;
    
    // Get linked project and task info
    let linkedInfo = '';
    if (e.linkedProjectId) {
      const project = projects.find(p => String(p.id) === String(e.linkedProjectId));
      if (project) {
        linkedInfo += `<span style="font-size:8px;color:var(--text-dim);">📁 ${esc(project.name)}</span>`;
      }
    }
    
    // For task blocks, show task-specific info
    if (isTaskBlock && e.linkedTaskId) {
      const task = tasks.find(t => String(t.id) === String(e.linkedTaskId));
      if (task) {
        const taskIcon = task.done ? '✓' : '📋';
        const statusBadge = task.status ? `<span style="font-size:8px;padding:2px 4px;background:var(--bg);border-radius:3px;color:var(--text-dim);">${esc(task.status)}</span>` : '';
        linkedInfo += `<span style="font-size:8px;color:var(--text-dim);margin-left:6px;">${taskIcon} ${esc(task.title)}</span>`;
        if (statusBadge) {
          linkedInfo += `<span style="margin-left:4px;">${statusBadge}</span>`;
        }
        
        // Show workflow lane if available
        const lane = e.taskLane || task.lane;
        if (lane) {
          const laneLabels = {
            'lab': '🧪 Lab',
            'comp': '💻 Comp',
            'writing': '📝 Writing',
            'presentation': '📊 Presentation',
            'personal': '👤 Personal',
            'product': '🚀 Product'
          };
          const laneLabel = laneLabels[lane] || lane;
          const laneColors = {
            'lab': 'var(--rose)',
            'comp': 'var(--sage)',
            'writing': 'var(--mauve)',
            'presentation': 'var(--soon)',
            'personal': 'var(--blush)',
            'product': 'var(--sage)'
          };
          const laneColor = laneColors[lane] || 'var(--text-dim)';
          linkedInfo += `<span style="font-size:8px;padding:2px 4px;background:${laneColor}20;border:1px solid ${laneColor};border-radius:3px;color:${laneColor};margin-left:4px;">${esc(laneLabel)}</span>`;
        }
      }
    } else if (e.linkedTaskId) {
      // Regular event with linked task
      const task = tasks.find(t => String(t.id) === String(e.linkedTaskId));
      if (task) {
        linkedInfo += `<span style="font-size:8px;color:var(--text-dim);margin-left:6px;">✓ ${esc(task.title)}</span>`;
      }
    }
    
    // Task block title styling
    const titleContent = isTaskBlock 
      ? `<span style="font-size:10px;margin-right:4px;">${e.taskDone ? '✓' : '📋'}</span><span>${esc(e.title)}</span>`
      : `<span>${esc(e.title)}</span>`;
    
    blk.innerHTML = `
      <div class="t-block-title" style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;${isTaskBlock && e.taskDone ? 'text-decoration:line-through;opacity:0.7;' : ''}">
        ${titleContent}
        <span style="font-size:9px;color:var(--text-dim);font-weight:400;white-space:nowrap;">${timeStr}</span>
      </div>
      ${linkedInfo ? `<div class="t-block-meta" style="display:flex;align-items:center;gap:4px;flex-wrap:wrap;margin-top:2px;">${linkedInfo}</div>` : ''}
      ${e.location ? `<div class="t-block-meta">${esc(e.location)}</div>` : ''}
      <div class="t-block-footer">
        <span class="t-block-dur">${Math.round(e.durationMin / 60 * 10) / 10}h</span>
      </div>`;
    
    // Different click handler for task blocks
    blk.onclick = (evt) => {
      evt.stopPropagation();
      if (isTaskBlock && e.linkedTaskId) {
        // Open task drawer for task blocks
        if (window.Petal?.handlers?.openTaskDrawer) {
          window.Petal.handlers.openTaskDrawer(e.linkedTaskId);
        } else if (typeof window.openTaskDrawer === 'function') {
          window.openTaskDrawer(e.linkedTaskId);
        }
      } else {
        // Regular event - open event modal
        if (typeof window.editEvent === 'function') {
          window.editEvent(e.id);
        }
      }
    };
    
    timeline.appendChild(blk);
  });
  
  // Now marker
  const now = new Date();
  const nowH = now.getHours() + now.getMinutes() / 60;
  const isToday = date.toDateString() === now.toDateString();
  if (isToday && nowH >= 0 && nowH < 24) {
    const nm = document.createElement('div');
    nm.className = 'now-marker';
    nm.style.top = (nowH * 60 * PIXELS_PER_MINUTE) + 'px';
    nm.style.zIndex = '10';
    timeline.appendChild(nm);
  }

  // When viewing today, scroll the day view to current time so the "now" line is in view
  if (isToday) {
    const scrollParent = timeline.parentElement; // .day-scroll
    if (scrollParent && scrollParent.scrollHeight > scrollParent.clientHeight) {
      const nowMins = now.getHours() * 60 + now.getMinutes();
      const scrollTo = Math.max(0, Math.min(scrollParent.scrollHeight - scrollParent.clientHeight, nowMins - 150));
      scrollParent.scrollTop = scrollTo;
    }
  }
}

/**
 * Update planner period label
 * @param {HTMLElement} labelEl - Label element
 * @param {Object} plannerState - Planner state
 */
function updatePlannerPeriodLabel(labelEl, plannerState) {
  if (!labelEl) return;
  
  if (plannerState.currentPlannerView === 'daily') {
    labelEl.textContent = plannerState.plannerViewDate.toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
    });
  } else {
    const startOfWeek = new Date(plannerState.plannerViewDate);
    startOfWeek.setDate(plannerState.plannerViewDate.getDate() - plannerState.plannerViewDate.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    const f = d => d.toLocaleDateString('en-US', {month: 'short', day: 'numeric'});
    labelEl.textContent = `${f(startOfWeek)} – ${f(endOfWeek)}, ${startOfWeek.getFullYear()}`;
  }
}

/**
 * Build planner sidebar
 * Delegates to global function during migration
 */
function buildPlannerSidebar() {
  if (typeof window.buildPlannerSidebar === 'function') {
    window.buildPlannerSidebar();
  }
}

/**
 * Build planner calendar
 * Delegates to global function during migration
 */
function buildPlannerCalendar() {
  if (typeof window.buildPlannerCalendar === 'function') {
    window.buildPlannerCalendar();
  }
}

// Export for use in other modules
export { renderPlanner, renderWeeklyPlanner, renderDailyPlanner };
