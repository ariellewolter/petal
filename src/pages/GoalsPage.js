// ═══════════════════════ GOALS PAGE ═══════════════════════
// Goals tracking page with milestones, timeline, and planning views
// Inspired by the provided design with full functionality

import { escapeHtml } from '../utils/strings.js';
import { parseDate, today } from '../utils/dates.js';
import { showNotification } from '../ui/components.js';
import { getAllTasks } from '../domain/models.js';

// Constants
const CATS = ['career', 'health', 'mind', 'finance', 'personal', 'phd', 'lab'];
const CAT_COLS = {
  career: '#c98b8b', health: '#8aa89a', mind: '#a894b8', 
  finance: '#c9a96e', personal: '#7a9cbf',
  phd: '#8b7aa8', lab: '#7aa8a8'
};
const CAT_PALE = {
  career: '#f5edec', health: '#eef4f1', mind: '#f0ecf5', 
  finance: '#faf4ea', personal: '#eef2f8',
  phd: '#ede5f0', lab: '#e5f0f0'
};
const EMOJIS = ['✦', '🎯', '🔬', '📚', '💪', '💰', '🌿', '✈️', '🎨', '🏃', 
                '🧘', '🎓', '🏠', '🌟', '◎', '🏆', '🚀', '💡', '🔑', '🌱'];

// State
let goals = [];
let selId = null;
let tlHorizon = 'year';
let showDone = false;
let planYear = new Date().getFullYear();
let linkProjectGoalId = null;
let linkTasksGoalId = null;
let addMilestoneGoalId = null;

// Utility functions
const pad = (n) => String(n).padStart(2, '0');
const ts = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const ad = (ds, n) => {
  const d = new Date(ds + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};
const fs = (d) => {
  if (!d) return '';
  const x = new Date(d + 'T00:00:00');
  return x.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};
const fl = (d) => {
  if (!d) return '';
  const x = new Date(d + 'T00:00:00');
  return x.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};
const daysLeft = (ds) => {
  if (!ds) return null;
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  const d = new Date(ds + 'T00:00:00');
  return Math.round((d - t) / 86400000);
};

/**
 * Auto-calculate progress from milestones
 */
function autoProgress(g) {
  const ms = g.milestones || [];
  if (!ms.length) return;
  g.progress = Math.round((ms.filter(m => m.done).length / ms.length) * 100);
}

/**
 * Save goals to state
 */
function saveGoals(state, handlers) {
  if (handlers?.save) {
    handlers.save({ goals });
  } else if (window.Petal?.store) {
    window.Petal.store.setState({ goals });
  }
}

/**
 * Load goals from state
 */
function loadGoals(state) {
  goals = Array.isArray(state.goals) ? state.goals : [];
  // Ensure all goals have required fields
  goals.forEach(g => {
    if (!g.milestones) g.milestones = [];
    if (g.progress === undefined) autoProgress(g);
    if (!Array.isArray(g.projectIds)) {
      g.projectIds = g.projectId != null ? [g.projectId] : [];
    }
    if (!Array.isArray(g.taskIds)) g.taskIds = [];
  });
}

/**
 * Render Goals page
 * @param {HTMLElement} containerEl - Container element to render into
 * @param {Object} state - Current app state
 * @param {Object} handlers - Event handlers
 */
const GOALS_OVERLAY_IDS = ['drawer-bg', 'modal-bg', 'goal-project-modal-bg', 'goal-tasks-modal-bg', 'goal-milestone-modal-bg'];

export async function renderGoalsPage(containerEl, state, handlers) {
  if (!containerEl) return;

  loadGoals(state);

  // Remove any previous goals overlays from body (from a prior render) so we don't duplicate when re-rendering.
  // Also remove any empty .goals-page wrappers left when the add modal was moved back to the view.
  document.querySelectorAll('body > .goals-page').forEach(w => {
    if (w.parentNode === document.body) {
      const hasOverlay = GOALS_OVERLAY_IDS.some(id => w.querySelector('#' + id));
      if (!hasOverlay || w.children.length === 0) w.remove();
    }
  });
  GOALS_OVERLAY_IDS.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      const root = el.parentNode === document.body ? el : (el.closest && el.closest('body > .goals-page'));
      if (root && root.parentNode === document.body) root.remove();
    }
  });

  const now = new Date();
  const dayName = now.toLocaleDateString(undefined, { weekday: "long" });
  const fullDate = now.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });

  containerEl.innerHTML = `
    <div class="goals-page">
      <!-- HEADER -->
      <div class="page-header">
        <div class="ph-left">
          <div class="ph-day">
            <span id="ph-day">Goals</span>
            <span class="ph-date" id="ph-date">${escapeHtml(fullDate)}</span>
          </div>
        </div>
        <div class="ph-right">
          <div class="seg-group" id="h-group">
            <button class="seg-btn" data-h="week">Week</button>
            <button class="seg-btn" data-h="month">Month</button>
            <button class="seg-btn active" data-h="year">Year</button>
          </div>
          <button type="button" class="add-btn" id="open-modal-btn" data-action="goal:add">+ New Goal</button>
        </div>
      </div>

      <!-- PAGE BODY -->
      <div class="page-body" id="page-body">
        <!-- STAT ROW -->
        <div class="stat-row" id="stat-row"></div>

        <!-- CARD GRID -->
        <div class="card-grid">
          <!-- CARD 1: ALL GOALS (wide) -->
          <div class="card card-wide" style="animation-delay:.05s">
            <div class="card-head">
              <div class="card-head-left">
                <div class="card-dot" style="background:var(--rose)"></div>
                <div class="card-title">All Goals</div>
              </div>
              <div class="card-action" id="open-modal-link" data-action="goal:add" role="button" tabindex="0">
                + Add <span class="card-action-arrow">→</span>
              </div>
            </div>
            <div class="card-body">
              <div class="goal-list-scroll" id="goal-list"></div>
            </div>
          </div>

          <!-- CARD 2: CATEGORY BREAKDOWN -->
          <div class="card" style="animation-delay:.08s">
            <div class="card-head">
              <div class="card-head-left">
                <div class="card-dot" style="background:var(--mauve)"></div>
                <div class="card-title">By Category</div>
              </div>
            </div>
            <div class="card-body">
              <div class="cat-card-inner" id="cat-breakdown"></div>
            </div>
          </div>

          <!-- CARD 3: WEEKLY FOCUS (wide) -->
          <div class="card card-wide" style="animation-delay:.1s">
            <div class="card-head">
              <div class="card-head-left">
                <div class="card-dot" style="background:var(--amber)"></div>
                <div class="card-title" id="focus-card-title">This Week's Focus</div>
              </div>
              <div class="card-action" style="font-size:9.5px;color:var(--text-light);cursor:default;" id="focus-card-sub"></div>
            </div>
            <div class="card-body">
              <div class="focus-inner" id="focus-inner"></div>
            </div>
          </div>

          <!-- CARD 4: SUB-GOALS (MILESTONES) -->
          <div class="card" style="animation-delay:.12s">
            <div class="card-head">
              <div class="card-head-left">
                <div class="card-dot" style="background:var(--sage)"></div>
                <div class="card-title">Sub-goals (milestones)</div>
              </div>
              <div class="card-action" id="ms-show-done-toggle" data-action="goal:toggle-done">Show done →</div>
            </div>
            <div class="card-body">
              <div class="ms-card-scroll" id="ms-card-scroll"></div>
            </div>
          </div>

          <!-- CARD 5: HORIZON TIMELINE (full width) -->
          <div class="card card-full" style="animation-delay:.14s">
            <div class="card-head">
              <div class="card-head-left">
                <div class="card-dot" style="background:var(--blue)"></div>
                <div class="card-title">Goal Timeline</div>
              </div>
              <div class="card-action" style="cursor:default;font-size:9.5px;color:var(--text-light)" id="tl-range-lbl"></div>
            </div>
            <div class="card-body card-body-scroll" style="max-height:520px;">
              <div class="horizon-inner">
                <div class="htabs" id="htabs">
                  <button class="htab" data-h="week">Week</button>
                  <button class="htab" data-h="month">Month</button>
                  <button class="htab on" data-h="year">Year</button>
                </div>
                <div id="timeline-wrap"></div>
              </div>
            </div>
          </div>

          <!-- CARD 6: MONTHLY GOALS PLANNER (full width) -->
          <div class="card card-full" style="animation-delay:.16s">
            <div class="card-head">
              <div class="card-head-left">
                <div class="card-dot" style="background:var(--amber)"></div>
                <div class="card-title">Goals by Month</div>
              </div>
              <div style="display:flex;align-items:center;gap:8px;">
                <div class="card-action" id="plan-prev-yr" data-action="goal:prev-year" style="font-size:15px;padding:0 4px;">‹</div>
                <div style="font-family:'Cormorant Garamond',serif;font-size:15px;font-style:italic;color:var(--text-dim);" id="plan-year-lbl"></div>
                <div class="card-action" id="plan-next-yr" data-action="goal:next-year" style="font-size:15px;padding:0 4px;">›</div>
              </div>
            </div>
            <div class="card-body card-body-scroll" style="max-height:600px;">
              <div id="monthly-plan-wrap" style="padding:0 2px 2px;"></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- DRAWER -->
    <div class="drawer-bg" id="drawer-bg">
      <div class="drawer" id="drawer">
        <div class="drawer-head">
          <div class="dh-top">
            <div class="dh-badge">◎ Goal</div>
            <button class="dh-close" id="drawer-close" data-action="goal:close-drawer">✕</button>
          </div>
          <div class="dh-title-row">
            <div class="dh-emoji" id="dh-emoji">◎</div>
            <textarea class="dh-title" id="dh-title" rows="2" placeholder="Goal title…"></textarea>
          </div>
        </div>
        <div class="d-tabs">
          <button class="dtab on" data-tab="details" data-action="goal:drawer-tab">Details</button>
          <button class="dtab" data-tab="milestones" data-action="goal:drawer-tab">Milestones</button>
          <button class="dtab" data-tab="notes" data-action="goal:drawer-tab">Notes</button>
        </div>
        <div class="d-body">
          <div class="dpanel on" id="dpanel-details"></div>
          <div class="dpanel" id="dpanel-milestones"></div>
          <div class="dpanel" id="dpanel-notes"></div>
        </div>
        <div class="d-foot">
          <div class="df-btns">
            <button class="df-btn df-save" id="d-save" data-action="goal:save">Save</button>
            <button class="df-btn df-del" id="d-del" data-action="goal:delete">Delete</button>
          </div>
          <div class="df-created" id="d-created"></div>
        </div>
      </div>
    </div>

    <!-- ADD MODAL -->
    <div class="modal-bg" id="modal-bg">
      <div class="modal">
        <div class="modal-head">
          <div class="mh-title">New Goal</div>
          <button class="modal-x" id="modal-x" data-action="goal:close-modal">✕</button>
        </div>
        <div class="modal-body" id="modal-body"></div>
        <div class="modal-foot">
          <button class="mf-btn mf-cancel" id="modal-cancel" data-action="goal:close-modal">Cancel</button>
          <button class="mf-btn mf-save" id="modal-save" data-action="goal:create">Add Goal</button>
        </div>
      </div>
    </div>

    <!-- LINK PROJECTS MODAL -->
    <div class="modal-bg" id="goal-project-modal-bg" style="display:none;">
      <div class="modal goal-link-modal">
        <div class="modal-head">
          <div class="mh-title">Projects for this goal</div>
          <button class="modal-x" id="goal-project-modal-close" data-action="goal:close-project-modal">✕</button>
        </div>
        <div class="modal-body">
          <div id="goal-projects-linked-list" class="goal-tasks-linked"></div>
          <label class="goal-link-lbl">Add project</label>
          <select id="goal-projects-add-select" class="goal-link-select">
            <option value="">— Choose project —</option>
          </select>
        </div>
        <div class="modal-foot">
          <button class="mf-btn mf-save" data-action="goal:close-project-modal">Done</button>
        </div>
      </div>
    </div>

    <!-- LINK TASKS MODAL -->
    <div class="modal-bg" id="goal-tasks-modal-bg" style="display:none;">
      <div class="modal goal-link-modal">
        <div class="modal-head">
          <div class="mh-title">Tasks for this goal</div>
          <button class="modal-x" id="goal-tasks-modal-close" data-action="goal:close-tasks-modal">✕</button>
        </div>
        <div class="modal-body">
          <div id="goal-tasks-linked-list" class="goal-tasks-linked"></div>
          <label class="goal-link-lbl">Add task</label>
          <select id="goal-tasks-add-select" class="goal-link-select">
            <option value="">— Choose task —</option>
          </select>
        </div>
        <div class="modal-foot">
          <button class="mf-btn mf-save" data-action="goal:close-tasks-modal">Done</button>
        </div>
      </div>
    </div>

    <!-- ADD SUB-GOAL MODAL (opened from a specific goal) -->
    <div class="modal-bg" id="goal-milestone-modal-bg" style="display:none;">
      <div class="modal goal-link-modal">
        <div class="modal-head">
          <div class="mh-title" id="goal-milestone-modal-title">Add sub-goal</div>
          <button class="modal-x" data-action="goal:close-milestone-modal">✕</button>
        </div>
        <div class="modal-body">
          <label class="goal-link-lbl">Sub-goal / milestone</label>
          <input type="text" id="goal-milestone-title" class="goal-link-select" placeholder="Title">
          <label class="goal-link-lbl">Due date (optional)</label>
          <input type="date" id="goal-milestone-date" class="goal-link-select">
        </div>
        <div class="modal-foot">
          <button class="mf-btn mf-cancel" data-action="goal:close-milestone-modal">Cancel</button>
          <button class="mf-btn mf-save" data-action="goal:add-milestone-from-modal">Add</button>
        </div>
      </div>
    </div>
  `;

  // Render all sections
  renderAll(state, handlers);

  // Set up event delegation
  setupEventDelegation(containerEl, state, handlers);

  // Portal drawer and modals to body so position:fixed is viewport-relative (like Habits/other pages).
  // Wrap in .goals-page so existing .goals-page .drawer-bg / .modal-bg CSS still applies.
  GOALS_OVERLAY_IDS.forEach(id => {
    const el = document.getElementById(id);
    if (el && el.parentNode !== document.body) {
      const wrapper = document.createElement('div');
      wrapper.className = 'goals-page';
      wrapper.appendChild(el);
      document.body.appendChild(wrapper);
    }
  });
}

