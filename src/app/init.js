// ═══════════════════════ APP INITIALIZATION ═══════════════════════
// Single entry point for app initialization
// Replaces the monolithic script blocks in tasklist.html

import { appStore } from '../state/store.js';
import { handlers } from '../ui/handlers.js';
import { initPersistence, setLoading } from '../storage/persistence.js';
import { switchView as routerSwitchView } from './router.js';
import { PAGES, getPageRenderer } from './pages.js';
import { renderRegistry } from './renderRegistry.js';

// Import page modules
import * as CellLogPage from '../pages/CellLogPage.js';
import { renderSettingsPage } from '../pages/SettingsPage.js';
import { renderTodayPage } from '../pages/TodayPage.js';
import { renderWorkflowPage, switchWorkflowView, toggleWorkflowFilter, filterWorkflowProjects, setWorkflowProjectFilter, toggleWorkflowExpand, buildWorkflowTimeline, toggleTlExpand, renderWorkflowList } from '../pages/WorkflowPage.js';
import { renderPlannerPage } from '../pages/PlannerPage.js';
import { renderProjectsPage } from '../pages/ProjectsPage.js';
import { renderTasksPage } from '../pages/TasksPage.js';
import { renderThreeDPrintPage } from '../pages/ThreeDPrintPage.js';
import { renderCellLogPage } from '../pages/CellLogPage.js';

// Import feature modules
import * as FileManagement from '../features/fileManagement.js';
import * as FileOperations from '../features/fileOperations.js';
import * as TaskOperations from '../features/taskOperations.js';
import * as ProjectOperations from '../features/projectOperations.js';
import * as DeleteHandlers from '../features/deleteHandlers.js';
import * as TaskDrawer from '../features/taskDrawer.js';
import * as ExportImport from '../features/exportImport.js';
import * as Search from '../features/search.js';

// Import domain and utilities
import { LANE_STAGES, MATRIX_STAGES, MATRIX_LANES, DEFAULT_BOARD_COLUMNS } from '../domain/schema.js';
import { getMatrixStage, isTaskBlocked, getAllTasks } from '../domain/models.js';
import { today, parseDate, dueLabel, parseTime, formatTime } from '../utils/dates.js';
import { esc, fileIcon, normalizePriorityValue, getEditOnclick, normalizeDueInput } from '../utils/strings.js';
import * as uiModules from '../ui/index.js';
import * as uiHelpers from '../ui/helpers.js';
import * as projectHelpers from '../utils/projectHelpers.js';
import * as migrations from '../utils/migrations.js';
import * as vaultUtils from '../utils/vault.js';
import * as settingsUtils from '../utils/settings.js';
import * as modals from '../ui/modals.js';
import * as conflictBanner from '../ui/conflictBanner.js';
import * as diagnostics from '../ui/diagnostics.js';
import * as colorPicker from '../ui/colorPicker.js';
import * as HabitsFeature from '../features/habits.js';
import * as RoutinesFeature from '../features/routines.js';
import { renderPlannerHabits } from '../ui/renderPlannerHabits.js';
import { renderPlannerRoutines } from '../ui/renderPlannerRoutines.js';

// Import delegation setup
import { setupEventDelegation } from './delegation.js';

// Import render functions
import { renderGlobalSidebar, render } from './viewManager.js';

/**
 * Initialize the application
 * This is the single entry point that wires everything together
 */
