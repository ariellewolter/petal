// ═══════════════════════ PLANNER OPERATIONS ═══════════════════════
// Operations for planner events and recurring rules

import { parseTime, formatTime } from '../utils/dates.js';
import { esc } from '../utils/strings.js';

// Emojis for routine icons (same set as habits for consistency)
const ROUTINE_EMOJIS = [
  '📝', '🌿', '💪', '🏃', '🧘', '😴', '💧', '🥗', '📚', '🎯',
  '✨', '🔥', '🌟', '💡', '🎨', '🎵', '📖', '☀️', '🌙', '🌅',
  '🧠', '💆', '🚴', '🏋️', '⛹️', '🧘‍♀️', '💊', '🍎', '🥑', '☕',
  '🛏️', '🧹', '📱', '💻', '✍️', '🎓', '🔬', '🏠', '🌱', '🌸',
  '🐕', '🐈', '🕯️', '📿', '🧴', '🪥', '🧺', '🛒', '🚗', '💰', '❤️',
  '🧩', '🎮', '🖼️', '📷', '🌍', '⏰', '✅', '◎', '✦', '◆'
];

/** Snap minutes (0–59) to quarter-hour: 0, 15, 30, or 45. */
function snapToQuarterHour(minutes) {
  const m = Math.max(0, Math.min(59, Math.round(minutes)));
  return Math.min(45, Math.round(m / 15) * 15);
}

/** Snap total minutes since midnight (0–1439) to nearest quarter-hour; returns snapped total minutes. */
function snapTotalMinutesToQuarter(totalMinutes) {
  const t = Math.max(0, Math.min(24 * 60 - 1, Math.round(totalMinutes)));
  const hour = Math.floor(t / 60);
  const mins = t % 60;
  const snappedMins = snapToQuarterHour(mins);
  return hour * 60 + snappedMins;
}

/**
 * Edit recurring rule
 */
export function editRecurringRule(ctx, ruleId) {
  const { recurringRules: recurringRulesValue, projects, esc: escFn, parseTime: parseTimeFn, formatTime: formatTimeFn } = ctx;
  
  const parseTimeFunction = parseTimeFn || parseTime;
  const formatTimeFunction = formatTimeFn || formatTime;
  const escFunction = escFn || esc;
  
  // CRITICAL: Read recurringRules from store, not from local variable
  const state = window.Petal?.store?.getState();
  const currentRules = state?.recurringRules || recurringRulesValue || [];
  const rule = currentRules.find(r => r.id === ruleId);
  if (!rule) return;
  
  // Set editing state (global variable for backward compatibility)
  if (typeof window.editingRecurringId !== 'undefined') {
    window.editingRecurringId = ruleId;
  }
  
  const modal = document.getElementById('recurring-modal');
  const titleEl = document.getElementById('recurring-modal-title');
  if (!modal || !titleEl) return;
  
  titleEl.textContent = 'Edit Recurring Event';
  document.getElementById('recurring-title').value = rule.title;
  document.getElementById('recurring-start-time').value = rule.startTime;
  document.getElementById('recurring-duration').value = rule.durationMin;
  // Calculate and populate end time
  if (rule.startTime && rule.durationMin) {
    const startMins = parseTimeFunction(rule.startTime);
    const endMins = startMins + rule.durationMin;
    document.getElementById('recurring-end-time').value = formatTimeFunction(endMins);
  }
  document.querySelectorAll('.recurring-day').forEach(cb => {
    cb.checked = (rule.daysOfWeek || []).includes(parseInt(cb.value));
  });
  document.getElementById('recurring-category').value = rule.category;
  document.getElementById('recurring-location').value = rule.location || '';
  document.getElementById('recurring-buffer-before').value = rule.bufferBeforeMin || 0;
  document.getElementById('recurring-buffer-after').value = rule.bufferAfterMin || 0;
  document.getElementById('recurring-notes').value = rule.notes || '';
  
  modal.style.display = 'flex';
}

/**
 * Delete recurring rule
 */
