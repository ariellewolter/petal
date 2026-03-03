// ═══════════════════════ FILE-PROJECT OPERATIONS ═══════════════════════
// Operations for integrating files and projects (quick actions, navigation, sync)

/**
 * View a project from file badge click
 * @param {number|string} projectId - Project ID
 * @param {Object} ctx - Context
 */
export function viewProjectFromFile(projectId, ctx) {
  if (!projectId || !ctx) return;
  
  // Open project view
  if (window.Petal?.features?.matrixOperations?.openProjectView) {
    window.Petal.features.matrixOperations.openProjectView(ctx, projectId);
  } else if (window.openProjectView) {
    window.openProjectView(projectId);
  }
  
  if (window.__DEBUG__) {
    console.log('📁 Viewing project from file:', { projectId });
  }
}

/**
 * View all projects linked to a file
 * @param {string} fileKey - File key
 * @param {Object} ctx - Context
 */
export function viewFileProjects(fileKey, ctx) {
  if (!fileKey || !ctx) return;
  
  const { projects } = ctx;
  const state = window.Petal?.store?.getState() || {};
  const fileRegistry = state.fileRegistry || {};
  
  // Find file in registry
  const file = fileRegistry[fileKey];
  if (!file) {
    alert('File not found');
    return;
  }
  
  // Get linked projects
  const linkedProjects = (file.projects || []).map(p => {
    const projectId = typeof p === 'object' ? (p.id || p.projectId) : p;
    if (!projectId) return null;
    return projects.find(pp => String(pp.id) === String(projectId));
  }).filter(Boolean);
  
  if (linkedProjects.length === 0) {
    alert('No projects linked to this file');
    return;
  }
  
  // If only one project, open it directly
  if (linkedProjects.length === 1) {
    viewProjectFromFile(linkedProjects[0].id, ctx);
    return;
  }
  
  // Multiple projects - navigate to projects page
  if (window.Petal?.store) {
    window.Petal.store.setState({ currentPage: 'projects' });
  }
  
  if (window.Petal?.router?.switchView) {
    window.Petal.router.switchView('projects');
  } else if (window.switchView) {
    window.switchView('projects');
  }
  
  if (window.__DEBUG__) {
    console.log('📁 Viewing projects for file:', { fileKey, projectCount: linkedProjects.length });
  }
}

/**
 * Add a file to a project
 * @param {Object} fileLink - File link object
 * @param {string} fileKey - File key
 * @param {Object} ctx - Context
 */
export async function addFileToProject(fileLink, fileKey, ctx) {
  if (!fileLink || !fileKey || !ctx) return;
  
  const { projects, save } = ctx;
  
  // Show project selection dialog
  if (projects.length === 0) {
    alert('No projects available. Please create a project first.');
    return;
  }
  
  // Simple prompt for now (could be enhanced with a modal)
  const projectNames = projects.filter(p => !p.done).map(p => p.name).join('\n');
  const projectName = prompt(`Select a project to add this file to:\n\n${projectNames}\n\nEnter project name:`);
  
  if (!projectName) return;
  
  // Find project by name
  const project = projects.find(p => p.name === projectName && !p.done);
  if (!project) {
    alert('Project not found');
    return;
  }
  
  // Add file to project
  if (!project.files) {
    project.files = [];
  }
  
  // Check if file already exists
  const fileExists = project.files.some(f => {
    const fKey = typeof f === 'string' ? f : (f.abs_path || f.onedrive_rel || f.share_url || f.key);
    return fKey === fileKey;
  });
  
  if (fileExists) {
    alert('File is already linked to this project');
    return;
  }
  
  // Add file
  project.files.push(fileLink);
  
  // Update file registry
  if (window.Petal?.features?.fileManagement?.buildFileRegistry) {
    const state = window.Petal.store.getState();
    const result = window.Petal.features.fileManagement.buildFileRegistry({
      tasks: state.tasks || [],
      projects: projects,
      fileRegistry: state.fileRegistry || {},
      fileHistory: state.fileHistory || {},
      files: state.files || [],
    }, { commit: true });
  }
  
  await save();
  
  // Rerender
  if (window.Petal?.pages?.FilesPage?.render) {
    const state = window.Petal.store.getState();
    const containerEl = document.getElementById('view-files');
    if (containerEl) {
      window.Petal.pages.FilesPage.render(containerEl, state, window.Petal.handlers);
    }
  }
  
  if (window.Petal?.pages?.ProjectsPage?.render) {
    const state = window.Petal.store.getState();
    const containerEl = document.getElementById('view-projects');
    if (containerEl) {
      window.Petal.pages.ProjectsPage.render(containerEl, state, window.Petal.handlers);
    }
  }
  
  if (window.__DEBUG__) {
    console.log('✅ File added to project:', { fileKey, projectId: project.id });
  }
}
