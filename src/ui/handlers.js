// ═══════════════════════ UI HANDLERS ═══════════════════════
// All event handlers - single integration point
// Handlers call appStore.setState(), never directly mutate or save

import { appStore } from '../state/store.js';
import { createDefaultTask, createDefaultProject } from '../domain/schema.js';

/**
 * Task handlers
 */
export const taskHandlers = {
  async addTask(taskData) {
    const state = appStore.getState();
    const newTask = {
      ...createDefaultTask(),
      ...taskData,
      id: Date.now()
    };
    appStore.setState({ tasks: [...state.tasks, newTask] });
  },
  
  async updateTask(taskId, updates) {
    const state = appStore.getState();
    const tasks = state.tasks.map(t => 
      t.id === taskId ? { ...t, ...updates } : t
    );
    appStore.setState({ tasks });
  },
  
  async deleteTask(taskId) {
    const state = appStore.getState();
    appStore.setState({ tasks: state.tasks.filter(t => t.id !== taskId) });
  },
  
  async toggleTask(taskId) {
    const state = appStore.getState();
    const tasks = state.tasks.map(t => 
      t.id === taskId ? { ...t, done: !t.done } : t
    );
    appStore.setState({ tasks });
  },
  
  async updateTaskLane(taskId, lane) {
    const state = appStore.getState();
    const tasks = state.tasks.map(t => {
      if (t.id === taskId) {
        return { ...t, lane: lane || null };
      }
      return t;
    });
    appStore.setState({ tasks });
  },
  
  async updateTaskStage(taskId, lane, stage) {
    const state = appStore.getState();
    const tasks = state.tasks.map(t => {
      if (t.id === taskId) {
        return { ...t, lane, stage };
      }
      return t;
    });
    appStore.setState({ tasks });
  }
};

/**
 * Project handlers
 */
export const projectHandlers = {
  async addProject(projectData) {
    const state = appStore.getState();
    const newProject = {
      ...createDefaultProject(),
      ...projectData,
      id: Date.now()
    };
    appStore.setState({ projects: [newProject, ...state.projects] });
  },
  
  async updateProject(projectId, updates) {
    const state = appStore.getState();
    const projects = state.projects.map(p => 
      p.id === projectId ? { ...p, ...updates } : p
    );
    appStore.setState({ projects });
  },
  
  async deleteProject(projectId) {
    const state = appStore.getState();
    // Remove project and clear projectId from tasks
    const projects = state.projects.filter(p => p.id !== projectId);
    const tasks = state.tasks.map(t => 
      String(t.projectId || '') === String(projectId) 
        ? { ...t, projectId: '' } 
        : t
    );
    const openProjects = new Set(state.openProjects);
    openProjects.delete(projectId);
    appStore.setState({ projects, tasks, openProjects });
  },
  
  async toggleProjectDone(projectId) {
    const state = appStore.getState();
    const projects = state.projects.map(p => 
      p.id === projectId ? { ...p, done: !p.done } : p
    );
    appStore.setState({ projects });
  },
  
  async toggleProjectOpen(projectId) {
    const state = appStore.getState();
    const openProjects = new Set(state.openProjects);
    if (openProjects.has(projectId)) {
      openProjects.delete(projectId);
    } else {
      openProjects.add(projectId);
    }
    appStore.setState({ openProjects });
  },
  
  async addSubtask(projectId, subtaskData) {
    const state = appStore.getState();
    const projects = state.projects.map(p => {
      if (p.id === projectId) {
        const subtasks = p.subtasks || [];
        return {
          ...p,
          subtasks: [...subtasks, {
            id: Date.now(),
            ...subtaskData,
            done: false
          }]
        };
      }
      return p;
    });
    appStore.setState({ projects });
  },
  
  async toggleSubtask(projectId, subtaskId) {
    const state = appStore.getState();
    const projects = state.projects.map(p => {
      if (p.id === projectId) {
        const subtasks = (p.subtasks || []).map(s =>
          s.id === subtaskId ? { ...s, done: !s.done } : s
        );
        return { ...p, subtasks };
      }
      return p;
    });
    appStore.setState({ projects });
  },
  
  async deleteSubtask(projectId, subtaskId) {
    const state = appStore.getState();
    const projects = state.projects.map(p => {
      if (p.id === projectId) {
        const subtasks = (p.subtasks || []).filter(s => s.id !== subtaskId);
        return { ...p, subtasks };
      }
      return p;
    });
    appStore.setState({ projects });
  }
};

/**
 * UI state handlers
 */
export const uiHandlers = {
  setCurrentView(view) {
    appStore.setState({ currentView: view });
  },
  
  setCurrentSort(sort) {
    appStore.setState({ currentSort: sort });
  },
  
  setCurrentFilter(filter) {
    appStore.setState({ currentFilter: filter });
  },
  
  setProjFilter(filter) {
    appStore.setState({ currentProjFilter: filter });
  },
  
  setTaskMode(mode) {
    appStore.setState({ taskMode: mode });
  },
  
  setBoardProjectFilter(projectId) {
    appStore.setState({ boardProjectFilter: projectId });
  },
  
  setSearchQuery(query) {
    appStore.setState({ searchQuery: query });
  },
  
  setSelectedProjectId(projectId) {
    appStore.setState({ selectedProjectId: projectId });
  },
  
  setSelectedColor(color) {
    appStore.setState({ selectedColor: color });
  }
};

/**
 * Combined handlers object for easy access
 */
export const handlers = {
  ...taskHandlers,
  ...projectHandlers,
  ...uiHandlers
};
