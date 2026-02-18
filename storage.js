// ═══════════════════════ STORAGE ADAPTER ═══════════════════════
// Abstract storage layer - uses file system in Electron, localStorage in browser

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
            settings: result.data.settings || {}
          };
          return result;
        } else {
          // Old format, wrap it
          return {
            data: {
              tasks: result.tasks || [],
              projects: result.projects || [],
              openProjects: result.openProjects || [],
              settings: result.settings || {}
            },
            hasConflicts: false,
            conflicts: [],
            newerConflicts: []
          };
        }
      } catch (e) {
        console.error('Error loading state from file:', e);
        return {
          data: { tasks: [], projects: [], openProjects: [], settings: {} },
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
          settings: JSON.parse(localStorage.getItem('petal-settings') || '{}')
        };
      } catch (e) {
        console.error('Error loading state:', e);
        return { tasks: [], projects: [], openProjects: [], settings: {} };
      }
    }
  }

  // Save all state to storage
  async saveState(state) {
    if (this.isElectron) {
      // Electron: save to JSON file
      try {
        const success = await window.electronAPI.saveState({
          tasks: state.tasks || [],
          projects: state.projects || [],
          openProjects: state.openProjects || [],
          settings: state.settings || {}
        });
        
        if (success) {
          this.listeners.forEach(cb => cb(state));
        }
        return success;
      } catch (e) {
        console.error('Error saving state to file:', e);
        return false;
      }
    } else {
      // Browser: save to localStorage
      try {
        localStorage.setItem('petal-tasks', JSON.stringify(state.tasks || []));
        localStorage.setItem('petal-projects', JSON.stringify(state.projects || []));
        localStorage.setItem('petal-open-proj', JSON.stringify(state.openProjects || []));
        localStorage.setItem('petal-settings', JSON.stringify(state.settings || {}));
        
        // Notify listeners of changes
        this.listeners.forEach(cb => cb(state));
        return true;
      } catch (e) {
        console.error('Error saving state:', e);
        return false;
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

// Create singleton instance
const storage = new StorageAdapter();
