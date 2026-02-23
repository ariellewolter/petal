// ═══════════════════════ PROJECT OPERATIONS ═══════════════════════
// Core project management functions

import { defaultProjectBrief, normalizeListValue, defaultMilestonesFromTemplate } from '../utils/projectHelpers.js';

/**
 * Helper: Update store with safety - preserves all state fields
 */
function updateStoreSafely(updates, fallbackFn) {
  if (window.Petal?.store) {
    const state = window.Petal.store.getState();
    window.Petal.store.setState({
      ...state,
      ...updates
    });
    // Store auto-saves and auto-renders via subscriptions
  } else if (fallbackFn) {
    // Fallback: old pattern
    fallbackFn();
  }
}

/**
 * Add a new project
 */
export async function addProject(ctx) {
  const { tasks, projects, save, render, refreshProjectSelects, getFileLinks, getFileLinksNormalized } = ctx;
  
  const nameInput = document.getElementById('pr-name');
  if (!nameInput) return;
  
  const name = nameInput.value.trim();
  if (!name) {
    nameInput.focus();
    return;
  }
  
  // Get files
  const files = window.electronAPI 
    ? await getFileLinksNormalized('proj-files-container', 'p') 
    : getFileLinks('proj-files-container', 'p');
  
  // Get selected workflow lanes
  const workflowLanes = [];
  const labCheckbox = document.getElementById('pr-workflow-lab');
  const compCheckbox = document.getElementById('pr-workflow-comp');
  const writingCheckbox = document.getElementById('pr-workflow-writing');
  const presentationCheckbox = document.getElementById('pr-workflow-presentation');
  const personalCheckbox = document.getElementById('pr-workflow-personal');
  const productCheckbox = document.getElementById('pr-workflow-product');
  
  if (labCheckbox?.checked) workflowLanes.push('lab');
  if (compCheckbox?.checked) workflowLanes.push('comp');
  if (writingCheckbox?.checked) workflowLanes.push('writing');
  if (presentationCheckbox?.checked) workflowLanes.push('presentation');
  if (personalCheckbox?.checked) workflowLanes.push('personal');
  if (productCheckbox?.checked) workflowLanes.push('product');
  
  // Get project brief fields
  const brief = {
    objective: document.getElementById('pr-brief-objective')?.value.trim() || '',
    hypothesis: document.getElementById('pr-brief-hypothesis')?.value.trim() || '',
    keyOutputs: document.getElementById('pr-brief-key-outputs')?.value.trim() || '',
    focus: document.getElementById('pr-brief-focus')?.value.trim() || ''
  };
  
  // Get pinned outputs
  const outputs = {
    figures: normalizeListValue(document.getElementById('pr-output-figures')?.value),
    datasets: normalizeListValue(document.getElementById('pr-output-datasets')?.value),
    deliverables: normalizeListValue(document.getElementById('pr-output-deliverables')?.value)
  };
  
  // Get template if selected
  const templateId = document.getElementById('pr-template')?.value || '';
  let milestones = [];
  const newProjectId = Date.now();
  const newTasks = [];
  
  if (templateId && window.PROJECT_TEMPLATES?.[templateId]) {
    milestones = defaultMilestonesFromTemplate(templateId);
    // Create starter tasks from template - ONLY for selected workflow lanes
    const template = window.PROJECT_TEMPLATES[templateId];
    if (template.starterTasks && workflowLanes.length > 0) {
      // Filter starter tasks to only include those matching selected workflow lanes
      template.starterTasks
        .filter(st => st.lane && workflowLanes.includes(st.lane))
        .forEach(st => {
          const newTask = {
            id: Date.now() + Math.random(),
            title: st.title,
            notes: '',
            priority: 'medium',
            due: '',
            files: [],
            done: false,
            status: 'Todo',
            lane: st.lane || null,
            stage: 'planned',
            projectId: newProjectId,
            boardOrder: 1024
          };
          newTasks.push(newTask);
        });
    }
  }
  
  // Get selected color (from global selectedColor or default to 1)
  const selectedColor = typeof window.selectedColor !== 'undefined' ? window.selectedColor : 1;
  
  const newProject = {
    id: newProjectId,
    name,
    desc: document.getElementById('pr-desc')?.value.trim() || '',
    due: document.getElementById('pr-due')?.value || '',
    color: selectedColor,
    files,
    subtasks: [],
    done: false,
    workflowLanes: workflowLanes.length > 0 ? workflowLanes : null,
    brief,
    outputs,
    milestones,
    pinnedFiles: []
  };
  
  // Update store if available
  if (window.Petal?.store) {
    const state = window.Petal.store.getState();
    const updatedProjects = [newProject, ...(state.projects || [])];
    const updatedTasks = newTasks.length > 0 
      ? [...newTasks, ...(state.tasks || [])]
      : (state.tasks || []);
    
    updateStoreSafely({ 
      projects: updatedProjects,
      tasks: updatedTasks
    });
  } else {
    // Fallback for backward compatibility
    projects.unshift(newProject);
    if (newTasks.length > 0) {
      tasks.push(...newTasks);
    }
    await save();
  }
  
  if (refreshProjectSelects) refreshProjectSelects();
  if (render) render();
  
  // Clear form
  nameInput.value = '';
  const descInput = document.getElementById('pr-desc');
  if (descInput) descInput.value = '';
  const dueInput = document.getElementById('pr-due');
  if (dueInput) dueInput.value = '';
  const filesContainer = document.getElementById('proj-files-container');
  if (filesContainer) filesContainer.innerHTML = '';
  
  // Reset checkboxes
  if (labCheckbox) labCheckbox.checked = false;
  if (compCheckbox) compCheckbox.checked = false;
  if (writingCheckbox) writingCheckbox.checked = false;
  if (presentationCheckbox) presentationCheckbox.checked = false;
  
  // Clear brief fields
  const briefObjective = document.getElementById('pr-brief-objective');
  if (briefObjective) briefObjective.value = '';
  const briefHypothesis = document.getElementById('pr-brief-hypothesis');
  if (briefHypothesis) briefHypothesis.value = '';
  const briefKeyOutputs = document.getElementById('pr-brief-key-outputs');
  if (briefKeyOutputs) briefKeyOutputs.value = '';
  const briefFocus = document.getElementById('pr-brief-focus');
  if (briefFocus) briefFocus.value = '';
  
  // Clear output fields
  const outputFigures = document.getElementById('pr-output-figures');
  if (outputFigures) outputFigures.value = '';
  const outputDatasets = document.getElementById('pr-output-datasets');
  if (outputDatasets) outputDatasets.value = '';
  const outputDeliverables = document.getElementById('pr-output-deliverables');
  if (outputDeliverables) outputDeliverables.value = '';
  
  // Clear template
  const templateSelect = document.getElementById('pr-template');
  if (templateSelect) templateSelect.value = '';
  
  // Reset color swatch
  document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
  const defaultColorSwatch = document.querySelector('.color-swatch[data-color="1"]');
  if (defaultColorSwatch) defaultColorSwatch.classList.add('selected');
  if (typeof window !== 'undefined') {
    window.selectedColor = 1;
  }
}

