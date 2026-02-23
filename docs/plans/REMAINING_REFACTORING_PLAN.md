# Remaining Refactoring Plan for tasklist.html

## Current Status

**File Size:** ~11,466 lines (down from ~17,000+ lines)
**Progress:** Major business logic extracted (~2,500+ lines moved to modules)

### ✅ Completed Modules
1. **Task Operations** - task notes, editing, protocols, subtasks
2. **File Operations** - file notes, file linking
3. **Project Operations** - project CRUD, file pinning, tabs, milestones, checkpoints, file versions
4. **Modal Operations** - all modal management functions
5. **Utilities** - normalization helpers

---

## Remaining Work Categories

### 📊 Category 1: Rendering Functions (High Priority - UI Layer)
**Estimated Lines:** ~1,500+ lines  
**Priority:** High (affects maintainability and testability)

#### 1.1 Project Rendering Functions
- `renderNextUpStrip()` - ~85 lines - Next Up/Blocked/Stale cards
- `renderFilesTab()` - ~135 lines - File tabs rendering
- `renderProjectFilesSidebar()` - ~130 lines - Project files sidebar
- `renderProjectHeader()` - ~50 lines - Project header card
- `renderProjectBrief()` - ~5 lines - Legacy wrapper
- `renderProjectFiles()` - ~120 lines - Project files panel
- `renderProjectMilestones()` - ✅ Already extracted (wrapper remains)
- `renderProjectCheckpoints()` - ✅ Already extracted (wrapper remains)

**Action:** Create `src/ui/renderProjectUI.js` module

#### 1.2 Task Rendering Functions
- `renderTaskItem()` - ~20 lines - Single task HTML
- `renderTaskItemCompact()` - ~20 lines - Compact task HTML
- `renderTaskList()` - ~120 lines - Task list rendering
- `renderToday()` - ~20 lines - Today view rendering
- `renderTaskLogEntries()` - Task log rendering
- `renderTaskDrawerFiles()` - Task drawer files tab
- `renderTaskDrawerSubtasks()` - Task drawer subtasks tab

**Action:** Some already in `src/ui/renderTasks.js`, consolidate remaining

#### 1.3 Project View Rendering Functions
- `renderTodayTimeline()` - ~85 lines - Today timeline view
- `renderActiveProtocols()` - ~50 lines - Active protocols view
- `renderCellLog()` - ~40 lines - Cell log rendering
- `renderCompWindow()` - ~50 lines - Comp window rendering
- `renderDeadlinesHorizon()` - ~65 lines - Deadlines horizon view
- `renderActiveArtifactsFiltered()` - ~75 lines - Active artifacts view
- `renderActiveFiles()` - ~85 lines - Active files view
- `renderProgressMomentum()` - ~45 lines - Progress momentum view
- `renderWorkingLog()` - ~45 lines - Working log view

**Action:** Create `src/ui/renderProjectViews.js` module

#### 1.4 Global Rendering Functions
- `renderGlobalSidebar()` - ~140 lines - Global sidebar rendering
- `renderSettingsFallback()` - ~95 lines - Settings fallback rendering
- `render()` - ~90 lines - Main render router/dispatcher

**Action:** 
- `renderGlobalSidebar()` → `src/ui/renderGlobalSidebar.js`
- `renderSettingsFallback()` → `src/ui/renderSettings.js` or keep in router
- `render()` → Review if still needed (may be replaced by router)

---

### 🔧 Category 2: Helper/Utility Functions (Medium Priority)
**Estimated Lines:** ~500 lines  
**Priority:** Medium (organize and consolidate)

#### 2.1 File Helpers
- `findOrCreateCanonicalFile()` - File registry management
- `resolveFileIds()` - Resolve file IDs to objects
- `getTaskFiles()` - Get files for a task
- `addFileVersionInternal()` - Internal file version helper
- `normalizeFileUrl()` - ✅ Wrapper (delegates to module)
- `resolveFileUrl()` - ✅ Wrapper (delegates to module)
- `getFileLinks()` - Get file links from DOM
- `getFileLinksNormalized()` - Get normalized file links
- `openFile()` - ~35 lines - Open file handler
- `addFileRow()` - Add file row to form