export function deleteRecurringRule(ctx, ruleId) {
  if (confirm('Delete this recurring event rule? This will remove all future instances.')) {
    // Update store (single source of truth - auto-saves via persistence)
    if (window.Petal?.store) {
      const state = window.Petal.store.getState();
      const updatedRules = (state.recurringRules || []).filter(r => r.id !== ruleId);
      window.Petal.store.setState({ recurringRules: updatedRules });
    } else {
      // Fallback: use local variable if store not available (shouldn't happen)
      const { recurringRules: recurringRulesValue, save } = ctx;
      if (recurringRulesValue) {
        const updatedRules = recurringRulesValue.filter(r => r.id !== ruleId);
        if (save) {
          // Note: This would need to update the global recurringRules variable
          // For now, just use store
          console.warn('Store not available, cannot delete recurring rule');
          return;
        }
      }
    }
    // Re-render planner using router (single source of truth)
    if (window.routerSwitchView) {
      window.routerSwitchView('planner');
    }
    if (typeof window.buildPlannerSidebar === 'function') {
      window.buildPlannerSidebar();
    }
    if (typeof window.buildPlannerCalendar === 'function') {
      window.buildPlannerCalendar();
    }
  }
}

/**
 * Edit event
 */
export function editEvent(ctx, eventId) {
  const { events: eventsValue, projects, esc: escFn, parseTime: parseTimeFn, formatTime: formatTimeFn } = ctx;
  
  const parseTimeFunction = parseTimeFn || parseTime;
  const formatTimeFunction = formatTimeFn || formatTime;
  const escFunction = escFn || esc;
  
  // CRITICAL: Read events from store, not from local variable
  const state = window.Petal?.store?.getState();
  const currentEvents = state?.events || eventsValue || [];
  const event = currentEvents.find(e => e.id === eventId);
  if (!event) return;
  
  // Set editing state so Delete button and submit can resolve the event id
  window.editingEventId = eventId;
  
  const modal = document.getElementById('event-modal');
  const titleEl = document.getElementById('event-modal-title');
  const deleteBtn = document.getElementById('event-delete-btn');
  if (!modal || !titleEl) return;
  
  titleEl.textContent = 'Edit Event';
  if (deleteBtn) {
    deleteBtn.style.display = 'block';
    deleteBtn.setAttribute('data-event-id', String(eventId));
  }
  document.getElementById('event-title').value = event.title;
  document.getElementById('event-date').value = event.date;
  document.getElementById('event-start-time').value = event.startTime;
  document.getElementById('event-duration').value = event.durationMin;
  // Calculate and populate end time
  if (event.startTime && event.durationMin) {
    const startMins = parseTimeFunction(event.startTime);
    const endMins = startMins + event.durationMin;
    document.getElementById('event-end-time').value = formatTimeFunction(endMins);
  }
  document.getElementById('event-category').value = event.category;
  document.getElementById('event-location').value = event.location || '';
  document.getElementById('event-buffer-before').value = event.bufferBeforeMin || 0;
  document.getElementById('event-buffer-after').value = event.bufferAfterMin || 0;
  document.getElementById('event-notes').value = event.notes || '';
  
  // Populate project dropdown
  const projectSelect = document.getElementById('event-linked-project');
  if (projectSelect) {
    projectSelect.innerHTML = '<option value="">No project</option>';
    ((projects || [])).filter(p => !p.done).forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = escFunction(p.name);
      if (event.linkedProjectId && String(p.id) === String(event.linkedProjectId)) {
        opt.selected = true;
      }
      projectSelect.appendChild(opt);
    });
    projectSelect.onchange = typeof window.updateEventTaskOptions === 'function' 
      ? window.updateEventTaskOptions 
      : (() => {});
    // Update task options based on selected project
    if (typeof window.updateEventTaskOptions === 'function') {
      window.updateEventTaskOptions();
    }
  }
  
  // Set task selection
  const taskSelect = document.getElementById('event-linked-task');
  if (taskSelect && event.linkedTaskId) {
    // Wait a moment for task options to be populated
    setTimeout(() => {
      taskSelect.value = event.linkedTaskId || '';
    }, 50);
  }
  
  modal.style.display = 'flex';
}

/**
 * Sync event changes to linked task
 * Called when event time/duration is updated
 */
