# Migration Example: How to Start Using Extracted Modules

## Quick Start: Test the Domain Layer

Add this at the top of your `<script>` section in `tasklist (1).html`:

```html
<script type="module">
  // Import domain modules
  import { 
    LANE_STAGES, 
    MATRIX_STAGES, 
    MATRIX_LANES, 
    DEFAULT_BOARD_COLUMNS,
    FILE_STATUSES 
  } from './src/domain/schema.js';
  
  import { 
    getMatrixStage, 
    isTaskBlocked, 
    getAllTasks as getAllTasksModel 
  } from './src/domain/models.js';
  
  import { appStore } from './src/state/store.js';
  import { today, parseDate, dueLabel } from './src/utils/dates.js';
  import { esc, fileIcon } from './src/utils/strings.js';
  
  // Make available globally for existing inline handlers
  // (This is temporary - eventually inline handlers will be refactored)
  window.LANE_STAGES = LANE_STAGES;
  window.MATRIX_STAGES = MATRIX_STAGES;
  window.MATRIX_LANES = MATRIX_LANES;
  window.DEFAULT_BOARD_COLUMNS = DEFAULT_BOARD_COLUMNS;
  window.FILE_STATUSES = FILE_STATUSES;
  
  // Wrap functions that need access to current state
  window.getMatrixStage = (task) => {
    const allTasks = getAllTasksModel(appStore.tasks, appStore.projects);
    return getMatrixStage(task, allTasks);
  };
  
  window.isTaskBlocked = (task) => {
    const allTasks = getAllTasksModel(appStore.tasks, appStore.projects);
    return isTaskBlocked(task, allTasks);
  };
  
  window.getAllTasks = () => getAllTasksModel(appStore.tasks, appStore.projects);
  window.today = today;
  window.parseDate = parseDate;
  window.dueLabel = dueLabel;
  window.esc = esc;
  window.fileIcon = fileIcon;
  window.appStore = appStore;
</script>
```

## Step-by-Step Migration

### Step 1: Remove Duplicate Constants

In your HTML file, find and remove:
```js
const LANE_STAGES = { ... };  // DELETE - now in schema.js
const MATRIX_STAGES = [...];   // DELETE - now in schema.js
const MATRIX_LANES = [...];    // DELETE - now in schema.js
const DEFAULT_BOARD_COLUMNS = [...]; // DELETE - now in schema.js
```

### Step 2: Replace Function Definitions

Find and replace:
```js
// OLD
function getMatrixStage(task) {
  if (task.done) return 'ready';
  if (isTaskBlocked(task)) return 'blocked';
  // ...
}

// NEW - just use the imported function
// (Already available via window.getMatrixStage)
```

### Step 3: Update State Access (Gradually)

Start with one function at a time:

```js
// OLD
async function render() {
  const allTasks = [...tasks, ...projects.flatMap(p => p.subtasks || [])];
  // ...
}

// NEW
async function render() {
  const { tasks, projects } = appStore.getState();
  const allTasks = getAllTasks(); // Uses store internally
  // ...
}
```

### Step 4: Update State Mutations

```js
// OLD
async function addTask() {
  tasks.push(newTask);
  await save();
  render();
}

// NEW
async function addTask() {
  const { tasks } = appStore.getState();
  const newTasks = [...tasks, newTask];
  appStore.setTasks(newTasks);
  await save();
  render();
}
```

## Testing After Each Step

1. Load the app
2. Create a task
3. Create a project
4. Open workflow matrix
5. Drag tasks around
6. Verify everything still works

## Next Steps

Once domain layer is integrated:
1. Extract UI rendering functions to `src/ui/`
2. Extract view logic to `src/pages/`
3. Clean up HTML file (remove duplicate code)

## Benefits You'll See Immediately

- Constants defined once (no duplication)
- Domain logic testable (pure functions)
- Clear boundaries (domain vs UI vs storage)
- Easier to add features (compose existing pieces)
