// ═══════════════════════ PAGE REGISTRY ═══════════════════════
// Single source of truth for all page renderers
// This prevents duplicate renderers and makes routing explicit

import { renderTodayPage } from '../pages/TodayPage.js';
import { renderSettingsPage } from '../pages/SettingsPage.js';
import { renderCellLogPage } from '../pages/CellLogPage.js';
import { renderWorkflowPage } from '../pages/WorkflowPage.js';
import { renderTasksPage } from '../pages/TasksPage.js';
import { renderProjectsPage } from '../pages/ProjectsPage.js';
import { renderThreeDPrintPage } from '../pages/ThreeDPrintPage.js';
import { renderFilesPage } from '../pages/FilesPage.js';
import { renderPlannerPage } from '../pages/PlannerPage.js';
import { renderHabitsPage } from '../pages/HabitsPage.js';
import { renderRoutinesPage } from '../pages/RoutinesPage.js';
import { renderGoalsPage } from '../pages/GoalsPage.js';

// 3D Print page is now a proper module - imported above

/**
 * Registry of all page renderers
 * Each entry maps a view name to its render function
 * 
 * @type {Object<string, function(HTMLElement, Object, Object): Promise<void>|void>}
 */
export const PAGES = {
  today: renderTodayPage,
  tasks: renderTasksPage, // Now uses proper TasksPage module with event delegation
  projects: renderProjectsPage,
  planner: renderPlannerPage,
  files: renderFilesPage,
  workflow: renderWorkflowPage,
  'cell-log': renderCellLogPage,
  settings: renderSettingsPage,
  '3d-print': renderThreeDPrintPage,
  habits: renderHabitsPage,
  routines: renderRoutinesPage,
  goals: renderGoalsPage,
};

/**
 * Get a page renderer by name
 * @param {string} viewName - View name (e.g., 'tasks', 'projects')
 * @returns {function|null} Renderer function or null if not found
 */
export function getPageRenderer(viewName) {
  return PAGES[viewName] || null;
}

/**
 * Check if a page renderer exists
 * @param {string} viewName - View name
 * @returns {boolean}
 */
export function hasPageRenderer(viewName) {
  return viewName in PAGES;
}
