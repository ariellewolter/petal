// ═══════════════════════ RENDER WORKFLOW ═══════════════════════
// DEPRECATED: Lane-based kanban UI - not used by the router (see WorkflowPage.js + tasklist.html).
// Kept for bottleneck helpers and migration reference. List/timeline/canvas are the live views.
// Pure rendering function for workflow view
// Takes state and handlers as parameters - no store peeking, no store writes

import { esc, escAttr, fileIcon } from '../utils/strings.js';
import { selectWorkflowTasks, selectBottlenecks, selectActiveFiles, selectTasksByLaneAndColumn } from '../features/workflow/selectors.js';
import { LANES } from '../domain/schema.js';
import { isTaskBlocked } from '../domain/models.js';
import { getAllTasks } from '../domain/models.js';
import { projectNameById } from '../utils/projectHelpers.js';

/**
 * Render workflow view
 * @param {HTMLElement} containerEl - Container element to render into
 * @param {Object} state - Current app state
 * @param {Object} handlers - Event handlers (must include workflow operations)
 */
export async function renderWorkflow(containerEl, state, handlers) {
  const { tasks, projects, workflow } = state;
  const workflowUI = workflow?.ui || {};
  const activeProjectId = workflowUI.activeProjectId || 'all';
  
  // Attach state to handlers for use in render functions
  handlers._state = state;
  
  // Update project filter dropdown
  const filterEl = document.getElementById('wf-project-filter') ||
    document.getElementById('workflow-project-filter');
  if (filterEl) {
    const current = filterEl.value || activeProjectId;
    filterEl.innerHTML = '<option value="all">All Projects</option>';
    (projects || []).filter(p => !p.done).forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = p.name;
      filterEl.appendChild(opt);
    });
    filterEl.value = current;
    // Update handler
    filterEl.onchange = (e) => {
      if (handlers.setWorkflowProjectFilter) {
        handlers.setWorkflowProjectFilter(e.target.value);
      }
    };
  }
  
  // Get workflow data using selectors
  const workflowTasks = selectWorkflowTasks(state);
  const bottlenecks = selectBottlenecks(state);
  const activeFiles = selectActiveFiles(state);
  const tasksByLane = selectTasksByLaneAndColumn(state);
  
  // Render bottleneck strip
  renderBottleneckStrip(bottlenecks, handlers);
  
  // Render status
  renderStatus(workflowTasks);
  
  // Render lanes with new lane-based structure
  const laneOrder = workflow?.laneOrder || ["lab", "comp", "writing", "presentation"];
  for (const laneId of laneOrder) {
    await renderLane(laneId, tasksByLane[laneId] || {}, handlers);
  }
  
  // Render unassigned section
  await renderUnassignedSection(tasksByLane.unassigned || {}, workflowUI.showUnassigned, handlers);
  
  // Update toggle button state
  const toggleBtn = document.getElementById('unassigned-toggle');
  if (toggleBtn) {
    toggleBtn.textContent = workflowUI.showUnassigned ? '▲' : '▼';
  }
  
  // Render active files sidebar
  renderActiveFilesSidebar(activeFiles, workflowUI.showActiveFiles, handlers);
  
  // Wire up drag-drop handlers
  setupDragDrop(handlers);
}

/**
 * Render bottleneck strip
 */
