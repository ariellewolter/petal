# Phase 2 Checklist: Wiring Store and Handlers

## ✅ Completed

- [x] Implement appStore with getState/setState/subscribe pattern
- [x] Create handlers module (src/ui/handlers.js)
- [x] Create persistence layer with debounced save
- [x] Create validation layer
- [x] Create path resolver for file links
- [x] Update domain functions to take explicit parameters (no store peeking)

## 🔄 To Do

### 1. Update HTML to use modules

- [ ] Add module import script to HTML
- [ ] Create window.Petal namespace (single integration point)
- [ ] Remove duplicate constant definitions from HTML
- [ ] Remove duplicate function definitions from HTML

### 2. Wire subscriptions

- [ ] Call `initPersistence()` once during app init
- [ ] Wire `appStore.subscribe(render)` once
- [ ] Verify auto-save works (check console for "Persistence layer initialized")

### 3. Update inline handlers

- [ ] Replace `onclick="addTask()"` with `onclick="Petal.handlers.addTask(...)"`
- [ ] Replace `onclick="addProject()"` with `onclick="Petal.handlers.addProject(...)"`
- [ ] Replace all direct state mutations with `Petal.store.setState(...)`
- [ ] Remove all `await save(); render();` calls from handlers

### 4. Update existing functions

- [ ] Update `render()` to use `Petal.store.getState()`
- [ ] Update `getAllTasks()` to use `Petal.getAllTasks()`
- [ ] Update `isTaskBlocked()` to use `Petal.isTaskBlocked()`
- [ ] Update `getMatrixStage()` to use `Petal.getMatrixStage()`

### 5. Test behavior preservation

- [ ] Create a task - verify it appears and saves
- [ ] Create a project - verify it appears and saves
- [ ] Open workflow matrix - verify it displays correctly
- [ ] Drag tasks in kanban - verify order persists
- [ ] Toggle task done - verify state updates
- [ ] Check console for errors

### 6. Add validation (optional but recommended)

- [ ] Call `validateState()` after load in dev mode
- [ ] Call `validateLoadedState()` when loading from storage
- [ ] Add console warnings for validation failures

## Key Principles

1. **Single namespace**: Only `window.Petal`, no other globals
2. **Explicit parameters**: Domain functions take state, don't peek into store
3. **Automatic persistence**: Save happens via subscription, not manual calls
4. **Automatic rendering**: Render happens via subscription, not manual calls
5. **Pure rendering**: Render functions take state, don't access store directly

## Common Pitfalls to Avoid

❌ **Don't do this:**
```js
// Peeking into store
window.getMatrixStage = (task) => getMatrixStage(task, appStore.tasks);

// Manual save/render
async function addTask() {
  tasks.push(newTask);
  await save();
  render();
}

// Multiple globals
window.LANE_STAGES = ...;
window.MATRIX_STAGES = ...;
window.getMatrixStage = ...;
```

✅ **Do this instead:**
```js
// Single namespace
window.Petal = { store, handlers, getMatrixStage: (task) => {
  const state = appStore.getState();
  return getMatrixStage(task, state.tasks);
}};

// Store mutation (auto-saves and re-renders)
Petal.handlers.addTask(taskData);

// Or direct store usage
const state = Petal.store.getState();
Petal.store.setState({ tasks: [...state.tasks, newTask] });
```
