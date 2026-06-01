// ═══════════════════════ VIEW MANAGER ═══════════════════════
// Manages view rendering and global sidebar

import { getAllTasks } from '../domain/models.js';

/**
 * Render the global sidebar
 */
export function renderGlobalSidebar(state) {
  const sidebarEl = document.getElementById('global-sidebar');
  const navEl = document.getElementById('global-sidebar-nav');
  
  if (!sidebarEl) {
    console.error('❌ renderGlobalSidebar: global-sidebar element not found');
    return;
  }
  
  if (!navEl) {
    console.error('❌ renderGlobalSidebar: global-sidebar-nav element not found');
    return;
  }
  
  // Ensure sidebar is visible (force with !important to override any CSS)
  sidebarEl.style.setProperty('display', 'flex', 'important');
  sidebarEl.style.setProperty('visibility', 'visible', 'important');
  sidebarEl.style.setProperty('opacity', '1', 'important');
  
  console.log('🔍 renderGlobalSidebar: Rendering sidebar navigation', { hasNavEl: !!navEl, stateView: state?.currentView });
  
  // Use getAllTasks function (available globally or from window.Petal)
  const getAllTasksFn = window.getAllTasks || ((tasks, projects) => {
    const activeTasks = (tasks || []).filter(t => !t.deletedAt);
    const allTasks = [...activeTasks];
    (projects || []).forEach(p => {
      (p.subtasks || []).forEach(st => {
        if (!st.deletedAt) {
          allTasks.push({...st, projectId: p.id, projectName: p.name, isSubtask: true});
        }
      });
    });
    return allTasks;
  });
  
  const allTasks = getAllTasksFn(state.tasks || [], state.projects || []);
  const todayKey = new Date().toISOString().slice(0, 10);
  const tasksToday = allTasks.filter(t => {
    if (!t || t.done) return false;
    const dueKey = typeof t.due === "string" ? t.due.slice(0, 10) : "";
    return dueKey === todayKey;
  }).length;
  
  const activeProjects = (state.projects || []).filter(p => p && !p.done).length;
  const cellLogEntries = state?.settings?.cellLog?.entries || [];
  const cellLogCount = cellLogEntries.length;
  const cellLogAlerts = cellLogEntries.filter(e => e.status === 'concern' || e.status === 'monitor').length;
  const currentView = state.currentView || window.currentView || 'today';
  
  navEl.innerHTML = `
    <div class="global-sidebar-nav-label">Workspace</div>
    <a class="global-sidebar-nav-item ${currentView === 'today' ? 'active' : ''}" href="#" data-nav="today">
      <span class="global-sidebar-nav-icon">◈</span> Today
      ${tasksToday > 0 ? `<span class="global-sidebar-nav-badge">${tasksToday}</span>` : ''}
    </a>
    <a class="global-sidebar-nav-item ${currentView === 'planner' ? 'active' : ''}" href="#" data-nav="planner">
      <span class="global-sidebar-nav-icon">◻</span> Planner
    </a>
    <a class="global-sidebar-nav-item ${currentView === 'workflow' ? 'active' : ''}" href="#" data-nav="workflow">
      <span class="global-sidebar-nav-icon">⚡</span> Workflow
    </a>
    <a class="global-sidebar-nav-item ${currentView === 'tasks' ? 'active' : ''}" href="#" data-nav="tasks">
      <span class="global-sidebar-nav-icon">⊡</span> Tasks
    </a>

    <div class="global-sidebar-nav-label">Research</div>
    <a class="global-sidebar-nav-item ${currentView === 'projects' ? 'active' : ''}" href="#" data-nav="projects">
      <span class="global-sidebar-nav-icon">◈</span> Projects
      ${activeProjects > 0 ? `<span class="global-sidebar-nav-badge">${activeProjects}</span>` : ''}
    </a>
    <a class="global-sidebar-nav-item ${currentView === 'cell-log' ? 'active' : ''}" href="#" data-nav="cell-log">
      <span class="global-sidebar-nav-icon">⊠</span> Cell Log
      ${cellLogCount > 0 ? `<span class="global-sidebar-nav-badge ${cellLogAlerts > 0 ? 'alert' : ''}">${cellLogCount}</span>` : ''}
    </a>
    <a class="global-sidebar-nav-item ${currentView === 'files' ? 'active' : ''}" href="#" data-nav="files">
      <span class="global-sidebar-nav-icon">⊟</span> Files
    </a>

    <div class="global-sidebar-nav-label">Workshop</div>
    <a class="global-sidebar-nav-item ${currentView === '3d-print' ? 'active' : ''}" href="#" data-nav="3d-print">
      <span class="global-sidebar-nav-icon">🖨</span> 3D Printing
      ${(() => {
        const prints = state.prints3d || [];
        const queueCount = prints.filter(p => p.status === 'queued').length;
        return queueCount > 0 ? `<span class="global-sidebar-nav-badge">${queueCount}</span>` : '';
      })()}
    </a>
  `;
  
  console.log('✅ renderGlobalSidebar: Navigation rendered', { navItemCount: navEl.children.length });
  
  // Add event delegation for sidebar clicks
  navEl.onclick = (e) => {
    const navItem = e.target.closest('[data-nav]');
    if (navItem) {
      e.preventDefault();
      const view = navItem.getAttribute('data-nav');
      console.log('🔍 Sidebar click:', { view, hasRouter: !!window.routerSwitchView, hasSwitchView: !!window.switchView });
      // Use router if available (preferred), fallback to old switchView
      if (window.routerSwitchView) {
        console.log('🔍 Using router to switch to:', view);
        window.routerSwitchView(view).catch(err => {
          console.error('❌ Error switching view via router:', err);
          // Fallback to old switchView if router fails
          if (window.switchView) {
            console.log('🔍 Falling back to old switchView');
            window.switchView(view);
          }
        });
      } else if (window.switchView) {
        console.log('🔍 Using old switchView to switch to:', view);
        window.switchView(view);
      } else {
        console.error('❌ No view switching function available');
      }
    }
  };
  
  // Also handle settings link in sidebar bottom and update its active state
  const sidebarBottom = document.querySelector('.global-sidebar-bottom');
  if (sidebarBottom) {
    // Update the active state of the settings link
    const settingsLink = sidebarBottom.querySelector('[data-nav="settings"]');
    if (settingsLink) {
      if (currentView === 'settings') {
        settingsLink.classList.add('active');
      } else {
        settingsLink.classList.remove('active');
      }
    }
    
    // Add click handler
    sidebarBottom.onclick = (e) => {
      const navItem = e.target.closest('[data-nav]');
      if (navItem) {
        e.preventDefault();
        const view = navItem.getAttribute('data-nav');
        console.log('🔍 DEBUG: Settings link clicked, view:', view, 'switchView available:', !!window.switchView);
        if (window.switchView) {
          window.switchView(view);
        } else {
          console.error('🔍 DEBUG: window.switchView is not available!');
        }
      }
    };
  }
}