/**
 * Render all sections
 */
function renderAll(state, handlers) {
  renderStats();
  renderGoalList(state);
  renderCategories();
  renderFocus();
  renderMilestonesCard();
  renderTimeline();
  renderMonthlyPlan();
}

/**
 * Render stats row
 */
function renderStats() {
  const active = goals.filter(g => g.progress < 100).length;
  const completed = goals.filter(g => g.progress >= 100).length;
  const total = goals.length;
  const allMs = goals.flatMap(g => g.milestones || []);
  const today = ts();
  const thisWeekEnd = ad(today, 7);
  const weekMs = allMs.filter(ms => !ms.done && ms.date && ms.date >= today && ms.date <= thisWeekEnd).length;
  const overallPct = total > 0 ? Math.round(goals.reduce((s, g) => s + (g.progress || 0), 0) / total) : 0;

  const el = document.getElementById('stat-row');
  if (!el) return;

  el.innerHTML = `
    <div class="stat-card sc-rose" style="animation-delay:.02s">
      <div class="stat-lbl">Active Goals</div>
      <div class="stat-val">${active}</div>
      <div class="stat-sub">${completed} completed</div>
    </div>
    <div class="stat-card sc-amber" style="animation-delay:.04s">
      <div class="stat-lbl">This Week</div>
      <div class="stat-val">${weekMs}</div>
      <div class="stat-sub">milestone${weekMs !== 1 ? 's' : ''} due</div>
    </div>
    <div class="stat-card sc-sage" style="animation-delay:.06s">
      <div class="stat-lbl">Overall Progress</div>
      <div class="stat-val">${overallPct}<span style="font-size:18px;opacity:.5">%</span></div>
      <div class="stat-prog"><div class="stat-prog-fill" style="width:${overallPct}%;background:var(--sage)"></div></div>
    </div>
    <div class="stat-card sc-mauve" style="animation-delay:.08s">
      <div class="stat-lbl">Milestones Done</div>
      <div class="stat-val">${allMs.filter(m => m.done).length}<span style="font-size:16px;opacity:.35"> / ${allMs.length}</span></div>
      <div class="stat-sub">${allMs.length - allMs.filter(m => m.done).length} remaining</div>
    </div>
  `;
}

/**
 * Render goal list
 * @param {Object} [state] - App state (for resolving project names)
 */
