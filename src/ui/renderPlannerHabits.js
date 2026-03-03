// ═══════════════════════ RENDER PLANNER HABITS ═══════════════════════
// Pure rendering function for habits panel in planner sidebar

import { esc, escAttr } from '../utils/strings.js';
import { getActiveHabits, isHabitChecked, shouldShowHabit } from '../features/habits.js';

/**
 * Render habits panel in planner sidebar
 * @param {HTMLElement} containerEl - Container element to render into
 * @param {Object} state - Current app state
 * @param {Date} [viewDate] - Date to show habits for (defaults to today)
 */
export function renderPlannerHabits(containerEl, state, viewDate = new Date()) {
  const c = containerEl || document.getElementById('planner-habits-card');
  if (!c) {
    console.warn('Habits container not found - planner-habits-card element missing');
    return;
  }
  
  console.log('Rendering habits panel', { containerFound: !!c, habitsCount: (state?.habits || []).length });
  
  const habits = getActiveHabits();
  const today = new Date(viewDate);
  
  // Filter habits that should be shown today
  const visibleHabits = habits.filter(h => shouldShowHabit(h, today));
  
  let html = `
    <div class="planner-card" style="background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:12px;margin-bottom:12px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
        <div style="font-family:'Jost',sans-serif;font-size:8px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:var(--text-muted);">Habits</div>
        <div style="display:flex;align-items:center;gap:6px;">
          <span class="today-card-action" data-action="nav:habits" role="button" tabindex="0" style="font-size:8px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:var(--text-dim);cursor:pointer;transition:color 0.13s;">All habits →</span>
          <button class="sidebar-add" onclick="openAddHabitModal()" style="font-size:16px;color:var(--text-muted);cursor:pointer;transition:color 0.13s;background:none;border:none;line-height:1;">+</button>
        </div>
      </div>
      <div class="habits-list" style="display:flex;flex-direction:column;gap:6px;">
  `;
  
  if (visibleHabits.length === 0) {
    html += `
      <div style="font-size:11px;color:var(--text-dim);padding:8px 0;text-align:center;">
        No habits yet
      </div>
    `;
  } else {
    const viewDateIso = today.toISOString();
    visibleHabits.forEach(habit => {
      const checked = isHabitChecked(habit.id, today);
      const habitIdEsc = esc(habit.id);
      const habitNameEsc = esc(habit.name);
      
      const durationEsc = (habit.durationMin != null && habit.durationMin > 0) ? String(habit.durationMin) : '';
      const timeOfDayEsc = (habit.timeOfDay && /^\d{2}:\d{2}$/.test(habit.timeOfDay)) ? habit.timeOfDay : '';
      html += `
        <div class="habit-item habit-draggable" draggable="true"
             data-habit-id="${habitIdEsc}"
             data-habit-name="${habitNameEsc}"
             data-habit-duration="${durationEsc}"
             data-habit-time="${esc(timeOfDayEsc)}"
             data-view-date="${escAttr(viewDateIso)}"
             style="display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:4px;transition:background 0.13s;cursor:grab;"
             ondragstart="handleHabitDragStart(event)"
             ondragend="handleHabitDragEnd(event)">
          <label class="habit-check-wrap" style="display:flex;align-items:center;cursor:pointer;flex-shrink:0;position:relative;z-index:2;padding:4px;margin:-4px 4px -4px 0;" data-habit-id="${habitIdEsc}" data-view-date="${escAttr(viewDateIso)}">
            <input type="checkbox" ${checked ? 'checked' : ''}
                   style="cursor:pointer;width:18px;height:18px;accent-color:var(--rose);pointer-events:auto;flex-shrink:0;margin:0;"
                   tabindex="0"
                   data-habit-id="${habitIdEsc}"
                   data-view-date="${escAttr(viewDateIso)}"
                   ondragstart="event.stopPropagation();return false;"
                   draggable="false">
          </label>
          <span style="font-size:12px;color:var(--text);flex:1;${checked ? 'text-decoration:line-through;opacity:0.6;' : ''}">${esc(habit.name)}</span>
          ${habit.cadence === 'weekly' ? '<span style="font-size:9px;color:var(--text-dim);">(weekly)</span>' : ''}
          ${timeOfDayEsc ? `<span style="font-size:9px;color:var(--text-dim);">${esc(timeOfDayEsc)}</span>` : ''}
          ${(habit.durationMin != null && habit.durationMin > 0) ? `<span style="font-size:9px;color:var(--text-dim);">${habit.durationMin} min</span>` : ''}
          <span style="font-size:8px;color:var(--text-dim);opacity:0.7;">(drag to schedule)</span>
          <button type="button" class="planner-habit-del" data-action="habit-archive" data-habit-id="${habitIdEsc}"
                  style="background:none;border:none;color:var(--text-dim);cursor:pointer;font-size:14px;padding:2px 4px;opacity:0.6;transition:opacity 0.13s;flex-shrink:0;" 
                  ondragstart="event.stopPropagation();return false;"
                  draggable="false"
                  title="Delete habit">×</button>
        </div>
      `;
    });
  }
  
  html += `
      </div>
    </div>
  `;
  
  c.innerHTML = html;

  // Event delegation: bind once per container, re-use stored handlers so we can remove before re-adding when DOM is replaced.
  const onMouseDown = (e) => {
    if (e.target.closest('.habit-item input[type=checkbox]') || e.target.closest('.habit-item label.habit-check-wrap')) {
      e.preventDefault();
      e.stopPropagation();
    }
  };
  const onClick = (e) => {
    const row = e.target.closest('.habit-item');
    if (!row) return;
    if (e.target.closest('button')) return; // delete button has its own handler
    const habitId = row.getAttribute('data-habit-id');
    const viewDateStr = row.getAttribute('data-view-date');
    const date = viewDateStr ? new Date(viewDateStr) : new Date();
    if (e.target.closest('input[type=checkbox]') || e.target.closest('label.habit-check-wrap')) e.preventDefault();
    if (habitId && window.Petal?.features?.habits?.toggleHabit) {
      window.Petal.features.habits.toggleHabit(habitId, date);
      if (typeof window.buildPlannerSidebar === 'function') window.buildPlannerSidebar();
    }
  };
  if (c._habitMouseDown) {
    c.removeEventListener('mousedown', c._habitMouseDown, true);
    c.removeEventListener('click', c._habitClick);
  }
  c._habitMouseDown = onMouseDown;
  c._habitClick = onClick;
  c.addEventListener('mousedown', onMouseDown, true);
  c.addEventListener('click', onClick);
}
