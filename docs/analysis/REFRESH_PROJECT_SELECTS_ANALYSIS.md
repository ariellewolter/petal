# `refreshProjectSelects()` Call Sites Analysis

## Summary

Found **6 call sites** for `refreshProjectSelects()`. Several have timing/state issues that could cause empty dropdowns.

---

## Call Sites

### ✅ 1. `src/ui/renderTasks.js:21` - **GOOD** (via handlers)
```js
if (handlers?.refreshProjectSelects) {
  handlers.refreshProjectSelects();
}
```
**Status:** ✅ Correct - Uses handler pattern, receives state from render function.

---

### ⚠️ 2. `tasklist (1).html:3211` - After migrations complete
```js
// In initialization function (after migrations)
refreshProjectSelects();
setupEventDelegation();
render();
```
**Context:** Called after migrations during app initialization.

**Potential Issues:**
- ⚠️ May be called before store is fully initialized
- ⚠️ Store might not have projects loaded yet
- ✅ Has try/catch in the function itself, but timing could still be wrong

**Fix Needed:** Ensure store is loaded before calling, or add guard:
```js
if (window.Petal?.store) {
  const state = window.Petal.store.getState();
  if (state.projects) {
    refreshProjectSelects();
  }
}
```

---

### ❌ 3. `tasklist (1).html:3770` - After import
```js
// In import handler
tasks = newState.tasks;
projects = newState.projects;  // ⚠️ Direct variable assignment
openProjects = new Set(newState.openProjects);
settings = newState.settings || {};
migrateTasksForKanban();
refreshProjectSelects();  // ⚠️ Called before store update
await save();
render();
```
**Status:** ❌ **CRITICAL ISSUE**

**Problems:**
1. Updates local `projects` variable directly (old pattern)
2. Calls `refreshProjectSelects()` BEFORE updating store
3. Store might not have the imported data yet
4. `refreshProjectSelects()` reads from store, so it will see OLD data

**Fix Needed:**
```js
// Update store FIRST
if (window.Petal?.store) {
  window.Petal.store.setState({
    tasks: newState.tasks,
    projects: newState.projects,
    openProjects: new Set(newState.openProjects || []),
    settings: newState.settings || {}
  });
} else {
  // Fallback
  tasks = newState.tasks;
  projects = newState.projects;
  openProjects = new Set(newState.openProjects);
  settings = newState.settings || {};
}

migrateTasksForKanban();
await save();
refreshProjectSelects();  // Now called AFTER store update
render();
```

---

### ✅ 4. `tasklist (1).html:5403` - After creating project
```js
// After creating new project
if (window.Petal?.store) {
  window.Petal.store.setState({
    projects: [newProject, ...state.projects]
  });
} else {
  projects.unshift(newProject);
  await save();
}
refreshProjectSelects();  // ✅ Called after store update
render();
```
**Status:** ✅ Correct - Updates store first, then refreshes.

---

### ❌ 5. `tasklist (1).html:7607` - In global `renderTasks()` fallback
```js
async function renderTasks(){
  refreshProjectSelects();  // ⚠️ Called without state check
  // ... rest of function
}
```
**Context:** This is the OLD global render function, used as fallback when UI module isn't available.

**Status:** ❌ **PROBLEMATIC**

**Problems:**
1. Called at the START of render, before checking if store is ready
2. No state validation
3. If store isn't loaded yet, `refreshProjectSelects()` will see empty projects array
4. This is the fallback path, so it might run during early initialization

**Fix Needed:**
```js
async function renderTasks(){
  // Only refresh if store is ready and has data
  if (window.Petal?.store) {
    const state = window.Petal.store.getState();
    if (state.projects) {
      refreshProjectSelects();
    }
  }
  // ... rest of function
}
```

---

### ⚠️ 6. `src/features/deleteHandlers.js:222` - After deleting project
```js
// After deleting project
if (typeof refreshProjectSelects === 'function') {
  refreshProjectSelects();
}
```
**Status:** ⚠️ **PARTIALLY SAFE**

**Problems:**
1. Checks if function exists (good)
2. But calls global version, which might not have updated state
3. Should use handler pattern if available

**Fix Needed:**
```js
// Prefer handler pattern
if (window.Petal?.handlers?.refreshProjectSelects) {
  const state = window.Petal.store?.getState();
  if (state) {
    window.Petal.handlers.refreshProjectSelects(state);
  }
} else if (typeof refreshProjectSelects === 'function') {
  refreshProjectSelects();
}
```

---

## Root Cause Analysis

### Why Dropdowns Are Empty

1. **Timing Issues:**
   - `refreshProjectSelects()` called before store is populated
   - Store might be empty during initialization
   - Import handler updates local vars but not store before calling

2. **State Source Mismatch:**
   - Some code updates local `projects` variable
   - `refreshProjectSelects()` reads from store
   - Store and local var can be out of sync

3. **Race Conditions:**
   - Multiple renders happening simultaneously
   - `forceHideAllForms()` might hide dropdowns after they're populated
   - Store updates happening asynchronously

---

## Recommended Fixes (Priority Order)

### 🔴 Priority 1: Fix Import Handler (Line 3770)
**Impact:** High - Import is a critical operation
**Fix:** Update store BEFORE calling `refreshProjectSelects()`

### 🟡 Priority 2: Fix Global `renderTasks()` (Line 7607)
**Impact:** Medium - Only affects fallback path
**Fix:** Add state validation before calling

### 🟡 Priority 3: Fix Initialization (Line 3211)
**Impact:** Medium - Affects app startup
**Fix:** Ensure store is loaded before calling

### 🟢 Priority 4: Improve Delete Handler (Line 222)
**Impact:** Low - Already has guard, just needs handler pattern
**Fix:** Use handler pattern if available

---

## Testing Checklist

After fixes, verify:
- [ ] Dropdowns populate correctly on app startup
- [ ] Dropdowns populate after importing data
- [ ] Dropdowns populate after creating new project
- [ ] Dropdowns populate after deleting project
- [ ] Dropdowns populate when switching to tasks view
- [ ] Dropdowns don't get cleared by `forceHideAllForms()`