function renderGoalList(state) {
  const el = document.getElementById('goal-list');
  if (!el) return;

  if (!goals.length) {
    el.innerHTML = `<div class="card-empty">No goals yet.<br>Click <em>+ New Goal</em> to get started.</div>`;
    return;
  }

  // Sort: in-progress first, then by progress desc, done last
  const sorted = [...goals].sort((a, b) => {
    if (a.progress >= 100 && b.progress < 100) return 1;
    if (b.progress >= 100 && a.progress < 100) return -1;
    return (b.progress || 0) - (a.progress || 0);
  });

  el.innerHTML = sorted.map((g, i) => {
    const pct = g.progress || 0;
    const msDone = (g.milestones || []).filter(m => m.done).length;
    const msTotal = (g.milestones || []).length;
    const dl = daysLeft(g.deadline);
    const isDone = pct >= 100;
    const isOver = dl !== null && dl < 0 && !isDone;
    const color = CAT_COLS[g.cat] || 'var(--rose)';
    // ring params
    const R = 16, C = 2 * Math.PI * R;
    const offset = C - (pct / 100) * C;

    let dueChip = '';
    if (isDone) dueChip = `<span class="g-chip gc-done">✓ Complete</span>`;
    else if (isOver) dueChip = `<span class="g-chip gc-over">${Math.abs(dl)}d overdue</span>`;
    else if (dl !== null && dl <= 7) dueChip = `<span class="g-chip gc-due">${dl === 0 ? 'Today' : dl === 1 ? 'Tomorrow' : dl + 'd left'}</span>`;
    else if (dl !== null) dueChip = `<span class="g-chip gc-due">⏱ ${fs(g.deadline)}</span>`;

    const projectIds = g.projectIds || [];
    const taskIds = g.taskIds || [];
    const taskCount = taskIds.length;
    const projectCount = projectIds.length;
    const projects = state?.projects || [];
    const projectLabels = projectIds.map(pid => projects.find(p => String(p.id) === String(pid))?.name).filter(Boolean);
    const projectLabel = projectCount === 0 ? '' : projectCount === 1 ? projectLabels[0] : `${projectCount} projects`;
    return `<div class="goal-row ${selId === g.id ? 'active-row' : ''}" data-cat="${g.cat || ''}" data-gid="${g.id}" data-action="goal:open" style="animation-delay:${i * .03}s">
      <div class="g-ring">
        <svg class="ring-svg" width="40" height="40" viewBox="0 0 40 40">
          <circle class="ring-bg" cx="20" cy="20" r="${R}"/>
          <circle class="ring-fill" cx="20" cy="20" r="${R}"
            stroke="${color}" stroke-dasharray="${C}" stroke-dashoffset="${offset}"
            style="transition:stroke-dashoffset .6s ease"/>
          <text x="20" y="24" text-anchor="middle" font-size="9" font-family="Jost,sans-serif" font-weight="300" fill="${color}">${pct}%</text>
        </svg>
      </div>
      <div class="g-info">
        <div class="g-name">${escapeHtml(g.emoji || '◎')} ${escapeHtml(g.name)}</div>
        <div class="g-meta">
          <span class="g-chip gc-${g.cat || 'personal'}">${g.cat || 'personal'}</span>
          ${dueChip}
        </div>
      </div>
      ${msTotal > 0 ? `<div class="g-ms-count">☰ ${msDone}/${msTotal}</div>` : ''}
      <div class="g-card-actions">
        <button type="button" class="btn-del btn-edit" data-action="goal:open" data-gid="${g.id}" title="Edit" style="font-size:13px;line-height:1;min-width:28px;min-height:28px;color:var(--text-dim);">✎</button>
        <button type="button" class="g-link-btn" data-action="goal:open-milestone-modal" data-gid="${g.id}" title="Add sub-goal / milestone">Sub-goals${msTotal ? ` (${msTotal})` : ''}</button>
        <button type="button" class="g-link-btn" data-action="goal:link-project" data-gid="${g.id}" title="${projectLabel ? escapeHtml(projectLabel) : 'Link projects'}">Project${projectCount ? ` (${projectCount})` : ''}</button>
        <button type="button" class="g-link-btn" data-action="goal:link-tasks" data-gid="${g.id}" title="Add tasks to this goal">Tasks${taskCount ? ` (${taskCount})` : ''}</button>
      </div>
    </div>`;
  }).join('');
}

/**
 * Render category breakdown
 */
function renderCategories() {
  const el = document.getElementById('cat-breakdown');
  if (!el) return;

  if (!goals.length) {
    el.innerHTML = `<div class="card-empty">No goals yet.</div>`;
    return;
  }

  const maxCt = Math.max(...CATS.map(c => goals.filter(g => g.cat === c).length), 1);
  el.innerHTML = CATS.map(cat => {
    const gs = goals.filter(g => g.cat === cat);
    const ct = gs.length;
    if (!ct) return '';
    const done = gs.filter(g => g.progress >= 100).length;
    const avg = ct ? Math.round(gs.reduce((s, g) => s + (g.progress || 0), 0) / ct) : 0;
    const pct = Math.round((ct / maxCt) * 100);
    return `<div class="cat-bar-item">
      <div class="cat-bar-head">
        <div class="cat-bar-label">
          <div class="cat-bar-dot" style="background:${CAT_COLS[cat]}"></div>
          ${cat}
        </div>
        <div class="cat-bar-right">
          <span class="cat-bar-ct">${ct} goal${ct !== 1 ? 's' : ''}</span>
          <span class="cat-bar-pct">${avg}%</span>
        </div>
      </div>
      <div class="cat-bar-track"><div class="cat-bar-fill" style="width:${pct}%;background:${CAT_COLS[cat]}"></div></div>
    </div>`;
  }).filter(Boolean).join('');
}

/**
 * Render focus card
 */
function renderFocus() {
  const el = document.getElementById('focus-inner');
  const titleEl = document.getElementById('focus-card-title');
  if (!el || !titleEl) return;

  const today = ts();
  const end = ad(today, tlHorizon === 'week' ? 6 : tlHorizon === 'month' ? 29 : 364);
  titleEl.textContent = tlHorizon === 'week' ? 'This Week\'s Focus' : tlHorizon === 'month' ? 'This Month\'s Focus' : 'This Year\'s Focus';

  // Goals with milestones in horizon OR just active goals
  const active = goals.filter(g => g.progress < 100);
  const focus = active.filter(g => (g.milestones || []).some(ms => !ms.done && ms.date && ms.date >= today && ms.date <= end));
  const show = (focus.length > 0 ? focus : active).slice(0, 3);

  if (!show.length) {
    el.innerHTML = `<div class="focus-empty">No active goals.<br>Add a goal to see your focus here.</div>`;
    return;
  }

  el.innerHTML = show.map(g => {
    const color = CAT_COLS[g.cat] || 'var(--rose)';
    const pct = g.progress || 0;
    // Next undone milestone
    const nextMs = (g.milestones || [])
      .filter(ms => !ms.done)
      .sort((a, b) => a.date < b.date ? -1 : 1)[0];
    return `<div class="focus-goal-block" data-cat="${g.cat || ''}" data-gid="${g.id}" data-action="goal:open">
      <div class="fg-top">
        <div class="fg-emoji">${g.emoji || '◎'}</div>
        <div class="fg-name">${escapeHtml(g.name)}</div>
        <div class="fg-pct">${pct}%</div>
      </div>
      <div class="fg-bar-track"><div class="fg-bar-fill" style="width:${pct}%;background:${color}"></div></div>
      ${nextMs ? `<div class="fg-next-ms">
        <div class="fg-ms-ck ${nextMs.done ? 'on' : ''}" data-gid="${g.id}" data-ms="${encodeURIComponent(nextMs.title)}" data-action="goal:toggle-ms">
          ${nextMs.done ? '✓' : ''}
        </div>
        <span class="fg-ms-title ${nextMs.done ? 'done' : ''}">${escapeHtml(nextMs.title)}</span>
        ${nextMs.date ? `<span class="fg-ms-date">${fs(nextMs.date)}</span>` : ''}
      </div>` : '<div style="font-size:10.5px;color:var(--text-light);font-style:italic;font-family:Cormorant Garamond,serif">No upcoming milestones</div>'}
    </div>`;
  }).join('');

  const subEl = document.getElementById('focus-card-sub');
  if (subEl) {
    subEl.textContent = focus.length > 3 ? `+${focus.length - 3} more goals` : '';
  }
}

/**
 * Render milestones card
 */
function renderMilestonesCard() {
  const el = document.getElementById('ms-card-scroll');
  if (!el) return;

  const today = ts();
  const end = ad(today, tlHorizon === 'week' ? 6 : tlHorizon === 'month' ? 29 : 364);

  // Collect all milestones with goal info
  const allMs = goals.flatMap(g => (g.milestones || []).map(ms => ({ ...ms, gid: g.id, gname: g.name, gcat: g.cat, gcol: CAT_COLS[g.cat], gemoji: g.emoji })));

  let items = allMs;
  if (!showDone) items = items.filter(ms => !ms.done);

  // Group by time
  const overdue = items.filter(ms => ms.date && ms.date < today && !ms.done);
  const thisWeek = items.filter(ms => ms.date && ms.date >= today && ms.date <= ad(today, 6));
  const later = items.filter(ms => ms.date && ms.date > ad(today, 6) && ms.date <= end);
  const noDate = items.filter(ms => !ms.date && !ms.done);
  const done = showDone ? items.filter(ms => ms.done) : [];

  const renderGroup = (label, dot, list) => {
    if (!list.length) return '';
    return `<div class="ms-group">
      <div class="ms-group-label">
        <div class="ms-gl-dot" style="background:${dot}"></div>
        <div class="ms-gl-text">${label}</div>
        <div class="ms-gl-count">${list.length}</div>
      </div>
      ${list.map(ms => `
        <div class="ms-item">
          <div class="ms-ck ${ms.done ? 'on' : ''}" data-gid="${ms.gid}" data-mst="${encodeURIComponent(ms.title)}" data-action="goal:toggle-ms">${ms.done ? '✓' : ''}</div>
          <div class="ms-item-goal-relation">
            <span class="ms-title ${ms.done ? 'done' : ''}">${escapeHtml(ms.title)}</span>
            <span class="ms-under-goal" style="color:${ms.gcol || 'var(--rose)'}">← ${escapeHtml((ms.gemoji || '') + (ms.gemoji ? ' ' : '') + (ms.gname || 'Goal'))}</span>
          </div>
          ${ms.date ? `<span class="ms-date ${ms.date < today && !ms.done ? 'late' : ''}">${fs(ms.date)}</span>` : ''}
        </div>`).join('<div class="ms-divider"></div>')}
    </div>`;
  };

  const html = [
    renderGroup('Overdue', '#f0a0a0', overdue),
    renderGroup('This Week', 'var(--amber)', thisWeek),
    renderGroup('Upcoming', 'var(--sage)', later),
    renderGroup('No date', 'var(--border2)', noDate),
    renderGroup('Completed', 'var(--sage)', done),
  ].filter(Boolean).join('');

  el.innerHTML = html || `<div class="card-empty">No sub-goals yet. Click <em>Sub-goals</em> on a goal to add one.</div>`;
}

/**
 * Render timeline
 */