function renderBottleneckStrip(bottlenecks, handlers) {
  const bottleneckEl = document.getElementById('workflow-bottlenecks');
  if (!bottleneckEl) return;
  
  const { blocked, stale, next } = bottlenecks;
  
  bottleneckEl.innerHTML = `
    <div id="bottleneck-blocked" data-action="workflow:scroll-bottleneck" data-bottleneck-type="blocked" role="button" tabindex="0" style="flex:1;padding:12px;background:${blocked.length > 0 ? 'var(--rose-pale)' : 'var(--bg2)'};border-radius:6px;border-left:3px solid var(--rose);cursor:pointer;">
      <div style="font-size:11px;color:var(--text-dim);margin-bottom:4px;letter-spacing:.05em;text-transform:uppercase;">BLOCKED</div>
      <div style="font-size:20px;font-weight:600;color:var(--text);">${blocked.length}</div>
      ${blocked.length > 0 ? `<div style="font-size:10px;color:var(--text-dim);margin-top:6px;line-height:1.4;">${blocked.slice(0, 3).map(t => esc(t.title || 'Untitled')).join(', ')}</div>` : '<div style="font-size:10px;color:var(--text-dim);margin-top:6px;">None</div>'}
      ${blocked.length > 0 ? '<button type="button" data-action="workflow:scroll-bottleneck" data-bottleneck-type="blocked" style="margin-top:8px;padding:4px 8px;background:var(--rose);color:white;border:none;border-radius:4px;font-size:10px;cursor:pointer;">View Blocked</button>' : ''}
    </div>
    <div id="bottleneck-stale" data-action="workflow:scroll-bottleneck" data-bottleneck-type="stale" role="button" tabindex="0" style="flex:1;padding:12px;background:${stale.length > 0 ? 'var(--sage-pale)' : 'var(--bg2)'};border-radius:6px;border-left:3px solid var(--sage);cursor:pointer;">
      <div style="font-size:11px;color:var(--text-dim);margin-bottom:4px;letter-spacing:.05em;text-transform:uppercase;">STALE (>7d)</div>
      <div style="font-size:20px;font-weight:600;color:var(--text);">${stale.length}</div>
      ${stale.length > 0 ? `<div style="font-size:10px;color:var(--text-dim);margin-top:6px;line-height:1.4;">${stale.slice(0, 3).map(t => esc(t.title || 'Untitled')).join(', ')}</div>` : '<div style="font-size:10px;color:var(--text-dim);margin-top:6px;">None</div>'}
      ${stale.length > 0 ? '<button type="button" data-action="workflow:scroll-bottleneck" data-bottleneck-type="stale" style="margin-top:8px;padding:4px 8px;background:var(--sage);color:white;border:none;border-radius:4px;font-size:10px;cursor:pointer;">Review Stale</button>' : ''}
    </div>
    <div id="bottleneck-next" data-action="workflow:scroll-bottleneck" data-bottleneck-type="next" role="button" tabindex="0" style="flex:1;padding:12px;background:${next.length > 0 ? 'var(--mauve-pale)' : 'var(--bg2)'};border-radius:6px;border-left:3px solid var(--mauve);cursor:pointer;">
      <div style="font-size:11px;color:var(--text-dim);margin-bottom:4px;letter-spacing:.05em;text-transform:uppercase;">NEXT UP</div>
      <div style="font-size:20px;font-weight:600;color:var(--text);">${next.length}</div>
      ${next.length > 0 ? `<div style="font-size:10px;color:var(--text-dim);margin-top:6px;line-height:1.4;">${next.slice(0, 3).map(t => esc(t.title || 'Untitled')).join(', ')}</div>` : '<div style="font-size:10px;color:var(--text-dim);margin-top:6px;">None</div>'}
      ${next.length > 0 ? '<button type="button" data-action="workflow:scroll-bottleneck" data-bottleneck-type="next" style="margin-top:8px;padding:4px 8px;background:var(--mauve);color:white;border:none;border-radius:4px;font-size:10px;cursor:pointer;">View Next</button>' : ''}
    </div>
  `;
}

/**
 * Render status message
 */
function renderStatus(workflowTasks) {
  const statusEl = document.getElementById('workflow-status');
  if (!statusEl) return;
  
  const totalTasks = workflowTasks.length;
  const assignedTasks = workflowTasks.filter(t => t.workflowLane && t.workflowLane !== 'unassigned').length;
  const unassignedTasks = totalTasks - assignedTasks;
  
  statusEl.innerHTML = `<div style="padding:8px 12px;background:var(--bg2);border-radius:6px;font-size:12px;color:var(--text-dim);">
    Total: ${totalTasks} tasks | Assigned: ${assignedTasks} | Unassigned: ${unassignedTasks}
  </div>`;
}

/**
 * Categorize tasks into queue sections
 */
