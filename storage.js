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
          result.data = {
            tasks: result.data.tasks || [],
            projects: result.data.projects || [],
            openProjects: result.data.openProjects || [],
            settings: result.data.settings || {},
            fileHistory: result.data.fileHistory || {},
            fileRegistry: result.data.fileRegistry || {},
            events: result.data.events || [],
            recurringRules: result.data.recurringRules || []
          };
          return result;
        } else {
          // Old format, wrap it
          return {
            data: {
              tasks: result.tasks || [],
              projects: result.projects || [],
              openProjects: result.openProjects || [],
              settings: result.settings || {},
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
          fileHistory: JSON.parse(localStorage.getItem('petal-file-history') || '{}'),
          fileRegistry: JSON.parse(localStorage.getItem('petal-file-registry') || '{}'),
          events: JSON.parse(localStorage.getItem('petal-events') || '[]'),
          recurringRules: JSON.parse(localStorage.getItem('petal-recurring-rules') || '[]')
        };
      } catch (e) {
        console.error('Error loading state:', e);
        return { 
          tasks: [], 
          projects: [], 
          openProjects: [], 
          settings: {},
          fileHistory: {},
          fileRegistry: {},
          events: [],
          recurringRules: []
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
        const result = await window.electronAPI.saveState({
          tasks: state.tasks || [],
          projects: state.projects || [],
          openProjects: state.openProjects || [],
          settings: state.settings || {},
          events: state.events || [],
          recurringRules: state.recurringRules || [],
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
        localStorage.setItem('petal-file-history', JSON.stringify(state.fileHistory || {}));
        localStorage.setItem('petal-file-registry', JSON.stringify(state.fileRegistry || {}));
        
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
    return JSON.stringify({
      tasks: state.tasks || [],
      projects: state.projects || [],
      openProjects: state.openProjects || [],
      settings: state.settings || {},
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
          tasks: [...current.tasks, ...(imported.tasks || [])],
          projects: [...current.projects, ...(imported.projects || [])],
          openProjects: [...new Set([...current.openProjects, ...(imported.openProjects || [])])],
          settings: { ...(current.settings || {}), ...(imported.settings || {}) }
        };
      } else {
        // Replace: use imported data
        return {
          tasks: imported.tasks || [],
          projects: imported.projects || [],
          openProjects: imported.openProjects || [],
          settings: imported.settings || {}
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
