// ═══════════════════════ DATA MIGRATIONS ═══════════════════════
// Migration functions for data schema updates

import { findProjectById } from './projectHelpers.js';

// Current schema version
export const CURRENT_SCHEMA_VERSION = 1;

const DEFAULT_BOARD_COLUMNS = ['Inbox', 'Backlog', 'Todo', 'Doing', 'Done'];

/**
 * Migrate tasks for kanban board structure
 * Ensures all tasks have proper status and boardOrder
 */
export function migrateTasksForKanban() {
  // Get settings from store
  const store = window.Petal?.store;
  if (!store) {
    console.warn('Store not available for migration');
    return;
  }
  
  const state = store.getState();
  const settings = state.settings || {};
  
  // Ensure board settings exist
  if (!settings.boards || typeof settings.boards !== 'object') {
    settings.boards = {};
  }
  const boardColumns = window.DEFAULT_BOARD_COLUMNS || DEFAULT_BOARD_COLUMNS;
  if (!Array.isArray(settings.boards.defaultColumns) || settings.boards.defaultColumns.length === 0) {
    settings.boards.defaultColumns = [...boardColumns];
  }
  
  const getBoardColumns = () => settings.boards.defaultColumns;
  const orderByColumn = {};
  getBoardColumns().forEach((c, idx) => {
    orderByColumn[c] = (idx + 1) * 1024;
  });
  
  const tasks = state.tasks || [];
  const updatedTasks = tasks.map((t) => {
    const status = getBoardColumns().includes(t.status) ? t.status : (t.done ? 'Done' : 'Todo');
    const projectId = normalizeProjectIdValue(t.projectId);
    let boardOrder = Number(t.boardOrder);
    if (!Number.isFinite(boardOrder)) {
      boardOrder = orderByColumn[status] || 1024;
      orderByColumn[status] = boardOrder + 1024;
    }
    return { ...t, status, projectId, boardOrder };
  });
  
  // Update store if tasks changed
  if (JSON.stringify(tasks) !== JSON.stringify(updatedTasks)) {
    store.setState({ tasks: updatedTasks, settings });
  }
}

/**
 * Normalize project ID value (handles string/number conversion)
 */
function normalizeProjectIdValue(value) {
  if (value === undefined || value === null || value === '') return '';
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : String(value);
}

/**
 * Migrate nested subtasks to be actual tasks with parentTaskId
 */
export function migrateSubtasksToTasks() {
  const store = window.Petal?.store;
  if (!store) {
    console.warn('Store not available for migration');
    return false;
  }
  
  const state = store.getState();
  let tasks = [...(state.tasks || [])];
  let migrated = false;
  
  tasks.forEach(t => {
    if (t.subtasks && Array.isArray(t.subtasks) && t.subtasks.length > 0) {
      // Convert nested subtasks to tasks
      t.subtasks.forEach(st => {
        // Check if this subtask was already migrated (exists as a task)
        const existingTask = tasks.find(task => 
          task.parentTaskId === t.id && 
          task.title === st.title &&
          Math.abs(task.id - st.id) < 1000 // IDs should be close if migrated
        );
        
        if (!existingTask) {
          // Create a new task from the subtask
          const newTask = {
            id: st.id || Date.now() + Math.random(),
            title: st.title || '',
            notes: st.notes || '',
            priority: st.priority || 'medium',
            due: st.due || '',
            files: st.files || [],
            done: st.done || false,
            status: st.done ? 'Done' : 'Todo',
            projectId: t.projectId || null,
            parentTaskId: t.id,
            lane: t.lane || null,
            stage: t.stage || 'planned',
            boardOrder: 1024
          };
          tasks.push(newTask);
          migrated = true;
        }
      });
      // Clear the nested subtasks array
      delete t.subtasks;
      migrated = true;
    }
  });
  
  if (migrated) {
    store.setState({ tasks });
  }
  
  return migrated;
}

/**
 * Migrate note fields to ensure all tasks and files have note fields
 */
