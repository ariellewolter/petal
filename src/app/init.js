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
import { renderSettingsPage, renderSettingsFallback } from '../pages/SettingsPage.js';
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
import * as ModalOperations from '../features/modalOperations.js';
import * as DeleteHandlers from '../features/deleteHandlers.js';
import * as TaskDrawer from '../features/taskDrawer.js';
import * as ExportImport from '../features/exportImport.js';
import * as Search from '../features/search.js';

// Import domain and utilities
import { LANE_STAGES, MATRIX_STAGES, MATRIX_LANES, DEFAULT_BOARD_COLUMNS } from '../domain/schema.js';
import { getMatrixStage, isTaskBlocked, getAllTasks } from '../domain/models.js';
import * as ordering from '../domain/ordering.js';
import { today, parseDate, dueLabel, parseTime, formatTime } from '../utils/dates.js';
import { esc, escAttr, fileIcon, normalizePriorityValue, getEditOnclick, normalizeDueInput } from '../utils/strings.js';
import * as uiModules from '../ui/index.js';
import * as uiHelpers from '../ui/helpers.js';
import * as uiHelpersNew from '../ui/uiHelpers.js';
import * as projectHelpers from '../utils/projectHelpers.js';
import * as taskHelpers from '../utils/taskHelpers.js';
import * as fileHelpers from '../utils/fileHelpers.js';
import * as migrations from '../utils/migrations.js';
import * as vaultUtils from '../utils/vault.js';
import * as settingsUtils from '../utils/settings.js';
import * as themeUtils from '../utils/theme.js';
import * as modals from '../ui/modals.js';
import * as conflictBanner from '../ui/conflictBanner.js';
import * as diagnostics from '../ui/diagnostics.js';
import * as colorPicker from '../ui/colorPicker.js';
import * as HabitsFeature from '../features/habits.js';
import * as RoutinesFeature from '../features/routines.js';
import { renderPlannerHabits } from '../ui/renderPlannerHabits.js';
import { renderPlannerRoutines } from '../ui/renderPlannerRoutines.js';
import * as RenderProjectUI from '../ui/renderProjectUI.js';
import * as RenderProjectViews from '../ui/renderProjectViews.js';
import * as RenderWorkflowMatrix from '../ui/renderWorkflowMatrix.js';
import * as RenderLanes from '../ui/renderLanes.js';
import * as PlannerOperations from '../features/plannerOperations.js';
import * as MatrixOperations from '../features/matrixOperations.js';
import * as ReviewOperations from '../features/reviewOperations.js';

// Note: Event delegation is now set up in TodayPage.js