export async function initApp() {
  console.log('🚀 Initializing Petal app...');
  
  // IMMEDIATE: Ensure app container and sidebar are visible
  const appEl = document.querySelector('.app');
  const sidebarEl = document.getElementById('global-sidebar');
  
  if (appEl) {
    appEl.style.setProperty('display', 'grid', 'important');
    appEl.style.setProperty('visibility', 'visible', 'important');
    appEl.style.setProperty('opacity', '1', 'important');
  }
  
  if (sidebarEl) {
    sidebarEl.style.setProperty('display', 'flex', 'important');
    sidebarEl.style.setProperty('visibility', 'visible', 'important');
    sidebarEl.style.setProperty('opacity', '1', 'important');
  }
  
  console.log('🔍 Initial visibility check:', {
    hasApp: !!appEl,
    hasSidebar: !!sidebarEl,
    appDisplay: appEl ? window.getComputedStyle(appEl).display : 'N/A',
    sidebarDisplay: sidebarEl ? window.getComputedStyle(sidebarEl).display : 'N/A'
  });
  
  // Step 1: Set up window.Petal namespace
  window.Petal = window.Petal || {};
  window.Petal.store = appStore;
  window.Petal.handlers = handlers;
  
  // Set up window.Petal.ui namespace
  window.Petal.ui = window.Petal.ui || {};
  Object.assign(window.Petal.ui, uiModules);
  Object.assign(window.Petal.ui, uiHelpers);
  window.Petal.ui.renderPlannerHabits = renderPlannerHabits;
  window.Petal.ui.renderPlannerRoutines = renderPlannerRoutines;
  
  // Set up window.Petal.features namespace
  window.Petal.features = window.Petal.features || {};
  window.Petal.features.fileManagement = FileManagement;
  window.Petal.features.fileOperations = FileOperations;
  window.Petal.features.taskOperations = TaskOperations;
  window.Petal.features.projectOperations = ProjectOperations;
  window.Petal.features.deleteHandlers = DeleteHandlers;
  window.Petal.features.taskDrawer = TaskDrawer;
  window.Petal.features.exportImport = ExportImport;
  window.Petal.features.search = Search;
  window.Petal.features.habits = HabitsFeature;
  window.Petal.features.routines = RoutinesFeature;
  
  // Set up window.Petal.utils namespace
  window.Petal.utils = window.Petal.utils || {};
  Object.assign(window.Petal.utils, projectHelpers);
  Object.assign(window.Petal.utils, migrations);
  Object.assign(window.Petal.utils, vaultUtils);
  Object.assign(window.Petal.utils, settingsUtils);
  window.Petal.utils.normalizePriorityValue = normalizePriorityValue;
  window.Petal.utils.getEditOnclick = getEditOnclick;
  window.Petal.utils.normalizeDueInput = normalizeDueInput;
  
  // Domain functions (wrapped to take state explicitly from store)
  window.Petal.getMatrixStage = (task) => {
    const state = appStore.getState();
    const allTasks = getAllTasks(state.tasks, state.projects);
    return getMatrixStage(task, allTasks);
  };
  
  window.Petal.isTaskBlocked = (task) => {
    const state = appStore.getState();
    const allTasks = getAllTasks(state.tasks, state.projects);
    return isTaskBlocked(task, allTasks);
  };
  
  window.Petal.getAllTasks = () => {
    const state = appStore.getState();
    return getAllTasks(state.tasks || [], state.projects || []);
  };
  
  // Also expose getAllTasks function directly for use in render functions
  window.getAllTasks = getAllTasks;
  
  // Utilities
  window.Petal.today = today;
  window.Petal.parseDate = parseDate;
  window.Petal.dueLabel = dueLabel;
  window.Petal.esc = esc;
  window.Petal.fileIcon = fileIcon;
  window.Petal.parseTime = parseTime;
  window.Petal.formatTime = formatTime;
  
  // Constants
  window.Petal.LANE_STAGES = LANE_STAGES;
  window.Petal.MATRIX_STAGES = MATRIX_STAGES;
  window.Petal.MATRIX_LANES = MATRIX_LANES;
  window.Petal.DEFAULT_BOARD_COLUMNS = DEFAULT_BOARD_COLUMNS;
  
  // Expose constants to window for backward compatibility
  window.LANE_STAGES = LANE_STAGES;
  window.MATRIX_STAGES = MATRIX_STAGES;
  window.MATRIX_LANES = MATRIX_LANES;
  window.DEFAULT_BOARD_COLUMNS = DEFAULT_BOARD_COLUMNS;
  
  // Step 2: Set up read-only globals (getters from store)
  setupReadOnlyGlobals();
  
  // Step 3: Initialize persistence (auto-saves on state changes)
  initPersistence();
  
  // Step 4: Expose page renderers globally (for backward compatibility)
  exposePageRenderers();
  
  // Step 5: Set up router as single view switch entrypoint
  setupRouter();
  
  // Step 6: Set up event delegation
  setupEventDelegation();
  
  // Step 7: Initialize state (vault resolution, loading, migrations)
  await initState();
  
  // Step 8: Wire render function to store changes
  appStore.subscribe(() => {
    if (typeof render === 'function') {
      render();
    }
  });
  
  console.log('✅ App initialization complete');
  
  // Mark app as initialized to prevent old initState from running
  window.__appInitialized = true;
  
  // FORCE: Ensure initial render happens immediately after init completes
  setTimeout(() => {
    console.log('🔍 Forcing post-init render...');
    
    // Ensure app container and sidebar are visible
    const appEl = document.querySelector('.app');
    const sidebarEl = document.getElementById('global-sidebar');
    
    if (appEl) {
      appEl.style.setProperty('display', 'grid', 'important');
      appEl.style.setProperty('visibility', 'visible', 'important');
    }
    
    if (sidebarEl) {
      sidebarEl.style.setProperty('display', 'flex', 'important');
      sidebarEl.style.setProperty('visibility', 'visible', 'important');
    }
    
    // Force render
    if (typeof render === 'function') {
      render();
    }
    
    // Also ensure initial view is shown
    const currentView = appStore.getState()?.currentView || window.currentView || 'tasks';
    const viewEl = document.getElementById(`view-${currentView}`);
    if (viewEl) {
      // Hide all other views
      document.querySelectorAll('[id^="view-"]').forEach(el => {
        if (el.id !== `view-${currentView}`) {
          el.style.setProperty('display', 'none', 'important');
        }
      });
      // Show current view
      viewEl.style.setProperty('display', 'block', 'important');
      viewEl.style.setProperty('visibility', 'visible', 'important');
    }
    
    console.log('🔍 Post-init visibility check:', {
      currentView,
      hasViewEl: !!viewEl,
      viewDisplay: viewEl ? window.getComputedStyle(viewEl).display : 'N/A',
      hasSidebar: !!sidebarEl,
      sidebarDisplay: sidebarEl ? window.getComputedStyle(sidebarEl).display : 'N/A'
    });
  }, 150);
}

