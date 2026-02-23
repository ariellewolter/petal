// ═══════════════════════ STATE STORE ═══════════════════════
// Centralized app state - single source of truth
// Uses getState/setState/subscribe pattern for clean separation

import { migrateData, CURRENT_SCHEMA_VERSION, getDefaultWorkflow } from '../utils/migrations.js';

class AppStore {
  constructor() {
    // Internal state (private)
    // Phase 3 Fix: openProjects stored as Array (not Set) for JSON compatibility
    this._isInitialLoad = true; // Track if this is the first loadState call
    this._state = {
      tasks: [],
      projects: [],
      openProjects: [], // Array, not Set
      settings: {},
      
      // Calendar data
      events: [],
      recurringRules: [],
      
      // Habits and routines (planner)
      habits: [],
      habitCheckins: {},
      routines: [],
      routineCheckins: {},
      
      // UI state
      currentView: 'today',
      currentSort: 'all',
      currentFilter: 'all',
      currentProjFilter: 'all',
      selectedColor: 1,
      taskMode: 'list',
      boardProjectFilter: 'all',
      searchQuery: '',
      currentFileView: 'all',
      currentFileProjectFilter: 'all', // For files view project filter
      selectedProjectId: null, // For matrix view
      
      // Planner UI state
      plannerViewDate: null, // Date object (stored as ISO string, converted on get/set)
      currentPlannerView: 'daily', // 'daily' or 'weekly'
      plannerWeekOffset: 0,
      plannerCalYear: null,
      plannerCalMonth: null,
      
      // File registry (derived/computed, not persisted)
      fileRegistry: {},
      fileHistory: {},
      
      // Persisted files list (authoritative user-added files)
      files: [],
      
      // Workflow state (use centralized defaults)
      workflow: getDefaultWorkflow()
    };
    
    // Listeners for state changes
    this._listeners = [];
  }
  
  /**
   * Get current state (returns a copy to prevent direct mutation)
   * Phase 3 Fix: openProjects is Array in store, renderers derive Set if needed
   * Converts plannerViewDate from ISO string to Date object
   */
  getState() {
    const state = {
      ...this._state,
      openProjects: Array.isArray(this._state.openProjects) 
        ? [...this._state.openProjects] // Clone Array
        : []
    };
    
    // Convert plannerViewDate from ISO string to Date object
    if (state.plannerViewDate) {
      if (typeof state.plannerViewDate === 'string') {
        state.plannerViewDate = new Date(state.plannerViewDate);
      } else if (state.plannerViewDate instanceof Date) {
        state.plannerViewDate = new Date(state.plannerViewDate);
      }
    } else {
      // Initialize with today's date if not set
      state.plannerViewDate = new Date();
    }
    
    // Initialize plannerCalYear and plannerCalMonth if not set
    if (state.plannerCalYear === null || state.plannerCalMonth === null) {
      const now = new Date();
      state.plannerCalYear = now.getFullYear();
      state.plannerCalMonth = now.getMonth();
    }
    
    return state;
  }
  