function categorizeTasksForQueue(tasks) {
  const now = Date.now();
  const twoDaysAgo = now - (48 * 60 * 60 * 1000);
  
  const active = [];
  const done = [];
  
  // Separate done tasks
  for (const task of tasks) {
    if (task.done) {
      done.push(task);
    } else {
      active.push(task);
    }
  }
  
  // Sort all active tasks by priority + due date
  const sortedActive = sortTasksForColumn(active);
  
  // Next: top 3-5 tasks
  const nextTasks = sortedActive.slice(0, 5);
  const nextIds = new Set(nextTasks.map(t => t.id));
  
  // Remaining tasks (not in Next)
  const remaining = sortedActive.filter(t => !nextIds.has(t.id));
  
  // Categorize remaining tasks
  const scheduled = [];
  const later = [];
  
  for (const task of remaining) {
    // Check if has due date (scheduled)
    const hasDueDate = task.due && task.due.trim() !== '';
    
    if (hasDueDate) {
      scheduled.push(task);
    } else {
      later.push(task);
    }
  }
  
  return {
    next: nextTasks,
    scheduled: scheduled,
    later: later,
    done: sortTasksForColumn(done)
  };
}

/**
 * Render a single lane with queue sections
 */
async function renderLane(laneId, tasksByColumn, handlers) {
  const allTasksForBlocking = getAllTasks(handlers._state?.tasks || [], handlers._state?.projects || []);
  
  // Get all tasks for this lane (combine all columns)
  const allTasks = [];
  Object.values(tasksByColumn).forEach(columnTasks => {
    allTasks.push(...(columnTasks || []));
  });
  
  // Categorize into queue sections
  const categorized = categorizeTasksForQueue(allTasks);
  
  // Update lane meta
  const metaEl = document.getElementById(`wf-${laneId}-meta`);
  if (metaEl) {
    const total = categorized.next.length + categorized.scheduled.length + 
                  categorized.later.length + categorized.done.length;
    metaEl.textContent = `${total} tasks`;
  }
  
  // Render into containers
  const nextEl = document.getElementById(`wf-${laneId}-next`);
  if (nextEl) {
    nextEl.innerHTML = categorized.next.map(t => renderTaskCard(t, handlers, allTasksForBlocking)).join('');
  }
  
  const scheduledEl = document.getElementById(`wf-${laneId}-scheduled`);
  if (scheduledEl) {
    scheduledEl.innerHTML = categorized.scheduled.map(t => renderTaskCard(t, handlers, allTasksForBlocking)).join('');
  }
  
  const laterEl = document.getElementById(`wf-${laneId}-later`);
  if (laterEl) {
    laterEl.innerHTML = categorized.later.map(t => renderTaskCard(t, handlers, allTasksForBlocking)).join('');
  }
  
  const doneEl = document.getElementById(`wf-${laneId}-done`);
  if (doneEl) {
    doneEl.innerHTML = categorized.done.map(t => renderTaskCard(t, handlers, allTasksForBlocking)).join('');
  }
}

/**
 * Render unassigned section
 */
async function renderUnassignedSection(tasksByColumn, showUnassigned, handlers) {
  const unassignedBodyEl = document.getElementById('wf-unassigned-body');
  if (!unassignedBodyEl) return;
  
  unassignedBodyEl.style.display = showUnassigned ? 'block' : 'none';
  
  if (!showUnassigned) return;
  
  const allTasksForBlocking = getAllTasks(handlers._state?.tasks || [], handlers._state?.projects || []);
  
  // Get all unassigned tasks (combine all columns)
  const allTasks = [];
  Object.values(tasksByColumn).forEach(columnTasks => {
    allTasks.push(...(columnTasks || []));
  });
  
  // Categorize into queue sections
  const categorized = categorizeTasksForQueue(allTasks);
  
  // Render into containers
  const nextEl = document.getElementById('wf-unassigned-next');
  if (nextEl) {
    nextEl.innerHTML = categorized.next.map(t => renderTaskCard(t, handlers, allTasksForBlocking)).join('');
  }
  
  const scheduledEl = document.getElementById('wf-unassigned-scheduled');
  if (scheduledEl) {
    scheduledEl.innerHTML = categorized.scheduled.map(t => renderTaskCard(t, handlers, allTasksForBlocking)).join('');
  }
  
  const laterEl = document.getElementById('wf-unassigned-later');
  if (laterEl) {
    laterEl.innerHTML = categorized.later.map(t => renderTaskCard(t, handlers, allTasksForBlocking)).join('');
  }
  
  const doneEl = document.getElementById('wf-unassigned-done');
  if (doneEl) {
    doneEl.innerHTML = categorized.done.map(t => renderTaskCard(t, handlers, allTasksForBlocking)).join('');
  }
}

