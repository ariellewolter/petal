// ═══════════════════════ STATE STORE ═══════════════════════
// Centralized app state - single source of truth
// Uses getState/setState/subscribe pattern for clean separation

class AppStore {
  constructor() {
    // Internal state (private)
    // Phase 3 Fix: openProjects stored as Array (not Set) for JSON compatibility
    this._state = {
      tasks: [],
      projects: [],
      openProjects: [], // Array, not Set
      settings: {},
      
      // Calendar data
      events: [],
      recurringRules: [],
      
      // UI state
      currentView: 'tasks',
      currentSort: 'all',
      currentFilter: 'all',
      currentProjFilter: 'all',
      selectedColor: 1,
      taskMode: 'list',
      boardProjectFilter: 'all',
      searchQuery: '',
      currentFileView: 'all',
      selectedProjectId: null, // For matrix view
      
      // File registry
      fileRegistry: {},
      fileHistory: {}
    };
    
    // Listeners for state changes
    this._listeners = [];
  }
  
  /**
   * Get current state (returns a copy to prevent direct mutation)
   * Phase 3 Fix: openProjects is Array in store, renderers derive Set if needed
   */
  getState() {
    return {
      ...this._state,
      openProjects: Array.isArray(this._state.openProjects) 
        ? [...this._state.openProjects] // Clone Array
        : []
    };
  }
  
  /**
   * Update state (merges partial update and notifies listeners)
   * Phase 3 Fix: Normalize openProjects to Array (accepts Set or Array)
   */
  setState(partial) {
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
      } else {
        this._state[key] = partial[key];
      }
    });
    
    // Notify all listeners
    this._notify();
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
   */
  loadState(state) {
    // Phase 3 Fix: Guard against empty project overwrites
    const incomingProjects = Array.isArray(state.projects) ? state.projects : [];
    const currentProjects = this._state.projects || [];
    
    // Never replace existing projects with empty array unless explicitly allowed
    // This prevents data loss from bad saves or external modifications
    if (incomingProjects.length === 0 && currentProjects.length > 0) {
      console.warn('⚠️ BLOCKED empty project overwrite - preserving existing projects');
      state.projects = currentProjects;
    }
    
    // Phase 3 Fix: Normalize openProjects to Array (JSON-friendly, single representation)
    // Store always uses Array, renderers derive Set locally if needed
    const openProjectsArray = Array.isArray(state.openProjects) 
      ? state.openProjects 
      : (state.openProjects instanceof Set ? Array.from(state.openProjects) : []);
    
    this._state = {
      tasks: state.tasks || [],
      projects: state.projects || [],
      openProjects: openProjectsArray, // Store as Array, not Set
      settings: state.settings || {},
      events: state.events || [],
      recurringRules: state.recurringRules || [],
      currentView: state.currentView || 'tasks',
      currentSort: state.currentSort || 'all',
      currentFilter: state.currentFilter || 'all',
      currentProjFilter: state.currentProjFilter || 'all',
      selectedColor: state.selectedColor || 1,
      taskMode: state.taskMode || 'list',
      boardProjectFilter: state.boardProjectFilter || 'all',
      searchQuery: state.searchQuery || '',
      currentFileView: state.currentFileView || 'all',
      selectedProjectId: state.selectedProjectId || null,
      // GUARANTEE: Always objects, never undefined
      fileRegistry: state.fileRegistry && typeof state.fileRegistry === 'object' ? state.fileRegistry : {},
      fileHistory: state.fileHistory && typeof state.fileHistory === 'object' ? state.fileHistory : {}
    };
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
   */
  exportState() {
    return {
      tasks: this._state.tasks,
      projects: this._state.projects,
      openProjects: Array.isArray(this._state.openProjects) 
        ? this._state.openProjects 
        : [],
      settings: this._state.settings,
      events: this._state.events,
      recurringRules: this._state.recurringRules,
      fileRegistry: this._state.fileRegistry,
      fileHistory: this._state.fileHistory
    };
  }
}

// Create singleton instance
export const appStore = new AppStore();
