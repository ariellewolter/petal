// ═══════════════════════ RENDER PROJECTS ═══════════════════════
// Pure rendering function for projects view
// Takes state and handlers as parameters - no store peeking

import { esc } from '../utils/strings.js';
import { today, parseDate, dueLabel } from '../utils/dates.js';
import { getAllTasks } from '../domain/models.js';

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

    // Diagnostic logging: capture input shapes to catch nondeterministic failures
    console.log('DEBUG renderProjects:', {
      projectsType: Array.isArray(state.projects) ? 'array' : typeof state.projects,
      projectsCount: state.projects?.length,
      openProjectsType: state.openProjects instanceof Set ? 'Set' : Array.isArray(state.openProjects) ? 'Array' : typeof state.openProjects,
      openProjectsValue: state.openProjects instanceof Set ? Array.from(state.openProjects) : state.openProjects,
      currentProjFilter: state.currentProjFilter
    });
    
    const { projects, currentProjFilter } = state;
    
    // CONTAINER-FIRST: Never use global fallback - container must be provided
    if (!containerEl) {
      console.error('❌ renderProjects: Container element not provided! Container must be passed as first argument.');
      return;
    }
    
    const c = containerEl;
    
    // Diagnostic: Check if container is visible and clickable
    const computedStyle = window.getComputedStyle(c);
    console.log('🔍 project-container diagnostics:', {
      display: computedStyle.display,
      visibility: computedStyle.visibility,
      pointerEvents: computedStyle.pointerEvents,
      opacity: computedStyle.opacity,
      hasContent: c.innerHTML.length > 0,
    });
    
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
    
    // DEBUG: Prove clicks reach the project container
    if (!c.__clickProbeInstalled) {
      c.__clickProbeInstalled = true;
      c.addEventListener('click', (e) => {
        const btn = e.target.closest?.('button');
        console.log('🧪 project container click probe:', {
          target: e.target?.tagName,
          buttonClass: btn?.className || null,
          buttonText: btn?.textContent?.trim() || null,
          hasDataAction: btn?.getAttribute('data-action') || null,
        });
      }, true); // capture=true to beat overlays/bubbling issues
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
        
        console.log('🧨 project task action click:', { action, taskId, button: btn });
        
        if (action === 'delete' || action === 'delete-task') {
          // Guard: prevent double handling if another handler already processed this
          if (e.__petalDeleteHandled) {
            console.log('🛡️ Delete event already handled, skipping');
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
  
  // Debug: Log openSet contents for this project
  if (project.id === 1771714801103 || window.__DEBUG__) {
    const openSetArray = Array.from(openSet);
    console.log(`🔍 isOpen check for project ${project.id}:`);
    console.log(`  Project ID: ${project.id} (${typeof project.id})`);
    console.log(`  Project ID as string: "${projectIdForLookup}"`);
    console.log(`  Project ID as number: ${projectIdNum}`);
    console.log(`  OpenSet size: ${openSet.size}`);
    console.log(`  OpenSet contents:`, openSetArray);
    console.log(`  OpenSet types:`, openSetArray.map(id => ({ id, type: typeof id, str: String(id) })));
    console.log(`  hasExact (project.id): ${openSet.has(project.id)}`);
    console.log(`  hasString (projectIdForLookup): ${openSet.has(projectIdForLookup)}`);
    const decimalMatch = !isNaN(projectIdNum) && Array.from(openSet).some(id => {
      const openIdNum = Number(id);
      const matches = !isNaN(openIdNum) && Math.floor(openIdNum) === Math.floor(projectIdNum);
      if (matches) {
        console.log(`  Decimal match found: ${id} (${typeof id}) matches ${project.id}`);
      }
      return matches;
    });
    console.log(`  decimalMatch: ${decimalMatch}`);
  }
  
  // Check if project.id (as string or number) exists in openSet
  const isOpen = openSet.has(project.id) || 
                 openSet.has(projectIdForLookup) ||
                 (!isNaN(projectIdNum) && Array.from(openSet).some(id => {
                   const openIdNum = Number(id);
                   return !isNaN(openIdNum) && Math.floor(openIdNum) === Math.floor(projectIdNum);
                 }));
  
  if (project.id === 1771714801103 || window.__DEBUG__) {
    console.log(`  ✅ Final isOpen result: ${isOpen}`);
  }
  
  // Project metrics: tasks in this project (use getAllTasks to include project subtasks)
  // Normalize projectId comparison to handle both string and number types
  // Also handle decimal projectIds (e.g., 1771714801103.9167 should match project 1771714801103)
  const allTasks = getAllTasks(tasks || [], state.projects || []);
  const normalizedProjectId = String(project.id).trim();
  const projectIdAsNumber = Number(project.id);
  
  const projectTasks = allTasks.filter(t => {
    if (!t.projectId) return false;
    
    // Try exact string match first
    const taskProjectId = String(t.projectId).trim();
    if (taskProjectId === normalizedProjectId) return true;
    
    // If task projectId is a decimal number, check if the integer part matches
    // This handles cases where task.projectId = 1771714801103.9167 and project.id = 1771714801103
    const taskProjectIdNum = Number(t.projectId);
    if (!isNaN(taskProjectIdNum) && !isNaN(projectIdAsNumber)) {
      // Compare integer parts (floor both values)
      if (Math.floor(taskProjectIdNum) === Math.floor(projectIdAsNumber)) {
        return true;
      }
    }
    
    return false;
  });
  
  // Debug logging to help diagnose missing tasks (always log for first project)
  const shouldLog = window.__DEBUG__ || (project.id === (state.projects || [])[0]?.id);
  if (shouldLog) {
    const tasksWithAnyProjectId = allTasks.filter(t => t.projectId);
    const projectIdAsNumber = Number(project.id);
    
    // Log basic info first
    console.log(`🔍 renderProjectCard [${project.name}]:`);
    console.log(`  Project ID: ${project.id} (${typeof project.id})`);
    console.log(`  Normalized: "${normalizedProjectId}"`);
    console.log(`  As Number: ${projectIdAsNumber}`);
    console.log(`  All tasks: ${allTasks.length}`);
    console.log(`  Tasks with projectId: ${tasksWithAnyProjectId.length}`);
    console.log(`  ✅ Matched tasks: ${projectTasks.length}`);
    
    // Show sample tasks with detailed matching info
    const sampleTasks = tasksWithAnyProjectId.slice(0, 5).map(t => {
      const taskProjectId = String(t.projectId).trim();
      const taskProjectIdNum = Number(t.projectId);
      const exactMatch = taskProjectId === normalizedProjectId;
      const intMatch = !isNaN(taskProjectIdNum) && !isNaN(projectIdAsNumber) && 
                       Math.floor(taskProjectIdNum) === Math.floor(projectIdAsNumber);
      const matches = exactMatch || intMatch;
      
      return {
        taskId: t.id,
        title: t.title?.substring(0, 30),
        projectId: t.projectId,
        projectIdType: typeof t.projectId,
        normalized: taskProjectId,
        projectIdNum: taskProjectIdNum,
        exactMatch: exactMatch,
        intMatch: intMatch,
        matches: matches
      };
    });
    
    console.log(`  Sample tasks:`, sampleTasks);
    
    // Show detailed matching info for each sample task
    sampleTasks.forEach((task, idx) => {
      console.log(`    Task ${idx + 1}:`, {
        taskId: task.taskId,
        title: task.title,
        projectId: task.projectId,
        projectIdType: task.projectIdType,
        normalized: task.normalized,
        projectIdNum: task.projectIdNum,
        exactMatch: task.exactMatch,
        intMatch: task.intMatch,
        matches: task.matches,
        shouldShow: task.matches ? 'YES' : 'NO'
      });
    });
    
    // If no matches, show all tasks with projectId
    if (projectTasks.length === 0 && tasksWithAnyProjectId.length > 0) {
      console.warn(`⚠️ No tasks matched for project ${project.name}!`);
      const allTasksWithProjectId = allTasks.filter(t => t.projectId);
      console.log(`  All ${allTasksWithProjectId.length} tasks with projectId:`, 
        allTasksWithProjectId.map(t => ({
          taskId: t.id,
          title: t.title?.substring(0, 40),
          projectId: t.projectId,
          projectIdType: typeof t.projectId,
          projectIdString: String(t.projectId),
          projectIdFloor: Math.floor(Number(t.projectId) || 0)
        }))
      );
    }
  }
  
  const totalTasks = projectTasks.length;
  
  // Debug: Log task rendering info
  if (project.id === 1771714801103 || window.__DEBUG__) {
    console.log(`🔍 renderProjectCard [${project.name}]: Rendering ${totalTasks} tasks`, {
      projectId: project.id,
      projectTasksCount: totalTasks,
      isOpen: isOpen,
      willRenderTasks: isOpen && totalTasks > 0,
      sampleTaskIds: projectTasks.slice(0, 3).map(t => t.id)
    });
  }
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
          <button data-action="toggle-project" data-project-id="${project.id}" class="btn-icon" title="${isOpen ? 'Collapse' : 'Expand'}">${isOpen ? '▼' : '▶'}</button>
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
    ${dl ? `<div class="project-due ${dl.class}">${dl.label}</div>` : ''}
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
                <div class="check-box ${t.done ? 'checked' : ''}"
                     data-action="toggle-task" data-task-id="${t.id}"></div>
                
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
                    ${tdl ? `<span class="due-tag ${tdl.class}">${esc(tdl.label)}</span>` : ''}
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
