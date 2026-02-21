// ═══════════════════════ PERSISTENCE LAYER ═══════════════════════
// Handles saving state to storage (debounced)
// Subscribes to store changes, never called directly from UI

import { appStore } from '../state/store.js';
// Use window.storage since storage.js is loaded as a regular script, not a module
const storage = window.storage;

let saveTimeout = null;
let isLoading = false; // Prevent saves during initial load/migration
const SAVE_DEBOUNCE_MS = 500; // Wait 500ms after last change before saving

/**
 * Set loading state (prevents saves during initial load/migration)
 */
export function setLoading(loading) {
  isLoading = loading;
  if (loading) {
    // Cancel any pending saves when starting to load
    if (saveTimeout) {
      clearTimeout(saveTimeout);
      saveTimeout = null;
    }
  }
}

/**
 * Save state to storage (debounced)
 */
async function saveState(state) {
  // Don't save during initial load/migration
  if (isLoading) {
    return;
  }
  
  // Clear existing timeout
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }
  
  // Set new timeout
  saveTimeout = setTimeout(async () => {
    try {
      const stateToSave = appStore.exportState();
      
      // CRITICAL: Verify we're not saving incomplete state
      if (!stateToSave.projects || stateToSave.projects.length === 0) {
        // If projects are missing, try to get them from window globals as fallback
        if (window.projects && window.projects.length > 0) {
          console.warn('⚠️ Store missing projects, using window.projects as fallback');
          stateToSave.projects = window.projects;
        } else {
          console.error('⚠️ WARNING: Attempting to save state with no projects!', {
            storeProjects: appStore.getState().projects?.length,
            windowProjects: window.projects?.length
          });
        }
      }
      
      const result = await storage.saveState(stateToSave);
      
      // Handle result - update UI indicators if needed
      if (result && result.ok) {
        // Success - could update UI "saved" indicator here if needed
        // window.markStateSaved?.(); // Optional: call UI helper if it exists
      } else {
        // Failure - show error to user
        const errorMsg = result?.error || 'Unknown save error';
        console.error('❌ Save failed:', errorMsg);
        
        // Show user-friendly error
        if (errorMsg === 'Vault not resolved') {
          alert('Error: Cannot save - vault not resolved. Please restart the app.');
        } else {
          // Could show toast/banner here instead of console
          console.warn('Save error:', errorMsg);
        }
      }
    } catch (error) {
      console.error('Error saving state:', error);
      // Show error to user
      console.error('Save exception:', error.message || error);
    }
  }, SAVE_DEBOUNCE_MS);
}

/**
 * Initialize persistence subscription
 * Call this once during app initialization
 */
export function initPersistence() {
  // Subscribe to store changes
  appStore.subscribe(saveState);
  
  console.log('Persistence layer initialized - auto-saving on state changes');
}

// Expose setLoading to window for backward compatibility if needed
if (typeof window !== 'undefined') {
  window.Petal = window.Petal || {};
  window.Petal.setLoading = setLoading;
}
