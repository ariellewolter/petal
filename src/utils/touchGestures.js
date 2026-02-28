// ═══════════════════════ TOUCH GESTURE UTILITIES ═══════════════════════
// Utilities for handling touch gestures on mobile devices

/**
 * Detect if device supports touch
 */
export function isTouchDevice() {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

/**
 * Swipe detection for mobile
 * @param {HTMLElement} element - Element to attach swipe listener
 * @param {Object} callbacks - Callback functions
 * @param {Function} callbacks.onSwipeLeft - Called on left swipe
 * @param {Function} callbacks.onSwipeRight - Called on right swipe
 * @param {Function} callbacks.onSwipeUp - Called on up swipe
 * @param {Function} callbacks.onSwipeDown - Called on down swipe
 * @param {number} threshold - Minimum distance for swipe (default: 50px)
 */
export function addSwipeListener(element, callbacks, threshold = 50) {
  if (!element || !isTouchDevice()) return null;
  
  let startX = 0;
  let startY = 0;
  let startTime = 0;
  
  const handleTouchStart = (e) => {
    const touch = e.touches[0];
    startX = touch.clientX;
    startY = touch.clientY;
    startTime = Date.now();
  };
  
  const handleTouchEnd = (e) => {
    if (!startX || !startY) return;
    
    const touch = e.changedTouches[0];
    const endX = touch.clientX;
    const endY = touch.clientY;
    const endTime = Date.now();
    
    const deltaX = endX - startX;
    const deltaY = endY - startY;
    const deltaTime = endTime - startTime;
    
    // Reset
    startX = 0;
    startY = 0;
    startTime = 0;
    
    // Check if swipe is fast enough (< 300ms) and far enough
    if (deltaTime > 300) return;
    
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);
    
    // Determine swipe direction
    if (absX > threshold && absX > absY) {
      // Horizontal swipe
      if (deltaX > 0 && callbacks.onSwipeRight) {
        callbacks.onSwipeRight(e);
      } else if (deltaX < 0 && callbacks.onSwipeLeft) {
        callbacks.onSwipeLeft(e);
      }
    } else if (absY > threshold && absY > absX) {
      // Vertical swipe
      if (deltaY > 0 && callbacks.onSwipeDown) {
        callbacks.onSwipeDown(e);
      } else if (deltaY < 0 && callbacks.onSwipeUp) {
        callbacks.onSwipeUp(e);
      }
    }
  };
  
  element.addEventListener('touchstart', handleTouchStart, { passive: true });
  element.addEventListener('touchend', handleTouchEnd, { passive: true });
  
  // Return cleanup function
  return () => {
    element.removeEventListener('touchstart', handleTouchStart);
    element.removeEventListener('touchend', handleTouchEnd);
  };
}

/**
 * Add swipe-to-dismiss for modals
 * @param {HTMLElement} modalElement - Modal element
 * @param {Function} onDismiss - Callback when dismissed
 */
export function addSwipeToDismiss(modalElement, onDismiss) {
  if (!modalElement || !isTouchDevice()) return null;
  
  let startY = 0;
  let currentY = 0;
  let isDragging = false;
  
  const handleTouchStart = (e) => {
    // Only allow swipe from top of modal
    const touch = e.touches[0];
    if (touch.clientY > 100) return; // Only swipe from top area
    
    startY = touch.clientY;
    isDragging = true;
    modalElement.style.transition = 'none';
  };
  
  const handleTouchMove = (e) => {
    if (!isDragging) return;
    
    const touch = e.touches[0];
    currentY = touch.clientY - startY;
    
    // Only allow downward swipe
    if (currentY > 0) {
      modalElement.style.transform = `translateY(${currentY}px)`;
      // Add opacity fade
      const opacity = Math.max(0, 1 - (currentY / 200));
      modalElement.style.opacity = opacity;
    }
  };
  
  const handleTouchEnd = () => {
    if (!isDragging) return;
    
    isDragging = false;
    modalElement.style.transition = '';
    
    // If swiped more than 100px, dismiss
    if (currentY > 100 && onDismiss) {
      onDismiss();
    } else {
      // Snap back
      modalElement.style.transform = '';
      modalElement.style.opacity = '';
    }
    
    startY = 0;
    currentY = 0;
  };
  
  modalElement.addEventListener('touchstart', handleTouchStart, { passive: true });
  modalElement.addEventListener('touchmove', handleTouchMove, { passive: true });
  modalElement.addEventListener('touchend', handleTouchEnd, { passive: true });
  
  return () => {
    modalElement.removeEventListener('touchstart', handleTouchStart);
    modalElement.removeEventListener('touchmove', handleTouchMove);
    modalElement.removeEventListener('touchend', handleTouchEnd);
  };
}

/**
 * Add long-press detection
 * @param {HTMLElement} element - Element to attach listener
 * @param {Function} callback - Called on long press
 * @param {number} duration - Long press duration in ms (default: 500ms)
 */
export function addLongPressListener(element, callback, duration = 500) {
  if (!element || !isTouchDevice()) return null;
  
  let pressTimer = null;
  
  const handleTouchStart = (e) => {
    pressTimer = setTimeout(() => {
      if (callback) {
        callback(e);
      }
      // Haptic feedback if available
      if (navigator.vibrate) {
        navigator.vibrate(10);
      }
    }, duration);
  };
  
  const handleTouchEnd = () => {
    if (pressTimer) {
      clearTimeout(pressTimer);
      pressTimer = null;
    }
  };
  
  const handleTouchMove = () => {
    if (pressTimer) {
      clearTimeout(pressTimer);
      pressTimer = null;
    }
  };
  
  element.addEventListener('touchstart', handleTouchStart, { passive: true });
  element.addEventListener('touchend', handleTouchEnd, { passive: true });
  element.addEventListener('touchmove', handleTouchMove, { passive: true });
  
  return () => {
    element.removeEventListener('touchstart', handleTouchStart);
    element.removeEventListener('touchend', handleTouchEnd);
    element.removeEventListener('touchmove', handleTouchMove);
    if (pressTimer) clearTimeout(pressTimer);
  };
}

/**
 * Add haptic feedback (if supported)
 * @param {number|number[]} pattern - Vibration pattern
 */
export function hapticFeedback(pattern = 10) {
  if (navigator.vibrate) {
    navigator.vibrate(pattern);
  }
}

// Make functions available globally for backward compatibility
if (typeof window !== 'undefined') {
  window.addSwipeListener = addSwipeListener;
  window.addSwipeToDismiss = addSwipeToDismiss;
  window.addLongPressListener = addLongPressListener;
  window.hapticFeedback = hapticFeedback;
  window.isTouchDevice = isTouchDevice;
}