function renderTimeline() {
  const wrap = document.getElementById('timeline-wrap');
  if (!wrap) return;

  const today = ts();

  if (tlHorizon === 'year') {
    renderYearCalendar(wrap, today);
    return;
  }

  // ── WEEK / MONTH: horizontal bar timeline ──────────────────────
  const ranges = {
    week: { start: today, days: 7, fmt: d => `${['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'][new Date(d + 'T00:00:00').getDay()]} ${new Date(d + 'T00:00:00').getDate()}` },
    month: { start: today, days: 30, fmt: d => new Date(d + 'T00:00:00').getDate() === 1 || new Date(d + 'T00:00:00').getDate() % 7 === 0 ? fs(d) : '' },
  };
  const { start, days } = ranges[tlHorizon];
  const end = ad(start, days - 1);
  const lblEl = document.getElementById('tl-range-lbl');
  if (lblEl) lblEl.textContent = `${fs(start)} – ${fs(end)}`;

  const visible = goals.filter(g => g.progress < 100 && g.deadline && g.deadline >= start && g.deadline <= end);
  const withMs = goals.filter(g => g.progress < 100 && (g.milestones || []).some(ms => ms.date && ms.date >= start && ms.date <= end));
  const combined = [...new Map([...visible, ...withMs].map(g => [g.id, g])).values()];

  const tickCount = tlHorizon === 'week' ? 7 : 5;
  const tickStep = Math.floor(days / tickCount);
  let labels = '';
  for (let i = 0; i <= tickCount; i++) {
    const d = ad(start, i * tickStep);
    const x = ((i * tickStep) / days) * 100;
    const lbl = ranges[tlHorizon].fmt(d);
    if (lbl) labels += `<div class="tl-label" style="left:${x}%">${lbl}</div>`;
  }
  const todayLine = `<div class="tl-today-line" style="left:0%"></div>`;

  if (!combined.length) {
    wrap.innerHTML = `<div style="text-align:center;padding:22px;color:var(--text-light);font-size:11.5px;font-style:italic;font-family:'Cormorant Garamond',serif">No goals with deadlines in this period.</div>`;
    return;
  }

  const rows = combined.map(g => {
    const col = CAT_COLS[g.cat] || 'var(--rose)';
    const pct = g.progress || 0;
    let barHtml = '';
    if (g.deadline && g.deadline >= start && g.deadline <= end) {
      const dlDay = Math.max(0, Math.round((new Date(g.deadline + 'T00:00:00') - new Date(start + 'T00:00:00')) / 86400000));
      const barW = Math.max(2, (dlDay / days) * 100);
      const progW = Math.round(barW * pct / 100);
      barHtml = `
        <div class="tl-goal-bar" style="left:0%;width:${barW}%;background:${col}22;border:1px solid ${col}44;" data-action="goal:open" data-gid="${g.id}"></div>
        <div style="position:absolute;left:0%;width:${progW}%;height:22px;top:7px;border-radius:6px 0 0 6px;background:${col};opacity:.7;pointer-events:none;"></div>
        <div style="position:absolute;left:${barW}%;transform:translateX(-100%) translateY(-50%);top:50%;margin-top:7px;font-size:9px;color:${col};white-space:nowrap;padding-right:4px;">${fs(g.deadline)}</div>`;
    }
    const msDots = (g.milestones || []).filter(ms => ms.date && ms.date >= start && ms.date <= end).map(ms => {
      const x = ((Math.round((new Date(ms.date + 'T00:00:00') - new Date(start + 'T00:00:00')) / 86400000) / days) * 100).toFixed(1);
      return `<div class="tl-ms-marker" style="left:${x}%;background:${ms.done ? col : '#fff'};border-color:${col};" title="${escapeHtml(ms.title)} — ${fs(ms.date)}"></div>`;
    }).join('');
    return `<div style="margin-bottom:8px;">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:5px;">
        <span style="font-size:13px">${g.emoji || '◎'}</span>
        <span style="font-family:'Cormorant Garamond',serif;font-size:13px;color:var(--text-dim)">${escapeHtml(g.name)}</span>
        <span style="font-size:9.5px;color:${col};margin-left:auto;">${pct}%</span>
      </div>
      <div class="tl-track">${labels}${todayLine}${barHtml}${msDots}</div>
    </div>`;
  }).join('');
  wrap.innerHTML = `<div class="tl-rows">${rows}</div>`;
}

/**
 * Render year calendar
 */
function renderYearCalendar(wrap, today) {
  const yr = new Date().getFullYear();
  const curMonth = new Date().getMonth();
  const lblEl = document.getElementById('tl-range-lbl');
  if (lblEl) lblEl.textContent = String(yr);

  const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  const DOW = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  // Build event map: date → [{type, goal, ms?}]
  const eventMap = {};
  const mark = (dateStr, obj) => {
    if (!dateStr || !dateStr.startsWith(String(yr))) return;
    if (!eventMap[dateStr]) eventMap[dateStr] = [];
    eventMap[dateStr].push(obj);
  };
  goals.forEach(g => {
    if (g.deadline) mark(g.deadline, { type: 'deadline', goal: g });
    (g.milestones || []).forEach(ms => {
      if (ms.date) mark(ms.date, { type: 'milestone', goal: g, ms });
    });
  });

  // Legend
  const activeGoals = goals.filter(g => g.progress < 100);
  let legendHtml = '';
  if (activeGoals.length) {
    const items = activeGoals.map(g => {
      const col = CAT_COLS[g.cat] || 'var(--rose)';
      return `<div class="yr-legend-item" data-legend-gid="${g.id}" data-action="goal:open">
        <div class="yr-legend-dot" style="background:${col}"></div>
        <span class="yr-legend-name">${g.emoji || '◎'} ${escapeHtml(g.name)}</span>
        <span class="yr-legend-pct" style="color:${col};background:${col}14;border-color:${col}44">${g.progress || 0}%</span>
      </div>`;
    }).join('<div class="yr-legend-sep"></div>');

    legendHtml = `<div class="yr-legend">
      ${items}
      <div class="yr-legend-key" style="margin-left:auto;">
        <div class="yr-legend-key-ms"></div><span>Milestone</span>
        <div class="yr-legend-key-dead" style="margin-left:6px;"></div><span>Deadline</span>
      </div>
    </div>`;
  }

  // 12 month blocks
  const monthsHtml = Array.from({ length: 12 }, (_, mi) => {
    const daysInM = new Date(yr, mi + 1, 0).getDate();
    const firstDow = new Date(yr, mi, 1).getDay();
    const isCur = mi === curMonth;
    const isPastM = mi < curMonth;

    const dowRow = DOW.map(d => `<div class="yr-dow">${d}</div>`).join('');

    let cells = '';
    // leading blanks
    for (let b = 0; b < firstDow; b++) cells += `<div></div>`;

    for (let day = 1; day <= daysInM; day++) {
      const dStr = `${yr}-${pad(mi + 1)}-${pad(day)}`;
      const isToday = dStr === today;
      const isPast = dStr < today;
      const evts = eventMap[dStr] || [];
      const hasEvts = evts.length > 0;

      // Unique goals on this day
      const goalMap = new Map();
      evts.forEach(e => { if (!goalMap.has(e.goal.id)) goalMap.set(e.goal.id, e); });
      const uniqueEvts = [...goalMap.values()];

      // Pip dots
      let pips = '';
      if (hasEvts) {
        pips = `<div class="yr-day-dots">` +
          uniqueEvts.slice(0, 4).map(e => {
            const col = CAT_COLS[e.goal.cat] || 'var(--rose)';
            const opacity = isPast ? '55' : 'ff';
            if (e.type === 'deadline') {
              return `<div class="yr-pip yr-pip-dead" style="background:${col}${opacity}" title="${escapeHtml(e.goal.name)} deadline"></div>`;
            } else {
              const filled = e.ms && e.ms.done;
              return `<div class="yr-pip yr-pip-ms" style="background:${filled ? col : col + '44'};border:1px solid ${col}${isPast ? '55' : 'cc'};" title="${escapeHtml(e.ms?.title || '')}"></div>`;
            }
          }).join('') +
          (uniqueEvts.length > 4 ? `<div style="font-size:6px;color:var(--text-light);line-height:5px;margin-top:1px;">+</div>` : '') +
          `</div>`;
      }

      // Day cell background
      let bg = 'transparent', border = 'none', numCol = isPast ? 'var(--text-light)' : 'var(--text)';
      let radius = '5px', fontWeight = '300';

      if (isToday) {
        bg = 'var(--rose)'; numCol = '#fff'; radius = '6px'; fontWeight = '400';
      } else if (hasEvts && !isPast) {
        const col = CAT_COLS[uniqueEvts[0].goal.cat] || 'var(--rose)';
        const isDeadline = uniqueEvts[0].type === 'deadline';
        bg = col + (isDeadline ? '1a' : '0d');
        if (isDeadline) border = `1px solid ${col}50`;
      }

      const tooltip = evts.map(e =>
        e.type === 'deadline' ? `${e.goal.emoji || '◎'} ${e.goal.name} — deadline` : `◆ ${e.ms?.title || ''}`
      ).join('\n');

      cells += `<div class="yr-day ${hasEvts ? 'has-events' : ''}"
        style="background:${bg};border:${border};border-radius:${radius};"
        ${hasEvts ? `data-day="${dStr}" data-action="goal:open-day" title="${escapeHtml(tooltip)}"` : ''}>
        <span class="yr-day-num" style="color:${numCol};font-weight:${fontWeight};opacity:${isPast && !isToday ? .5 : 1}">${day}</span>
        ${pips}
      </div>`;
    }

    const monthNameClass = isCur ? 'cur' : isPastM ? 'past' : 'future';

    return `<div class="yr-month ${isCur ? 'cur-month' : ''}">
      <div class="yr-month-name ${monthNameClass}">${MONTH_NAMES[mi]}</div>
      <div class="yr-dow-row">${dowRow}</div>
      <div class="yr-days">${cells}</div>
    </div>`;
  }).join('');

  wrap.innerHTML = legendHtml + `<div class="yr-cal-grid">${monthsHtml}</div>`;
}