export async function syncEventToTask(event) {
  if (!event || !event.linkedTaskId || !event.isTaskBlock) {
    return; // Not a task block, no sync needed
  }
  
  if (!window.Petal?.store) {
    return; // Store not available
  }
  
  const state = window.Petal.store.getState();
  const tasks = state.tasks || [];
  const { updateTaskFromEvent } = await import('../utils/taskEventConverter.js');
  
  const updatedTasks = tasks.map(task => {
    if (String(task.id) === String(event.linkedTaskId)) {
      return updateTaskFromEvent(task, event);
    }
    return task;
  });
  
  window.Petal.store.setState({ tasks: updatedTasks });
  
  console.log('✅ Event changes synced to task:', {
    eventId: event.id,
    taskId: event.linkedTaskId,
    date: event.date,
    startTime: event.startTime,
    duration: event.durationMin
  });
}

/**
 * Delete event
 */
export async function deleteEvent(ctx, eventId) {
  // Caller is responsible for confirm (delegation shows it once)
  if (window.Petal?.store) {
      const state = window.Petal.store.getState();
      const eventToDelete = (state.events || []).find(e => String(e.id) === String(eventId));
      
      // If event is linked to a task, clear task scheduling
      if (eventToDelete && eventToDelete.linkedTaskId && eventToDelete.isTaskBlock) {
        // Import converter dynamically
        const { clearTaskScheduling } = await import('../utils/taskEventConverter.js');
        const tasks = state.tasks || [];
        const updatedTasks = tasks.map(task => {
          if (String(task.id) === String(eventToDelete.linkedTaskId)) {
            return clearTaskScheduling(task);
          }
          return task;
        });
        
        const updatedEvents = (state.events || []).filter(e => String(e.id) !== String(eventId));
        window.Petal.store.setState({ events: updatedEvents, tasks: updatedTasks });
        
        console.log('✅ Event deleted, task scheduling cleared:', {
          eventId: eventId,
          taskId: eventToDelete.linkedTaskId
        });
      } else {
        const updatedEvents = (state.events || []).filter(e => String(e.id) !== String(eventId));
        window.Petal.store.setState({ events: updatedEvents });
      }
  } else {
    // Fallback: use local variable if store not available (shouldn't happen)
    const { events: eventsValue, save } = ctx;
    if (eventsValue) {
      const updatedEvents = eventsValue.filter(e => e.id !== eventId);
      console.warn('Store not available, cannot delete event');
      return;
    }
  }

  // Re-render planner and close modal
  if (window.routerSwitchView) {
    window.routerSwitchView('planner');
  }
  if (typeof window.closeEventModal === 'function') {
    window.closeEventModal();
  }
}

// ═══════════════════════ HABIT MODAL OPERATIONS ═══════════════════════

/**
 * Open add habit modal
 */
export function openAddHabitModal() {
  const modal = document.getElementById('habit-modal');
  const titleEl = document.getElementById('habit-modal-title');
  if (!modal || !titleEl) return;
  
  titleEl.textContent = 'Add Habit';
  document.getElementById('habit-name').value = '';
  document.getElementById('habit-cadence').value = 'daily';
  document.getElementById('habit-time').value = '';
  document.getElementById('habit-duration').value = '';
  document.querySelectorAll('.habit-day').forEach(cb => cb.checked = false);
  document.getElementById('habit-days-of-week-field').style.display = 'none';
  
  modal.style.display = 'flex';
  document.getElementById('habit-name').focus();
}

/**
 * Close habit modal
 */
export function closeHabitModal() {
  const modal = document.getElementById('habit-modal');
  if (modal) modal.style.display = 'none';
}

/**
 * Toggle habit days of week field based on cadence
 */
export function toggleHabitDaysOfWeek() {
  const cadence = document.getElementById('habit-cadence').value;
  const field = document.getElementById('habit-days-of-week-field');
  if (field) {
    field.style.display = cadence === 'weekly' ? 'block' : 'none';
  }
}

/**
 * Submit habit modal
 */
