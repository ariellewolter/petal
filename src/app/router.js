// ═══════════════════════ ROUTER ═══════════════════════
// Single source of truth for view switching
// Replaces the monolithic switchView() in tasklist.html

import { PAGES, getPageRenderer, hasPageRenderer } from './pages.js';
import { resetGlobalScroll, resetAllViews, resetScroll } from '../utils/scroll.js';

// Re-entry guard: prevent multiple simultaneous router calls
let routerInProgress = false;
let pendingViewSwitch = null;

/**
 * Reset active view positioning and scroll
 * Router owns scroll reset (per contract)
 */
function resetActiveViewPosition(viewName) {
  const activeView = document.getElementById(`view-${viewName}`);
  if (!activeView) return;
  
  // Reset scroll using utility (replaces triple-timeout pattern)
  resetScroll(activeView);
  
  // Force positioning to start at top of grid cell
  activeView.style.transform = 'translateY(0)';
  activeView.style.marginTop = '0';
  activeView.style.top = '0';
  activeView.style.verticalAlign = 'top';
  activeView.style.position = 'relative';
  activeView.style.alignSelf = 'start';
  activeView.style.justifySelf = 'start';
  activeView.style.gridRowStart = '1';
  activeView.style.gridRowEnd = '1';
  
  // Set padding-top for non-fullscreen views
  if (viewName !== 'today' && viewName !== 'workflow') {
    activeView.style.paddingTop = '52px';
  }
}

/**
 * Switch to a view
 * @param {string} viewName - View name (e.g., 'tasks', 'projects', 'planner')
 * @param {Object} options - Optional configuration
 * @param {Object} options.store - Store instance (defaults to window.Petal?.store)
 * @param {Object} options.features - Features/handlers (defaults to window.Petal?.features)
 */