/**
 * Render monthly plan
 */
function renderMonthlyPlan() {
  const wrap = document.getElementById('monthly-plan-wrap');
  const lbl = document.getElementById('plan-year-lbl');
  if (!wrap || !lbl) return;
  lbl.textContent = planYear;

  const today = ts();
  const curMonth = new Date().getMonth();
  const curYear = new Date().getFullYear();

  // For each month: which goals are "active"
  const months = Array.from({ length: 12 }, (_, mi) => {
    const monthStart = `${planYear}-${pad(mi + 1)}-01`;
    const monthEnd = `${planYear}-${pad(mi + 1)}-${pad(new Date(planYear, mi + 1, 0).getDate())}`;

    const active = goals.filter(g => {
      const hasDl = g.deadline && g.deadline >= monthStart && g.deadline <= monthEnd;
      const hasMs = (g.milestones || []).some(ms => ms.date && ms.date >= monthStart && ms.date <= monthEnd);
      const spans = g.startDate && g.deadline &&
        g.startDate <= monthEnd && g.deadline >= monthStart;
      return hasDl || hasMs || spans;
    });

    return { mi, monthStart, monthEnd, active };
  });

  const MONTH_NAMES_FULL = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

  const monthCols = months.map(({ mi, monthStart, monthEnd, active }) => {
    const isCurMo = planYear === curYear && mi === curMonth;
    const isPastMo = planYear < curYear || (planYear === curYear && mi < curMonth);
    const cls = isCurMo ? 'plan-cur' : isPastMo ? 'plan-past' : '';

    let goalsHtml = '';
    if (!active.length) {
      goalsHtml = `<div class="plan-empty">Nothing planned</div>`;
    } else {
      goalsHtml = active.map(g => {
        const col = CAT_COLS[g.cat] || 'var(--rose)';
        const pct = g.progress || 0;

        // Milestones in this month
        const msHere = (g.milestones || [])
          .filter(ms => ms.date && ms.date >= monthStart && ms.date <= monthEnd)
          .sort((a, b) => a.date < b.date ? -1 : 1);

        const hasDl = g.deadline && g.deadline >= monthStart && g.deadline <= monthEnd;

        const msHtml = msHere.map(ms => {
          const isLate = ms.date < today && !ms.done;
          return `<div class="plan-ms-row">
            <div class="plan-ms-ck ${ms.done ? 'on' : ''}"
              data-pgid="${g.id}" data-pms="${encodeURIComponent(ms.title)}" data-action="goal:toggle-ms">${ms.done ? '✓' : ''}</div>
            <span class="plan-ms-label ${ms.done ? 'done' : ''}">${escapeHtml(ms.title)}</span>
            ${ms.date ? `<span class="plan-ms-date ${isLate ? 'late' : ''}">${fs(ms.date)}</span>` : ''}
          </div>`;
        }).join('');

        const dlHtml = hasDl ? `<div class="plan-deadline">
          <span class="plan-deadline-flag">🏁</span>
          Deadline — ${fs(g.deadline)}
        </div>` : '';

        return `<div class="plan-goal" data-pgid="${g.id}" data-action="goal:open">
          <div class="plan-goal-head">
            <div class="plan-goal-stripe" style="background:${col}"></div>
            <span class="plan-goal-emoji">${g.emoji || '◎'}</span>
            <span class="plan-goal-name">${escapeHtml(g.name)}</span>
            <span class="plan-goal-pct" style="color:${col};background:${col}14;border-color:${col}44">${pct}%</span>
          </div>
          <div class="plan-goal-bar"><div class="plan-goal-bar-fill" style="width:${pct}%;background:${col}"></div></div>
          ${msHere.length ? `<div class="plan-ms-list">${msHtml}</div>` : ''}
          ${dlHtml}
        </div>`;
      }).join('');
    }

    return `<div class="plan-month ${cls}">
      <div class="plan-month-head">
        <div class="plan-month-name">${MONTH_NAMES_FULL[mi]}</div>
        ${active.length ? `<div class="plan-month-ct">${active.length}</div>` : ''}
      </div>
      <div class="plan-month-body">${goalsHtml}</div>
    </div>`;
  }).join('');

  wrap.innerHTML = `<div class="plan-grid">${monthCols}</div>`;
}

/**
 * Open drawer for a goal
 */
function openDrawer(id, state, handlers) {
  selId = id;
  const g = goals.find(g => g.id === id);
  if (!g) return;

  renderGoalList(); // refresh selection highlight

  const emojiEl = document.getElementById('dh-emoji');
  const titleEl = document.getElementById('dh-title');
  const createdEl = document.getElementById('d-created');
  if (emojiEl) emojiEl.textContent = g.emoji || '◎';
  if (titleEl) titleEl.value = g.name;
  if (createdEl) createdEl.textContent = g.createdAt ? 'Created ' + fl(g.createdAt) : '';

  // reset tabs
  document.querySelectorAll('.dtab').forEach(t => t.classList.toggle('on', t.dataset.tab === 'details'));
  document.querySelectorAll('.dpanel').forEach(p => p.classList.toggle('on', p.id === 'dpanel-details'));

  fillDrawerDetails(g);
  fillDrawerMilestones(g);
  fillDrawerNotes(g);

  const bg = document.getElementById('drawer-bg');
  if (bg) bg.classList.add('open');
}

/**
 * Close drawer
 */
function closeDrawer() {
  selId = null;
  const bg = document.getElementById('drawer-bg');
  if (bg) bg.classList.remove('open');
  renderGoalList();
}

/**
 * Fill drawer details panel
 */
function fillDrawerDetails(g) {
  const el = document.getElementById('dpanel-details');
  if (!el) return;

  const state = window.Petal?.store?.getState() || {};
  const habits = (state.habits || []).filter(h => !h.archived);
  const routines = (state.routines || []).filter(r => !r.archived);
  const gidStr = String(g.id);
  const linkedHabits = habits.filter(h => String(h.goalId || '') === gidStr);
  const linkedRoutines = routines.filter(r => String(r.goalId || '') === gidStr);
  const unlinkedHabits = habits.filter(h => String(h.goalId || '') !== gidStr);
  const unlinkedRoutines = routines.filter(r => String(r.goalId || '') !== gidStr);

  el.innerHTML = `
    <div>
      <div class="d-flbl">Category</div>
      <select class="d-sel" id="d-cat">${CATS.map(c => `<option value="${c}" ${g.cat === c ? 'selected' : ''}>${c}</option>`).join('')}</select>
    </div>
    <div class="d-2col">
      <div><div class="d-flbl">Deadline</div><input type="date" class="d-inp" id="d-dl" value="${g.deadline || ''}"></div>
      <div><div class="d-flbl">Start date</div><input type="date" class="d-inp" id="d-start" value="${g.startDate || ''}"></div>
    </div>
    <div>
      <div class="d-flbl">Progress — <span id="d-prog-lbl">${g.progress || 0}%</span></div>
      <div class="prog-row">
        <input type="range" min="0" max="100" step="5" value="${g.progress || 0}" id="d-prog">
        <span class="prog-pct" id="d-prog-val">${g.progress || 0}%</span>
      </div>
      <div class="prog-bar"><div class="prog-bar-fill" id="d-prog-bar" style="width:${g.progress || 0}%;background:${CAT_COLS[g.cat] || 'var(--rose)'}"></div></div>
    </div>
    <div>
      <div class="d-flbl">Horizon</div>
      <select class="d-sel" id="d-horizon">
        <option value="week" ${g.horizon === 'week' ? 'selected' : ''}>Weekly goal</option>
        <option value="month" ${g.horizon === 'month' ? 'selected' : ''}>Monthly goal</option>
        <option value="year" ${g.horizon === 'year' ? 'selected' : ''}>Yearly goal</option>
      </select>
    </div>
    <div class="d-related">
      <div class="d-flbl">Related habits</div>
      ${linkedHabits.length ? `<ul class="d-related-list">${linkedHabits.map(h => `<li class="d-related-item"><span>${escapeHtml(h.name)}</span> <button type="button" class="d-related-unlink" data-action="goal:unlink-habit" data-habit-id="${escapeHtml(h.id)}" data-gid="${escapeHtml(g.id)}" title="Unlink">×</button></li>`).join('')}</ul>` : '<span class="d-related-empty">None linked</span>'}
      ${unlinkedHabits.length ? `<select class="d-sel d-related-add" id="d-link-habit" data-gid="${escapeHtml(g.id)}" data-action="goal:link-habit"><option value="">+ Link habit</option>${unlinkedHabits.map(h => `<option value="${escapeHtml(h.id)}">${escapeHtml(h.name)}</option>`).join('')}</select>` : ''}
    </div>
    <div class="d-related">
      <div class="d-flbl">Related routines</div>
      ${linkedRoutines.length ? `<ul class="d-related-list">${linkedRoutines.map(r => `<li class="d-related-item"><span>${escapeHtml((r.icon || '') + ' ' + (r.name || ''))}</span> <button type="button" class="d-related-unlink" data-action="goal:unlink-routine" data-routine-id="${escapeHtml(r.id)}" data-gid="${escapeHtml(g.id)}" title="Unlink">×</button></li>`).join('')}</ul>` : '<span class="d-related-empty">None linked</span>'}
      ${unlinkedRoutines.length ? `<select class="d-sel d-related-add" id="d-link-routine" data-gid="${escapeHtml(g.id)}" data-action="goal:link-routine"><option value="">+ Link routine</option>${unlinkedRoutines.map(r => `<option value="${escapeHtml(r.id)}">${escapeHtml((r.icon || '') + ' ' + (r.name || ''))}</option>`).join('')}</select>` : ''}
    </div>
  `;

  const progEl = document.getElementById('d-prog');
  if (progEl) {
    progEl.addEventListener('input', e => {
      const v = e.target.value;
      const valEl = document.getElementById('d-prog-val');
      const barEl = document.getElementById('d-prog-bar');
      if (valEl) valEl.textContent = v + '%';
      if (barEl) barEl.style.width = v + '%';
    });
  }

  const linkHabitSel = document.getElementById('d-link-habit');
  if (linkHabitSel && linkHabitSel.dataset.gid) {
    linkHabitSel.addEventListener('change', function() {
      const habitId = this.value;
      const goalId = this.dataset.gid;
      if (!habitId) return;
      if (window.Petal?.features?.habits?.setHabitGoalId) {
        window.Petal.features.habits.setHabitGoalId(habitId, goalId);
        fillDrawerDetails(goals.find(x => x.id === selId));
      }
      this.value = '';
    });
  }
  const linkRoutineSel = document.getElementById('d-link-routine');
  if (linkRoutineSel && linkRoutineSel.dataset.gid) {
    linkRoutineSel.addEventListener('change', function() {
      const routineId = this.value;
      const goalId = this.dataset.gid;
      if (!routineId) return;
      if (window.Petal?.features?.routines?.setRoutineGoalId) {
        window.Petal.features.routines.setRoutineGoalId(routineId, goalId);
        fillDrawerDetails(goals.find(x => x.id === selId));
      }
      this.value = '';
    });
  }
}

