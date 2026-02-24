// ═══════════════════════ RENDER TASKS ═══════════════════════
// Pure rendering function for tasks view
// Takes state and handlers as parameters - no store peeking
console.log("✅ renderTasks.js LOADED — EDITBTN TEST 2026-02-21");

import { esc } from '../utils/strings.js';
import { today, parseDate, dueLabel } from '../utils/dates.js';
import { getAllTasks } from '../domain/models.js';

/**
 * Render tasks view
 * @param {HTMLElement} containerEl - Container element to render into
 * @param {Object} state - Current app state
 * @param {Object} handlers - Event handlers
 */
export async function renderTasks(containerEl, state, handlers) {
  const { tasks, projects, currentFilter, currentSort, searchQuery, taskMode, boardProjectFilter } = state;
  
  // Phase 3 Fix: Move side effect to handlers (keeps render deterministic)
  // Refresh project selects via handler if provided, otherwise skip (don't call global)
  if (handlers?.refreshProjectSelects) {
    handlers.refreshProjectSelects();
  }
  
  // Update UI based on task mode
  const boardFilterEl = document.getElementById('board-project-filter');
  if (boardFilterEl) boardFilterEl.style.display = taskMode === 'kanban' ? '' : 'none';
  const filterGroup = document.querySelector('#view-tasks .filter-group');
  if (filterGroup) filterGroup.style.display = taskMode === 'kanban' ? 'none' : '';
  const sortGroup = document.querySelector('#view-tasks .sort-group');
  if (sortGroup) sortGroup.style.display = taskMode === 'kanban' ? 'none' : '';
  const taskContainer = document.getElementById('task-container');
  if (taskContainer) taskContainer.style.display = taskMode === 'list' ? '' : 'none';
  const kanbanContainer = document.getElementById('kanban-container');
  if (kanbanContainer) kanbanContainer.style.display = taskMode === 'kanban' ? '' : 'none';
  
  // Populate task project filter dropdown (visible in list mode)
  const taskProjectFilterEl = document.getElementById('task-project-filter');
  if (taskProjectFilterEl) {
    const currentValue = taskProjectFilterEl.value || boardProjectFilter || 'all';
    taskProjectFilterEl.innerHTML = '<option value="all">All projects</option>';
    (projects || []).filter(p => !p.done).forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = esc(p.name || 'Untitled Project');
      taskProjectFilterEl.appendChild(opt);
    });
    taskProjectFilterEl.value = currentValue;
    // Show in list mode, hide in kanban mode
    const selectorContainer = taskProjectFilterEl.closest('.task-project-selector');
    if (selectorContainer) {
      selectorContainer.style.display = taskMode === 'list' ? '' : 'none';
    }
  }
  
  if (taskMode === 'kanban') {
    // Kanban rendering would go here
    // For now, fall back to list view
    return renderTaskList(containerEl, state, handlers);
  }
  
  return renderTaskList(containerEl, state, handlers);
}

/**
 * Render task list
 * @param {HTMLElement} containerEl - Container element
 * @param {Object} state - Current app state
 * @param {Object} handlers - Event handlers
 */
