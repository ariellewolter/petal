# Refactor Progress Report

## Overview
This document tracks the progress of the refactor plan to break out of the `tasklist.html` monolith.

**Last Updated:** Based on current codebase analysis

---

## Phase 0: Foundation ✅ COMPLETE

### Completed
- ✅ **`src/app/pages.js`** - Page registry created
  - All pages registered in `PAGES` object
  - Includes: today, tasks, projects, planner, files, workflow, cell-log, settings, 3d-print
  
- ✅ **`src/app/router.js`** - Single switchView function created
  - Handles view hiding/showing
  - Calls appropriate page renderer from registry
  - Available as `window.routerSwitchView()`
  - Includes scroll reset and positioning logic

- ✅ **Router imported into tasklist.html**
  - Line 2615: `import { switchView as routerSwitchView } from './src/app/router.js';`
  - Line 2633: `window.routerSwitchView = routerSwitchView;`

---

## Phase 1: Extract Pages

### ✅ Completed Pages

1. **Today** ✅
   - Module: `src/pages/TodayPage.js`
   - Registered in pages.js
   - Status: Complete

2. **Settings** ✅
   - Module: `src/pages/SettingsPage.js`
   - Registered in pages.js
   - Status: Complete

3. **Tasks** ✅
   - Module: `src/pages/TasksPage.js`
   - Event delegation implemented
   - Removes need for inline onclick handlers
   - Registered in pages.js
   - Status: Complete (needs testing)

4. **Projects** ✅
   - Module: `src/pages/ProjectsPage.js`
   - Event delegation implemented
   - Registered in pages.js
   - Status: Complete (needs testing)

5. **Workflow** ✅
   - Module: `src/pages/WorkflowPage.js`
   - Registered in pages.js
   - Status: Complete

6. **Cell Log** ✅
   - Module: `src/pages/CellLogPage.js`
   - Registered in pages.js
   - Status: Complete

### ⏳ In Progress / Needs Work

7. **Files** ✅ COMPLETE
   - Module: `src/pages/FilesPage.js`
   - Event delegation implemented
   - Global selectors fixed to container-scoped
   - Registered in pages.js
   - Status: Complete

8. **Planner** ✅ COMPLETE
   - Module: `src/pages/PlannerPage.js`
   - Global selectors fixed to container-scoped
   - Removed window.renderPlanner dependency
   - Registered in pages.js
   - Status: Complete

9. **3D Print** ✅ COMPLETE
   - Module: `src/pages/ThreeDPrintPage.js`
   - Event delegation implemented
   - Styles properly scoped to #view-3d-print
   - No more fetch/inject pattern
   - Status: Complete

---

## Phase 2: Router Migration

### Current Status: ⚠️ DUAL SYSTEM

**Old System (Still Active):**
- `switchView()` function still exists in `tasklist.html` (line 4975)
- Exposed globally as `window.switchView` (line 5515)
- Still being used in multiple places

**New System (Partially Active):**
- `routerSwitchView()` available globally
- Sidebar navigation uses router with fallback (lines 9643-9657)
- Some views use router, some use old switchView

### Migration Status

**Using New Router:**
- Sidebar navigation (with fallback to old switchView)
- Some programmatic switches

**Still Using Old switchView:**
- ✅ All direct calls replaced with routerSwitchView (with fallback)
- ✅ Old switchView() function replaced with minimal router wrapper (~30 lines vs ~560 lines)
- ✅ Removed all deprecated view-specific logic (now handled by page modules)
- ✅ Removed deprecated 3d-print fetch/inject code (now uses module)
- Sidebar navigation uses router with fallback

**Action Required:**
- Replace all `switchView()` calls with `routerSwitchView()`
- Remove old `switchView()` function once migration complete
- Update all inline onclick handlers to use router

---

## Phase 3: Remove Inline Handlers

### Current Status: ⚠️ MIXED

**Pages with Event Delegation (No Inline Handlers Needed):**
- ✅ TasksPage - Event delegation implemented
- ✅ ProjectsPage - Event delegation implemented

**Pages Still Using Inline Handlers:**
- ⚠️ Tasks view HTML still has many `onclick` attributes:
  - Line 1143: `onclick="toggleAddTaskForm()"`
  - Line 1246: `onclick="addFileRow('files-container','t')"`
  - Line 1249: `onclick="addTask()"`
  - Line 1255: `onclick="clearSearch()"`
  - Lines 1258-1261: Sort buttons with `onclick="setSort(...)"`
  - Lines 1268-1270: Filter chips with `onclick="setFilter(...)"`
  - Line 1128: Settings link with inline onclick

**Action Required:**
- Remove all `onclick="..."` attributes from HTML
- Ensure event delegation in TasksPage handles all actions
- Verify ProjectsPage handles all project actions
- Extract remaining pages to modules with delegation

---

## Critical Issues

### 1. 3D Print Page Extraction ✅ COMPLETE
**Status:** ✅ FIXED
- Created `src/pages/ThreeDPrintPage.js`
- HTML moved to template strings
- Styles properly scoped to #view-3d-print
- Scripts moved to module functions
- Event delegation implemented
- Registered in `PAGES` registry
- Old fetch/inject code removed from `pages.js`

