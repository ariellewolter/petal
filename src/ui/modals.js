// ═══════════════════════ MODAL UTILITIES ═══════════════════════
// Functions for opening, closing, and managing modals

/**
 * Close the edit modal
 */
export function closeEditModal() {
  const modal = document.getElementById('edit-modal');
  if (modal) {
    modal.classList.remove('active');
    modal.style.display = 'none'; // Explicitly hide modal
  }
  // Clear editing state (these are global variables that should be moved to store)
  if (typeof window.editingTaskId !== 'undefined') {
    window.editingTaskId = null;
  }
  if (typeof window.editingSubtaskInfo !== 'undefined') {
    window.editingSubtaskInfo = null;
  }
}

/**
 * Toggle the add task form visibility
 */
export function toggleAddTaskForm() {
  const form = document.getElementById('add-task-form');
  const btn = document.getElementById('toggle-add-task-btn');
  const icon = document.getElementById('toggle-add-task-icon');
  const text = document.getElementById('toggle-add-task-text');
  
  if (!form || !btn || !icon || !text) return;
  
  const isVisible = form.style.display !== 'none';
  form.style.display = isVisible ? 'none' : 'block';
  icon.textContent = isVisible ? '+' : '−';
  text.textContent = isVisible ? 'Add Task' : 'Cancel';
  
  // Focus on title input when opening
  if (!isVisible) {
    const titleInput = document.getElementById('in-title');
    if (titleInput) {
      setTimeout(() => titleInput.focus(), 50);
    }
  }
}

/**
 * Toggle the create project form visibility
 */
export function toggleCreateProjectForm() {
  const form = document.getElementById('create-project-form');
  const toggle = document.getElementById('create-project-toggle');
  if (form.style.display === 'none' || !form.style.display) {
    form.style.display = 'block';
    toggle.textContent = '−';
  } else {
    form.style.display = 'none';
    toggle.textContent = '+';
  }
}

/**
 * Open diagnostics modal
 */
export function openDiagnosticsModal() {
  const modal = document.getElementById('diagnostics-modal');
  if (modal) {
    modal.style.display = 'flex';
    if (window.refreshDiagnostics) {
      window.refreshDiagnostics();
    }
  }
}

/**
 * Close diagnostics modal
 */
export function closeDiagnosticsModal() {
  const modal = document.getElementById('diagnostics-modal');
  if (modal) {
    modal.style.display = 'none';
  }
}

// Expose globally for backward compatibility
window.closeEditModal = closeEditModal;
window.toggleAddTaskForm = toggleAddTaskForm;
window.toggleCreateProjectForm = toggleCreateProjectForm;
window.openDiagnosticsModal = openDiagnosticsModal;
window.closeDiagnosticsModal = closeDiagnosticsModal;
