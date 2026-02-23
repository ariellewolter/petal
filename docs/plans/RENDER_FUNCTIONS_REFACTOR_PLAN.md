# Render Functions Refactoring Plan

## Goal
Refactor all render functions to separate module files with a unified access system.

## Current State

### ✅ Already in Modules
- `renderTodayPage` → `src/pages/TodayPage.js`
- `renderSettingsPage` → `src/pages/SettingsPage.js`
- `renderCellLogPage` → `src/pages/CellLogPage.js`
- `renderWorkflowPage` → `src/pages/WorkflowPage.js`
- `renderTasksPage` → `src/pages/TasksPage.js`
- `renderProjectsPage` → `src/pages/ProjectsPage.js`
- `renderThreeDPrintPage` → `src/pages/ThreeDPrintPage.js`
- `renderTasks` → `src/ui/renderTasks.js`
- `renderProjects` → `src/ui/renderProjects.js`
- `renderFiles` → `src/ui/renderFiles.js`
- `renderWorkflow` → `src/ui/renderWorkflow.js`

### ❌ Still Inline in tasklist.html
- `renderPlanner()` - **NOW MOVED** to `src/pages/PlannerPage.js`
- `renderProjects()` - **DUPLICATE** (module exists, need to remove inline)
- `renderTasks()` - **DUPLICATE** (module exists, need to remove inline)
- `renderFiles()` - **DUPLICATE** (module exists, need to remove inline)
- `renderWorkflow()` - **DUPLICATE** (module exists, need to remove inline)
- Many component-level render functions (renderTaskItem, renderProjectHeader, etc.)

## New System Architecture

### 1. Central Registry (`src/app/renderRegistry.js`)
- **Purpose**: Single source of truth for all render functions
- **Features**:
  - Unified access to page renderers
  - Unified access to UI component renderers
  - Legacy function support during migration
  - Easy discovery of available renderers

### 2. Page Modules (`src/pages/`)
- **Purpose**: Page-level renderers
- **Structure**: One file per page
- **Exports**: Main render function for the page

### 3. UI Modules (`src/ui/`)
- **Purpose**: Reusable UI component renderers
- **Structure**: One file per component type
- **Exports**: Component render functions

### 4. Global Access
All render functions are accessible via:
- `window.renderRegistry` - Central registry
- `window.PAGES` - Page renderer registry
- `window.Petal.ui.*` - UI component renderers
- Direct window exports for backward compatibility

## Usage Examples

### Using the Registry
```javascript
// Render a page
await window.renderRegistry.renderPage('planner', containerEl, state, handlers);

// Get a specific renderer
const renderer = window.renderRegistry.getPageRenderer('tasks');
if (renderer) {
  await renderer(containerEl, state, handlers);
}

// Check if renderer exists
if (window.renderRegistry.hasPageRenderer('planner')) {
  // Render it
}
```

### Using PAGES Registry
```javascript
// Direct access
if (window.PAGES['planner']) {
  await window.PAGES['planner'](containerEl, state, handlers);
}
```

### Using window.Petal.ui
```javascript
// UI component renderers
await window.Petal.ui.renderTasks(containerEl, state, handlers);
await window.Petal.ui.renderProjects(containerEl, state, handlers);
```

## Migration Steps

### Phase 1: ✅ Create Infrastructure (DONE)
- [x] Create `src/app/renderRegistry.js`
- [x] Create `src/pages/PlannerPage.js`
- [x] Update `src/app/pages.js` to import PlannerPage
- [x] Hook up registry to window object
- [x] Update `render()` to use PlannerPage module

### Phase 2: Remove Duplicates (NEXT)
- [ ] Remove inline `renderProjects()` from tasklist.html
- [ ] Remove inline `renderTasks()` from tasklist.html
- [ ] Remove inline `renderFiles()` from tasklist.html
- [ ] Remove inline `renderWorkflow()` from tasklist.html
- [ ] Update all call sites to use modules

### Phase 3: Extract Component Renderers
- [ ] Move `renderTaskItem()` to `src/ui/renderTaskItem.js`
- [ ] Move `renderProjectHeader()` to `src/ui/renderProjectHeader.js`
- [ ] Move `renderFileItem()` to `src/ui/renderFileItem.js`
- [ ] Move other component renderers as needed

### Phase 4: Complete Planner Migration
- [ ] Move `renderWeeklyPlanner()` implementation to PlannerPage.js
- [ ] Move `renderDailyPlanner()` implementation to PlannerPage.js
- [ ] Move `buildPlannerSidebar()` to PlannerPage.js
- [ ] Move `buildPlannerCalendar()` to PlannerPage.js
- [ ] Remove all planner-related inline functions

## Benefits

1. **Single Source of Truth**: Each render function exists in one place
2. **Easy Discovery**: Registry makes it easy to find available renderers
3. **Type Safety**: Clear function signatures
4. **Testability**: Modules can be tested independently
5. **Maintainability**: Changes in one place
6. **Code Organization**: Clear separation of concerns

## Backward Compatibility

During migration, the system maintains backward compatibility:
- Legacy inline functions still work
- New module functions are preferred
- Registry provides fallback to legacy functions
- Gradual migration is possible

## Next Steps

1. Test that PlannerPage module works correctly
2. Remove duplicate inline functions one by one
3. Update all call sites
4. Extract component renderers as needed
5. Complete planner implementation migration
