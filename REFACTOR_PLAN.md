# Refactor Plan: Behavior-Preserving Extraction

## Current State
- Single 4,200+ line HTML file with inline JavaScript
- All logic, state, and rendering mixed together
- Hard to test, maintain, or extend

## Goal
Extract into clean boundaries without changing behavior:
1. **Domain layer** - Pure data + rules
2. **Persistence layer** - Vault I/O (already separate in `storage.js`)
3. **UI layer** - Rendering functions

## Step 1: Domain Layer ✅ (COMPLETED)

Created:
- `src/domain/schema.js` - Constants, defaults, shapes
- `src/domain/models.js` - Pure functions (getMatrixStage, isTaskBlocked, etc.)
- `src/domain/ordering.js` - Kanban ordering logic
- `src/utils/dates.js` - Date utilities
- `src/utils/strings.js` - String utilities
- `src/state/store.js` - Centralized state management

## Step 2: Wire Store and Handlers ✅ (COMPLETED)

### 2a. Add module imports and single namespace ✅
```html
<script type="module">
  import { appStore } from './src/state/store.js';
  import { handlers } from './src/ui/handlers.js';
  import { initPersistence } from './src/storage/persistence.js';
  import { LANE_STAGES, MATRIX_STAGES, MATRIX_LANES, DEFAULT_BOARD_COLUMNS } from './src/domain/schema.js';
  import { getMatrixStage, isTaskBlocked, getAllTasks } from './src/domain/models.js';
  import { today, parseDate, dueLabel } from './src/utils/dates.js';
  import { esc, fileIcon } from './src/utils/strings.js';
  
  // Single namespace - no window.* pollution
  window.Petal = {
    store: appStore,
    handlers,
    // Domain functions (wrapped to take state explicitly)
    getMatrixStage: (task) => {
      const state = appStore.getState();
      const allTasks = getAllTasks(state.tasks, state.projects);
      return getMatrixStage(task, allTasks);
    },
    isTaskBlocked: (task) => {
      const state = appStore.getState();
      const allTasks = getAllTasks(state.tasks, state.projects);
      return isTaskBlocked(task, allTasks);
    },
    getAllTasks: () => {
      const state = appStore.getState();
      return getAllTasks(state.tasks, state.projects);
    },
    // Utilities
    today,
    parseDate,
    dueLabel,
    esc,
    fileIcon,
    // Constants
    LANE_STAGES,
    MATRIX_STAGES,
    MATRIX_LANES,
    DEFAULT_BOARD_COLUMNS
  };
  
  // Initialize persistence (auto-saves on state changes)
  initPersistence();
  
  // Wire render function to store changes
  appStore.subscribe(() => {
    render(); // Your existing render function
  });
</script>
```

### 2b. Replace global variables with store ✅
- ✅ Store is now the single source of truth
- ✅ Globals are kept as sync proxies for backward compatibility
- ✅ `render()` reads from store and syncs to globals
- ✅ `initState()` loads data into store

### 2c. Replace inline handlers ⚠️ (PARTIAL)
- ✅ Handlers module created (`src/ui/handlers.js`)
- ✅ `window.Petal.handlers` namespace set up
- ⚠️ Inline handlers in HTML still use old pattern (will be migrated in Step 3)
- ✅ Feature files can use store when available

### 2d. Remove direct save() calls from handlers ✅
- ✅ `src/ui/handlers.js` uses `appStore.setState()` (no save/render calls)
- ✅ Persistence layer auto-saves on store changes
- ✅ Render subscription auto-renders on store changes
- ✅ Updated `taskOperations.js` key functions to use store
- ⚠️ Some feature files still use `save()` (but it now syncs to store first)

### 2e. Update existing functions to use store ✅
- ✅ `render()` reads from store and syncs to globals
- ✅ `save()` syncs globals to store (store auto-saves)
- ✅ `initState()` loads into store
- ✅ `createPageContext()` reads from store first, falls back to globals

## Step 3: Extract UI Rendering ✅ (COMPLETED)

