// ═══════════════════════ STORAGE ADAPTER ═══════════════════════
// Abstract storage layer - uses file system in Electron, localStorage in browser

// Debug: Identify which storage.js is actually running
console.log("✅ storage.js loaded from:", document.currentScript && document.currentScript.src);
console.log("✅ storage.js version marker:", "2026-02-20-A");

// Global guard function to prevent markStateSaved errors
// This ensures even old code won't crash if markStateSaved is called
window.markStateSaved = window.markStateSaved || function () {
  // Silently do nothing - this is just a guard to prevent crashes
  console.debug('markStateSaved called (no-op guard)');
};

class StorageAdapter {
  constructor() {
    this.listeners = [];
    this.isElectron = typeof window !== 'undefined' && window.electronAPI;
    this.loading = false;
    this.pendingSave = null;
  }

  // Load all state from storage
  async loadState() {
    if (this.isElectron) {
      // Electron: load from JSON file (returns conflict info too)
      try {
        const result = await window.electronAPI.loadState();
        // Check if result has conflict info (new format) or just data (old format)
        if (result.data !== undefined) {
          // New format with conflict info
          // Preserve all fields from vault, ensure defaults for missing ones
          result.data = {
            tasks: result.data.tasks || [],
            projects: result.data.projects || [],
            openProjects: result.data.openProjects || [],
            settings: result.data.settings || {},
            files: result.data.files || [], // ✅ Persisted files list
            fileHistory: result.data.fileHistory || {},
            fileRegistry: result.data.fileRegistry || {},
            events: result.data.events || [],
            recurringRules: result.data.recurringRules || [],
            habits: result.data.habits || [],
            habitCheckins: result.data.habitCheckins || {},
            routines: result.data.routines || [],
            routineCheckins: result.data.routineCheckins || {},
            workflow: result.data.workflow || {}
          };
          // Debug: Log what we're passing through
          console.log('📥 storage.js: Data from vault:', {
            tasks: result.data.tasks.length,
            projects: result.data.projects.length,
            files: result.data.files.length,
            hasSettings: !!result.data.settings,
            hasCellLog: !!(result.data.settings?.cellLog),
            cellLogEntries: result.data.settings?.cellLog?.entries?.length || 0
          });
          return result;
        } else {
          // Old format, wrap it
          return {
            data: {
              tasks: result.tasks || [],
              projects: result.projects || [],
              openProjects: result.openProjects || [],
              settings: result.settings || {},
              files: result.files || [], // ✅ Persisted files list
              fileHistory: result.fileHistory || {},
              fileRegistry: result.fileRegistry || {},
              events: result.events || [],
              recurringRules: result.recurringRules || []
            },
            hasConflicts: false,
            conflicts: [],
            newerConflicts: []
          };
        }
      } catch (e) {
        console.error('Error loading state from file:', e);
        return {
          data: { 
            tasks: [], 
            projects: [], 
            openProjects: [], 
            settings: {},
            files: [], // ✅ Persisted files list
            fileHistory: {},
            fileRegistry: {},
            events: [],
            recurringRules: []
          },
          hasConflicts: false,
          conflicts: [],
          newerConflicts: []
        };
      }
    } else {
      // Browser: load from localStorage
      try {
        return {
          tasks: JSON.parse(localStorage.getItem('petal-tasks') || '[]'),
          projects: JSON.parse(localStorage.getItem('petal-projects') || '[]'),
          openProjects: JSON.parse(localStorage.getItem('petal-open-proj') || '[]'),
          settings: JSON.parse(localStorage.getItem('petal-settings') || '{}'),
          files: JSON.parse(localStorage.getItem('petal-files') || '[]'),
          fileHistory: JSON.parse(localStorage.getItem('petal-file-history') || '{}'),
          fileRegistry: JSON.parse(localStorage.getItem('petal-file-registry') || '{}'),
          events: JSON.parse(localStorage.getItem('petal-events') || '[]'),
          recurringRules: JSON.parse(localStorage.getItem('petal-recurring-rules') || '[]'),
          habits: JSON.parse(localStorage.getItem('petal-habits') || '[]'),
          habitCheckins: JSON.parse(localStorage.getItem('petal-habit-checkins') || '{}'),
          routines: JSON.parse(localStorage.getItem('petal-routines') || '[]'),
          routineCheckins: JSON.parse(localStorage.getItem('petal-routine-checkins') || '{}'),
          workflow: JSON.parse(localStorage.getItem('petal-workflow') || '{}')
        };
      } catch (e) {
        console.error('Error loading state:', e);
        return { 
          tasks: [], 
          projects: [], 
          openProjects: [], 
          settings: {},
          files: [],
          fileHistory: {},
          fileRegistry: {},
          events: [],
          recurringRules: [],
          habits: [],
          habitCheckins: {},
          routines: [],
          routineCheckins: {},
          workflow: {}
        };
      }
    }
  }

