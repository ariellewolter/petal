// ═══════════════════════ ROUTINES PAGE ═══════════════════════
// Tracks common things done in a day; links to routines in the Planner

import { escapeHtml } from '../utils/strings.js';
import { EmptyState, Buttons, PageHeader, StatCard } from '../ui/components.js';
import { getActiveRoutines, isRoutineChecked, toggleRoutine, archiveRoutine } from '../features/routines.js';

const DAYS_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
let stylesInjected = false;
let unsubscribeStore = null;

/**
 * Inject scoped CSS (only once)
 */
function injectStyles() {
  if (stylesInjected) return;
  const styleId = 'routines-page-styles';
  if (document.getElementById(styleId)) {
    stylesInjected = true;
    return;
  }
  const styleEl = document.createElement('style');
  styleEl.id = styleId;
  styleEl.textContent = `
    #view-routines .routines-stats-row {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 14px;
      margin-bottom: 28px;
    }
    @media (max-width: 600px) {
      #view-routines .routines-stats-row {
        grid-template-columns: 1fr;
      }
    }
    #view-routines .routines-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 12px;
      margin-bottom: 24px;
    }
    #view-routines .routines-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    #view-routines .routine-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 14px 18px;
      display: flex;
      align-items: center;
      gap: 14px;
      transition: background 0.15s, border-color 0.15s;
    }
    #view-routines .routine-card:hover {
      background: var(--bg2);
      border-color: var(--border2);
    }
    #view-routines .routine-card.done {
      opacity: 0.75;
    }
    #view-routines .routine-card.done .routine-name { text-decoration: line-through; color: var(--text-dim); }
    #view-routines .routine-check {
      flex-shrink: 0;
      width: 20px;
      height: 20px;
      accent-color: var(--rose);
      cursor: pointer;
    }
    #view-routines .routine-body {
      flex: 1;
      min-width: 0;
    }
    #view-routines .routine-name {
      font-size: 14px;
      font-weight: 500;
      color: var(--text);
    }
    #view-routines .routine-meta {
      font-size: 11px;
      color: var(--text-dim);
      margin-top: 4px;
    }
    #view-routines .routine-cadence {
      display: inline-block;
      font-size: 9px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      background: var(--bg2);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 2px 8px;
      margin-top: 6px;
      color: var(--text-dim);
    }
    #view-routines .routine-edit {
      flex-shrink: 0;
      background: none;
      border: none;
      color: var(--text-dim);
      cursor: pointer;
      font-size: 12px;
      padding: 4px 10px;
      border-radius: 6px;
      transition: color 0.13s, background 0.13s;
    }
    #view-routines .routine-edit:hover {
      color: var(--text);
      background: var(--bg2);
    }
    #view-routines .routine-delete {
      flex-shrink: 0;
      background: none;
      border: none;
      color: var(--text-dim);
      cursor: pointer;
      font-size: 18px;
      padding: 4px 8px;
      border-radius: 6px;
      transition: color 0.13s, background 0.13s;
    }
    #view-routines .routine-delete:hover {
      color: var(--overdue);
      background: var(--rose-pale);
    }
    #view-routines .routines-cta {
      margin-top: 24px;
      padding: 20px;
      background: var(--surface);
      border: 1px dashed var(--border);
      border-radius: 12px;
      text-align: center;
      color: var(--text-dim);
      font-size: 13px;
    }
    #view-routines .routines-cta a {
      color: var(--rose);
      text-decoration: none;
      font-weight: 500;
    }
    #view-routines .routines-cta a:hover { text-decoration: underline; }
  `;
  document.head.appendChild(styleEl);
  stylesInjected = true;
}

/**
 * Get today's date for check-off
 */
function todayDate() {
  return new Date();
}

/**
 * Build meta string for a routine (time, duration, days)
 */
function routineMeta(r) {
  const parts = [];
  if (r.timeOfDay) parts.push(r.timeOfDay);
  if (r.durationMin) parts.push(`${r.durationMin}m`);
  if (r.cadence === 'weekly' && r.daysOfWeek?.length) {
    const days = r.daysOfWeek.map(d => DAYS_LABELS[d]).join(', ');
    parts.push(days);
  }
  return parts.length ? parts.join(' • ') : null;
}

/**
 * Render the routines list and stats
 */
