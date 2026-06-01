// ═══════════════════════ SETTINGS UTILITIES ═══════════════════════
// Settings validation and initialization helpers

import { DEFAULT_BOARD_COLUMNS } from '../domain/schema.js';

/**
 * Ensure board settings are properly initialized
 */
export function ensureBoardSettings() {
  const store = window.Petal?.store;
  if (!store) {
    console.warn('Store not available for settings');
    return;
  }
  
  const state = store.getState();
  let settings = { ...(state.settings || {}) };
  
  if (!settings.boards || typeof settings.boards !== 'object') {
    settings.boards = {};
  }
  if (!Array.isArray(settings.boards.defaultColumns) || settings.boards.defaultColumns.length === 0) {
    settings.boards.defaultColumns = [...DEFAULT_BOARD_COLUMNS];
  }
  if (!settings.boards.projectBoards || typeof settings.boards.projectBoards !== 'object') {
    settings.boards.projectBoards = {};
  }
  
  // Update store if settings changed
  if (JSON.stringify(state.settings) !== JSON.stringify(settings)) {
    store.setState({ settings });
  }
}

/**
 * Ensure cell log settings are properly initialized
 */
export function ensureCellLogSettings() {
  const store = window.Petal?.store;
  if (!store) {
    console.warn('Store not available for settings');
    return;
  }
  
  const state = store.getState();
  let settings = { ...(state.settings || {}) };
  
  if (!settings.cellLog || typeof settings.cellLog !== 'object') {
    settings.cellLog = {};
  }
  if (!Array.isArray(settings.cellLog.cellTypes)) {
    settings.cellLog.cellTypes = [];
  }
  if (!Array.isArray(settings.cellLog.mediaTypes)) {
    settings.cellLog.mediaTypes = [];
  }
  if (!Array.isArray(settings.cellLog.entries)) {
    settings.cellLog.entries = [];
  }
  
  // Update store if settings changed
  if (JSON.stringify(state.settings) !== JSON.stringify(settings)) {
    store.setState({ settings });
  }
}

/**
 * Get board columns from settings
 */
export function getBoardColumns() {
  ensureBoardSettings();
  const store = window.Petal?.store;
  if (!store) return DEFAULT_BOARD_COLUMNS;
  
  const state = store.getState();
  const settings = state.settings || {};
  return settings.boards?.defaultColumns || DEFAULT_BOARD_COLUMNS;
}

export { ensureAppearanceSettings } from './theme.js';

// Expose globally for backward compatibility
window.ensureBoardSettings = ensureBoardSettings;
window.ensureCellLogSettings = ensureCellLogSettings;
window.getBoardColumns = getBoardColumns;