/**
 * Set up read-only globals that read from store
 */
function setupReadOnlyGlobals() {
  Object.defineProperty(window, "tasks", {
    get: () => window.Petal?.store?.getState()?.tasks || [],
    set: () => { 
      console.error("❌ ERROR: Cannot assign to window.tasks - use store.setState()");
      throw new Error("Cannot assign to window.tasks - use store.setState()");
    },
    configurable: true
  });

  Object.defineProperty(window, "projects", {
    get: () => window.Petal?.store?.getState()?.projects || [],
    set: () => { 
      console.error("❌ ERROR: Cannot assign to window.projects - use store.setState()");
      throw new Error("Cannot assign to window.projects - use store.setState()");
    },
    configurable: true
  });

  Object.defineProperty(window, "events", {
    get: () => window.Petal?.store?.getState()?.events || [],
    set: () => { 
      console.error("❌ ERROR: Cannot assign to window.events - use store.setState()");
      throw new Error("Cannot assign to window.events - use store.setState()");
    },
    configurable: true
  });

  Object.defineProperty(window, "recurringRules", {
    get: () => window.Petal?.store?.getState()?.recurringRules || [],
    set: () => { 
      console.error("❌ ERROR: Cannot assign to window.recurringRules - use store.setState()");
      throw new Error("Cannot assign to window.recurringRules - use store.setState()");
    },
    configurable: true
  });
  
  // Planner state - read-only getters from store
  Object.defineProperty(window, "plannerViewDate", {
    get: () => {
      const state = window.Petal?.store?.getState();
      return state?.plannerViewDate || new Date();
    },
    set: () => { 
      console.error("❌ ERROR: Cannot assign to window.plannerViewDate - use handlers.setPlannerViewDate()");
      throw new Error("Cannot assign to window.plannerViewDate - use handlers.setPlannerViewDate()");
    },
    configurable: true
  });
  
  Object.defineProperty(window, "currentPlannerView", {
    get: () => window.Petal?.store?.getState()?.currentPlannerView || 'daily',
    set: () => { 
      console.error("❌ ERROR: Cannot assign to window.currentPlannerView - use handlers.setCurrentPlannerView()");
      throw new Error("Cannot assign to window.currentPlannerView - use handlers.setCurrentPlannerView()");
    },
    configurable: true
  });
  
  Object.defineProperty(window, "plannerWeekOffset", {
    get: () => window.Petal?.store?.getState()?.plannerWeekOffset || 0,
    set: () => { 
      console.error("❌ ERROR: Cannot assign to window.plannerWeekOffset - use handlers.setPlannerWeekOffset()");
      throw new Error("Cannot assign to window.plannerWeekOffset - use handlers.setPlannerWeekOffset()");
    },
    configurable: true
  });
  
  Object.defineProperty(window, "plannerCalYear", {
    get: () => {
      const state = window.Petal?.store?.getState();
      return state?.plannerCalYear !== null ? state.plannerCalYear : new Date().getFullYear();
    },
    set: () => { 
      console.error("❌ ERROR: Cannot assign to window.plannerCalYear - use handlers.setPlannerCalYear()");
      throw new Error("Cannot assign to window.plannerCalYear - use handlers.setPlannerCalYear()");
    },
    configurable: true
  });
  
  Object.defineProperty(window, "plannerCalMonth", {
    get: () => {
      const state = window.Petal?.store?.getState();
      return state?.plannerCalMonth !== null ? state.plannerCalMonth : new Date().getMonth();
    },
    set: () => { 
      console.error("❌ ERROR: Cannot assign to window.plannerCalMonth - use handlers.setPlannerCalMonth()");
      throw new Error("Cannot assign to window.plannerCalMonth - use handlers.setPlannerCalMonth()");
    },
    configurable: true
  });
  
  console.log('✓ Phase 1: Window globals are now read-only getters from store');
}