async function renderTaskList(containerEl, state, handlers) {
  const { tasks, projects, currentFilter, currentSort, searchQuery, boardProjectFilter } = state;
  
  console.log('🔍 DEBUG renderTaskList:', {
    tasksCount: tasks?.length || 0,
    projectsCount: projects?.length || 0,
    currentFilter,
    currentSort,
    searchQuery,
    containerEl: !!containerEl
  });
  
  // Find task-container inside the provided container, or use it directly if it's task-container
  let c = null;
  if (containerEl) {
    // If containerEl is task-container itself, use it
    if (containerEl.id === 'task-container') {
      c = containerEl;
    } else {
      // Otherwise, look for task-container inside it
      c = containerEl.querySelector('#task-container') || containerEl.querySelector('.task-container');
    }
  }
  
  // Fallback: find by ID
  if (!c) {
    c = document.getElementById('task-container');
  }
  
  if (!c) {
    console.error('❌ ERROR: task-container element not found!');
    return;
  }
  
  // Diagnostic: Check if container is visible and clickable
  const computedStyle = window.getComputedStyle(c);
  console.log('🔍 task-container diagnostics:', {
    display: computedStyle.display,
    visibility: computedStyle.visibility,
    pointerEvents: computedStyle.pointerEvents,
    opacity: computedStyle.opacity,
    hasContent: c.innerHTML.length > 0,
  });
  
  // Get all tasks including project tasks
  const allTasks = getAllTasks(tasks || [], projects || []);
  
  // ═══════════════════════ DEBUG: allTasks breakdown ═══════════════════════
  // Phase 3 Debug: Identify source of task count mismatch
  const id = (t) => t.id || t.taskId || t.uuid || '(no-id)';
  const src = (t) => {
    if (t.isSubtask) return 'project-subtask';
    if (t.projectId) return 'tasks-array-with-project';
    return 'tasks-array-standalone';
  };
  
  const storeTasks = tasks || [];
  const projectSubtasks = (projects || []).flatMap(p => (p.subtasks || []).map(st => ({
    ...st,
    projectId: p.id,
    isSubtask: true
  })));
  
  const duplicates = (() => {
    const seen = new Set();
    const dups = [];
    for (const t of allTasks) {
      const k = id(t);
      if (seen.has(k)) dups.push(k);
      else seen.add(k);
    }
    return dups;
  })();
  
  console.log('🔍 DEBUG allTasks breakdown:', {
    storeTasksCount: storeTasks.length,
    storeTaskIds: storeTasks.map(id),
    projectSubtasksCount: projectSubtasks.length,
    projectSubtaskIds: projectSubtasks.map(id),
    allTasksCount: allTasks.length,
    allTaskIds: allTasks.map(id),
    duplicates: duplicates.length > 0 ? duplicates : 'none',
    sample: allTasks.slice(0, 5).map(t => ({
      id: id(t),
      title: t.title || t.name || '(no title)',
      projectId: t.projectId,
      isSubtask: t.isSubtask || false,
      src: src(t),
    })),
  });
  
  console.log('🔍 DEBUG: allTasks count:', allTasks.length);
  
  // Filter tasks
  let list = allTasks.filter(t => {
    if (t.deletedAt) return false;
    // Exclude subtasks (tasks with parentTaskId) from main task list
    // Subtasks should only appear in their parent task's subtask section
    if (t.parentTaskId) return false;
    if (currentFilter === 'active' && t.done) return false;
    if (currentFilter === 'done' && !t.done) return false;
    
    // Project filter
    if (boardProjectFilter && boardProjectFilter !== 'all') {
      const filterId = String(boardProjectFilter);
      const taskProjectId = t.projectId ? String(t.projectId) : '';
      if (taskProjectId !== filterId) return false;
    }
    
    // Search filter
    if (searchQuery && searchQuery.trim()) {
      if (!matchesSearch(t, searchQuery)) return false;
    }
    
    return true;
  });
  
  // Sort tasks
  if (currentSort === 'due') {
    list.sort((a, b) => {
      const aDue = a.due ? parseDate(a.due) : null;
      const bDue = b.due ? parseDate(b.due) : null;
      if (!aDue && !bDue) return 0;
      if (!aDue) return 1;
      if (!bDue) return -1;
      return aDue - bDue;
    });
  } else if (currentSort === 'priority') {
    list.sort((a, b) => {
      const aPriority = a.priority || 2;
      const bPriority = b.priority || 2;
      return bPriority - aPriority;
    });
  } else {
    // Default: by ID (creation time)
    list.sort((a, b) => (b.id || 0) - (a.id || 0));
  }
  
  // Render
  console.log('🔍 DEBUG: Filtered list count:', list.length);
  if (!list.length) {
    console.warn('⚠️ WARNING: No tasks to render after filtering');
    c.innerHTML = '<div class="empty-state">No tasks yet<small>Add a task above to get started</small></div>';
    return;
  }
  
  console.log('🔍 DEBUG: Rendering', list.length, 'tasks');
  c.innerHTML = list.map(t => renderTaskItem(t, state)).join('');
  
  // Re-hydrate Lucide icons after innerHTML (fixes "halo" issue)
  if (window.lucide?.createIcons) {
    window.lucide.createIcons();
  }
  
  // NOTE: Event delegation is handled by TasksPage.js, not here.
  // This keeps authority in one place and prevents duplicate handlers.
  // TasksPage installs delegation on the container (#view-tasks),
  // which will catch all clicks including those in the task list.
}

