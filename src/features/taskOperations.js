// ═══════════════════════ TASK OPERATIONS ═══════════════════════
// Core task management functions

import { esc } from '../utils/strings.js';

/**
 * Helper: Update store with safety - preserves all state fields
 * Step 2e: Use store when available, fallback for backward compatibility
 */
function updateStoreSafely(updates, fallbackFn) {
  if (window.Petal?.store) {
    const state = window.Petal.store.getState();
    // Merge updates with current state to preserve all fields
    window.Petal.store.setState({
      ...state,
      ...updates,
      // Ensure Sets are properly cloned
      openProjects: updates.openProjects instanceof Set 
        ? new Set(updates.openProjects) 
        : (state.openProjects || new Set())
    });
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
  
  // Normalize ID to number for comparison
  const idNum = typeof id === 'string' ? parseInt(id) : Number(id);
  if (isNaN(idNum)) return null;
  
  return tasks.find(task => {
    if (!task || task.deletedAt) return false; // Exclude deleted tasks
    if (!task.id) return false;
    
    // Try multiple comparison methods for ID type flexibility
    const taskId = Number(task.id);
    return taskId === idNum || task.id === id || String(task.id) === String(id);
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
    boardOrder
  };
  
  // Step 2e: Use store instead of direct save/render
  updateStoreSafely(
    { tasks: [newTask, ...(tasks || [])] },
    async () => {
      // Fallback: old pattern for backward compatibility
      tasks.unshift(newTask);
      await save();
      if (render) render();
    }
  );
  
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
    t.done = !t.done;
    if (t.done) {
      t.status = 'Done';
    } else if (t.status === 'Done') {
      t.status = 'Todo';
    }
    await save();
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
 * Edit a task - opens the edit modal
 */
export function editTask(ctx, id) {
  const { tasks } = ctx;
  
  try {
    const t = findActiveTask(tasks, id);
    
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
    
    if (!modal || !titleEl || !titleInput) {
      console.error('Edit modal elements not found');
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
    
    // Populate project files select
    if (typeof updateEditModalProjectFiles === 'function') {
      updateEditModalProjectFiles(t.projectId, t.fileIds || []);
    }
    
    // Show modal
    modal.classList.add('active');
    setTimeout(() => {
      titleInput.focus();
    }, 100);
  } catch (error) {
    console.error('Error in editTask:', error);
    alert('Error opening edit modal: ' + error.message);
  }
}