/**
 * Render a single task card
 */
function renderTaskCard(task, handlers, allTasksForBlocking = []) {
  // Check if task is blocked (needs full tasks array)
  const blocked = task.done ? false : isTaskBlocked(task, allTasksForBlocking);
  const projectName = task.projectId && handlers._state?.projects 
    ? projectNameById(handlers._state.projects, task.projectId) 
    : null;
  
  // Format due date and add calendar icon for scheduled tasks
  let dueHtml = '';
  let calendarIcon = '';
  if (task.due && task.due.trim() !== '') {
    const dueDate = new Date(task.due);
    const now = new Date();
    const diffDays = Math.floor((dueDate - now) / (1000 * 60 * 60 * 24));
    let dueClass = '';
    let dueText = '';
    if (diffDays < 0) {
      dueClass = 'overdue';
      dueText = `${Math.abs(diffDays)}d overdue`;
    } else if (diffDays === 0) {
      dueClass = 'soon';
      dueText = 'Today';
    } else if (diffDays <= 3) {
      dueClass = 'soon';
      dueText = `${diffDays}d`;
    } else {
      dueText = `${diffDays}d`;
    }
    calendarIcon = '🗓 ';
    dueHtml = `<span class="due-tag ${dueClass}" style="font-size:10px;padding:2px 6px;background:var(--bg2);border-radius:4px;">${calendarIcon}${esc(dueText)}</span>`;
  }
  
  // Files
  let filesHtml = '';
  if (task.files && task.files.length > 0) {
    const fileChips = task.files.slice(0, 3).map(f => {
      const fileObj = typeof f === 'string' ? { abs_path: f, name: f.split(/[/\\]/).pop() } : f;
      const label = fileObj.label || fileObj.name || 'File';
      const icon = fileIcon(fileObj.abs_path || fileObj.onedrive_rel || fileObj.share_url || '');
      return `<a href="#" class="file-chip" data-action="file:open" data-path="${escAttr(JSON.stringify(fileObj))}" style="font-size:9px;padding:2px 4px;background:var(--surface);border:1px solid var(--border);border-radius:4px;text-decoration:none;color:var(--text-dim);display:inline-block;margin-right:4px;">${icon} ${esc(label)}</a>`;
    }).join('');
    filesHtml = `<div style="margin-top:6px;">${fileChips}</div>`;
  }
  
  return `
    <div class="task-card workflow-task-card ${task.done ? 'done' : ''} ${blocked ? 'blocked' : ''}" 
         data-task-id="${task.id}" 
         data-lane="${task.workflowLane || 'unassigned'}" 
         data-column="${task.workflowColumn || 'Backlog'}"
         draggable="true"
         style="cursor:move;${blocked ? 'border-left:3px solid var(--overdue);opacity:0.8;' : ''}${task.done ? 'opacity:0.6;' : ''}">
      <div style="display:flex;align-items:flex-start;gap:8px;">
        <button type="button" class="check-box ${task.done ? 'checked' : ''}"
             data-action="task:toggle" data-task-id="${task.id}"
             onclick="event.stopPropagation()"
             style="width:16px;height:16px;border:1.5px solid var(--border2);border-radius:50%;cursor:pointer;flex-shrink:0;margin-top:2px;background:var(--surface);transition:all .15s;padding:0;${task.done ? 'background:var(--gradient-accent);border-color:var(--rose);' : ''}"
             title="Toggle task"></button>
        <div style="flex:1;min-width:0;">
          <div style="font-size:13px;font-weight:500;color:var(--text);line-height:1.4;margin-bottom:4px;">${esc(task.title || 'Untitled')}</div>
          <div style="display:flex;flex-wrap:wrap;gap:4px;align-items:center;margin-bottom:4px;">
            ${projectName ? `<span class="due-tag" style="font-size:9px;padding:2px 6px;background:var(--bg2);border-radius:4px;">${esc(projectName)}</span>` : ''}
            <span class="priority-tag ${task.priority}" style="font-size:9px;padding:2px 6px;background:var(--${task.priority === 'high' ? 'rose' : task.priority === 'medium' ? 'mauve' : 'sage'}-pale);color:var(--${task.priority === 'high' ? 'rose' : task.priority === 'medium' ? 'mauve' : 'sage'});border-radius:4px;">${esc(task.priority || 'medium')}</span>
            ${dueHtml}
          </div>
          ${blocked ? `<div style="font-size:9px;color:var(--overdue);margin-top:4px;">🔒 Blocked</div>` : ''}
          ${filesHtml}
          <div style="margin-top:6px;display:flex;gap:4px;">
            <button onclick="event.stopPropagation();if(window.Petal?.handlers?.openTaskDrawer){window.Petal.handlers.openTaskDrawer(${task.id})}" 
                    style="padding:2px 6px;background:var(--bg2);border:1px solid var(--border);border-radius:4px;font-size:9px;cursor:pointer;color:var(--text-dim);">📝</button>
            <button onclick="event.stopPropagation();if(window.Petal?.handlers?.quickAssignToLane){window.Petal.handlers.quickAssignToLane(${task.id})}" 
                    style="padding:2px 6px;background:var(--bg2);border:1px solid var(--border);border-radius:4px;font-size:9px;cursor:pointer;color:var(--text-dim);">⚡</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Sort tasks for a column
 */
function sortTasksForColumn(tasks) {
  return [...tasks].sort((a, b) => {
    // Done tasks at bottom
    if (a.done && !b.done) return 1;
    if (!a.done && b.done) return -1;
    
    // Priority (high = 3, medium = 2, low = 1)
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    const aPriority = priorityOrder[a.priority] || 2;
    const bPriority = priorityOrder[b.priority] || 2;
    if (aPriority !== bPriority) return bPriority - aPriority;
    
    // Due date
    const aDue = a.due ? new Date(a.due).getTime() : Infinity;
    const bDue = b.due ? new Date(b.due).getTime() : Infinity;
    return aDue - bDue;
  });
}

/**
 * Render active files sidebar
 */
function renderActiveFilesSidebar(activeFiles, showActiveFiles, handlers) {
  const sidebarEl = document.getElementById('workflow-active-files');
  if (!sidebarEl) return;
  
  const rightPos = showActiveFiles ? '0px' : '-300px';
  sidebarEl.style.right = rightPos;
  
  const filesHtml = activeFiles.length > 0 
    ? activeFiles.map(file => {
        const label = file.label || file.name || 'File';
        const icon = fileIcon(file.abs_path || file.onedrive_rel || file.share_url || '');
        return `
          <div style="padding:8px;background:var(--bg2);border-radius:6px;margin-bottom:8px;display:flex;align-items:center;justify-content:space-between;">
            <div style="flex:1;min-width:0;">
              <div style="font-size:12px;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${icon} ${esc(label)}</div>
              ${file.taskIds && file.taskIds.length > 0 ? `<div style="font-size:9px;color:var(--text-dim);margin-top:2px;">${file.taskIds.length} task${file.taskIds.length > 1 ? 's' : ''}</div>` : ''}
            </div>
            <button type="button" class="file-open-btn" data-action="file:open" data-path="${escAttr(JSON.stringify(file))}" 
                    style="padding:4px 8px;background:var(--rose);color:white;border:none;border-radius:4px;font-size:10px;cursor:pointer;margin-left:8px;">Open</button>
          </div>
        `;
      }).join('')
    : '<div style="padding:20px;text-align:center;color:var(--text-dim);font-size:12px;">No active files</div>';
  
  sidebarEl.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
      <h3 style="font-size:16px;font-weight:500;margin:0;">Active Files</h3>
      <button onclick="if(window.Petal?.handlers?.toggleActiveFilesPanel){window.Petal.handlers.toggleActiveFilesPanel()}" 
              style="background:none;border:none;font-size:20px;cursor:pointer;color:var(--text-dim);">×</button>
    </div>
    <div id="active-files-list">${filesHtml}</div>
  `;
}