// Import render functions
import { renderGlobalSidebar, render } from './viewManager.js';
import { setupEventDelegation } from './delegation.js';
import { auditHookups } from './auditHookups.js';
import * as buttonHandlers from '../ui/buttonHandlers.js';

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
    appEl.style.setProperty('grid-template-columns', '220px minmax(0, 1fr)', 'important');
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
  
  // Add createPageContext helper to handlers if not already present
  // Create page context directly from store to avoid circular calls
  // DO NOT call window.createPageContext as it may call back to handlers.createPageContext
  if (!handlers.createPageContext) {
    handlers.createPageContext = function() {
      // Create context directly from store (no circular calls)
      const state = appStore.getState();
      const ui = window.Petal?.ui || {};
      return {
        store: appStore,
        state: state,
        tasks: Array.isArray(state.tasks) ? state.tasks : [],
        projects: Array.isArray(state.projects) ? state.projects : [],
        events: Array.isArray(state.events) ? state.events : [],
        recurringRules: Array.isArray(state.recurringRules) ? state.recurringRules : [],
        settings: state.settings || {},
        fileRegistry: window.fileRegistry || {},
        fileHistory: window.fileHistory || {},
        save: handlers.save || (() => {}),
        render: window.render || (() => {}),
        esc: window.Petal?.esc || esc,
        dueLabel: window.Petal?.dueLabel || dueLabel,
        renderTodayTimeline: ui.renderTodayTimeline,
        renderActiveProtocols: ui.renderActiveProtocols,
        renderCellLog: ui.renderCellLog,
        renderCompWindow: ui.renderCompWindow,
        renderDeadlinesHorizon: ui.renderDeadlinesHorizon,
        renderProjectTasks: ui.renderProjectTasks,
        renderProjectOverviewSections: ui.renderProjectOverviewSections,
        renderProgressMomentum: ui.renderProgressMomentum,
        renderWorkingLog: ui.renderWorkingLog,
        renderArtifacts: ui.renderArtifacts,
        renderProtocolRuns: ui.renderProtocolRuns,
        renderMilestonesTimeline: ui.renderMilestonesTimeline,
        renderProjectMilestones: ProjectOperations.renderProjectMilestones,
        normalizeProjectIdValue: projectHelpers.normalizeProjectIdValue,
        escAttr: escAttr,
        renderTaskItem: ui.renderTaskItem,
        selectedProjectId: window.selectedProjectId
      };
    };
  }
  
  // Set up window.Petal.app namespace
  window.Petal.app = window.Petal.app || {};
  window.Petal.app.setupEventDelegation = setupEventDelegation;
  
  // Set up window.Petal.ui namespace
  window.Petal.ui = window.Petal.ui || {};
  Object.assign(window.Petal.ui, uiModules);
  Object.assign(window.Petal.ui, uiHelpers);
  Object.assign(window.Petal.ui, uiHelpersNew);
  window.Petal.ui.renderPlannerHabits = renderPlannerHabits;
  window.Petal.ui.renderPlannerRoutines = renderPlannerRoutines;
  Object.assign(window.Petal.ui, RenderProjectViews);
  // Expose UI handlers for legacy functions
  window.Petal.ui.handlers = handlers.uiHandlers;
  
  // Set up window.Petal.domain namespace
  window.Petal.domain = window.Petal.domain || {};
  window.Petal.domain.ordering = ordering;
  
  // Set up window.Petal.utils namespace
  window.Petal.utils = window.Petal.utils || {};
  window.Petal.utils.projectHelpers = projectHelpers;
  Object.assign(window.Petal.ui, RenderProjectUI);
  Object.assign(window.Petal.ui, buttonHandlers);
  Object.assign(window.Petal.ui, RenderWorkflowMatrix);
  Object.assign(window.Petal.ui, RenderLanes);
  
  // Set up window.Petal.pages namespace
  window.Petal.pages = window.Petal.pages || {};
  window.Petal.pages.cellLog = CellLogPage;
  
  // Set up window.Petal.features namespace
  window.Petal.features = window.Petal.features || {};
  window.Petal.features.fileManagement = FileManagement;
  window.Petal.features.fileOperations = FileOperations;
  window.Petal.features.taskOperations = TaskOperations;
  window.Petal.features.projectOperations = ProjectOperations;
  window.Petal.features.modalOperations = ModalOperations;
  window.Petal.features.deleteHandlers = DeleteHandlers;
  window.Petal.features.matrixOperations = MatrixOperations;
  window.Petal.features.plannerOperations = PlannerOperations;
  window.Petal.features.reviewOperations = ReviewOperations;
  window.Petal.features.taskDrawer = TaskDrawer;
  window.Petal.features.exportImport = ExportImport;
  window.Petal.features.search = Search;
  window.Petal.features.habits = HabitsFeature;
  window.Petal.features.routines = RoutinesFeature;
  
  // Set up window.Petal.utils namespace
  window.Petal.utils = window.Petal.utils || {};
  Object.assign(window.Petal.utils, projectHelpers);
  Object.assign(window.Petal.utils, taskHelpers);
  window.Petal.utils.getAllTasks = (tasks, projects) =>
    getAllTasks(tasks || [], projects || []);
  Object.assign(window.Petal.utils, fileHelpers);
  Object.assign(window.Petal.utils, migrations);
  Object.assign(window.Petal.utils, vaultUtils);
  Object.assign(window.Petal.utils, settingsUtils);
  Object.assign(window.Petal.utils, themeUtils);
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
  
  // Step 5.5: Set up global event delegation (all hookups)
  // This ensures all app-wide event handlers are initialized before any page renders
  setupEventDelegation();
  
  // Step 6: Initialize state (vault resolution, loading, migrations)
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
      appEl.style.setProperty('grid-template-columns', '220px minmax(0, 1fr)', 'important');
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
    const currentView = appStore.getState()?.currentView || window.currentView || 'today';
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
  window.renderSettingsFallback = renderSettingsFallback;
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
  
  // Expose planner handlers to window for event delegation
  if (handlers?.navigatePlannerDate) {
    window.plannerNav = (direction) => {
      handlers.navigatePlannerDate(direction);
    };
  }
  if (handlers?.setPlannerView) {
    window.setPlannerView = (view, containerEl) => {
      const container = containerEl || document.getElementById('view-planner');
      handlers.setPlannerView(view, container);
    };
  }
  if (handlers?.navigatePlannerCalendar) {
    window.plannerCalNav = (direction) => {
      handlers.navigatePlannerCalendar(direction);
      // Trigger re-render after calendar navigation
      if (window.routerSwitchView) {
        window.routerSwitchView('planner');
      }
    };
  }
  if (handlers?.resetPlannerDate) {
    window.plannerGoToday = () => {
      handlers.resetPlannerDate();
    };
  }
  
  // Ensure event modal functions are available (they're defined in tasklist.html but ensure they're accessible)
  // These functions are defined globally in tasklist.html, but we ensure they're accessible here
  if (typeof window.closeEventModal === 'undefined') {
    window.closeEventModal = function() {
      const modal = document.getElementById('event-modal');
      const deleteBtn = document.getElementById('event-delete-btn');
      if (modal) {
        modal.classList.remove('active');
        modal.style.display = 'none';
      }
      if (deleteBtn) deleteBtn.style.display = 'none';
      if (typeof window.editingEventId !== 'undefined') {
        window.editingEventId = null;
      }
    };
  }
  
  if (typeof window.submitEventModal === 'undefined') {
    // Fallback - the real function is in tasklist.html
    window.submitEventModal = async function() {
      console.warn('submitEventModal not found - ensure it is defined in tasklist.html');
    };
  }
  
  if (typeof window.openAddEventModal === 'undefined') {
    // Fallback - the real function is in tasklist.html
    window.openAddEventModal = function(dateStr) {
      console.warn('openAddEventModal not found - ensure it is defined in tasklist.html');
    };
  }
  
  // Ensure openAddTaskModal is available (wrapper in tasklist.html should handle this, but ensure it's accessible)
  if (typeof window.openAddTaskModal === 'undefined' && window.Petal?.features?.modalOperations?.openAddTaskModal) {
    window.openAddTaskModal = function() {
      window.Petal.features.modalOperations.openAddTaskModal();
    };
  }
  
  // Make PAGES registry available globally
  window.PAGES = PAGES;
  window.renderRegistry = renderRegistry;
  
  // Expose all window functions needed for event delegation
  // These are primarily defined in tasklist.html, but we ensure they're accessible here
  exposeWindowFunctions();
}