export function submitHabitModal() {
  const name = document.getElementById('habit-name').value.trim();
  if (!name) {
    alert('Please enter a habit name');
    return;
  }
  
  const cadence = document.getElementById('habit-cadence').value;
  const dayCheckboxes = document.querySelectorAll('.habit-day:checked');
  let daysOfWeek = null;
  
  if (cadence === 'weekly' && dayCheckboxes.length > 0) {
    daysOfWeek = Array.from(dayCheckboxes).map(cb => parseInt(cb.value));
  }
  
  const timeValue = document.getElementById('habit-time').value;
  const timeOfDay = timeValue && /^\d{2}:\d{2}$/.test(timeValue) ? timeValue : undefined;
  const durationValue = document.getElementById('habit-duration').value;
  const durationMin = durationValue && !isNaN(parseInt(durationValue)) && parseInt(durationValue) > 0 ? parseInt(durationValue) : undefined;
  
  if (window.Petal?.features?.habits?.addHabit) {
    window.Petal.features.habits.addHabit({ name, cadence, daysOfWeek, timeOfDay, durationMin });
    closeHabitModal();
    if (typeof window.buildPlannerSidebar === 'function') {
      window.buildPlannerSidebar();
    }
  }
}

// ═══════════════════════ ROUTINE MODAL OPERATIONS ═══════════════════════

/**
 * Open add routine modal
 */
export function openAddRoutineModal() {
  const modal = document.getElementById('routine-modal');
  const titleEl = document.getElementById('routine-modal-title');
  const gridContainer = document.getElementById('routine-emoji-grid-container');
  if (!modal || !titleEl) return;
  
  titleEl.textContent = 'Add Routine';
  document.getElementById('routine-name').value = '';
  document.getElementById('routine-cadence').value = 'daily';
  document.getElementById('routine-time').value = '';
  document.getElementById('routine-duration').value = '';
  document.querySelectorAll('.routine-day').forEach(cb => cb.checked = false);
  document.getElementById('routine-days-of-week-field').style.display = 'none';
  
  // Populate emoji grid and bind (re-run each open so selection resets)
  if (gridContainer) {
    gridContainer.innerHTML = ROUTINE_EMOJIS.map((e, i) =>
      `<button type="button" class="routine-epick ${i === 0 ? 'on' : ''}" data-e="${esc(e)}">${esc(e)}</button>`
    ).join('');
    gridContainer.querySelectorAll('.routine-epick').forEach(btn => {
      btn.addEventListener('click', () => {
        gridContainer.querySelectorAll('.routine-epick').forEach(b => b.classList.remove('on'));
        btn.classList.add('on');
      });
    });
  }
  
  modal.style.display = 'flex';
  document.getElementById('routine-name').focus();
}

/**
 * Close routine modal
 */
export function closeRoutineModal() {
  const modal = document.getElementById('routine-modal');
  if (modal) modal.style.display = 'none';
}

/**
 * Toggle routine days of week field based on cadence
 */
export function toggleRoutineDaysOfWeek() {
  const cadence = document.getElementById('routine-cadence').value;
  const field = document.getElementById('routine-days-of-week-field');
  if (field) {
    field.style.display = cadence === 'weekly' ? 'block' : 'none';
  }
}

/**
 * Submit routine modal
 */
export function submitRoutineModal() {
  const name = document.getElementById('routine-name').value.trim();
  if (!name) {
    alert('Please enter a routine name');
    return;
  }
  
  const cadence = document.getElementById('routine-cadence').value;
  const dayCheckboxes = document.querySelectorAll('.routine-day:checked');
  let daysOfWeek = null;
  
  if (cadence === 'weekly' && dayCheckboxes.length > 0) {
    daysOfWeek = Array.from(dayCheckboxes).map(cb => parseInt(cb.value));
  }
  
  const timeValue = document.getElementById('routine-time').value;
  const timeOfDay = timeValue && /^\d{2}:\d{2}$/.test(timeValue) ? timeValue : undefined;
  
  const durationValue = document.getElementById('routine-duration').value;
  const durationMin = durationValue && !isNaN(parseInt(durationValue)) && parseInt(durationValue) > 0 ? parseInt(durationValue) : undefined;
  
  const selectedEmojiBtn = document.querySelector('#routine-modal .routine-epick.on');
  const icon = selectedEmojiBtn?.getAttribute('data-e') || ROUTINE_EMOJIS[0] || '📋';
  
  if (window.Petal?.features?.routines?.addRoutine) {
    window.Petal.features.routines.addRoutine({ name, cadence, icon, timeOfDay, durationMin, daysOfWeek });
    closeRoutineModal();
    if (typeof window.buildPlannerSidebar === 'function') {
      window.buildPlannerSidebar();
    }
  }
}

