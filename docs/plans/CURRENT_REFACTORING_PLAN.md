# Current Refactoring Plan - Updated

**Last Updated:** After extracting renderMindMap, renderProjectTasks, matrix operations, and project subtask functions

## 📊 Current Status

### File Size Progress
- **Starting size:** 9,409 lines
- **Current size:** 8,946 lines
- **Reduction so far:** 463 lines (4.9%)
- **Functions remaining:** ~308 functions still in HTML file

### ✅ Completed Extractions

#### Phase 1: Workflow Matrix Functions
- ✅ `renderWorkflowMatrix()` → `src/ui/renderWorkflowMatrix.js`
- ✅ `renderMatrixTaskCard()` → `src/ui/renderWorkflowMatrix.js`
- ✅ `renderMatrixSidebar()` → `src/ui/renderWorkflowMatrix.js`
- ✅ `renderMindMap()` → `src/ui/renderWorkflowMatrix.js` (~253 lines)
- ✅ `renderProjectTasks()` → `src/ui/renderProjectViews.js` (~35 lines)

#### Phase 2: Matrix Operations
- ✅ `onMatrixDragStart()` → `src/features/matrixOperations.js`
- ✅ `onMatrixDragEnd()` → `src/features/matrixOperations.js`
- ✅ `onMatrixDrop()` → `src/features/matrixOperations.js` (~84 lines)
- ✅ `addTaskToMatrix()` → `src/features/matrixOperations.js`
- ✅ `addTaskToSubtask()` → `src/features/matrixOperations.js`
- ✅ `moveTaskInSubtask()` → `src/features/matrixOperations.js`
- ✅ `addFileToMatrixProject()` → `src/features/matrixOperations.js`

#### Phase 3: Project Subtask Functions
- ✅ `addSubtask()` → `src/features/projectOperations.js`
- ✅ `toggleSubtask()` → `src/features/projectOperations.js`
- ✅ `getSubFileLinks()` → `src/features/projectOperations.js`
- ✅ `getSubFileLinksNormalized()` → `src/features/projectOperations.js`

#### Bug Fixes
- ✅ Fixed `renderProjectBrief()` bug (was calling `renderProjectHeader` instead)

---

## 🎯 Remaining Refactoring Opportunities

### High Priority - Large Functions Still Inline

#### 1. Task Operations (~150 lines)
**Location:** Lines 4242-4297
- `addTaskToProject()` - ~55 lines
  - **Status:** Still has full implementation
  - **Extract to:** `src/features/taskOperations.js` or `src/features/projectOperations.js`
  - **Dependencies:** `normalizeProjectIdValue`, `LANE_STAGES`, `save`, `render`

#### 2. Weekly Review Function (~80 lines)
**Location:** Line 3765
- `startWeeklyReview()` - ~80 lines
  - **Status:** Still has full implementation
  - **Extract to:** `src/features/reviewOperations.js` (new module)
  - **Dependencies:** `tasks`, `projects`, `save`, `render`

#### 3. Project View Functions (~200 lines)
**Location:** Lines 4973-5026
- `projectHTML()` - ~200 lines (complex HTML generation)
  - **Status:** Still has full implementation
  - **Extract to:** `src/ui/renderProjectUI.js`
  - **Dependencies:** Many project-related helpers

#### 4. Task Item Rendering (~150 lines)
**Location:** Lines 5218-5240, 5240-5262
- `renderTaskItemCompact()` - ~22 lines
- `renderTaskItem()` - ~22 lines
  - **Status:** Still has full implementation
  - **Extract to:** `src/ui/renderTasks.js` or new `src/ui/renderTaskItems.js`
  - **Dependencies:** Task formatting helpers

#### 5. Workflow Lanes Management (~100 lines)
**Location:** Lines 4942-4972
- `toggleWorkflowLanesEdit()` - ~10 lines
- `cancelWorkflowLanesEdit()` - ~10 lines
- `saveWorkflowLanes()` - ~30 lines
- `getWorkflowLanesDisplay()` - Helper (may already be extracted)
  - **Status:** Some are wrappers, some still inline
  - **Extract to:** `src/features/projectOperations.js`

### Medium Priority - Helper Functions

#### 6. Utility Functions (Many small helpers)
**Location:** Lines 4629-4707
- `today()`, `parseDate()`, `inRange()`, `dueLabel()`, `fileIcon()`
- `esc()`, `escJsonForAttr()`, `escJsonForDataAttr()`, `escAttr()`
- `groupKey()`, `hideAllForms()`
  - **Status:** Many are already in modules, but some may still be inline
  - **Action:** Verify which are duplicates and remove from HTML