/**
 * Toggle project done status
 */
export async function toggleProjectDone(ctx, id) {
  const { projects, save, render } = ctx;
  
  // Use store if available
  if (window.Petal?.store) {
    const state = window.Petal.store.getState();
    const updatedProjects = (state.projects || []).map(p => 
      p.id === id ? { ...p, done: !p.done } : p
    );
    updateStoreSafely({ projects: updatedProjects });
  } else {
    // Fallback
    const p = projects.find(p => p.id === id);
    if (p) {
      p.done = !p.done;
      await save();
      if (render) render();
    }
  }
}

/**
 * Toggle project open/closed (expand/collapse)
 */
export async function toggleProjectOpen(ctx, id) {
  const { save, render } = ctx;
  
  // Use store if available
  if (window.Petal?.store) {
    const state = window.Petal.store.getState();
    const open = Array.isArray(state.openProjects) ? state.openProjects : [];
    const next = open.includes(id) 
      ? open.filter(x => x !== id) 
      : [...open, id];
    updateStoreSafely({ openProjects: next });
  } else {
    // Fallback: store not initialized (shouldn't happen in normal flow)
    console.warn('Store not available in toggleProjectOpen, openProjects not updated');
  }
}

/**
 * Apply project template to form
 */
export function applyProjectTemplate(templateId) {
  if (!templateId || !window.PROJECT_TEMPLATES?.[templateId]) return;
  
  const template = window.PROJECT_TEMPLATES[templateId];
  
  // DO NOT override user's workflow lane selections - preserve their choices
  // Only suggest lanes if none are selected yet
  const labCheckbox = document.getElementById('pr-workflow-lab');
  const compCheckbox = document.getElementById('pr-workflow-comp');
  const writingCheckbox = document.getElementById('pr-workflow-writing');
  const presentationCheckbox = document.getElementById('pr-workflow-presentation');
  const personalCheckbox = document.getElementById('pr-workflow-personal');
  const productCheckbox = document.getElementById('pr-workflow-product');
  
  // Check if any lanes are already selected
  const hasSelectedLanes = (labCheckbox?.checked) || (compCheckbox?.checked) || 
                           (writingCheckbox?.checked) || (presentationCheckbox?.checked) ||
                           (personalCheckbox?.checked) || (productCheckbox?.checked);
  
  // Only set lanes from template if user hasn't selected any yet
  if (!hasSelectedLanes) {
    if (labCheckbox) labCheckbox.checked = template.lanes?.includes('lab') || false;
    if (compCheckbox) compCheckbox.checked = template.lanes?.includes('comp') || false;
    if (writingCheckbox) writingCheckbox.checked = template.lanes?.includes('writing') || false;
    if (presentationCheckbox) presentationCheckbox.checked = template.lanes?.includes('presentation') || false;
    if (personalCheckbox) personalCheckbox.checked = template.lanes?.includes('personal') || false;
    if (productCheckbox) productCheckbox.checked = template.lanes?.includes('product') || false;
  }
  
  // Set brief focus
  const briefFocusEl = document.getElementById('pr-brief-focus');
  if (briefFocusEl && template.briefFocus) {
    briefFocusEl.value = template.briefFocus;
  }
}