// ═══════════════════════ DRAG & DROP HANDLERS ═══════════════════════

/**
 * Module-level drag state (replaces global variables)
 */
let draggedRoutine = null;
let draggedHabit = null;
let draggedTask = null;

/**
 * Handle routine drag start
 */
export function handleRoutineDragStart(event) {
  // Don't drag if clicking on checkbox or button
  if (event.target.tagName === 'INPUT' || event.target.tagName === 'BUTTON') {
    event.preventDefault();
    return false;
  }
  
  const routineItem = event.target.closest('.routine-item');
  if (!routineItem) {
    event.preventDefault();
    return false;
  }
  
  draggedRoutine = {
    id: routineItem.dataset.routineId,
    name: routineItem.dataset.routineName,
    timeOfDay: routineItem.dataset.routineTime,
    durationMin: parseInt(routineItem.dataset.routineDuration) || null
  };
  
  event.dataTransfer.effectAllowed = 'copy';
  event.dataTransfer.setData('text/plain', draggedRoutine.name);
  const item = event.target.closest('.routine-item');
  if (item) item.style.opacity = '0.5';
  
  console.log('Routine drag started:', draggedRoutine);
}

/**
 * Handle routine drag end
 */
export function handleRoutineDragEnd(event) {
  const item = event.target.closest('.routine-item');
  if (item) item.style.opacity = '';
  draggedRoutine = null;
}

/**
 * Handle habit drag start
 */
export function handleHabitDragStart(event) {
  // Don't drag if clicking on checkbox or button
  if (event.target.tagName === 'INPUT' || event.target.tagName === 'BUTTON') {
    event.preventDefault();
    return false;
  }
  
  const habitItem = event.target.closest('.habit-item');
  if (!habitItem) {
    event.preventDefault();
    return false;
  }
  
  const durationStr = habitItem.dataset.habitDuration;
  const durationMin = durationStr ? Math.max(1, Math.min(480, parseInt(durationStr, 10) || 0)) : null;
  const timeStr = habitItem.dataset.habitTime;
  const timeOfDay = timeStr && /^\d{2}:\d{2}$/.test(timeStr) ? timeStr : undefined;
  draggedHabit = {
    id: habitItem.dataset.habitId,
    name: habitItem.dataset.habitName,
    durationMin,
    timeOfDay
  };
  
  event.dataTransfer.effectAllowed = 'copy';
  event.dataTransfer.setData('text/plain', draggedHabit.name);
  const item = event.target.closest('.habit-item');
  if (item) item.style.opacity = '0.5';
  
  console.log('Habit drag started:', draggedHabit);
}

/**
 * Handle habit drag end
 */
export function handleHabitDragEnd(event) {
  const item = event.target.closest('.habit-item');
  if (item) item.style.opacity = '';
  draggedHabit = null;
}

/**
 * Handle task drag start
 * @param {Event} event - Drag event
 * @param {Object} task - Task object
 */
export function handleTaskDragStart(event, task) {
  // Don't drag if clicking on interactive elements
  if (event.target.tagName === 'INPUT' || 
      event.target.tagName === 'BUTTON' || 
      event.target.tagName === 'A' ||
      event.target.closest('button') ||
      event.target.closest('a')) {
    event.preventDefault();
    return false;
  }
  
  const taskCard = event.target.closest('.task-card, .task-item, [data-task-id]');
  if (!taskCard) {
    event.preventDefault();
    return false;
  }
  
  draggedTask = {
    id: task.id,
    title: task.title,
    estimatedMinutes: task.estimatedMinutes || 60,
    priority: task.priority || 2,
    projectId: task.projectId || null,
    scheduledDate: task.scheduledDate || null,
    scheduledStartTime: task.scheduledStartTime || null,
    scheduledDurationMin: task.scheduledDurationMin || null,
    plannerEventId: task.plannerEventId || null
  };
  
  event.dataTransfer.effectAllowed = 'copy';
  event.dataTransfer.setData('text/plain', task.title);
  event.dataTransfer.setData('application/json', JSON.stringify({ type: 'task', taskId: task.id }));
  
  if (taskCard) {
    taskCard.classList.add('dragging');
    taskCard.style.opacity = '0.5';
  }
  
  console.log('Task drag started:', draggedTask);
}

