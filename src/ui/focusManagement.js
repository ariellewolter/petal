// ═══════════════════════ FOCUS MANAGEMENT ═══════════════════════
// Utilities for managing focus for accessibility

let focusHistory = [];
let activeModal = null;

/**
 * Save current focus before opening a modal
 */
export function saveFocus() {
  const activeElement = document.activeElement;
  if (activeElement && activeElement !== document.body) {
    focusHistory.push(activeElement);
  }
}

/**
 * Restore focus after closing a modal
 */
export function restoreFocus() {
  if (focusHistory.length > 0) {
    const previousFocus = focusHistory.pop();
    if (previousFocus && document.contains(previousFocus)) {
      // Use setTimeout to ensure DOM is ready
      setTimeout(() => {
        previousFocus.focus();
      }, 100);
    }
  }
}

/**
 * Trap focus within a modal
 * @param {HTMLElement} modalElement - The modal element to trap focus in
 */
export function trapFocus(modalElement) {
  if (!modalElement) return;
  
  activeModal = modalElement;
  
  // Get all focusable elements in modal
  const focusableElements = modalElement.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  
  const firstFocusable = focusableElements[0];
  const lastFocusable = focusableElements[focusableElements.length - 1];
  
  // Focus first element
  if (firstFocusable) {
    setTimeout(() => firstFocusable.focus(), 100);
  }
  
  // Handle Tab key to cycle through elements
  const handleTab = (e) => {
    if (e.key !== 'Tab') return;
    
    if (e.shiftKey) {
      // Shift+Tab: go backwards
      if (document.activeElement === firstFocusable) {
        e.preventDefault();
        lastFocusable?.focus();
      }
    } else {
      // Tab: go forwards
      if (document.activeElement === lastFocusable) {
        e.preventDefault();
        firstFocusable?.focus();
      }
    }
  };
  
  modalElement.addEventListener('keydown', handleTab);
  
  // Store handler for cleanup
  modalElement._focusTrapHandler = handleTab;
}

/**
 * Release focus trap
 * @param {HTMLElement} modalElement - The modal element to release
 */
export function releaseFocus(modalElement) {
  if (!modalElement) return;
  
  if (modalElement._focusTrapHandler) {
    modalElement.removeEventListener('keydown', modalElement._focusTrapHandler);
    delete modalElement._focusTrapHandler;
  }
  
  if (activeModal === modalElement) {
    activeModal = null;
  }
  
  restoreFocus();
}

/**
 * Focus first focusable element in a container
 * @param {HTMLElement} container - Container to focus within
 */
export function focusFirst(container) {
  if (!container) return;
  
  const focusable = container.querySelector(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  
  if (focusable) {
    setTimeout(() => focusable.focus(), 100);
  }
}

/**
 * Focus search input on current page
 */
export function focusSearch() {
  const searchInput = document.querySelector(
    '[data-search-input], #search-input, input[type="search"], input[placeholder*="Search" i]'
  );
  
  if (searchInput) {
    searchInput.focus();
    searchInput.select();
  }
}

/**
 * Set up automatic focus management for modals
 */
export function setupModalFocusManagement() {
  // Watch for modals being opened
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === 1) { // Element node
          // Check if it's a modal
          if (node.classList?.contains('modal-backdrop') || 
              node.classList?.contains('modal') ||
              node.querySelector?.('.modal-backdrop, .modal')) {
            const modal = node.querySelector?.('.modal-backdrop, .modal') || node;
            if (modal.classList.contains('active') || 
                getComputedStyle(modal).display !== 'none') {
              saveFocus();
              trapFocus(modal);
            }
          }
        }
      });
      
      // Check for modals being closed
      mutation.attributeChanges?.forEach((change) => {
        if (change.attributeName === 'class' || change.attributeName === 'style') {
          const target = change.target;
          if (target.classList?.contains('modal-backdrop') || 
              target.classList?.contains('modal')) {
            const isActive = target.classList.contains('active') ||
                           getComputedStyle(target).display !== 'none';
            if (!isActive && activeModal === target) {
              releaseFocus(target);
            }
          }
        }
      });
    });
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'style']
  });
}

/**
 * Initialize focus management
 */
export function initFocusManagement() {
  setupModalFocusManagement();
}
