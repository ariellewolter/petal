// ═══════════════════════ DATA MIGRATIONS ═══════════════════════
// Functions to migrate data structures between versions

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
