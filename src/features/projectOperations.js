// ═══════════════════════ PROJECT OPERATIONS ═══════════════════════
// Core project management functions

import {
  defaultProjectBrief,
  normalizeListValue,
  defaultMilestonesFromTemplate,
  findProjectById,
  projectIdsMatch,
  normalizeProjectIdValue,
  filterTasksForProject
} from '../utils/projectHelpers.js';
import { esc, escAttr, fileIcon } from '../utils/strings.js';
import { LANE_STAGES } from '../domain/schema.js';

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
  const { tasks, projects, save, render, refreshProjectSelects, getFileLinks, getFileLinksNormalized } = ctx || {};
  
  const nameInput = document.getElementById('pr-name');
  if (!nameInput) return;
  
  const name = nameInput.value.trim();
  if (!name) {
    nameInput.focus();
    return;
  }
  
  // Get files
  const fileOps = window.Petal?.features?.fileOperations || {};
  const getFileLinksFn = typeof getFileLinks === 'function' ? getFileLinks : fileOps.getFileLinks;
  const getFileLinksNormalizedFn = typeof getFileLinksNormalized === 'function'
    ? getFileLinksNormalized
    : fileOps.getFileLinksNormalized;
  const files = window.electronAPI
    ? (getFileLinksNormalizedFn ? await getFileLinksNormalizedFn('proj-files-container', 'p') : [])
    : (getFileLinksFn ? getFileLinksFn('proj-files-container', 'p') : []);
  
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
  if (personalCheckbox) personalCheckbox.checked = false;
  if (productCheckbox) productCheckbox.checked = false;
  
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
      projectIdsMatch(p.id, id) ? { ...p, done: !p.done } : p
    );
    updateStoreSafely({ projects: updatedProjects });
  } else {
    // Fallback
    const p = findProjectById(projects, id);
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
    const resolvedId = normalizeProjectIdValue(id);
    const isOpen = open.some(x => projectIdsMatch(x, resolvedId));
    const next = isOpen
      ? open.filter(x => !projectIdsMatch(x, resolvedId))
      : [...open, resolvedId];
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
  
  const project = findProjectById(projects, selectedProjectId);
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
      if (projectIdsMatch(p.id, selectedProjectId)) {
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
  
  const project = findProjectById(projects, projectId);
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
        if (projectIdsMatch(p.id, projectId)) {
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
  
  const project = findProjectById(projects, projectId);
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
          if (projectIdsMatch(p.id, projectId)) {
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
    const project = findProjectById(projects, projectId);
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
        if (projectIdsMatch(p.id, projectId)) {
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
      await renderProjectFiles(ctx);
    }
  } catch (e) {
    console.error('Error removing pinned file:', e);
    alert('Error removing pinned file: ' + (e.message || e));
  }
}

const PROJECT_PAGE_TAB_IDS = ['workflow', 'milestones', 'artifacts', 'protocols', 'log'];

/**
 * Switch project page tab
 */
export async function switchProjectPageTab(ctx, tab) {
  const { projects, tasks, renderProjectMilestones } = ctx;
  const ui = window.Petal?.ui || {};

  if (!tab || !PROJECT_PAGE_TAB_IDS.includes(tab)) {
    tab = 'workflow';
  }

  if (typeof window !== 'undefined') {
    window.currentProjectPageTab = tab;
  }

  PROJECT_PAGE_TAB_IDS.forEach((t) => {
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
      panel.style.display = t === tab ? 'block' : 'none';
    }
  });

  const selectedProjectId =
    ctx.selectedProjectId ??
    (typeof window.selectedProjectId !== 'undefined' ? window.selectedProjectId : null);
  if (!selectedProjectId) return;

  const project = findProjectById(projects, selectedProjectId);
  if (!project) return;

  const tasksList = tasks || ctx.state?.tasks || window.Petal?.store?.getState()?.tasks || [];
  const projectTasks = filterTasksForProject(tasksList, project.id, { excludeDeleted: true });

  if (tab === 'workflow') {
    if (ui.renderProjectOverviewSections) {
      ui.renderProjectOverviewSections(ctx, project, projectTasks);
    }
  } else if (tab === 'milestones') {
    if (ui.renderMilestonesTimeline) {
      ui.renderMilestonesTimeline(ctx);
    } else if (renderProjectMilestones) {
      renderProjectMilestones(ctx);
    }
  } else if (tab === 'artifacts') {
    if (ui.renderArtifacts) {
      ui.renderArtifacts(ctx);
    }
  } else if (tab === 'protocols') {
    if (ui.renderProtocolRuns) {
      ui.renderProtocolRuns(ctx);
    }
  } else if (tab === 'log') {
    if (ui.renderProgressMomentum) {
      ui.renderProgressMomentum(ctx, project, projectTasks);
    }
    if (ui.renderWorkingLog) {
      ui.renderWorkingLog(ctx, project);
    }
  }
}

// ═══════════════════════ PROJECT MILESTONE OPERATIONS ═══════════════════════

/**
 * Render project milestones panel
 */
/** @deprecated Use renderMilestonesTimeline; kept for ctx callbacks */
export function renderProjectMilestones(ctx) {
  if (window.Petal?.ui?.renderMilestonesTimeline) {
    window.Petal.ui.renderMilestonesTimeline(ctx);
  }
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
  
  const project = findProjectById(projects, projectId);
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
      if (projectIdsMatch(p.id, projectId)) {
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
    refreshMilestonesView(ctx);
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
function refreshMilestonesView(ctx) {
  if (window.Petal?.ui?.renderMilestonesTimeline) {
    window.Petal.ui.renderMilestonesTimeline(ctx);
  } else if (ctx.renderProjectMilestones) {
    ctx.renderProjectMilestones(ctx);
  }
}

export async function toggleMilestone(ctx, projectId, milestoneId) {
  const { projects, save } = ctx;
  const milestoneIdNum = Number(milestoneId);
  const resolvedMilestoneId = Number.isNaN(milestoneIdNum) ? milestoneId : milestoneIdNum;
  
  const project = findProjectById(projects, projectId);
  if (!project || !project.milestones) return;
  
  const milestone = project.milestones.find(m => m.id == resolvedMilestoneId);
  if (!milestone) return;
  
  // Use store if available
  if (window.Petal?.store) {
    const state = window.Petal.store.getState();
    const updatedProjects = (state.projects || []).map(p => {
      if (projectIdsMatch(p.id, projectId)) {
        return {
          ...p,
          milestones: (p.milestones || []).map(m => 
            m.id == resolvedMilestoneId ? { ...m, done: !m.done } : m
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
  
  refreshMilestonesView(ctx);
}

/**
 * Delete a milestone
 */
export async function deleteMilestone(ctx, projectId, milestoneId) {
  const { projects, save } = ctx;
  const milestoneIdNum = Number(milestoneId);
  const resolvedMilestoneId = Number.isNaN(milestoneIdNum) ? milestoneId : milestoneIdNum;
  
  const project = findProjectById(projects, projectId);
  if (!project || !project.milestones) return;
  
  if (confirm('Delete this milestone?')) {
    // Use store if available
    if (window.Petal?.store) {
      const state = window.Petal.store.getState();
      const updatedProjects = (state.projects || []).map(p => {
        if (projectIdsMatch(p.id, projectId)) {
          return {
            ...p,
            milestones: (p.milestones || []).filter(m => m.id != resolvedMilestoneId)
          };
        }
        return p;
      });
      updateStoreSafely({ projects: updatedProjects });
    } else {
      project.milestones = project.milestones.filter(m => m.id != resolvedMilestoneId);
      if (save) await save();
    }
    
    refreshMilestonesView(ctx);
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
  const project = findProjectById(projects, selectedProjectId);
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
      if (projectIdsMatch(p.id, selectedProjectId)) {
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
  
  const project = findProjectById(projects, projectId);
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
          if (projectIdsMatch(p.id, projectId)) {
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

/**
 * Add a checkpoint to a project
 * @deprecated This is a legacy function - consider using milestones instead
 */
export function addProjectCheckpoint(ctx, projectId, name, note) {
  const { projects } = ctx;
  const project = findProjectById(projects, projectId);
  if (!project) return false;
  
  if (!project.checkpoints) {
    project.checkpoints = [];
  }
  
  const checkpoint = {
    id: `checkpoint_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    at: new Date().toISOString(),
    name: name || '',
    note: note || ''
  };
  
  project.checkpoints.push(checkpoint);
  
  // Use store if available
  if (window.Petal?.store) {
    const state = window.Petal.store.getState();
    const updatedProjects = (state.projects || []).map(p => {
      if (projectIdsMatch(p.id, projectId)) {
        return { ...p, checkpoints: project.checkpoints };
      }
      return p;
    });
    updateStoreSafely({ projects: updatedProjects });
  }
  
  return true;
}

/**
 * Add file version internally (low-level helper)
 * @deprecated Use addFileVersion instead
 */
export function addFileVersionInternal(ctx, projectId, fileId, versionString, note) {
  const { projects } = ctx;
  const project = findProjectById(projects, projectId);
  if (!project || !project.files) return false;
  
  const file = project.files.find(f => f && f.id === fileId);
  if (!file) return false;
  
  if (!file.versions) {
    file.versions = [];
  }
  
  const version = {
    id: `v${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    at: new Date().toISOString(),
    version: versionString || `v${file.versions.length + 1}`,
    note: note || ''
  };
  
  file.versions.push(version);
  file.versionCurrent = version.version;
  
  // Use store if available
  if (window.Petal?.store) {
    const state = window.Petal.store.getState();
    const updatedProjects = (state.projects || []).map(p => {
      if (projectIdsMatch(p.id, projectId)) {
        return { ...p, files: project.files };
      }
      return p;
    });
    updateStoreSafely({ projects: updatedProjects });
  } else {
    // Fallback: update project directly (legacy)
    // Note: This won't persist without save() being called
  }
  
  return true;
}

/**
 * Add files to project from form container (non-modal)
 */
export async function addFileToProject(ctx, projId) {
  const { projects, getFileLinks, getFileLinksNormalized, save, render } = ctx || {};
  const projectList = Array.isArray(projects) ? projects : [];

  const p = findProjectById(projectList, projId);
  if (!p) return;

  const fileOps = window.Petal?.features?.fileOperations || {};
  const getFileLinksFn = typeof getFileLinks === 'function' ? getFileLinks : fileOps.getFileLinks;
  const getFileLinksNormalizedFn = typeof getFileLinksNormalized === 'function'
    ? getFileLinksNormalized
    : fileOps.getFileLinksNormalized;
  const files = window.electronAPI
    ? (getFileLinksNormalizedFn ? await getFileLinksNormalizedFn('proj-files-' + projId, 'p-' + projId) : [])
    : (getFileLinksFn ? getFileLinksFn('proj-files-' + projId, 'p-' + projId) : []);
  
  if (files.length === 0) {
    alert('Please add at least one file');
    return;
  }
  
  if (!p.files) p.files = [];
  p.files = [...p.files, ...files];
  
  // Use store if available
  if (window.Petal?.store) {
    const state = window.Petal.store.getState();
    const updatedProjects = (state.projects || []).map(proj => {
      if (projectIdsMatch(proj.id, projId)) {
        return { ...proj, files: p.files };
      }
      return proj;
    });
    updateStoreSafely({ projects: updatedProjects });
  } else {
    if (save) await save();
  }
  
  if (render) render();
  
  // Clear file container and update hint
  const container = document.getElementById('proj-files-'+projId);
  const hint = document.getElementById('file-hint-'+projId);
  if (container) container.innerHTML = '';
  if (hint) hint.style.display = 'none';
}

/**
 * Add subtask to project
 */
export async function addSubtask(ctx, projId) {
  const { projects, save, render } = ctx;
  const { LANE_STAGES } = await import('../domain/schema.js');
  
  const p = findProjectById(projects, projId);
  if (!p) return;
  
  const title = document.getElementById('sub-title-' + projId)?.value.trim();
  if (!title) {
    document.getElementById('sub-title-' + projId)?.focus();
    return;
  }
  
  const getSubFileLinksFn = ctx.getSubFileLinks || getSubFileLinks;
  const getSubFileLinksNormalizedFn = ctx.getSubFileLinksNormalized || getSubFileLinksNormalized;
  
  const files = window.electronAPI 
    ? (getSubFileLinksNormalizedFn ? await getSubFileLinksNormalizedFn(projId) : [])
    : (getSubFileLinksFn ? getSubFileLinksFn(projId) : []);
  
  const lane = document.getElementById('sub-lane-' + projId)?.value || '';
  const stage = lane && LANE_STAGES[lane] ? LANE_STAGES[lane][0] : null;

  const newSubtask = {
    id: Date.now(),
    title,
    priority: document.getElementById('sub-pri-' + projId)?.value || 'medium',
    due: document.getElementById('sub-due-' + projId)?.value || '',
    files,
    done: false,
    lane: lane || null,
    stage: stage || null
  };

  if (window.Petal?.store) {
    const state = window.Petal.store.getState();
    const updatedProjects = (state.projects || []).map(project => {
      if (!projectIdsMatch(project.id, projId)) return project;
      return { ...project, subtasks: [...(project.subtasks || []), newSubtask] };
    });
    updateStoreSafely({ projects: updatedProjects });
  } else {
    if (!p.subtasks) p.subtasks = [];
    p.subtasks.push(newSubtask);
    if (save) await save();
  }

  if (render) render();
  
  // Clear form
  const titleEl = document.getElementById('sub-title-' + projId);
  const dueEl = document.getElementById('sub-due-' + projId);
  const priEl = document.getElementById('sub-pri-' + projId);
  const laneEl = document.getElementById('sub-lane-' + projId);
  if (titleEl) titleEl.value = '';
  if (dueEl) dueEl.value = '';
  if (priEl) priEl.value = 'medium';
  if (laneEl) laneEl.value = '';
}

/**
 * Toggle subtask done status
 */
export async function toggleSubtask(ctx, projId, subId) {
  const { projects, save, render } = ctx;

  const p = findProjectById(projects, projId);
  if (!p) return;

  if (window.Petal?.store) {
    const state = window.Petal.store.getState();
    const updatedProjects = (state.projects || []).map(project => {
      if (!projectIdsMatch(project.id, projId)) return project;
      return {
        ...project,
        subtasks: (project.subtasks || []).map(s =>
          s.id === subId || String(s.id) === String(subId) ? { ...s, done: !s.done } : s
        )
      };
    });
    updateStoreSafely({ projects: updatedProjects });
  } else {
    const s = (p.subtasks || []).find(s => s.id === subId);
    if (s) s.done = !s.done;
    if (save) await save();
  }

  if (render) render();
}

/**
 * Get file links for subtask form
 */
export function getSubFileLinks(projId) {
  const c = document.getElementById('sub-files-' + projId);
  if (!c) return [];
  
  return [...c.querySelectorAll('.file-link-row')].map(r => {
    const id = r.dataset.id;
    return {
      name: document.getElementById('sfn-' + projId + '-' + id)?.value.trim(),
      url: document.getElementById('sfu-' + projId + '-' + id)?.value.trim()
    };
  }).filter(f => f.name && f.url);
}

/**
 * Get normalized file links for subtask form (Electron API)
 */
export async function getSubFileLinksNormalized(projId) {
  const links = getSubFileLinks(projId);
  
  if (!window.electronAPI) {
    // Return in legacy format if no Electron API
    return links.map(link => ({
      name: link.name || link.label,
      url: link.url || link.abs_path
    }));
  }
  
  // If links already have the new format (with abs_path, onedrive_rel, etc.), return as-is
  if (links.length > 0 && (links[0].abs_path || links[0].onedrive_rel)) {
    return links;
  }
  
  // Normalize file paths using Electron API
  const normalized = [];
  for (const link of links) {
    if (!link.url) continue;
    
    try {
      const normalizedPath = await window.electronAPI.normalizePath(link.url);
      normalized.push({
        name: link.name || 'File',
        abs_path: normalizedPath,
        onedrive_rel: normalizedPath, // Default to same path
        label: link.name || 'File'
      });
    } catch (error) {
      console.error('Error normalizing path:', link.url, error);
      // Fallback: use original URL
      normalized.push({
        name: link.name || 'File',
        abs_path: link.url,
        onedrive_rel: link.url,
        label: link.name || 'File'
      });
    }
  }
  
  return normalized;
}

/**
 * Save artifact notes
 */
export async function saveArtifactNotes(ctx, artifactId) {
  const { projects, save, renderArtifacts: renderArtifactsFn } = ctx;
  
  const selectedProjectId = typeof window.selectedProjectId !== 'undefined' ? window.selectedProjectId : null;
  if (!selectedProjectId) return;
  
  const project = findProjectById(projects, selectedProjectId);
  if (!project) return;
  
  const artifact = (project.artifacts || []).find(a => a.id === artifactId);
  if (!artifact) return;
  
  const notesEl = document.getElementById(`artifact-notes-${artifactId}`);
  if (!notesEl) return;
  
  const notesValue = notesEl.value;
  const now = Date.now();

  if (window.Petal?.store) {
    const state = window.Petal.store.getState();
    const updatedProjects = (state.projects || []).map(p => {
      if (!projectIdsMatch(p.id, selectedProjectId)) return p;
      return {
        ...p,
        artifacts: (p.artifacts || []).map(a =>
          a.id === artifactId ? { ...a, notes: notesValue, updatedAt: now } : a
        )
      };
    });
    updateStoreSafely({ projects: updatedProjects });
  } else {
    artifact.notes = notesValue;
    artifact.updatedAt = now;
    if (save) await save();
  }
  
  // Re-render artifacts if render function is available
  if (renderArtifactsFn) {
    renderArtifactsFn(ctx);
  } else if (window.Petal?.ui?.renderArtifacts) {
    window.Petal.ui.renderArtifacts(ctx);
  } else if (typeof window.renderArtifacts === 'function') {
    window.renderArtifacts();
  } else if (window.Petal?.ui?.renderArtifacts) {
    window.Petal.ui.renderArtifacts(ctx);
  }
}

/**
 * Open artifact detail modal
 */
export function openArtifactDetail(ctx, artifactId) {
  const { projects, tasks, esc: escFn, escAttr: escAttrFn, fileIcon: fileIconFn, selectedProjectId: selectedProjectIdValue, renderArtifacts: renderArtifactsFn } = ctx;
  
  const escFunction = escFn || esc;
  const escAttrFunction = escAttrFn || escAttr;
  const fileIconFunction = fileIconFn || fileIcon;
  const selectedProjectId = selectedProjectIdValue || (typeof window.selectedProjectId !== 'undefined' ? window.selectedProjectId : null);
  
  if (!selectedProjectId) return;
  
  const project = findProjectById(projects, selectedProjectId);
  if (!project) return;
  
  const artifact = (project.artifacts || []).find(a => a.id === artifactId);
  if (!artifact) return;
  
  const modal = document.getElementById('artifact-detail-modal');
  const content = document.getElementById('artifact-detail-content');
  if (!modal || !content) return;
  
  // Get files for this artifact
  const artifactFiles = ((project.files || []).filter(f => artifact.fileIds && artifact.fileIds.includes(f.id)));
  
  let html = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">`;
  html += `<h2 style="font-size:20px;font-weight:600;color:var(--text);margin:0;">${escFunction(artifact.name)}</h2>`;
  html += `<button type="button" data-action="artifact:close" style="padding:6px 12px;background:var(--bg2);border:1px solid var(--border);border-radius:6px;color:var(--text-dim);font-size:12px;cursor:pointer;">Close</button>`;
  html += `</div>`;
  
  // Description
  if (artifact.description) {
    html += `<div style="margin-bottom:20px;padding:12px;background:var(--bg2);border-radius:6px;">`;
    html += `<div style="font-size:12px;color:var(--text-dim);text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px;">Description</div>`;
    html += `<div style="font-size:13px;color:var(--text);line-height:1.6;">${escFunction(artifact.description)}</div>`;
    html += `</div>`;
  }
  
  // Files with version tracking
  html += `<div style="margin-bottom:20px;">`;
  html += `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">`;
  html += `<div style="font-size:13px;font-weight:600;color:var(--text);text-transform:uppercase;letter-spacing:.08em;">Files</div>`;
  html += `<button type="button" data-action="artifact:add-file" data-artifact-id="${escAttrFunction(String(artifactId))}" style="padding:4px 8px;background:var(--rose);color:white;border:none;border-radius:4px;font-size:11px;cursor:pointer;">+ Add File</button>`;
  html += `</div>`;
  
  if (artifactFiles.length === 0) {
    html += `<div style="text-align:center;padding:20px;color:var(--text-dim);font-size:12px;">No files yet. Add files to this artifact.</div>`;
  } else {
    html += `<div style="display:flex;flex-direction:column;gap:8px;">`;
    
    // Group files by version (current first)
    const currentFiles = artifactFiles.filter(f => f.isCurrent);
    const supersededFiles = artifactFiles.filter(f => !f.isCurrent);
    
    [...currentFiles, ...supersededFiles].forEach(file => {
      const fileLink = typeof file === 'string' ? { abs_path: file } : file;
      const label = file.label || file.name || 'File';
      const safeLink = escFunction(JSON.stringify(fileLink).replace(/'/g, "\\'"));
      const icon = fileIconFunction(fileLink.abs_path || fileLink.onedrive_rel || fileLink.share_url || '');
      
      html += `<div style="background:var(--bg2);border:1px solid var(--border);border-radius:6px;padding:12px;">`;
      html += `<div style="display:flex;align-items:flex-start;gap:12px;">`;
      html += `<span style="font-size:16px;flex-shrink:0;">${icon}</span>`;
      html += `<div style="flex:1;min-width:0;">`;
      html += `<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">`;
      html += `<div style="font-size:13px;font-weight:500;color:var(--text);">${escFunction(label)}</div>`;
      if (file.isCurrent) {
        html += `<span style="font-size:10px;padding:2px 6px;background:var(--sage-pale);color:var(--sage);border-radius:8px;">Current</span>`;
      } else {
        html += `<span style="font-size:10px;padding:2px 6px;background:var(--bg);color:var(--text-dim);border-radius:8px;">Superseded</span>`;
      }
      if (file.version) {
        html += `<span style="font-size:10px;color:var(--text-dim);">v${escFunction(file.version)}</span>`;
      }
      html += `</div>`;
      if (file.description) {
        html += `<div style="font-size:11px;color:var(--text-dim);margin-bottom:4px;">${escFunction(file.description)}</div>`;
      }
      if (file.whatChanged) {
        html += `<div style="font-size:11px;color:var(--text-dim);margin-bottom:2px;"><strong>Changed:</strong> ${escFunction(file.whatChanged)}</div>`;
      }
      html += `</div>`;
      html += `<div style="display:flex;flex-direction:column;gap:4px;flex-shrink:0;">`;
      html += `<button type="button" class="file-open-btn" data-action="file:open" data-path="${escAttrFunction(JSON.stringify(file))}" style="padding:4px 8px;background:var(--rose);color:white;border:none;border-radius:4px;font-size:10px;cursor:pointer;">Open</button>`;
      html += `<button type="button" data-action="artifact:edit-file-notes" data-file-id="${escAttrFunction(String(file.id))}" style="padding:4px 8px;background:var(--bg);border:1px solid var(--border);border-radius:4px;font-size:10px;cursor:pointer;color:var(--text-dim);">Notes</button>`;
      html += `</div>`;
      html += `</div></div>`;
    });
    
    html += `</div>`;
  }
  html += `</div>`;
  
  // Notes
  html += `<div style="margin-bottom:20px;">`;
  html += `<div style="font-size:13px;font-weight:600;color:var(--text);margin-bottom:8px;text-transform:uppercase;letter-spacing:.08em;">Notes</div>`;
  html += `<textarea id="artifact-notes-${artifactId}" style="width:100%;min-height:120px;padding:12px;font-size:12px;font-family:'Jost',sans-serif;border:1px solid var(--border);border-radius:6px;background:var(--bg2);color:var(--text);resize:vertical;" placeholder="Add notes about this artifact...">${escFunction(artifact.notes || '')}</textarea>`;
  html += `<button type="button" data-action="artifact:save-notes" data-artifact-id="${escAttrFunction(String(artifactId))}" style="margin-top:8px;padding:6px 12px;background:var(--rose);color:white;border:none;border-radius:6px;font-size:11px;cursor:pointer;">Save Notes</button>`;
  html += `</div>`;
  
  // Version History
  if (artifact.versionHistory && artifact.versionHistory.length > 0) {
    html += `<div style="margin-bottom:20px;">`;
    html += `<div style="font-size:13px;font-weight:600;color:var(--text);margin-bottom:8px;text-transform:uppercase;letter-spacing:.08em;">Version History</div>`;
    html += `<div style="display:flex;flex-direction:column;gap:8px;">`;
    artifact.versionHistory.forEach((version, idx) => {
      html += `<div style="padding:10px;background:var(--bg2);border:1px solid var(--border);border-radius:6px;">`;
      html += `<div style="font-size:12px;font-weight:500;color:var(--text);margin-bottom:4px;">${escFunction(version.version || `v${idx + 1}`)}</div>`;
      if (version.notes) {
        html += `<div style="font-size:11px;color:var(--text-dim);">${escFunction(version.notes)}</div>`;
      }
      if (version.date) {
        html += `<div style="font-size:10px;color:var(--text-light);margin-top:4px;">${new Date(version.date).toLocaleDateString()}</div>`;
      }
      html += `</div>`;
    });
    html += `</div></div>`;
  }
  
  content.innerHTML = html;
  modal.style.display = 'flex';
}

/**
 * Close artifact detail modal
 */
export function closeArtifactDetail() {
  const modal = document.getElementById('artifact-detail-modal');
  if (modal) modal.style.display = 'none';
}

/**
 * Create new artifact
 */
export async function openCreateArtifactModal(ctx) {
  const { projects, save, renderArtifacts: renderArtifactsFn, selectedProjectId: selectedProjectIdValue } = ctx;
  
  const selectedProjectId = selectedProjectIdValue || (typeof window.selectedProjectId !== 'undefined' ? window.selectedProjectId : null);
  
  const name = prompt('Artifact name (e.g., "Figure 2A", "GelPredict GUI", "Dataset v1"):');
  if (!name || !name.trim()) return;
  
  const type = prompt('Type (figure/dataset/build/protocol/manuscript):', 'figure') || 'figure';
  const description = prompt('Description (optional):') || '';
  
  if (!selectedProjectId) return;
  const project = findProjectById(projects, selectedProjectId);
  if (!project) return;
  
  if (!project.artifacts) project.artifacts = [];
  
  const newArtifact = {
    id: Date.now(),
    name: name.trim(),
    type: type.trim(),
    description: description.trim(),
    notes: '',
    fileIds: [],
    subtasks: [],
    versionHistory: [],
    status: 'draft',
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  
  project.artifacts.push(newArtifact);
  if (save) await save();
  
  if (renderArtifactsFn) {
    renderArtifactsFn(ctx);
  } else if (window.Petal?.ui?.renderArtifacts) {
    window.Petal.ui.renderArtifacts(ctx);
  } else if (typeof window.renderArtifacts === 'function') {
    window.renderArtifacts();
  } else if (window.Petal?.ui?.renderArtifacts) {
    window.Petal.ui.renderArtifacts(ctx);
  }
}

/**
 * Persist artifact file link via store
 */
function persistArtifactFileUpdate(projectId, artifactId, { fileId, newFile }) {
  const now = Date.now();
  const state = window.Petal.store.getState();
  const updatedProjects = (state.projects || []).map(p => {
    if (!projectIdsMatch(p.id, projectId)) return p;
    let files = [...(p.files || [])];
    if (newFile) {
      const existingIdx = files.findIndex(f => f.id === fileId);
      if (existingIdx === -1) {
        files.push(newFile);
      } else {
        files[existingIdx] = { ...files[existingIdx], ...newFile, id: fileId };
      }
    }
    return {
      ...p,
      files,
      artifacts: (p.artifacts || []).map(a => {
        if (a.id !== artifactId) return a;
        const fileIds = [...(a.fileIds || [])];
        if (!fileIds.includes(fileId)) fileIds.push(fileId);
        return { ...a, fileIds, updatedAt: now };
      })
    };
  });
  updateStoreSafely({ projects: updatedProjects });
}

/**
 * Add file to artifact
 */
export async function addFileToArtifact(ctx, artifactId) {
  const { projects, save, selectedProjectId: selectedProjectIdValue } = ctx;
  
  const selectedProjectId = selectedProjectIdValue || (typeof window.selectedProjectId !== 'undefined' ? window.selectedProjectId : null);
  if (!selectedProjectId) return;
  
  const project = findProjectById(projects, selectedProjectId);
  if (!project) return;
  
  const artifact = (project.artifacts || []).find(a => a.id === artifactId);
  if (!artifact) return;
  
  // Use file picker if in Electron, otherwise prompt for URL
  if (window.electronAPI && window.electronAPI.chooseFile) {
    try {
      const fileLink = await window.electronAPI.chooseFile();
      if (!fileLink) {
        return; // User cancelled
      }
      
      // Create file entry in project if it doesn't exist
      if (!project.files) project.files = [];
      
      // Check if file already exists in project
      const existingFile = project.files.find(f => {
        const fPath = typeof f === 'object' ? (f.abs_path || f.onedrive_rel || f.share_url) : f;
        const newPath = fileLink.abs_path || fileLink.onedrive_rel || fileLink.share_url || '';
        return fPath === newPath;
      });
      
      let fileId;
      let newFile = null;
      if (existingFile) {
        fileId = existingFile.id || Date.now();
      } else {
        fileId = Date.now();
        newFile = {
          id: fileId,
          label: fileLink.label || fileLink.name || 'File',
          abs_path: fileLink.abs_path || '',
          onedrive_rel: fileLink.onedrive_rel || '',
          share_url: fileLink.share_url || '',
          fileLink: fileLink,
          isCurrent: true,
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
      }

      if (window.Petal?.store) {
        persistArtifactFileUpdate(selectedProjectId, artifactId, { fileId, newFile });
      } else {
        if (newFile) {
          if (!project.files) project.files = [];
          project.files.push(newFile);
        } else if (!existingFile.id) {
          existingFile.id = fileId;
        }
        if (!artifact.fileIds) artifact.fileIds = [];
        if (!artifact.fileIds.includes(fileId)) {
          artifact.fileIds.push(fileId);
          artifact.updatedAt = Date.now();
        }
        if (save) await save();
      }
      
      // Refresh the modal
      if (window.Petal?.features?.projectOperations?.openArtifactDetail) {
        window.Petal.features.projectOperations.openArtifactDetail(ctx, artifactId);
      } else if (typeof window.openArtifactDetail === 'function') {
        window.openArtifactDetail(artifactId);
      }
    } catch (e) {
      console.error('File picker error:', e);
      alert('Could not open file picker: ' + e.message);
    }
  } else {
    // Fallback: prompt for URL
    const url = prompt('File URL or path:');
    if (!url || !url.trim()) return;
    
    const fileId = Date.now();
    const newFile = {
      id: fileId,
      label: url.split('/').pop() || 'File',
      abs_path: url.trim(),
      isCurrent: true,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    if (window.Petal?.store) {
      persistArtifactFileUpdate(selectedProjectId, artifactId, { fileId, newFile });
    } else {
      if (!project.files) project.files = [];
      project.files.push(newFile);
      if (!artifact.fileIds) artifact.fileIds = [];
      artifact.fileIds.push(fileId);
      artifact.updatedAt = Date.now();
      if (save) await save();
    }
    
    // Refresh the modal
    if (window.Petal?.features?.projectOperations?.openArtifactDetail) {
      window.Petal.features.projectOperations.openArtifactDetail(ctx, artifactId);
    } else if (typeof window.openArtifactDetail === 'function') {
      window.openArtifactDetail(artifactId);
    }
  }
}

/**
 * Add cell log entry (prompt-based)
 */
export async function openAddCellLogEntry(ctx) {
  const { projects, save, selectedProjectId: selectedProjectIdValue, renderCellLog: renderCellLogFn } = ctx;
  
  const selectedProjectId = selectedProjectIdValue || (typeof window.selectedProjectId !== 'undefined' ? window.selectedProjectId : null);
  if (!selectedProjectId) {
    alert('Please select a project first');
    return;
  }
  
  const project = findProjectById(projects, selectedProjectId);
  if (!project) return;
  
  const line = prompt('Cell line (e.g., MCF10A):');
  if (!line || !line.trim()) return;
  
  const passage = prompt('Passage number (optional):') || '';
  const seededDensity = prompt('Seeded density (optional, e.g., 50k):') || '';
  const location = prompt('Location (optional, e.g., T75 flask):') || '';
  const notes = prompt('Notes (optional):') || '';
  
  if (!project.cellLog) {
    project.cellLog = [];
  }
  
  project.cellLog.push({
    id: Date.now(),
    date: new Date().toISOString(),
    line: line.trim(),
    passage: passage.trim() || null,
    seededDensity: seededDensity.trim() || null,
    location: location.trim() || null,
    notes: notes.trim() || null
  });
  
  if (save) await save();
  
  if (renderCellLogFn) {
    renderCellLogFn(project);
  } else if (typeof window.renderCellLog === 'function') {
    window.renderCellLog(project);
  }
}

/**
 * Get available cell lines from settings and project cell logs
 */
function getAvailableCellLines(ctx) {
  const { settings, projects } = ctx;
  const cellLines = new Set();
  
  // Get from global cell log settings
  if (settings?.cellLog?.cellTypes) {
    settings.cellLog.cellTypes.forEach(type => cellLines.add(type));
  }
  
  // Get from all project cell logs
  if (projects) {
    projects.forEach(project => {
      if (project.cellLog && Array.isArray(project.cellLog)) {
        project.cellLog.forEach(entry => {
          if (entry.line) {
            cellLines.add(entry.line);
          }
        });
      }
    });
  }
  
  return Array.from(cellLines).sort();
}

/**
 * Open modal to link cell line to project
 */
export function openLinkCellLineModal(ctx, projectId) {
  const { projects, esc: escFn, escAttr: escAttrFn, renderProjectHeader: renderProjectHeaderFn } = ctx;
  const escFunction = escFn || esc;
  const escAttrFunction = escAttrFn || escAttr;
  
  const project = findProjectById(projects, projectId);
  if (!project) return;
  
  // Get available cell lines
  const availableCellLines = getAvailableCellLines(ctx);
  const linkedCellLines = Array.isArray(project.linkedCellLines) ? project.linkedCellLines : [];
  const unlinkedCellLines = availableCellLines.filter(line => !linkedCellLines.includes(line));
  
  // Create modal HTML
  const modal = document.getElementById('link-cell-line-modal');
  if (!modal) {
    // Create modal if it doesn't exist
    const modalEl = document.createElement('div');
    modalEl.id = 'link-cell-line-modal';
    modalEl.style.cssText = 'display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:10000;align-items:center;justify-content:center;';
    modalEl.innerHTML = `
      <div style="background:var(--bg);border:1px solid var(--border);border-radius:12px;padding:24px;max-width:500px;width:90%;max-height:80vh;overflow-y:auto;">
        <div id="link-cell-line-modal-content"></div>
      </div>
    `;
    document.body.appendChild(modalEl);
  }
  
  const modalContent = document.getElementById('link-cell-line-modal-content');
  if (!modalContent) return;
  
  let contentHTML = `
    <div style="margin-bottom:16px;">
      <h2 style="font-size:18px;font-weight:600;color:var(--text);margin:0 0 8px 0;">Link Cell Line to Project</h2>
      <p style="font-size:12px;color:var(--text-dim);margin:0;">Select a cell line to link to "${escFunction(project.name || 'Untitled Project')}"</p>
    </div>
  `;
  
  if (unlinkedCellLines.length > 0) {
    contentHTML += `
      <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:16px;">
        ${unlinkedCellLines.map(cellLine => `
          <button type="button" 
                  data-action="select-cell-line" 
                  data-project-id="${projectId}" 
                  data-cell-line="${escAttrFunction(cellLine)}"
                  style="padding:12px;background:var(--bg2);border:1px solid var(--border);border-radius:8px;text-align:left;font-size:13px;color:var(--text);cursor:pointer;transition:all 0.15s;"
                  onmouseover="this.style.background='var(--bg3)';this.style.borderColor='var(--rose)'"
                  onmouseout="this.style.background='var(--bg2)';this.style.borderColor='var(--border)'">
            ${escFunction(cellLine)}
          </button>
        `).join('')}
      </div>
    `;
  } else {
    contentHTML += `
      <div style="padding:20px;text-align:center;color:var(--text-dim);font-size:12px;">
        No available cell lines. Add cell lines in the Cell Log page first.
      </div>
    `;
  }
  
  // Add option to create new cell line
  contentHTML += `
    <div style="margin-top:16px;padding-top:16px;border-top:1px solid var(--border);">
      <label style="display:block;font-size:12px;color:var(--text-dim);margin-bottom:8px;">Or create new cell line:</label>
      <div style="display:flex;gap:8px;">
        <input type="text" 
               id="new-cell-line-input" 
               placeholder="Enter cell line name (e.g., MCF10A)"
               style="flex:1;padding:8px 12px;background:var(--bg2);border:1px solid var(--border);border-radius:6px;font-size:13px;color:var(--text);font-family:inherit;"
               onkeypress="if(event.key==='Enter'){const btn=document.getElementById('create-and-link-cell-line-btn');if(btn)btn.click();}">
        <button type="button" 
                id="create-and-link-cell-line-btn"
                data-action="create-and-link-cell-line" 
                data-project-id="${projectId}"
                style="padding:8px 16px;background:var(--rose);color:white;border:none;border-radius:6px;font-size:13px;cursor:pointer;font-weight:500;transition:all 0.15s;"
                onmouseover="this.style.background='var(--rose-dark)'"
                onmouseout="this.style.background='var(--rose)'">
          Create & Link
        </button>
      </div>
    </div>
  `;
  
  contentHTML += `
    <div style="margin-top:16px;display:flex;justify-content:flex-end;">
      <button type="button" 
              data-action="close-link-cell-line-modal"
              style="padding:8px 16px;background:var(--bg2);border:1px solid var(--border);border-radius:6px;font-size:13px;color:var(--text);cursor:pointer;transition:all 0.15s;"
              onmouseover="this.style.background='var(--bg3)'"
              onmouseout="this.style.background='var(--bg2)'">
        Cancel
      </button>
    </div>
  `;
  
  modalContent.innerHTML = contentHTML;
  modal.style.display = 'flex';
  
  // Focus on input if available
  const input = document.getElementById('new-cell-line-input');
  if (input) {
    setTimeout(() => input.focus(), 100);
  }
}

/**
 * Link cell line to project
 */
export async function linkCellLineToProject(ctx, projectId, cellLine) {
  const { projects, save, renderProjectHeader: renderProjectHeaderFn } = ctx;
  
  const project = findProjectById(projects, projectId);
  if (!project) return;
  
  if (!project.linkedCellLines) {
    project.linkedCellLines = [];
  }
  
  // Check if already linked
  if (project.linkedCellLines.includes(cellLine)) {
    return; // Already linked
  }
  
  project.linkedCellLines.push(cellLine);
  
  // Update store
  if (window.Petal?.store) {
    const state = window.Petal.store.getState();
    const updatedProjects = (state.projects || []).map(p => {
      if (projectIdsMatch(p.id, projectId)) {
        return { ...p, linkedCellLines: project.linkedCellLines };
      }
      return p;
    });
    updateStoreSafely({ projects: updatedProjects });
  } else {
    if (save) await save();
  }
  
  // Close modal
  const modal = document.getElementById('link-cell-line-modal');
  if (modal) {
    modal.style.display = 'none';
  }
  
  // Re-render project header
  if (renderProjectHeaderFn) {
    renderProjectHeaderFn(ctx, project);
  } else if (window.Petal?.ui?.renderProjectHeader) {
    window.Petal.ui.renderProjectHeader(ctx, project);
  }
  
  // Re-render if needed
  if (window.Petal?.handlers?.render) {
    window.Petal.handlers.render();
  }
}

/**
 * Unlink cell line from project
 */
export async function unlinkCellLineFromProject(ctx, projectId, cellLine) {
  const { projects, save, renderProjectHeader: renderProjectHeaderFn } = ctx;
  
  const project = findProjectById(projects, projectId);
  if (!project) return;
  
  if (!project.linkedCellLines) {
    project.linkedCellLines = [];
  }
  
  project.linkedCellLines = project.linkedCellLines.filter(line => line !== cellLine);
  
  // Update store
  if (window.Petal?.store) {
    const state = window.Petal.store.getState();
    const updatedProjects = (state.projects || []).map(p => {
      if (projectIdsMatch(p.id, projectId)) {
        return { ...p, linkedCellLines: project.linkedCellLines };
      }
      return p;
    });
    updateStoreSafely({ projects: updatedProjects });
  } else {
    if (save) await save();
  }
  
  // Re-render project header
  if (renderProjectHeaderFn) {
    renderProjectHeaderFn(ctx, project);
  } else if (window.Petal?.ui?.renderProjectHeader) {
    window.Petal.ui.renderProjectHeader(ctx, project);
  }
  
  // Re-render if needed
  if (window.Petal?.handlers?.render) {
    window.Petal.handlers.render();
  }
}

/**
 * Create new cell line and link it to project
 */
export async function createAndLinkCellLine(ctx, projectId) {
  const { settings, projects, save } = ctx;
  
  const input = document.getElementById('new-cell-line-input');
  if (!input) return;
  
  const cellLineName = input.value.trim();
  if (!cellLineName) {
    input.focus();
    return;
  }
  
  // Add to settings cell types if not already there
  if (settings && settings.cellLog) {
    if (!settings.cellLog.cellTypes) {
      settings.cellLog.cellTypes = [];
    }
    const exists = settings.cellLog.cellTypes.some(type => type.toLowerCase() === cellLineName.toLowerCase());
    if (!exists) {
      settings.cellLog.cellTypes.push(cellLineName);
      settings.cellLog.cellTypes.sort((a, b) => a.localeCompare(b));
      
      // Update store
      if (window.Petal?.store) {
        const state = window.Petal.store.getState();
        updateStoreSafely({ settings });
      } else {
        if (save) await save();
      }
    }
  }
  
  // Link to project
  await linkCellLineToProject(ctx, projectId, cellLineName);
  
  // Clear input
  input.value = '';
}

/**
 * Close link cell line modal
 */
export function closeLinkCellLineModal() {
  const modal = document.getElementById('link-cell-line-modal');
  if (modal) {
    modal.style.display = 'none';
  }
}

/**
 * Open protocol run detail modal
 */
export function openProtocolRunDetail(ctx, runId) {
  const { projects, tasks, esc: escFn, escAttr: escAttrFn, selectedProjectId: selectedProjectIdValue } = ctx;
  
  const escFunction = escFn || esc;
  const escAttrFunction = escAttrFn || escAttr;
  const selectedProjectId = selectedProjectIdValue || (typeof window.selectedProjectId !== 'undefined' ? window.selectedProjectId : null);
  
  if (!selectedProjectId) return;
  
  const project = findProjectById(projects, selectedProjectId);
  if (!project) return;
  
  const run = ((project.protocolRuns || []).find(r => r.id === runId));
  if (!run) return;
  
  const modal = document.getElementById('protocol-run-detail-modal');
  const content = document.getElementById('protocol-run-detail-content');
  if (!modal || !content) return;
  
  const startDate = run.startDate ? new Date(run.startDate) : null;
  const expectedEnd = run.expectedEndDate ? new Date(run.expectedEndDate) : null;
  const today = new Date();
  const daysElapsed = startDate ? Math.floor((today - startDate) / (1000 * 60 * 60 * 24)) + 1 : 0;
  const daysExpected = expectedEnd && startDate ? Math.floor((expectedEnd - startDate) / (1000 * 60 * 60 * 24)) : null;
  
  const linkedArtifact = run.linkedArtifactId 
    ? ((project.artifacts || []).find(a => a.id === run.linkedArtifactId))
    : null;
  
  // Get linked tasks
  const linkedTasks = ((run.subtasks || []).map(taskId => (tasks || []).find(t => t.id === taskId)).filter(t => t));
  
  let html = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">`;
  html += `<h2 style="font-size:20px;font-weight:600;color:var(--text);margin:0;">${escFunction(run.protocolName)}</h2>`;
  html += `<button type="button" data-action="protocol:close" style="padding:6px 12px;background:var(--bg2);border:1px solid var(--border);border-radius:6px;color:var(--text-dim);font-size:12px;cursor:pointer;">Close</button>`;
  html += `</div>`;
  
  // Status and timeline
  html += `<div style="margin-bottom:20px;padding:12px;background:var(--bg2);border-radius:6px;">`;
  html += `<div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">`;
  html += `<span style="font-size:10px;padding:3px 8px;background:${run.status === 'active' ? 'var(--sage-pale)' : run.status === 'paused' ? 'var(--bg)' : 'var(--bg)'};color:${run.status === 'active' ? 'var(--sage)' : 'var(--text-dim)'};border-radius:12px;text-transform:uppercase;letter-spacing:.08em;">${run.status}</span>`;
  if (daysExpected) {
    html += `<div style="font-size:13px;color:var(--text);">Day ${daysElapsed} of ${daysExpected}</div>`;
  } else if (daysElapsed > 0) {
    html += `<div style="font-size:13px;color:var(--text);">Day ${daysElapsed}</div>`;
  }
  html += `</div>`;
  if (startDate) {
    html += `<div style="font-size:12px;color:var(--text-dim);">Started: ${startDate.toLocaleDateString()}</div>`;
  }
  if (expectedEnd) {
    html += `<div style="font-size:12px;color:var(--text-dim);">Expected end: ${expectedEnd.toLocaleDateString()}</div>`;
  }
  html += `</div>`;
  
  // Linked artifact
  if (linkedArtifact) {
    html += `<div style="margin-bottom:20px;padding:12px;background:var(--bg2);border-radius:6px;">`;
    html += `<div style="font-size:12px;color:var(--text-dim);text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px;">Linked Artifact</div>`;
    html += `<button type="button" data-action="protocol:open-linked-artifact" data-artifact-id="${escAttrFunction(String(linkedArtifact.id))}" style="font-size:13px;color:var(--text);cursor:pointer;background:none;border:none;padding:0;text-align:left;">📦 ${escFunction(linkedArtifact.name)}</button>`;
    html += `</div>`;
  }
  
  // Daily log entries
  html += `<div style="margin-bottom:20px;">`;
  html += `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">`;
  html += `<div style="font-size:13px;font-weight:600;color:var(--text);text-transform:uppercase;letter-spacing:.08em;">Daily Log</div>`;
  html += `<button type="button" data-action="protocol:add-log-entry" data-run-id="${escAttrFunction(String(runId))}" style="padding:4px 8px;background:var(--rose);color:white;border:none;border-radius:4px;font-size:11px;cursor:pointer;">+ Add Entry</button>`;
  html += `</div>`;
  
  if (!run.dailyLog || run.dailyLog.length === 0) {
    html += `<div style="text-align:center;padding:20px;color:var(--text-dim);font-size:12px;">No log entries yet. Add your first entry to track progress.</div>`;
  } else {
    html += `<div style="display:flex;flex-direction:column;gap:8px;">`;
    run.dailyLog.forEach((entry, idx) => {
      const entryText = typeof entry === 'string' ? entry : entry.entry || '';
      const entryDate = typeof entry === 'object' && entry.date ? new Date(entry.date) : null;
      html += `<div style="padding:12px;background:var(--bg2);border:1px solid var(--border);border-radius:6px;">`;
      if (entryDate) {
        html += `<div style="font-size:10px;color:var(--text-light);margin-bottom:4px;">${entryDate.toLocaleDateString()}</div>`;
      }
      html += `<div style="font-size:12px;color:var(--text);line-height:1.6;">${escFunction(entryText)}</div>`;
      html += `</div>`;
    });
    html += `</div>`;
  }
  html += `</div>`;
  
  // Linked tasks
  if (linkedTasks.length > 0) {
    html += `<div style="margin-bottom:20px;">`;
    html += `<div style="font-size:13px;font-weight:600;color:var(--text);margin-bottom:8px;text-transform:uppercase;letter-spacing:.08em;">Linked Tasks</div>`;
    html += `<div style="display:flex;flex-direction:column;gap:6px;">`;
    linkedTasks.forEach(task => {
      html += `<div style="padding:8px;background:var(--bg2);border:1px solid var(--border);border-radius:6px;font-size:12px;color:var(--text);">`;
      html += `<span style="font-weight:500;">${escFunction(task.title)}</span>`;
      if (task.priority) {
        html += ` <span style="color:var(--text-dim);">(${task.priority})</span>`;
      }
      html += `</div>`;
    });
    html += `</div></div>`;
  }
  
  content.innerHTML = html;
  modal.style.display = 'flex';
}

/**
 * Close protocol run detail modal
 */
export function closeProtocolRunDetail() {
  const modal = document.getElementById('protocol-run-detail-modal');
  if (modal) modal.style.display = 'none';
}

/**
 * Create new protocol run
 */
export async function openCreateProtocolRunModal(ctx) {
  const { projects, save, renderProtocolRuns: renderProtocolRunsFn, selectedProjectId: selectedProjectIdValue } = ctx;
  
  const selectedProjectId = selectedProjectIdValue || (typeof window.selectedProjectId !== 'undefined' ? window.selectedProjectId : null);
  
  const protocolName = prompt('Protocol name (e.g., "dECM Digestion – Batch 4"):');
  if (!protocolName || !protocolName.trim()) return;
  
  const startDate = prompt('Start date (YYYY-MM-DD) or leave blank for today:', new Date().toISOString().split('T')[0]);
  const expectedEndDate = prompt('Expected end date (YYYY-MM-DD, optional):') || '';
  
  if (!selectedProjectId) return;
  const project = findProjectById(projects, selectedProjectId);
  if (!project) return;
  
  if (!project.protocolRuns) project.protocolRuns = [];
  
  const newRun = {
    id: Date.now(),
    protocolName: protocolName.trim(),
    startDate: startDate || new Date().toISOString().split('T')[0],
    expectedEndDate: expectedEndDate || '',
    status: 'active',
    linkedArtifactId: null,
    dailyLog: [],
    subtasks: [],
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  
  project.protocolRuns.push(newRun);
  if (save) await save();
  
  if (renderProtocolRunsFn) {
    renderProtocolRunsFn(ctx);
  } else if (window.Petal?.ui?.renderProtocolRuns) {
    window.Petal.ui.renderProtocolRuns(ctx);
  } else if (typeof window.renderProtocolRuns === 'function') {
    window.renderProtocolRuns();
  } else if (window.Petal?.ui?.renderProtocolRuns) {
    window.Petal.ui.renderProtocolRuns(ctx);
  }
}

/**
 * Add log entry to protocol run
 */
export async function addProtocolRunLogEntry(ctx, runId) {
  const { projects, save, selectedProjectId: selectedProjectIdValue } = ctx;
  
  const selectedProjectId = selectedProjectIdValue || (typeof window.selectedProjectId !== 'undefined' ? window.selectedProjectId : null);
  if (!selectedProjectId) return;
  
  const project = findProjectById(projects, selectedProjectId);
  if (!project) return;
  
  const run = ((project.protocolRuns || []).find(r => r.id === runId));
  if (!run) return;
  
  const entry = prompt('Daily log entry:');
  if (!entry || !entry.trim()) return;
  
  if (!run.dailyLog) run.dailyLog = [];
  run.dailyLog.push({
    entry: entry.trim(),
    date: new Date().toISOString()
  });
  
  run.updatedAt = Date.now();
  
  if (save) await save();
  
  // Refresh the modal
  if (window.Petal?.features?.projectOperations?.openProtocolRunDetail) {
    window.Petal.features.projectOperations.openProtocolRunDetail(ctx, runId);
  } else if (typeof window.openProtocolRunDetail === 'function') {
    window.openProtocolRunDetail(runId);
  }
}

/**
 * Edit file notes (description, whatChanged, whyExists)
 */
export async function editFileNotes(ctx, fileId) {
  const { projects, save, selectedProjectId: selectedProjectIdValue } = ctx;
  
  const selectedProjectId = selectedProjectIdValue || (typeof window.selectedProjectId !== 'undefined' ? window.selectedProjectId : null);
  if (!selectedProjectId) return;
  
  const project = findProjectById(projects, selectedProjectId);
  if (!project) return;
  
  const file = (project.files || []).find(f => f.id === fileId);
  if (!file) return;
  
  const description = prompt('File description:', file.description || '');
  if (description === null) return;
  
  const whatChanged = prompt('What changed in this version?', file.whatChanged || '');
  if (whatChanged === null) return;
  
  const whyExists = prompt('Why does this file exist?', file.whyExists || '');
  if (whyExists === null) return;
  
  file.description = description;
  file.whatChanged = whatChanged;
  file.whyExists = whyExists;
  file.updatedAt = Date.now();
  
  if (save) await save();
  
  // Refresh artifact detail if open
  const modal = document.getElementById('artifact-detail-modal');
  if (modal && modal.style.display !== 'none') {
    // Find which artifact this file belongs to
    const artifact = (project.artifacts || []).find(a => a.fileIds && a.fileIds.includes(fileId));
    if (artifact) {
      if (window.Petal?.features?.projectOperations?.openArtifactDetail) {
        window.Petal.features.projectOperations.openArtifactDetail(ctx, artifact.id);
      } else if (typeof window.openArtifactDetail === 'function') {
        window.openArtifactDetail(artifact.id);
      }
    }
  }
}

/**
 * Toggle done tasks visibility
 */
export function toggleDoneTasks() {
  const list = document.getElementById('done-tasks-list');
  const toggle = document.getElementById('done-tasks-toggle');
  if (!list || !toggle) return;
  
  // Get current state from element or use default
  const isExpanded = list.style.display !== 'none';
  const newState = !isExpanded;
  
  list.style.display = newState ? 'block' : 'none';
  toggle.textContent = newState ? '▲' : '▼';
}

/**
 * Add working log entry to project
 */
export async function addWorkingLogEntry(ctx) {
  const { projects, save, renderWorkingLog, selectedProjectId: selectedProjectIdValue } = ctx;
  
  const selectedProjectId = selectedProjectIdValue || (typeof window.selectedProjectId !== 'undefined' ? window.selectedProjectId : null);
  if (!selectedProjectId) return;
  
  const project = findProjectById(projects, selectedProjectId);
  if (!project) return;
  
  const text = prompt('What did you finish?');
  if (!text || !text.trim()) return;
  
  if (!project.workingLog) {
    project.workingLog = [];
  }
  
  project.workingLog.push({
    id: Date.now(),
    at: new Date().toISOString(),
    text: text.trim(),
    fileIds: []
  });
  
  // Update store if available
  if (window.Petal?.store) {
    const state = window.Petal.store.getState();
    const updatedProjects = (state.projects || []).map(p => 
      projectIdsMatch(p.id, selectedProjectId) ? project : p
    );
    window.Petal.store.setState({ projects: updatedProjects });
  } else {
    // Fallback
    if (save) await save();
  }
  
  if (renderWorkingLog) {
    renderWorkingLog(ctx, project);
  } else if (window.Petal?.ui?.renderWorkingLog) {
    window.Petal.ui.renderWorkingLog(ctx, project);
  } else if (typeof window.renderWorkingLog === 'function') {
    window.renderWorkingLog(ctx, project);
  }
}

/**
 * Select project color
 */
export function selectColor(ctx, n, el) {
  const { selectedColor: selectedColorValue } = ctx;
  
  // Update global selectedColor if available
  if (typeof window.selectedColor !== 'undefined') {
    window.selectedColor = n;
  }
  
  // Update UI
  document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
  if (el) el.classList.add('selected');
}

/**
 * Add task to project (inline form)
 */
export async function addTaskToProject(ctx, projId) {
  const { projects, tasks, save, render, normalizeProjectIdValue: normalizeProjectIdValueFn, selectedProjectId: selectedProjectIdValue } = ctx;
  
  const normalizeProjectIdValueFunction = normalizeProjectIdValueFn || ((value) => {
    if (window.Petal?.utils?.normalizeProjectIdValue) {
      return window.Petal.utils.normalizeProjectIdValue(value);
    }
    return value ? parseInt(value) : null;
  });
  
  const normalizedProjId = normalizeProjectIdValueFunction(projId);
  const p = findProjectById(projects, normalizedProjId);
  if (!p) return;
  
  const title = document.getElementById('proj-task-title-' + projId)?.value.trim();
  if (!title) {
    document.getElementById('proj-task-title-' + projId)?.focus();
    return;
  }
  
  const priority = document.getElementById('proj-task-pri-' + projId)?.value || 'medium';
  const due = document.getElementById('proj-task-due-' + projId)?.value || '';
  const lane = document.getElementById('proj-task-lane-' + projId)?.value || '';
  
  // Determine stage based on lane
  let stage = 'planned';
  if (lane && LANE_STAGES[lane]) {
    stage = LANE_STAGES[lane][0];
  }
  
  const newTask = {
    id: Date.now(),
    title,
    notes: '',
    priority,
    due,
    fileIds: [], // NEW: Use canonical registry
    files: [], // Keep for backward compatibility
    done: false,
    status: 'Todo',
    lane: lane || null,
    stage: stage,
    projectId: normalizedProjId,
    subtasks: []
  };
  
  // Phase 2: Immutable update through store
  if (window.Petal?.store) {
    const state = window.Petal.store.getState();
    window.Petal.store.setState({
      tasks: [newTask, ...(state.tasks || [])]
    });
  } else {
    // Fallback for backward compatibility
    if (tasks) {
      tasks.unshift(newTask);
    }
    if (save) await save();
  }
  
  if (render) {
    render();
  } else if (typeof window.render === 'function') {
    window.render();
  }
  
  // Clear form
  const titleInput = document.getElementById('proj-task-title-' + projId);
  const priInput = document.getElementById('proj-task-pri-' + projId);
  const dueInput = document.getElementById('proj-task-due-' + projId);
  const laneInput = document.getElementById('proj-task-lane-' + projId);
  
  if (titleInput) titleInput.value = '';
  if (priInput) priInput.value = 'medium';
  if (dueInput) dueInput.value = '';
  if (laneInput) laneInput.value = '';
}

/**
 * Add a cell line to a project (dropdown-based)
 */
export async function addCellLineToProject(projectId) {
  const state = window.Petal?.store?.getState();
  if (!state) return;
  
  const project = findProjectById(state.projects, projectId);
  if (!project) return;
  
  const selectEl = document.getElementById('cell-line-link-select');
  if (!selectEl) return;
  
  const cellLine = selectEl.value.trim();
  if (!cellLine) return;
  
  const linkedCellLines = Array.isArray(project.linkedCellLines) ? project.linkedCellLines : [];
  
  // Check if already linked
  if (linkedCellLines.includes(cellLine)) {
    selectEl.value = '';
    return;
  }
  
  // Add cell line
  const updatedProjects = (state.projects || []).map(p => {
    if (projectIdsMatch(p.id, projectId)) {
      return {
        ...p,
        linkedCellLines: [...linkedCellLines, cellLine]
      };
    }
    return p;
  });
  
  updateStoreSafely({ projects: updatedProjects });
  
  // Clear select
  selectEl.value = '';
  
  // Re-render cell log view
  const updatedProject = findProjectById(updatedProjects, projectId);
  if (updatedProject) {
    const updatedState = window.Petal?.store?.getState();
    const ctx = {
      esc: window.Petal?.utils?.strings?.esc || ((s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;')),
      projects: updatedState?.projects || []
    };
    
    // Import and call renderCellLog
    import('../ui/renderProjectViews.js').then(module => {
      if (module.renderCellLog) {
        module.renderCellLog(ctx, updatedProject);
      }
    }).catch(() => {
      // Fallback
      if (typeof window.renderCellLog === 'function') {
        window.renderCellLog(updatedProject);
      }
    });
  }
}

/**
 * Remove a cell line from a project (dropdown-based)
 */
export async function removeCellLineFromProject(projectId, cellLineStr) {
  const state = window.Petal?.store?.getState();
  if (!state) return;
  
  // Parse cellLineStr if it's a JSON string
  let cellLine = cellLineStr;
  try {
    if (typeof cellLineStr === 'string' && cellLineStr.startsWith('"')) {
      cellLine = JSON.parse(cellLineStr);
    }
  } catch (e) {
    // If parsing fails, use as-is
    cellLine = cellLineStr;
  }
  
  const project = findProjectById(state.projects, projectId);
  if (!project) return;
  
  const linkedCellLines = Array.isArray(project.linkedCellLines) ? project.linkedCellLines : [];
  const updatedLinkedCellLines = linkedCellLines.filter(line => line !== cellLine);
  
  const updatedProjects = (state.projects || []).map(p => {
    if (projectIdsMatch(p.id, projectId)) {
      return {
        ...p,
        linkedCellLines: updatedLinkedCellLines
      };
    }
    return p;
  });
  
  updateStoreSafely({ projects: updatedProjects });
  
  // Re-render cell log view
  const updatedProject = findProjectById(updatedProjects, projectId);
  if (updatedProject) {
    const updatedState = window.Petal?.store?.getState();
    const ctx = {
      esc: window.Petal?.utils?.strings?.esc || ((s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;')),
      projects: updatedState?.projects || []
    };
    
    // Import and call renderCellLog
    import('../ui/renderProjectViews.js').then(module => {
      if (module.renderCellLog) {
        module.renderCellLog(ctx, updatedProject);
      }
    }).catch(() => {
      // Fallback
      if (typeof window.renderCellLog === 'function') {
        window.renderCellLog(updatedProject);
      }
    });
  }
}
