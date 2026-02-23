// ═══════════════════════ PLANNER PAGE ═══════════════════════
// Planner view renderer - extracted from tasklist.html

import { renderPlannerHabits } from '../ui/renderPlannerHabits.js';
import { renderPlannerRoutines } from '../ui/renderPlannerRoutines.js';

// Access global planner state (defined in tasklist.html during migration)
// These will be moved to store eventually
function getPlannerState() {
  return {
    plannerViewDate: window.plannerViewDate || null,
    plannerWeekOffset: window.plannerWeekOffset || 0,
    plannerCalYear: window.plannerCalYear || null,
    plannerCalMonth: window.plannerCalMonth || null,
    currentPlannerView: window.currentPlannerView || 'daily'
  };
}

/**
 * Render the planner page
 * @param {HTMLElement} containerEl - Container element
 * @param {Object} state - App state
 * @param {Object} handlers - Event handlers
 */
export async function renderPlannerPage(containerEl, state, handlers) {
  // CONTRACT: containerEl is required - no global fallback
  if (!containerEl) {
    console.error('❌ renderPlannerPage: containerEl is required (no global fallback allowed)');
    return;
  }

  // Initialize planner state if needed (using global state during migration)
  const plannerState = getPlannerState();
  if (!plannerState.plannerViewDate || plannerState.plannerViewDate.toString() === 'Invalid Date') {
    window.plannerViewDate = new Date();
    window.plannerWeekOffset = 0;
    window.plannerCalYear = new Date().getFullYear();
    window.plannerCalMonth = new Date().getMonth();
  }

  // Ensure day view is active by default
  if (!plannerState.currentPlannerView || plannerState.currentPlannerView === 'weekly') {
    window.currentPlannerView = 'daily';
  }

  // Initialize the view switcher - MUST be scoped to containerEl
  const dayBtn = containerEl.querySelector('#planner-vbtn-day') || containerEl.querySelector('[data-planner-view-btn="day"]');
  const weekBtn = containerEl.querySelector('#planner-vbtn-week') || containerEl.querySelector('[data-planner-view-btn="week"]');
  if (dayBtn && weekBtn) {
    dayBtn.classList.add('active');
    weekBtn.classList.remove('active');
  }

  const dayView = containerEl.querySelector('#planner-view-day') || containerEl.querySelector('[data-planner-view="day"]');
  const weekView = containerEl.querySelector('#planner-view-week') || containerEl.querySelector('[data-planner-view="week"]');
  if (dayView) dayView.style.display = 'flex';
  if (weekView) weekView.style.display = 'none';

  // Update period label - use container-scoped selector
  const periodLabel = containerEl.querySelector('#planner-period-label') || containerEl.querySelector('[data-planner-period-label]');
  if (periodLabel && typeof window.updatePlannerPeriodLabel === 'function') {
    window.updatePlannerPeriodLabel();
  }

  // Render planner content - use local renderPlanner function, NOT window.renderPlanner
  const currentView = plannerState.currentPlannerView || 'daily';
  if (currentView === 'weekly') {
    await renderWeeklyPlanner(containerEl, state, handlers);
  } else {
    await renderDailyPlanner(containerEl, state, handlers);
  }

  // Build sidebar and calendar in background - scoped to container
  setTimeout(() => {
    if (typeof window.buildPlannerSidebar === 'function') {
      window.buildPlannerSidebar();
    }
    if (typeof window.buildPlannerCalendar === 'function') {
      window.buildPlannerCalendar();
    }
  }, 0);

  // Ensure habits/routines render - scoped to container
  setTimeout(() => {
    const habitsContainer = containerEl.querySelector('#planner-habits-card') || containerEl.querySelector('[data-planner-habits]');
    const routinesContainer = containerEl.querySelector('#planner-routines-card') || containerEl.querySelector('[data-planner-routines]');
    
    if (window.Petal?.ui?.renderPlannerHabits && window.Petal?.store) {
      const plannerState = getPlannerState();
      const viewDate = plannerState.plannerViewDate || new Date();
      window.Petal.ui.renderPlannerHabits(habitsContainer, state, viewDate);
    }
    if (window.Petal?.ui?.renderPlannerRoutines && window.Petal?.store) {
      const plannerState = getPlannerState();
      const viewDate = plannerState.plannerViewDate || new Date();
      window.Petal.ui.renderPlannerRoutines(routinesContainer, state, viewDate);
    }
  }, 100);
}

/**
 * Main planner render function
 * Delegates to daily or weekly renderer
 * @param {HTMLElement} containerEl - Container element
 * @param {Object} state - App state
 * @param {Object} handlers - Event handlers
 */
async function renderPlanner(containerEl, state, handlers) {
  const plannerState = getPlannerState();
  const currentView = plannerState.currentPlannerView || 'daily';
  if (currentView === 'weekly') {
    await renderWeeklyPlanner(containerEl, state, handlers);
  } else {
    await renderDailyPlanner(containerEl, state, handlers);
  }
}

/**
 * Render weekly planner view
 * @param {HTMLElement} containerEl - Container element
 * @param {Object} state - App state
 * @param {Object} handlers - Event handlers
 */
async function renderWeeklyPlanner(containerEl, state, handlers) {
  // Delegate to global function if available (during migration)
  // But prefer container-scoped rendering
  if (typeof window.renderWeeklyPlanner === 'function') {
    await window.renderWeeklyPlanner();
  } else {
    console.warn('Weekly planner renderer not available');
    // TODO: Extract weekly planner rendering to this module
  }
}

/**
 * Render daily planner view
 * @param {HTMLElement} containerEl - Container element
 * @param {Object} state - App state
 * @param {Object} handlers - Event handlers
 */
async function renderDailyPlanner(containerEl, state, handlers) {
  // Delegate to global function if available (during migration)
  // But prefer container-scoped rendering
  if (typeof window.renderDailyPlanner === 'function') {
    await window.renderDailyPlanner();
  } else {
    console.warn('Daily planner renderer not available');
    // TODO: Extract daily planner rendering to this module
  }
}

/**
 * Update planner period label
 * Delegates to global function during migration
 */
function updatePlannerPeriodLabel() {
  if (typeof window.updatePlannerPeriodLabel === 'function') {
    window.updatePlannerPeriodLabel();
  }
}

/**
 * Build planner sidebar
 * Delegates to global function during migration
 */
function buildPlannerSidebar() {
  if (typeof window.buildPlannerSidebar === 'function') {
    window.buildPlannerSidebar();
  }
}

/**
 * Build planner calendar
 * Delegates to global function during migration
 */
function buildPlannerCalendar() {
  if (typeof window.buildPlannerCalendar === 'function') {
    window.buildPlannerCalendar();
  }
}

// Export for use in other modules
export { renderPlanner, renderWeeklyPlanner, renderDailyPlanner };
