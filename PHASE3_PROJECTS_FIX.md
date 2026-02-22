# Phase 3: Projects Blank View Fix

## Problem
Projects view renders but shows no cards and dropdown is empty, even though store has projects.

## Root Causes Identified

1. **`renderProjects()` reading from local variable, not store**
   - Was using `projects` local variable which could be stale
   - Fixed: Now reads from `store.getState().projects`

2. **`refreshProjectSelects()` reading from local variable**
   - Was using `projects` local variable for dropdown population
   - Fixed: Now reads from `store.getState().projects`

3. **`projectHTML()` reading from global `tasks` variable**
   - Was using global `tasks` variable for project metrics
   - Fixed: Now accepts `tasksFromStore` parameter from store

4. **No error handling**
   - Silent failures could cause blank UI
   - Fixed: Added try/catch with error logging

## Fixes Applied

### 1. `renderProjects()` - Store-Only Source
```javascript
// Before: Used local variable
let list = projects.filter(...)

// After: Reads from store
const state = store.getState();
const projectsFromStore = state.projects || [];
let list = projectsFromStore.filter(...)
```

### 2. `refreshProjectSelects()` - Store-Only Source
```javascript
// Before: Used local variable
projects.filter(p => !p.done).forEach(...)

// After: Reads from store
const projectsFromStore = state.projects || [];
projectsFromStore.filter(p => !p.done).forEach(...)
```

### 3. `projectHTML()` - Store-Only Source
```javascript
// Before: Used global variable
const projectTasks = tasks.filter(...)

// After: Accepts store data as parameter
function projectHTML(p, tasksFromStore, openProjectsFromStore) {
  const tasksToUse = tasksFromStore || tasks || [];
  const projectTasks = tasksToUse.filter(...)
}
```

### 4. Error Handling
- Added try/catch blocks to both functions
- Logs full stack traces on errors
- Shows error message in UI if render fails

### 5. Debug Logging
- Logs store projects count and IDs
- Compares with local variables for diagnosis
- Logs filter state to catch filter bugs

### 6. Persistence Guards
- Added assertion in persistence layer: `projects` must be array
- Warns if saving with 0 projects (may be expected)
- Prevents saving invalid state

## Debug Output

When projects view is blank, console will show:
```
🔍 DEBUG projects snapshot (renderProjects): {
  storeProjects: 3,  // Store has projects
  storeProjectIds: [123, 456, 789],
  localProjectsVar: 0,  // Local variable is stale!
  windowProjectsGetter: 3,  // Getter works
  ...
}
```

This immediately shows if:
- Store has data but local variable is stale (render bug)
- Store is empty (load/save bug)
- Filter is hiding everything (filter bug)

## Testing

After these fixes:
- [ ] Projects view shows cards when store has projects
- [ ] Dropdown populates when store has projects
- [ ] Console shows debug logs on render
- [ ] Errors are caught and logged (not silent)
- [ ] Persistence warns if saving with 0 projects

## Next Steps

If projects are still blank after this:
1. Check console logs for store projects count
2. Check if filter is hiding everything
3. Check if error is being thrown (stack trace)
4. Check persistence logs for save/load issues