**Action:** Move to `src/features/fileOperations.js` or `src/utils/fileHelpers.js`

#### 2.2 Project Helpers
- `addProjectCheckpoint()` - Internal checkpoint helper
- `getWorkflowLanesDisplay()` - Workflow lanes display text
- `toggleWorkflowLanesEdit()` - Toggle lanes edit mode
- `cancelWorkflowLanesEdit()` - Cancel lanes edit
- `saveWorkflowLanes()` - Save workflow lanes
- `projectHTML()` - ~200+ lines - Project card HTML generator
- `projectNameById()` - Get project name by ID
- `getWorkflowLanesDisplay()` - Format lanes for display

**Action:** Move to `src/features/projectOperations.js` or `src/utils/projectHelpers.js`

#### 2.3 Task Helpers
- `getColumnTasks()` - Get tasks for board column
- `nextBoardOrderForNewTask()` - Calculate board order
- `setBoardProjectFilter()` - Set board project filter
- `getAllTasks()` - Get all tasks (including project subtasks)
- `getTasksForSubtask()` - Get tasks for subtask
- `getBoardListForProjectFilter()` - Get board list with filter
- `getNext3Tasks()` - Get next 3 tasks helper
- `getMatrixStage()` - Get matrix stage for task

**Action:** Move to `src/features/taskOperations.js` or `src/utils/taskHelpers.js`

#### 2.4 UI Helpers
- `toggleWorkflowLanesSection()` - Toggle section visibility
- `toggleProjectTasksSection()` - Toggle section visibility
- `hideAllForms()` - Hide all forms
- `groupKey()` - Generate group key for tasks
- `updateTagPreview()` - Update tag preview
- `updateCompWindow()` - Update comp window
- `updateTaskSelectedFiles()` - Update task selected files

**Action:** Create `src/ui/uiHelpers.js` module

#### 2.5 Date/Format Helpers
- `today()` - ✅ Already in utils (wrapper remains)
- `parseDate()` - ✅ Already in utils (wrapper remains)
- `dueLabel()` - ✅ Already in utils (wrapper remains)
- `fileIcon()` - ✅ Already in utils (wrapper remains)
- `esc()` - ✅ Already in utils (wrapper remains)
- `escJsonForAttr()` - JSON escape for attributes
- `escJsonForDataAttr()` - JSON escape for data attributes
- `escAttr()` - Attribute escape
- `inRange()` - Date range check
- `formatDateTimeLocal()` - ✅ Already extracted (wrapper remains)

**Action:** Move remaining to `src/utils/strings.js`

---

### 🎯 Category 3: Event Handlers & Delegation (Medium Priority)
**Estimated Lines:** ~300 lines  
**Priority:** Medium (organize event handling)

#### 3.1 Event Delegation
- `setupEventDelegation()` - ~110 lines - Main event delegation setup
- `handleEditTaskAction()` - ~55 lines - Edit task handler
- `handleDeleteTaskAction()` - ~85 lines - Delete task handler

**Action:** Move to `src/ui/eventDelegation.js` or integrate into page modules

#### 3.2 Delete Handlers
- `confirmDeleteTask()` - Delete confirmation
- `confirmDeleteFile()` - File delete confirmation
- `closeDeleteConfirmModal()` - Close delete modal
- `executeDelete()` - Execute delete action
- `softDeleteTask()` - Soft delete task
- `softDeleteFile()` - Soft delete file
- `delTask()` - ✅ Wrapper (delegates to module)
- `delProject()` - ✅ Wrapper (delegates to module)
- `delTaskSubtask()` - ✅ Wrapper (delegates to module)
- `delSubtask()` - ✅ Wrapper (delegates to module)

**Action:** Most already in `src/features/deleteHandlers.js`, verify all are wrapped

---

### 🏗️ Category 4: Core App Functions (Low Priority - Keep for Now)
**Estimated Lines:** ~400 lines  
**Priority:** Low (core initialization, may need to stay)

#### 4.1 Initialization
- `ensurePetalNamespace()` - Ensure Petal namespace exists
- `startApp()` - ~450 lines - Main app initialization
- `initState()` - ~375 lines - State initialization
- `createPageContext()` - ~355 lines - Create page context object

**Action:** Keep in HTML for now, may refactor later