/**
 * Handle task drag end
 * @param {Event} event - Drag event
 */
export function handleTaskDragEnd(event) {
  const taskCard = event.target.closest('.task-card, .task-item, [data-task-id]');
  if (taskCard) {
    taskCard.classList.remove('dragging');
    taskCard.style.opacity = '';
  }
  draggedTask = null;
}

/**
 * Handle timeline drop (move existing event, or create from routine/habit/task)
 */
export async function handleTimelineDrop(ctx, event, hour, dateStr) {
  const { events: eventsValue, formatTime: formatTimeFn, save: saveFn, tasks: tasksValue, projects: projectsValue } = ctx;
  
  const formatTimeFunction = formatTimeFn || (typeof window.Petal?.formatTime === 'function' ? window.Petal.formatTime : null);
  if (!formatTimeFunction) {
    console.error('formatTime function not available');
    return;
  }

  // Move existing event: dragged from calendar to new slot
  const movePayload = event.dataTransfer?.getData?.('application/x-planner-move-event');
  if (movePayload) {
    try {
      const { eventId, isTaskBlock, linkedTaskId } = JSON.parse(movePayload);
      const state = window.Petal?.store?.getState();
      const events = state?.events || [];
      const ev = events.find(e => String(e.id) === String(eventId));
      if (!ev) return;

      const PIXELS_PER_MINUTE = 1;
      let newStartMins = hour * 60;
      const timelineEl = document.getElementById('planner-timeline');
      if (timelineEl) {
        const rect = timelineEl.getBoundingClientRect();
        const scrollTop = timelineEl.scrollTop || 0;
        const dropYInTimeline = event.clientY - rect.top + scrollTop;
        const rawTotalMins = Math.max(0, Math.min(24 * 60 - 1, Math.round(dropYInTimeline / PIXELS_PER_MINUTE)));
        newStartMins = snapTotalMinutesToQuarter(rawTotalMins);
      } else {
        const slot = event.currentTarget;
        const slotRect = slot.getBoundingClientRect();
        const dropY = event.clientY - slotRect.top;
        const rawMinutes = Math.max(0, Math.min(59, Math.round(dropY / PIXELS_PER_MINUTE)));
        newStartMins = hour * 60 + snapToQuarterHour(rawMinutes);
      }
      const newStartTime = formatTimeFunction(snapTotalMinutesToQuarter(newStartMins));

      const movedEvent = { ...ev, date: dateStr, startTime: newStartTime };
      const updatedEvents = events.map(e => (String(e.id) === String(eventId) ? movedEvent : e));

      let nextState = { events: updatedEvents };
      if (isTaskBlock && linkedTaskId && state?.tasks) {
        const { updateTaskFromEvent } = await import('../utils/taskEventConverter.js');
        const tasks = state.tasks.map(t =>
          String(t.id) === String(linkedTaskId) ? updateTaskFromEvent(t, movedEvent) : t
        );
        nextState = { events: updatedEvents, tasks };
      }
      if (window.Petal?.store) {
        window.Petal.store.setState(nextState);
      }
      if (window.routerSwitchView) window.routerSwitchView('planner');
      if (typeof window.buildPlannerSidebar === 'function') window.buildPlannerSidebar();
      if (typeof window.buildPlannerCalendar === 'function') window.buildPlannerCalendar();
    } catch (err) {
      console.warn('Planner move event failed', err);
    }
    return;
  }

  console.log('Timeline drop:', { draggedRoutine, draggedHabit, draggedTask, hour, dateStr });
  
  // Handle task drop (create from task card)
  if (draggedTask) {
    handleTaskTimelineDrop(ctx, event, hour, dateStr, formatTimeFunction);
    return;
  }
  
  if (!draggedRoutine && !draggedHabit) {
    console.warn('No dragged item');
    return;
  }
  
  // Calculate time from drop position, snapped to :00, :15, :30, :45
  const PIXELS_PER_MINUTE = 1;
  let totalMins = hour * 60;
  const timelineEl = document.getElementById('planner-timeline');
  if (timelineEl) {
    const rect = timelineEl.getBoundingClientRect();
    const scrollTop = timelineEl.scrollTop || 0;
    const dropYInTimeline = event.clientY - rect.top + scrollTop;
    const rawTotalMins = Math.max(0, Math.min(24 * 60 - 1, Math.round(dropYInTimeline / PIXELS_PER_MINUTE)));
    totalMins = snapTotalMinutesToQuarter(rawTotalMins);
  } else {
    const slot = event.currentTarget;
    const slotRect = slot.getBoundingClientRect();
    const dropY = event.clientY - slotRect.top;
    const rawMinutes = Math.max(0, Math.min(59, Math.round(dropY / PIXELS_PER_MINUTE)));
    totalMins = hour * 60 + snapToQuarterHour(rawMinutes);
  }
  const startTime = formatTimeFunction(snapTotalMinutesToQuarter(totalMins));
  let duration = 60; // Default 1 hour
  let title = '';
  let category = 'personal';
  
  if (draggedRoutine) {
    title = draggedRoutine.name;
    duration = draggedRoutine.durationMin || 60;
    category = 'personal'; // Routines default to personal category
  } else if (draggedHabit) {
    title = draggedHabit.name;
    duration = (draggedHabit.durationMin != null && draggedHabit.durationMin > 0) ? draggedHabit.durationMin : 30;
    category = 'personal';
  }
  
  // If habit has a set time, use it for the new event instead of drop position
  let eventStartTime = startTime;
  if (draggedHabit?.timeOfDay && /^\d{2}:\d{2}$/.test(draggedHabit.timeOfDay)) {
    eventStartTime = draggedHabit.timeOfDay;
  }
  
  // Create event from routine/habit
  const eventObj = {
    id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    title: title,
    date: dateStr,
    startTime: eventStartTime,
    durationMin: duration,
    category: category,
    location: null,
    bufferBeforeMin: 0,
    bufferAfterMin: 0,
    notes: `From ${draggedRoutine ? 'routine' : 'habit'}: ${title}`,
    linkedProjectId: null,
    linkedTaskId: null
  };
  
  // Add event - update both global array and store
  const currentEvents = Array.isArray(eventsValue) ? eventsValue : (typeof window.events !== 'undefined' && Array.isArray(window.events) ? window.events : []);
  const updatedEvents = [...currentEvents, eventObj];
  
  // Sync to store (this will auto-save via persistence)
  if (window.Petal?.store) {
    window.Petal.store.setState({ events: updatedEvents });
  } else {
    // Fallback to old save method if store not available
    if (saveFn) {
      // Update global events array for backward compatibility
      if (typeof window.events !== 'undefined') {
        window.events = updatedEvents;
      }
      saveFn().then(() => {
        // Re-render planner using router (single source of truth)
        if (window.routerSwitchView) {
          window.routerSwitchView('planner');
        }
        if (typeof window.buildPlannerSidebar === 'function') {
          window.buildPlannerSidebar();
        }
        if (typeof window.buildPlannerCalendar === 'function') {
          window.buildPlannerCalendar();
        }
        return;
      });
      return;
    }
  }
  
  // Re-render planner using router (single source of truth)
  if (window.routerSwitchView) {
    window.routerSwitchView('planner');
  }
  if (typeof window.buildPlannerSidebar === 'function') {
    window.buildPlannerSidebar();
  }
  if (typeof window.buildPlannerCalendar === 'function') {
    window.buildPlannerCalendar();
  }
  
  draggedRoutine = null;
  draggedHabit = null;
  draggedTask = null;
}

