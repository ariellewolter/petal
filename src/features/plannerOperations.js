// ═══════════════════════ PLANNER OPERATIONS ═══════════════════════
// Operations for planner events and recurring rules

import { parseTime, formatTime } from '../utils/dates.js';
import { esc } from '../utils/strings.js';

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
  
  // Set editing state (global variable for backward compatibility)
  if (typeof window.editingEventId !== 'undefined') {
    window.editingEventId = eventId;
  }
  
  const modal = document.getElementById('event-modal');
  const titleEl = document.getElementById('event-modal-title');
  const deleteBtn = document.getElementById('event-delete-btn');
  if (!modal || !titleEl) return;
  
  titleEl.textContent = 'Edit Event';
  if (deleteBtn) deleteBtn.style.display = 'block';
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
 * Delete event
 */
export function deleteEvent(ctx, eventId) {
  if (confirm('Delete this event?')) {
    // Update store (single source of truth - auto-saves via persistence)
    if (window.Petal?.store) {
      const state = window.Petal.store.getState();
      const updatedEvents = (state.events || []).filter(e => e.id !== eventId);
      window.Petal.store.setState({ events: updatedEvents });
    } else {
      // Fallback: use local variable if store not available (shouldn't happen)
      const { events: eventsValue, save } = ctx;
      if (eventsValue) {
        const updatedEvents = eventsValue.filter(e => e.id !== eventId);
        // Note: This would need to update the global events variable
        // For now, just use store
        console.warn('Store not available, cannot delete event');
        return;
      }
    }
    
    // Re-render planner using router (single source of truth)
    if (window.routerSwitchView) {
      window.routerSwitchView('planner');
    }
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
  
  if (window.Petal?.features?.habits?.addHabit) {
    window.Petal.features.habits.addHabit({ name, cadence, daysOfWeek });
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
  if (!modal || !titleEl) return;
  
  titleEl.textContent = 'Add Routine';
  document.getElementById('routine-name').value = '';
  document.getElementById('routine-cadence').value = 'daily';
  document.getElementById('routine-time').value = '';
  document.getElementById('routine-duration').value = '';
  document.querySelectorAll('.routine-day').forEach(cb => cb.checked = false);
  document.getElementById('routine-days-of-week-field').style.display = 'none';
  
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
  
  if (window.Petal?.features?.routines?.addRoutine) {
    window.Petal.features.routines.addRoutine({ name, cadence, timeOfDay, durationMin, daysOfWeek });
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
  
  draggedHabit = {
    id: habitItem.dataset.habitId,
    name: habitItem.dataset.habitName
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
 * Handle timeline drop (create event from routine/habit)
 */
export function handleTimelineDrop(ctx, event, hour, dateStr) {
  const { events: eventsValue, formatTime: formatTimeFn, save: saveFn } = ctx;
  
  const formatTimeFunction = formatTimeFn || (typeof window.Petal?.formatTime === 'function' ? window.Petal.formatTime : null);
  if (!formatTimeFunction) {
    console.error('formatTime function not available');
    return;
  }
  
  console.log('Timeline drop:', { draggedRoutine, draggedHabit, hour, dateStr });
  if (!draggedRoutine && !draggedHabit) {
    console.warn('No dragged item');
    return;
  }
  
  // Calculate exact time based on drop position within the hour slot
  const slot = event.currentTarget;
  const slotRect = slot.getBoundingClientRect();
  const dropY = event.clientY - slotRect.top;
  const PIXELS_PER_MINUTE = 1;
  const minutesIntoHour = Math.max(0, Math.min(59, Math.round(dropY / PIXELS_PER_MINUTE)));
  
  const startTime = formatTimeFunction(hour * 60 + minutesIntoHour);
  let duration = 60; // Default 1 hour
  let title = '';
  let category = 'personal';
  
  if (draggedRoutine) {
    title = draggedRoutine.name;
    duration = draggedRoutine.durationMin || 60;
    category = 'personal'; // Routines default to personal category
  } else if (draggedHabit) {
    title = draggedHabit.name;
    duration = 30; // Habits default to 30 minutes
    category = 'personal';
  }
  
  // Create event from routine/habit
  const eventObj = {
    id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    title: title,
    date: dateStr,
    startTime: startTime,
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
}