#### 4.2 State Management
- `save()` - ~125 lines - Main save function
- `ensureBoardSettings()` - Ensure board settings exist
- `ensureCellLogSettings()` - Ensure cell log settings exist
- `getBoardColumns()` - Get board columns
- `normalizeProjectIdValue()` - Normalize project ID
- `refreshProjectSelects()` - Refresh project selects

**Action:** Keep in HTML for now, core state management

---

### 📝 Category 5: Task Drawer Functions (Medium Priority)
**Estimated Lines:** ~200 lines  
**Priority:** Medium (already partially extracted)

#### 5.1 Task Drawer Operations
- `openTaskDrawer()` - ✅ Already extracted (wrapper remains)
- `closeTaskDrawer()` - ✅ Already extracted (wrapper remains)
- `switchTaskDrawerTab()` - ✅ Already extracted (wrapper remains)
- `renderTaskDrawerFiles()` - Render files tab
- `renderTaskDrawerSubtasks()` - Render subtasks tab
- `renderTaskLogEntries()` - Render log entries
- `addTaskLogEntry()` - Add log entry
- `deleteTaskLogEntry()` - Delete log entry
- `linkExistingFileToTask()` - Link existing file
- `addNewFileToTask()` - Add new file to task
- `unlinkFileFromTask()` - Unlink file from task
- `addSubtaskToTask()` - Add subtask to task drawer

**Action:** Move remaining to `src/features/taskDrawer.js`

---

### 🔄 Category 6: Project Subtask Operations (Low Priority)
**Estimated Lines:** ~150 lines  
**Priority:** Low (different from task subtasks)

#### 6.1 Project Subtasks
- `addSubtask()` - Add subtask to project
- `toggleSubtask()` - Toggle project subtask
- `getSubFileLinks()` - Get file links for subtask
- `getSubFileLinksNormalized()` - Normalized file links
- `addSubFileRow()` - Add file row to subtask form

**Action:** Move to `src/features/projectOperations.js` (project subtasks section)

---

### 🎨 Category 7: View Navigation & Routing (Low Priority)
**Estimated Lines:** ~200 lines  
**Priority:** Low (may be handled by router)

#### 7.1 View Functions
- `openProjectView()` - Open project view
- `selectProjectForMatrix()` - Select project for matrix
- `toggleWorkflowMatrix()` - Toggle workflow matrix
- `setSort()` - Set sort order (one-liner)
- `setFilter()` - Set filter (one-liner)
- `setProjFilter()` - Set project filter (one-liner)
- `selectColor()` - Select color for project
- `startWeeklyReview()` - Start weekly review workflow

**Action:** Some may be handled by router, review integration

---

## Recommended Refactoring Order

### Phase 1: Rendering Functions (High Impact)
**Estimated Time:** 2-3 sessions  
**Lines to Extract:** ~1,500 lines

1. **Project UI Rendering** → `src/ui/renderProjectUI.js`
   - `renderNextUpStrip()`
   - `renderFilesTab()`
   - `renderProjectFilesSidebar()`
   - `renderProjectHeader()`
   - `renderProjectFiles()`

2. **Project Views Rendering** → `src/ui/renderProjectViews.js`
   - `renderTodayTimeline()`
   - `renderActiveProtocols()`
   - `renderCellLog()`
   - `renderCompWindow()`
   - `renderDeadlinesHorizon()`
   - `renderActiveArtifactsFiltered()`
   - `renderActiveFiles()`
   - `renderProgressMomentum()`
   - `renderWorkingLog()`

3. **Global UI Rendering** → `src/ui/renderGlobalSidebar.js`
   - `renderGlobalSidebar()`
   - `renderSettingsFallback()`

### Phase 2: Helper Functions (Medium Impact)
**Estimated Time:** 1-2 sessions  
**Lines to Extract:** ~500 lines

1. **File Helpers** → `src/utils/fileHelpers.js`
   - `findOrCreateCanonicalFile()`
   - `resolveFileIds()`
   - `getTaskFiles()`
   - `openFile()`
   - `addFileRow()`

2. **Project Helpers** → `src/utils/projectHelpers.js` (extend existing)
   - `projectHTML()` (or replace with module version)
   - `getWorkflowLanesDisplay()`
   - Workflow lanes edit functions

