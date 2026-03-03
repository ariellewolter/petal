// ═══════════════════════ FILE-TASK CONVERTER ═══════════════════════
// Utilities for converting between file objects and task objects
// Similar to taskEventConverter.js for planner-tasks integration

/**
 * Get file key from a file link object
 * @param {Object} fileLink - File link object
 * @returns {string} File key
 */
export function getFileKey(fileLink) {
  if (!fileLink) return null;
  if (typeof fileLink === 'string') return fileLink;
  return fileLink.abs_path || fileLink.onedrive_rel || fileLink.share_url || fileLink.key || null;
}

/**
 * Create a task from a file
 * @param {Object} fileLink - File link object
 * @param {Object} options - Options for task creation
 * @returns {Object} Task object
 */
export function fileToTask(fileLink, options = {}) {
  if (!fileLink) return null;
  
  const fileKey = getFileKey(fileLink);
  const fileName = fileLink.label || fileLink.name || fileKey || 'Untitled File';
  
  return {
    title: options.title || `Work on ${fileName}`,
    notes: options.notes || `Linked to file: ${fileName}`,
    priority: options.priority || 'medium',
    due: options.due || '',
    files: [fileLink], // Legacy format
    fileIds: options.fileIds || (fileKey ? [fileKey] : []), // Canonical format
    done: false,
    status: options.status || 'Todo',
    projectId: options.projectId || '',
    lane: options.lane || null,
    stage: options.stage || null,
    boardOrder: 1024,
    dependsOn: null,
    // Link back to file
    linkedFileKey: fileKey,
  };
}

/**
 * Update a task with file information
 * @param {Object} task - Task object
 * @param {Object} fileLink - File link object
 * @returns {Object} Updated task object
 */
export function addFileToTask(task, fileLink) {
  if (!task || !fileLink) return task;
  
  const fileKey = getFileKey(fileLink);
  if (!fileKey) return task;
  
  // Add to fileIds (canonical)
  const fileIds = task.fileIds || [];
  if (!fileIds.includes(fileKey)) {
    fileIds.push(fileKey);
  }
  
  // Add to files (legacy)
  const files = task.files || [];
  const fileExists = files.some(f => {
    const fKey = typeof f === 'string' ? f : getFileKey(f);
    return fKey === fileKey;
  });
  
  if (!fileExists) {
    files.push(fileLink);
  }
  
  return {
    ...task,
    fileIds,
    files,
    linkedFileKey: fileKey,
  };
}

/**
 * Remove a file from a task
 * @param {Object} task - Task object
 * @param {string} fileKey - File key to remove
 * @returns {Object} Updated task object
 */
export function removeFileFromTask(task, fileKey) {
  if (!task || !fileKey) return task;
  
  // Remove from fileIds
  const fileIds = (task.fileIds || []).filter(id => id !== fileKey);
  
  // Remove from files
  const files = (task.files || []).filter(f => {
    const fKey = typeof f === 'string' ? f : getFileKey(f);
    return fKey !== fileKey;
  });
  
  // Clear linkedFileKey if it matches
  const linkedFileKey = task.linkedFileKey === fileKey ? null : task.linkedFileKey;
  
  return {
    ...task,
    fileIds,
    files,
    linkedFileKey,
  };
}

/**
 * Check if a task is linked to a file
 * @param {Object} task - Task object
 * @param {string} fileKey - File key to check
 * @returns {boolean} True if task is linked to file
 */
export function isTaskLinkedToFile(task, fileKey) {
  if (!task || !fileKey) return false;
  
  // Check fileIds (canonical)
  if (task.fileIds && task.fileIds.includes(fileKey)) return true;
  
  // Check files (legacy)
  if (task.files) {
    return task.files.some(f => {
      const fKey = typeof f === 'string' ? f : getFileKey(f);
      return fKey === fileKey;
    });
  }
  
  // Check linkedFileKey
  if (task.linkedFileKey === fileKey) return true;
  
  return false;
}