/**
 * Render a single task item
 * Phase 3 Fix: Uses task-card CSS classes to match design system
 * @param {Object} task - Task object
 * @param {Object} state - Current app state
 */
function renderTaskItem(task, state) {
  // Debug: Log when rendering task item (to confirm new code is running)
  console.log('🔍 renderTaskItem called for task:', task.id, 'with 3 buttons (Drawer 📝, Edit ✎, Delete ✕)');
  
  const { projects } = state;
  const dl = dueLabel(task.due, true);
  const project = (projects || []).find(p => String(p.id) === String(task.projectId));
  const projectName = project?.name || '';
  const projectColor = project ? `var(--proj-${project.color})` : '';
  
  const priorityClass = task.priority === 3 ? 'high' : task.priority === 1 ? 'low' : 'medium';
  const dueClass = dl?.class || '';
  const dueText = dl?.label || '';
  
  return `<div class="task-card ${task.done ? 'done' : ''}" data-id="${task.id}" data-priority="${priorityClass}">
    <div class="task-top">
      <div class="task-content">
        <button type="button" class="check-box ${task.done ? 'checked' : ''}"
             data-action="task:toggle" data-task-id="${task.id}" style="background:none;border:none;padding:0;cursor:pointer;" title="Toggle task"></button>
        
        <div class="task-body">
          <div class="task-title">
            ${esc(task.title || '')}
            ${projectName ? `<span class="tag-chip">${esc(projectName)}</span>` : ''}
            ${(task.tags || []).map(tag => 
              `<span class="tag-chip" data-tag="${esc(tag)}">${esc(tag)}</span>`
            ).join('')}
          </div>
          
          <div class="task-meta-row">
            <span class="priority-tag ${priorityClass}">${priorityClass}</span>
            ${dueText ? `<span class="due-tag ${dueClass}">${esc(dueText)}</span>` : ''}
          </div>
          
          ${task.notes ? `<div class="task-notes">${esc(task.notes)}</div>` : ''}
        </div>
      </div>
      
      <div class="task-actions" style="display:flex;gap:4px;align-items:center;">
        <button class="btn-del" data-action="task:open-drawer" data-task-id="${String(task.id)}" title="Open drawer (Notes, Files, Subtasks)" style="font-size:13px;line-height:1;min-width:28px;min-height:28px;color:var(--text-dim);">📝</button>
        <button class="btn-del btn-edit" data-action="edit-task" data-task-id="${String(task.id)}" title="Edit" style="font-size:13px;line-height:1;min-width:28px;min-height:28px;color:var(--text-dim);">✎</button>
        <button class="btn-del btn-delete" data-action="delete" data-id="${String(task.id)}" data-task-id="${String(task.id)}" data-is-subtask="false" data-project-id="${task.projectId || ''}" title="Delete" style="font-size:16px;line-height:1;min-width:28px;min-height:28px;color:var(--text-dim);cursor:pointer;display:flex;align-items:center;justify-content:center;font-weight:bold;opacity:1;">×</button>
      </div>
    </div>
  </div>`;
}

/**
 * Check if task matches search query
 */
function matchesSearch(task, query) {
  if (!query || !query.trim()) return true;
  const searchTerm = query.toLowerCase().trim();
  const titleMatch = task.title?.toLowerCase().includes(searchTerm);
  const notesMatch = task.notes?.toLowerCase().includes(searchTerm);
  return titleMatch || notesMatch;
}