function renderContent(container) {
  const state = window.Petal?.store?.getState?.() || {};
  const routines = getActiveRoutines();
  const today = todayDate();
  const doneToday = routines.filter(r => isRoutineChecked(r.id, today)).length;

  const header = container.querySelector('.page-header');
  const statusEl = header?.querySelector('.page-header-status');
  if (statusEl) statusEl.textContent = `${doneToday} / ${routines.length} today`;

  const statsContainer = container.querySelector('#routines-stats-row');
  if (statsContainer) {
    statsContainer.innerHTML = `
      ${StatCard({ label: 'Routines', value: String(routines.length), subtitle: 'total', variant: 1 })}
      ${StatCard({ label: 'Today', value: `${doneToday}/${routines.length}`, subtitle: 'completed', variant: 2 })}
      ${StatCard({ label: 'Planner', value: '—', subtitle: 'check off in Planner', variant: 3 })}
    `;
  }

  const listEl = container.querySelector('[data-routines-list]');
  if (!listEl) return;

  if (routines.length === 0) {
    listEl.innerHTML = EmptyState({
      icon: '◷',
      message: 'No routines yet',
      subtitle: 'Add common things you do each day. They’ll appear in the Planner so you can check them off.',
      action: { text: '+ Add Routine', action: 'routines:add' }
    });
    return;
  }

  const items = routines.map(r => {
    const checked = isRoutineChecked(r.id, today);
    const meta = routineMeta(r);
    const idEsc = escapeHtml(r.id);
    const nameEsc = escapeHtml(r.name);
    return `
      <div class="routine-card ${checked ? 'done' : ''}" data-routine-id="${idEsc}">
        <input type="checkbox" class="routine-check" ${checked ? 'checked' : ''}
               data-action="routines:toggle" data-routine-id="${idEsc}" title="Toggle for today">
        <div class="routine-body">
          <div class="routine-name">${escapeHtml(r.icon || '📋')} ${nameEsc}</div>
          ${meta ? `<div class="routine-meta">${escapeHtml(meta)}</div>` : ''}
          <span class="routine-cadence">${r.cadence === 'weekly' ? 'Weekly' : 'Daily'}</span>
        </div>
        <button type="button" class="routine-edit" data-action="routines:edit" data-routine-id="${idEsc}" title="Edit routine">Edit</button>
        <button type="button" class="routine-delete" data-action="routines:archive" data-routine-id="${idEsc}" title="Remove routine">×</button>
      </div>
    `;
  }).join('');

  listEl.innerHTML = items;
}

/**
 * Main render entry
 */
