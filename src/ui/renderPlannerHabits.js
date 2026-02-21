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
        <div style="font-family:'Jost',sans-serif;font-size:8px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:var(--text-muted);">Habits (Today)</div>
        <button class="sidebar-add" onclick="openAddHabitModal()" style="font-size:16px;color:var(--text-muted);cursor:pointer;transition:color 0.13s;background:none;border:none;line-height:1;">+</button>
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
    visibleHabits.forEach(habit => {
      const checked = isHabitChecked(habit.id, today);
      const habitIdEsc = esc(habit.id);
      const habitNameEsc = esc(habit.name);
      
      html += `
        <div class="habit-item habit-draggable" draggable="true"
             data-habit-id="${habitIdEsc}"
             data-habit-name="${habitNameEsc}"
             style="display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:4px;transition:background 0.13s;cursor:grab;" 
             onclick="if(!event.target.closest('input') && !event.target.closest('button')){if(window.Petal?.features?.habits?.toggleHabit){window.Petal.features.habits.toggleHabit('${habitIdEsc}');if(typeof buildPlannerSidebar==='function'){buildPlannerSidebar();}}}"
             ondragstart="handleHabitDragStart(event)"
             ondragend="handleHabitDragEnd(event)">
          <input type="checkbox" ${checked ? 'checked' : ''} 
                 style="cursor:pointer;width:16px;height:16px;accent-color:var(--rose);pointer-events:auto;"
                 onclick="event.stopPropagation();if(window.Petal?.features?.habits?.toggleHabit){window.Petal.features.habits.toggleHabit('${habitIdEsc}');if(typeof buildPlannerSidebar==='function'){buildPlannerSidebar();}}"
                 ondragstart="event.stopPropagation();return false;"
                 draggable="false">
          <span style="font-size:12px;color:var(--text);flex:1;${checked ? 'text-decoration:line-through;opacity:0.6;' : ''}">${esc(habit.name)}</span>
          ${habit.cadence === 'weekly' ? '<span style="font-size:9px;color:var(--text-dim);">(weekly)</span>' : ''}
          <span style="font-size:8px;color:var(--text-dim);opacity:0.7;">(drag to schedule)</span>
          <button onclick="event.stopPropagation();if(confirm('Delete this habit?')){if(window.Petal?.features?.habits?.archiveHabit){window.Petal.features.habits.archiveHabit('${habitIdEsc}');if(typeof buildPlannerSidebar==='function'){buildPlannerSidebar();}}}" 
                  style="background:none;border:none;color:var(--text-dim);cursor:pointer;font-size:14px;padding:2px 4px;opacity:0.6;transition:opacity 0.13s;flex-shrink:0;" 
                  onmouseover="this.style.opacity='1';this.style.color='var(--overdue)'" 
                  onmouseout="this.style.opacity='0.6';this.style.color='var(--text-dim)'"
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
}
