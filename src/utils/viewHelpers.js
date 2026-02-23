// ═══════════════════════ VIEW HELPERS ═══════════════════════
// Utilities for view management and re-rendering

/**
 * Get current view from store (single source of truth)
 * @returns {string|null} Current view name or null if not available
 */
export function getCurrentView() {
  const store = window.Petal?.store;
  if (!store) {
    // Fallback to window.currentView if store not available
    return window.currentView || null;
  }
  const state = store.getState();
  return state?.currentView || window.currentView || null;
}

/**
 * Re-render a view if it's currently active
 * Safe to call from anywhere - only re-renders if the view is actually visible
 * @param {string} viewName - View name to re-render (e.g., 'tasks', 'projects')
 * @returns {Promise<void>}
 */
export async function rerenderViewIfActive(viewName) {
  const currentView = getCurrentView();
  
  // Only re-render if this view is currently active
  if (currentView !== viewName) {
    return; // View not active, skip re-render
  }
  
  // Use router to re-render
  const switchViewFn = window.routerSwitchView || window.switchView;
  if (!switchViewFn) {
    console.warn(`⚠️ rerenderViewIfActive: Router not available for view: ${viewName}`);
    return;
  }
  
  try {
    await switchViewFn(viewName);
  } catch (err) {
    console.error(`❌ rerenderViewIfActive: Error re-rendering ${viewName}:`, err);
  }
}

/**
 * Re-render multiple views if any are active
 * Useful when an operation might affect multiple views
 * @param {string[]} viewNames - Array of view names to check
 * @returns {Promise<void>}
 */
export async function rerenderViewsIfActive(viewNames) {
  const currentView = getCurrentView();
  
  if (viewNames.includes(currentView)) {
    await rerenderViewIfActive(currentView);
  }
}

/**
 * Safe router switch with error handling
 * @param {string} viewName - View name to switch to
 * @returns {Promise<void>}
 */
export async function safeSwitchView(viewName) {
  const switchViewFn = window.routerSwitchView || window.switchView;
  if (!switchViewFn) {
    console.error(`❌ safeSwitchView: Router not available for view: ${viewName}`);
    return;
  }
  
  try {
    await switchViewFn(viewName);
  } catch (err) {
    console.error(`❌ safeSwitchView: Error switching to ${viewName}:`, err);
  }
}