/**
 * Expose all window functions needed for event delegation
 * These functions are primarily defined in tasklist.html as wrappers,
 * but we ensure they're accessible here as a safety net
 */
function exposeWindowFunctions() {
  // Task drawer functions (wrappers in tasklist.html call TaskDrawer module)
  // These are set up in tasklist.html, but ensure they exist
  if (typeof window.closeTaskDrawer === 'undefined' && window.Petal?.features?.taskDrawer?.closeTaskDrawer) {
    window.closeTaskDrawer = window.Petal.features.taskDrawer.closeTaskDrawer;
  }
  if (typeof window.switchTaskDrawerTab === 'undefined' && window.Petal?.features?.taskDrawer?.switchTaskDrawerTab) {
    window.switchTaskDrawerTab = window.Petal.features.taskDrawer.switchTaskDrawerTab;
  }
  if (typeof window.addTaskLogEntry === 'undefined' && window.Petal?.features?.taskDrawer?.addTaskLogEntry) {
    window.addTaskLogEntry = async () => {
      const ctx = window.Petal?.handlers?.createPageContext?.() || { tasks: [], projects: [] };
      await window.Petal.features.taskDrawer.addTaskLogEntry(ctx);
    };
  }
  if (typeof window.saveProtocolDailyEntry === 'undefined' && window.Petal?.features?.taskOperations?.saveProtocolDailyEntry) {
    window.saveProtocolDailyEntry = async () => {
      const ctx = window.Petal?.handlers?.createPageContext?.() || { tasks: [], projects: [] };
      await window.Petal.features.taskOperations.saveProtocolDailyEntry(ctx);
    };
  }
  if (typeof window.linkFileToProtocolEntry === 'undefined' && window.Petal?.features?.taskOperations?.linkFileToProtocolEntry) {
    window.linkFileToProtocolEntry = window.Petal.features.taskOperations.linkFileToProtocolEntry;
  }
  if (typeof window.toggleProtocolSteps === 'undefined' && window.Petal?.features?.taskOperations?.toggleProtocolSteps) {
    window.toggleProtocolSteps = window.Petal.features.taskOperations.toggleProtocolSteps;
  }
  if (typeof window.addProtocolStep === 'undefined' && window.Petal?.features?.taskOperations?.addProtocolStep) {
    window.addProtocolStep = async () => {
      const ctx = window.Petal?.handlers?.createPageContext?.() || { tasks: [], projects: [] };
      await window.Petal.features.taskOperations.addProtocolStep(ctx);
    };
  }
  if (typeof window.linkExistingFileToTask === 'undefined' && window.Petal?.features?.taskDrawer?.linkExistingFileToTask) {
    window.linkExistingFileToTask = async () => {
      const ctx = window.Petal?.handlers?.createPageContext?.() || { tasks: [], projects: [] };
      await window.Petal.features.taskDrawer.linkExistingFileToTask(ctx);
    };
  }
  if (typeof window.addNewFileToTask === 'undefined' && window.Petal?.features?.taskDrawer?.addNewFileToTask) {
    window.addNewFileToTask = window.Petal.features.taskDrawer.addNewFileToTask;
  }
  if (typeof window.addSubtaskToTask === 'undefined' && window.Petal?.features?.taskDrawer?.addSubtaskToTask) {
    window.addSubtaskToTask = async () => {
      const ctx = window.Petal?.handlers?.createPageContext?.() || { tasks: [], projects: [] };
      await window.Petal.features.taskDrawer.addSubtaskToTask(ctx);
    };
  }
  
  // File operations
  if (typeof window.addFileRow === 'undefined' && window.Petal?.features?.fileOperations?.addFileRow) {
    window.addFileRow = window.Petal.features.fileOperations.addFileRow;
  }
  if (typeof window.confirmDeleteFile === 'undefined' && window.Petal?.features?.deleteHandlers?.confirmDeleteFile) {
    window.confirmDeleteFile = (projectId, fileId) => {
      const ctx = window.Petal?.handlers?.createPageContext?.() || { tasks: [], projects: [] };
      window.Petal.features.deleteHandlers.confirmDeleteFile(ctx, projectId, fileId);
    };
  }
  
  // Project operations
  if (typeof window.addMilestone === 'undefined' && window.Petal?.features?.projectOperations?.addMilestone) {
    window.addMilestone = async () => {
      const ctx = window.Petal?.handlers?.createPageContext?.() || { tasks: [], projects: [] };
      await window.Petal.features.projectOperations.addMilestone(ctx);
    };
  }
  if (typeof window.openArtifactDetail === 'undefined' && window.Petal?.features?.projectOperations?.openArtifactDetail) {
    window.openArtifactDetail = (artifactId) => {
      const ctx = window.Petal?.handlers?.createPageContext?.() || { tasks: [], projects: [] };
      window.Petal.features.projectOperations.openArtifactDetail(ctx, artifactId);
    };
  }
  if (typeof window.closeArtifactDetail === 'undefined' && window.Petal?.features?.projectOperations?.closeArtifactDetail) {
    window.closeArtifactDetail = window.Petal.features.projectOperations.closeArtifactDetail;
  }
  if (typeof window.openProtocolRunDetail === 'undefined' && window.Petal?.features?.projectOperations?.openProtocolRunDetail) {
    window.openProtocolRunDetail = (runId) => {
      const ctx = window.Petal?.handlers?.createPageContext?.() || { tasks: [], projects: [] };
      window.Petal.features.projectOperations.openProtocolRunDetail(ctx, runId);
    };
  }
  if (typeof window.closeProtocolRunDetail === 'undefined' && window.Petal?.features?.projectOperations?.closeProtocolRunDetail) {
    window.closeProtocolRunDetail = window.Petal.features.projectOperations.closeProtocolRunDetail;
  }
  if (typeof window.addFileToArtifact === 'undefined' && window.Petal?.features?.projectOperations?.addFileToArtifact) {
    window.addFileToArtifact = async (artifactId) => {
      const ctx = window.Petal?.handlers?.createPageContext?.() || { tasks: [], projects: [] };
      await window.Petal.features.projectOperations.addFileToArtifact(ctx, artifactId);
    };
  }
  if (typeof window.saveArtifactNotes === 'undefined' && window.Petal?.features?.projectOperations?.saveArtifactNotes) {
    window.saveArtifactNotes = async (artifactId) => {
      const ctx = window.Petal?.handlers?.createPageContext?.() || { tasks: [], projects: [] };
      await window.Petal.features.projectOperations.saveArtifactNotes(ctx, artifactId);
    };
  }
  if (typeof window.editFileNotes === 'undefined' && window.Petal?.features?.projectOperations?.editFileNotes) {
    window.editFileNotes = async (fileId) => {
      const ctx = window.Petal?.handlers?.createPageContext?.() || { tasks: [], projects: [] };
      await window.Petal.features.projectOperations.editFileNotes(ctx, fileId);
    };
  }
  if (typeof window.addProtocolRunLogEntry === 'undefined' && window.Petal?.features?.projectOperations?.addProtocolRunLogEntry) {
    window.addProtocolRunLogEntry = async (runId) => {
      const ctx = window.Petal?.handlers?.createPageContext?.() || { tasks: [], projects: [] };
      await window.Petal.features.projectOperations.addProtocolRunLogEntry(ctx, runId);
    };
  }
  if (typeof window.switchProjectFilesTab === 'undefined' && window.Petal?.ui?.switchProjectFilesTab) {
    window.switchProjectFilesTab = async (tab) => {
      const ctx = window.Petal?.handlers?.createPageContext?.() || { tasks: [], projects: [] };
      await window.Petal.ui.switchProjectFilesTab(ctx, tab);
    };
  }
  if (typeof window.openProjectAddFileModal === 'undefined' && window.Petal?.features?.modalOperations?.openProjectAddFileModal) {
    window.openProjectAddFileModal = (projId) => {
      const ctx = window.Petal?.handlers?.createPageContext?.() || { tasks: [], projects: [] };
      window.Petal.features.modalOperations.openProjectAddFileModal(ctx, projId);
    };
  }
  
  // Modal operations (these are primarily in tasklist.html, but ensure they exist)
  if (typeof window.closeEditModal === 'undefined' && window.Petal?.ui?.closeEditModal) {
    window.closeEditModal = window.Petal.ui.closeEditModal;
  }
  if (typeof window.saveEditModal === 'undefined' && window.Petal?.features?.taskOperations?.saveEditModal) {
    window.saveEditModal = async () => {
      const ctx = window.Petal?.handlers?.createPageContext?.() || { tasks: [], projects: [] };
      await window.Petal.features.taskOperations.saveEditModal(ctx);
    };
  }
  if (typeof window.submitAddTaskModal === 'undefined' && window.Petal?.features?.modalOperations?.submitAddTaskModal) {
    window.submitAddTaskModal = async () => {
      const ctx = window.Petal?.handlers?.createPageContext?.() || { tasks: [], projects: [] };
      await window.Petal.features.modalOperations.submitAddTaskModal(ctx);
    };
  }
  if (typeof window.submitAddFileModal === 'undefined' && window.Petal?.features?.modalOperations?.submitAddFileModal) {
    window.submitAddFileModal = async () => {
      const ctx = window.Petal?.handlers?.createPageContext?.() || { tasks: [], projects: [] };
      await window.Petal.features.modalOperations.submitAddFileModal(ctx);
    };
  }
  if (typeof window.saveFileNotes === 'undefined' && window.Petal?.features?.modalOperations?.saveFileNotes) {
    window.saveFileNotes = async () => {
      await window.Petal.features.modalOperations.saveFileNotes();
    };
  }
   if (typeof window.closeAddTaskModal === 'undefined' && window.Petal?.features?.modalOperations?.closeAddTaskModal) {
     window.closeAddTaskModal = window.Petal.features.modalOperations.closeAddTaskModal;
   }
   if (typeof window.closeAddFileModal === 'undefined' && window.Petal?.features?.modalOperations?.closeAddFileModal) {
     window.closeAddFileModal = window.Petal.features.modalOperations.closeAddFileModal;
   }
   if (typeof window.closeFileNotesModal === 'undefined' && window.Petal?.features?.modalOperations?.closeFileNotesModal) {
     window.closeFileNotesModal = window.Petal.features.modalOperations.closeFileNotesModal;
   }
  if (typeof window.executeDelete === 'undefined' && window.Petal?.features?.deleteHandlers?.executeDelete) {
    window.executeDelete = async () => {
      const ctx = window.Petal?.handlers?.createPageContext?.() || { tasks: [], projects: [] };
      await window.Petal.features.deleteHandlers.executeDelete(ctx);
    };
  }
  if (typeof window.closeDeleteConfirmModal === 'undefined' && window.Petal?.features?.deleteHandlers?.closeDeleteConfirmModal) {
    window.closeDeleteConfirmModal = window.Petal.features.deleteHandlers.closeDeleteConfirmModal;
  }
  
  // Workflow operations
  if (typeof window.closeWfDetail === 'undefined') {
    // This is defined in WorkflowPage.js, ensure it's accessible
    window.closeWfDetail = function() {
      const detailEl = document.getElementById('workflow-detail');
      if (detailEl) {
        detailEl.style.display = 'none';
      }
    };
  }
  
  // Habits and routines (these are in tasklist.html, but ensure they exist)
  if (typeof window.closeHabitModal === 'undefined' && window.Petal?.features?.habits?.closeHabitModal) {
    window.closeHabitModal = window.Petal.features.habits.closeHabitModal;
  }
  if (typeof window.submitHabitModal === 'undefined' && window.Petal?.features?.habits?.submitHabitModal) {
    window.submitHabitModal = window.Petal.features.habits.submitHabitModal;
  }
  if (typeof window.closeRoutineModal === 'undefined' && window.Petal?.features?.routines?.closeRoutineModal) {
    window.closeRoutineModal = window.Petal.features.routines.closeRoutineModal;
  }
  if (typeof window.submitRoutineModal === 'undefined' && window.Petal?.features?.routines?.submitRoutineModal) {
    window.submitRoutineModal = window.Petal.features.routines.submitRoutineModal;
  }
  
  // Diagnostics (these are in tasklist.html, but ensure they exist)
  if (typeof window.copyDiagnostics === 'undefined' && window.Petal?.ui?.diagnostics?.copyDiagnostics) {
    window.copyDiagnostics = window.Petal.ui.diagnostics.copyDiagnostics;
  }
  if (typeof window.openLogsFolder === 'undefined' && window.Petal?.ui?.diagnostics?.openLogsFolder) {
    window.openLogsFolder = window.Petal.ui.diagnostics.openLogsFolder;
  }
  if (typeof window.openVaultFolder === 'undefined' && window.Petal?.ui?.diagnostics?.openVaultFolder) {
    window.openVaultFolder = window.Petal.ui.diagnostics.openVaultFolder;
  }
  if (typeof window.refreshDiagnostics === 'undefined' && window.Petal?.ui?.diagnostics?.refreshDiagnostics) {
    window.refreshDiagnostics = window.Petal.ui.diagnostics.refreshDiagnostics;
  }
  
  // Event operations (these are in tasklist.html, but ensure they exist)
  if (typeof window.deleteEvent === 'undefined') {
    window.deleteEvent = function(eventId) {
      if (window.Petal?.handlers?.deleteEvent) {
        window.Petal.handlers.deleteEvent(eventId);
      } else {
        console.warn('deleteEvent handler not available');
      }
    };
  }
  if (typeof window.closeRecurringModal === 'undefined') {
    window.closeRecurringModal = function() {
      const modal = document.getElementById('recurring-modal');
      if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('active');
      }
    };
  }
  if (typeof window.submitRecurringModal === 'undefined') {
    window.submitRecurringModal = async function() {
      if (window.Petal?.handlers?.submitRecurringModal) {
        await window.Petal.handlers.submitRecurringModal();
      } else {
        console.warn('submitRecurringModal handler not available');
      }
    };
  }
  
  console.log('✅ All window functions exposed for event delegation');
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