  // Save all state to storage
  // Returns: {ok: true} on success, {ok: false, error: string} on failure
  // Pure persistence module - no UI dependencies
  async saveState(state) {
    if (this.isElectron) {
      // Electron: save to JSON file via IPC
      try {
        // Release-Safe: Log what we're about to send to main process
        const filesCount = Array.isArray(state.files) ? state.files.length : (state.files !== undefined ? typeof state.files : 'undefined');
        console.log('📤 storage.js saveState payload', {
          files: filesCount,
          filesFirst: state.files?.[0]?.name ?? null,
          stateKeys: Object.keys(state),
          hasFiles: 'files' in state
        });
        
        const result = await window.electronAPI.saveState({
          schemaVersion: state.schemaVersion, // ✅ Include schema version
          tasks: state.tasks || [],
          projects: state.projects || [],
          openProjects: state.openProjects || [],
          settings: state.settings || {},
          events: state.events || [],
          recurringRules: state.recurringRules || [],
          habits: state.habits || [],
          habitCheckins: state.habitCheckins || {},
          routines: state.routines || [],
          routineCheckins: state.routineCheckins || {},
          files: state.files || [], // ✅ Persisted files list
          workflow: state.workflow || {},
          // Note: fileHistory and fileRegistry are derived data, but including for backward compatibility
          // They will be excluded from exportState() but may be in state object
          fileHistory: state.fileHistory || {},
          fileRegistry: state.fileRegistry || {}
        });
        
        // Handle new format: {ok: true/false, error?: string}
        if (result && result.ok === true) {
          // Success - notify listeners (guard against errors in callbacks)
          this.listeners.forEach(cb => {
            try {
              cb(state);
            } catch (listenerError) {
              console.error('Error in storage listener callback:', listenerError);
            }
          });
          return { ok: true };
        } else {
          // Failure - return error (caller handles UI)
          const errorMsg = result?.error || 'Unknown save error';
          console.error('❌ Save failed:', errorMsg);
          return { ok: false, error: errorMsg };
        }
      } catch (e) {
        console.error('Error saving state to file:', e);
        return { ok: false, error: e.message || 'Unknown error' };
      }
    } else {
      // Browser: save to localStorage
      try {
        localStorage.setItem('petal-tasks', JSON.stringify(state.tasks || []));
        localStorage.setItem('petal-projects', JSON.stringify(state.projects || []));
        localStorage.setItem('petal-open-proj', JSON.stringify(state.openProjects || []));
        localStorage.setItem('petal-settings', JSON.stringify(state.settings || {}));
        localStorage.setItem('petal-events', JSON.stringify(state.events || []));
        localStorage.setItem('petal-recurring-rules', JSON.stringify(state.recurringRules || []));
        localStorage.setItem('petal-files', JSON.stringify(state.files || []));
        localStorage.setItem('petal-file-history', JSON.stringify(state.fileHistory || {}));
        localStorage.setItem('petal-file-registry', JSON.stringify(state.fileRegistry || {}));
        localStorage.setItem('petal-habits', JSON.stringify(state.habits || []));
        localStorage.setItem('petal-habit-checkins', JSON.stringify(state.habitCheckins || {}));
        localStorage.setItem('petal-routines', JSON.stringify(state.routines || []));
        localStorage.setItem('petal-routine-checkins', JSON.stringify(state.routineCheckins || {}));
        localStorage.setItem('petal-workflow', JSON.stringify(state.workflow || {}));
        
        // Notify listeners of changes
        this.listeners.forEach(cb => {
          try {
            cb(state);
          } catch (listenerError) {
            console.error('Error in storage listener callback:', listenerError);
          }
        });
        return { ok: true };
      } catch (e) {
        console.error('Error saving state:', e);
        return { ok: false, error: e.message || 'Unknown error' };
      }
    }
  }