  /**
   * Update state (merges partial update and notifies listeners)
   * Phase 3 Fix: Normalize openProjects to Array (accepts Set or Array)
   * Release-Safe: Files regression guard prevents accidental file clearing
   */
  setState(partial) {
    const prev = this._state;
    const prevFilesCount = prev.files?.length ?? 0;
    
    // Release-Safe: Files regression guard - prevent accidental clobber of files
    // If patch includes files but it's invalid (not an array), block it
    if (Object.prototype.hasOwnProperty.call(partial, 'files')) {
      if (!Array.isArray(partial.files)) {
        console.warn('⚠️ Blocked invalid files patch:', {
          type: typeof partial.files,
          value: partial.files,
          patchKeys: Object.keys(partial)
        });
        // Remove invalid files from patch
        const { files, ...safePatch } = partial;
        partial = safePatch;
      } else {
        // Release-Safe: Trace ANY explicit files patch to catch who's clearing files
        const newLen = partial.files.length;
        console.log('🧨 files explicitly patched', {
          newLen: newLen,
          prevLen: prevFilesCount,
          willDecrease: newLen < prevFilesCount,
          willClear: newLen === 0 && prevFilesCount > 0,
          patchKeys: Object.keys(partial)
        });
        console.trace('files patch trace');
        
        // Extra protection: Block clearing files without explicit allow flag
        const allow = partial.__allowFilesOverwrite === true;
        if (!allow && newLen === 0 && prevFilesCount > 0) {
          console.warn('⚠️ Blocked files clear without explicit allow flag', {
            prevCount: prevFilesCount,
            patchKeys: Object.keys(partial),
            stackTrace: new Error().stack
          });
          // Remove files from patch to prevent clearing
          const { files, ...rest } = partial;
          partial = rest;
          // Don't update files count - keep previous
        }
      }
    }
    
    // Merge partial update
    Object.keys(partial).forEach(key => {
      if (key === 'openProjects') {
        // Normalize: accept Set or Array, store as Array
        if (partial[key] instanceof Set) {
          this._state[key] = Array.from(partial[key]);
        } else if (Array.isArray(partial[key])) {
          this._state[key] = partial[key];
        } else {
          this._state[key] = [];
        }
      } else if (key === 'plannerViewDate') {
        // Convert Date object to ISO string for storage
        if (partial[key] instanceof Date) {
          this._state[key] = partial[key].toISOString();
        } else if (typeof partial[key] === 'string') {
          this._state[key] = partial[key];
        } else if (partial[key] === null) {
          this._state[key] = null;
        } else {
          // Invalid value, keep current or set to today
          this._state[key] = new Date().toISOString();
        }
      } else {
        this._state[key] = partial[key];
      }
    });
    
    // Release-Safe: Detect unexpected files drops (files cleared without explicit patch)
    const nextFilesCount = this._state.files?.length ?? 0;
    if (prevFilesCount > 0 && nextFilesCount === 0 && !Object.prototype.hasOwnProperty.call(partial, 'files')) {
      console.warn('⚠️ files dropped without explicit patch.files — blocking overwrite', {
        prevCount: prevFilesCount,
        patchKeys: Object.keys(partial),
        stackTrace: new Error().stack
      });
      // Restore previous files
      this._state.files = prev.files;
    }
    
    // Diagnostic: Log when files count changes (helps identify the offender)
    const finalFilesCount = this._state.files?.length ?? 0;
    if (prevFilesCount !== finalFilesCount) {
      console.log('🧪 files count changed', {
        prev: prevFilesCount,
        next: finalFilesCount,
        patchKeys: Object.keys(partial),
        explicitFilesPatch: Object.prototype.hasOwnProperty.call(partial, 'files')
      });
      // Only show trace if files decreased (potential bug)
      if (finalFilesCount < prevFilesCount) {
        console.trace('Files count decreased - trace:');
      }
    }
    
    // Notify all listeners
    this._notify();
  }
  
  /**
   * Update ephemeral state (computed/cached data that shouldn't trigger saves)
   * Phase 3 Fix: Prevents save spam from fileRegistry/fileHistory updates during render
   * Updates state without triggering notifications (no persistence save)
   */
  setEphemeralState(partial) {
    // Merge partial update (same as setState, but no notification)
    Object.keys(partial).forEach(key => {
      if (key === 'openProjects') {
        // Normalize: accept Set or Array, store as Array
        if (partial[key] instanceof Set) {
          this._state[key] = Array.from(partial[key]);
        } else if (Array.isArray(partial[key])) {
          this._state[key] = partial[key];
        } else {
          this._state[key] = [];
        }
      } else {
        this._state[key] = partial[key];
      }
    });
    // No _notify() call - this prevents persistence saves
  }
  
  /**
   * Subscribe to state changes
   * Returns unsubscribe function
   */
  subscribe(listener) {
    this._listeners.push(listener);
    return () => {
      this._listeners = this._listeners.filter(l => l !== listener);
    };
  }
  
  /**
   * Notify all listeners of state change
   */
  _notify() {
    const state = this.getState();
    this._listeners.forEach(listener => {
      try {
        listener(state);
      } catch (error) {
        console.error('Store listener error:', error);
      }
    });
  }
  
