// ═══════════════════════ RENDER PROJECTS ═══════════════════════
// Pure rendering function for projects view
// Takes state and handlers as parameters - no store peeking

import { esc } from '../utils/strings.js';
import { taskDoneToggleButton } from './uiHelpers.js';
import { today, parseDate, dueLabel } from '../utils/dates.js';
import { getAllTasks } from '../domain/models.js';
import { filterTasksForProject } from '../utils/projectHelpers.js';

/**
 * Render projects view
 * Phase 3 Fix: Added debug logging and error handling
 * @param {HTMLElement} containerEl - Container element to render into
 * @param {Object} state - Current app state
 * @param {Object} handlers - Event handlers
 */
export function renderProjects(containerEl, state, handlers) {
  try {
    // Normalize openProjects to a Set (handles Array, null, undefined)
    // This prevents "openProjects.has is not a function" crashes
    const openSet =
      state.openProjects instanceof Set
        ? state.openProjects
        : new Set(Array.isArray(state.openProjects) ? state.openProjects : []);

    const { projects, currentProjFilter } = state;
    
    // CONTAINER-FIRST: Never use global fallback - container must be provided
    if (!containerEl) {
      console.error('❌ renderProjects: Container element not provided! Container must be passed as first argument.');
      return;
    }
    
    const c = containerEl;
    
    // Filter projects
    let list = (projects || []).filter(p => {
      if (currentProjFilter === 'active' && p.done) return false;
      if (currentProjFilter === 'done' && !p.done) return false;
      return true;
    });
    
    if (!list.length) {
      c.innerHTML = '<div class="empty-state">No projects yet<small>Create a project above</small></div>';
      // Re-hydrate Lucide icons after innerHTML (fixes "halo" issue)
      if (window.lucide?.createIcons) {
        window.lucide.createIcons();
      }
      return;
    }
    
    // Pass openSet down so renderProjectCard never touches raw state.openProjects
    c.innerHTML = list.map(p => renderProjectCard(p, state, openSet)).join('');
    
    // Re-hydrate Lucide icons after innerHTML (fixes "halo" issue)
    if (window.lucide?.createIcons) {
      window.lucide.createIcons();
    }
    
    // Install event delegation for project task actions (delete, edit, etc.)
    if (!c.__projectTaskActionsInstalled) {
      c.__projectTaskActionsInstalled = true;
      
      c.addEventListener('click', (e) => {
        const btn = e.target.closest?.('[data-action]');
        if (!btn) return;
        
        // Only handle buttons inside project cards (not in task-container)
        if (btn.closest('#task-container')) return;
        
        const action = btn.getAttribute('data-action');
        const taskId = btn.getAttribute('data-id') || btn.getAttribute('data-task-id');
        
        if (action === 'delete' || action === 'delete-task') {
          // Guard: prevent double handling if another handler already processed this
          if (e.__petalDeleteHandled) {
            return;
          }
          e.__petalDeleteHandled = true;
          
          e.preventDefault();
          e.stopPropagation();
          
          // Use the helper function that properly builds context
          if (window.handleDeleteTaskAction) {
            window.handleDeleteTaskAction(e, btn);
          } else {
            console.error('❌ handleDeleteTaskAction not available');
          }
        } else if (action === 'edit-task') {
          e.preventDefault();
          e.stopPropagation();
          
          // Use the helper function that properly builds context
          if (window.handleEditTaskAction) {
            window.handleEditTaskAction(e, btn);
          } else {
            console.error('❌ handleEditTaskAction not available');
          }
        }
      }, true); // Use capture phase
    }
  
    // Phase 3 Fix: Post-render invariant check (detect "projects exist but UI blank")
    // Use queueMicrotask to check immediately after DOM update, before any other code runs
    queueMicrotask(() => {
      const s = state;
      // SCOPE TO CONTAINER: Use container-scoped query, not global
      const cards = c.querySelectorAll('.project-card').length;
      const projectsCount = (s.projects || []).length;

      if (projectsCount > 0 && cards === 0) {
        console.error('❌ INVARIANT FAIL: projects exist but no cards rendered', {
          projectsCount,
          sampleProjects: (s.projects || []).slice(0, 3).map(p => ({ id: p.id, name: p.name })),
          containerHTMLPreview: (c?.innerHTML || '').slice(0, 200),
          filteredListLength: list.length,
          containerId: c?.id,
          containerParent: c?.parentElement?.id
        });
      }
    });
  
    // NOTE: this is a global side effect; keep, but guard it tightly
    setTimeout(() => {
      try {
        if (typeof forceHideAllForms === 'function') forceHideAllForms();
      } catch (e) {
        console.error('forceHideAllForms crashed:', e);
        console.error(e?.stack);
      }
      
      // Phase 3 Fix: Sanity probe - check if forceHideAllForms hid the container
      setTimeout(() => {
        // SCOPE TO CONTAINER: Use the passed container, not global query
        if (c) {
          const cs = getComputedStyle(c);
          if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0) {
            console.error('🧪 project-container visibility issue detected:', {
              display: cs.display,
              visibility: cs.visibility,
              opacity: cs.opacity,
              parentDisplay: getComputedStyle(c.parentElement)?.display,
              containerId: c.id,
              containerParent: c.parentElement?.id
            });
          }
        }
      }, 60);
    }, 0);

    setTimeout(() => {
      try {
        if (typeof forceHideAllForms === 'function') forceHideAllForms();
      } catch (e) {
        console.error('forceHideAllForms crashed:', e);
        console.error(e?.stack);
      }
    }, 50);
  } catch (e) {
    console.error('❌ renderProjects crashed:', e);
    console.error(e?.stack);
    // Show error in UI - use provided container only, no global fallback
    if (containerEl) {
      containerEl.innerHTML = `<div class="empty-state" style="color:var(--error,red);">
        Projects failed to render
        <small>See console for error</small>
      </div>`;
    }
  }
}

