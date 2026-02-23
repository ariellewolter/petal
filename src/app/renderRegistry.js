// ═══════════════════════ RENDER REGISTRY ═══════════════════════
// Central registry for all render functions across the app
// Provides unified access to all renderers regardless of where they're defined

import { PAGES } from './pages.js';
import * as uiModules from '../ui/index.js';

/**
 * Central Render Registry
 * 
 * This provides a single, unified way to access all render functions
 * across the application. Functions can be:
 * - Page-level renderers (from src/pages/)
 * - UI component renderers (from src/ui/)
 * - Legacy inline functions (temporary, will be migrated)
 */
class RenderRegistry {
  constructor() {
    this.pages = PAGES;
    this.ui = uiModules;
    this.legacy = {}; // For inline functions during migration
  }

  /**
   * Get a page renderer by view name
   * @param {string} viewName - View name (e.g., 'tasks', 'projects', 'planner')
   * @returns {Function|null} Renderer function or null
   */
  getPageRenderer(viewName) {
    return this.pages[viewName] || null;
  }

  /**
   * Get a UI component renderer
   * @param {string} name - Renderer name (e.g., 'renderTasks', 'renderProjects')
   * @returns {Function|null} Renderer function or null
   */
  getUIRenderer(name) {
    return this.ui[name] || null;
  }

  /**
   * Render a page by view name
   * @param {string} viewName - View name
   * @param {HTMLElement} container - Container element
   * @param {Object} state - App state
   * @param {Object} handlers - Event handlers
   */
  async renderPage(viewName, container, state, handlers) {
    const renderer = this.getPageRenderer(viewName);
    if (renderer) {
      return await renderer(container, state, handlers);
    }
    
    // Fallback to legacy function
    const legacyName = `render${viewName.charAt(0).toUpperCase() + viewName.slice(1)}`;
    if (this.legacy[legacyName]) {
      console.warn(`Using legacy renderer for ${viewName}`);
      return await this.legacy[legacyName](container, state, handlers);
    }
    
    console.error(`No renderer found for view: ${viewName}`);
    return null;
  }

  /**
   * Register a legacy render function (temporary during migration)
   * @param {string} name - Function name
   * @param {Function} fn - Function to register
   */
  registerLegacy(name, fn) {
    this.legacy[name] = fn;
  }

  /**
   * Check if a page renderer exists
   * @param {string} viewName - View name
   * @returns {boolean}
   */
  hasPageRenderer(viewName) {
    return viewName in this.pages || viewName in this.legacy;
  }

  /**
   * List all available page renderers
   * @returns {string[]} Array of view names
   */
  listPageRenderers() {
    return Object.keys(this.pages);
  }

  /**
   * List all available UI renderers
   * @returns {string[]} Array of renderer names
   */
  listUIRenderers() {
    return Object.keys(this.ui);
  }
}

// Create singleton instance
export const renderRegistry = new RenderRegistry();

// Export for convenience
export default renderRegistry;