/**
 * Fill drawer milestones panel
 */
function fillDrawerMilestones(g) {
  const el = document.getElementById('dpanel-milestones');
  if (!el) return;

  const ms = g.milestones || [];
  el.innerHTML = `
    <div class="dms-list" id="d-ms-list">
      ${ms.map((m, i) => `<div class="dms-row">
        <div class="dms-ck ${m.done ? 'on' : ''}" data-mck="${i}" data-action="goal:toggle-drawer-ms">${m.done ? '✓' : ''}</div>
        <span class="dms-title ${m.done ? 'done' : ''}">${escapeHtml(m.title)}</span>
        ${m.date ? `<span class="dms-date">${fs(m.date)}</span>` : ''}
        <button class="dms-x" data-mxd="${i}" data-action="goal:delete-ms">×</button>
      </div>`).join('')}
    </div>
    <div class="add-ms-row">
      <input class="add-ms-inp" id="d-ms-inp" placeholder="New milestone…">
      <input type="date" class="add-ms-date" id="d-ms-dt">
      <button class="add-ms-btn" id="d-ms-add" data-action="goal:add-ms">+</button>
    </div>
  `;
}

/**
 * Fill drawer notes panel
 */
function fillDrawerNotes(g) {
  const el = document.getElementById('dpanel-notes');
  if (!el) return;

  el.innerHTML = `
    <div>
      <div class="d-flbl">Why this goal matters</div>
      <textarea class="d-ta" id="d-notes" placeholder="Motivation, context, why you care about this…">${escapeHtml(g.notes || '')}</textarea>
    </div>
    <div>
      <div class="d-flbl">Strategy & plan</div>
      <textarea class="d-ta" id="d-strategy" placeholder="How you'll achieve it, resources needed…">${escapeHtml(g.strategy || '')}</textarea>
    </div>
  `;
}

/**
 * Build add modal
 */
function buildModal(modalContainer) {
  const el = modalContainer
    ? (modalContainer.querySelector && modalContainer.querySelector('#modal-body'))
    : null;
  const fallback = document.getElementById('modal-body');
  const target = el || fallback;
  if (!target) return;

  target.innerHTML = `
    <div>
      <div class="m-lbl">Icon</div>
      <div class="emoji-grid">${EMOJIS.map((e, i) => `<button type="button" class="epick ${i === 0 ? 'on' : ''}" data-e="${escapeHtml(e)}" data-action="goal:select-emoji">${escapeHtml(e)}</button>`).join('')}</div>
    </div>
    <div>
      <div class="m-lbl">Goal name</div>
      <input class="m-inp" id="m-name" type="text" placeholder="e.g. Finish dissertation, Run a half marathon…" required>
    </div>
    <div class="m-2col">
      <div>
        <div class="m-lbl">Category</div>
        <select class="m-sel" id="m-cat">${CATS.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('')}</select>
      </div>
      <div>
        <div class="m-lbl">Horizon</div>
        <select class="m-sel" id="m-horizon">
          <option value="week">Weekly</option>
          <option value="month">Monthly</option>
          <option value="year" selected>Yearly</option>
        </select>
      </div>
    </div>
    <div class="m-2col">
      <div>
        <div class="m-lbl">Start date</div>
        <input type="date" class="m-inp" id="m-start">
      </div>
      <div>
        <div class="m-lbl">Deadline</div>
        <input type="date" class="m-inp" id="m-dl">
      </div>
    </div>
    <div>
      <div class="m-lbl">Why this goal? (optional)</div>
      <textarea class="m-ta" id="m-notes" placeholder="Motivation, context…" rows="3"></textarea>
    </div>
  `;
}

/**
 * Open add modal. Uses same pattern as Add Task: append to body with .quick-capture-modal so it
 * appears as a full-viewport overlay (position:fixed; inset:0; z-index:10000) like other app modals.
 */
function openModal() {
  const viewGoals = document.getElementById('view-goals');
  const scrollTop = viewGoals ? viewGoals.scrollTop : 0;

  // Use the visible modal on body if present (avoids duplicate after re-renders); otherwise the one in view
  const bg = document.querySelector('body > #modal-bg') || document.getElementById('modal-bg');
  if (bg) buildModal(bg);
  const innerModal = bg ? bg.querySelector('.modal') : null;
  if (bg) {
    document.documentElement.classList.add('goals-modal-open');
    document.body.classList.add('goals-modal-open');
    bg.classList.add('open');
    bg.classList.add('quick-capture-modal');
    if (innerModal) innerModal.classList.add('quick-capture-box');
    document.body.appendChild(bg);
    bg.style.setProperty('display', 'flex', 'important');
    bg.style.setProperty('visibility', 'visible', 'important');
    bg.style.setProperty('opacity', '1', 'important');
    bg.style.setProperty('z-index', '10000', 'important');
  }

  if (viewGoals) viewGoals.scrollTop = scrollTop;

  setTimeout(() => {
    const nameEl = document.getElementById('m-name');
    if (nameEl) nameEl.focus({ preventScroll: true });
    if (viewGoals) viewGoals.scrollTop = scrollTop;
    const modalBody = document.getElementById('modal-body');
    if (modalBody) {
      modalBody.querySelectorAll('.epick').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          modalBody.querySelectorAll('.epick').forEach(b => b.classList.remove('on'));
          btn.classList.add('on');
        });
      });
    }
  }, 80);
}

/**
 * Close add modal and return it to the Goals page DOM.
 */
function closeModal() {
  document.documentElement.classList.remove('goals-modal-open');
  document.body.classList.remove('goals-modal-open');
  // Prefer the modal that's on body (the visible one). Re-renders create a duplicate inside #view-goals.
  const bg = document.querySelector('body > #modal-bg') || document.getElementById('modal-bg');
  const innerModal = bg ? bg.querySelector('.modal') : null;
  if (bg) {
    bg.classList.remove('open');
    bg.classList.remove('quick-capture-modal');
    if (innerModal) innerModal.classList.remove('quick-capture-box');
    bg.style.removeProperty('display');
    bg.style.removeProperty('visibility');
    bg.style.removeProperty('opacity');
    bg.style.removeProperty('z-index');
    const goalsPage = document.querySelector('#view-goals .goals-page');
    if (goalsPage) {
      const existing = goalsPage.querySelector('#modal-bg');
      if (existing && existing !== bg) existing.remove();
      goalsPage.appendChild(bg);
    }
    bg.style.setProperty('display', 'none', 'important');
  }
}