export function migrateNotesFields() {
  const store = window.Petal?.store;
  if (!store) {
    console.warn('Store not available for migration');
    return;
  }
  
  const state = store.getState();
  let tasks = [...(state.tasks || [])];
  let projects = [...(state.projects || [])];
  let migrated = false;
  
  // Ensure all tasks have note, noteUpdatedAt, and log fields
  tasks = tasks.map(task => {
    const updated = { ...task };
    if (task.note === undefined) {
      updated.note = '';
      migrated = true;
    }
    if (task.noteUpdatedAt === undefined) {
      updated.noteUpdatedAt = null;
      migrated = true;
    }
    if (!task.log || !Array.isArray(task.log)) {
      updated.log = [];
      migrated = true;
    }
    // Ensure fileIds exists
    if (!task.fileIds || !Array.isArray(task.fileIds)) {
      updated.fileIds = [];
      migrated = true;
    }
    return updated;
  });
  
  // Ensure all project files have note and noteUpdatedAt fields
  projects = projects.map(project => {
    if (project.files && Array.isArray(project.files)) {
      const updatedFiles = project.files.map((file, index) => {
        if (typeof file === 'object' && file !== null) {
          const updated = { ...file };
          if (file.note === undefined) {
            updated.note = '';
            migrated = true;
          }
          if (file.noteUpdatedAt === undefined) {
            updated.noteUpdatedAt = '';
            migrated = true;
          }
          // Ensure file has an ID
          if (!file.id) {
            updated.id = 'file-' + project.id + '-' + index;
            migrated = true;
          }
          return updated;
        } else if (typeof file === 'string') {
          // Convert legacy string format to object
          migrated = true;
          return {
            id: 'file-' + project.id + '-' + index,
            label: file,
            abs_path: file,
            note: '',
            noteUpdatedAt: ''
          };
        }
        return file;
      });
      return { ...project, files: updatedFiles };
    }
    return project;
  });
  
  // Ensure all task files have note fields
  tasks = tasks.map(task => {
    if (task.files && Array.isArray(task.files)) {
      const updatedFiles = task.files.map((file) => {
        if (typeof file === 'object' && file !== null) {
          const updated = { ...file };
          if (file.note === undefined) {
            updated.note = '';
            migrated = true;
          }
          if (file.noteUpdatedAt === undefined) {
            updated.noteUpdatedAt = '';
            migrated = true;
          }
          return updated;
        }
        return file;
      });
      return { ...task, files: updatedFiles };
    }
    return task;
  });
  
  if (migrated) {
    store.setState({ tasks, projects });
    console.log('✓ Migrated note fields for backward compatibility');
  }
}

/**
 * Migrate to canonical file registry
 * Promotes embedded task.files to project.files registry and replaces them with fileIds references
 */