/**
 * Edit project header field
 */
export function editProjectHeaderField(ctx, field) {
  const { projects, saveState, renderProjectHeader, defaultProjectBrief } = ctx;
  
  const selectedProjectId = typeof window.selectedProjectId !== 'undefined' ? window.selectedProjectId : null;
  if (!selectedProjectId) return;
  
  const project = projects.find(p => p.id === selectedProjectId);
  if (!project) return;
  
  const brief = project.brief || defaultProjectBrief();
  const currentValue = brief[field] || '';
  const fieldLabels = {
    objective: 'Objective',
    focus: 'Current Focus',
    definitionOfDone: 'Definition of Done'
  };
  
  const newValue = prompt(`Enter ${fieldLabels[field] || field}:`, currentValue);
  if (newValue === null) return; // User cancelled
  
  if (!project.brief) project.brief = defaultProjectBrief();
  project.brief[field] = newValue.trim();
  
  // Use store if available
  if (window.Petal?.store) {
    const state = window.Petal.store.getState();
    const updatedProjects = (state.projects || []).map(p => {
      if (p.id === selectedProjectId) {
        return {
          ...p,
          brief: {
            ...(p.brief || defaultProjectBrief()),
            [field]: newValue.trim()
          }
        };
      }
      return p;
    });
    updateStoreSafely({ projects: updatedProjects });
  } else {
    if (saveState) saveState();
    if (renderProjectHeader) renderProjectHeader(project);
  }
}

/**
 * Pin a file to a project
 */
