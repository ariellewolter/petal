// ═══════════════════════ RENDER PLANNER GOALS ═══════════════════════
// Goals card for planner sidebar - same integration pattern as habits (and Today goals card)

import { escapeHtml } from '../utils/strings.js';

const CAT_COLS = {
  career: 'var(--rose)',
  health: 'var(--sage)',
  mind: 'var(--mauve)',
  finance: 'var(--soon)',
  personal: '#7a9cbf',
  phd: '#8b7aa8',
  lab: '#7aa8a8'
};

function formatMilestoneDate(dateStr) {
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
}

/**
 * Render goals card in planner sidebar (goals with milestones in view month)
 * @param {HTMLElement} containerEl - Container element to render into
 * @param {Object} state - Current app state
 * @param {Date} [viewDate] - Date used to determine "this month" (defaults to today)
 */
export function renderPlannerGoals(containerEl, state, viewDate = new Date()) {
  const c = containerEl || document.getElementById('planner-goals-card');
  if (!c) return;

  const goals = Array.isArray(state?.goals) ? state.goals : [];
  const d = new Date(viewDate);
  const monthStart = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  const monthEnd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()).padStart(2, '0')}`;

  const goalsThisMonth = goals.filter(g => {
    if (g.progress >= 100) return false;
    const milestones = g.milestones || [];
    return milestones.some(ms => !ms.done && ms.date && ms.date >= monthStart && ms.date <= monthEnd);
  });

  const items = goalsThisMonth.flatMap(g => {
    const milestones = (g.milestones || []).filter(ms => !ms.done && ms.date && ms.date >= monthStart && ms.date <= monthEnd);
    return milestones.map(ms => ({ goal: g, milestone: ms }));
  });
  items.sort((a, b) => {
    if (!a.milestone.date) return 1;
    if (!b.milestone.date) return -1;
    return a.milestone.date.localeCompare(b.milestone.date);
  });

  const monthName = d.toLocaleDateString('en-US', { month: 'long' });
  const listHtml =
    items.length === 0
      ? `
    <div style="font-size:11px;color:var(--text-dim);padding:8px 0;text-align:center;">
      No milestones this month
    </div>
  `
      : items.slice(0, 4).map(({ goal, milestone }) => {
          const pct = goal.progress || 0;
          const color = CAT_COLS[goal.cat] || 'var(--rose)';
          const dateText = formatMilestoneDate(milestone.date);
          return `
    <div class="today-goal-item" data-goal-id="${escapeHtml(goal.id)}" data-milestone="${escapeHtml(milestone.title)}" style="padding:6px 8px;border-radius:4px;margin-bottom:4px;background:var(--bg);border:1px solid var(--border);cursor:pointer;">
      <div style="font-size:11px;font-weight:500;color:var(--text);">
        <span style="margin-right:4px;">${goal.emoji || '◎'}</span>${escapeHtml(milestone.title)}
      </div>
      <div style="font-size:9px;color:var(--text-dim);display:flex;align-items:center;gap:6px;margin-top:2px;">
        <span style="color:${color}">${escapeHtml(goal.name)}</span>
        ${dateText ? `<span>${escapeHtml(dateText)}</span>` : ''}
        <span style="margin-left:auto">${pct}%</span>
      </div>
      <div style="height:2px;background:var(--border);border-radius:1px;margin-top:4px;overflow:hidden;">
        <div style="height:100%;width:${pct}%;background:${color};border-radius:1px;"></div>
      </div>
    </div>
  `;
        }).join('');

  c.innerHTML = `
    <div class="planner-card" style="background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:12px;margin-bottom:12px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
        <div style="font-family:'Jost',sans-serif;font-size:8px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:var(--text-muted);">Goals · ${monthName}</div>
        <span class="today-card-action" data-action="nav:goals" role="button" tabindex="0" style="font-size:8px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:var(--text-dim);cursor:pointer;transition:color 0.13s;">All goals →</span>
      </div>
      <div class="planner-goals-list" style="display:flex;flex-direction:column;gap:4px;">
        ${listHtml}
      </div>
    </div>
  `;

  // Click on goal item: navigate to Goals page and focus that goal (same as Today page)
  c.querySelectorAll('.today-goal-item[data-goal-id]').forEach(el => {
    el.addEventListener('click', () => {
      const goalId = el.getAttribute('data-goal-id');
      if (window.routerSwitchView) {
        window.routerSwitchView('goals').then(() => {
          const goalEl = document.querySelector(`[data-gid="${goalId}"]`);
          if (goalEl) goalEl.click();
        });
      } else if (window.switchView) {
        window.switchView('goals');
        setTimeout(() => {
          const goalEl = document.querySelector(`[data-gid="${goalId}"]`);
          if (goalEl) goalEl.click();
        }, 300);
      }
    });
  });
}