function openProjectLinkModal(gid, state, handlers) {
  linkProjectGoalId = gid;
  const g = goals.find(x => x.id === gid);
  const listEl = document.getElementById('goal-projects-linked-list');
  const addSel = document.getElementById('goal-projects-add-select');
  const bg = document.getElementById('goal-project-modal-bg');
  if (!listEl || !addSel || !bg) return;
  const projects = (state?.projects || []).filter(p => p && !p.done);
  const projectIds = g?.projectIds || [];
  const linked = projectIds.map(pid => projects.find(p => String(p.id) === String(pid))).filter(Boolean);
  listEl.innerHTML = linked.length
    ? linked.map(p => `<div class="goal-task-item"><span>${escapeHtml(p.name || 'Project')}</span> <button type="button" class="goal-task-remove" data-action="goal:unlink-project" data-project-id="${escapeHtml(String(p.id))}">×</button></div>`).join('')
    : '<div class="goal-tasks-empty">No projects linked yet.</div>';
  const usedSet = new Set(projectIds.map(String));
  const available = projects.filter(p => !usedSet.has(String(p.id)));
  addSel.innerHTML = '<option value="">— Choose project —</option>' + available
    .map(p => `<option value="${escapeHtml(String(p.id))}">${escapeHtml((p.name || 'Project').slice(0, 50))}</option>`)
    .join('');
  addSel.value = '';
  addSel.onchange = () => {
    const val = addSel.value;
    if (!val) return;
    const goal = goals.find(x => x.id === linkProjectGoalId);
    if (!goal) return;
    if (!goal.projectIds) goal.projectIds = [];
    if (!goal.projectIds.some(id => String(id) === val)) {
      goal.projectIds.push(val);
      saveGoals(state, handlers);
      openProjectLinkModal(linkProjectGoalId, state, handlers);
    }
    addSel.value = '';
  };
  bg.style.display = 'flex';
  bg.style.visibility = 'visible';
  bg.style.opacity = '1';
  bg.style.zIndex = '1000';
}

function closeProjectLinkModal() {
  linkProjectGoalId = null;
  const bg = document.getElementById('goal-project-modal-bg');
  if (bg) {
    bg.style.display = 'none';
    bg.style.visibility = 'hidden';
    bg.style.opacity = '0';
    bg.style.zIndex = '';
  }
}

function openTasksLinkModal(gid, state, handlers) {
  linkTasksGoalId = gid;
  const g = goals.find(x => x.id === gid);
  const listEl = document.getElementById('goal-tasks-linked-list');
  const addSel = document.getElementById('goal-tasks-add-select');
  const bg = document.getElementById('goal-tasks-modal-bg');
  if (!listEl || !addSel || !bg) return;
  const allTasks = getAllTasks(state?.tasks || [], state?.projects || []);
  const taskIds = g?.taskIds || [];
  const linked = taskIds.map(tid => allTasks.find(t => String(t.id) === String(tid))).filter(Boolean);
  listEl.innerHTML = linked.length
    ? linked.map(t => `<div class="goal-task-item"><span>${escapeHtml(t.title || t.name || 'Task')}</span> <button type="button" class="goal-task-remove" data-action="goal:unlink-task" data-task-id="${escapeHtml(String(t.id))}">×</button></div>`).join('')
    : '<div class="goal-tasks-empty">No tasks linked yet.</div>';
  const usedSet = new Set(taskIds.map(String));
  const available = allTasks.filter(t => t && !t.deletedAt && !usedSet.has(String(t.id)));
  addSel.innerHTML = '<option value="">— Choose task —</option>' + available
    .map(t => `<option value="${escapeHtml(String(t.id))}">${escapeHtml((t.title || t.name || 'Task').slice(0, 50))}</option>`)
    .join('');
  addSel.value = '';
  addSel.onchange = () => {
    const val = addSel.value;
    if (!val) return;
    const goal = goals.find(x => x.id === linkTasksGoalId);
    if (!goal) return;
    if (!goal.taskIds) goal.taskIds = [];
    if (!goal.taskIds.includes(val) && !goal.taskIds.some(id => String(id) === val)) {
      goal.taskIds.push(val);
      saveGoals(state, handlers);
      openTasksLinkModal(linkTasksGoalId, state, handlers);
    }
    addSel.value = '';
  };
  bg.style.display = 'flex';
  bg.style.visibility = 'visible';
  bg.style.opacity = '1';
  bg.style.zIndex = '1000';
}

function closeTasksLinkModal() {
  linkTasksGoalId = null;
  const bg = document.getElementById('goal-tasks-modal-bg');
  if (bg) {
    bg.style.display = 'none';
    bg.style.visibility = 'hidden';
    bg.style.opacity = '0';
    bg.style.zIndex = '';
  }
}

function openMilestoneModal(gid, state, handlers) {
  const g = goals.find(x => x.id === gid);
  if (!g) return;
  addMilestoneGoalId = gid;
  const titleEl = document.getElementById('goal-milestone-modal-title');
  const titleInp = document.getElementById('goal-milestone-title');
  const dateInp = document.getElementById('goal-milestone-date');
  const bg = document.getElementById('goal-milestone-modal-bg');
  if (titleEl) titleEl.textContent = `Add sub-goal — ${g.emoji || '◎'} ${g.name || 'Goal'}`;
  if (titleInp) titleInp.value = '';
  if (dateInp) dateInp.value = '';
  if (bg) {
    bg.style.display = 'flex';
    bg.style.visibility = 'visible';
    bg.style.opacity = '1';
    bg.style.zIndex = '1000';
  }
}

function closeMilestoneModal() {
  addMilestoneGoalId = null;
  const bg = document.getElementById('goal-milestone-modal-bg');
  if (bg) {
    bg.style.display = 'none';
    bg.style.visibility = 'hidden';
    bg.style.opacity = '0';
    bg.style.zIndex = '';
  }
}

/**
 * Run a single goal action (used by both local click handler and global delegation callback)
 */