  /**
   * Load state from storage (for initialization)
   * GUARANTEE: Always initializes fileRegistry and fileHistory (never undefined)
   * Phase 3 Fix: Prevents empty overwrites and normalizes openProjects to Array
   * Release-Safe: Runs migrations and merges defaults to handle schema changes
   */
  loadState(state) {
    // Run migrations if needed (handles schema versioning)
    const migrationResult = migrateData(state);
    if (migrationResult.migrated) {
      console.log(`🔄 Schema migration applied: ${migrationResult.fromVersion} → ${migrationResult.toVersion}`);
      // Store migration info for potential backup creation
      this._lastMigration = migrationResult;
    }
    // Use migrated data (which already has defaults merged)
    state = migrationResult.data;
    
    // CRITICAL: Log what we're receiving, especially on initial load
    const incomingProjects = Array.isArray(state.projects) ? state.projects : [];
    const incomingTasks = Array.isArray(state.tasks) ? state.tasks : [];
    const incomingFiles = Array.isArray(state.files) ? state.files : [];
    
    if (this._isInitialLoad) {
      console.log('🔍 INITIAL LOAD - Incoming data:', {
        tasks: incomingTasks.length,
        projects: incomingProjects.length,
        files: incomingFiles.length,
        hasSettings: !!state.settings,
        hasCellLog: !!(state.settings?.cellLog),
        cellLogEntries: state.settings?.cellLog?.entries?.length || 0
      });
      
      // CRITICAL: If initial load has empty data, this is suspicious
      // The vault file should have data - if we're getting empty, something is wrong
      if (incomingTasks.length === 0 && incomingProjects.length === 0 && incomingFiles.length === 0) {
        console.error('❌ CRITICAL: Initial load received EMPTY data! This should not happen if vault has data.');
        console.error('   This may indicate:');
        console.error('   1. Vault file was not read correctly');
        console.error('   2. Data was lost during migration');
        console.error('   3. Data was lost during storage adapter transfer');
        console.error('   Check the console logs above for where data was lost.');
      }
    }
    
    // CRITICAL: Guard against empty data overwrites
    // Never replace existing data with empty arrays unless explicitly allowed
    // This prevents data loss from bad saves, external modifications, or corrupted loads
    
    // Guard projects
    const currentProjects = this._state.projects || [];
    if (incomingProjects.length === 0 && currentProjects.length > 0) {
      console.warn('⚠️ BLOCKED empty project overwrite - preserving existing projects');
      state.projects = currentProjects;
    }
    
    // Guard tasks
    const currentTasks = this._state.tasks || [];
    if (incomingTasks.length === 0 && currentTasks.length > 0) {
      console.warn('⚠️ BLOCKED empty task overwrite - preserving existing tasks');
      state.tasks = currentTasks;
    }
    
    // Guard files
    const currentFiles = this._state.files || [];
    if (incomingFiles.length === 0 && currentFiles.length > 0) {
      console.warn('⚠️ BLOCKED empty files overwrite - preserving existing files');
      state.files = currentFiles;
    }
    
    // Guard cellLog entries
    const incomingCellLog = state.settings?.cellLog;
    const currentCellLog = this._state.settings?.cellLog;
    if (incomingCellLog && currentCellLog) {
      const incomingEntries = Array.isArray(incomingCellLog.entries) ? incomingCellLog.entries : [];
      const currentEntries = Array.isArray(currentCellLog.entries) ? currentCellLog.entries : [];
      if (incomingEntries.length === 0 && currentEntries.length > 0) {
        console.warn('⚠️ BLOCKED empty cellLog entries overwrite - preserving existing entries');
        state.settings = state.settings || {};
        state.settings.cellLog = state.settings.cellLog || {};
        state.settings.cellLog.entries = currentEntries;
        // Also preserve cellTypes and mediaTypes if they exist
        if (currentCellLog.cellTypes && (!incomingCellLog.cellTypes || incomingCellLog.cellTypes.length === 0)) {
          state.settings.cellLog.cellTypes = currentCellLog.cellTypes;
        }
        if (currentCellLog.mediaTypes && (!incomingCellLog.mediaTypes || incomingCellLog.mediaTypes.length === 0)) {
          state.settings.cellLog.mediaTypes = currentCellLog.mediaTypes;
        }
      }
    }
    
    // Phase 3 Fix: Normalize openProjects to Array (JSON-friendly, single representation)
    // Store always uses Array, renderers derive Set locally if needed
    let openProjectsArray = Array.isArray(state.openProjects) 
      ? state.openProjects 
      : (state.openProjects instanceof Set ? Array.from(state.openProjects) : []);
    
    // Release-Safe: Filter out openProjects IDs that don't exist in projects
    // Prevents stale references from breaking the UI
    const projectIds = new Set((state.projects || []).map(p => p.id));
    openProjectsArray = openProjectsArray.filter(id => projectIds.has(id));
    if (openProjectsArray.length !== (state.openProjects?.length || 0)) {
      console.log(`🧹 Cleaned openProjects: removed ${(state.openProjects?.length || 0) - openProjectsArray.length} non-existent project IDs`);
    }
    
    // Release-Safe: Guard against duplicate tasks (prevent seeding issues)
    // Remove duplicate tasks by ID (keep first occurrence)
    const tasks = Array.isArray(state.tasks) ? state.tasks : [];
    const seenTaskIds = new Set();
    const uniqueTasks = tasks.filter(task => {
      if (!task || !task.id) return false;
      if (seenTaskIds.has(task.id)) {
        console.warn(`⚠️ Duplicate task detected (ID: ${task.id}, title: "${task.title}") - keeping first occurrence`);
        return false;
      }
      seenTaskIds.add(task.id);
      return true;
    });
    if (uniqueTasks.length !== tasks.length) {
      console.log(`🧹 Cleaned tasks: removed ${tasks.length - uniqueTasks.length} duplicate tasks`);
    }
    
    // Release-Safe: Guard against overwriting existing cellLog data with empty data
    // Preserve existing cellLog entries if incoming data has empty cellLog
    let settingsToLoad = state.settings || {};
    const currentSettings = this._state.settings || {};
    if (currentSettings.cellLog && typeof currentSettings.cellLog === 'object') {
      const currentEntries = Array.isArray(currentSettings.cellLog.entries) ? currentSettings.cellLog.entries : [];
      const incomingCellLog = settingsToLoad.cellLog;
      if (incomingCellLog && typeof incomingCellLog === 'object') {
        const incomingEntries = Array.isArray(incomingCellLog.entries) ? incomingCellLog.entries : [];
        // If we have existing entries but incoming has none, preserve existing
        if (currentEntries.length > 0 && incomingEntries.length === 0) {
          console.warn('⚠️ BLOCKED empty cellLog overwrite - preserving existing cellLog entries');
          settingsToLoad = {
            ...settingsToLoad,
            cellLog: {
              ...incomingCellLog,
              entries: currentEntries,
              cellTypes: Array.isArray(incomingCellLog.cellTypes) && incomingCellLog.cellTypes.length > 0 
                ? incomingCellLog.cellTypes 
                : (Array.isArray(currentSettings.cellLog.cellTypes) ? currentSettings.cellLog.cellTypes : []),
              mediaTypes: Array.isArray(incomingCellLog.mediaTypes) && incomingCellLog.mediaTypes.length > 0 
                ? incomingCellLog.mediaTypes 
                : (Array.isArray(currentSettings.cellLog.mediaTypes) ? currentSettings.cellLog.mediaTypes : [])
            }
          };
        }
      }
    }
    
    this._state = {
      tasks: uniqueTasks,
      projects: state.projects || [],
      openProjects: openProjectsArray, // Store as Array, not Set
      settings: settingsToLoad,
      events: state.events || [],
      recurringRules: state.recurringRules || [],
      habits: Array.isArray(state.habits) ? state.habits : [],
      habitCheckins: state.habitCheckins && typeof state.habitCheckins === 'object' ? state.habitCheckins : {},
      routines: Array.isArray(state.routines) ? state.routines : [],
      routineCheckins: state.routineCheckins && typeof state.routineCheckins === 'object' ? state.routineCheckins : {},
      currentView: state.currentView || 'today',
      currentSort: state.currentSort || 'all',
      currentFilter: state.currentFilter || 'all',
      currentProjFilter: state.currentProjFilter || 'all',
      selectedColor: state.selectedColor || 1,
      taskMode: state.taskMode || 'list',
      boardProjectFilter: state.boardProjectFilter || 'all',
      searchQuery: state.searchQuery || '',
      currentFileView: state.currentFileView || 'all',
      currentFileProjectFilter: state.currentFileProjectFilter || 'all',
      selectedProjectId: state.selectedProjectId || null,
      // GUARANTEE: Always objects, never undefined
      fileRegistry: state.fileRegistry && typeof state.fileRegistry === 'object' ? state.fileRegistry : {},
      fileHistory: state.fileHistory && typeof state.fileHistory === 'object' ? state.fileHistory : {},
      // Persisted files list (authoritative)
      files: Array.isArray(state.files) ? state.files : [],
      // Workflow state (with defaults from centralized source)
      workflow: state.workflow ? {
            laneOrder: Array.isArray(state.workflow.laneOrder) ? state.workflow.laneOrder : getDefaultWorkflow().laneOrder,
            columns: state.workflow.columns && typeof state.workflow.columns === 'object' ? state.workflow.columns : getDefaultWorkflow().columns,
            placement: state.workflow.placement && typeof state.workflow.placement === 'object' ? state.workflow.placement : getDefaultWorkflow().placement,
            rules: state.workflow.rules && typeof state.workflow.rules === 'object' ? state.workflow.rules : getDefaultWorkflow().rules,
            ui: state.workflow.ui && typeof state.workflow.ui === 'object' ? {
              activeProjectId: state.workflow.ui.activeProjectId || getDefaultWorkflow().ui.activeProjectId,
              showUnassigned: state.workflow.ui.showUnassigned !== undefined ? state.workflow.ui.showUnassigned : getDefaultWorkflow().ui.showUnassigned,
              showActiveFiles: state.workflow.ui.showActiveFiles !== undefined ? state.workflow.ui.showActiveFiles : getDefaultWorkflow().ui.showActiveFiles
            } : getDefaultWorkflow().ui
          } : getDefaultWorkflow()
        };
        
        // Mark initial load as complete
        if (this._isInitialLoad) {
          this._isInitialLoad = false;
          console.log('✓ Initial load complete. Store now has:', {
            tasks: this._state.tasks.length,
            projects: this._state.projects.length,
            files: this._state.files.length
          });
        }
        
        this._notify();
  }
  