/**
 * Setup drag-drop handlers
 */
function setupDragDrop(handlers) {
  // Remove old listeners
  document.querySelectorAll('.workflow-task-card').forEach(card => {
    card.ondragstart = null;
    card.ondragend = null;
  });
  
  document.querySelectorAll('.wf-cards').forEach(container => {
    container.ondragover = null;
    container.ondragleave = null;
    container.ondrop = null;
  });
  
  // Add new listeners for task cards
  document.querySelectorAll('.workflow-task-card').forEach(card => {
    card.ondragstart = (e) => {
      e.dataTransfer.setData('text/plain', card.dataset.taskId);
      card.style.opacity = '0.5';
    };
    
    card.ondragend = () => {
      card.style.opacity = '';
    };
  });
  
  // Add drop zones for status buckets
  document.querySelectorAll('.wf-cards').forEach(container => {
    container.ondragover = (e) => {
      e.preventDefault();
      container.style.background = 'var(--rose-pale)';
    };
    
    container.ondragleave = () => {
      container.style.background = '';
    };
    
    container.ondrop = (e) => {
      e.preventDefault();
      container.style.background = '';
      
      const taskId = parseInt(e.dataTransfer.getData('text/plain'));
      if (!taskId || !handlers.moveTask) return;
      
      // Determine lane and section from container ID
      const containerId = container.id;
      const match = containerId.match(/wf-(\w+)-(next|scheduled|later|done)/);
      if (!match) return;
      
      const lane = match[1];
      const section = match[2];
      
      // Map section to column name (for backward compatibility with existing workflow system)
      const columnMap = {
        'next': 'Next',
        'scheduled': 'Next', // Scheduled tasks go to Next column
        'later': 'Backlog', // Later tasks go to Backlog
        'done': 'Done'
      };
      
      const columnName = columnMap[section] || 'Next';
      handlers.moveTask(taskId, lane === 'unassigned' ? null : lane, columnName);
    };
  });
}