/**
 * Render a single project card
 * @param {Object} project - Project object
 * @param {Object} state - Current app state
 * @param {Set} openSet - Normalized Set of open project IDs
 */
function renderProjectCard(project, state, openSet) {
  const { tasks } = state;
  const color = `var(--proj-${project.color || 1})`;
  const colorPale = `var(--proj-${project.color || 1}p)`;
  const dl = dueLabel(project.due, true);
  // Normalize project ID for Set lookup (handles string/number mismatch)
  const projectIdForLookup = String(project.id).trim();
  const projectIdNum = Number(project.id);
  
  // Check if project.id (as string or number) exists in openSet
  const isOpen = openSet.has(project.id) || 
                 openSet.has(projectIdForLookup) ||
                 (!isNaN(projectIdNum) && Array.from(openSet).some(id => {
                   const openIdNum = Number(id);
                   return !isNaN(openIdNum) && Math.floor(openIdNum) === Math.floor(projectIdNum);
                 }));
  
  // Project metrics: tasks in this project (use getAllTasks to include project subtasks)
  // Normalize projectId comparison to handle both string and number types
  // Also handle decimal projectIds (e.g., 1771714801103.9167 should match project 1771714801103)
  const allTasks = getAllTasks(tasks || [], state.projects || []);
  const projectTasks = filterTasksForProject(allTasks, project.id, { excludeDeleted: true });
  const totalTasks = projectTasks.length;
  const inProgressTasks = projectTasks.filter(t => t.status === 'Doing' && !t.done).length;
  const doneTasks = projectTasks.filter(t => t.done).length;
  const donePct = totalTasks ? Math.round(doneTasks / totalTasks * 100) : 0;
  const overdueTasks = projectTasks.filter(t => {
    if (t.done) return false;
    const due = parseDate(t.due);
    return due && due < today();
  }).length;
  
  return `<div class="project-card" id="proj-${project.id}">
    <div class="project-header">
      <div class="project-color-bar" style="background:${color};"></div>
      <div class="project-title-row">
        <h3 class="project-name" data-action="open-project" data-project-id="${project.id}" style="cursor:pointer;">${esc(project.name || 'Untitled Project')}</h3>
        <div class="project-actions">
          <button data-action="project:toggle-open" data-project-id="${project.id}" class="btn-icon" title="${isOpen ? 'Collapse' : 'Expand'}">${isOpen ? '▼' : '▶'}</button>
        </div>
      </div>
      ${project.description ? `<p class="project-desc">${esc(project.description)}</p>` : ''}
    </div>
    <div class="project-metrics">
      <div class="metric">
        <span class="metric-value">${totalTasks}</span>
        <span class="metric-label">Tasks</span>
      </div>
      <div class="metric">
        <span class="metric-value">${inProgressTasks}</span>
        <span class="metric-label">Active</span>
      </div>
      <div class="metric">
        <span class="metric-value">${donePct}%</span>
        <span class="metric-label">Done</span>
      </div>
      ${overdueTasks > 0 ? `<div class="metric overdue">
        <span class="metric-value">${overdueTasks}</span>
        <span class="metric-label">Overdue</span>
      </div>` : ''}
    </div>
    ${dl ? `<div class="project-due ${dl.cls || ''}">${esc(dl.text || '')}</div>` : ''}
    ${isOpen ? `<div class="project-details" style="padding:16px 20px;border-top:1px solid var(--border);margin-top:12px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
        <h4 style="font-size:14px;font-weight:600;color:var(--text);margin:0;">📋 Tasks ${totalTasks > 0 ? `(${totalTasks})` : ''}</h4>
        <button data-action="add-project-task" data-project-id="${project.id}" style="padding:6px 12px;background:var(--rose);color:white;border:none;border-radius:6px;font-size:11px;font-weight:500;cursor:pointer;">+ Add Task</button>
      </div>
      ${totalTasks > 0 ? `<div>
        ${projectTasks.map(t => {
          const priorityClass = t.priority === 3 ? 'high' : t.priority === 1 ? 'low' : 'medium';
          const tdl = dueLabel(t.due, true);
          const laneLabel = t.lane === 'lab' ? '🧪 Lab' : t.lane === 'comp' ? '💻 Comp' : t.lane === 'writing' ? '📝 Writing' : t.lane === 'presentation' ? '📊 Presentation' : '';
          // Normalize projectId comparison to handle decimal projectIds
          let projectName = '';
          if (t.projectId) {
            const taskProjectIdNum = Number(t.projectId);
            const foundProject = (state.projects || []).find(p => {
              const pId = Number(p.id);
              if (!isNaN(taskProjectIdNum) && !isNaN(pId)) {
                // Compare integer parts for decimal projectIds
                return Math.floor(taskProjectIdNum) === Math.floor(pId);
              }
              // Fallback to string comparison
              return String(p.id) === String(t.projectId);
            });
            projectName = foundProject?.name || '';
          }
          
          return `<div class="task-card ${t.done ? 'done' : ''}" data-id="${t.id}" data-priority="${priorityClass}">
            <div class="task-top">
              <div class="task-content">
                ${taskDoneToggleButton(t)}
                
                <div class="task-body">
                  <div class="task-title">
                    ${esc(t.title || 'Untitled')}
                    ${projectName ? `<span class="tag-chip">${esc(projectName)}</span>` : ''}
                    ${laneLabel ? `<span class="tag-chip">${esc(laneLabel)}</span>` : ''}
                    ${(t.tags || []).map(tag => 
                      `<span class="tag-chip" data-tag="${esc(tag)}">${esc(tag)}</span>`
                    ).join('')}
                  </div>
                  
                  <div class="task-meta-row">
                    <span class="priority-tag ${priorityClass}">${priorityClass}</span>
                    ${tdl ? `<span class="due-tag ${tdl.cls || ''}">${esc(tdl.text || '')}</span>` : ''}
                  </div>
                  
                  ${t.notes ? `<div class="task-notes">${esc(t.notes)}</div>` : ''}
                </div>
              </div>
              
              <div class="task-actions" style="display:flex;gap:4px;align-items:center;">
                <button class="btn-del" data-action="task:open-drawer" data-task-id="${t.id}" data-project-id="${t.projectId || project.id || ''}" title="Open drawer (Notes, Files, Subtasks)" style="font-size:13px;line-height:1;min-width:28px;min-height:28px;color:var(--text-dim);">📝</button>
                <button class="btn-del btn-edit" data-action="edit-task" data-task-id="${String(t.id)}" data-project-id="${t.projectId || project.id || ''}" title="Edit" style="font-size:13px;line-height:1;min-width:28px;min-height:28px;color:var(--text-dim);">✎</button>
                <button class="btn-del btn-delete" data-action="delete" data-id="${String(t.id)}" data-task-id="${String(t.id)}" data-is-subtask="false" data-project-id="${t.projectId || project.id || ''}" title="Delete" style="font-size:16px;line-height:1;min-width:28px;min-height:28px;color:var(--text-dim);cursor:pointer;display:flex;align-items:center;justify-content:center;font-weight:bold;opacity:1;">×</button>
              </div>
            </div>
          </div>`;
        }).join('')}
      </div>` : '<div style="text-align:center;padding:20px;color:var(--text-light);font-size:12px;">No tasks yet</div>'}
    </div>` : ''}
  </div>`;
}
