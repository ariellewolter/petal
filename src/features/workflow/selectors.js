// ═══════════════════════ WORKFLOW SELECTORS ═══════════════════════
// Pure selector functions - no side effects, no store writes
// Takes state as input, returns derived/computed data

import { getAllTasks, isTaskBlocked } from '../../domain/models.js';

/**
 * Get workflow tasks decorated with lane/column placement
 * @param {Object} state - App state
 * @returns {Array} Tasks with workflow metadata
 */
export function selectWorkflowTasks(state) {
  const { tasks, projects, workflow } = state;
  const allTasks = getAllTasks(tasks || [], projects || []);
  const { placement, ui } = workflow || {};
  const projectFilter = ui?.activeProjectId || 'all';
  
  // Filter by project if needed
  let filteredTasks = allTasks;
  if (projectFilter !== 'all') {
    const projectIdNum = parseInt(projectFilter);
    filteredTasks = allTasks.filter(t => {
      const taskProjectId = t.projectId ? (typeof t.projectId === 'number' ? t.projectId : parseInt(t.projectId)) : null;
      return taskProjectId === projectIdNum;
    });
  }
  
  // Decorate tasks with workflow placement
  return filteredTasks.map(task => {
    const placementData = placement?.[task.id] || {};
    const lane = placementData.lane || task.lane || null;
    const column = placementData.column || getDefaultColumn(task);
    
    return {
      ...task,
      workflowLane: lane,
      workflowColumn: column,
      // Keep original lane/stage for backward compatibility
      _originalLane: task.lane,
      _originalStage: task.stage
    };
  });
}

/**
 * Get default column for a task based on its status/done state
 */
function getDefaultColumn(task) {
  if (task.done) return 'Done';
  if (isTaskBlocked(task, [])) return 'Blocked'; // Will be recalculated with full tasks array
  if (task.status === 'Doing') return 'Doing';
  if (task.status === 'Todo' || task.status === 'Backlog') return 'Backlog';
  return 'Next';
}

/**
 * Select bottlenecks (blocked, stale, next)
 * @param {Object} state - App state
 * @returns {Object} { blocked, stale, next }
 */
export function selectBottlenecks(state) {
  const workflowTasks = selectWorkflowTasks(state);
  const allTasks = getAllTasks(state.tasks || [], state.projects || []);
  
  // Blocked: tasks with #blocked or #waiting tags, or actually blocked (dependency not done)
  const blocked = workflowTasks.filter(t => {
    if (t.done) return false;
    
    // Check if has blocked/waiting tag
    const hasBlockedTag = (t.tags || []).some(tag => 
      tag.toLowerCase() === '#blocked' || tag.toLowerCase() === '#waiting'
    );
    
    // Check if actually blocked (dependency not done)
    const isActuallyBlocked = isTaskBlocked(t, allTasks);
    
    return hasBlockedTag || isActuallyBlocked;
  });
  
  // Stale: tasks that were updated > 7 days ago (regardless of column)
  const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
  const stale = workflowTasks.filter(t => {
    if (t.done) return false;
    
    // Use updatedAt, lastTouchedAt, or fall back to id (timestamp)
    const taskDate = t.updatedAt || t.lastTouchedAt || (t.id ? new Date(t.id) : null);
    if (!taskDate) return false;
    const taskTimestamp = taskDate instanceof Date ? taskDate.getTime() : new Date(taskDate).getTime();
    return taskTimestamp < sevenDaysAgo;
  });
  
  // Next: top 3-5 tasks by priority + due date (matches what shows in Next section)
  const nextTasks = workflowTasks
    .filter(t => !t.done)
    .sort((a, b) => {
      // Priority first (high = 3, medium = 2, low = 1)
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const aPriority = priorityOrder[a.priority] || 2;
      const bPriority = priorityOrder[b.priority] || 2;
      if (aPriority !== bPriority) return bPriority - aPriority;
      
      // Then by due date
      const aDue = a.due ? new Date(a.due).getTime() : Infinity;
      const bDue = b.due ? new Date(b.due).getTime() : Infinity;
      return aDue - bDue;
    })
    .slice(0, 5);
  
  return {
    blocked,
    stale,
    next: nextTasks
  };
}

/**
 * Select active files (files from tasks in Doing/Next columns)
 * @param {Object} state - App state
 * @returns {Array} File objects with metadata
 */
export function selectActiveFiles(state) {
  const workflowTasks = selectWorkflowTasks(state);
  const activeTasks = workflowTasks.filter(t => 
    !t.done && (t.workflowColumn === 'Doing' || t.workflowColumn === 'Next')
  );
  
  const fileMap = new Map();
  
  activeTasks.forEach(task => {
    if (!task.files || !Array.isArray(task.files)) return;
    
    task.files.forEach(fileRef => {
      // Handle both string paths and file objects
      const fileObj = typeof fileRef === 'string' 
        ? { abs_path: fileRef, name: fileRef.split(/[/\\]/).pop() }
        : fileRef;
      
      // Create stable key for deduplication
      const key = fileObj.abs_path || fileObj.onedrive_rel || fileObj.share_url || fileObj.name || JSON.stringify(fileObj);
      
      if (!fileMap.has(key)) {
        fileMap.set(key, {
          ...fileObj,
          label: fileObj.label || fileObj.name || 'File',
          taskIds: []
        });
      }
      
      // Track which tasks reference this file
      const file = fileMap.get(key);
      if (!file.taskIds.includes(task.id)) {
        file.taskIds.push(task.id);
      }
    });
  });
  
  // Also include recent files from fileHistory if available
  if (state.fileHistory && typeof state.fileHistory === 'object') {
    const recentFiles = Object.entries(state.fileHistory)
      .sort((a, b) => (b[1]?.lastAccessed || 0) - (a[1]?.lastAccessed || 0))
      .slice(0, 5)
      .map(([path, data]) => ({
        abs_path: path,
        label: data.name || path.split(/[/\\]/).pop(),
        taskIds: [],
        isRecent: true
      }));
    
    recentFiles.forEach(file => {
      const key = file.abs_path;
      if (!fileMap.has(key)) {
        fileMap.set(key, file);
      }
    });
  }
  
  return Array.from(fileMap.values());
}

/**
 * Get tasks grouped by lane and column
 * @param {Object} state - App state
 * @returns {Object} { [lane]: { [column]: [tasks] } }
 */
export function selectTasksByLaneAndColumn(state) {
  const workflowTasks = selectWorkflowTasks(state);
  const { workflow } = state;
  const columns = workflow?.columns || {};
  
  const grouped = {};
  
  workflowTasks.forEach(task => {
    const lane = task.workflowLane || 'unassigned';
    const column = task.workflowColumn || 'Backlog';
    
    if (!grouped[lane]) grouped[lane] = {};
    if (!grouped[lane][column]) grouped[lane][column] = [];
    
    grouped[lane][column].push(task);
  });
  
  // Ensure all lanes and columns exist
  Object.keys(columns).forEach(lane => {
    if (!grouped[lane]) grouped[lane] = {};
    columns[lane].forEach(column => {
      if (!grouped[lane][column]) grouped[lane][column] = [];
    });
  });
  
  return grouped;
}