// Global helper for scrolling to bottlenecks (delegates to WorkflowPage list view)
if (typeof window !== 'undefined') {
  window.scrollToBottleneck = function(type) {
    if (typeof window.scrollToWorkflowBottleneck === 'function') {
      window.scrollToWorkflowBottleneck(type);
      return;
    }
    let containers = [];
    
    if (type === 'blocked') {
      // Blocked tasks are in Later section (or could be in Scheduled if they have due dates)
      // Try Later first, then Scheduled
      containers = document.querySelectorAll('.wf-cards[id$="-later"]');
      if (containers.length === 0) {
        containers = document.querySelectorAll('.wf-cards[id$="-scheduled"]');
      }
    } else if (type === 'stale') {
      // Stale tasks could be in Scheduled or Later
      // Try Scheduled first, then Later
      containers = document.querySelectorAll('.wf-cards[id$="-scheduled"]');
      if (containers.length === 0) {
        containers = document.querySelectorAll('.wf-cards[id$="-later"]');
      }
    } else if (type === 'next') {
      // Next tasks are in Next section
      containers = document.querySelectorAll('.wf-cards[id$="-next"]');
    }
    
    if (containers.length > 0) {
      // Scroll to the first matching container
      containers[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      // Also expand the lane if it's collapsed
      const container = containers[0];
      const laneBody = container.closest('.wf-lane-body');
      if (laneBody && laneBody.style.display === 'none') {
        const laneId = container.id.match(/wf-(\w+)-/)?.[1];
        if (laneId) {
          window.toggleLane(laneId);
        }
      }
    }
  };
  
  // Toggle lane collapse
  window.toggleLane = function(laneId) {
    const bodyEl = document.getElementById(`wf-${laneId}-body`);
    const headEl = document.querySelector(`#wf-${laneId}-meta`)?.closest('.wf-lane-head');
    if (!bodyEl || !headEl) return;
    
    const btnEl = headEl.querySelector('.wf-collapse');
    if (!btnEl) return;
    
    const isHidden = bodyEl.style.display === 'none';
    bodyEl.style.display = isHidden ? 'block' : 'none';
    btnEl.textContent = isHidden ? 'Hide' : 'Show';
  };
  
  // Toggle done section
  window.toggleDone = function(laneId) {
    const doneEl = document.getElementById(`wf-${laneId}-done`);
    if (!doneEl) return;
    
    const groupEl = doneEl.closest('.wf-group');
    if (!groupEl) return;
    
    const titleEl = groupEl.querySelector('.wf-group-title');
    if (!titleEl) return;
    
    const isHidden = doneEl.style.display === 'none';
    doneEl.style.display = isHidden ? 'block' : 'none';
    titleEl.textContent = isHidden ? 'Done ▴' : 'Done ▾';
  };
}