3. **Task Helpers** → `src/utils/taskHelpers.js`
   - `getColumnTasks()`
   - `nextBoardOrderForNewTask()`
   - `getAllTasks()`
   - `getMatrixStage()`

4. **UI Helpers** → `src/ui/uiHelpers.js`
   - `hideAllForms()`
   - `groupKey()`
   - `updateTagPreview()`
   - Toggle functions

### Phase 3: Task Drawer & Event Handling (Medium Impact)
**Estimated Time:** 1 session  
**Lines to Extract:** ~300 lines

1. **Task Drawer** → `src/features/taskDrawer.js` (extend existing)
   - `renderTaskDrawerFiles()`
   - `renderTaskDrawerSubtasks()`
   - `renderTaskLogEntries()`
   - Log entry functions
   - File linking functions

2. **Event Delegation** → `src/ui/eventDelegation.js`
   - `setupEventDelegation()`
   - `handleEditTaskAction()`
   - `handleDeleteTaskAction()`

### Phase 4: Project Subtasks & Remaining (Low Impact)
**Estimated Time:** 1 session  
**Lines to Extract:** ~200 lines

1. **Project Subtasks** → `src/features/projectOperations.js`
   - All project subtask functions

2. **View Navigation** → Review and integrate with router
   - View switching functions
   - Filter/sort functions

---

## File Size Reduction Goals

### Current State
- **tasklist.html:** ~11,466 lines
- **Extracted so far:** ~2,500+ lines

### Target State (After All Phases)
- **tasklist.html:** ~7,000-8,000 lines (core initialization + HTML structure)
- **Additional extraction:** ~3,500+ lines
- **Total reduction:** ~40-45% from original

### Breakdown by Phase
- **Phase 1:** -1,500 lines (rendering functions)
- **Phase 2:** -500 lines (helper functions)
- **Phase 3:** -300 lines (task drawer & events)
- **Phase 4:** -200 lines (remaining functions)
- **Total:** -2,500 lines additional

---

## Implementation Guidelines

### 1. Module Structure
- **UI Rendering:** `src/ui/` - Pure rendering functions
- **Feature Logic:** `src/features/` - Business logic
- **Utilities:** `src/utils/` - Helper functions
- **Domain:** `src/domain/` - Data models and schemas

### 2. Context Passing
- Use `createPageContext()` pattern for dependencies
- Pass state explicitly, avoid globals
- Maintain backward compatibility with wrapper functions

### 3. Testing Strategy
- Extract functions incrementally
- Test after each extraction
- Maintain all existing hookups
- Verify no functionality breaks

### 4. Documentation
- Update function comments
- Document module exports
- Update `init.js` to expose new modules
- Keep wrapper functions documented

---

## Risk Assessment

### Low Risk
- Helper functions (pure, no side effects)
- Utility functions (well-defined inputs/outputs)
- Rendering functions (UI only, no state mutation)

### Medium Risk
- Event handlers (need to maintain event delegation)
- Task drawer functions (complex state interactions)
- View navigation (may affect router integration)

### High Risk
- Core initialization (`startApp`, `initState`) - Keep for now
- Main render router (`render()`) - May be replaced by router
- State management (`save()`) - Core function, keep for now

---

## Success Metrics

### Code Organization
- ✅ All business logic in feature modules
- ✅ All UI rendering in UI modules
- ✅ All utilities in utils modules
- ✅ Clear separation of concerns

### Maintainability
- ✅ Functions are testable in isolation
- ✅ Dependencies are explicit
- ✅ No circular dependencies
- ✅ Clear module boundaries

### Backward Compatibility
- ✅ All inline handlers still work
- ✅ All wrapper functions maintained
- ✅ No breaking changes to existing code
- ✅ Gradual migration path

---

## Next Steps

1. **Start with Phase 1** - Rendering functions (highest impact)
2. **Create UI modules** - `renderProjectUI.js`, `renderProjectViews.js`
3. **Extract incrementally** - One module at a time
4. **Test thoroughly** - After each extraction
5. **Update documentation** - As you go

---

**Last Updated:** After completing protocol, subtask, milestone, checkpoint, and file version refactoring
**Next Review:** After Phase 1 completion
