// ═══════════════════════ STATE STORE ═══════════════════════
// Centralized app state - single source of truth
// Uses getState/setState/subscribe pattern for clean separation

class AppStore {
  constructor() {
    // Internal state (private)
    this._state = {
      tasks: [],
      projects: [],
      openProjects: new Set(),
      settings: {},
      
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
   */
  getState() {
    return {
      ...this._state,
      openProjects: new Set(this._state.openProjects) // Clone Set
    };
  }
  
  /**
   * Update state (merges partial update and notifies listeners)
   */
  setState(partial) {
    // Merge partial update
    Object.keys(partial).forEach(key => {
      if (key === 'openProjects' && partial[key] instanceof Set) {
        this._state[key] = new Set(partial[key]);
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
   */
  loadState(state) {
    this._state = {
      tasks: state.tasks || [],
      projects: state.projects || [],
      openProjects: new Set(state.openProjects || []),
      settings: state.settings || {},
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
      fileRegistry: state.fileRegistry || {},
      fileHistory: state.fileHistory || {}
    };
    this._notify();
  }
  
  /**
   * Export state for saving to storage
   */
  exportState() {
    return {
      tasks: this._state.tasks,
      projects: this._state.projects,
      openProjects: Array.from(this._state.openProjects),
      settings: this._state.settings,
      fileRegistry: this._state.fileRegistry,
      fileHistory: this._state.fileHistory
    };
  }
}

// Create singleton instance
export const appStore = new AppStore();
