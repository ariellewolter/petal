// ═══════════════════════ UI HANDLERS ═══════════════════════
// All event handlers - single integration point
// Handlers call appStore.setState(), never directly mutate or save

import { appStore } from '../state/store.js';
import { createDefaultTask, createDefaultProject } from '../domain/schema.js';
import * as workflowOps from '../features/workflow/workflowOperations.js';

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
    // Phase 3 Fix: openProjects is Array, not Set
    const openProjects = Array.isArray(state.openProjects) 
      ? state.openProjects.filter(id => id !== projectId)
      : [];
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
    // Phase 3 Fix: openProjects is Array, not Set
    const open = Array.isArray(state.openProjects) ? state.openProjects : [];
    const next = open.includes(projectId)
      ? open.filter(id => id !== projectId)
      : [...open, projectId];
    appStore.setState({ openProjects: next });
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
  
  /**
   * Set sort (legacy wrapper for inline onclick handlers)
   * Updates UI state and triggers render
   */
  setSort(s, btn) {
    const state = appStore.getState();
    appStore.setState({ currentSort: s });
    
    // Update UI
    document.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    
    // Trigger render
    if (typeof window.render === 'function') {
      window.render();
    }
  },
  
  /**
   * Set filter (legacy wrapper for inline onclick handlers)
   * Updates UI state and triggers render
   */
  setFilter(f, btn) {
    const state = appStore.getState();
    appStore.setState({ currentFilter: f });
    
    // Update UI
    document.querySelectorAll('.filter-chip').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    
    // Trigger render
    if (typeof window.render === 'function') {
      window.render();
    }
  },
  
  /**
   * Set project filter (legacy wrapper for inline onclick handlers)
   * Updates UI state and triggers render
   */
  setProjFilterLegacy(f, btn) {
    const state = appStore.getState();
    appStore.setState({ currentProjFilter: f });
    
    // Update UI
    document.querySelectorAll('#view-projects .filter-chip').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    
    // Trigger render
    if (typeof window.render === 'function') {
      window.render();
    }
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
 * Planner handlers
 */
export const plannerHandlers = {
  setPlannerViewDate(date) {
    appStore.setState({ plannerViewDate: date instanceof Date ? date : new Date(date) });
  },
  
  setCurrentPlannerView(view) {
    appStore.setState({ currentPlannerView: view });
  },
  
  setPlannerWeekOffset(offset) {
    appStore.setState({ plannerWeekOffset: offset });
  },
  
  setPlannerCalYear(year) {
    appStore.setState({ plannerCalYear: year });
  },
  
  setPlannerCalMonth(month) {
    appStore.setState({ plannerCalMonth: month });
  },
  
  setPlannerView(view, containerEl) {
    const state = appStore.getState();
    appStore.setState({ currentPlannerView: view });
    
    // Update view switcher buttons if container provided
    if (containerEl) {
      const dayBtn = containerEl.querySelector('#planner-vbtn-day');
      const weekBtn = containerEl.querySelector('#planner-vbtn-week');
      if (dayBtn && weekBtn) {
        dayBtn.classList.toggle('active', view === 'daily');
        weekBtn.classList.toggle('active', view === 'weekly');
      }
      
      // Show/hide views
      const dayView = containerEl.querySelector('#planner-view-day');
      const weekView = containerEl.querySelector('#planner-view-week');
      if (dayView) dayView.style.display = view === 'daily' ? 'flex' : 'none';
      if (weekView) weekView.style.display = view === 'weekly' ? 'flex' : 'none';
    }
    
    // Trigger re-render via router
    if (window.routerSwitchView) {
      window.routerSwitchView('planner');
    }
  },
  
  navigatePlannerDate(direction) {
    const state = appStore.getState();
    const currentView = state.currentPlannerView || 'daily';
    let newDate = new Date(state.plannerViewDate || new Date());
    
    if (currentView === 'daily') {
      newDate.setDate(newDate.getDate() + direction);
      appStore.setState({ plannerViewDate: newDate });
    } else {
      const offset = (state.plannerWeekOffset || 0) + direction;
      appStore.setState({ plannerWeekOffset: offset });
      // Recalculate plannerViewDate based on week offset
      const today = new Date();
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      const weekDate = new Date(startOfWeek);
      weekDate.setDate(startOfWeek.getDate() + offset * 7);
      appStore.setState({ plannerViewDate: weekDate });
    }
    
    // Trigger re-render
    if (window.routerSwitchView) {
      window.routerSwitchView('planner');
    }
  },
  
  navigatePlannerCalendar(direction) {
    const state = appStore.getState();
    let year = state.plannerCalYear || new Date().getFullYear();
    let month = state.plannerCalMonth !== null ? state.plannerCalMonth : new Date().getMonth();
    
    month += direction;
    if (month > 11) {
      month = 0;
      year++;
    } else if (month < 0) {
      month = 11;
      year--;
    }
    
    appStore.setState({ plannerCalYear: year, plannerCalMonth: month });
    
    // Rebuild calendar after navigation
    setTimeout(() => {
      if (typeof window.buildPlannerCalendar === 'function') {
        window.buildPlannerCalendar();
      }
    }, 0);
  },
  
  resetPlannerDate() {
    const now = new Date();
    appStore.setState({
      plannerViewDate: now,
      plannerWeekOffset: 0,
      plannerCalYear: now.getFullYear(),
      plannerCalMonth: now.getMonth()
    });
    
    // Trigger re-render
    if (window.routerSwitchView) {
      window.routerSwitchView('planner');
    }
  }
};

/**
 * Workflow handlers
 */
export const workflowHandlers = {
  setWorkflowPlacement: workflowOps.setWorkflowPlacement,
  moveTask: workflowOps.moveTask,
  setWorkflowProjectFilter: workflowOps.setWorkflowProjectFilter,
  toggleUnassignedSection: workflowOps.toggleUnassignedSection,
  toggleActiveFilesPanel: workflowOps.toggleActiveFilesPanel,
  quickAssignToLane(taskId) {
    // Quick assign to first available lane in "Next" column
    const state = appStore.getState();
    const workflow = state.workflow || {};
    const laneOrder = workflow.laneOrder || ["lab", "comp", "writing", "presentation"];
    if (laneOrder.length > 0) {
      workflowOps.setWorkflowPlacement(taskId, laneOrder[0], 'Next');
    }
  },
  openTaskDrawer(taskId) {
    // Open task drawer - delegate to existing handler if available
    if (window.openTaskDrawer) {
      window.openTaskDrawer(taskId);
    }
  }
};

/**
 * Combined handlers object for easy access
 */
export const handlers = {
  ...taskHandlers,
  ...projectHandlers,
  ...uiHandlers,
  ...workflowHandlers,
  ...plannerHandlers,
  
  // Today view specific handlers
  switchView(view) {
    if (window.switchView) {
      window.switchView(view);
    } else {
      uiHandlers.setCurrentView(view);
      if (window.render) {
        window.render();
      }
    }
  },
  
  quickAdd() {
    // Open quick add modal
    if (window.openAddTaskModal) {
      window.openAddTaskModal();
    } else if (window.Petal?.features?.taskOperations?.addTask) {
      // Fallback: try to add task directly
      const title = prompt('Task title:');
      if (title) {
        window.Petal.features.taskOperations.addTask(title);
      }
    }
  },
  
  async toggleTask(id) {
    // Use taskOperations if available, otherwise use handler
    if (window.Petal?.features?.taskOperations?.toggleTask) {
      await window.Petal.features.taskOperations.toggleTask(id);
    } else {
      await taskHandlers.toggleTask(id);
    }
    // Re-render if render function exists
    if (window.render) {
      await window.render();
    }
  },
  
  editTask(id) {
    // Use taskOperations if available
    if (window.Petal?.features?.taskOperations?.editTask) {
      window.Petal.features.taskOperations.editTask(id);
    } else {
      console.warn('editTask not available');
    }
  }
};
