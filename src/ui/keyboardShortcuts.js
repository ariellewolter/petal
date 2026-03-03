// ═══════════════════════ KEYBOARD SHORTCUTS ═══════════════════════
// Global keyboard shortcuts for improved accessibility and power-user features

let shortcutsBound = false;

/**
 * Keyboard shortcut definitions
 */
const SHORTCUTS = {
  // Navigation
  'g t': { action: 'navigate', target: 'tasks', description: 'Go to Tasks' },
  'g p': { action: 'navigate', target: 'projects', description: 'Go to Projects' },
  'g f': { action: 'navigate', target: 'files', description: 'Go to Files' },
  'g w': { action: 'navigate', target: 'workflow', description: 'Go to Workflow' },
  'g c': { action: 'navigate', target: 'cell-log', description: 'Go to Cell Log' },
  'g d': { action: 'navigate', target: 'today', description: 'Go to Today' },
  'g l': { action: 'navigate', target: 'planner', description: 'Go to Planner' },
  
  // Actions
  'n': { action: 'quick-add', description: 'Quick Add (task/project)' },
  'a': { action: 'add-task', description: 'Add Task' },
  'p': { action: 'add-project', description: 'Add Project' },
  
  // Modals
  'Escape': { action: 'close-modal', description: 'Close modal/drawer' },
  
  // Search
  '/': { action: 'focus-search', description: 'Focus search' },
  'ctrl+k': { action: 'focus-search', description: 'Focus search (Ctrl+K)' },
  'cmd+k': { action: 'focus-search', description: 'Focus search (Cmd+K)' },
};

/**
 * Parse keyboard shortcut from event
 */
function parseShortcut(e) {
  const parts = [];
  
  // Modifier keys
  if (e.ctrlKey || e.metaKey) parts.push(e.ctrlKey ? 'ctrl' : 'cmd');
  if (e.altKey) parts.push('alt');
  if (e.shiftKey) parts.push('shift');
  
  // Main key
  const key = e.key.toLowerCase();
  if (key === ' ') {
    parts.push('space');
  } else if (key.length === 1) {
    parts.push(key);
  } else {
    // Special keys (Escape, Enter, etc.)
    parts.push(key);
  }
  
  return parts.join(' ');
}

/**
 * Handle keyboard shortcut
 */
function handleShortcut(shortcut, e) {
  const def = SHORTCUTS[shortcut];
  if (!def) return false;
  
  e.preventDefault();
  e.stopPropagation();
  
  switch (def.action) {
    case 'navigate':
      if (window.switchView) {
        window.switchView(def.target);
      } else if (window.Petal?.handlers?.switchView) {
        window.Petal.handlers.switchView(def.target);
      }
      break;
      
    case 'quick-add':
      if (window.quickAdd) {
        window.quickAdd();
      } else if (window.Petal?.features?.modalOperations?.openAddTaskModal) {
        window.Petal.features.modalOperations.openAddTaskModal();
      } else if (window.openAddTaskModal) {
        window.openAddTaskModal();
      }
      break;
      
    case 'add-task':
      if (window.Petal?.features?.modalOperations?.openAddTaskModal) {
        window.Petal.features.modalOperations.openAddTaskModal();
      } else if (window.openAddTaskModal) {
        window.openAddTaskModal();
      }
      break;
      
    case 'add-project':
      // Focus project name input if on projects page
      const projectNameInput = document.getElementById('pr-name');
      if (projectNameInput) {
        projectNameInput.focus();
      }
      break;
      
    case 'close-modal':
      // Close any open modals
      const modals = document.querySelectorAll('.modal-backdrop.active, .modal.active, [class*="modal"].active');
      modals.forEach(modal => {
        if (modal.classList.contains('active')) {
          modal.classList.remove('active');
          modal.style.display = 'none';
        }
        // Try to find close function
        const modalId = modal.id;
        if (modalId) {
          const closeFn = window[`close${modalId.charAt(0).toUpperCase() + modalId.slice(1).replace(/-([a-z])/g, (_, c) => c.toUpperCase())}`];
          if (closeFn) closeFn();
        }
      });
      
      // Close drawers
      const drawers = document.querySelectorAll('.task-drawer.active, [class*="drawer"].active');
      drawers.forEach(drawer => {
        if (window.closeTaskDrawer) {
          window.closeTaskDrawer();
        }
      });
      break;
      
    case 'focus-search':
      // Find search input on current page
      const searchInput = document.querySelector('[data-search-input], #search-input, input[type="search"], input[placeholder*="Search" i]');
      if (searchInput) {
        searchInput.focus();
        searchInput.select();
      }
      break;
  }
  
  return true;
}

