// ═══════════════════════ COLOR PICKER ═══════════════════════
// Color selection utility for projects

/**
 * Select a color for a project
 * @param {number} n - Color number (1-8)
 * @param {HTMLElement} el - The color swatch element that was clicked
 */
export function selectColor(n, el) {
  // Update global selected color (should be moved to store eventually)
  window.selectedColor = n;
  
  // Update UI - remove selected class from all swatches
  document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
  
  // Add selected class to clicked swatch
  if (el) {
    el.classList.add('selected');
  }
}

// Expose globally for backward compatibility
window.selectColor = selectColor;
