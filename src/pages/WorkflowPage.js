// ═══════════════════════ WORKFLOW PAGE ═══════════════════════
// Workflow view with List, Timeline, and Canvas views
// Inspired by LabOS, adapted for Petal with petal styling
// Takes state and handlers as parameters - no store peeking

import { esc, escAttr } from '../utils/strings.js';
import { parseDate } from '../utils/dates.js';
import { getAllTasks } from '../domain/models.js';
import { filterTasksForProject, findProjectById } from '../utils/projectHelpers.js';
import { selectBottlenecks } from '../features/workflow/selectors.js';

function projectTasksFor(tasks, projects, projectId) {
  return filterTasksForProject(tasks || [], projectId, {
    excludeDeleted: true,
    topLevelOnly: true
  });
}

function renderWorkflowBottlenecks(state) {
  const bottleneckEl = document.getElementById('workflow-bottlenecks');
  if (!bottleneckEl) return;

  const { blocked, stale, next } = selectBottlenecks(state);

  bottleneckEl.innerHTML = `
    <div data-action="workflow:scroll-bottleneck" data-bottleneck-type="blocked" role="button" tabindex="0" style="flex:1;padding:12px;background:${blocked.length > 0 ? 'var(--rose-pale)' : 'var(--bg2)'};border-radius:6px;border-left:3px solid var(--rose);cursor:pointer;">
      <div style="font-size:11px;color:var(--text-dim);margin-bottom:4px;letter-spacing:.05em;text-transform:uppercase;">BLOCKED</div>
      <div style="font-size:20px;font-weight:600;color:var(--text);">${blocked.length}</div>
      ${blocked.length > 0 ? `<div style="font-size:10px;color:var(--text-dim);margin-top:6px;line-height:1.4;">${blocked.slice(0, 3).map(t => esc(t.title || 'Untitled')).join(', ')}</div>` : '<div style="font-size:10px;color:var(--text-dim);margin-top:6px;">None</div>'}
    </div>
    <div data-action="workflow:scroll-bottleneck" data-bottleneck-type="stale" role="button" tabindex="0" style="flex:1;padding:12px;background:${stale.length > 0 ? 'var(--sage-pale)' : 'var(--bg2)'};border-radius:6px;border-left:3px solid var(--sage);cursor:pointer;">
      <div style="font-size:11px;color:var(--text-dim);margin-bottom:4px;letter-spacing:.05em;text-transform:uppercase;">STALE (&gt;7d)</div>
      <div style="font-size:20px;font-weight:600;color:var(--text);">${stale.length}</div>
      ${stale.length > 0 ? `<div style="font-size:10px;color:var(--text-dim);margin-top:6px;line-height:1.4;">${stale.slice(0, 3).map(t => esc(t.title || 'Untitled')).join(', ')}</div>` : '<div style="font-size:10px;color:var(--text-dim);margin-top:6px;">None</div>'}
    </div>
    <div data-action="workflow:scroll-bottleneck" data-bottleneck-type="next" role="button" tabindex="0" style="flex:1;padding:12px;background:${next.length > 0 ? 'var(--mauve-pale)' : 'var(--bg2)'};border-radius:6px;border-left:3px solid var(--mauve);cursor:pointer;">
      <div style="font-size:11px;color:var(--text-dim);margin-bottom:4px;letter-spacing:.05em;text-transform:uppercase;">NEXT UP</div>
      <div style="font-size:20px;font-weight:600;color:var(--text);">${next.length}</div>
      ${next.length > 0 ? `<div style="font-size:10px;color:var(--text-dim);margin-top:6px;line-height:1.4;">${next.slice(0, 3).map(t => esc(t.title || 'Untitled')).join(', ')}</div>` : '<div style="font-size:10px;color:var(--text-dim);margin-top:6px;">None</div>'}
    </div>
  `;
}

function highlightWorkflowTaskEl(taskEl) {
  if (!taskEl) return;
  taskEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  taskEl.style.outline = '2px solid var(--rose-soft)';
  setTimeout(() => { taskEl.style.outline = ''; }, 2000);
}

