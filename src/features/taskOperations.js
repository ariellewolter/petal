// ═══════════════════════ TASK OPERATIONS ═══════════════════════
// Core task management functions

import { esc, normalizePriorityValue, normalizeDueInput } from '../utils/strings.js';
import { showNotification } from '../ui/components.js';

/**
 * Helper: Update store with safety - preserves all state fields
 * Step 2e: Use store when available, fallback for backward compatibility
 */
function updateStoreSafely(updates, fallbackFn) {
  if (window.Petal?.store) {
    const state = window.Petal.store.getState();
    // Merge updates with current state to preserve all fields
    // Phase 3 Fix: openProjects is Array in store, not Set
    const mergedUpdates = {
      ...state,
      ...updates
    };
    // Normalize openProjects if it's being updated
    if ('openProjects' in updates) {
      if (updates.openProjects instanceof Set) {
        mergedUpdates.openProjects = Array.from(updates.openProjects);
      } else if (!Array.isArray(updates.openProjects)) {
        mergedUpdates.openProjects = state.openProjects || [];
      }
    }
    window.Petal.store.setState(mergedUpdates);
    // Store auto-saves and auto-renders via subscriptions
  } else if (fallbackFn) {
    // Fallback: old pattern
    fallbackFn();
  }
}

/**
 * Helper to find a task by ID, excluding deleted tasks
 * Handles both string and number ID types
 */
function findActiveTask(tasks, id) {
  if (id === null || id === undefined) return null;
  
  // Normalize ID - handle both integers and decimals
  // For decimal IDs like "1771714801103.9167", try both exact match and integer truncation
  const idNum = typeof id === 'string' ? parseFloat(id) : Number(id);
  const idInt = Math.floor(idNum); // Truncate decimal for integer comparison
  if (isNaN(idNum)) return null;
  
  // Try exact string match first
  const exactMatch = tasks.find(task => {
    if (!task || task.deletedAt) return false;
    if (!task.id) return false;
    return String(task.id) === String(id);
  });
  if (exactMatch) return exactMatch;
  
  // Try numeric match (handles decimal IDs by comparing integer parts)
  return tasks.find(task => {
    if (!task || task.deletedAt) return false;
    if (!task.id) return false;
    
    const taskId = Number(task.id);
    const taskIdInt = Math.floor(taskId);
    
    // Match if integer parts match (handles decimal IDs) OR exact numeric match
    return taskIdInt === idInt || taskId === idNum || String(task.id) === String(id);
  });
}

/**
 * Get tasks for a specific column/status
 */
export function getColumnTasks(tasks, status, projectFilter = 'all', excludeTaskId = null) {
  return tasks
    .filter((t) => !t.deletedAt) // Exclude deleted tasks
    .filter((t) => t.status === status)
    .filter((t) => projectFilter === 'all' || String(t.projectId || '') === String(projectFilter))
    .filter((t) => excludeTaskId === null || t.id !== excludeTaskId)
    .sort((a, b) => (a.boardOrder - b.boardOrder) || (a.id - b.id));
}

/**
 * Calculate next board order for a new task
 */
export function nextBoardOrderForNewTask(tasks, status, projectId, boardProjectFilter = 'all') {
  const list = getColumnTasks(tasks, status, projectId || boardProjectFilter);
  if (!list.length) return 1024;
  return (list[list.length - 1].boardOrder || 0) + 1024;
}

/**
 * Extract tags from text (e.g., "Task #paper #lab")
 */
export function extractTags(text) {
  if (!text) return [];
  const tagRegex = /#(\w+)/g;
  const tags = [];
  let match;
  while ((match = tagRegex.exec(text)) !== null) {
    tags.push('#' + match[1]);
  }
  return [...new Set(tags)]; // Remove duplicates
}

/**
 * Remove tags from text
 */
