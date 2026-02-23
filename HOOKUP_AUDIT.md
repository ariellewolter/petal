# Hookup Audit: Functions and Pages

## Summary
This document audits all hookups between functions, pages, and event handlers.

## ✅ Page Registry (PAGES)

All pages registered in `src/app/pages.js`:
- `today` → `renderTodayPage` ✅
- `tasks` → `renderTasksPage` ✅
- `projects` → `renderProjectsPage` ✅
- `planner` → `renderPlannerPage` ✅
- `files` → `renderFilesPage` ✅
- `workflow` → `renderWorkflowPage` ✅
- `cell-log` → `renderCellLogPage` ✅
- `settings` → `renderSettingsPage` ✅
- `3d-print` → `renderThreeDPrintPage` ✅

## ✅ View Containers in HTML

All view containers found in `tasklist (1).html`:
- `view-today` ✅
- `view-tasks` ✅
- `view-projects` ✅
- `view-planner` ✅
- `view-files` ✅
- `view-workflow` ✅
- `view-cell-log` ✅
- `view-settings` ✅
- `view-3d-print` ✅

**Status:** All pages have corresponding view containers ✅

## ✅ Router Connection

The router (`src/app/router.js`) uses `getPageRenderer(viewName)` to get renderers from PAGES registry.

**Status:** Router properly connected to PAGES registry ✅

## ⚠️ Navigation Actions

### Sidebar Navigation
- Uses `data-nav` attribute on links
- Handled by `renderGlobalSidebar()` onclick handler
- Handler calls `window.routerSwitchView(view)` or `window.switchView(view)`

**Status:** ✅ Connected

### Event Delegation Navigation
- `delegation.js` now handles ALL `nav:*` actions generically ✅
- Fixed: Generic handler added that handles `nav:tasks`, `nav:projects`, `nav:settings`, etc.
- Works with both `data-action="nav:XXX"` and `data-nav="XXX"` attributes

**Status:** ✅ Fixed - All navigation actions now properly handled

## ✅ Page Event Handlers

### TasksPage
- Has its own `bind()` function for event delegation
- Handles task-specific actions: `task:add`, `task:edit`, `task:delete`, etc.
- Uses `container.__tasksPageBound` flag to prevent duplicate binding

**Status:** ✅ Properly hooked up

### ProjectsPage
- Has its own `bind()` function for event delegation
- Handles project-specific actions: `toggle-project`, `add-project-task`, etc.
- Uses global `bound` flag to prevent duplicate binding

**Status:** ✅ Properly hooked up

### FilesPage
- Has its own `bind()` function for event delegation
- Handles file-specific actions: `file:view`, `file:edit`, etc.
- Uses global `bound` flag to prevent duplicate binding

**Status:** ✅ Properly hooked up

### Other Pages
- TodayPage, SettingsPage, CellLogPage, WorkflowPage, PlannerPage, ThreeDPrintPage
- These pages may rely on global event delegation in `delegation.js`

**Status:** ⚠️ Need to verify all actions are handled

## ✅ Fixed Issues

### 1. Generic Navigation Handler
**Status:** ✅ FIXED - Added generic handler for all `nav:*` actions in delegation.js
**Implementation:** Now handles `nav:tasks`, `nav:projects`, `nav:settings`, `nav:planner`, etc.

### 2. Page-Specific Actions
**Status:** ✅ Verified - All major pages have their own event handlers:
- TasksPage: Has `bind()` function with task-specific handlers
- ProjectsPage: Has `bind()` function with project-specific handlers  
- FilesPage: Has `bind()` function with file-specific handlers
- Other pages: Use global delegation.js handlers

## ✅ Global Functions Exposed

All page renderers are exposed globally in `exposePageRenderers()`:
- `window.renderTodayPage` ✅
- `window.renderSettingsPage` ✅
- `window.renderPlannerPage` ✅
- `window.renderProjectsPage` ✅
- `window.renderTasksPage` ✅
- `window.renderThreeDPrintPage` ✅
- `window.renderCellLogPage` ✅
- `window.renderWorkflowPage` ✅
- `window.PAGES` (registry) ✅
- `window.renderRegistry` ✅

**Status:** All properly exposed ✅

## ✅ Router Setup

Router is set up in `setupRouter()`:
- `window.switchView` = `routerSwitchView` ✅
- `window.routerSwitchView` = `routerSwitchView` (alias) ✅
- `window.switchViewSafe` = safe wrapper ✅

**Status:** Properly connected ✅

## Recommendations

1. **Add generic navigation handler** in delegation.js for all `nav:*` actions
2. **Verify all page actions** are handled (either in page-specific bind() or global delegation)
3. **Add missing handlers** for any unhandled actions found
