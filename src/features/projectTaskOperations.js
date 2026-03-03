// ═══════════════════════ PROJECT-TASK OPERATIONS ═══════════════════════
// Operations for integrating projects and tasks (quick actions, navigation, sync)

/**
 * View all tasks for a project
 * @param {number|string} projectId - Project ID
 * @param {Object} ctx - Context
 */
export function viewProjectTasks(projectId, ctx) {
  if (!projectId || !ctx) return;
  
  // Navigate to tasks page and filter by project
  if (window.Petal?.store) {
    window.Petal.store.setState({ 
      currentPage: 'tasks',
      boardProjectFilter: String(projectId)
    });
  }
  
  // Navigate to tasks page
  if (window.Petal?.router?.switchView) {
    window.Petal.router.switchView('tasks');
  } else if (window.switchView) {
    window.switchView('tasks');
  }
  
  // Render tasks page
  if (window.Petal?.pages?.TasksPage?.render) {
    const state = window.Petal.store.getState();
    const containerEl = document.getElementById('view-tasks');
    if (containerEl) {
      window.Petal.pages.TasksPage.render(containerEl, state, window.Petal.handlers);
    }
  }
  
  if (window.__DEBUG__) {
    console.log('📋 Viewing project tasks:', { projectId });
  }
}

/**
 * Create a task for a project
 * @param {number|string} projectId - Project ID
 * @param {Object} ctx - Context
 */
export function createTaskForProject(projectId, ctx) {
  if (!projectId || !ctx) return;
  
  // Open add task modal for project
  if (window.Petal?.features?.modalOperations?.openProjectAddTaskModal) {
    window.Petal.features.modalOperations.openProjectAddTaskModal(ctx, projectId);
  } else if (window.openProjectAddTaskModal) {
    window.openProjectAddTaskModal(projectId);
  }
  
  if (window.__DEBUG__) {
    console.log('➕ Creating task for project:', { projectId });
  }
}

/**
 * Sync project completion based on tasks
 * @param {number|string} projectId - Project ID
 * @param {Object} ctx - Context
 */
export async function syncProjectCompletion(projectId, ctx) {
  if (!projectId || !ctx) return;
  
  const { tasks, projects, save } = ctx;
  const project = projects.find(p => String(p.id) === String(projectId));
  if (!project) return;
  
  // Get all tasks for this project
  const allTasks = [...(tasks || []), ...(project.subtasks || [])];
  const projectTasks = allTasks.filter(t => String(t.projectId) === String(projectId));
  
  if (projectTasks.length === 0) return;
  
  // Check if all tasks are done
  const allDone = projectTasks.every(t => t.done);
  
  // Update project done status
  if (project.done !== allDone) {
    project.done = allDone;
    
    // Update in store
    if (window.Petal?.store) {
      const state = window.Petal.store.getState();
      const updatedProjects = state.projects.map(p => 
        String(p.id) === String(projectId) ? project : p
      );
      window.Petal.store.setState({ projects: updatedProjects });
    }
    
    await save();
    
    // Rerender projects page
    if (window.Petal?.pages?.ProjectsPage?.render) {
      const state = window.Petal.store.getState();
      const containerEl = document.getElementById('view-projects');
      if (containerEl) {
        window.Petal.pages.ProjectsPage.render(containerEl, state, window.Petal.handlers);
      }
    }
    
    if (window.__DEBUG__) {
      console.log('✅ Project completion synced:', { projectId, done: allDone });
    }
  }
}

/**
 * Calculate project progress based on tasks
 * @param {Object} project - Project object
 * @param {Array} tasks - All tasks
 * @returns {Object} Progress info { done, total, percentage }
 */
export function calculateProjectProgress(project, tasks) {
  if (!project || !tasks) return { done: 0, total: 0, percentage: 0 };
  
  const allTasks = [...(tasks || []), ...(project.subtasks || [])];
  const projectTasks = allTasks.filter(t => String(t.projectId) === String(project.id));
  
  const total = projectTasks.length;
  const done = projectTasks.filter(t => t.done).length;
  const percentage = total > 0 ? Math.round((done / total) * 100) : 0;
  
  return { done, total, percentage };
}