export function removeTags(text) {
  if (!text) return '';
  return text.replace(/#\w+/g, '').trim();
}

/**
 * Determine stage based on lane and status
 */
export function getStageForLaneAndStatus(lane, status) {
  if (!lane) return status;
  
  if (lane === 'lab') {
    const labStages = { 'Inbox': 'Planned', 'Todo': 'Planned', 'Doing': 'Running', 'Done': 'Results Ready' };
    return labStages[status] || status;
  } else if (lane === 'comp') {
    const compStages = { 'Inbox': 'Planned', 'Todo': 'Planned', 'Doing': 'Building', 'Done': 'Output Ready' };
    return compStages[status] || status;
  } else if (lane === 'writing') {
    const writingStages = { 'Inbox': 'Outline', 'Todo': 'Outline', 'Doing': 'Drafting', 'Done': 'Submission Prep' };
    return writingStages[status] || status;
  }
  
  return status;
}

/**
 * Add a new task
 */
export async function addTask(ctx, titleOverride = null, statusOverride = null) {
  const { tasks, projects, save, render } = ctx;
  
  // Get form values
  const title = titleOverride || document.getElementById('in-title')?.value.trim();
  if (!title) {
    if (!titleOverride) {
      const titleInput = document.getElementById('in-title');
      if (titleInput) titleInput.focus();
    }
    return;
  }
  
  // Extract tags from title
  const tags = extractTags(title);
  const cleanTitle = removeTags(title);
  
  const status = statusOverride || document.getElementById('in-status')?.value || 'Inbox';
  const projectId = normalizeProjectIdValue(document.getElementById('in-project')?.value || '');
  const dependsOn = document.getElementById('in-depends-on')?.value || '';
  const lane = document.getElementById('in-lane')?.value || '';
  
  // Get file links
  const getFileLinks = window.Petal?.features?.fileOperations?.getFileLinks;
  const getFileLinksNormalized = window.Petal?.features?.fileOperations?.getFileLinksNormalized;
  const fileLinks = window.electronAPI && getFileLinksNormalized
    ? await getFileLinksNormalized('files-container', 't')
    : (getFileLinks ? getFileLinks('files-container', 't') : []);
  
  // Convert file links to canonical registry and get fileIds
  const fileIds = [];
  const findOrCreateCanonicalFile = window.Petal?.features?.fileManagement?.findOrCreateCanonicalFile;
  
  if (projectId && fileLinks && fileLinks.length > 0 && findOrCreateCanonicalFile) {
    fileLinks.forEach(fileLink => {
      const fileId = findOrCreateCanonicalFile(projectId, fileLink);
      if (fileId && !fileIds.includes(fileId)) {
        fileIds.push(fileId);
      }
    });
  }
  
  // Add selected files from project files dropdown
  const filesSelect = document.getElementById('task-project-files-select');
  if (filesSelect && projectId) {
    const selectedOptions = Array.from(filesSelect.selectedOptions);
    selectedOptions.forEach(option => {
      const fileId = option.value;
      if (fileId && !fileIds.includes(fileId)) {
        fileIds.push(fileId);
      }
    });
  }
  
  // Determine stage based on lane and status
  const stage = getStageForLaneAndStatus(lane, status);
  
  // Get board order
  const boardOrder = nextBoardOrderForNewTask(tasks, status, projectId, ctx.boardProjectFilter || 'all');
  
  // Get planner scheduling fields (if available in modal)
  const scheduledDate = document.getElementById('in-scheduled-date')?.value || null;
  const scheduledStartTime = document.getElementById('in-scheduled-start-time')?.value || null;
  const scheduledDurationMin = document.getElementById('in-scheduled-duration')?.value 
    ? parseInt(document.getElementById('in-scheduled-duration').value) 
    : null;
  const autoCreateBlock = document.getElementById('in-auto-create-block')?.checked || false;
  
  // Create task
  const newTask = {
    id: Date.now(),
    title: cleanTitle,
    note: document.getElementById('in-notes')?.value.trim() || '',
    noteUpdatedAt: null,
    log: [],
    notes: document.getElementById('in-notes')?.value.trim() || '', // Keep for backward compatibility
    priority: parseInt(document.getElementById('in-priority')?.value) || 2,
    estimatedMinutes: parseInt(document.getElementById('in-estimated-minutes')?.value) || null,
    timeBlock: document.getElementById('in-time-block')?.value || null,
    artifactTag: document.getElementById('in-artifact-tag')?.value.trim() || null,
    due: document.getElementById('in-due')?.value || '',
    fileIds: fileIds,
    files: fileLinks, // Keep for backward compatibility during migration
    tags,
    done: status === 'Done',
    status,
    lane: lane || null,
    stage: stage,
    projectId,
    dependsOn: dependsOn ? parseInt(dependsOn) : null,
    boardOrder,
    // Planner integration fields
    plannerEventId: null, // Will be set if block is created
    scheduledDate: scheduledDate,
    scheduledStartTime: scheduledStartTime,
    scheduledDurationMin: scheduledDurationMin,
    autoCreateBlock: autoCreateBlock
  };
  
  // Step 2e: Use store instead of direct save/render
  console.log('🔘 addTask: About to update store with new task:', {
    taskId: newTask.id,
    title: newTask.title,
    hasStore: !!window.Petal?.store,
    currentTasksCount: tasks?.length || 0
  });
  
  // Check if we should create a planner block for this task
  const shouldCreateBlock = (autoCreateBlock && scheduledDate && scheduledStartTime) ||
                           (scheduledDate && scheduledStartTime);
  
  let plannerEvent = null;
  if (shouldCreateBlock) {
    // Import converter dynamically to avoid circular dependencies
    const { taskToEvent } = await import('../utils/taskEventConverter.js');
    plannerEvent = taskToEvent(newTask, scheduledDate, projects || []);
    newTask.plannerEventId = plannerEvent.id;
  }
  
  // Prepare store update with task and potentially new event
  const storeUpdate = { tasks: [newTask, ...(tasks || [])] };
  if (plannerEvent) {
    const currentEvents = window.Petal?.store?.getState()?.events || [];
    storeUpdate.events = [plannerEvent, ...currentEvents];
  }
  
  updateStoreSafely(
    storeUpdate,
    async () => {
      // Fallback: old pattern for backward compatibility
      console.log('⚠️ addTask: Using fallback save (store not available)');
      tasks.unshift(newTask);
      if (plannerEvent && window.events) {
        window.events.unshift(plannerEvent);
      }
      await save();
      if (render) render();
    }
  );
  
  // Verify the task was added to store
  if (window.Petal?.store) {
    const updatedState = window.Petal.store.getState();
    const taskWasAdded = updatedState.tasks?.some(t => t.id === newTask.id);
    const eventWasAdded = plannerEvent ? updatedState.events?.some(e => e.id === plannerEvent.id) : true;
    console.log('✅ addTask: Store updated', {
      taskAdded: taskWasAdded,
      eventAdded: eventWasAdded,
      tasksInStore: updatedState.tasks?.length || 0,
      eventsInStore: updatedState.events?.length || 0,
      createdBlock: !!plannerEvent
    });
    
    // Sync: Rebuild file registry if task has files
    if ((fileIds.length > 0 || fileLinks.length > 0) && window.Petal?.features?.fileManagement?.buildFileRegistry) {
      try {
        const result = window.Petal.features.fileManagement.buildFileRegistry({
          tasks: updatedState.tasks || [],
          projects: updatedState.projects || [],
          fileRegistry: updatedState.fileRegistry || {},
          fileHistory: updatedState.fileHistory || {},
          files: updatedState.files || [],
        }, { commit: true });
        
        if (window.__DEBUG__) {
          console.log('✅ File registry rebuilt after task creation with files');
        }
      } catch (e) {
        console.error('Error rebuilding file registry after task creation:', e);
      }
    }
  }
  
  // Clear form if not using override
  if (!titleOverride) {
    const titleInput = document.getElementById('in-title');
    const notesInput = document.getElementById('in-notes');
    const dueInput = document.getElementById('in-due');
    const priorityInput = document.getElementById('in-priority');
    const estimatedMinutesInput = document.getElementById('in-estimated-minutes');
    const timeBlockInput = document.getElementById('in-time-block');
    const statusInput = document.getElementById('in-status');
    const projectInput = document.getElementById('in-project');
    const dependsOnInput = document.getElementById('in-depends-on');
    const laneInput = document.getElementById('in-lane');
    const tagsInput = document.getElementById('in-tags');
    const tagPreview = document.getElementById('tag-preview');
    const artifactTagInput = document.getElementById('in-artifact-tag');
    const filesContainer = document.getElementById('files-container');
    
    if (titleInput) titleInput.value = '';
    if (notesInput) notesInput.value = '';
    if (dueInput) dueInput.value = '';
    if (priorityInput) priorityInput.value = '2';
    if (estimatedMinutesInput) estimatedMinutesInput.value = '';
    if (timeBlockInput) timeBlockInput.value = '';
    if (statusInput) statusInput.value = 'Todo';
    if (projectInput) projectInput.value = '';
    if (dependsOnInput) dependsOnInput.value = '';
    if (laneInput) laneInput.value = '';
    if (tagsInput) tagsInput.value = '';
    if (tagPreview) tagPreview.innerHTML = '';
    if (artifactTagInput) artifactTagInput.value = '';
    if (filesContainer) filesContainer.innerHTML = '';
    
    // Clear project files select
    if (filesSelect) {
      filesSelect.selectedIndex = -1;
    }
    
    // Update project files select visibility
    if (typeof updateProjectFilesSelect === 'function') {
      updateProjectFilesSelect();
    }
    
    // Show success notification
    showNotification({
      message: `Task "${cleanTitle}" created successfully`,
      type: 'success',
      duration: 3000
    });
  }
}

/**
 * Toggle task done status
 */
export async function toggleTask(ctx, id) {
  const { tasks, save, render } = ctx;
  
  // Debug: Log task count and ID being searched
  if (!tasks || tasks.length === 0) {
    console.error('toggleTask: tasks array is empty!', { 
      tasksLength: tasks?.length, 
      id, 
      ctxHasTasks: !!ctx.tasks,
      windowTasksLength: window.tasks?.length 
    });
  }
  
  const t = findActiveTask(tasks, id);
  if (!t) {
    console.warn('Task not found for ID:', id, {
      tasksCount: tasks?.length,
      taskIds: tasks?.slice(0, 5).map(t => t?.id),
      searchingFor: id,
      idType: typeof id
    });
    return;
  }
  // Step 2e: Use store instead of direct save/render
  if (window.Petal?.store) {
    const state = window.Petal.store.getState();
    const updatedTasks = (state.tasks || []).map(task => {
      // Handle both number and string ID comparison
      if (task.id === id || String(task.id) === String(id)) {
        const newDone = !task.done;
        const updatedTask = {
          ...task,
          done: newDone,
          status: newDone ? 'Done' : (task.status === 'Done' ? 'Todo' : task.status)
        };
        
        // Sync task completion to linked planner event
        if (task.plannerEventId) {
          const events = state.events || [];
          const updatedEvents = events.map(event => {
            if (String(event.id) === String(task.plannerEventId)) {
              return {
                ...event,
                taskDone: newDone,
                taskStatus: updatedTask.status
              };
            }
            return event;
          });
          updateStoreSafely({ tasks: updatedTasks, events: updatedEvents });
          return updatedTask;
        }
        
        return updatedTask;
      }
      return task;
    });
    updateStoreSafely({ tasks: updatedTasks });
    
    // Sync: Update project completion if all tasks are done
    if (t.projectId && window.Petal?.features?.projectTaskOperations?.syncProjectCompletion) {
      try {
        const updatedState = window.Petal.store.getState();
        const ctx = {
          tasks: updatedState.tasks || [],
          projects: updatedState.projects || [],
          save: save || (async () => {}),
        };
        await window.Petal.features.projectTaskOperations.syncProjectCompletion(t.projectId, ctx);
      } catch (e) {
        console.error('Error syncing project completion:', e);
      }
    }
  } else {
    // Fallback: old pattern
    t.done = !t.done;
    if (t.done) {
      t.status = 'Done';
    } else if (t.status === 'Done') {
      t.status = 'Todo';
    }
    await save();
    
    // Sync: Update project completion if all tasks are done
    if (t.projectId && window.Petal?.features?.projectTaskOperations?.syncProjectCompletion) {
      try {
        await window.Petal.features.projectTaskOperations.syncProjectCompletion(t.projectId, ctx);
      } catch (e) {
        console.error('Error syncing project completion:', e);
      }
    }
    
    if (render) render();
  }
}

/**
 * Toggle subtask done status (subtasks are tasks with parentTaskId)
 */
export async function toggleSubtask(ctx, projectId, subtaskId) {
  const { tasks, save, render } = ctx;
  const subtask = findActiveTask(tasks, subtaskId);
  if (!subtask) {
    console.warn('Subtask not found for ID:', subtaskId, '- Subtask may have been deleted');
    return;
  }
  // Verify it's actually a subtask for this project
  if (subtask.parentTaskId || subtask.projectId === projectId) {
    // Valid subtask
  } else {
    console.warn('Subtask ID', subtaskId, 'does not belong to project', projectId);
    return;
  }
  // Step 2e: Use store instead of direct save/render
  if (window.Petal?.store) {
    const state = window.Petal.store.getState();
    const updatedTasks = (state.tasks || []).map(task => {
      if (task.id === subtaskId || String(task.id) === String(subtaskId)) {
        const newDone = !task.done;
        return {
          ...task,
          done: newDone,
          status: newDone ? 'Done' : (task.status === 'Done' ? 'Todo' : task.status)
        };
      }
      return task;
    });
    updateStoreSafely({ tasks: updatedTasks });
  } else {
    // Fallback: old pattern
    subtask.done = !subtask.done;
    if (subtask.done) {
      subtask.status = 'Done';
    } else if (subtask.status === 'Done') {
      subtask.status = 'Todo';
    }
    await save();
    if (render) render();
  }
}

/**
 * Update tag preview UI
 */
export function updateTagPreview() {
  const input = document.getElementById('in-tags');
  const preview = document.getElementById('tag-preview');
  if (!input || !preview) return;
  
  const text = input.value;
  const tags = extractTags(text);
  preview.innerHTML = tags.length > 0 
    ? tags.map(tag => `<span class="tag-chip" data-tag="${esc(tag)}">${esc(tag)}</span>`).join('')
    : '';
}

/**
 * Toggle task note visibility
 */
export function toggleTaskNote(taskId, toggleEl) {
  const contentEl = document.getElementById('note-' + taskId);
  if (!contentEl) return;
  
  const isExpanded = contentEl.classList.contains('expanded');
  if (isExpanded) {
    contentEl.classList.remove('expanded');
    contentEl.classList.add('collapsed');
    contentEl.style.display = 'none';
  } else {
    contentEl.classList.remove('collapsed');
    contentEl.classList.add('expanded');
    contentEl.style.display = 'block';
    const textarea = contentEl.querySelector('.task-note-textarea');
    if (textarea) {
      setTimeout(() => textarea.focus(), 50);
    }
  }
}

/**
 * Open task note editor
 */
export function openTaskNoteEditor(taskId, btnEl) {
  const contentEl = document.getElementById('note-' + taskId);
  if (!contentEl) return;
  
  contentEl.style.display = 'block';
  contentEl.classList.remove('collapsed');
  contentEl.classList.add('expanded');
  
  if (btnEl) {
    btnEl.style.display = 'none';
  }
  
  const textarea = contentEl.querySelector('.task-note-textarea');
  if (textarea) {
    setTimeout(() => textarea.focus(), 50);
  }
}

// Debounce timers for note saves (module-level state)
const noteSaveTimers = {};

/**
 * Debounce save task note
 */
export function debounceSaveTaskNote(ctx, taskId, value) {
  const { tasks, save, render } = ctx;
  
  // Clear existing timer
  if (noteSaveTimers[taskId]) {
    clearTimeout(noteSaveTimers[taskId]);
  }
  
  // Set new timer (750ms debounce)
  noteSaveTimers[taskId] = setTimeout(async () => {
    const task = findActiveTask(tasks, taskId);
    if (task) {
      task.note = value || '';
      task.noteUpdatedAt = new Date().toISOString();
      
      // Use store if available
      if (window.Petal?.store) {
        const state = window.Petal.store.getState();
        const updatedTasks = (state.tasks || []).map(t => 
          t.id === taskId ? { ...t, note: value || '', noteUpdatedAt: new Date().toISOString() } : t
        );
        updateStoreSafely({ tasks: updatedTasks });
      } else {
        await save();
        if (render) render();
      }
    }
    delete noteSaveTimers[taskId];
  }, 750);
}

/**
 * Edit a subtask (project subtask - legacy)
 */
export function editSubtask(ctx, projId, subId) {
  const { projects } = ctx;
  
  // Handle both string and number IDs
  const projIdNum = typeof projId === 'string' ? parseInt(projId) : Number(projId);
  const subIdNum = typeof subId === 'string' ? parseInt(subId) : Number(subId);
  const p = projects.find(project => {
    const projIdCheck = Number(project.id);
    return projIdCheck === projIdNum || project.id === projId || String(project.id) === String(projId);
  });
  if (!p) {
    alert('Project not found. projId: ' + projId);
    return;
  }
  const s = (p.subtasks || []).find(subtask => {
    const subtaskIdCheck = Number(subtask.id);
    return subtaskIdCheck === subIdNum || subtask.id === subId || String(subtask.id) === String(subId);
  });
  if (!s) {
    alert('Subtask not found. subId: ' + subId + ' in project: ' + projId);
    return;
  }
  
  // Set global editing state
  if (typeof window !== 'undefined') {
    window.editingTaskId = null;
    window.editingSubtaskInfo = { projectId: p.id, subtaskId: s.id };
  }
  
  // Populate modal
  const titleEl = document.getElementById('edit-modal-title');
  const titleInput = document.getElementById('edit-title');
  const prioritySelect = document.getElementById('edit-priority');
  const dueInput = document.getElementById('edit-due');
  const notesField = document.getElementById('edit-notes-field');
  const tagsHint = document.getElementById('edit-tags-hint');
  
  if (titleEl) titleEl.textContent = 'Edit Subtask';
  if (titleInput) titleInput.value = s.title || '';
  if (document.getElementById('edit-notes')) {
    document.getElementById('edit-notes').value = '';
  }
  if (prioritySelect) prioritySelect.value = s.priority || 'medium';
  if (dueInput) dueInput.value = s.due || '';
  if (notesField) notesField.style.display = 'none';
  if (tagsHint) tagsHint.style.display = 'none';
  
  // Show modal
  const modal = document.getElementById('edit-modal');
  if (modal) {
    modal.classList.add('active');
    modal.style.display = 'flex';
    if (titleInput) {
      setTimeout(() => titleInput.focus(), 100);
    }
  }
}

/**
 * Save edit modal (handles both tasks and subtasks)
 */
export async function saveEditModal(ctx) {
  const { tasks, projects, save, render, extractTags, removeTags } = ctx;
  
  const titleInput = document.getElementById('edit-title');
  if (!titleInput) return;
  
  const titleValue = titleInput.value.trim();
  if (!titleValue) {
    showNotification({
      message: 'Title cannot be empty',
      type: 'warning',
      duration: 3000
    });
    return;
  }
  
  // Support both window.editingTaskId (from TaskOperations) and global editingTaskId
  const currentEditingTaskId = window.editingTaskId !== undefined ? window.editingTaskId : (typeof editingTaskId !== 'undefined' ? editingTaskId : null);
  const currentEditingSubtaskInfo = window.editingSubtaskInfo !== undefined ? window.editingSubtaskInfo : (typeof editingSubtaskInfo !== 'undefined' ? editingSubtaskInfo : null);
  
  if (currentEditingSubtaskInfo) {
    // Check if it's a task subtask or project subtask
    if (currentEditingSubtaskInfo.taskId) {
      // Editing a task subtask
      const t = tasks.find(task => task.id === currentEditingSubtaskInfo.taskId);
      if (!t || !t.subtasks) {
        showNotification({
          message: 'Task not found',
          type: 'error',
          duration: 3000
        });
        if (typeof closeEditModal === 'function') closeEditModal();
        return;
      }
      const s = t.subtasks.find(sub => sub.id === currentEditingSubtaskInfo.subtaskId);
      if (!s) {
        showNotification({
          message: 'Subtask not found',
          type: 'error',
          duration: 3000
        });
        if (typeof closeEditModal === 'function') closeEditModal();
        return;
      }
      
      const dueInput = document.getElementById('edit-due');
      const dueValue = dueInput ? dueInput.value : '';
      const normalizedDue = normalizeDueInput(dueValue);
      if (normalizedDue === null && dueValue.trim() !== '') {
        showNotification({
          message: 'Invalid date format. Please use YYYY-MM-DD (e.g., 2024-12-25) or leave blank',
          type: 'warning',
          duration: 4000
        });
        return;
      }
      
      const prioritySelect = document.getElementById('edit-priority');
      const priorityValue = prioritySelect ? prioritySelect.value : 'medium';
      
      s.title = titleValue;
      s.priority = normalizePriorityValue(priorityValue, s.priority || 'medium');
      s.due = normalizedDue || '';
      
      // Use store if available
      if (window.Petal?.store) {
        const state = window.Petal.store.getState();
        const updatedTasks = (state.tasks || []).map(task => {
          if (task.id === currentEditingSubtaskInfo.taskId && task.subtasks) {
            return {
              ...task,
              subtasks: task.subtasks.map(sub => 
                sub.id === currentEditingSubtaskInfo.subtaskId 
                  ? { ...sub, title: titleValue, priority: normalizePriorityValue(priorityValue, sub.priority || 'medium'), due: normalizedDue || '' }
                  : sub
              )
            };
          }
          return task;
        });
        updateStoreSafely({ tasks: updatedTasks });
      } else {
        await save();
        if (render) render();
      }
      
      if (typeof closeEditModal === 'function') closeEditModal();
    } else {
      // Editing a project subtask (legacy - should be removed eventually)
      const p = projects.find(proj => proj.id === currentEditingSubtaskInfo.projectId);
      if (!p) {
        showNotification({
          message: 'Project not found',
          type: 'error',
          duration: 3000
        });
        if (typeof closeEditModal === 'function') closeEditModal();
        return;
      }
      const s = (p.subtasks || []).find(sub => sub.id === currentEditingSubtaskInfo.subtaskId);
      if (!s) {
        showNotification({
          message: 'Subtask not found',
          type: 'error',
          duration: 3000
        });
        if (typeof closeEditModal === 'function') closeEditModal();
        return;
      }
      
      const dueInput = document.getElementById('edit-due');
      const dueValue = dueInput ? dueInput.value : '';
      const normalizedDue = normalizeDueInput(dueValue);
      if (normalizedDue === null && dueValue.trim() !== '') {
        showNotification({
          message: 'Invalid date format. Please use YYYY-MM-DD (e.g., 2024-12-25) or leave blank',
          type: 'warning',
          duration: 4000
        });
        return;
      }
      
      const prioritySelect = document.getElementById('edit-priority');
      const priorityValue = prioritySelect ? prioritySelect.value : 'medium';
      
      s.title = titleValue;
      s.priority = normalizePriorityValue(priorityValue, s.priority || 'medium');
      s.due = normalizedDue || '';
      
      // Use store if available
      if (window.Petal?.store) {
        const state = window.Petal.store.getState();
        const updatedProjects = (state.projects || []).map(proj => {
          if (proj.id === currentEditingSubtaskInfo.projectId && proj.subtasks) {
            return {
              ...proj,
              subtasks: proj.subtasks.map(sub => 
                sub.id === currentEditingSubtaskInfo.subtaskId 
                  ? { ...sub, title: titleValue, priority: normalizePriorityValue(priorityValue, sub.priority || 'medium'), due: normalizedDue || '' }
                  : sub
              )
            };
          }
          return proj;
        });
        updateStoreSafely({ projects: updatedProjects });
      } else {
        await save();
        if (render) render();
      }
      
      if (typeof closeEditModal === 'function') closeEditModal();
    }
  } else if (currentEditingTaskId) {
    // Editing a regular task - exclude deleted tasks
    // Get task from store if available, otherwise from global tasks array
    const state = window.Petal?.store?.getState();
    const tasksArray = state?.tasks || tasks;
    const t = findActiveTask(tasksArray, currentEditingTaskId);
    if (!t) {
      showNotification({
        message: 'Task not found or has been deleted',
        type: 'error',
        duration: 3000
      });
      if (typeof closeEditModal === 'function') closeEditModal();
      return;
    }
    
    const cleanTitle = removeTags ? removeTags(titleValue) : titleValue.replace(/#\w+/g, '').trim();
    if (!cleanTitle) {
      showNotification({
        message: 'Task title cannot be empty',
        type: 'warning',
        duration: 3000
      });
      return;
    }
    
    const notesInput = document.getElementById('edit-notes');
    const notesValue = notesInput ? notesInput.value.trim() : '';
    const dueInput = document.getElementById('edit-due');
    const dueValue = dueInput ? dueInput.value : '';
    const normalizedDue = normalizeDueInput(dueValue);
    if (normalizedDue === null && dueValue.trim() !== '') {
      showNotification({
        message: 'Invalid date format. Please use YYYY-MM-DD (e.g., 2024-12-25) or leave blank',
        type: 'warning',
        duration: 4000
      });
      return;
    }
    
    // Build updated task object
    const prioritySelect = document.getElementById('edit-priority');
    const estimatedMinutesInput = document.getElementById('edit-estimated-minutes');
    const timeBlockSelect = document.getElementById('edit-time-block');
    const artifactTagInput = document.getElementById('edit-artifact-tag');
    const parentTaskSelect = document.getElementById('edit-parent-task');
    
    // Get parent task ID (convert to number if it's a valid selection)
    let parentTaskId = null;
    if (parentTaskSelect && parentTaskSelect.value) {
      const parentIdValue = parentTaskSelect.value;
      parentTaskId = parentIdValue ? (parseInt(parentIdValue) || parentIdValue) : null;
    }
    
    const updatedTask = {
      ...t,
      title: cleanTitle,
      tags: extractTags ? extractTags(titleValue) : [],
      notes: notesValue,
      priority: prioritySelect ? (parseInt(prioritySelect.value) || 2) : 2,
      estimatedMinutes: estimatedMinutesInput ? (parseInt(estimatedMinutesInput.value) || null) : null,
      timeBlock: timeBlockSelect ? (timeBlockSelect.value || null) : null,
      artifactTag: artifactTagInput ? (artifactTagInput.value.trim() || null) : null,
      due: normalizedDue || '',
      parentTaskId: parentTaskId, // Set parent task to make this a subtask
      updatedAt: Date.now()
    };
    
    // Update fileIds from project files select
    const editFilesSelect = document.getElementById('edit-project-files-select');
    if (editFilesSelect && updatedTask.projectId) {
      const selectedFileIds = Array.from(editFilesSelect.selectedOptions)
        .map(option => option.value)
        .filter(id => id);
      
      // Merge with existing fileIds (keep any that aren't in project files)
      const existingFileIds = updatedTask.fileIds || [];
      const projectsArray = state?.projects || projects;
      const project = projectsArray.find(p => p.id === updatedTask.projectId);
      const projectFileIds = project && project.files ? project.files.map(f => f && f.id).filter(Boolean) : [];
      
      // Keep existing fileIds that are still valid, add new selections
      const newFileIds = [...new Set([
        ...existingFileIds.filter(id => projectFileIds.includes(id) || !projectFileIds.length),
        ...selectedFileIds
      ])];
      
      updatedTask.fileIds = newFileIds;
    }
    
    // Save protocol settings
    const protocolEnabledInput = document.getElementById('edit-protocol-enabled');
    const protocolEnabled = protocolEnabledInput ? protocolEnabledInput.checked : false;
    if (protocolEnabled) {
      if (!updatedTask.protocol) {
        updatedTask.protocol = { enabled: true, dailyLog: [], steps: [] };
      }
      updatedTask.protocol.enabled = true;
      
      const startInput = document.getElementById('edit-protocol-start');
      const endInput = document.getElementById('edit-protocol-end');
      const dayIndexInput = document.getElementById('edit-protocol-day-index');
      
      if (startInput && startInput.value) {
        updatedTask.protocol.startAt = new Date(startInput.value).toISOString();
      }
      if (endInput && endInput.value) {
        updatedTask.protocol.expectedEndAt = new Date(endInput.value).toISOString();
      }
      
      // Calculate day index if needed
      if (updatedTask.protocol.startAt) {
        const calculateProtocolDayIndex = (startAt) => {
          if (!startAt) return 1;
          const start = new Date(startAt);
          const now = new Date();
          const diffTime = now - start;
          const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
          return Math.max(1, diffDays + 1);
        };
        
        if (dayIndexInput && dayIndexInput.value) {
          updatedTask.protocol.dayIndex = parseInt(dayIndexInput.value) || calculateProtocolDayIndex(updatedTask.protocol.startAt);
        } else {
          updatedTask.protocol.dayIndex = calculateProtocolDayIndex(updatedTask.protocol.startAt);
        }
      }
      
      // Ensure dailyLog and steps arrays exist
      if (!updatedTask.protocol.dailyLog) updatedTask.protocol.dailyLog = [];
      if (!updatedTask.protocol.steps) updatedTask.protocol.steps = [];
    } else {
      // Disable protocol (but keep data in case user re-enables)
      if (updatedTask.protocol) {
        updatedTask.protocol.enabled = false;
      }
    }
    
    // Update task in store if available, otherwise use legacy save
    if (window.Petal?.store) {
      const currentState = window.Petal.store.getState();
      const updatedTasks = (currentState.tasks || []).map(task => 
        task.id === currentEditingTaskId ? updatedTask : task
      );
      updateStoreSafely({ tasks: updatedTasks });
    } else {
      // Legacy: directly mutate and save
      Object.assign(t, updatedTask);
      await save();
      if (render) render();
    }
    
    if (typeof closeEditModal === 'function') closeEditModal();
  } else {
    console.warn('saveEditModal: No editingTaskId or editingSubtaskInfo found');
    alert('No task is being edited.');
  }
}

/**
 * Toggle protocol fields visibility in edit modal
 */
export function toggleProtocolFields() {
  const enabledInput = document.getElementById('edit-protocol-enabled');
  const fields = document.getElementById('edit-protocol-fields');
  if (!enabledInput || !fields) return;
  
  const enabled = enabledInput.checked;
  fields.style.display = enabled ? 'block' : 'none';
}

/**
 * Format date for datetime-local input
 */
export function formatDateTimeLocal(date) {
  if (!date) return '';
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Calculate protocol day index from start date
 */
export function calculateProtocolDayIndex(startAt) {
  if (!startAt) return 1;
  const start = new Date(startAt);
  const now = new Date();
  const diffTime = now - start;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(1, diffDays + 1);
}

/**
 * Save protocol daily entry
 */
export async function saveProtocolDailyEntry(ctx) {
  const { tasks, save } = ctx;
  
  if (!window.currentDrawerTaskId) return;
  const task = findActiveTask(tasks, window.currentDrawerTaskId);
  if (!task || !task.protocol || !task.protocol.enabled) return;
  
  const textarea = document.getElementById('protocol-daily-entry');
  if (!textarea) return;
  
  const text = textarea.value.trim();
  if (!text) {
    alert('Please enter some text for today\'s entry.');
    return;
  }
  
  if (!task.protocol.dailyLog) {
    task.protocol.dailyLog = [];
  }
  
  const entry = {
    id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    at: new Date().toISOString(),
    text: text,
    fileIds: []
  };
  
  task.protocol.dailyLog.push(entry);
  
  // Update day index if needed
  if (task.protocol.startAt) {
    task.protocol.dayIndex = calculateProtocolDayIndex(task.protocol.startAt);
  }
  
  textarea.value = '';
  
  // Use store if available
  if (window.Petal?.store) {
    const state = window.Petal.store.getState();
    const updatedTasks = (state.tasks || []).map(t => {
      if (t.id === window.currentDrawerTaskId) {
        return {
          ...t,
          protocol: {
            ...t.protocol,
            dailyLog: [...(t.protocol.dailyLog || []), entry],
            dayIndex: t.protocol.startAt ? calculateProtocolDayIndex(t.protocol.startAt) : t.protocol.dayIndex
          }
        };
      }
      return t;
    });
    updateStoreSafely({ tasks: updatedTasks });
  } else {
    await save();
  }
  
  // Re-render protocol tab
  if (window.Petal?.features?.taskOperations?.renderProtocolTab) {
    window.Petal.features.taskOperations.renderProtocolTab(ctx);
  }
}

/**
 * Edit a task - opens the edit modal
 */
export function editTask(ctx, id) {
  console.log('🔍🔍🔍 TaskOperations.editTask START', { id, idType: typeof id });
  const { tasks } = ctx;
  console.log('🔍🔍🔍 Tasks from context:', { tasksCount: tasks?.length, tasks: tasks?.slice(0, 3).map(t => ({ id: t.id, idType: typeof t.id, title: t.title?.substring(0, 20) })) });
  
  try {
    console.log('🔍🔍🔍 About to call findActiveTask');
    const t = findActiveTask(tasks, id);
    console.log('🔍🔍🔍 findActiveTask returned:', t ? { id: t.id, title: t.title } : 'NOT FOUND - task not found!');
    
    if (!t) {
      // Only log in development mode to reduce console noise
      // This can happen if a task was deleted but UI still has a reference
      const isDev = typeof window !== 'undefined' && (
        window.location?.hostname === 'localhost' || 
        window.location?.hostname === '127.0.0.1' ||
        window.location?.protocol === 'file:'
      );
      if (isDev) {
        console.warn('Task not found for ID:', id, '- Task may have been deleted');
      }
      // Clear stale edit pointers so the UI does not keep retrying invalid IDs.
      if (typeof window !== 'undefined') {
        if (window.editingTaskId !== undefined) {
          window.editingTaskId = null;
        }
        if (window.editingSubtaskInfo) {
          window.editingSubtaskInfo = null;
        }
      }
      // Don't show alert for missing tasks - just silently fail
      // The UI will update on next render anyway
      return;
    }
    
    // Set global editing state (will be refactored later)
    if (typeof window !== 'undefined') {
      window.editingTaskId = t.id;
      if (window.editingSubtaskInfo) {
        window.editingSubtaskInfo = null;
      }
    }
    
    // Get modal elements
    const modal = document.getElementById('edit-modal');
    const titleEl = document.getElementById('edit-modal-title');
    const titleInput = document.getElementById('edit-title');
    const notesInput = document.getElementById('edit-notes');
    const prioritySelect = document.getElementById('edit-priority');
    const dueInput = document.getElementById('edit-due');
    const estimatedMinutesInput = document.getElementById('edit-estimated-minutes');
    const timeBlockSelect = document.getElementById('edit-time-block');
    const notesField = document.getElementById('edit-notes-field');
    const tagsHint = document.getElementById('edit-tags-hint');
    
    console.log('🔍 Modal elements check:', {
      modal: !!modal,
      titleEl: !!titleEl,
      titleInput: !!titleInput,
      modalId: modal?.id,
      modalClasses: modal?.className
    });
    
    if (!modal || !titleEl || !titleInput) {
      console.error('Edit modal elements not found', { modal: !!modal, titleEl: !!titleEl, titleInput: !!titleInput });
      alert('Edit modal not found. Please refresh the page.');
      return;
    }
    
    // Populate modal
    const currentTitle = [t.title, ...(t.tags||[])].filter(Boolean).join(' ').trim();
    titleEl.textContent = 'Edit Task';
    titleInput.value = currentTitle || t.title || '';
    
    if (notesInput) {
      notesInput.value = t.notes || t.note || '';
    }
    
    // Handle both old (high/medium/low) and new (1-3) priority formats
    let priorityValue = 2;
    if (typeof t.priority === 'number') {
      priorityValue = t.priority;
    } else if (typeof t.priority === 'string') {
      priorityValue = t.priority === 'high' ? 3 : t.priority === 'low' ? 1 : 2;
    }
    
    if (prioritySelect) {
      prioritySelect.value = priorityValue || 2;
    }
    
    if (dueInput) {
      dueInput.value = t.due || '';
    }
    
    if (estimatedMinutesInput) {
      estimatedMinutesInput.value = t.estimatedMinutes || '';
    }
    
    const artifactTagInput = document.getElementById('edit-artifact-tag');
    if (artifactTagInput) {
      artifactTagInput.value = t.artifactTag || '';
    }
    if (timeBlockSelect) {
      timeBlockSelect.value = t.timeBlock || '';
    }
    
    if (notesField) {
      notesField.style.display = '';
    }
    
    if (tagsHint) {
      tagsHint.style.display = '';
    }
    
    // Populate protocol fields
    const protocolEnabled = t.protocol && t.protocol.enabled;
    const protocolEnabledCheckbox = document.getElementById('edit-protocol-enabled');
    if (protocolEnabledCheckbox) {
      protocolEnabledCheckbox.checked = protocolEnabled || false;
      if (protocolEnabled && t.protocol) {
        const protocolStartInput = document.getElementById('edit-protocol-start');
        const protocolEndInput = document.getElementById('edit-protocol-end');
        const protocolDayIndexInput = document.getElementById('edit-protocol-day-index');
        
        if (protocolStartInput && t.protocol.startAt) {
          const startDate = new Date(t.protocol.startAt);
          // Use global formatDateTimeLocal if available
          if (typeof formatDateTimeLocal === 'function') {
            protocolStartInput.value = formatDateTimeLocal(startDate);
          } else {
            // Fallback formatting
            const year = startDate.getFullYear();
            const month = String(startDate.getMonth() + 1).padStart(2, '0');
            const day = String(startDate.getDate()).padStart(2, '0');
            const hours = String(startDate.getHours()).padStart(2, '0');
            const minutes = String(startDate.getMinutes()).padStart(2, '0');
            protocolStartInput.value = `${year}-${month}-${day}T${hours}:${minutes}`;
          }
        }
        if (protocolEndInput && t.protocol.expectedEndAt) {
          const endDate = new Date(t.protocol.expectedEndAt);
          if (typeof formatDateTimeLocal === 'function') {
            protocolEndInput.value = formatDateTimeLocal(endDate);
          } else {
            const year = endDate.getFullYear();
            const month = String(endDate.getMonth() + 1).padStart(2, '0');
            const day = String(endDate.getDate()).padStart(2, '0');
            const hours = String(endDate.getHours()).padStart(2, '0');
            const minutes = String(endDate.getMinutes()).padStart(2, '0');
            protocolEndInput.value = `${year}-${month}-${day}T${hours}:${minutes}`;
          }
        }
        if (protocolDayIndexInput) {
          protocolDayIndexInput.value = t.protocol.dayIndex || '';
        }
      }
      // Call global toggleProtocolFields if available
      if (typeof toggleProtocolFields === 'function') {
        toggleProtocolFields();
      }
    }
    
    // Populate parent task select
    const parentTaskSelect = document.getElementById('edit-parent-task');
    if (parentTaskSelect) {
      // Get all tasks excluding the current task and its subtasks (to prevent circular references)
      const state = window.Petal?.store?.getState();
      const allTasks = state?.tasks || tasks || [];
      const availableTasks = allTasks.filter(task => {
        // Exclude deleted tasks, current task, and tasks that are already subtasks of current task
        return task && 
               !task.deletedAt && 
               task.id !== t.id && 
               task.parentTaskId !== t.id;
      });
      
      // Clear existing options
      parentTaskSelect.innerHTML = '<option value="">None (standalone task)</option>';
      
      // Add available tasks
      availableTasks.forEach(task => {
        const option = document.createElement('option');
        option.value = task.id;
        option.textContent = task.title || `Task ${task.id}`;
        if (task.id === t.parentTaskId) {
          option.selected = true;
        }
        parentTaskSelect.appendChild(option);
      });
    }
    
    // Populate project files select
    if (typeof updateEditModalProjectFiles === 'function') {
      updateEditModalProjectFiles(t.projectId, t.fileIds || []);
    }
    
    // Show modal - explicitly set display to override inline styles
    console.log('🔍 About to show modal, current classes:', modal.className);
    modal.classList.add('active');
    modal.style.display = 'flex'; // Explicitly set display to override inline style
    console.log('🔍 Modal classes after adding active:', modal.className);
    console.log('🔍 Modal display style:', window.getComputedStyle(modal).display);
    setTimeout(() => {
      titleInput.focus();
      console.log('🔍 Focused title input');
    }, 100);
  } catch (error) {
    console.error('Error in editTask:', error, error.stack);
    alert('Error opening edit modal: ' + error.message);
  }
}

// ═══════════════════════ PROTOCOL FUNCTIONS (REMAINING) ═══════════════════════

/**
 * Link file to protocol entry (placeholder for future enhancement)
 */
export async function linkFileToProtocolEntry() {
  const currentDrawerTaskId = typeof window.currentDrawerTaskId !== 'undefined' ? window.currentDrawerTaskId : null;
  if (!currentDrawerTaskId) return;
  
  // For now, just show a message - file linking to protocol entries can be enhanced later
  alert('File attachment to protocol entries coming soon. For now, you can link files to the task itself in the Files tab.');
}

/**
 * Toggle protocol steps section visibility
 */
export function toggleProtocolSteps() {
  const section = document.getElementById('protocol-steps-section');
  if (section) {
    section.style.display = section.style.display === 'none' ? 'block' : 'none';
  }
}

/**
 * Add a new protocol step
 */
export async function addProtocolStep(ctx) {
  const { tasks, save, renderProtocolTab } = ctx;
  const currentDrawerTaskId = typeof window.currentDrawerTaskId !== 'undefined' ? window.currentDrawerTaskId : null;
  
  if (!currentDrawerTaskId) return;
  const task = findActiveTask(tasks, currentDrawerTaskId);
  if (!task || !task.protocol || !task.protocol.enabled) return;
  
  const title = prompt('Enter step title:');
  if (!title || !title.trim()) return;
  
  if (!task.protocol.steps) {
    task.protocol.steps = [];
  }
  
  const newStep = {
    id: `step_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    title: title.trim(),
    done: false
  };
  
  task.protocol.steps.push(newStep);
  
  // Use store if available
  if (window.Petal?.store) {
    const state = window.Petal.store.getState();
    const updatedTasks = (state.tasks || []).map(t => {
      if (t.id === currentDrawerTaskId) {
        return {
          ...t,
          protocol: {
            ...t.protocol,
            steps: [...(t.protocol.steps || []), newStep]
          }
        };
      }
      return t;
    });
    updateStoreSafely({ tasks: updatedTasks });
  } else {
    if (save) await save();
  }
  
  // Re-render protocol tab
  if (renderProtocolTab) {
    renderProtocolTab();
  }
}

/**
 * Render protocol tab content
 */
export function renderProtocolTab(ctx) {
  const { tasks, esc } = ctx;
  const currentDrawerTaskId = typeof window.currentDrawerTaskId !== 'undefined' ? window.currentDrawerTaskId : null;
  
  if (!currentDrawerTaskId) return;
  const task = findActiveTask(tasks, currentDrawerTaskId);
  if (!task || !task.protocol || !task.protocol.enabled) return;
  
  // Update protocol status
  const statusEl = document.getElementById('protocol-status');
  if (statusEl) {
    const startDate = task.protocol.startAt ? new Date(task.protocol.startAt) : null;
    const endDate = task.protocol.expectedEndAt ? new Date(task.protocol.expectedEndAt) : null;
    const dayIndex = task.protocol.dayIndex || calculateProtocolDayIndex(task.protocol.startAt);
    
    let statusText = `Day ${dayIndex}`;
    if (startDate) {
      statusText += ` • Started ${startDate.toLocaleDateString()}`;
    }
    if (endDate) {
      const daysRemaining = Math.ceil((endDate - new Date()) / (1000 * 60 * 60 * 24));
      if (daysRemaining > 0) {
        statusText += ` • ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} remaining`;
      } else if (daysRemaining === 0) {
        statusText += ` • Ends today`;
      } else {
        statusText += ` • Ended ${Math.abs(daysRemaining)} day${Math.abs(daysRemaining) !== 1 ? 's' : ''} ago`;
      }
    }
    statusEl.textContent = statusText;
  }
  
  // Render daily log
  const logEl = document.getElementById('protocol-daily-log');
  if (logEl) {
    const dailyLog = task.protocol.dailyLog || [];
    if (dailyLog.length === 0) {
      logEl.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-dim);font-size:12px;">No entries yet</div>';
    } else {
      const escFn = esc || ((s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'));
      logEl.innerHTML = dailyLog.slice().reverse().map(entry => {
        const date = new Date(entry.at);
        return `
          <div style="background:var(--bg2);border:1px solid var(--border);border-radius:8px;padding:12px;">
            <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:8px;">
              <div style="font-size:11px;color:var(--text-dim);">${date.toLocaleDateString()} ${date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
            </div>
            <div style="font-size:13px;color:var(--text);line-height:1.6;white-space:pre-wrap;">${escFn(entry.text)}</div>
          </div>
        `;
      }).join('');
    }
  }
  
  // Render steps
  const stepsEl = document.getElementById('protocol-steps-list');
  if (stepsEl) {
    const steps = task.protocol.steps || [];
    if (steps.length === 0) {
      stepsEl.innerHTML = '<div style="text-align:center;padding:12px;color:var(--text-dim);font-size:11px;">No steps yet</div>';
    } else {
      const escFn = esc || ((s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'));
      // Use global toggleProtocolStep wrapper function for inline handlers
      const toggleFn = typeof toggleProtocolStep === 'function' 
        ? 'toggleProtocolStep' 
        : 'window.Petal?.features?.taskOperations?.toggleProtocolStep';
      stepsEl.innerHTML = steps.map(step => `
        <div style="display:flex;align-items:center;gap:8px;padding:8px;background:var(--surface);border-radius:6px;">
          <input type="checkbox" ${step.done ? 'checked' : ''} onchange="${toggleFn}('${step.id}')" style="width:16px;height:16px;cursor:pointer;">
          <span style="flex:1;font-size:12px;color:var(--text);${step.done ? 'text-decoration:line-through;opacity:0.6;' : ''}">${escFn(step.title)}</span>
        </div>
      `).join('');
    }
  }
}

/**
 * Toggle protocol step completion
 */
export async function toggleProtocolStep(ctx, stepId) {
  const { tasks, save, renderProtocolTab } = ctx;
  const currentDrawerTaskId = typeof window.currentDrawerTaskId !== 'undefined' ? window.currentDrawerTaskId : null;
  
  if (!currentDrawerTaskId) return;
  const task = findActiveTask(tasks, currentDrawerTaskId);
  if (!task || !task.protocol || !task.protocol.steps) return;
  
  const step = task.protocol.steps.find(s => s.id === stepId);
  if (step) {
    step.done = !step.done;
    
    // Use store if available
    if (window.Petal?.store) {
      const state = window.Petal.store.getState();
      const updatedTasks = (state.tasks || []).map(t => {
        if (t.id === currentDrawerTaskId) {
          return {
            ...t,
            protocol: {
              ...t.protocol,
              steps: (t.protocol.steps || []).map(s => s.id === stepId ? { ...s, done: !s.done } : s)
            }
          };
        }
        return t;
      });
      updateStoreSafely({ tasks: updatedTasks });
    } else {
      if (save) await save();
    }
    
    // Re-render protocol tab
    if (renderProtocolTab) {
      renderProtocolTab();
    }
  }
}

/**
 * Get protocol badge HTML for a task
 */
export function getProtocolBadge(task) {
  if (!task.protocol || !task.protocol.enabled) return '';
  
  // Use calculateProtocolDayIndex from this module
  const dayIndex = task.protocol.dayIndex || calculateProtocolDayIndex(task.protocol.startAt);
  const startDate = task.protocol.startAt ? new Date(task.protocol.startAt) : null;
  const endDate = task.protocol.expectedEndAt ? new Date(task.protocol.expectedEndAt) : null;
  
  let badgeText = `Protocol Day ${dayIndex}`;
  if (endDate && new Date() > endDate) {
    badgeText = 'Protocol ended';
  } else if (startDate && new Date() < startDate) {
    badgeText = 'Protocol pending';
  } else {
    badgeText = `Protocol Day ${dayIndex}`;
  }
  
  // Use global openTaskDrawer if available, otherwise use window.Petal
  const openDrawerFn = typeof openTaskDrawer === 'function' 
    ? `openTaskDrawer(${task.id})` 
    : `window.Petal?.features?.taskDrawer?.openTaskDrawer?.({ tasks: window.tasks || [], projects: window.projects || [] }, ${task.id})`;
  const switchTabFn = typeof switchTaskDrawerTab === 'function'
    ? `switchTaskDrawerTab('protocol')`
    : `window.Petal?.features?.taskDrawer?.switchTaskDrawerTab?.('protocol')`;
  
  return `<span class="protocol-badge" style="display:inline-flex;align-items:center;gap:4px;padding:2px 8px;background:var(--sage-pale);color:var(--sage);border-radius:12px;font-size:10px;letter-spacing:.05em;text-transform:uppercase;cursor:pointer;" onclick="event.stopPropagation();${openDrawerFn};${switchTabFn};" title="Click to view protocol">⚗️ ${badgeText}</span>`;
}

// ═══════════════════════ TASK SUBTASK OPERATIONS ═══════════════════════

/**
 * Toggle task subtask section visibility
 */
export async function toggleTaskSubtaskSection(ctx, taskId) {
  const { rerenderViewIfActive } = ctx;
  
  // Use global openTaskSubtasks Set if available
  const openTaskSubtasks = typeof window.openTaskSubtasks !== 'undefined' 
    ? window.openTaskSubtasks 
    : (window.openTaskSubtasks = new Set());
  
  if (openTaskSubtasks.has(taskId)) {
    openTaskSubtasks.delete(taskId);
  } else {
    openTaskSubtasks.add(taskId);
  }
  
  // Re-render projects view if visible
  if (rerenderViewIfActive) {
    await rerenderViewIfActive('projects');
  }
}

/**
 * Toggle add subtask form visibility
 */
export function toggleAddSubtaskToTask(taskId) {
  const section = document.getElementById('add-subtask-to-task-' + taskId);
  if (section) {
    section.style.display = section.style.display === 'none' ? 'block' : 'none';
  }
}

/**
 * Get subtasks for a task (tasks with parentTaskId matching taskId)
 */
export function getTaskSubtasks(ctx, taskId) {
  const { tasks } = ctx;
  return (tasks || []).filter(t => t.parentTaskId === taskId);
}

/**
 * Add subtask to task inline (from form)
 */
export async function addSubtaskToTaskInline(ctx, taskId) {
  const { tasks, save, render } = ctx;
  
  const t = (tasks || []).find(t => t.id === taskId);
  if (!t) return;
  
  const titleInput = document.getElementById('subtask-title-' + taskId);
  if (!titleInput) return;
  
  const title = titleInput.value.trim();
  if (!title) {
    titleInput.focus();
    return;
  }
  
  const priorityInput = document.getElementById('subtask-pri-' + taskId);
  const dueInput = document.getElementById('subtask-due-' + taskId);
  
  const priority = priorityInput?.value || 'medium';
  const due = dueInput?.value || '';
  
  // Create a new task with parentTaskId instead of nested subtask
  const newSubtask = {
    id: Date.now(),
    title,
    notes: '',
    note: '',
    noteUpdatedAt: '',
    priority,
    due,
    files: [],
    done: false,
    status: 'Todo',
    projectId: t.projectId || null,
    parentTaskId: taskId,
    lane: t.lane || null,
    stage: t.stage || 'planned',
    boardOrder: 1024
  };
  
  // Use store if available
  if (window.Petal?.store) {
    const state = window.Petal.store.getState();
    updateStoreSafely({
      tasks: [newSubtask, ...(state.tasks || [])]
    });
  } else {
    if (tasks) tasks.unshift(newSubtask);
    if (save) await save();
  }
  
  // Re-render
  if (render) {
    render();
  }
  
  // Clear form
  if (titleInput) titleInput.value = '';
  if (priorityInput) priorityInput.value = 'medium';
  if (dueInput) dueInput.value = '';
  const formSection = document.getElementById('add-subtask-to-task-' + taskId);
  if (formSection) formSection.style.display = 'none';
}

/**
 * Toggle task subtask completion
 */
export async function toggleTaskSubtask(ctx, taskId, subtaskId) {
  const { tasks, save, render } = ctx;
  
  // subtaskId is now a task ID, not a nested subtask
  const st = (tasks || []).find(t => t.id === subtaskId);
  if (st) {
    st.done = !st.done;
    if (st.done) {
      st.status = 'Done';
    } else if (st.status === 'Done') {
      st.status = 'Todo';
    }
    
    // Use store if available
    if (window.Petal?.store) {
      const state = window.Petal.store.getState();
      const updatedTasks = (state.tasks || []).map(t => {
        if (t.id === subtaskId) {
          return {
            ...t,
            done: !t.done,
            status: !t.done ? 'Done' : (t.status === 'Done' ? 'Todo' : t.status)
          };
        }
        return t;
      });
      updateStoreSafely({ tasks: updatedTasks });
    } else {
      if (save) await save();
    }
    
    // Re-render
    if (render) {
      render();
    }
  }
}

/**
 * Edit task subtask (opens edit modal)
 */
export function editTaskSubtask(ctx, taskId, subtaskId) {
  const { tasks } = ctx;
  
  // subtaskId is now a task ID
  const st = (tasks || []).find(t => t.id === subtaskId);
  if (!st) return;
  
  // Use global editingTaskId if available
  if (typeof window !== 'undefined') {
    window.editingTaskId = subtaskId; // Edit as a regular task
    window.editingSubtaskInfo = null;
  }
  
  // Populate modal
  const currentTitle = [st.title, ...(st.tags || [])].filter(Boolean).join(' ').trim();
  const modalTitle = document.getElementById('edit-modal-title');
  const titleInput = document.getElementById('edit-title');
  const notesInput = document.getElementById('edit-notes');
  const priorityInput = document.getElementById('edit-priority');
  const dueInput = document.getElementById('edit-due');
  const notesField = document.getElementById('edit-notes-field');
  const tagsHint = document.getElementById('edit-tags-hint');
  const modal = document.getElementById('edit-modal');
  
  if (modalTitle) modalTitle.textContent = 'Edit Subtask';
  if (titleInput) titleInput.value = currentTitle || st.title || '';
  if (notesInput) notesInput.value = st.notes || '';
  if (priorityInput) priorityInput.value = st.priority || 'medium';
  if (dueInput) dueInput.value = st.due || '';
  if (notesField) notesField.style.display = '';
  if (tagsHint) tagsHint.style.display = '';
  
  // Show modal
  if (modal) {
    modal.classList.add('active');
    if (titleInput) {
      setTimeout(() => titleInput.focus(), 100);
    }
  }
}
