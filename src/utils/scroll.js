// ═══════════════════════ SCROLL UTILITIES ═══════════════════════
// Consistent scroll position reset using requestAnimationFrame
// Replaces fragile triple-timeout patterns

/**
 * Reset scroll position of an element
 * Uses requestAnimationFrame for reliable reset
 * @param {HTMLElement} el - Element to reset scroll for
 */
export function resetScroll(el) {
  if (!el) return;
  
  // Immediate reset
  el.scrollTop = 0;
  if (el.style) {
    el.style.scrollTop = '0';
  }
  
  // Use requestAnimationFrame for reliable reset after DOM updates
  requestAnimationFrame(() => {
    el.scrollTop = 0;
    if (el.style) {
      el.style.scrollTop = '0';
    }
  });
}

/**
 * Reset scroll position of all view containers
 * @param {string} [excludeViewId] - Optional view ID to exclude from reset
 */
export function resetAllViews(excludeViewId = null) {
  const views = document.querySelectorAll('[id^="view-"]');
  views.forEach(view => {
    if (excludeViewId && view.id === `view-${excludeViewId}`) return;
    resetScroll(view);
  });
}

/**
 * Reset global scroll position (window, document, body)
 */
export function resetGlobalScroll() {
  window.scrollTo(0, 0);
  if (document.documentElement) {
    document.documentElement.scrollTop = 0;
  }
  if (document.body) {
    document.body.scrollTop = 0;
  }
  if (document.scrollingElement) {
    document.scrollingElement.scrollTop = 0;
  }
}
