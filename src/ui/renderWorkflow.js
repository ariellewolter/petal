// ═══════════════════════ RENDER WORKFLOW ═══════════════════════
// Pure rendering function for workflow view
// Takes state and handlers as parameters - no store peeking

import { esc } from '../utils/strings.js';
import { getAllTasks, isTaskBlocked } from '../domain/models.js';

/**
 * Render workflow view
 * @param {HTMLElement} containerEl - Container element to render into
 * @param {Object} state - Current app state
 * @param {Object} handlers - Event handlers
 */
export async function renderWorkflow(containerEl, state, handlers) {
  const { tasks, projects } = state;
  
  // Get project filter from DOM (or use state)
  const projectFilter = document.getElementById('workflow-project-filter')?.value || 'all';
  
  // Update project filter dropdown
  const filterEl = document.getElementById('workflow-project-filter');
  if (filterEl) {
    const current = filterEl.value;
    filterEl.innerHTML = '<option value="all">All Projects</option>';
    (projects || []).forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = p.name;
      filterEl.appendChild(opt);
    });
    if (current) filterEl.value = current;
  }
  
  // Get all tasks (including subtasks)
  const allTasks = getAllTasks(tasks || [], projects || []);
  
  // Filter tasks by project
  let filteredTasks = allTasks;
  if (projectFilter !== 'all') {
    const projectIdNum = parseInt(projectFilter);
    filteredTasks = allTasks.filter(t => {
      const taskProjectId = t.projectId ? (typeof t.projectId === 'number' ? t.projectId : parseInt(t.projectId)) : null;
      return taskProjectId === projectIdNum;
    });
  }
  
  // Calculate bottlenecks
  const blocked = filteredTasks.filter(t => !t.done && isTaskBlocked(t, allTasks));
  const staleDoing = filteredTasks.filter(t => {
    if (t.done || t.status !== 'Doing') return false;
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    const taskDate = new Date(t.id);
    return taskDate < sevenDaysAgo;
  });
  const nextUp = filteredTasks
    .filter(t => !t.done && !isTaskBlocked(t, allTasks) && t.priority === 3) // priority 3 = high
    .slice(0, 5);
  
  // Render bottleneck strip
  const bottleneckEl = document.getElementById('workflow-bottlenecks');
  if (bottleneckEl) {
    bottleneckEl.innerHTML = `
      <div id="bottleneck-blocked" style="flex:1;padding:8px;background:${blocked.length > 0 ? 'var(--rose-pale)' : 'var(--bg2)'};border-radius:6px;border-left:3px solid var(--rose);">
        <div style="font-size:11px;color:var(--text-dim);margin-bottom:4px;">BLOCKED</div>
        <div style="font-size:18px;font-weight:500;">${blocked.length}</div>
        ${blocked.length > 0 ? `<div style="font-size:10px;color:var(--text-dim);margin-top:4px;">${blocked.slice(0, 3).map(t => esc(t.title || 'Untitled')).join(', ')}</div>` : ''}
      </div>
      <div id="bottleneck-stale" style="flex:1;padding:8px;background:${staleDoing.length > 0 ? 'var(--sage-pale)' : 'var(--bg2)'};border-radius:6px;border-left:3px solid var(--sage);">
        <div style="font-size:11px;color:var(--text-dim);margin-bottom:4px;">STALE (>7d)</div>
        <div style="font-size:18px;font-weight:500;">${staleDoing.length}</div>
        ${staleDoing.length > 0 ? `<div style="font-size:10px;color:var(--text-dim);margin-top:4px;">${staleDoing.slice(0, 3).map(t => esc(t.title || 'Untitled')).join(', ')}</div>` : ''}
      </div>
      <div id="bottleneck-next" style="flex:1;padding:8px;background:${nextUp.length > 0 ? 'var(--mauve-pale)' : 'var(--bg2)'};border-radius:6px;border-left:3px solid var(--mauve);">
        <div style="font-size:11px;color:var(--text-dim);margin-bottom:4px;">NEXT UP</div>
        <div style="font-size:18px;font-weight:500;">${nextUp.length}</div>
        ${nextUp.length > 0 ? `<div style="font-size:10px;color:var(--text-dim);margin-top:4px;">${nextUp.slice(0, 3).map(t => esc(t.title || 'Untitled')).join(', ')}</div>` : ''}
      </div>
    `;
  }
  
  // Show status message
  const statusEl = document.getElementById('workflow-status');
  if (statusEl) {
    const totalTasks = filteredTasks.length;
    const assignedTasks = filteredTasks.filter(t => t.lane && t.lane !== 'none' && t.lane !== '').length;
    const unassignedTasks = totalTasks - assignedTasks;
    statusEl.innerHTML = `<div style="padding:8px 12px;background:var(--bg2);border-radius:6px;font-size:12px;color:var(--text-dim);">
      Total: ${totalTasks} tasks | Assigned: ${assignedTasks} | Unassigned: ${unassignedTasks}
    </div>`;
  }
  
  // Render lanes (this would call renderLane for each lane)
  // For now, we'll let the existing renderLane functions handle this
  // They can be extracted later if needed
  if (typeof renderLane === 'function') {
    const lanes = ['lab', 'comp', 'writing', 'presentation'];
    for (const lane of lanes) {
      await renderLane(lane, filteredTasks);
    }
    await renderUnassignedLane(filteredTasks);
  }
}
