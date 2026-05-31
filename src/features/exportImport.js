// ═══════════════════════ EXPORT/IMPORT ═══════════════════════

/**
 * Export all data to JSON file
 */
export function exportData() {
  const store = window.Petal?.store;

  if (store?.exportState) {
    const data = window.storage.exportState(store.exportState());
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `petal-tasks-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return;
  }

  // Fallback when store is unavailable
  const tasks = window.tasks || [];
  const projects = window.projects || [];
  const openProjects = Array.isArray(window.openProjects) ? window.openProjects : (window.openProjects instanceof Set ? Array.from(window.openProjects) : []);
  const events = window.events || [];
  const recurringRules = window.recurringRules || [];
  const settings = window.settings || {};
  
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
          settings: newState.settings || {},
          events: newState.events || [],
          recurringRules: newState.recurringRules || [],
          habits: newState.habits || [],
          habitCheckins: newState.habitCheckins || {},
          routines: newState.routines || [],
          routineCheckins: newState.routineCheckins || {},
          files: newState.files || [],
          workflow: newState.workflow || {},
          __allowFilesOverwrite: !shouldMerge
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
