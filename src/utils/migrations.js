// ═══════════════════════ DATA MIGRATIONS ═══════════════════════
// Functions to migrate data structures between versions

// ═══════════════════════ SCHEMA VERSIONING ═══════════════════════
// Current schema version - increment this when making breaking changes
export const CURRENT_SCHEMA_VERSION = 1;

/**
 * Get default state structure for current schema version
 * This ensures new keys are merged with defaults instead of replacing whole objects
 */
export function getDefaultState() {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    tasks: [],
    projects: [],
    openProjects: [],
    settings: {},
    events: [],
    recurringRules: [],
    habits: [],
    habitCheckins: {},
    routines: [],
    routineCheckins: {},
    files: [],
    workflow: {
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
    }
  };
}

/**
 * Merge loaded state with defaults to ensure new keys are added safely
 * This prevents data loss when new features add new keys to existing objects
 */
export function mergeWithDefaults(loadedState) {
  const defaults = getDefaultState();
  const merged = { ...defaults };
  
  // Merge top-level arrays and objects
  Object.keys(defaults).forEach(key => {
    if (key === 'schemaVersion') {
      // Always use loaded version (or default if missing)
      merged[key] = loadedState[key] || defaults[key];
    } else if (Array.isArray(defaults[key])) {
      // Arrays: use loaded if present, otherwise default
      merged[key] = Array.isArray(loadedState[key]) ? loadedState[key] : defaults[key];
    } else if (typeof defaults[key] === 'object' && defaults[key] !== null) {
      // Objects: deep merge
      merged[key] = { ...defaults[key], ...(loadedState[key] || {}) };
      
      // Special handling for nested objects (like workflow)
      if (key === 'workflow' && loadedState.workflow) {
        merged.workflow = {
          laneOrder: Array.isArray(loadedState.workflow.laneOrder) 
            ? loadedState.workflow.laneOrder 
            : defaults.workflow.laneOrder,
          columns: { ...defaults.workflow.columns, ...(loadedState.workflow.columns || {}) },
          placement: { ...defaults.workflow.placement, ...(loadedState.workflow.placement || {}) },
          rules: { ...defaults.workflow.rules, ...(loadedState.workflow.rules || {}) },
          ui: { ...defaults.workflow.ui, ...(loadedState.workflow.ui || {}) }
        };
      }
    } else {
      // Primitives: use loaded if present, otherwise default
      merged[key] = loadedState[key] !== undefined ? loadedState[key] : defaults[key];
    }
  });
  
  // Preserve any extra keys from loaded state (for forward compatibility)
  Object.keys(loadedState).forEach(key => {
    if (!(key in defaults)) {
      merged[key] = loadedState[key];
    }
  });
  
  return merged;
}

/**
 * Migrate data from one schema version to another
 * Returns: { migrated: boolean, data: object, fromVersion: number, toVersion: number }
 */
export function migrateData(data) {
  const loadedVersion = data.schemaVersion || 0; // 0 = no version (legacy data)
  const targetVersion = CURRENT_SCHEMA_VERSION;
  
  if (loadedVersion === targetVersion) {
    // Already at current version, just merge defaults
    return {
      migrated: false,
      data: mergeWithDefaults(data),
      fromVersion: loadedVersion,
      toVersion: targetVersion
    };
  }
  
  // Migration chain: apply each migration in order
  let migratedData = { ...data };
  let currentVersion = loadedVersion;
  
  console.log(`🔄 Migrating data from schema version ${currentVersion} to ${targetVersion}`);
  
  // Migration 0 → 1: Add schemaVersion and ensure all default keys exist
  if (currentVersion < 1) {
    console.log('  → Applying migration 0→1: Adding schemaVersion and default keys');
    migratedData = mergeWithDefaults(migratedData);
    migratedData.schemaVersion = 1;
    currentVersion = 1;
  }
  
  // Future migrations go here:
  // if (currentVersion < 2) {
  //   migratedData = migrateToVersion2(migratedData);
  //   currentVersion = 2;
  // }
  
  if (currentVersion !== targetVersion) {
    console.error(`❌ Migration incomplete: ended at version ${currentVersion}, target is ${targetVersion}`);
    // Still return merged data to prevent crashes
    return {
      migrated: true,
      data: mergeWithDefaults(migratedData),
      fromVersion: loadedVersion,
      toVersion: currentVersion,
      incomplete: true
    };
  }
  
  console.log(`✅ Migration complete: ${loadedVersion} → ${targetVersion}`);
  
  return {
    migrated: true,
    data: migratedData,
    fromVersion: loadedVersion,
    toVersion: targetVersion
  };
}

