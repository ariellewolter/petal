// ═══════════════════════ PERSISTENCE LAYER ═══════════════════════
// Handles saving state to storage (debounced)
// Subscribes to store changes, never called directly from UI

import { appStore } from '../state/store.js';
import { storage } from '../../storage.js'; // Existing storage adapter

let saveTimeout = null;
const SAVE_DEBOUNCE_MS = 500; // Wait 500ms after last change before saving

/**
 * Save state to storage (debounced)
 */
async function saveState(state) {
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
      
      await storage.saveState(stateToSave);
    } catch (error) {
      console.error('Error saving state:', error);
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