  /**
   * Ensure registry is initialized (defensive check)
   * Call this at app startup to guarantee registry exists
   */
  ensureRegistryInitialized() {
    if (!this._state.fileRegistry || typeof this._state.fileRegistry !== 'object') {
      this._state.fileRegistry = {};
    }
    if (!this._state.fileHistory || typeof this._state.fileHistory !== 'object') {
      this._state.fileHistory = {};
    }
  }
  
  /**
   * Export state for saving to storage
   * Phase 3 Fix: openProjects is already Array, no conversion needed
   * Phase 3 Fix: Exclude fileRegistry/fileHistory from persistence (derived data, recomputed on load)
   * Release-Safe: Always includes schemaVersion for migration tracking
   */
  exportState() {
    // Release-Safe: Truth log - this is the save payload source
    const filesCount = Array.isArray(this._state.files) ? this._state.files.length : 'not-array';
    const firstFile = this._state.files?.[0]?.name ?? null;
    console.log('📦 exportState snapshot', {
      files: filesCount,
      first: firstFile,
      filesType: typeof this._state.files,
      filesIsArray: Array.isArray(this._state.files)
    });
    
    return {
      schemaVersion: CURRENT_SCHEMA_VERSION, // Always include current schema version
      tasks: this._state.tasks,
      projects: this._state.projects,
      openProjects: Array.isArray(this._state.openProjects) 
        ? this._state.openProjects 
        : [],
      settings: this._state.settings,
      events: this._state.events,
      recurringRules: this._state.recurringRules,
      habits: Array.isArray(this._state.habits) ? this._state.habits : [],
      habitCheckins: this._state.habitCheckins && typeof this._state.habitCheckins === 'object' ? this._state.habitCheckins : {},
      routines: Array.isArray(this._state.routines) ? this._state.routines : [],
      routineCheckins: this._state.routineCheckins && typeof this._state.routineCheckins === 'object' ? this._state.routineCheckins : {},
      files: Array.isArray(this._state.files) ? this._state.files : [],
      workflow: this._state.workflow || getDefaultWorkflow()
      // Phase 3 Fix: fileRegistry and fileHistory are derived data, recomputed on load
      // Excluding them prevents noisy saves and reduces file size
      // fileRegistry: this._state.fileRegistry,
      // fileHistory: this._state.fileHistory
    };
  }
  
  /**
   * Get last migration info (for backup creation)
   */
  getLastMigration() {
    return this._lastMigration || null;
  }
}

// Create singleton instance
export const appStore = new AppStore();