function runGoalAction(action, actionEl, state, handlers) {
  if (action === 'goal:add') {
      openModal();
    } else if (action === 'goal:close-modal' || action === 'goal:close-drawer') {
      if (action === 'goal:close-modal') closeModal();
      else closeDrawer();
    } else if (action === 'goal:create') {
      const nameEl = document.getElementById('m-name');
      const name = nameEl?.value.trim();
      if (!name) {
        if (nameEl) nameEl.focus();
        return;
      }
      const emojiEl = document.querySelector('.epick.on');
      const emoji = emojiEl?.getAttribute('data-e') || '✦';
      const g = {
        id: Date.now(),
        name,
        emoji,
        cat: document.getElementById('m-cat')?.value || 'personal',
        horizon: document.getElementById('m-horizon')?.value || 'year',
        startDate: document.getElementById('m-start')?.value || '',
        deadline: document.getElementById('m-dl')?.value || '',
        progress: 0,
        milestones: [],
        notes: document.getElementById('m-notes')?.value || '',
        strategy: '',
        createdAt: ts(),
        projectIds: [],
        taskIds: []
      };
      goals.push(g);
      saveGoals(state, handlers);
      closeModal();
      renderAll();
      setTimeout(() => openDrawer(g.id, state, handlers), 300);
    } else if (action === 'goal:open-milestone-modal') {
      const gid = actionEl.getAttribute('data-gid');
      if (gid) openMilestoneModal(parseInt(gid, 10), state, handlers);
    } else if (action === 'goal:link-project') {
      const gid = actionEl.getAttribute('data-gid');
      if (gid) openProjectLinkModal(parseInt(gid, 10), state, handlers);
    } else if (action === 'goal:link-tasks') {
      const gid = actionEl.getAttribute('data-gid');
      if (gid) openTasksLinkModal(parseInt(gid, 10), state, handlers);
    } else if (action === 'goal:close-milestone-modal') {
      closeMilestoneModal();
    } else if (action === 'goal:add-milestone-from-modal') {
      const titleInp = document.getElementById('goal-milestone-title');
      const dateInp = document.getElementById('goal-milestone-date');
      const title = titleInp?.value?.trim();
      const g = goals.find(x => x.id === addMilestoneGoalId);
      if (!g || !title) return;
      if (!g.milestones) g.milestones = [];
      g.milestones.push({ title, date: dateInp?.value || '', done: false });
      if (titleInp) titleInp.value = '';
      if (dateInp) dateInp.value = '';
      saveGoals(state, handlers);
      closeMilestoneModal();
      renderAll(state, handlers);
    } else if (action === 'goal:close-project-modal') {
      closeProjectLinkModal();
      renderAll(state, handlers);
    } else if (action === 'goal:unlink-project') {
      const projectId = actionEl.getAttribute('data-project-id');
      const g = goals.find(x => x.id === linkProjectGoalId);
      if (g && projectId && Array.isArray(g.projectIds)) {
        g.projectIds = g.projectIds.filter(id => String(id) !== String(projectId));
        saveGoals(state, handlers);
        openProjectLinkModal(linkProjectGoalId, state, handlers);
      }
    } else if (action === 'goal:close-tasks-modal') {
      closeTasksLinkModal();
      renderAll(state, handlers);
    } else if (action === 'goal:unlink-task') {
      const taskId = actionEl.getAttribute('data-task-id');
      const g = goals.find(x => x.id === linkTasksGoalId);
      if (g && taskId && Array.isArray(g.taskIds)) {
        g.taskIds = g.taskIds.filter(id => String(id) !== String(taskId));
        saveGoals(state, handlers);
        openTasksLinkModal(linkTasksGoalId, state, handlers);
      }
    } else if (action === 'goal:unlink-habit') {
      const habitId = actionEl.getAttribute('data-habit-id');
      if (habitId && window.Petal?.features?.habits?.setHabitGoalId) {
        window.Petal.features.habits.setHabitGoalId(habitId, null);
        const g = goals.find(x => x.id === selId);
        if (g) fillDrawerDetails(g);
      }
    } else if (action === 'goal:unlink-routine') {
      const routineId = actionEl.getAttribute('data-routine-id');
      if (routineId && window.Petal?.features?.routines?.setRoutineGoalId) {
        window.Petal.features.routines.setRoutineGoalId(routineId, null);
        const g = goals.find(x => x.id === selId);
        if (g) fillDrawerDetails(g);
      }
    } else if (action === 'goal:open') {
      const gid = actionEl.getAttribute('data-gid') || actionEl.closest('[data-gid]')?.getAttribute('data-gid');
      if (gid) openDrawer(parseInt(gid), state, handlers);
    } else if (action === 'goal:open-day') {
      const day = actionEl.getAttribute('data-day');
      if (day) {
        // Find first goal with event on this day
        const today = ts();
        const eventMap = {};
        goals.forEach(g => {
          if (g.deadline === day) {
            if (!eventMap[day]) eventMap[day] = [];
            eventMap[day].push({ type: 'deadline', goal: g });
          }
          (g.milestones || []).forEach(ms => {
            if (ms.date === day) {
              if (!eventMap[day]) eventMap[day] = [];
              eventMap[day].push({ type: 'milestone', goal: g, ms });
            }
          });
        });
        if (eventMap[day] && eventMap[day].length) {
          openDrawer(eventMap[day][0].goal.id, state, handlers);
        }
      }
    } else if (action === 'goal:save') {
      const g = goals.find(g => g.id === selId);
      if (!g) return;
      g.name = document.getElementById('dh-title')?.value.trim() || g.name;
      g.cat = document.getElementById('d-cat')?.value || g.cat;
      g.deadline = document.getElementById('d-dl')?.value || '';
      g.startDate = document.getElementById('d-start')?.value || '';
      g.progress = parseInt(document.getElementById('d-prog')?.value) || 0;
      g.horizon = document.getElementById('d-horizon')?.value || 'year';
      g.notes = document.getElementById('d-notes')?.value || '';
      g.strategy = document.getElementById('d-strategy')?.value || '';
      saveGoals(state, handlers);
      renderAll();
      const btn = document.getElementById('d-save');
      if (btn) {
        btn.textContent = '✓ Saved';
        setTimeout(() => { if (btn) btn.textContent = 'Save'; }, 1400);
      }
    } else if (action === 'goal:delete') {
      const g = goals.find(g => g.id === selId);
      if (!g) return;
      
      if (!confirm(`Delete "${g.name}"? This cannot be undone.`)) return;
      
      goals = goals.filter(goal => goal.id !== selId);
      saveGoals(state, handlers);
      closeDrawer();
      renderAll();
      showNotification({ message: 'Goal deleted', type: 'success', duration: 3000 });
    } else if (action === 'goal:toggle-done') {
      showDone = !showDone;
      const toggleEl = document.getElementById('ms-show-done-toggle');
      if (toggleEl) toggleEl.textContent = showDone ? 'Hide done →' : 'Show done →';
      renderMilestonesCard();
    } else if (action === 'goal:toggle-ms') {
      const gid = parseInt(actionEl.getAttribute('data-gid') || actionEl.closest('[data-gid]')?.getAttribute('data-gid'));
      const mst = actionEl.getAttribute('data-mst') || actionEl.getAttribute('data-ms');
      if (!gid || !mst) return;
      const g = goals.find(g => g.id === gid);
      if (!g) return;
      const ms = g.milestones.find(m => m.title === decodeURIComponent(mst));
      if (!ms) return;
      ms.done = !ms.done;
      autoProgress(g);
      saveGoals(state, handlers);
      renderAll();
      // Update drawer if open
      if (selId === gid) {
        fillDrawerMilestones(g);
        const progEl = document.getElementById('d-prog');
        if (progEl) {
          progEl.value = g.progress;
          const valEl = document.getElementById('d-prog-val');
          const barEl = document.getElementById('d-prog-bar');
          if (valEl) valEl.textContent = g.progress + '%';
          if (barEl) barEl.style.width = g.progress + '%';
        }
      }
    } else if (action === 'goal:toggle-drawer-ms') {
      const g = goals.find(g => g.id === selId);
      if (!g) return;
      const i = parseInt(actionEl.getAttribute('data-mck'));
      if (g.milestones[i]) {
        g.milestones[i].done = !g.milestones[i].done;
        autoProgress(g);
        saveGoals(state, handlers);
        renderAll();
        fillDrawerMilestones(g);
        const progEl = document.getElementById('d-prog');
        if (progEl) {
          progEl.value = g.progress;
          const valEl = document.getElementById('d-prog-val');
          const barEl = document.getElementById('d-prog-bar');
          if (valEl) valEl.textContent = g.progress + '%';
          if (barEl) barEl.style.width = g.progress + '%';
        }
      }
    } else if (action === 'goal:delete-ms') {
      const g = goals.find(g => g.id === selId);
      if (!g) return;
      const i = parseInt(actionEl.getAttribute('data-mxd'));
      g.milestones.splice(i, 1);
      autoProgress(g);
      saveGoals(state, handlers);
      renderAll();
      fillDrawerMilestones(g);
    } else if (action === 'goal:add-ms') {
      const inp = document.getElementById('d-ms-inp');
      const dt = document.getElementById('d-ms-dt');
      const title = inp?.value.trim();
      if (!title) return;
      const g = goals.find(g => g.id === selId);
      if (!g) return;
      if (!g.milestones) g.milestones = [];
      g.milestones.push({ title, date: dt?.value || '', done: false });
      if (inp) inp.value = '';
      if (dt) dt.value = '';
      saveGoals(state, handlers);
      renderAll();
      fillDrawerMilestones(g);
    } else if (action === 'goal:select-emoji') {
      const modalBody = document.getElementById('modal-body');
      if (modalBody) {
        modalBody.querySelectorAll('.epick').forEach(btn => btn.classList.remove('on'));
        actionEl.classList.add('on');
      }
    } else if (action === 'goal:drawer-tab') {
      const tab = actionEl.getAttribute('data-tab');
      document.querySelectorAll('.dtab').forEach(b => b.classList.remove('on'));
      actionEl.classList.add('on');
      document.querySelectorAll('.dpanel').forEach(p => p.classList.toggle('on', p.id === `dpanel-${tab}`));
    } else if (action === 'goal:prev-year') {
      planYear--;
      renderMonthlyPlan();
    } else if (action === 'goal:next-year') {
      planYear++;
      renderMonthlyPlan();
    }
}

/**
 * Setup event delegation and register handler for global delegation (so goal clicks don’t hit sidebar).
 */
function setupEventDelegation(containerEl, state, handlers) {
  if (!containerEl) return;

  const handleGoalAction = (action, actionEl) => runGoalAction(action, actionEl, state, handlers);
  containerEl._goalsHandleAction = handleGoalAction;
  window._goalsHandleAction = handleGoalAction;
  window._goalsCloseModal = closeModal;
  window._goalsCloseDrawer = closeDrawer;

  const handleClick = (e) => {
    const actionEl = e.target.closest('[data-action]');
    if (!actionEl) return;
    const action = actionEl.getAttribute('data-action');
    if (!action || !action.startsWith('goal:')) return;
    e.preventDefault();
    e.stopPropagation();
    runGoalAction(action, actionEl, state, handlers);
  };

  containerEl.addEventListener('click', handleClick, true);

  // Horizon tabs
  containerEl.querySelectorAll('[data-h]').forEach(btn => {
    btn.addEventListener('click', () => {
      const group = btn.closest('#h-group') || btn.closest('#htabs');
      if (group) {
        group.querySelectorAll('[data-h]').forEach(b => b.classList.remove(b.closest('#h-group') ? 'active' : 'on'));
        btn.classList.add(btn.closest('#h-group') ? 'active' : 'on');
        tlHorizon = btn.dataset.h;
        // Sync both groups
        document.querySelectorAll('#h-group [data-h]').forEach(b => b.classList.toggle('active', b.dataset.h === tlHorizon));
        document.querySelectorAll('#htabs [data-h]').forEach(b => b.classList.toggle('on', b.dataset.h === tlHorizon));
        renderFocus();
        renderMilestonesCard();
        renderTimeline();
      }
    });
  });

  // Close on escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeModal();
      closeDrawer();
      closeMilestoneModal();
    }
  });

  // Close modal/drawer on background click
  const modalBg = document.getElementById('modal-bg');
  if (modalBg) {
    modalBg.addEventListener('click', (e) => {
      if (e.target === modalBg) closeModal();
    });
  }
  const drawerBg = document.getElementById('drawer-bg');
  if (drawerBg) {
    drawerBg.addEventListener('click', (e) => {
      if (e.target === drawerBg) closeDrawer();
    });
  }
  const projectModalBg = document.getElementById('goal-project-modal-bg');
  if (projectModalBg) {
    projectModalBg.addEventListener('click', (e) => {
      if (e.target === projectModalBg) closeProjectLinkModal();
    });
  }
  const tasksModalBg = document.getElementById('goal-tasks-modal-bg');
  if (tasksModalBg) {
    tasksModalBg.addEventListener('click', (e) => {
      if (e.target === tasksModalBg) closeTasksLinkModal();
    });
  }
  const milestoneModalBg = document.getElementById('goal-milestone-modal-bg');
  if (milestoneModalBg) {
    milestoneModalBg.addEventListener('click', (e) => {
      if (e.target === milestoneModalBg) closeMilestoneModal();
    });
  }
}
