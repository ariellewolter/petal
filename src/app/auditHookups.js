// ═══════════════════════ HOOKUPS RUNTIME AUDIT ═══════════════════════
// Runtime verification of all hookups (router → pages → UI → handlers → store → electronAPI)

/**
 * Runtime audit function - verifies all hookups are correct
 * Call window.auditHookups() in console to run
 */
export function auditHookups() {
  const results = {
    passed: [],
    failed: [],
    warnings: []
  };
  
  console.log('%c═══════════════════════════════════════════════════════════', 'color: #3498db; font-weight: bold');
  console.log('%cHOOKUPS VERIFICATION AUDIT', 'color: #3498db; font-size: 16px; font-weight: bold');
  console.log('%c═══════════════════════════════════════════════════════════', 'color: #3498db; font-weight: bold');
  
  // 1. Check router is available
  if (window.routerSwitchView || window.switchView) {
    results.passed.push('Router available');
    console.log('%c✅ Router available', 'color: #27ae60');
  } else {
    results.failed.push('Router not available');
    console.error('%c❌ Router not available', 'color: #e74c3c');
  }
  
  // 2. Check store is available
  if (window.Petal?.store) {
    results.passed.push('Store available');
    console.log('%c✅ Store available', 'color: #27ae60');
  } else {
    results.failed.push('Store not available');
    console.error('%c❌ Store not available', 'color: #e74c3c');
  }
  
  // 3. Check all view containers exist and are in correct location
  const appEl = document.querySelector('.app');
  if (!appEl) {
    results.failed.push('Main .app container not found');
    console.error('%c❌ Main .app container not found', 'color: #e74c3c');
  } else {
    results.passed.push('Main .app container found');
    console.log('%c✅ Main .app container found', 'color: #27ae60');
    
    // Check grid layout
    const appStyle = window.getComputedStyle(appEl);
    if (appStyle.display === 'grid') {
      results.passed.push('App uses grid layout');
      console.log('%c✅ App uses grid layout', 'color: #27ae60');
    } else {
      results.warnings.push(`App display is ${appStyle.display}, expected grid`);
      console.warn(`%c⚠️ App display is ${appStyle.display}, expected grid`, 'color: #f39c12');
    }
  }
  
  // 4. Check all registered pages have containers
  const registeredPages = ['today', 'tasks', 'projects', 'planner', 'files', 'workflow', 'cell-log', 'settings', '3d-print'];
  const missingContainers = [];
  const wrongLocationContainers = [];
  
  for (const page of registeredPages) {
    const container = document.getElementById(`view-${page}`);
    if (!container) {
      missingContainers.push(page);
      results.failed.push(`Missing container: view-${page}`);
      console.error(`%c❌ Missing container: view-${page}`, 'color: #e74c3c');
    } else {
      // Check if container is in .app
      const inApp = container.closest('.app') !== null;
      if (!inApp) {
        wrongLocationContainers.push(page);
        results.warnings.push(`Container view-${page} not inside .app`);
        console.warn(`%c⚠️ Container view-${page} not inside .app`, 'color: #f39c12');
      } else {
        results.passed.push(`Container view-${page} exists and in correct location`);
      }
    }
  }
  
  if (missingContainers.length === 0) {
    console.log('%c✅ All view containers exist', 'color: #27ae60');
  }
  
  // 5. Check sidebar exists and is in grid
  const sidebar = document.querySelector('.global-sidebar');
  if (sidebar) {
    const sidebarStyle = window.getComputedStyle(sidebar);
    results.passed.push('Sidebar found');
    console.log('%c✅ Sidebar found', 'color: #27ae60');
    
    if (sidebarStyle.gridColumn === '1' || sidebarStyle.gridColumn === '1 / 2') {
      results.passed.push('Sidebar in correct grid column');
      console.log('%c✅ Sidebar in correct grid column', 'color: #27ae60');
    } else {
      results.warnings.push(`Sidebar grid-column is ${sidebarStyle.gridColumn}`);
      console.warn(`%c⚠️ Sidebar grid-column is ${sidebarStyle.gridColumn}`, 'color: #f39c12');
    }
  } else {
    results.failed.push('Sidebar not found');
    console.error('%c❌ Sidebar not found', 'color: #e74c3c');
  }
  
  // 6. Check current view
  const state = window.Petal?.store?.getState();
  const currentView = state?.currentView || window.currentView;
  if (currentView) {
    results.passed.push(`Current view: ${currentView}`);
    console.log(`%c✅ Current view: ${currentView}`, 'color: #27ae60');
    
    // Check if current view container is visible
    const currentContainer = document.getElementById(`view-${currentView}`);
    if (currentContainer) {
      const containerStyle = window.getComputedStyle(currentContainer);
      if (containerStyle.display !== 'none' && containerStyle.visibility !== 'hidden') {
        results.passed.push(`Current view container is visible`);
        console.log(`%c✅ Current view container is visible`, 'color: #27ae60');
      } else {
        results.failed.push(`Current view container is hidden`);
        console.error(`%c❌ Current view container is hidden`, 'color: #e74c3c');
      }
    }
  } else {
    results.warnings.push('No current view set');
    console.warn('%c⚠️ No current view set', 'color: #f39c12');
  }
  
  // 7. Check page renderers are registered
  if (window.Petal?.pages || window.PAGES) {
    results.passed.push('Page registry available');
    console.log('%c✅ Page registry available', 'color: #27ae60');
  } else {
    results.warnings.push('Page registry not found on window');
    console.warn('%c⚠️ Page registry not found on window', 'color: #f39c12');
  }
  
  // 8. Check critical handlers exist
  const criticalHandlers = [
    'fileManagement',
    'taskOperations',
    'projectOperations',
    'modalOperations'
  ];
  
  for (const handler of criticalHandlers) {
    if (window.Petal?.features?.[handler]) {
      results.passed.push(`Handler ${handler} available`);
    } else {
      results.warnings.push(`Handler ${handler} not found`);
      console.warn(`%c⚠️ Handler ${handler} not found`, 'color: #f39c12');
    }
  }
  
  // 9. Check electronAPI (if in Electron)
  if (window.electronAPI) {
    results.passed.push('electronAPI available');
    console.log('%c✅ electronAPI available', 'color: #27ae60');
    
    // Check critical APIs
    const criticalAPIs = ['loadState', 'saveState', 'openFile', 'resolveFilePath'];
    for (const api of criticalAPIs) {
      if (window.electronAPI[api]) {
        results.passed.push(`electronAPI.${api} available`);
      } else {
        results.warnings.push(`electronAPI.${api} not found`);
        console.warn(`%c⚠️ electronAPI.${api} not found`, 'color: #f39c12');
      }
    }
  } else {
    results.warnings.push('electronAPI not available (may be in browser mode)');
    console.warn('%c⚠️ electronAPI not available (may be in browser mode)', 'color: #f39c12');
  }
  
  // 10. Check for process usage (should not exist in renderer)
  // This is a static check, but we can warn if process is referenced
  if (typeof process !== 'undefined' && process.env) {
    results.warnings.push('process.env is accessible (should use window.DEV_MODE instead)');
    console.warn('%c⚠️ process.env is accessible (should use window.DEV_MODE instead)', 'color: #f39c12');
  } else {
    results.passed.push('No process.* usage detected');
    console.log('%c✅ No process.* usage detected', 'color: #27ae60');
  }
  
  // Summary
  console.log('\n%c═══════════════════════════════════════════════════════════', 'color: #3498db; font-weight: bold');
  console.log('%cAUDIT SUMMARY', 'color: #3498db; font-size: 14px; font-weight: bold');
  console.log('%c═══════════════════════════════════════════════════════════', 'color: #3498db; font-weight: bold');
  console.log(`%c✅ Passed: ${results.passed.length}`, 'color: #27ae60; font-weight: bold');
  console.log(`%c❌ Failed: ${results.failed.length}`, results.failed.length > 0 ? 'color: #e74c3c; font-weight: bold' : 'color: #27ae60; font-weight: bold');
  console.log(`%c⚠️ Warnings: ${results.warnings.length}`, results.warnings.length > 0 ? 'color: #f39c12; font-weight: bold' : 'color: #27ae60; font-weight: bold');
  
  if (results.failed.length > 0) {
    console.log('\n%cFAILURES:', 'color: #e74c3c; font-weight: bold');
    results.failed.forEach((f, idx) => {
      console.log(`%c${idx + 1}. ${f}`, 'color: #e74c3c');
    });
  }
  
  if (results.warnings.length > 0) {
    console.log('\n%cWARNINGS:', 'color: #f39c12; font-weight: bold');
    results.warnings.forEach((w, idx) => {
      console.log(`%c${idx + 1}. ${w}`, 'color: #f39c12');
    });
  }
  
  // Return results for programmatic use
  return results;
}

// Expose to window for console access
if (typeof window !== 'undefined') {
  window.auditHookups = auditHookups;
}