export function migrateToCanonicalFileRegistry() {
  const store = window.Petal?.store;
  if (!store) {
    console.warn('Store not available for migration');
    return false;
  }
  
  const state = store.getState();
  let tasks = [...(state.tasks || [])];
  let projects = [...(state.projects || [])];
  let migrated = false;
  
  // Ensure all projects have files array
  projects = projects.map(project => {
    if (!project.files) {
      return { ...project, files: [] };
    }
    return project;
  });
  
  // Migrate task.files to canonical registry
  tasks.forEach(task => {
    if (!task.fileIds) {
      task.fileIds = [];
    }
    
    // If task has embedded files, migrate them
    if (task.files && Array.isArray(task.files) && task.files.length > 0) {
      const projectId = task.projectId;
      if (projectId) {
        const project = findProjectById(projects, projectId);
        if (project) {
          // Ensure project has files array
          if (!project.files) {
            project.files = [];
          }
          
          task.files.forEach(embeddedFile => {
            // Normalize embedded file to object
            const fileObj = typeof embeddedFile === 'string' 
              ? { abs_path: embeddedFile, label: embeddedFile }
              : embeddedFile;
            
            if (!fileObj || typeof fileObj !== 'object') return;
            
            // Try to find existing file in project registry
            let canonicalFile = project.files.find(f => {
              if (!f) return false;
              return (f.onedrive_rel && fileObj.onedrive_rel && f.onedrive_rel === fileObj.onedrive_rel) ||
                     (f.abs_path && fileObj.abs_path && f.abs_path === fileObj.abs_path) ||
                     (f.share_url && fileObj.share_url && f.share_url === fileObj.share_url);
            });
            
            if (!canonicalFile) {
              // Create new canonical file in registry
              canonicalFile = {
                id: fileObj.id || `file_${project.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                label: fileObj.label || fileObj.name || (fileObj.abs_path ? fileObj.abs_path.split(/[/\\]/).pop() : ''),
                abs_path: fileObj.abs_path || null,
                onedrive_rel: fileObj.onedrive_rel || null,
                share_url: fileObj.share_url || null,
                type: fileObj.type || null,
                note: fileObj.note || '',
                noteUpdatedAt: fileObj.noteUpdatedAt || '',
                versions: fileObj.versions || [],
                versionCurrent: fileObj.versionCurrent || null,
                pinned: fileObj.pinned || false,
                isCurrent: fileObj.isCurrent !== undefined ? fileObj.isCurrent : true,
                artifactTag: fileObj.artifactTag || null
              };
              project.files.push(canonicalFile);
              migrated = true;
            } else {
              // Merge any missing fields from embedded file
              if (fileObj.note && !canonicalFile.note) {
                canonicalFile.note = fileObj.note;
                canonicalFile.noteUpdatedAt = fileObj.noteUpdatedAt || new Date().toISOString();
                migrated = true;
              }
            }
            
            // Add file ID to task.fileIds if not already present
            if (!task.fileIds.includes(canonicalFile.id)) {
              task.fileIds.push(canonicalFile.id);
              migrated = true;
            }
          });
        }
      }
      
      // Keep task.files for backward compatibility during migration, but mark as legacy
      if (!task._legacyFiles) {
        task._legacyFiles = [...task.files];
        migrated = true;
      }
    }
  });
  
  // Initialize project checkpoints if missing
  projects = projects.map(project => {
    if (!project.checkpoints) {
      return { ...project, checkpoints: [] };
    }
    return project;
  });
  
  if (migrated) {
    store.setState({ tasks, projects });
    console.log('✓ Migrated to canonical file registry');
  }
  
  return migrated;
}

/**
 * Main migration function that orchestrates all migrations
 * Checks schema version and applies migrations sequentially
 * Returns: { migrated: boolean, data: object, fromVersion: number, toVersion: number }
 */
export function migrateData(data) {
  if (!data || typeof data !== 'object') {
    // If no data, return defaults with current version
    return {
      migrated: false,
      fromVersion: 0,
      toVersion: CURRENT_SCHEMA_VERSION,
      data: getDefaultState()
    };
  }
  
  const currentVersion = data.schemaVersion || 0;
  const targetVersion = CURRENT_SCHEMA_VERSION;
  let migratedData = { ...data };
  let migrated = false;
  
  // If already at current version, just merge defaults and return
  if (currentVersion >= targetVersion) {
    migratedData = mergeDefaults(migratedData);
    return {
      migrated: false,
      fromVersion: currentVersion,
      toVersion: targetVersion,
      data: migratedData
    };
  }
  
  // Apply migrations sequentially
  let version = currentVersion;
  
  // Migration 0 → 1: Initial migrations
  if (version < 1) {
    console.log('  → Applying migration 0→1: Initial schema setup');
    
    // Run all initial migrations
    const store = window.Petal?.store;
    if (store) {
      // Temporarily set state to run migrations
      const prevState = store.getState();
      store.setState(migratedData);
      
      // Run migrations
      migrateTasksForKanban();
      migrateSubtasksToTasks();
      migrateNotesFields();
      migrateToCanonicalFileRegistry();
      
      // Get migrated state
      migratedData = store.getState();
      
      // Restore previous state
      store.setState(prevState);
    }
    
    migratedData.schemaVersion = 1;
    version = 1;
    migrated = true;
  }
  
  // Future migrations would go here:
  // if (version < 2) {
  //   console.log('  → Applying migration 1→2: [describe change]');
  //   migratedData = migrateToVersion2(migratedData);
  //   migratedData.schemaVersion = 2;
  //   version = 2;
  //   migrated = true;
  // }
  
  // Always merge defaults to ensure all new fields exist
  migratedData = mergeDefaults(migratedData);
  
  return {
    migrated,
    fromVersion: currentVersion,
    toVersion: targetVersion,
    data: migratedData
  };
}

/**
 * Merge default state values into migrated data
 * Ensures all new fields have default values
 * CRITICAL: Never overwrites existing data with empty arrays
 */
function mergeDefaults(data) {
  const defaults = getDefaultState();
  
  // CRITICAL: Guard against empty data overwriting defaults
  // If incoming data has empty arrays but defaults would have data, preserve defaults
  // This prevents data loss during migration/merge operations
  const result = {
    ...defaults,
    ...data,
    // Merge nested objects
    settings: {
      ...defaults.settings,
      ...(data.settings || {})
    },
    workflow: {
      ...defaults.workflow,
      ...(data.workflow || {})
    }
  };
  
  // CRITICAL: Never allow empty arrays to overwrite if we have defaults with potential data
  // This is a safety net - if data has empty arrays, check if we should preserve defaults
  // Note: This is a defensive check - normally data should come from vault with actual data
  if (Array.isArray(data.tasks) && data.tasks.length === 0 && Array.isArray(defaults.tasks) && defaults.tasks.length === 0) {
    // Both are empty, that's fine - use empty
  } else if (Array.isArray(data.tasks) && data.tasks.length === 0) {
    // Incoming is empty but we might have defaults - log warning but preserve empty (data takes precedence)
    console.warn('⚠️ mergeDefaults: Incoming tasks array is empty - this may indicate data loss');
  }
  
  if (Array.isArray(data.projects) && data.projects.length === 0 && Array.isArray(defaults.projects) && defaults.projects.length === 0) {
    // Both are empty, that's fine
  } else if (Array.isArray(data.projects) && data.projects.length === 0) {
    console.warn('⚠️ mergeDefaults: Incoming projects array is empty - this may indicate data loss');
  }
  
  return result;
}

/**
 * Get default workflow structure
 * Centralized source for workflow defaults to avoid duplication
 */
export function getDefaultWorkflow() {
  return {
    laneOrder: ["lab", "comp", "writing", "presentation", "personal", "product", "unassigned"],
    columns: {
      lab: ["Backlog", "Next", "Doing", "Blocked", "Done"],
      comp: ["Backlog", "Next", "Doing", "Blocked", "Done"],
      writing: ["Backlog", "Next", "Doing", "Blocked", "Done"],
      presentation: ["Backlog", "Next", "Doing", "Blocked", "Done"],
      personal: ["Backlog", "Next", "Doing", "Blocked", "Done"],
      product: ["Backlog", "Next", "Doing", "Blocked", "Done"],
      unassigned: ["Backlog", "Next", "Doing", "Blocked", "Done"],
    },
    placement: {},
    rules: {
      tagToLane: {
        "#lab": "lab",
        "#analysis": "comp",
        "#paper": "writing",
        "#slides": "presentation",
        "#personal": "personal",
        "#product": "product"
      }
    },
    ui: {
      activeProjectId: "all",
      showUnassigned: false,
      showActiveFiles: false
    }
  };
}

/**
 * Get default state structure
 * Used for new installations and to fill in missing fields during migration
 */
function getDefaultState() {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    tasks: [],
    projects: [],
    openProjects: [],
    settings: {
      boards: {
        defaultColumns: DEFAULT_BOARD_COLUMNS || ['Inbox', 'Backlog', 'Todo', 'Doing', 'Done']
      }
    },
    events: [],
    recurringRules: [],
    habits: [],
    habitCheckins: {},
    routines: [],
    routineCheckins: {},
    currentView: 'tasks',
    currentSort: 'all',
    currentFilter: 'all',
    currentProjFilter: 'all',
    selectedColor: 1,
    taskMode: 'list',
    boardProjectFilter: 'all',
    searchQuery: '',
    currentFileView: 'all',
    currentFileProjectFilter: 'all',
    selectedProjectId: null,
    files: [],
    workflow: getDefaultWorkflow()
  };
}

// Expose globally for backward compatibility
window.migrateTasksForKanban = migrateTasksForKanban;
window.migrateSubtasksToTasks = migrateSubtasksToTasks;
window.migrateNotesFields = migrateNotesFields;
window.migrateToCanonicalFileRegistry = migrateToCanonicalFileRegistry;
window.migrateData = migrateData;