/**
 * Expose page renderers globally for backward compatibility
 */
function exposePageRenderers() {
  window.renderTodayPage = renderTodayPage;
  window.renderSettingsPage = renderSettingsPage;
  window.renderPlannerPage = renderPlannerPage;
  window.renderProjectsPage = renderProjectsPage;
  window.renderTasksPage = renderTasksPage;
  window.renderThreeDPrintPage = renderThreeDPrintPage;
  window.renderCellLogPage = renderCellLogPage;
  window.renderWorkflowPage = renderWorkflowPage;
  window.switchWorkflowView = switchWorkflowView;
  window.toggleWorkflowFilter = toggleWorkflowFilter;
  window.filterWorkflowProjects = filterWorkflowProjects;
  window.setWorkflowProjectFilter = setWorkflowProjectFilter;
  window.toggleWorkflowExpand = toggleWorkflowExpand;
  window.buildWorkflowTimeline = buildWorkflowTimeline;
  window.toggleTlExpand = toggleTlExpand;
  window.renderWorkflowList = renderWorkflowList;
  
  // Make PAGES registry available globally
  window.PAGES = PAGES;
  window.renderRegistry = renderRegistry;
}

/**
 * Set up router as the single view switch entrypoint
 */
function setupRouter() {
  // Make router switchView the ONE AND ONLY entrypoint for view switching
  window.switchView = routerSwitchView;
  window.routerSwitchView = routerSwitchView; // Alias for backward compatibility
  
  // Protect against accidental redefinition
  const originalSwitchView = window.switchView;
  Object.defineProperty(window, 'switchView', {
    get() {
      return originalSwitchView;
    },
    set(newValue) {
      if (newValue !== originalSwitchView) {
        console.error('❌ SECURITY: switchView was redefined! This should not happen.', {
          oldValue: originalSwitchView,
          newValue: newValue,
          stack: new Error().stack
        });
      }
      // Still allow setting, but log the violation
      Object.defineProperty(window, 'switchView', {
        value: newValue,
        writable: true,
        configurable: true
      });
    },
    configurable: true
  });
  
  // Safe wrapper that handles errors gracefully
  window.switchViewSafe = function(v) {
    try {
      if (window.switchView) {
        return window.switchView(v);
      } else {
        console.error('switchView function not available');
        // Fallback: try to show view manually
        const viewEl = document.getElementById('view-' + v);
        if (viewEl) {
          // Hide all views
          document.querySelectorAll('[id^="view-"]').forEach(el => {
            el.style.display = 'none';
          });
          // Show requested view
          viewEl.style.display = '';
          window.currentView = v;
        }
      }
    } catch (error) {
      console.error('Error in switchViewSafe:', error);
    }
  };
}

/**
 * Initialize state (vault resolution, loading, migrations)
 * This is a large function that handles all the initialization logic
 */
async function initState() {
  // This will be extracted from tasklist.html
  // For now, import it from a separate module
  const { initStateInternal } = await import('./initState.js');
  await initStateInternal();
}