export function renderRoutinesPage(containerEl, state, _options = {}) {
  const container = containerEl || document.getElementById('view-routines');
  if (!container) return;

  injectStyles();

  const routines = getActiveRoutines();
  const today = todayDate();
  const doneToday = routines.filter(r => isRoutineChecked(r.id, today)).length;

  container.innerHTML = '';
  const header = document.createElement('header');
  header.className = 'page-header';
  header.innerHTML = PageHeader({
    title: 'Routines',
    icon: '◷',
    status: `${doneToday} / ${routines.length} today`,
    actions: [
      { type: 'secondary', text: 'Open in Planner', action: 'routines:open-planner' },
      { type: 'primary', text: '+ Add Routine', action: 'routines:add' }
    ]
  });
  container.appendChild(header);

  const main = document.createElement('main');
  main.className = 'routines-main';
  main.setAttribute('data-routines-page', 'true');
  main.innerHTML = `
    <p style="font-size:13px;color:var(--text-dim);margin-bottom:24px;">
      Common things you do in a day. They appear in the Planner sidebar so you can check them off when you do them.
    </p>
    <div id="routines-stats-row" class="routines-stats-row"></div>
    <div class="routines-toolbar">
      <span style="font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:var(--text-muted);">Today</span>
    </div>
    <div data-routines-list class="routines-list"></div>
    <div class="routines-cta">
      To schedule routines on your day, open the <a href="#" data-action="routines:open-planner">Planner</a> and drag routines onto the timeline.
    </div>
  `;
  container.appendChild(main);

  renderContent(container);

  // Subscribe to store so adding/removing routines or toggling check-offs re-renders list
  if (unsubscribeStore) unsubscribeStore();
  if (window.Petal?.store?.subscribe) {
    unsubscribeStore = window.Petal.store.subscribe(() => {
      if (window.currentView !== 'routines') return;
      const listEl = document.querySelector('#view-routines [data-routines-list]');
      const statsEl = document.querySelector('#view-routines #routines-stats-row');
      if (listEl && document.getElementById('view-routines')?.style.display !== 'none') {
        const state = window.Petal.store.getState();
        const routines = (state.routines || []).filter(r => !r.archived);
        const today = todayDate();
        const doneToday = routines.filter(r => isRoutineChecked(r.id, today)).length;
        const headerStatus = document.querySelector('#view-routines .page-header-status');
        if (headerStatus) headerStatus.textContent = `${doneToday} / ${routines.length} today`;
        if (statsEl) {
          statsEl.innerHTML = `
            ${StatCard({ label: 'Routines', value: String(routines.length), subtitle: 'total', variant: 1 })}
            ${StatCard({ label: 'Today', value: `${doneToday}/${routines.length}`, subtitle: 'completed', variant: 2 })}
            ${StatCard({ label: 'Planner', value: '—', subtitle: 'check off in Planner', variant: 3 })}
          `;
        }
        if (routines.length === 0) {
          listEl.innerHTML = EmptyState({
            icon: '◷',
            message: 'No routines yet',
            subtitle: 'Add common things you do each day. They’ll appear in the Planner so you can check them off.',
            action: { text: '+ Add Routine', action: 'routines:add' }
          });
        } else {
          listEl.innerHTML = routines.map(r => {
            const checked = isRoutineChecked(r.id, today);
            const meta = routineMeta(r);
            const idEsc = escapeHtml(r.id);
            const nameEsc = escapeHtml(r.name);
            return `
              <div class="routine-card ${checked ? 'done' : ''}" data-routine-id="${idEsc}">
                <input type="checkbox" class="routine-check" ${checked ? 'checked' : ''}
                       data-action="routines:toggle" data-routine-id="${idEsc}" title="Toggle for today">
                <div class="routine-body">
                  <div class="routine-name">${escapeHtml(r.icon || '📋')} ${nameEsc}</div>
                  ${meta ? `<div class="routine-meta">${escapeHtml(meta)}</div>` : ''}
                  <span class="routine-cadence">${r.cadence === 'weekly' ? 'Weekly' : 'Daily'}</span>
                </div>
                <button type="button" class="routine-edit" data-action="routines:edit" data-routine-id="${idEsc}" title="Edit routine">Edit</button>
                <button type="button" class="routine-delete" data-action="routines:archive" data-routine-id="${idEsc}" title="Remove routine">×</button>
              </div>
            `;
          }).join('');
        }
      }
    });
  }

  bind(container);
}

/**
 * Bind click handlers (event delegation)
 */
function bind(container) {
  if (container.__routinesBound) return;
  container.__routinesBound = true;

  container.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = (btn.dataset.action || btn.getAttribute('data-action') || '').trim();
    if (!action || !action.startsWith('routines:')) return;

    e.preventDefault();
    e.stopPropagation();

    const routineId = btn.dataset.routineId || btn.closest('[data-routine-id]')?.dataset.routineId;

    switch (action) {
      case 'routines:toggle':
        if (routineId) {
          toggleRoutine(routineId, todayDate());
          if (typeof window.buildPlannerSidebar === 'function') window.buildPlannerSidebar();
          renderContent(container);
        }
        break;
      case 'routines:add':
        if (window.Petal?.features?.plannerOperations?.openAddRoutineModal) {
          window.Petal.features.plannerOperations.openAddRoutineModal();
        } else if (typeof window.openAddRoutineModal === 'function') {
          window.openAddRoutineModal();
        }
        break;
      case 'routines:edit':
        if (routineId && window.Petal?.features?.plannerOperations?.openEditRoutineModal) {
          window.Petal.features.plannerOperations.openEditRoutineModal(routineId);
        }
        break;
      case 'routines:open-planner':
        if (window.switchView) window.switchView('planner');
        break;
      case 'routines:archive':
        if (routineId && confirm('Remove this routine? You can add it again from the Planner.')) {
          archiveRoutine(routineId);
          if (typeof window.buildPlannerSidebar === 'function') window.buildPlannerSidebar();
          renderContent(container);
          if (window.renderGlobalSidebar && window.Petal?.store) {
            window.renderGlobalSidebar(window.Petal.store.getState());
          }
        }
        break;
      default:
        break;
    }
  });
}

/**
 * Cleanup on unmount (optional)
 */
export function cleanupRoutinesPage() {
  if (unsubscribeStore) {
    unsubscribeStore();
    unsubscribeStore = null;
  }
  const container = document.getElementById('view-routines');
  if (container) container.__routinesBound = false;
}
