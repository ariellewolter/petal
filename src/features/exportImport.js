// ═══════════════════════ EXPORT/IMPORT ═══════════════════════

/**
 * Export all data to JSON file
 */
export function exportData() {
  // Get current state from store or window globals
  const store = window.Petal?.store;
  let tasks, projects, openProjects, events, recurringRules, settings;
  
  if (store) {
    const state = store.getState();
    tasks = state.tasks || [];
    projects = state.projects || [];
    openProjects = Array.isArray(state.openProjects) ? state.openProjects : [];
    events = state.events || [];
    recurringRules = state.recurringRules || [];
    settings = state.settings || {};
  } else {
    // Fallback to window globals
    tasks = window.tasks || [];
    projects = window.projects || [];
    openProjects = Array.isArray(window.openProjects) ? window.openProjects : (window.openProjects instanceof Set ? Array.from(window.openProjects) : []);
    events = window.events || [];
    recurringRules = window.recurringRules || [];
    settings = window.settings || {};
  }
  
  const data = window.storage.exportState({
    tasks,
    projects,
    openProjects: [...openProjects],
    events,
    recurringRules,
    settings
  });
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `petal-tasks-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Import data from JSON file
 */
export async function importData(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const shouldMerge = confirm('Merge with existing data? (Cancel to replace)');
      const newState = await window.storage.importState(e.target.result, shouldMerge);
      
      // Update store (window globals are read-only getters that automatically reflect store state)
      if (window.Petal?.store) {
        window.Petal.store.setState({
          tasks: newState.tasks || [],
          projects: newState.projects || [],
          openProjects: Array.isArray(newState.openProjects) ? newState.openProjects : (newState.openProjects instanceof Set ? Array.from(newState.openProjects) : []),
          settings: newState.settings || {}
        });
        // Note: window.tasks, window.projects, etc. are read-only getters that automatically
        // reflect the store state, so no manual syncing needed
      } else {
        // Fallback: store not initialized (shouldn't happen in normal flow)
        console.warn('Store not available during import, data not loaded');
      }
      
      // Migrate tasks for kanban if needed
      if (window.migrateTasksForKanban) {
        window.migrateTasksForKanban();
      }
      
      // Refresh dropdowns AFTER store is updated
      if (window.refreshProjectSelects) {
        window.refreshProjectSelects();
      }
      
      // Save and render
      if (window.save) await window.save();
      if (window.render) window.render();
      alert('Data imported successfully!');
    } catch (err) {
      alert('Import failed: ' + err.message);
    }
  };
  reader.readAsText(file);
  event.target.value = ''; // Reset input
}