/**
 * Handle task drop on timeline
 * Creates or updates planner event for the task
 */
async function handleTaskTimelineDrop(ctx, event, hour, dateStr, formatTimeFunction) {
  const { tasks: tasksValue, projects: projectsValue } = ctx;
  
  // Calculate time from drop position, snapped to :00, :15, :30, :45
  const PIXELS_PER_MINUTE = 1;
  let totalMins = hour * 60;
  const timelineEl = document.getElementById('planner-timeline');
  if (timelineEl) {
    const rect = timelineEl.getBoundingClientRect();
    const scrollTop = timelineEl.scrollTop || 0;
    const dropYInTimeline = event.clientY - rect.top + scrollTop;
    const rawTotalMins = Math.max(0, Math.min(24 * 60 - 1, Math.round(dropYInTimeline / PIXELS_PER_MINUTE)));
    totalMins = snapTotalMinutesToQuarter(rawTotalMins);
  } else {
    const slot = event.currentTarget;
    const slotRect = slot.getBoundingClientRect();
    const dropY = event.clientY - slotRect.top;
    const rawMinutes = Math.max(0, Math.min(59, Math.round(dropY / PIXELS_PER_MINUTE)));
    totalMins = hour * 60 + snapToQuarterHour(rawMinutes);
  }
  const startTime = formatTimeFunction(snapTotalMinutesToQuarter(totalMins));
  const duration = draggedTask.scheduledDurationMin || draggedTask.estimatedMinutes || 60;
  
  // Get the full task object from store
  const state = window.Petal?.store?.getState();
  const allTasks = state?.tasks || tasksValue || [];
  const task = allTasks.find(t => String(t.id) === String(draggedTask.id));
  
  if (!task) {
    console.error('Task not found:', draggedTask.id);
    draggedTask = null;
    return;
  }
  
  // Import converter
  const { taskToEvent, updateTaskFromEvent } = await import('../utils/taskEventConverter.js');
  
  // Check if task already has a linked event
  let eventObj;
  let updatedTask;
  
  if (task.plannerEventId) {
    // Update existing event
    const currentEvents = state?.events || [];
    const existingEvent = currentEvents.find(e => String(e.id) === String(task.plannerEventId));
    
    if (existingEvent) {
      // Update existing event
      eventObj = {
        ...existingEvent,
        date: dateStr,
        startTime: startTime,
        durationMin: duration
      };
      
      // Update task with new scheduling
      updatedTask = {
        ...task,
        scheduledDate: dateStr,
        scheduledStartTime: startTime,
        scheduledDurationMin: duration
      };
      
      // Update both event and task in store
      const updatedEvents = currentEvents.map(e => 
        String(e.id) === String(eventObj.id) ? eventObj : e
      );
      const updatedTasks = allTasks.map(t => 
        String(t.id) === String(task.id) ? updatedTask : t
      );
      
      if (window.Petal?.store) {
        window.Petal.store.setState({
          events: updatedEvents,
          tasks: updatedTasks
        });
      }
    } else {
      // Event was deleted, create new one
      eventObj = taskToEvent(task, dateStr, projectsValue || []);
      eventObj.startTime = startTime;
      eventObj.durationMin = duration;
      
      updatedTask = updateTaskFromEvent(task, eventObj);
      
      const updatedEvents = [...(state?.events || []), eventObj];
      const updatedTasks = allTasks.map(t => 
        String(t.id) === String(task.id) ? updatedTask : t
      );
      
      if (window.Petal?.store) {
        window.Petal.store.setState({
          events: updatedEvents,
          tasks: updatedTasks
        });
      }
    }
  } else {
    // Create new event for task
    eventObj = taskToEvent(task, dateStr, projectsValue || []);
    eventObj.startTime = startTime;
    eventObj.durationMin = duration;
    
    updatedTask = updateTaskFromEvent(task, eventObj);
    
    const updatedEvents = [...(state?.events || []), eventObj];
    const updatedTasks = allTasks.map(t => 
      String(t.id) === String(task.id) ? updatedTask : t
    );
    
    if (window.Petal?.store) {
      window.Petal.store.setState({
        events: updatedEvents,
        tasks: updatedTasks
      });
    }
  }
  
  // Re-render planner
  if (window.routerSwitchView) {
    window.routerSwitchView('planner');
  }
  if (typeof window.buildPlannerSidebar === 'function') {
    window.buildPlannerSidebar();
  }
  if (typeof window.buildPlannerCalendar === 'function') {
    window.buildPlannerCalendar();
  }
  
  draggedTask = null;
  
  console.log('✅ Task scheduled in planner:', {
    taskId: task.id,
    taskTitle: task.title,
    eventId: eventObj.id,
    date: dateStr,
    startTime: startTime,
    duration: duration
  });
}
