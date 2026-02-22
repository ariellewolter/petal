# Phase 3: Blank Projects Fix - Deterministic Solutions

## Issues Fixed

### 1. ✅ Invariant Logging After Load
**Problem:** No way to verify store state matches expectations after load.

**Fix:** Added invariant logging that shows exact types:
```javascript
console.log('INVARIANT after load:', {
  projectsCount: storeState.projects?.length || 0,
  tasksCount: storeState.tasks?.length || 0,
  openProjectsType: 'Array' | 'Set' | typeof,
  openProjectsValue: [...],
  openProjectsLength: number
});
```

**Result:** Immediately shows if store has data when UI is blank.

### 2. ✅ Post-Render Check
**Problem:** No way to detect if DOM was overwritten after render.

**Fix:** Added post-render verification:
```javascript
setTimeout(() => {
  const projectCards = document.querySelectorAll('#project-container .project-card').length;
  const dropdownOptions = document.querySelectorAll('#in-project option, ...').length;
  console.log('POST-RENDER CHECK:', { projectCards, dropdownOptions, expectedProjects });
  
  if (list.length > 0 && projectCards === 0) {
    console.error('❌ DOM OVERWRITE DETECTED');
  }
}, 0);
```

**Result:** Detects if projects rendered but cards are missing (DOM overwrite).

### 3. ✅ forceHideAllForms() Guard
**Problem:** `forceHideAllForms()` could hide project container/view, causing blank UI.

**Fix:** Added guards to never hide critical UI:
```javascript
function forceHideAllForms() {
  // Never hide these
  const projectContainer = document.getElementById('project-container');
  const projectView = document.getElementById('view-projects');
  projectContainer.style.display = '';
  projectView.style.display = '';
  
  // Only hide known form elements
  // ...
}
```

**Result:** Project container/view always visible, forms still hidden.

### 4. ✅ Removed Duplicate setTimeout
**Problem:** `forceHideAllForms()` called twice (0ms and 50ms), increasing overwrite risk.

**Fix:** Removed second call, kept only one with post-render check.

**Result:** Single call reduces overwrite risk.

### 5. ✅ openProjects Normalized to Array
**Problem:** Store used Set for `openProjects`, causing JSON serialization issues and type mismatches.

**Fix:** Store now uses Array, renderers derive Set locally:
- Store: `openProjects: []` (Array)
- Renderers: `new Set(state.openProjects)` (derived locally)
- `setState()` accepts Set or Array, normalizes to Array
- `loadState()` normalizes to Array

**Result:** Single representation (Array), no type mismatches.

### 6. ✅ Empty Overwrite Guard
**Problem:** Bad saves or external modifications could overwrite projects with empty array.

**Fix:** Guard in `loadState()`:
```javascript
if (incomingProjects.length === 0 && currentProjects.length > 0) {
  console.warn('⚠️ BLOCKED empty project overwrite');
  state.projects = currentProjects; // Preserve existing
}
```

**Result:** Prevents data loss from bad saves.

### 7. ✅ Updated All openProjects Usage
**Problem:** Code still used Set methods (`.has()`, `.add()`, `.delete()`).

**Fix:** Updated handlers to use Array methods:
- `toggleProjectOpen()`: Uses `Array.includes()` and `filter()`
- `deleteProject()`: Uses `Array.filter()`
- `deleteHandlers`: Uses `Array.filter()`

**Result:** All code uses Array operations.

## Files Changed

1. **`src/state/store.js`**
   - `openProjects` stored as Array (not Set)
   - `loadState()` normalizes to Array
   - `setState()` accepts Set or Array, normalizes to Array
   - `getState()` returns Array copy
   - `exportState()` returns Array
   - Added empty overwrite guard

2. **`src/ui/renderProjects.js`**
   - Removed duplicate `setTimeout` call
   - Added post-render check
   - Normalizes `openProjects` to Set locally (for `.has()`)

3. **`tasklist (1).html`**
   - Added invariant logging after load
   - Updated `toggleProjectOpen()` to use Array
   - Updated `forceHideAllForms()` with guards

4. **`src/ui/handlers.js`**
   - Updated `deleteProject()` to use Array
   - Updated `toggleProjectOpen()` to use Array

5. **`src/features/deleteHandlers.js`**
   - Updated to use Array operations

## Debug Output

### After Load
```
INVARIANT after load: {
  projectsCount: 3,
  tasksCount: 5,
  openProjectsType: 'Array',
  openProjectsValue: [123, 456],
  openProjectsLength: 2
}
```

### After Render
```
POST-RENDER CHECK: {
  projectCards: 3,
  dropdownOptions: 4,
  expectedProjects: 3
}
```

### If DOM Overwrite
```
❌ DOM OVERWRITE DETECTED: Projects rendered but cards missing!
```

### If Empty Overwrite Blocked
```
⚠️ BLOCKED empty project overwrite - preserving existing projects
```

## Testing Checklist

- [ ] Projects load and render correctly
- [ ] Invariant log shows correct types after load
- [ ] Post-render check shows cards match expected count
- [ ] `forceHideAllForms()` doesn't hide project container
- [ ] `openProjects` works correctly (toggle, delete)
- [ ] Empty overwrite is blocked (test with bad save)
- [ ] No Set-related errors in console

## Root Cause Analysis

When projects go blank, check logs in this order:

1. **INVARIANT after load**: If `projectsCount === 0`, it's a load/save issue
2. **POST-RENDER CHECK**: If `projectCards === 0` but `expectedProjects > 0`, it's DOM overwrite
3. **Error stack**: If render crashed, check stack trace
4. **Filter state**: If `afterFilter === 0`, filter is hiding everything

## Next Steps

If issues persist:
1. Check invariant logs for type mismatches
2. Check post-render logs for DOM overwrites
3. Check for Set-related errors (should be none now)
4. Verify empty overwrite guard is working
