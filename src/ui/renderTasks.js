// ═══════════════════════ RENDER TASKS ═══════════════════════
// Pure rendering function for tasks view
// Takes state and handlers as parameters - no store peeking

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
  
  // Refresh project selects (this is a side effect, but needed for UI)
  if (typeof refreshProjectSelects === 'function') {
    refreshProjectSelects();
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
  
  const c = containerEl || document.getElementById('task-container');
  if (!c) {
    console.error('❌ ERROR: task-container element not found!');
    return;
  }
  
  // Get all tasks including project tasks
  const allTasks = getAllTasks(tasks || [], projects || []);
  console.log('🔍 DEBUG: allTasks count:', allTasks.length);
  
  // Filter tasks
  let list = allTasks.filter(t => {
    if (t.deletedAt) return false;
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
}

/**
 * Render a single task item
 * @param {Object} task - Task object
 * @param {Object} state - Current app state
 */
function renderTaskItem(task, state) {
  const { projects } = state;
  const dl = dueLabel(task.due, true);
  const project = projects.find(p => String(p.id) === String(task.projectId));
  const projectName = project ? project.name : '';
  const projectColor = project ? `var(--proj-${project.color})` : '';
  
  const priorityClass = task.priority === 3 ? 'high' : task.priority === 1 ? 'low' : 'medium';
  const statusClass = task.status?.toLowerCase() || 'todo';
  
  return `<div class="task-item ${task.done ? 'done' : ''}" data-id="${task.id}">
    <input type="checkbox" ${task.done ? 'checked' : ''} 
           onclick="window.Petal?.features?.taskOperations?.toggleTask(${task.id})"
           style="margin-right:12px;">
    <div class="task-content" style="flex:1;">
      <div class="task-title" style="display:flex;align-items:center;gap:8px;">
        <span>${esc(task.title || '')}</span>
        ${task.tags && task.tags.length > 0 ? task.tags.map(tag => 
          `<span class="tag-chip" style="font-size:10px;padding:2px 6px;background:var(--bg2);border-radius:4px;">${esc(tag)}</span>`
        ).join('') : ''}
        ${projectName ? `<span class="project-badge" style="background:${projectColor};color:white;padding:2px 6px;border-radius:4px;font-size:10px;">${esc(projectName)}</span>` : ''}
      </div>
      ${task.notes ? `<div class="task-notes" style="font-size:12px;color:var(--text-dim);margin-top:4px;">${esc(task.notes)}</div>` : ''}
      <div class="task-meta" style="display:flex;gap:8px;margin-top:8px;font-size:11px;color:var(--text-dim);">
        ${dl ? `<span class="due-date ${dl.class}">${dl.label}</span>` : ''}
        <span class="priority ${priorityClass}">${priorityClass}</span>
        <span class="status ${statusClass}">${task.status || 'Todo'}</span>
      </div>
    </div>
    <button onclick="window.Petal?.features?.taskOperations?.editTask(${task.id})" 
            class="btn-edit" style="padding:4px 8px;font-size:11px;">Edit</button>
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