#### 7. Project Helper Functions
**Location:** Lines 4903-4941
- `projectNameById()` - Helper
- `getBoardListForProjectFilter()` - Helper
- `openFile()` - File operation
- `getWorkflowLanesDisplay()` - May already be extracted
  - **Status:** Check if already in modules

#### 8. View Toggle Functions
**Location:** Lines 4512-4529
- `toggleWorkflowLanesSection()` - Wrapper (already extracted?)
- `toggleProjectTasksSection()` - Wrapper (already extracted?)
- `addFileToProject()` - Still has implementation?
  - **Status:** Verify which are wrappers vs implementations

### Lower Priority - Core Functions (Keep for Now)

These should stay in HTML as they're core to app initialization:

- `ensurePetalNamespace()` - App initialization
- `startApp()` - App initialization
- `createPageContext()` - Context creation (used by many modules)
- `initState()` - State initialization
- `save()` - Main save function (wires to store)
- `render()` - Main render router (wires to router)

---

## 📋 Recommended Next Steps

### Phase 4: Extract Remaining Large Functions (High Impact)

**Estimated Reduction:** ~500-600 lines

1. **Extract `addTaskToProject()`** (~55 lines)
   - Move to `src/features/taskOperations.js`
   - Update `createPageContext()` to include dependencies

2. **Extract `startWeeklyReview()`** (~80 lines)
   - Create new `src/features/reviewOperations.js`
   - Extract review-related logic

3. **Extract `projectHTML()`** (~200 lines)
   - Move to `src/ui/renderProjectUI.js`
   - This is a large HTML generation function

4. **Extract task item rendering** (~50 lines)
   - `renderTaskItemCompact()` and `renderTaskItem()`
   - Move to `src/ui/renderTasks.js` or new module

5. **Extract workflow lanes functions** (~50 lines)
   - Complete extraction of workflow lanes management
   - Move to `src/features/projectOperations.js`

### Phase 5: Clean Up Duplicates and Helpers (Medium Impact)

**Estimated Reduction:** ~200-300 lines

1. **Remove duplicate utility functions**
   - Check which utility functions are already in modules
   - Remove duplicates from HTML

2. **Consolidate helper functions**
   - Move remaining small helpers to appropriate modules
   - Remove from HTML once extracted

3. **Clean up wrapper functions**
   - Many functions are already wrappers (good!)
   - Verify all wrappers are correct

### Phase 6: Final Cleanup (Low Impact)

**Estimated Reduction:** ~100-200 lines

1. **Remove commented-out code**
2. **Remove legacy/fallback code** (if truly unused)
3. **Optimize remaining inline code**

---

## 🎯 Target Goals

### Short Term (Next Session)
- Extract `addTaskToProject()` → **~55 lines**
- Extract `startWeeklyReview()` → **~80 lines**
- Extract `projectHTML()` → **~200 lines**
- **Total:** ~335 lines reduction
- **New target:** ~8,611 lines

### Medium Term
- Extract remaining task rendering functions → **~50 lines**
- Extract workflow lanes functions → **~50 lines**
- Clean up duplicates → **~200 lines**
- **Total:** ~300 lines reduction
- **New target:** ~8,311 lines

### Long Term
- Final cleanup and optimization
- **Target:** ~8,000 lines (15% reduction from original 9,409)

---

## 📝 Notes

### Functions Already Extracted (Wrappers Only)
Most of these are already wrappers that delegate to modules:
- ✅ Task drawer functions (all wrappers)
- ✅ Modal operations (all wrappers)
- ✅ File management (all wrappers)
- ✅ Delete handlers (all wrappers)
- ✅ Project operations (most are wrappers)
- ✅ Task operations (most are wrappers)

### Functions That Should Stay
- Core initialization functions (`startApp`, `initState`)
- Context creation (`createPageContext`)
- Main save/render routers (`save`, `render`)
- Event delegation setup (`setupEventDelegation`)

---

## 🔍 Analysis Summary

**Current State:**
- **8,946 lines** (down from 9,409)
- **~308 functions** still in HTML
- **Most large functions** already extracted
- **Remaining opportunities:** Medium-sized functions and cleanup

**Next Best Targets:**
1. `addTaskToProject()` - 55 lines, clear extraction path
2. `startWeeklyReview()` - 80 lines, isolated functionality
3. `projectHTML()` - 200 lines, large impact
4. Task rendering helpers - 50 lines, good organization

**Estimated Remaining Potential:**
- **High priority extractions:** ~500-600 lines
- **Medium priority cleanup:** ~200-300 lines
- **Total potential:** ~700-900 lines additional reduction
- **Final target:** ~8,000-8,200 lines (13-15% total reduction)