export async function switchView(viewName, options = {}) {
  console.log('🔍 DEBUG: router.switchView called with:', viewName);
  
  // RE-ENTRY GUARD: Prevent multiple simultaneous router calls
  // BUT: Allow force re-render if explicitly requested (for data updates)
  const force = options.force === true;
  const currentView = window.Petal?.store?.getState()?.currentView;
  
  // If already on this view and not forcing, skip (unless force is true)
  if (!force && viewName === currentView && !routerInProgress) {
    // Already on this view and not forcing - skip to prevent unnecessary re-renders
    // But allow force re-renders when data changes
    console.log('⏭️ router.switchView: Already on this view, skipping (use force: true to re-render):', viewName);
    return;
  }
  
  if (routerInProgress && !force) {
    if (viewName === currentView) {
      console.log('⏭️ router.switchView: Already switching or already on this view, ignoring:', viewName);
      return;
    }
    console.warn('⚠️ router.switchView: Router already in progress, queuing:', viewName);
    pendingViewSwitch = { viewName, options };
    // Wait for current switch to complete, then process pending
    return;
  }
  
  // Mark router as in progress
  routerInProgress = true;
  
  try {
    // Set flag to prevent old switchView() from interfering
    window.__routerJustSwitched = true;
    
    const store = options.store || window.Petal?.store;
    const features = options.features || window.Petal?.features || window.Petal?.handlers;
    
    if (!store) {
      console.error('❌ router.switchView: Store not available');
      window.__routerJustSwitched = false;
      routerInProgress = false;
      return;
    }
  
    // Scroll to top (router owns scroll reset per contract)
    resetGlobalScroll();
    resetAllViews();
  
    // CONTAINER-FIRST: Get container by ID - hard fail if missing
    const container = document.getElementById(`view-${viewName}`);
    if (!container) {
      console.error(`❌ router.switchView: Missing view container: view-${viewName}`);
      console.error('Available view containers:', 
        Array.from(document.querySelectorAll('[id^="view-"]')).map(el => el.id)
      );
      routerInProgress = false;
      return;
    }
  
  // DEBUG: Verify container is in the correct DOM location (inside main content area)
  const containerParent = container.parentElement;
  const isInMainContent = containerParent?.classList.contains('app') || 
                          containerParent?.querySelector('.global-sidebar') !== null ||
                          container.closest('.app') !== null;
  
  if (!isInMainContent && containerParent !== document.body) {
    console.warn('⚠️ router.switchView: Container may be in wrong location', {
      viewName,
      containerId: container.id,
      parentId: containerParent?.id,
      parentTag: containerParent?.tagName,
      parentClass: containerParent?.className
    });
  }
  
  // Log container location for debugging
  console.log('🔍 router.switchView: Container location', {
    viewName,
    containerId: container.id,
    parentId: containerParent?.id,
    parentTag: containerParent?.tagName,
    parentClass: containerParent?.className,
    isInApp: container.closest('.app') !== null
  });
  
  // Hide all views first - FORCE hide with !important
  document.querySelectorAll('[id^="view-"]').forEach(el => {
    if (el.id !== `view-${viewName}`) {
      // Force hide with !important to override any CSS
      el.style.setProperty('display', 'none', 'important');
      el.style.setProperty('visibility', 'hidden', 'important');
      // Remove any classes that might interfere
      if (el.id === 'view-projects') {
        el.classList.add('view-projects-hidden');
      }
    }
  });
  
  // Show target view - FORCE visibility
  // Remove any classes that might hide it (like view-projects-hidden with !important)
  if (viewName === 'projects') {
    container.classList.remove('view-projects-hidden');
  }
  if (viewName === '3d-print') {
    // Ensure projects view is definitely hidden
    const projectsView = document.getElementById('view-projects');
    if (projectsView) {
      projectsView.style.setProperty('display', 'none', 'important');
      projectsView.style.setProperty('visibility', 'hidden', 'important');
      projectsView.classList.add('view-projects-hidden');
    }
  }
  
  // Force show target view with !important to override any CSS
  container.style.setProperty('display', 'block', 'important');
  container.style.setProperty('visibility', 'visible', 'important');
  container.style.setProperty('opacity', '1', 'important');
  
  // Ensure all views are positioned correctly in grid (column 2, row 1)
  // This ensures views appear next to sidebar, not below it
  container.style.setProperty('grid-column', '2', 'important');
  container.style.setProperty('grid-row', '1', 'important');
  container.style.setProperty('justify-self', 'start', 'important');
  container.style.setProperty('align-self', 'start', 'important');
  container.style.setProperty('position', 'relative', 'important');
  
  // Special handling for projects: ensure proper positioning
  if (viewName === 'projects') {
    // Apply all the styles that CSS uses with !important
    container.style.setProperty('grid-column', '2', 'important');
    container.style.setProperty('grid-row', '1', 'important');
    container.style.setProperty('width', '100%', 'important');
    container.style.setProperty('max-width', '100%', 'important');
    container.style.setProperty('box-sizing', 'border-box', 'important');
    container.style.setProperty('padding', '52px 36px 100px', 'important');
    container.style.setProperty('padding-top', '52px', 'important');
    container.style.setProperty('overflow-x', 'hidden', 'important');
    container.style.setProperty('overflow-y', 'auto', 'important');
    container.style.setProperty('min-width', '0', 'important');
    container.style.setProperty('height', '100vh', 'important');
    container.style.setProperty('margin', '0', 'important');
    container.style.setProperty('top', '0', 'important');
    container.style.setProperty('align-self', 'start', 'important');
    container.style.setProperty('position', 'relative', 'important');
    container.style.setProperty('transform', 'translateY(0)', 'important');
    container.style.setProperty('scroll-behavior', 'auto', 'important');
  }
  
  // Special handling for 3d-print: set positioning immediately with !important
  if (viewName === '3d-print') {
    container.style.setProperty('grid-column', '2', 'important');
    container.style.setProperty('grid-row', '1', 'important');
    container.style.setProperty('position', 'relative', 'important');
    container.style.setProperty('top', '0', 'important');
    container.style.setProperty('padding-top', '52px', 'important');
    container.style.setProperty('width', '100%', 'important');
    container.style.setProperty('max-width', '100%', 'important');
    container.style.setProperty('height', 'auto', 'important');
    container.style.setProperty('min-height', '100vh', 'important');
    container.style.setProperty('box-sizing', 'border-box', 'important');
    container.style.setProperty('display', 'block', 'important');
    container.style.setProperty('visibility', 'visible', 'important');
    container.style.setProperty('opacity', '1', 'important');
    resetScroll(container);
    
    console.log('🔍 router.switchView: 3d-print view styled', {
      display: container.style.display,
      computedDisplay: window.getComputedStyle(container).display,
      hasContent: container.innerHTML.length > 0
    });
  }
  
  // Reset positioning
  resetActiveViewPosition(viewName);
  
  // Update store AND window.currentView to keep them in sync
  // BUT: Only update if view is actually changing to prevent render loops
  const state = store.getState();
  if (state.currentView !== viewName) {
    store.setState({ currentView: viewName });
  }
  // Also update window.currentView immediately to prevent race conditions
  window.currentView = viewName;
  
    // Get renderer
    const renderer = getPageRenderer(viewName);
    if (!renderer) {
      console.warn(`⚠️ router.switchView: No renderer for view: ${viewName}`);
      container.innerHTML = `<div style="padding:16px;color:var(--text-dim)">No renderer for view: ${viewName}</div>`;
      // Still show the container even if there's no renderer
      container.style.display = 'block';
      routerInProgress = false;
      return;
    }
  
    // Render
    try {
    const currentState = store.getState();
    console.log('🔍 router.switchView: About to render', { viewName, hasRenderer: !!renderer, currentViewInState: currentState.currentView });
    
    // DEV ASSERTION: Prevent renderers from touching shell elements
    // Capture initial state of shell elements
    const sidebarBefore = document.querySelector('.global-sidebar');
    const headerBefore = document.querySelector('.header');
    const layoutBefore = document.querySelector('.layout');
    const sidebarHTMLBefore = sidebarBefore?.innerHTML || '';
    const headerHTMLBefore = headerBefore?.innerHTML || '';
    const layoutHTMLBefore = layoutBefore?.innerHTML || '';
    
    await renderer(container, currentState, features);
    
    // Check if renderer touched shell elements (dev assertion)
    // Note: In browser context, use window.DEV_MODE (process.env not available)
    if (window.DEV_MODE) {
      const sidebarAfter = document.querySelector('.global-sidebar');
      const headerAfter = document.querySelector('.header');
      const layoutAfter = document.querySelector('.layout');
      
      if (sidebarAfter && sidebarAfter.innerHTML !== sidebarHTMLBefore) {
        console.error('❌ DEV ASSERTION: Renderer for', viewName, 'modified .global-sidebar! Renderers must only write to their container.');
        console.trace('Call stack:');
      }
      if (headerAfter && headerAfter.innerHTML !== headerHTMLBefore) {
        console.error('❌ DEV ASSERTION: Renderer for', viewName, 'modified .header! Renderers must only write to their container.');
        console.trace('Call stack:');
      }
      if (layoutAfter && layoutAfter.innerHTML !== layoutHTMLBefore) {
        // Allow layout changes if they're only in the view container area
        const viewContainer = layoutAfter.querySelector(`#view-${viewName}`);
        if (!viewContainer || layoutAfter.innerHTML.replace(viewContainer.outerHTML, '') !== layoutHTMLBefore.replace(sidebarBefore?.outerHTML || '', '').replace(headerBefore?.outerHTML || '', '')) {
          console.error('❌ DEV ASSERTION: Renderer for', viewName, 'modified .layout! Renderers must only write to their container.');
          console.trace('Call stack:');
        }
      }
    }
    
    console.log('✅ router.switchView: Render completed', { viewName });
    
    // Update sidebar to reflect the new view
    if (typeof window.renderGlobalSidebar === 'function') {
      window.renderGlobalSidebar(currentState);
    }
    
    // Ensure view is still visible after render (renderer might change it)
    // Use 'grid' or 'block' - grid items can have display:block and still participate in grid
    container.style.setProperty('display', 'block', 'important');
    container.style.setProperty('visibility', 'visible', 'important');
    container.style.setProperty('opacity', '1', 'important');
    
    // CRITICAL: Re-apply grid positioning for ALL views after render
    // Some renderers might clear or override styles when setting innerHTML
    // These MUST be set with !important to override any CSS
    container.style.setProperty('grid-column', '2', 'important');
    container.style.setProperty('grid-row', '1', 'important');
    container.style.setProperty('justify-self', 'start', 'important');
    container.style.setProperty('align-self', 'start', 'important');
    container.style.setProperty('position', 'relative', 'important');
    container.style.setProperty('top', '0', 'important');
    container.style.setProperty('left', '0', 'important');
    container.style.setProperty('width', '100%', 'important');
    container.style.setProperty('max-width', '100%', 'important');
    container.style.setProperty('box-sizing', 'border-box', 'important');
    container.style.setProperty('margin', '0', 'important');
    container.style.setProperty('margin-left', '0', 'important');
    container.style.setProperty('margin-right', '0', 'important');
    container.style.setProperty('margin-top', '0', 'important');
    container.style.setProperty('margin-bottom', '0', 'important');
    container.style.setProperty('float', 'none', 'important');
    container.style.setProperty('clear', 'none', 'important');
    
    // Verify grid is working - log diagnostic info
    const appEl = container.closest('.app');
    if (appEl) {
      const appComputed = window.getComputedStyle(appEl);
      const containerComputed = window.getComputedStyle(container);
      const sidebarEl = document.querySelector('.global-sidebar');
      const sidebarComputed = sidebarEl ? window.getComputedStyle(sidebarEl) : null;
      
      console.log('🔍 Grid diagnostic:', {
        viewName,
        appDisplay: appComputed.display,
        appGridTemplateColumns: appComputed.gridTemplateColumns,
        appGridTemplateRows: appComputed.gridTemplateRows,
        sidebarGridColumn: sidebarComputed?.gridColumn,
        sidebarGridRow: sidebarComputed?.gridRow,
        containerGridColumn: containerComputed.gridColumn,
        containerGridRow: containerComputed.gridRow,
        containerDisplay: containerComputed.display,
        containerPosition: containerComputed.position,
        containerWidth: containerComputed.width,
        containerMarginLeft: containerComputed.marginLeft,
        containerMarginTop: containerComputed.marginTop,
        containerParent: container.parentElement?.className,
        isDirectChild: container.parentElement === appEl,
        containerOffsetTop: container.offsetTop,
        containerOffsetLeft: container.offsetLeft,
        sidebarOffsetTop: sidebarEl?.offsetTop,
        sidebarOffsetLeft: sidebarEl?.offsetLeft
      });
      
      // If views are appearing below sidebar, force them to grid position
      if (container.offsetTop > 0 && sidebarEl && container.offsetTop >= sidebarEl.offsetTop + sidebarEl.offsetHeight) {
        console.warn('⚠️ View is appearing below sidebar! Forcing grid position...');
        // Force reflow
        appEl.style.display = 'none';
        appEl.offsetHeight; // Trigger reflow
        appEl.style.display = 'grid';
      }
    }
    
    // Special handling for 3d-print: ensure it's positioned correctly after render
    if (viewName === '3d-print') {
      container.style.setProperty('padding-top', '52px', 'important');
      container.style.setProperty('width', '100%', 'important');
      container.style.setProperty('max-width', '100%', 'important');
      resetScroll(container);
      
      // Final check
      const computedStyle = window.getComputedStyle(container);
      console.log('✅ router.switchView: 3d-print after render', {
        display: computedStyle.display,
        visibility: computedStyle.visibility,
        opacity: computedStyle.opacity,
        width: computedStyle.width,
        height: computedStyle.height,
        hasContent: container.innerHTML.length > 0
      });
    }
    } catch (error) {
      console.error(`❌ router.switchView: Error rendering ${viewName}:`, error);
      container.innerHTML = `<div style="padding:16px;color:var(--overdue)">Error rendering ${viewName}: ${error.message}</div>`;
      // Still show the container even if there's an error
      container.style.display = 'block';
    }
  
    // Final scroll reset after render (using utility)
    setTimeout(() => {
    resetActiveViewPosition(viewName);
    // Final check: ensure view is still visible
    const finalContainer = document.getElementById(`view-${viewName}`);
    if (finalContainer) {
      const computedStyle = window.getComputedStyle(finalContainer);
      if (computedStyle.display === 'none' || computedStyle.visibility === 'hidden') {
        console.warn(`⚠️ router.switchView: View ${viewName} was hidden, forcing visibility`);
        finalContainer.style.setProperty('display', 'block', 'important');
        finalContainer.style.setProperty('visibility', 'visible', 'important');
        finalContainer.style.setProperty('opacity', '1', 'important');
      }
      // Final scroll reset using utility
      resetScroll(finalContainer);
    }
    
    // Ensure all other views are still hidden
    document.querySelectorAll('[id^="view-"]').forEach(el => {
      if (el.id !== `view-${viewName}`) {
        const computedStyle = window.getComputedStyle(el);
        if (computedStyle.display !== 'none') {
          console.warn(`⚠️ router.switchView: View ${el.id} is still visible, forcing hide`);
          el.style.setProperty('display', 'none', 'important');
          el.style.setProperty('visibility', 'hidden', 'important');
        }
      }
    });
    
    // Clear the flag after render completes to allow normal operation
    // Use a longer delay to ensure render() doesn't interfere
    setTimeout(() => {
      window.__routerJustSwitched = false;
      console.log('✅ router.switchView: Flag cleared, normal render() can run');
      
      // Process any pending view switch
      routerInProgress = false;
      if (pendingViewSwitch) {
        const pending = pendingViewSwitch;
        pendingViewSwitch = null;
        console.log('🔄 router.switchView: Processing pending switch:', pending.viewName);
        // Use setTimeout to allow current call stack to complete
        setTimeout(() => {
          switchView(pending.viewName, pending.options).catch(err => {
            console.error('❌ router.switchView: Error processing pending switch:', err);
          });
        }, 10);
      }
    }, 100);
  }, 50);
  } catch (error) {
    // Ensure router is marked as not in progress even on error
    routerInProgress = false;
    pendingViewSwitch = null;
    throw error;
  } finally {
    // Safety: ensure router is marked as not in progress
    // (This will be set again in the setTimeout above, but this is a safety net)
    if (!pendingViewSwitch) {
      // Only clear if no pending switch (otherwise let the setTimeout handle it)
      setTimeout(() => {
        if (!pendingViewSwitch) {
          routerInProgress = false;
        }
      }, 200);
    }
  }
}

