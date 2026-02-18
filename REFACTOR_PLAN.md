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

## Step 2: Wire Store and Handlers

### 2a. Add module imports and single namespace
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

### 2b. Replace global variables with store
Instead of:
```js
let tasks = [];
let projects = [];
```

Use:
```js
// Load from store
const { tasks, projects } = appStore.getState();
// Or use window.Petal.store.getState()
```

### 2c. Replace inline handlers
Instead of:
```html
<button onclick="addTask()">Add</button>
```

Use:
```html
<button onclick="Petal.handlers.addTask(taskData)">Add</button>
```

### 2d. Remove direct save() calls from handlers
Instead of:
```js
async function addTask() {
  tasks.push(newTask);
  await save(); // ❌ Remove this
  render(); // ❌ Remove this
}
```

Use:
```js
// In handlers.js (already done)
async addTask(taskData) {
  const state = appStore.getState();
  appStore.setState({ tasks: [...state.tasks, newTask] });
  // ✅ Persistence and render happen automatically via subscriptions
}
```

### 2e. Update existing functions to use store
```js
// OLD
async function render() {
  const allTasks = [...tasks, ...projects.flatMap(p => p.subtasks || [])];
  // ...
}

// NEW
async function render() {
  const state = appStore.getState();
  const allTasks = Petal.getAllTasks(); // Uses store internally
  // ...
}
```

## Step 3: Extract UI Rendering (Next)

Create separate modules for each view (pure functions):
- `src/ui/renderTasks.js` - `renderTasks(containerEl, state, handlers)`
- `src/ui/renderProjects.js` - `renderProjects(containerEl, state, handlers)`
- `src/ui/renderMatrix.js` - `renderMatrix(containerEl, state, handlers)`
- `src/ui/renderWorkflow.js` - `renderWorkflow(containerEl, state, handlers)`
- `src/ui/renderFiles.js` - `renderFiles(containerEl, state, handlers)`

**Key principle**: Rendering functions should:
- Take state and handlers as parameters (no store peeking)
- Not call save() or mutate state directly
- Return nothing (side effect: updates DOM)
- Be testable with mock state

## Step 4: Extract View Logic (Later)

Create page modules:
- `src/pages/ProjectsPage.js` - Project page logic
- `src/pages/ProjectMatrixPage.js` - Matrix view logic
- `src/pages/WorkflowPage.js` - Workflow view logic

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
