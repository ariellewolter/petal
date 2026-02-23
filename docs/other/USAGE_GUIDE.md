# Render Functions Usage Guide

## Quick Reference

### Using the Render Registry (Recommended)

```javascript
// Render any page
await window.renderRegistry.renderPage('planner', containerEl, state, handlers);
await window.renderRegistry.renderPage('tasks', containerEl, state, handlers);
await window.renderRegistry.renderPage('projects', containerEl, state, handlers);

// Get a specific renderer
const renderer = window.renderRegistry.getPageRenderer('planner');
if (renderer) {
  await renderer(containerEl, state, handlers);
}

// Check if renderer exists
if (window.renderRegistry.hasPageRenderer('planner')) {
  // Safe to render
}
```

### Using PAGES Registry

```javascript
// Direct access to page renderers
if (window.PAGES['planner']) {
  await window.PAGES['planner'](containerEl, state, handlers);
}

// Or use the helper
import { getPageRenderer } from './src/app/pages.js';
const renderer = getPageRenderer('planner');
```

### Using window.Petal.ui (UI Components)

```javascript
// UI component renderers
await window.Petal.ui.renderTasks(containerEl, state, handlers);
await window.Petal.ui.renderProjects(containerEl, state, handlers);
await window.Petal.ui.renderFiles(containerEl, state, handlers);
await window.Petal.ui.renderWorkflow(containerEl, state, handlers);
```

### Using Direct Window Exports (Backward Compatibility)

```javascript
// Page renderers (for backward compatibility)
await window.renderTodayPage(containerEl, state, handlers);
await window.renderSettingsPage(containerEl, state, handlers);
await window.renderPlannerPage(containerEl, state, handlers);
await window.renderCellLogPage();
await window.renderWorkflowPage(containerEl, state, handlers);
```

## Available Render Functions

### Page Renderers (src/pages/)

| View Name | Function | Module |
|-----------|----------|--------|
| `today` | `renderTodayPage` | `src/pages/TodayPage.js` |
| `tasks` | `renderTasksPage` | `src/pages/TasksPage.js` |
| `projects` | `renderProjectsPage` | `src/pages/ProjectsPage.js` |
| `planner` | `renderPlannerPage` | `src/pages/PlannerPage.js` |
| `files` | `renderFilesPage` | `src/pages/pages.js` (wrapper) |
| `workflow` | `renderWorkflowPage` | `src/pages/WorkflowPage.js` |
| `cell-log` | `renderCellLogPage` | `src/pages/CellLogPage.js` |
| `settings` | `renderSettingsPage` | `src/pages/SettingsPage.js` |
| `3d-print` | `renderThreeDPrintPage` | `src/pages/ThreeDPrintPage.js` |

### UI Component Renderers (src/ui/)

| Component | Function | Module |
|-----------|----------|--------|
| Tasks | `renderTasks` | `src/ui/renderTasks.js` |
| Projects | `renderProjects` | `src/ui/renderProjects.js` |
| Files | `renderFiles` | `src/ui/renderFiles.js` |
| Workflow | `renderWorkflow` | `src/ui/renderWorkflow.js` |
| Planner Habits | `renderPlannerHabits` | `src/ui/renderPlannerHabits.js` |
| Planner Routines | `renderPlannerRoutines` | `src/ui/renderPlannerRoutines.js` |

## Function Signatures

### Page Renderers
```javascript
async function renderPageName(containerEl, state, handlers)
```

**Parameters:**
- `containerEl` (HTMLElement) - Container element to render into
- `state` (Object) - Current app state from store
- `handlers` (Object) - Event handlers object

**Example:**
```javascript
const containerEl = document.getElementById('view-planner');
const state = window.Petal.store.getState();
const handlers = window.Petal.handlers;
await window.renderPlannerPage(containerEl, state, handlers);
```

### UI Component Renderers
```javascript
async function renderComponentName(containerEl, state, handlers)
```

**Parameters:** Same as page renderers

**Example:**
```javascript
const containerEl = document.getElementById('task-container');
const state = window.Petal.store.getState();
const handlers = window.Petal.handlers;
await window.Petal.ui.renderTasks(containerEl, state, handlers);
```

## Best Practices

### 1. Always Use Modules When Available
```javascript
// ✅ Good - uses module
if (window.renderPlannerPage) {
  await window.renderPlannerPage(containerEl, state, handlers);
}

// ❌ Bad - uses inline function directly
await renderPlanner();
```

### 2. Check for Container Element
```javascript
const containerEl = document.getElementById('view-planner');
if (!containerEl) {
  console.error('Container not found');
  return;
}
await window.renderPlannerPage(containerEl, state, handlers);
```

### 3. Get State from Store
```javascript
const state = window.Petal?.store?.getState() || {};
// Always provide fallback empty object
```

### 4. Use Handlers Object
```javascript
const handlers = window.Petal?.handlers || {};
// Provides save, render, and other handlers
```

### 5. Use Registry for Dynamic Rendering
```javascript
// When you don't know which page to render at compile time
const viewName = getCurrentView();
await window.renderRegistry.renderPage(viewName, containerEl, state, handlers);
```

## Migration Status

### ✅ Fully Migrated to Modules
- Today Page
- Settings Page
- Cell Log Page
- Workflow Page
- Tasks Page
- Projects Page
- 3D Print Page
- **Planner Page** (NEW - just created)

### 🔄 Partially Migrated (Has Duplicates)
- Tasks (module exists, inline version still present)
- Projects (module exists, inline version still present)
- Files (module exists, inline version still present)
- Workflow (module exists, inline version still present)

### 📝 Next Steps
1. Remove duplicate inline functions
2. Update all call sites to use modules
3. Complete planner implementation migration
4. Extract component-level renderers