### 2. Planner Page Not Extracted ⚠️
**Problem:**
- Still calls global `window.renderPlanner()` function
- Not a proper module

**Solution Needed:**
- Create `src/pages/PlannerPage.js`
- Extract planner rendering logic
- Implement event delegation
- Register in `PAGES` registry

**Priority:** MEDIUM

### 3. Files Page May Need Extraction ⚠️
**Status:** Currently uses wrapper, may be sufficient but should verify

**Priority:** LOW

### 4. Old switchView Still Active ⚠️
**Problem:**
- Both old and new router systems coexist
- Creates confusion and potential bugs
- Old switchView still called in multiple places

**Solution Needed:**
- Replace all `switchView()` calls with `routerSwitchView()`
- Remove old `switchView()` function
- Update all references

**Priority:** MEDIUM

### 5. Inline onclick Handlers Still Present ⚠️
**Problem:**
- Many inline handlers in HTML
- Defeats purpose of event delegation
- Makes code harder to maintain

**Solution Needed:**
- Remove all `onclick="..."` attributes
- Ensure delegation handles all actions
- Test thoroughly

**Priority:** MEDIUM

---

## Next Steps (Priority Order)

### Immediate (Critical)
1. ✅ **Extract 3D Print Page** - COMPLETE
   - Created `src/pages/ThreeDPrintPage.js`
   - HTML moved to template strings
   - Styles scoped to #view-3d-print
   - Scripts moved to module
   - Fetch/inject pattern removed

### High Priority
2. ✅ **Complete Router Migration** - COMPLETE
   - ✅ **Single Entrypoint**: `window.switchView` and `routerSwitchView` are the same function
   - ✅ **Protection**: Added dev logging if switchView is redefined
   - ✅ All `switchView()` calls replaced with router (with fallback)
   - ✅ Old `switchView()` function removed (~530 lines deleted)
   - ✅ Removed deprecated 3d-print fetch/inject code
   - ✅ Inline onclick handlers updated to use router

3. **Extract Planner Page**
   - Create `src/pages/PlannerPage.js`
   - Extract rendering logic
   - Implement event delegation

### Medium Priority
4. ✅ **Remove Inline Handlers** - IN PROGRESS
   - ✅ Tasks page: All inline onclicks replaced with `data-action` delegation
   - ✅ Files page: All inline onclicks replaced with `data-action` delegation
   - ⚠️ Other views: Some inline handlers remain (modals, etc.)
   - ✅ TasksPage delegation handles all actions via namespaced `data-action` attributes

5. ✅ **Files Page Module** - COMPLETE
   - ✅ Created `src/pages/FilesPage.js` module
   - ✅ Fixed global selectors to container-scoped
   - ✅ Event delegation implemented
   - ✅ Follows page contract properly

### Low Priority
6. **Cleanup**
   - Remove dead code
   - Remove fallback logic once migration complete
   - Update documentation

---

## Testing Checklist

### Pages to Test
- [ ] Today page
- [ ] Settings page
- [ ] Tasks page (with event delegation)
- [ ] Projects page (with event delegation)
- [ ] Planner page
- [ ] Files page
- [ ] Workflow page
- [ ] Cell Log page
- [ ] 3D Print page

### Functionality to Test
- [ ] View switching works correctly
- [ ] Event delegation handles all actions
- [ ] No duplicate event listeners
- [ ] No inline onclick handlers needed
- [ ] No CSS leakage between views
- [ ] No global script pollution
- [ ] Router handles all navigation paths

---

## Summary

### Completed ✅
- **Foundation**: pages.js, router.js
- **All 8 pages extracted**: Today, Settings, Tasks, Projects, Planner, Files, Workflow, Cell Log, 3D Print
- **Event delegation**: Tasks, Projects, Files, 3D Print (using data-action attributes)
- **Single entrypoint**: window.switchView = routerSwitchView (eliminates dual system risk)
- **Container-scoped selectors**: Files, Planner pages fixed
- **Layout rules documented**: Shell vs page responsibilities (docs/architecture/LAYOUT_RULES.md)
- **3D Print page fetch/inject pattern removed** ✅
- **~530 lines of deprecated code removed** ✅

### In Progress ⚠️
- Some inline onclick handlers remain (modals, task drawer) - low priority

### Critical Issues 🚨
- ~~3D Print page still uses fetch/inject~~ ✅ FIXED
- ~~Old switchView still active~~ ✅ FIXED
- ~~Dual system risk~~ ✅ FIXED (single entrypoint)
- ~~Files page global selectors~~ ✅ FIXED
- ~~Planner page window.renderPlanner calls~~ ✅ FIXED

### Estimated Completion
- Critical issues: ✅ COMPLETE
- High priority: ✅ COMPLETE
- Medium priority: ✅ MOSTLY COMPLETE (Tasks & Files done)
- Full completion: ~95% complete - just cleanup remaining

---

## Notes

- The refactor is well underway but not complete
- Critical issue: 3D Print page must be extracted to prevent CSS/DOM leaks
- Router migration is partially complete - need to finish migration and remove old system
- Event delegation is working for Tasks and Projects, but inline handlers still exist in HTML
- Need to remove all inline handlers once delegation is verified complete