/**
 * Main render function - re-renders the current view
 */
// Guard to prevent render loops
let _rendering = false;

export function render() {
  // Prevent infinite loops - if already rendering, skip
  if (_rendering) {
    return;
  }
  
  const store = window.Petal?.store;
  if (!store) {
    console.warn('⚠️ render: Store not available');
    return;
  }
  
  const state = store.getState();
  if (!state) {
    console.warn('⚠️ render: State not available');
    return;
  }
  
  const currentView = state.currentView || window.currentView || 'today';
  
  _rendering = true;
  try {
    // Update sidebar first (always render sidebar)
    renderGlobalSidebar(state);
    
    // Re-render current view using router
    if (window.switchView) {
      // Use router to re-render current view with force flag to ensure it updates
      // This is important when data changes (tasks/projects added) but view hasn't changed
      window.switchView(currentView, { force: true }).catch(err => {
        console.error('❌ Error re-rendering view:', err);
        // Fallback: try to show the view manually
        const viewEl = document.getElementById(`view-${currentView}`);
        if (viewEl) {
          viewEl.style.display = 'block';
        }
      }).finally(() => {
        _rendering = false;
      });
    } else {
      // Fallback: try to show the view manually
      console.warn('⚠️ render: switchView not available, using fallback');
      const viewEl = document.getElementById(`view-${currentView}`);
      if (viewEl) {
        // Hide all views
        document.querySelectorAll('[id^="view-"]').forEach(el => {
          if (el.id !== `view-${currentView}`) {
            el.style.display = 'none';
          }
        });
        // Show current view
        viewEl.style.display = 'block';
      }
      _rendering = false;
    }
  } catch (err) {
    console.error('❌ render: Error during render:', err);
    _rendering = false;
  }
}

// Expose globally for backward compatibility
window.renderGlobalSidebar = renderGlobalSidebar;
window.render = render;