/**
 * Get current view from store
 */
export function getCurrentView() {
  const store = window.Petal?.store;
  if (!store) return null;
  return store.getState()?.currentView || null;
}

/**
 * Diagnostic helper: Check for duplicate view containers and container placement
 * Exposed to window for console debugging
 * @param {string} viewName - View name to check (e.g., 'files', 'projects', 'tasks')
 */
export function diagnoseViewContainer(viewName) {
  const viewId = `view-${viewName}`;
  const containers = document.querySelectorAll(`#${viewId}`);
  const count = containers.length;
  
  console.log(`🔍 Diagnosing view container: ${viewId}`);
  console.log(`   Container count: ${count} ${count > 1 ? '⚠️ DUPLICATE!' : '✅'}`);
  
  if (count === 0) {
    console.error(`   ❌ Container ${viewId} not found!`);
    console.log('   Available containers:', 
      Array.from(document.querySelectorAll('[id^="view-"]')).map(el => el.id)
    );
    return null;
  }
  
  const results = Array.from(containers).map((el, idx) => {
    const parent = el.parentElement;
    const inLayout = !!el.closest('.layout');
    const inApp = !!el.closest('.app');
    const inSidebar = !!el.closest('.sidebar') || !!el.closest('.global-sidebar');
    const computedStyle = window.getComputedStyle(el);
    
    return {
      index: idx + 1,
      id: el.id,
      parent: {
        id: parent?.id || 'none',
        tag: parent?.tagName || 'none',
        className: parent?.className || 'none'
      },
      location: {
        inLayout,
        inApp,
        inSidebar,
        isInMainContent: inApp && !inSidebar
      },
      visibility: {
        display: computedStyle.display,
        visibility: computedStyle.visibility,
        opacity: computedStyle.opacity
      }
    };
  });
  
  console.table(results);
  
  // Check if any container is in wrong location
  const wrongLocation = results.find(r => !r.location.isInMainContent || r.location.inSidebar);
  if (wrongLocation) {
    console.warn(`⚠️ Container #${wrongLocation.index} is in wrong location!`, wrongLocation);
  }
  
  return results;
}

// Expose diagnostic helper to window for console access
if (typeof window !== 'undefined') {
  window.diagnoseViewContainer = diagnoseViewContainer;
}