export async function pinFile(ctx, projectId, fileDataAttr) {
  const { projects, save, renderFilesTab } = ctx;
  
  const project = projects.find(p => p.id === projectId);
  if (!project) return;
  
  try {
    const fileLink = JSON.parse(fileDataAttr.replace(/&#39;/g, "'"));
    const allFiles = project.files || [];
    
    // Find and update the file
    const fileIndex = allFiles.findIndex(f => {
      const fObj = typeof f === 'object' ? f : { abs_path: f };
      const match = (fObj.onedrive_rel && fileLink.onedrive_rel && fObj.onedrive_rel === fileLink.onedrive_rel) ||
                    (fObj.abs_path && fileLink.abs_path && fObj.abs_path === fileLink.abs_path);
      return match;
    });
    
    if (fileIndex >= 0) {
      const file = allFiles[fileIndex];
      const fileObj = typeof file === 'object' ? file : { abs_path: file };
      fileObj.pinned = true;
      allFiles[fileIndex] = fileObj;
    } else {
      // Add as new file
      const newFile = { ...fileLink, pinned: true };
      allFiles.push(newFile);
    }
    
    // Use store if available
    if (window.Petal?.store) {
      const state = window.Petal.store.getState();
      const updatedProjects = (state.projects || []).map(p => {
        if (p.id === projectId) {
          return { ...p, files: allFiles };
        }
        return p;
      });
      updateStoreSafely({ projects: updatedProjects });
    } else {
      project.files = allFiles;
      await save();
    }
    
    // Re-render files tab
    const currentFilesTab = typeof window.currentFilesTab !== 'undefined' ? window.currentFilesTab : 'pinned';
    if (renderFilesTab) {
      await renderFilesTab(currentFilesTab, project);
    }
  } catch (e) {
    console.error('Error pinning file:', e);
  }
}

/**
 * Toggle file pinned status
 */
export async function toggleFilePinned(ctx, projectId, fileDataAttr) {
  const { projects, save, renderFilesTab } = ctx;
  
  const project = projects.find(p => p.id === projectId);
  if (!project) return;
  
  try {
    const fileLink = JSON.parse(fileDataAttr.replace(/&#39;/g, "'"));
    const allFiles = project.files || [];
    
    const fileIndex = allFiles.findIndex(f => {
      const fObj = typeof f === 'object' ? f : { abs_path: f };
      const match = (fObj.onedrive_rel && fileLink.onedrive_rel && fObj.onedrive_rel === fileLink.onedrive_rel) ||
                    (fObj.abs_path && fileLink.abs_path && fObj.abs_path === fileLink.abs_path);
      return match;
    });
    
    if (fileIndex >= 0) {
      const file = allFiles[fileIndex];
      const fileObj = typeof file === 'object' ? file : { abs_path: file };
      fileObj.pinned = !fileObj.pinned;
      allFiles[fileIndex] = fileObj;
      
      // Use store if available
      if (window.Petal?.store) {
        const state = window.Petal.store.getState();
        const updatedProjects = (state.projects || []).map(p => {
          if (p.id === projectId) {
            return { ...p, files: allFiles };
          }
          return p;
        });
        updateStoreSafely({ projects: updatedProjects });
      } else {
        project.files = allFiles;
        await save();
      }
      
      // Re-render files tab
      const currentFilesTab = typeof window.currentFilesTab !== 'undefined' ? window.currentFilesTab : 'pinned';
      if (renderFilesTab) {
        await renderFilesTab(currentFilesTab, project);
      }
    }
  } catch (e) {
    console.error('Error toggling file pinned:', e);
  }
}

/**
 * Remove pinned file
 */
export async function removePinnedFile(ctx, projectId, fileDataAttr) {
  const { projects, save, renderProjectFiles } = ctx;
  
  try {
    const project = projects.find(p => p.id === projectId);
    if (!project) {
      console.warn('removePinnedFile: Project not found:', projectId);
      return;
    }

    const fileLink = JSON.parse(fileDataAttr.replace(/&#39;/g, "'"));

    if (!project.pinnedFiles) project.pinnedFiles = [];
    project.pinnedFiles = project.pinnedFiles.filter(f => {
      const fObj = typeof f === 'object' ? f : { abs_path: f };
      const match = (fObj.onedrive_rel && fileLink.onedrive_rel && fObj.onedrive_rel === fileLink.onedrive_rel) ||
                    (fObj.abs_path && fileLink.abs_path && fObj.abs_path === fileLink.abs_path) ||
                    (fObj.share_url && fileLink.share_url && fObj.share_url === fileLink.share_url);
      return !match;
    });

    // Keep canonical registry in sync when older pinnedFiles format is used.
    if (Array.isArray(project.files)) {
      project.files = project.files.map(f => {
        const fObj = typeof f === 'object' ? f : { abs_path: f };
        const match = (fObj.onedrive_rel && fileLink.onedrive_rel && fObj.onedrive_rel === fileLink.onedrive_rel) ||
                      (fObj.abs_path && fileLink.abs_path && fObj.abs_path === fileLink.abs_path) ||
                      (fObj.share_url && fileLink.share_url && fObj.share_url === fileLink.share_url);
        if (!match) return f;
        return { ...fObj, pinned: false };
      });
    }

    // Use store if available
    if (window.Petal?.store) {
      const state = window.Petal.store.getState();
      const updatedProjects = (state.projects || []).map(p => {
        if (p.id === projectId) {
          return { 
            ...p, 
            files: project.files,
            pinnedFiles: project.pinnedFiles
          };
        }
        return p;
      });
      updateStoreSafely({ projects: updatedProjects });
    } else {
      await save();
    }
    
    if (renderProjectFiles) {
      await renderProjectFiles();
    }
  } catch (e) {
    console.error('Error removing pinned file:', e);
    alert('Error removing pinned file: ' + (e.message || e));
  }
}

/**
 * Switch project page tab
 */
export function switchProjectPageTab(ctx, tab) {
  const { projects, renderFilesTab, renderProjectFiles, renderProjectMilestones } = ctx;
  
  // Update global state
  if (typeof window !== 'undefined') {
    window.currentProjectPageTab = tab;
  }
  
  // Update tab buttons
  ['workflow', 'files', 'milestones'].forEach(t => {
    const btn = document.getElementById(`project-page-tab-${t}`);
    const panel = document.getElementById(`project-page-tab-${t}-panel`);
    if (btn) {
      if (t === tab) {
        btn.style.background = 'var(--rose-pale)';
        btn.style.color = 'var(--rose)';
      } else {
        btn.style.background = 'transparent';
        btn.style.color = 'var(--text-dim)';
      }
    }
    if (panel) {
      panel.style.display = t === tab ? '' : 'none';
    }
  });
  
  // Render the selected tab
  const selectedProjectId = typeof window.selectedProjectId !== 'undefined' ? window.selectedProjectId : null;
  if (tab === 'workflow') {
    // Files panel is part of workflow view now
    if (selectedProjectId) {
      const project = projects.find(p => p.id === selectedProjectId);
      if (project && renderFilesTab) {
        const currentFilesTab = typeof window.currentFilesTab !== 'undefined' ? window.currentFilesTab : 'pinned';
        renderFilesTab(currentFilesTab, project);
      }
    }
  } else if (tab === 'files') {
    if (renderProjectFiles) {
      renderProjectFiles();
    }
  } else if (tab === 'milestones') {
    if (renderProjectMilestones) {
      renderProjectMilestones(ctx);
    }
  }
}

// ═══════════════════════ PROJECT MILESTONE OPERATIONS ═══════════════════════

/**
 * Render project milestones panel
 */
export function renderProjectMilestones(ctx) {
  const { projects, esc, normalizeProjectIdValue } = ctx;
  const selectedProjectId = typeof window.selectedProjectId !== 'undefined' ? window.selectedProjectId : null;
  
  // Try to get project ID from selectedProjectId or from the matrix selector
  let projectId = selectedProjectId;
  if (!projectId) {
    const selector = document.getElementById('matrix-project-select');
    if (selector && selector.value) {
      projectId = normalizeProjectIdValue ? normalizeProjectIdValue(selector.value) : selector.value;
    }
  } else {
    projectId = normalizeProjectIdValue ? normalizeProjectIdValue(projectId) : projectId;
  }
  
  if (!projectId) {
    const panelEl = document.getElementById('project-milestones-panel-content');
    if (panelEl) {
      panelEl.innerHTML = '<div style="font-size:12px;color:var(--text-dim);padding:40px;text-align:center;">Please select a project first</div>';
    }
    return;
  }
  
  const project = projects.find(p => p.id === projectId);
  if (!project) {
    const panelEl = document.getElementById('project-milestones-panel-content');
    if (panelEl) {
      panelEl.innerHTML = '<div style="font-size:12px;color:var(--text-dim);padding:40px;text-align:center;">Project not found</div>';
    }
    return;
  }
  
  const panelEl = document.getElementById('project-milestones-panel-content');
  if (!panelEl) return;
  
  const milestones = project.milestones || [];
  const escFn = esc || ((s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'));
  
  let html = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">';
  html += '<h3 style="font-size:14px;font-weight:600;color:var(--text);margin:0;">Milestones</h3>';
  html += '<button data-action="add-milestone" style="padding:6px 12px;background:var(--rose);color:white;border:none;border-radius:6px;font-size:12px;cursor:pointer;">＋ Add</button>';
  html += '</div>';
  
  if (milestones.length > 0) {
    milestones.forEach(m => {
      const dueDate = m.dueDate ? new Date(m.dueDate).toLocaleDateString() : '';
      html += `<div style="background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:12px;margin-bottom:12px;">`;
      html += `<div style="display:flex;align-items:flex-start;gap:8px;">`;
      // Use global wrapper functions for inline handlers
      const toggleFn = typeof toggleMilestone === 'function' ? 'toggleMilestone' : 'window.Petal?.features?.projectOperations?.toggleMilestone';
      const deleteFn = typeof deleteMilestone === 'function' ? 'deleteMilestone' : 'window.Petal?.features?.projectOperations?.deleteMilestone';
      html += `<input type="checkbox" ${m.done ? 'checked' : ''} onchange="${toggleFn}(${projectId}, ${m.id})" style="margin-top:4px;cursor:pointer;">`;
      html += `<div style="flex:1;"><div style="font-size:14px;font-weight:500;color:var(--text);${m.done ? 'text-decoration:line-through;opacity:0.6;' : ''}">${escFn(m.title)}</div>`;
      if (dueDate) {
        html += `<div style="font-size:11px;color:var(--text-dim);margin-top:4px;">Due: ${escFn(dueDate)}</div>`;
      }
      if (m.linkedTaskIds && m.linkedTaskIds.length > 0) {
        html += `<div style="font-size:11px;color:var(--text-dim);margin-top:4px;">Linked to ${m.linkedTaskIds.length} task(s)</div>`;
      }
      if (m.linkedFileIds && m.linkedFileIds.length > 0) {
        html += `<div style="font-size:11px;color:var(--text-dim);margin-top:4px;">Linked to ${m.linkedFileIds.length} file(s)</div>`;
      }
      html += `</div>`;
      html += `<button onclick="${deleteFn}(${projectId}, ${m.id})" style="padding:4px 8px;background:var(--bg2);border:1px solid var(--border);border-radius:4px;color:var(--text-dim);font-size:10px;cursor:pointer;">Delete</button>`;
      html += `</div></div>`;
    });
  } else {
    html += '<div style="font-size:12px;color:var(--text-dim);padding:40px;text-align:center;">No milestones yet. Click Add to create one.</div>';
  }
  
  panelEl.innerHTML = html;
}

/**
 * Add a new milestone to a project
 */
export async function addMilestone(ctx) {
  const { projects, save, renderProjectMilestones, switchProjectPageTab, normalizeProjectIdValue } = ctx;
  const selectedProjectId = typeof window.selectedProjectId !== 'undefined' ? window.selectedProjectId : null;
  
  // Try to get project ID from selectedProjectId or from the matrix selector
  let projectId = selectedProjectId;
  if (!projectId) {
    const selector = document.getElementById('matrix-project-select');
    if (selector && selector.value) {
      projectId = normalizeProjectIdValue ? normalizeProjectIdValue(selector.value) : selector.value;
    }
  } else {
    projectId = normalizeProjectIdValue ? normalizeProjectIdValue(projectId) : projectId;
  }
  
  if (!projectId) {
    alert('Please select a project first');
    return;
  }
  
  const project = projects.find(p => p.id === projectId);
  if (!project) {
    alert('Project not found');
    return;
  }
  
  const title = prompt('Enter milestone title:');
  if (!title || !title.trim()) return;
  
  const newMilestone = {
    id: Date.now(),
    title: title.trim(),
    done: false,
    linkedTaskIds: [],
    linkedFileIds: [],
    dueDate: ''
  };
  
  // Use store if available
  if (window.Petal?.store) {
    const state = window.Petal.store.getState();
    const updatedProjects = (state.projects || []).map(p => {
      if (p.id === projectId) {
        return {
          ...p,
          milestones: [...(p.milestones || []), newMilestone]
        };
      }
      return p;
    });
    updateStoreSafely({ projects: updatedProjects });
  } else {
    if (!project.milestones) project.milestones = [];
    project.milestones.push(newMilestone);
    if (save) await save();
  }
  
  // Refresh the milestones view if we're on that tab
  const currentProjectPageTab = typeof window.currentProjectPageTab !== 'undefined' ? window.currentProjectPageTab : null;
  if (currentProjectPageTab === 'milestones') {
    if (renderProjectMilestones) {
      renderProjectMilestones(ctx);
    }
  } else {
    // If not on milestones tab, switch to it and render
    if (switchProjectPageTab) {
      switchProjectPageTab(ctx, 'milestones');
    }
  }
}

/**
 * Toggle milestone completion
 */
export async function toggleMilestone(ctx, projectId, milestoneId) {
  const { projects, save, renderProjectMilestones } = ctx;
  
  const project = projects.find(p => p.id === projectId);
  if (!project || !project.milestones) return;
  
  const milestone = project.milestones.find(m => m.id === milestoneId);
  if (!milestone) return;
  
  // Use store if available
  if (window.Petal?.store) {
    const state = window.Petal.store.getState();
    const updatedProjects = (state.projects || []).map(p => {
      if (p.id === projectId) {
        return {
          ...p,
          milestones: (p.milestones || []).map(m => 
            m.id === milestoneId ? { ...m, done: !m.done } : m
          )
        };
      }
      return p;
    });
    updateStoreSafely({ projects: updatedProjects });
  } else {
    milestone.done = !milestone.done;
    if (save) await save();
  }
  
  if (renderProjectMilestones) {
    renderProjectMilestones(ctx);
  }
}

/**
 * Delete a milestone
 */
export async function deleteMilestone(ctx, projectId, milestoneId) {
  const { projects, save, renderProjectMilestones } = ctx;
  
  const project = projects.find(p => p.id === projectId);
  if (!project || !project.milestones) return;
  
  if (confirm('Delete this milestone?')) {
    // Use store if available
    if (window.Petal?.store) {
      const state = window.Petal.store.getState();
      const updatedProjects = (state.projects || []).map(p => {
        if (p.id === projectId) {
          return {
            ...p,
            milestones: (p.milestones || []).filter(m => m.id !== milestoneId)
          };
        }
        return p;
      });
      updateStoreSafely({ projects: updatedProjects });
    } else {
      project.milestones = project.milestones.filter(m => m.id !== milestoneId);
      if (save) await save();
    }
    
    if (renderProjectMilestones) {
      renderProjectMilestones(ctx);
    }
  }
}

// ═══════════════════════ PROJECT CHECKPOINT OPERATIONS ═══════════════════════

/**
 * Render project checkpoints
 */
export function renderProjectCheckpoints(ctx, project) {
  const { esc } = ctx;
  
  const checkpointsEl = document.getElementById('project-checkpoints-list');
  if (!checkpointsEl) return;
  
  const checkpoints = project.checkpoints || [];
  if (checkpoints.length === 0) {
    checkpointsEl.innerHTML = '<div style="font-size:11px;color:var(--text-light);font-style:italic;text-align:center;padding:20px;">No checkpoints yet. Click "+ Add Checkpoint" to create one.</div>';
    return;
  }
  
  // Sort newest first
  const sortedCheckpoints = [...checkpoints].sort((a, b) => (b.date || 0) - (a.date || 0));
  const escFn = esc || ((s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'));
  
  const html = sortedCheckpoints.map(cp => {
    const date = new Date(cp.date || Date.now());
    const dateStr = date.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
    return `<div style="padding:12px;background:var(--bg2);border-left:4px solid var(--rose);border-radius:6px;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px;">
        <div style="font-size:13px;font-weight:600;color:var(--text);">${escFn(cp.name || 'Unnamed')}</div>
        <div style="font-size:10px;color:var(--text-dim);">${dateStr}</div>
      </div>
      ${cp.note ? `<div style="font-size:11px;color:var(--text-dim);white-space:pre-wrap;margin-top:4px;">${escFn(cp.note)}</div>` : ''}
    </div>`;
  }).join('');
  
  checkpointsEl.innerHTML = html;
}

/**
 * Toggle add checkpoint form
 */
export function toggleAddCheckpoint() {
  const form = document.getElementById('add-checkpoint-form');
  const nameInput = document.getElementById('checkpoint-name');
  if (form && nameInput) {
    form.style.display = form.style.display === 'none' ? 'block' : 'none';
    if (form.style.display === 'block') {
      nameInput.focus();
    }
  }
}

/**
 * Cancel add checkpoint
 */
export function cancelAddCheckpoint() {
  const form = document.getElementById('add-checkpoint-form');
  const nameInput = document.getElementById('checkpoint-name');
  const noteInput = document.getElementById('checkpoint-note');
  if (form) form.style.display = 'none';
  if (nameInput) nameInput.value = '';
  if (noteInput) noteInput.value = '';
}

/**
 * Save checkpoint
 */
export async function saveCheckpoint(ctx) {
  const { projects, save, renderProjectCheckpoints } = ctx;
  const selectedProjectId = typeof window.selectedProjectId !== 'undefined' ? window.selectedProjectId : null;
  
  if (!selectedProjectId) return;
  const project = projects.find(p => p.id === selectedProjectId);
  if (!project) return;
  
  const nameInput = document.getElementById('checkpoint-name');
  const noteInput = document.getElementById('checkpoint-note');
  if (!nameInput || !noteInput) return;
  
  const name = nameInput.value.trim();
  if (!name) {
    alert('Please enter a checkpoint name');
    return;
  }
  
  const newCheckpoint = {
    id: Date.now(),
    name: name,
    date: Date.now(),
    note: noteInput.value.trim()
  };
  
  // Use store if available
  if (window.Petal?.store) {
    const state = window.Petal.store.getState();
    const updatedProjects = (state.projects || []).map(p => {
      if (p.id === selectedProjectId) {
        return {
          ...p,
          checkpoints: [...(p.checkpoints || []), newCheckpoint]
        };
      }
      return p;
    });
    updateStoreSafely({ projects: updatedProjects });
  } else {
    if (!project.checkpoints) project.checkpoints = [];
    project.checkpoints.push(newCheckpoint);
    if (save) await save();
  }
  
  if (renderProjectCheckpoints) {
    renderProjectCheckpoints(ctx, project);
  }
  
  // Clear and hide form
  nameInput.value = '';
  noteInput.value = '';
  const form = document.getElementById('add-checkpoint-form');
  if (form) form.style.display = 'none';
}

// ═══════════════════════ FILE VERSION OPERATIONS ═══════════════════════

/**
 * Toggle file version history visibility
 */
export function toggleFileVersionHistory(versionId) {
  const el = document.getElementById(versionId);
  if (el) {
    el.style.display = el.style.display === 'none' ? 'block' : 'none';
  }
}

/**
 * Add new file version
 */
export async function addFileVersion(ctx, projectId, fileDataAttr) {
  const { projects, save, renderFilesTab } = ctx;
  
  const project = projects.find(p => p.id === projectId);
  if (!project) return;
  
  try {
    const fileLink = JSON.parse(fileDataAttr.replace(/&#39;/g, "'"));
    const version = prompt('Version number (e.g., 0.3):');
    if (!version) return;
    
    const note = prompt('Version notes (what changed):');
    if (note === null) return; // User cancelled
    
    // Find file in project
    const allFiles = project.files || [];
    const fileIndex = allFiles.findIndex(f => {
      const fObj = typeof f === 'object' ? f : { abs_path: f };
      const match = (fObj.onedrive_rel && fileLink.onedrive_rel && fObj.onedrive_rel === fileLink.onedrive_rel) ||
                    (fObj.abs_path && fileLink.abs_path && fObj.abs_path === fileLink.abs_path);
      return match;
    });
    
    if (fileIndex >= 0) {
      const file = allFiles[fileIndex];
      const fileObj = typeof file === 'object' ? file : { abs_path: file };
      
      if (!fileObj.versions) fileObj.versions = [];
      fileObj.versions.push({
        version: version.trim(),
        date: Date.now(),
        note: note.trim()
      });
      fileObj.version = version.trim();
      
      allFiles[fileIndex] = fileObj;
      
      // Use store if available
      if (window.Petal?.store) {
        const state = window.Petal.store.getState();
        const updatedProjects = (state.projects || []).map(p => {
          if (p.id === projectId) {
            return { ...p, files: allFiles };
          }
          return p;
        });
        updateStoreSafely({ projects: updatedProjects });
      } else {
        project.files = allFiles;
        if (save) await save();
      }
      
      // Re-render files tab
      const currentFilesTab = typeof window.currentFilesTab !== 'undefined' ? window.currentFilesTab : 'pinned';
      if (renderFilesTab) {
        await renderFilesTab(currentFilesTab, project);
      }
    } else {
      alert('File not found in project');
    }
  } catch (e) {
    console.error('Error adding file version:', e);
    alert('Error adding version');
  }
}