export function scrollToWorkflowBottleneck(type) {
  const state = window.Petal?.store?.getState();
  if (!state) return;

  const { blocked, stale, next } = selectBottlenecks(state);
  const tasks = type === 'blocked' ? blocked : type === 'stale' ? stale : next;
  const first = tasks[0];
  if (!first) return;

  const listView = document.getElementById('wf-view-list');
  if (listView && !listView.classList.contains('active')) {
    const listBtn = document.getElementById('wf-btn-list');
    if (window.switchWorkflowView) window.switchWorkflowView('list', listBtn);
  }

  const taskSel =
    typeof CSS !== 'undefined' && CSS.escape
      ? `.wf-etask[data-task-id="${CSS.escape(String(first.id))}"]`
      : `.wf-etask[data-task-id="${first.id}"]`;

  const projectId = first.projectId;
  if (!projectId) {
    const taskEl = document.querySelector(taskSel);
    if (taskEl) {
      highlightWorkflowTaskEl(taskEl);
      return;
    }
    const label = first.title || 'Untitled';
    if (window.routerSwitchView) {
      window.routerSwitchView('tasks', { force: true }).then(() => {
        const card = document.querySelector(`.task-card[data-id="${first.id}"]`);
        if (card) {
          card.classList.add('petal-link-highlight');
          card.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setTimeout(() => card.classList.remove('petal-link-highlight'), 8000);
        }
      });
    } else {
      alert(`"${label}" is not assigned to a project. Open the Tasks view to find it.`);
    }
    return;
  }

  const row = document.getElementById(`wf-row-${projectId}`);
  if (!row) return;

  const expand = document.getElementById(`wf-expand-${projectId}`);
  if (expand && !expand.classList.contains('open') && window.toggleWorkflowExpand) {
    window.toggleWorkflowExpand(projectId);
  }

  row.scrollIntoView({ behavior: 'smooth', block: 'center' });

  setTimeout(() => {
    highlightWorkflowTaskEl(document.querySelector(taskSel));
  }, 250);
}

// ═══════════════════════════════════════════════════════════
// VIEW SWITCHING
// ═══════════════════════════════════════════════════════════

export function switchWorkflowView(name, btn) {
  document.querySelectorAll('.wf-subview').forEach(v => {
    v.classList.remove('active');
    v.style.display = 'none'; // Explicitly hide all views
  });
  document.querySelectorAll('.wf-view-btn').forEach(b => b.classList.remove('active'));
  
  // Map view names to actual element IDs
  let viewId;
  if (name === 'workflow') {
    viewId = 'wf-view-workflow-canvas';
  } else {
    viewId = 'wf-view-' + name;
  }
  
  const viewEl = document.getElementById(viewId);

  if (viewEl) {
    viewEl.classList.add('active');
    // For timeline and workflow, ensure proper display style
    if (name === 'timeline') {
      viewEl.style.display = 'flex';
      viewEl.style.flexDirection = 'column';
      viewEl.style.height = '100%';
      viewEl.style.overflow = 'hidden';
    } else if (name === 'workflow') {
      viewEl.style.display = 'block';
    } else {
      viewEl.style.display = 'block';
    }
  }
  if (btn) btn.classList.add('active');
  
  if (name === 'timeline') {
    // Small delay to ensure DOM is updated
    setTimeout(() => {
      buildWorkflowTimeline();
    }, 50);
  } else if (name === 'workflow') {
    setTimeout(() => {
      if (window.renderWorkflowCanvas && window.Petal?.store) {
        const state = window.Petal.store.getState();
        const handlers = window.Petal.handlers || {};
        const containerEl = document.getElementById('wf-view-workflow-canvas');
        if (containerEl) window.renderWorkflowCanvas(containerEl, state, handlers);
      }
    }, 100);
  } else if (name === 'list') {
    renderWorkflowList();
  }
  if (window.closeWfDetail) window.closeWfDetail();
}

export function toggleWorkflowFilter(el) {
  document.querySelectorAll('.wf-filter-chip').forEach(c => c.classList.remove('on'));
  el.classList.add('on');
  renderWorkflowList();
}

export function filterWorkflowProjects() {
  renderWorkflowList();
}

function projectStatusRank(tasks, projects, project) {
  const projectTasks = projectTasksFor(tasks, projects, project.id);
  const openTasks = projectTasks.filter(t => !t.done);
  if (openTasks.length > 0) return 0;
  if (projectTasks.length > 0 && projectTasks.every(t => t.done)) return 2;
  return 1;
}