  // Subscribe to state changes (for future real-time sync)
  subscribe(onChange) {
    this.listeners.push(onChange);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== onChange);
    };
  }

  // Export state as JSON string
  exportState(state) {
    const openProjects = Array.isArray(state.openProjects)
      ? state.openProjects
      : (state.openProjects instanceof Set ? Array.from(state.openProjects) : []);

    return JSON.stringify({
      schemaVersion: state.schemaVersion ?? 1,
      tasks: state.tasks || [],
      projects: state.projects || [],
      openProjects,
      settings: state.settings || {},
      events: state.events || [],
      recurringRules: state.recurringRules || [],
      habits: state.habits || [],
      habitCheckins: state.habitCheckins || {},
      routines: state.routines || [],
      routineCheckins: state.routineCheckins || {},
      files: state.files || [],
      workflow: state.workflow || {},
      fileHistory: state.fileHistory || {},
      fileRegistry: state.fileRegistry || {},
      exportedAt: new Date().toISOString(),
      version: '1.0'
    }, null, 2);
  }

  // Import state from JSON string
  async importState(jsonString, merge = false) {
    try {
      const imported = JSON.parse(jsonString);
      const currentLoad = await this.loadState();
      const current = currentLoad.data ? currentLoad.data : currentLoad;
      
      if (merge) {
        // Merge: combine arrays, prefer imported for conflicts
        return {
          tasks: [...(current.tasks || []), ...(imported.tasks || [])],
          projects: [...(current.projects || []), ...(imported.projects || [])],
          openProjects: [...new Set([...(current.openProjects || []), ...(imported.openProjects || [])])],
          settings: { ...(current.settings || {}), ...(imported.settings || {}) },
          files: [...(current.files || []), ...(imported.files || [])], // ✅ Include files
          events: [...(current.events || []), ...(imported.events || [])],
          recurringRules: [...(current.recurringRules || []), ...(imported.recurringRules || [])],
          habits: [...(current.habits || []), ...(imported.habits || [])],
          habitCheckins: { ...(current.habitCheckins || {}), ...(imported.habitCheckins || {}) },
          routines: [...(current.routines || []), ...(imported.routines || [])],
          routineCheckins: { ...(current.routineCheckins || {}), ...(imported.routineCheckins || {}) },
          workflow: { ...(current.workflow || {}), ...(imported.workflow || {}) },
          fileHistory: { ...(current.fileHistory || {}), ...(imported.fileHistory || {}) },
          fileRegistry: { ...(current.fileRegistry || {}), ...(imported.fileRegistry || {}) }
        };
      } else {
        // Replace: use imported data
        return {
          schemaVersion: imported.schemaVersion ?? current.schemaVersion ?? 1,
          tasks: imported.tasks || [],
          projects: imported.projects || [],
          openProjects: imported.openProjects || [],
          settings: imported.settings || {},
          files: imported.files || [], // ✅ Include files
          events: imported.events || [],
          recurringRules: imported.recurringRules || [],
          habits: imported.habits || [],
          habitCheckins: imported.habitCheckins || {},
          routines: imported.routines || [],
          routineCheckins: imported.routineCheckins || {},
          workflow: imported.workflow || {},
          fileHistory: imported.fileHistory || {},
          fileRegistry: imported.fileRegistry || {}
        };
      }
    } catch (e) {
      console.error('Error importing state:', e);
      throw new Error('Invalid import file format');
    }
  }
}

// Create singleton instance and make it globally available
// This file is loaded as a regular script (not a module), so we use window.storage
const storage = new StorageAdapter();
window.storage = storage;

// Also create a const alias for backwards compatibility in the same script context
// Note: For module scripts, use window.storage to access it