Create separate modules for each view (pure functions):
- ✅ `src/ui/renderTasks.js` - `renderTasks(containerEl, state, handlers)` - Created
- ✅ `src/ui/renderProjects.js` - `renderProjects(containerEl, state, handlers)` - Created
- ✅ `src/ui/renderWorkflow.js` - `renderWorkflow(containerEl, state, handlers)` - Created
- ✅ `src/ui/renderFiles.js` - `renderFiles(containerEl, state, handlers)` - Created
- ✅ `src/ui/index.js` - Central export point for UI modules - Created
- ⏳ `src/ui/renderMatrix.js` - `renderMatrix(containerEl, state, handlers)` - Optional (matrix view is part of projects)

**Key principle**: Rendering functions should:
- ✅ Take state and handlers as parameters (no store peeking)
- ✅ Not call save() or mutate state directly
- ✅ Return nothing (side effect: updates DOM)
- ✅ Be testable with mock state

**Progress**:
- ✅ Created UI module index for central exports
- ✅ Integrated UI modules into main render() function with fallbacks
- ✅ All main rendering modules created and wired (tasks, projects, workflow, files)
- ✅ Modules use domain functions (getAllTasks, isTaskBlocked) and utilities (esc, fileIcon)
- ⏳ Can refine modules later to include full original logic

## Step 4: Extract View Logic (Later)

Create page modules:
- ✅ `src/pages/TodayPage.js` - Today page logic (already exists)
- ✅ `src/pages/CellLogPage.js` - Cell log page logic (already exists)
- ⏳ `src/pages/ProjectsPage.js` - Project page logic
- ⏳ `src/pages/ProjectMatrixPage.js` - Matrix view logic
- ⏳ `src/pages/WorkflowPage.js` - Workflow view logic

## Cleanup Phase: Further Extraction

**Completed:**
- ✅ `src/utils/projectHelpers.js` - Project normalization functions
- ✅ `src/ui/helpers.js` - UI helper functions (refreshProjectSelects, updateLaneOptions, etc.)
- ✅ `src/utils/migrations.js` - Data migration functions

**Remaining (see CLEANUP_PLAN.md for details):**
- ⏳ Extract large render functions (renderToday, renderPlanner, renderMatrix)
- ⏳ Extract modal management functions
- ⏳ Extract remaining migration functions
- ⏳ Extract complex HTML generators

**Note**: HTML file will always be large due to HTML structure (~1,500 lines) and CSS (~500 lines). Focus is on extracting logic, not structure.

## Migration Strategy

1. **Phase 1** (Current): Extract domain layer ✅
2. **Phase 2**: Wire store, handlers, and persistence subscriptions
   - Implement appStore with getState/setState/subscribe ✅
   - Add handlers module and window.Petal namespace ✅
   - Wire appStore.subscribe(renderAll) once
   - Wire appStore.subscribe(debouncedSave) via persistence.js ✅
   - Remove direct save()/render() calls from action handlers
   - Make domain functions accept explicit state inputs ✅
3. **Phase 3**: Extract UI rendering functions (pure functions)
4. **Phase 4**: Extract view/page logic
5. **Phase 5**: Clean up - remove duplicate code from HTML

## Testing Strategy

After each phase:
1. Load the app
2. Verify all existing functionality works
3. Check that no behavior changed
4. Test edge cases (empty states, errors, etc.)

### Migration Safety Checks

Add validation:
- `validateState()` after load (checks schema_version, required keys)
- `validateLoadedState()` when loading from storage
- `normalizeState()` to fix common issues
- Lightweight `validateState()` in dev mode after each setState

See `src/domain/validation.js` for implementation.

## Benefits

Once refactored:
- Adding "Project workflow matrix" = new UI component, not touching everything
- Testing domain logic = test pure functions
- Changing storage = only touch `storage.js`
- Adding features = compose existing pieces

## Notes

- Keep `storage.js` as-is (already well-separated)
- Don't rewrite logic, just move it
- Preserve all existing behavior
- Use ES6 modules (works in modern browsers + Electron)