function sortWorkflowProjects(activeProjects, tasks, projects) {
  const sortMode = window.workflowListSort || 'deadline';
  const sortAsc = window.workflowListSortAsc !== false;
  const groupByStatus = !!window.workflowListGroupByStatus;

  return [...activeProjects].sort((a, b) => {
    if (groupByStatus) {
      const statusDiff =
        projectStatusRank(tasks, projects, a) - projectStatusRank(tasks, projects, b);
      if (statusDiff !== 0) return statusDiff;
    }
    if (sortMode === 'name') {
      const cmp = (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' });
      return sortAsc ? cmp : -cmp;
    }
    const da = a.due ? new Date(a.due).getTime() : Number.POSITIVE_INFINITY;
    const db = b.due ? new Date(b.due).getTime() : Number.POSITIVE_INFINITY;
    const cmp = da - db;
    return sortAsc ? cmp : -cmp;
  });
}

function updateWorkflowListToolbarLabels() {
  const sortBtn = document.getElementById('wf-sort-deadline-btn');
  if (sortBtn) {
    const mode = window.workflowListSort || 'deadline';
    const asc = window.workflowListSortAsc !== false;
    const arrow = asc ? '↑' : '↓';
    const label = mode === 'name' ? 'Name' : 'Deadline';
    sortBtn.textContent = `Sort: ${label} ${arrow}`;
  }
  const groupBtn = document.getElementById('wf-group-status-btn');
  if (groupBtn) {
    groupBtn.textContent = window.workflowListGroupByStatus
      ? 'Group by: Status ✓'
      : 'Group by: Status';
    groupBtn.style.borderColor = window.workflowListGroupByStatus ? 'var(--rose-soft)' : '';
    groupBtn.style.color = window.workflowListGroupByStatus ? 'var(--rose)' : '';
  }
}

export function toggleWorkflowListSort() {
  const mode = window.workflowListSort || 'deadline';
  const asc = window.workflowListSortAsc !== false;
  if (mode === 'deadline' && asc) {
    window.workflowListSortAsc = false;
  } else if (mode === 'deadline' && !asc) {
    window.workflowListSort = 'name';
    window.workflowListSortAsc = true;
  } else if (mode === 'name' && asc) {
    window.workflowListSortAsc = false;
  } else {
    window.workflowListSort = 'deadline';
    window.workflowListSortAsc = true;
  }
  updateWorkflowListToolbarLabels();
  renderWorkflowList();
}

export function toggleWorkflowListGroup() {
  window.workflowListGroupByStatus = !window.workflowListGroupByStatus;
  updateWorkflowListToolbarLabels();
  renderWorkflowList();
}

export function exportWorkflowList() {
  if (!window.Petal?.store) return;
  const state = window.Petal.store.getState();
  const { tasks, projects } = state;
  let activeProjects = (projects || []).filter(p => !p.done);
  const selectedProjectId = window.workflowSelectedProjectId;
  if (selectedProjectId) {
    activeProjects = activeProjects.filter(p => findProjectById([p], selectedProjectId));
  }
  activeProjects = sortWorkflowProjects(activeProjects, tasks, projects);

  const payload = activeProjects.map(p => {
    const projectTasks = projectTasksFor(tasks, projects, p.id);
    return {
      id: p.id,
      name: p.name,
      due: p.due,
      done: p.done,
      openTasks: projectTasks.filter(t => !t.done).length,
      totalTasks: projectTasks.length
    };
  });

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `petal-workflow-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function workflowNewProject() {
  const switchFn = window.routerSwitchView || window.switchView;
  if (switchFn) {
    await switchFn('projects');
  }
  if (window.toggleCreateProjectForm) {
    window.toggleCreateProjectForm();
  }
}

// ═══════════════════════════════════════════════════════════
// MAIN RENDER FUNCTION
// ═══════════════════════════════════════════════════════════

function updateWorkflowHeaderStatus(state) {
  const statusEl = document.getElementById('wf-header-status');
  if (!statusEl || !state) return;
  const projects = Array.isArray(state.projects) ? state.projects : [];
  const tasks = Array.isArray(state.tasks) ? state.tasks : [];
  const activeProjects = projects.filter(p => p && !p.done);
  const activeTasks = tasks.filter(t => t && !t.done && !t.deletedAt && !t.parentTaskId);
  statusEl.textContent = `${activeProjects.length} project${activeProjects.length !== 1 ? 's' : ''} · ${activeTasks.length} active task${activeTasks.length !== 1 ? 's' : ''}`;
}

export async function renderWorkflowPage(containerEl, state, handlers) {
  if (!containerEl) return;

  // Remove duplicate header injected by older WorkflowPage versions
  const staleHeader = containerEl.querySelector('.workflow-header');
  if (staleHeader) staleHeader.remove();

  populateWorkflowProjectFilter(state);
  updateWorkflowHeaderStatus(state);
  renderWorkflowList();
  
  // If workflow canvas view is active, render it
  const workflowViewEl = document.getElementById('wf-view-workflow-canvas');
  if (workflowViewEl && workflowViewEl.classList.contains('active')) {
    if (window.renderWorkflowCanvas && window.Petal?.store) {
      const state = window.Petal.store.getState();
      const handlers = window.Petal.handlers || {};
      await window.renderWorkflowCanvas(workflowViewEl, state, handlers);
    }
  }
}

// ═══════════════════════════════════════════════════════════
// PROJECT FILTER
// ═══════════════════════════════════════════════════════════

function populateWorkflowProjectFilter(state) {
  const select = document.getElementById('wf-project-filter');
  if (!select) return;
  
  const { projects } = state;
  const activeProjects = (projects || []).filter(p => !p.done);
  
  // Clear existing options except "All Projects"
  select.innerHTML = '<option value="all">All Projects</option>';
  
  // Add project options
  activeProjects.forEach(project => {
    const option = document.createElement('option');
    option.value = project.id;
    option.textContent = esc(project.name || 'Untitled Project');
    select.appendChild(option);
  });
}

export function setWorkflowProjectFilter(projectId) {
  window.workflowSelectedProjectId = projectId === 'all' ? null : projectId;

  const activeView = document.querySelector('.wf-subview.active');

  if (activeView) {
    if (activeView.id === 'wf-view-list') {
      renderWorkflowList();
    } else if (activeView.id === 'wf-view-timeline') {
      buildWorkflowTimeline();
    } else if (activeView.id === 'wf-view-workflow-canvas') {
      if (window.renderWorkflowCanvas && window.Petal?.store) {
        const state = window.Petal.store.getState();
        const handlers = window.Petal.handlers || {};
        const containerEl = document.getElementById('wf-view-workflow-canvas');
        if (containerEl) window.renderWorkflowCanvas(containerEl, state, handlers);
      }
    }
  } else {
    renderWorkflowList();
  }
}

// ═══════════════════════════════════════════════════════════
// LIST VIEW RENDERING
// ═══════════════════════════════════════════════════════════

export function renderWorkflowList() {
  if (!window.Petal?.store) return;

  const state = window.Petal.store.getState();
  const { tasks, projects } = state;

  updateWorkflowHeaderStatus(state);

  let activeProjects = (projects || []).filter(p => !p.done);
  const selectedProjectId = window.workflowSelectedProjectId;

  if (selectedProjectId) {
    activeProjects = activeProjects.filter(p => findProjectById([p], selectedProjectId));
  }
  
  // Apply status filter
  const activeFilter = document.querySelector('.wf-filter-chip.on')?.textContent || 'All';
  if (activeFilter === 'Active') {
    activeProjects = activeProjects.filter(p => {
      const projectTasks = projectTasksFor(tasks, projects, p.id);
      return projectTasks.some(t => !t.done);
    });
  } else if (activeFilter === 'On Hold') {
    activeProjects = activeProjects.filter(p => {
      const projectTasks = projectTasksFor(tasks, projects, p.id);
      const hasOpen = projectTasks.some(t => !t.done);
      return !hasOpen && projectTasks.length > 0;
    });
  }
  
  // Apply search
  const searchInput = document.getElementById('wfSearchInput');
  const searchTerm = searchInput?.value?.toLowerCase() || '';
  if (searchTerm) {
    activeProjects = activeProjects.filter(p => 
      (p.name || '').toLowerCase().includes(searchTerm) ||
      (p.desc || '').toLowerCase().includes(searchTerm)
    );
  }
  
  // Calculate stats - if a single project is selected, show only that project's stats
  const totalProjects = activeProjects.length;
  const activeCount = activeProjects.filter(p => {
    const projectTasks = projectTasksFor(tasks, projects, p.id);
    return projectTasks.some(t => !t.done);
  }).length;
  
  // Get tasks for filtered projects only
  let openTasksCount = 0;
  let allProjectTasks = [];
  activeProjects.forEach(p => {
    const projectTasks = projectTasksFor(tasks, projects, p.id);
    allProjectTasks = allProjectTasks.concat(projectTasks);
  });
  openTasksCount = allProjectTasks.filter(t => !t.done).length;
  
  // If showing all projects, use the full task list
  if (!selectedProjectId) {
    const allTasks = getAllTasks(state.tasks || [], state.projects || []);
    openTasksCount = allTasks.filter(t => !t.done && !t.deletedAt && !t.parentTaskId).length;
  }
  
  // Find nearest deadline
  let nearestDeadline = null;
  let nearestDays = Infinity;
  activeProjects.forEach(p => {
    if (p.due) {
      const dueDate = new Date(p.due);
      const now = new Date();
      const diffDays = Math.floor((dueDate - now) / (1000 * 60 * 60 * 24));
      if (diffDays >= 0 && diffDays < nearestDays) {
        nearestDays = diffDays;
        nearestDeadline = { project: p, days: diffDays, date: p.due };
      }
    }
  });
  
  // Calculate average progress
  let totalProgress = 0;
  let projectsWithTasks = 0;
  activeProjects.forEach(p => {
    const projectTasks = projectTasksFor(tasks, projects, p.id);
    if (projectTasks.length > 0) {
      const doneCount = projectTasks.filter(t => t.done).length;
      totalProgress += (doneCount / projectTasks.length) * 100;
      projectsWithTasks++;
    }
  });
  const avgProgress = projectsWithTasks > 0 ? Math.round(totalProgress / projectsWithTasks) : 0;
  
  // Update stats labels based on filter
  const statsLabel = selectedProjectId ? 'for this project' : 'across all projects';
  
  // Render stats
  const statsEl = document.getElementById('wfListStats');
  if (statsEl) {
    statsEl.innerHTML = `
      <div class="wf-list-stat">
        <div class="wf-ls-label">Total Projects</div>
        <div class="wf-ls-val" style="color:var(--sage)">${totalProjects}</div>
        <div class="wf-ls-sub">${activeCount} active · ${totalProjects - activeCount} planning</div>
      </div>
      <div class="wf-list-stat">
        <div class="wf-ls-label">Open Tasks</div>
        <div class="wf-ls-val" style="color:var(--rose)">${openTasksCount}</div>
        <div class="wf-ls-sub">${statsLabel}</div>
      </div>
      <div class="wf-list-stat">
        <div class="wf-ls-label">Nearest Deadline</div>
        <div class="wf-ls-val" style="color:${nearestDeadline ? 'var(--overdue)' : 'var(--text-dim)'}">${nearestDeadline ? nearestDeadline.days + 'd' : '–'}</div>
        <div class="wf-ls-sub">${nearestDeadline ? new Date(nearestDeadline.date).toLocaleDateString('en-US', {month:'short',day:'numeric'}) + ' · ' + esc(nearestDeadline.project.name) : 'No deadlines'}</div>
      </div>
      <div class="wf-list-stat">
        <div class="wf-ls-label">${selectedProjectId ? 'Progress' : 'Avg. Progress'}</div>
        <div class="wf-ls-val" style="color:var(--mauve)">${avgProgress}%</div>
        <div class="wf-ls-sub">${selectedProjectId ? 'of this project' : 'across all projects'}</div>
      </div>
    `;
  }

  renderWorkflowBottlenecks(state);
  
  activeProjects = sortWorkflowProjects(activeProjects, tasks, projects);
  updateWorkflowListToolbarLabels();

  // Render project rows
  const tbodyEl = document.getElementById('wfProjTbody');
  if (!tbodyEl) return;
  
  if (activeProjects.length === 0) {
    tbodyEl.innerHTML = '<div style="padding:40px;text-align:center;color:var(--text-dim);font-size:13px;">No projects found</div>';
    return;
  }
  
  // If a single project is selected, auto-expand it
  const shouldAutoExpand = selectedProjectId && activeProjects.length === 1;
  
  tbodyEl.innerHTML = activeProjects.map((project, index) => {
    const projectTasks = projectTasksFor(tasks, projects, project.id);
    const doneTasks = projectTasks.filter(t => t.done);
    const openTasks = projectTasks.filter(t => !t.done);
    const progress = projectTasks.length > 0 
      ? Math.round((doneTasks.length / projectTasks.length) * 100) 
      : 0;
    
    const colorVar = `--proj-${(project.color || 1)}`;
    const color = getComputedStyle(document.documentElement).getPropertyValue(colorVar) || '#c98b8b';
    
    let statusClass = 'wf-sp-plan';
    let statusText = 'Planning';
    if (openTasks.length > 0) {
      statusClass = 'wf-sp-active';
      statusText = '● Active';
    } else if (projectTasks.length > 0 && doneTasks.length === projectTasks.length) {
      statusClass = 'wf-sp-done';
      statusText = '✓ Complete';
    }
    
    let deadlineHtml = '<div class="wf-dl-date">No deadline</div><div class="wf-dl-countdown wf-dl-ok">–</div>';
    if (project.due) {
      const dueDate = new Date(project.due);
      const now = new Date();
      const diffDays = Math.floor((dueDate - now) / (1000 * 60 * 60 * 24));
      const dateStr = dueDate.toLocaleDateString('en-US', {month:'short',day:'numeric'});
      const countdownClass = diffDays < 0 ? 'wf-dl-soon' : diffDays <= 7 ? 'wf-dl-soon' : 'wf-dl-ok';
      const countdownText = diffDays < 0 ? `${Math.abs(diffDays)}d overdue` : diffDays === 0 ? 'Today' : `${diffDays}d`;
      deadlineHtml = `<div class="wf-dl-date">${dateStr}</div><div class="wf-dl-countdown ${countdownClass}">${countdownText}</div>`;
    }
    
    const projectFiles = project.files || [];
    
    return `
      <div class="wf-proj-row c${project.color || 1}" id="wf-row-${project.id}" data-action="workflow:toggle-expand" data-project-id="${project.id}" role="button" tabindex="0">
        <div class="wf-proj-cell wf-proj-name-cell">
          <div class="wf-proj-color-dot" style="background:${color}"></div>
          <div>
            <div class="wf-proj-name">${esc(project.name || 'Untitled Project')}</div>
            <div class="wf-proj-desc">${esc(project.desc || 'Project')}</div>
          </div>
        </div>
        <div class="wf-proj-cell"><span class="wf-status-pill ${statusClass}">${statusText}</span></div>
        <div class="wf-proj-cell">
          <div class="wf-prog-wrap">
            <div class="wf-prog-bar"><div class="wf-prog-fill" style="width:${progress}%;background:${color}"></div></div>
            <div class="wf-prog-pct">${progress}%</div>
          </div>
        </div>
        <div class="wf-proj-cell wf-task-counts">
          <div class="wf-tc-row">${openTasks.length} open</div>
          <div class="wf-tc-row" style="color:var(--sage)">${doneTasks.length} done</div>
        </div>
        <div class="wf-proj-cell wf-deadline-cell">${deadlineHtml}</div>
        <div class="wf-proj-cell" style="color:var(--text-dim);font-size:11px;">${projectFiles.length} files</div>
        <div class="wf-proj-cell"><span class="wf-expand-toggle" aria-hidden="true">›</span></div>
      </div>
      <div class="wf-proj-expand" id="wf-expand-${project.id}">
        <div class="wf-expand-grid">
          <div>
            <div class="wf-expand-section-title">${selectedProjectId ? 'All Tasks' : 'Open Tasks'}</div>
            <div class="wf-expand-tasks">
              ${(selectedProjectId ? projectTasks : projectTasks.slice(0, 5)).map(t => `
                <div class="wf-etask ${t.done ? 'done-t' : ''}" data-task-id="${t.id}">
                  <button type="button" class="wf-etask-check ${t.done ? 'done' : ''}" data-action="task:toggle" data-task-id="${t.id}" title="Toggle task" style="background:none;border:none;padding:0;cursor:pointer;"></button>
                  <span class="wf-etask-label">${esc(t.title || 'Untitled')}</span>
                </div>
              `).join('')}
              ${projectTasks.length === 0 ? '<div style="font-size:10px;color:var(--text-light);padding:8px;">No tasks</div>' : ''}
              ${!selectedProjectId && projectTasks.length > 5 ? `<div style="font-size:10px;color:var(--text-light);padding:8px;font-style:italic;">+${projectTasks.length - 5} more tasks (select project to see all)</div>` : ''}
            </div>
          </div>
          <div>
            <div class="wf-expand-section-title">Recent Files</div>
            <div class="wf-expand-files">
              ${projectFiles.slice(0, 4).map(f => {
                const fileObj = typeof f === 'string' ? { name: f } : f;
                const label = fileObj.label || fileObj.name || 'File';
                return `
                  <div class="wf-efile" data-action="file:open" data-path="${escAttr(JSON.stringify(fileObj))}" title="Open file">
                    <div class="wf-efile-icon" style="background:var(--rose-pale)">📄</div>
                    ${esc(label)}
                  </div>
                `;
              }).join('')}
              ${projectFiles.length === 0 ? '<div style="font-size:10px;color:var(--text-light);padding:8px;">No files</div>' : ''}
            </div>
          </div>
          <div>
            <div class="wf-expand-section-title">Quick Stats</div>
            <div class="wf-expand-quick">
              <div class="wf-quick-stat"><div class="wf-qs-label">Tasks</div><div class="wf-qs-val">${projectTasks.length} total</div></div>
              <div class="wf-quick-stat"><div class="wf-qs-label">Progress</div><div class="wf-qs-val">${progress}%</div></div>
              <div class="wf-quick-stat"><div class="wf-qs-label">Files</div><div class="wf-qs-val">${projectFiles.length}</div></div>
              <button type="button" class="wf-expand-open-btn" data-action="workflow:open-project" data-project-id="${project.id}">Open Project →</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
  
  // Animate progress bars
  setTimeout(() => {
    document.querySelectorAll('.wf-prog-fill').forEach(el => {
      const w = el.style.width;
      el.style.width = '0';
      setTimeout(() => { el.style.width = w; }, 50);
    });
  }, 100);
  
  // Auto-expand if single project selected
  if (shouldAutoExpand && activeProjects.length > 0) {
    setTimeout(() => {
      const projectId = activeProjects[0].id;
      const expand = document.getElementById('wf-expand-' + projectId);
      const row = document.getElementById('wf-row-' + projectId);
      if (expand && row) {
        expand.classList.add('open');
        row.classList.add('expanded');
      }
    }, 150);
  }
}

export function toggleWorkflowExpand(id) {
  const expand = document.getElementById('wf-expand-' + id);
  const row = document.getElementById('wf-row-' + id);
  if (!expand || !row) return;
  
  const isOpen = expand.classList.contains('open');
  // Close all
  document.querySelectorAll('.wf-proj-expand').forEach(e => e.classList.remove('open'));
  document.querySelectorAll('.wf-proj-row').forEach(r => r.classList.remove('expanded'));
  
  if (!isOpen) {
    expand.classList.add('open');
    row.classList.add('expanded');
  }
}

// ═══════════════════════════════════════════════════════════
// TIMELINE VIEW RENDERING
// ═══════════════════════════════════════════════════════════

export function buildWorkflowTimeline() {
  if (!window.Petal?.store) {
    console.warn('buildWorkflowTimeline: Petal store not available');
    return;
  }
  
  const state = window.Petal.store.getState();
  const { tasks, projects } = state;
  
  const container = document.getElementById('wfTimelineInner');
  if (!container) {
    console.warn('buildWorkflowTimeline: wfTimelineInner container not found');
    return;
  }
  
  let activeProjects = (projects || []).filter(p => !p.done);
  
  // Apply project filter (if a specific project is selected)
  const selectedProjectId = window.workflowSelectedProjectId;
  if (selectedProjectId) {
    activeProjects = activeProjects.filter(p => findProjectById([p], selectedProjectId));
  }
  
  // Generate months (current year, 12 months)
  const now = new Date();
  const currentYear = now.getFullYear();
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const colW = 110; // px per month
  const nowOffset = (now.getMonth() * colW) + (now.getDate() / 30) * colW;
  
  let html = `<div style="display:flex;flex-direction:column;min-height:100%">`;
  
  // Month header
  html += `<div style="display:grid;grid-template-columns:220px ${months.map(()=>colW+'px').join(' ')};border-bottom:1px solid var(--border);flex-shrink:0;position:sticky;top:0;z-index:20;background:var(--surface)">`;
  html += `<div style="padding:10px 20px;border-right:1px solid var(--border);font-size:9px;letter-spacing:.14em;text-transform:uppercase;color:var(--text-dim);display:flex;align-items:flex-end">${currentYear}</div>`;
  months.forEach((m, i) => {
    const isCurrent = i === now.getMonth();
    html += `<div class="wf-tl-month ${isCurrent ? 'current' : ''}" style="padding:8px 10px;font-size:10px;${isCurrent?'color:var(--rose);':'color:var(--text-dim);'}border-right:1px solid var(--border);letter-spacing:.05em">${m}</div>`;
  });
  html += '</div>';
  
  // Body scroll area
  html += `<div class="wf-tl-body" style="overflow-y:auto;flex:1">`;
  html += `<div style="position:relative;display:grid;grid-template-columns:220px ${months.map(()=>colW+'px').join(' ')}">`;
  
  function monthToX(year, month) {
    const offset = (year - currentYear) * 12 + month;
    return Math.max(0, offset * colW);
  }
  
  activeProjects.forEach((p, pi) => {
    const projectTasks = projectTasksFor(tasks, projects, p.id);
    const doneTasks = projectTasks.filter(t => t.done);
    const progress = projectTasks.length > 0 
      ? Math.round((doneTasks.length / projectTasks.length) * 100) 
      : 0;
    
    const colorVar = `--proj-${(p.color || 1)}`;
    const color = getComputedStyle(document.documentElement).getPropertyValue(colorVar) || '#c98b8b';
    
    // Estimate project dates (use due date or current date range)
    let startDate = new Date(p.id); // Use project creation date
    let endDate = p.due ? new Date(p.due) : new Date(startDate.getTime() + 90 * 24 * 60 * 60 * 1000); // 90 days default
    
    const startMonth = [startDate.getFullYear(), startDate.getMonth()];
    const endMonth = [endDate.getFullYear(), endDate.getMonth()];
    
    // Project header row
    html += `<div style="display:contents">`;
    html += `<div class="wf-tl-proj-info" data-action="workflow:toggle-timeline" data-timeline-id="tl-${p.id}" role="button" tabindex="0" style="padding:14px 20px;border-right:1px solid var(--border);border-bottom:1px solid var(--border);display:flex;flex-direction:column;justify-content:center;gap:3px;background:var(--surface);transition:background .15s;grid-column:1;cursor:pointer;">
      <div style="display:flex;align-items:center;gap:7px">
        <div style="width:8px;height:8px;border-radius:50%;background:${color};flex-shrink:0"></div>
        <div class="wf-tl-proj-name" style="font-size:12px;color:var(--text)">${esc(p.name || 'Untitled')}</div>
      </div>
      <div class="wf-tl-proj-status" style="font-size:9px;color:var(--text-dim);padding-left:15px">${progress}% complete</div>
    </div>`;
    
    // Bar area
    html += `<div class="wf-tl-bar-area" style="grid-column:2/${months.length+2};border-bottom:1px solid var(--border);position:relative;height:54px;background:var(--surface);transition:background .15s">`;
    // Today line
    html += `<div class="wf-tl-today-line" style="position:absolute;left:${nowOffset}px;top:0;bottom:0;width:1px;background:var(--overdue);opacity:.5;z-index:10"></div>`;
    
    // Bar
    const bx = monthToX(startMonth[0], startMonth[1]);
    const bx2 = monthToX(endMonth[0], endMonth[1]) + colW;
    const bw = bx2 - bx;
    html += `<div style="position:absolute;left:${bx}px;top:50%;transform:translateY(-50%);height:20px;width:${bw}px;border-radius:4px;background:${color};opacity:.15;"></div>`;
    // Progress fill
    html += `<div style="position:absolute;left:${bx}px;top:50%;transform:translateY(-50%);height:20px;width:${Math.round(bw*(progress/100))}px;border-radius:4px;background:${color};opacity:.4;"></div>`;
    // Label
    html += `<div style="position:absolute;left:${bx+8}px;top:50%;transform:translateY(-50%);font-size:10px;color:var(--text-dim);white-space:nowrap;pointer-events:none">${progress}%</div>`;
    html += '</div>';
    html += '</div>'; // contents
    
    // Task rows (collapsed by default)
    html += `<div id="tl-${p.id}" style="display:none">`;
    projectTasks.slice(0, 5).forEach(t => {
      const taskStart = t.createdAt ? new Date(t.createdAt) : new Date(t.id);
      const taskEnd = t.due ? new Date(t.due) : new Date(taskStart.getTime() + 7 * 24 * 60 * 60 * 1000);
      const tx1 = monthToX(taskStart.getFullYear(), taskStart.getMonth());
      const tx2 = monthToX(taskEnd.getFullYear(), taskEnd.getMonth()) + colW;
      const tw = Math.max(tx2 - tx1, 16);
      
      html += `<div style="display:contents">`;
      html += `<div class="wf-tl-task-info" style="padding:8px 14px 8px 36px;border-right:1px solid var(--border-faint);border-bottom:1px solid var(--border-faint);display:flex;align-items:center;gap:7px;background:var(--bg);grid-column:1">
        <div class="wf-tl-task-dot" style="width:5px;height:5px;border-radius:50%;flex-shrink:0;background:${t.done?'var(--sage)':'var(--border2)'}"></div>
        <div class="wf-tl-task-name" style="font-size:10px;color:var(--text-dim);${t.done?'text-decoration:line-through':''}">${esc(t.title || 'Untitled')}</div>
      </div>`;
      html += `<div style="grid-column:2/${months.length+2};border-bottom:1px solid var(--border-faint);position:relative;height:36px;background:var(--bg)">`;
      html += `<div class="wf-tl-today-line" style="position:absolute;left:${nowOffset}px;top:0;bottom:0;width:1px;background:var(--overdue);opacity:.3;z-index:10"></div>`;
      html += `<div class="wf-tl-taskbar" style="position:absolute;left:${tx1}px;top:50%;transform:translateY(-50%);height:12px;width:${tw}px;border-radius:3px;background:${color};opacity:${t.done?.7:.5}"></div>`;
      html += '</div>';
      html += '</div>';
    });
    html += '</div>';
  });
  
  html += '</div></div></div>';
  container.innerHTML = html;
}

export function toggleTlExpand(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.display = el.style.display === 'none' ? '' : 'none';
}

// ═══════════════════════════════════════════════════════════
// CANVAS VIEW RENDERING (delegates to existing function)
// ═══════════════════════════════════════════════════════════

// The canvas rendering is handled by the existing renderWorkflowCanvas function
// which is defined in the main HTML file. This module just calls it.

// Make functions available globally for onclick handlers
if (typeof window !== 'undefined') {
  window.switchWorkflowView = switchWorkflowView;
  window.toggleWorkflowFilter = toggleWorkflowFilter;
  window.filterWorkflowProjects = filterWorkflowProjects;
  window.setWorkflowProjectFilter = setWorkflowProjectFilter;
  window.toggleWorkflowExpand = toggleWorkflowExpand;
  window.toggleTlExpand = toggleTlExpand;
  window.renderWorkflowList = renderWorkflowList;
  window.buildWorkflowTimeline = buildWorkflowTimeline;
  window.toggleWorkflowListSort = toggleWorkflowListSort;
  window.toggleWorkflowListGroup = toggleWorkflowListGroup;
  window.exportWorkflowList = exportWorkflowList;
  window.workflowNewProject = workflowNewProject;
  window.scrollToBottleneck = scrollToWorkflowBottleneck;
  window.workflowSelectedProjectId = null;
  if (typeof window.workflowListSort === 'undefined') window.workflowListSort = 'deadline';
  if (typeof window.workflowListSortAsc === 'undefined') window.workflowListSortAsc = true;
  if (typeof window.workflowListGroupByStatus === 'undefined') window.workflowListGroupByStatus = false;
}