/**
 * Migrate tasks for Kanban board (ensure boardOrder exists)
 */
export function migrateTasksForKanban(tasks, settings, DEFAULT_BOARD_COLUMNS) {
  ensureBoardSettings(settings, DEFAULT_BOARD_COLUMNS);
  const orderByColumn = {};
  getBoardColumns(settings, DEFAULT_BOARD_COLUMNS).forEach((c, idx) => {
    orderByColumn[c] = (idx + 1) * 1024;
  });
  
  return tasks.map((t) => {
    const status = getBoardColumns(settings, DEFAULT_BOARD_COLUMNS).includes(t.status) 
      ? t.status 
      : (t.done ? 'Done' : 'Todo');
    const projectId = normalizeProjectIdValue(t.projectId);
    let boardOrder = Number(t.boardOrder);
    if (!Number.isFinite(boardOrder)) {
      boardOrder = orderByColumn[status] || 1024;
      orderByColumn[status] = boardOrder + 1024;
    }
    return { ...t, status, projectId, boardOrder };
  });
}

/**
 * Ensure board settings exist
 */
function ensureBoardSettings(settings, DEFAULT_BOARD_COLUMNS) {
  if (!settings || typeof settings !== 'object') settings = {};
  if (!settings.boards || typeof settings.boards !== 'object') settings.boards = {};
  if (!Array.isArray(settings.boards.defaultColumns) || settings.boards.defaultColumns.length === 0) {
    settings.boards.defaultColumns = [...DEFAULT_BOARD_COLUMNS];
  }
  if (!settings.boards.projectBoards || typeof settings.boards.projectBoards !== 'object') {
    settings.boards.projectBoards = {};
  }
}

/**
 * Get board columns
 */
function getBoardColumns(settings, DEFAULT_BOARD_COLUMNS) {
  ensureBoardSettings(settings, DEFAULT_BOARD_COLUMNS);
  return settings.boards.defaultColumns;
}

/**
 * Normalize project ID value
 */
function normalizeProjectIdValue(value) {
  if (value === undefined || value === null || value === '') return '';
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : String(value);
}

/**
 * Migrate notes fields to ensure all tasks have note, noteUpdatedAt, and log
 */
export function migrateNotesFields(tasks, projects) {
  let migrated = false;
  
  // Ensure all tasks have note, noteUpdatedAt, and log fields
  tasks.forEach(task => {
    if (task.note === undefined) {
      task.note = '';
      migrated = true;
    }
    if (task.noteUpdatedAt === undefined) {
      task.noteUpdatedAt = null;
      migrated = true;
    }
    if (!task.log || !Array.isArray(task.log)) {
      task.log = [];
      migrated = true;
    }
    // Ensure fileIds exists
    if (!task.fileIds || !Array.isArray(task.fileIds)) {
      task.fileIds = [];
      migrated = true;
    }
  });
  
  // Ensure all project files have note and noteUpdatedAt fields
  projects.forEach(project => {
    if (project.files && Array.isArray(project.files)) {
      project.files.forEach((file, index) => {
        if (typeof file === 'object' && file !== null) {
          if (file.note === undefined) {
            file.note = '';
            migrated = true;
          }
          if (file.noteUpdatedAt === undefined) {
            file.noteUpdatedAt = '';
            migrated = true;
          }
          // Ensure file has an ID
          if (!file.id) {
            file.id = 'file-' + project.id + '-' + index;
            migrated = true;
          }
        }
      });
    }
  });
  
  return migrated;
}
