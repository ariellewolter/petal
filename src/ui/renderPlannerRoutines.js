// ═══════════════════════ RENDER PLANNER ROUTINES ═══════════════════════
// Pure rendering function for routines panel in planner sidebar

import { esc } from '../utils/strings.js';
import { getActiveRoutines, isRoutineChecked, shouldShowRoutine } from '../features/routines.js';

/**
 * Render routines panel in planner sidebar
 * @param {HTMLElement} containerEl - Container element to render into
 * @param {Object} state - Current app state
 * @param {Date} [viewDate] - Date to show routines for (defaults to today)
 */
export function renderPlannerRoutines(containerEl, state, viewDate = new Date()) {
  const c = containerEl || document.getElementById('planner-routines-card');
  if (!c) {
    console.warn('Routines container not found - planner-routines-card element missing');
    return;
  }

  const routines = getActiveRoutines();
  const today = new Date(viewDate);
  const viewDateIso = today.toISOString();

  const visibleRoutines = routines.filter(r => shouldShowRoutine(r, today));

  let html = `
    <div class="planner-card" style="background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:12px;margin-bottom:12px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
        <div style="font-family:'Jost',sans-serif;font-size:8px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:var(--text-muted);">Routines</div>
        <button type="button" class="sidebar-add" data-action="planner:add-routine" style="font-size:16px;color:var(--text-muted);cursor:pointer;transition:color 0.13s;background:none;border:none;line-height:1;">+</button>
      </div>
      <div class="routines-list" style="display:flex;flex-direction:column;gap:6px;">
  `;

  if (visibleRoutines.length === 0) {
    html += `
      <div style="font-size:11px;color:var(--text-dim);padding:8px 0;text-align:center;">
        No routines yet
      </div>
    `;
  } else {
    visibleRoutines.forEach(routine => {
      const checked = isRoutineChecked(routine.id, today);

      const metaParts = [];
      if (routine.timeOfDay) metaParts.push(routine.timeOfDay);
      if (routine.durationMin) metaParts.push(`${routine.durationMin}m`);
      const metaStr = metaParts.length > 0 ? ` (${metaParts.join(' • ')})` : '';

      const routineIdAttr = esc(routine.id);

      html += `
        <div class="routine-item routine-draggable" draggable="true"
             data-routine-id="${routineIdAttr}"
             data-routine-name="${esc(routine.name)}"
             data-routine-time="${routine.timeOfDay || ''}"
             data-routine-duration="${routine.durationMin || ''}"
             data-action="planner:toggle-routine"
             data-date="${viewDateIso}"
             style="display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:4px;transition:background 0.13s;cursor:grab;"
             ondragstart="handleRoutineDragStart(event)"
             ondragend="handleRoutineDragEnd(event)">
          <input type="checkbox" ${checked ? 'checked' : ''}
                 data-action="planner:toggle-routine"
                 data-routine-id="${routineIdAttr}"
                 data-date="${viewDateIso}"
                 style="cursor:pointer;width:16px;height:16px;accent-color:var(--rose);pointer-events:auto;"
                 ondragstart="event.stopPropagation();return false;"
                 draggable="false">
          <div style="flex:1;min-width:0;">
            <span style="font-size:12px;color:var(--text);display:block;${checked ? 'text-decoration:line-through;opacity:0.6;' : ''}">${esc(routine.name)}</span>
            ${metaStr ? `<span style="font-size:9px;color:var(--text-dim);">${esc(metaStr)}</span>` : ''}
            ${routine.cadence === 'weekly' ? '<span style="font-size:9px;color:var(--text-dim);">(weekly)</span>' : ''}
            <span style="font-size:8px;color:var(--text-dim);opacity:0.7;">(drag to schedule)</span>
          </div>
          <button type="button"
                  data-action="planner:delete-routine"
                  data-routine-id="${routineIdAttr}"
                  style="background:none;border:none;color:var(--text-dim);cursor:pointer;font-size:14px;padding:2px 4px;opacity:0.6;transition:opacity 0.13s;flex-shrink:0;"
                  ondragstart="event.stopPropagation();return false;"
                  draggable="false"
                  title="Delete routine">×</button>
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