/**
 * Track key sequence for multi-key shortcuts (like 'g' then 't')
 */
let keySequence = [];
let sequenceTimeout = null;
const SEQUENCE_TIMEOUT = 1000; // 1 second to complete sequence

function handleKeySequence(e) {
  const shortcut = parseShortcut(e);
  
  // Reset sequence if too much time passed
  if (sequenceTimeout) {
    clearTimeout(sequenceTimeout);
  }
  
  // Check for single-key shortcuts first
  if (SHORTCUTS[shortcut]) {
    if (handleShortcut(shortcut, e)) {
      keySequence = [];
      return;
    }
  }
  
  // Handle multi-key sequences (like 'g' then 't')
  if (shortcut === 'g' && !e.ctrlKey && !e.metaKey && !e.altKey) {
    keySequence = ['g'];
    sequenceTimeout = setTimeout(() => {
      keySequence = [];
    }, SEQUENCE_TIMEOUT);
    return;
  }
  
  // If we're in a sequence, check for completion
  if (keySequence.length > 0) {
    const fullSequence = keySequence.join(' ') + ' ' + shortcut.split(' ').pop();
    if (SHORTCUTS[fullSequence]) {
      if (handleShortcut(fullSequence, e)) {
        keySequence = [];
        if (sequenceTimeout) clearTimeout(sequenceTimeout);
        return;
      }
    }
    
    // Reset sequence if no match
    keySequence = [];
    if (sequenceTimeout) clearTimeout(sequenceTimeout);
  }
}

/**
 * Set up keyboard shortcuts
 */
export function setupKeyboardShortcuts() {
  if (shortcutsBound) return;
  shortcutsBound = true;
  
  // Only bind if not in an input/textarea/contenteditable
  document.addEventListener('keydown', (e) => {
    // Ignore if typing in an input, textarea, or contenteditable
    const target = e.target;
    if (target.tagName === 'INPUT' || 
        target.tagName === 'TEXTAREA' || 
        target.isContentEditable ||
        target.closest('[contenteditable="true"]')) {
      // Allow Escape to close modals even when typing
      if (e.key === 'Escape') {
        handleShortcut('Escape', e);
      }
      // Allow Ctrl/Cmd+K to focus search
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        handleShortcut(e.ctrlKey ? 'ctrl+k' : 'cmd+k', e);
      }
      return;
    }
    
    handleKeySequence(e);
  });
  
  // Show help on '?' key
  document.addEventListener('keydown', (e) => {
    if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const target = e.target;
      if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA' && !target.isContentEditable) {
        e.preventDefault();
        showKeyboardShortcutsHelp();
      }
    }
  });
}

/**
 * Show keyboard shortcuts help
 */
function showKeyboardShortcutsHelp() {
  // Import showNotification dynamically
  import('./components.js').then(module => {
    if (module.showNotification) {
      const shortcuts = Object.entries(SHORTCUTS)
        .map(([key, def]) => `**${key}**: ${def.description}`)
        .join('\n');
      
      // For now, show a simple notification with key info
      // In the future, could show a modal with full help
      module.showNotification({
        message: 'Keyboard shortcuts available. Press ? again for full list.',
        type: 'info',
        duration: 4000
      });
      
      // Log to console for now
      console.log('Keyboard Shortcuts:');
      console.table(Object.entries(SHORTCUTS).map(([key, def]) => ({
        Shortcut: key,
        Action: def.description
      })));
    }
  }).catch(() => {
    // Components not available
    console.log('Keyboard shortcuts:', SHORTCUTS);
  });
}

/**
 * Get all keyboard shortcuts (for help/documentation)
 */
export function getKeyboardShortcuts() {
  return SHORTCUTS;
}
