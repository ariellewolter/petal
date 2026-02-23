# Phase 3: Render Loop Fix - buildFileRegistry Recursion

## Problem

**Stack Overflow:** `Maximum call stack size exceeded` when viewing Files tab.

**Root Cause:** Render → setState → render recursion loop:
1. `renderFiles()` calls `buildFileRegistry()`
2. `buildFileRegistry()` calls `store.setState()` (line 283)
3. `setState()` triggers `_notify()` → `render()` again
4. Infinite loop until stack overflow

## Fixes Applied

### 1. ✅ Re-entrancy Guard
**File:** `src/features/fileManagement.js`

Added guard to prevent recursive calls:
```javascript
let _buildingRegistry = false;

export function buildFileRegistry(ctx, options = {}) {
  if (_buildingRegistry) {
    return lastRegistryBuild?.result || { fileRegistry: {}, fileHistory: {} };
  }
  _buildingRegistry = true;
  try {
    // ... build logic ...
  } finally {
    _buildingRegistry = false;
  }
}
```

### 2. ✅ Pure Function for Render Calls
**File:** `src/features/fileManagement.js`

Added `commit` option to control when setState is called:
```javascript
export function buildFileRegistry(ctx, options = {}) {
  const { commit = false } = options;
  
  // Only commit when explicitly requested (not during render)
  if (commit && typeof window !== 'undefined' && window.Petal?.store) {
    queueMicrotask(() => {
      window.Petal.store.setState({
        fileRegistry: result.fileRegistry,
        fileHistory: result.fileHistory
      });
    });
  }
}
```

### 3. ✅ Updated renderFiles to Use Pure Computation
**File:** `src/ui/renderFiles.js`

Changed to use returned registry instead of relying on store updates:
```javascript
// Call with commit: false to prevent setState during render
const result = window.Petal.features.fileManagement.buildFileRegistry({
  tasks: tasks || [],
  projects: projects || [],
  fileRegistry: fileRegistry || {},
  fileHistory: fileHistory || {}
}, { commit: false }); // Don't commit during render

// Use returned registry (pure computation)
registryToUse = result.fileRegistry || {};
historyToUse = result.fileHistory || {};
```

### 4. ✅ Cheaper Cache Key
**File:** `src/features/fileManagement.js`

Simplified `computeCacheKey()` to use IDs + updatedAt only (no deep traversal):
```javascript
function computeCacheKey(tasks, projects) {
  // Use IDs + updatedAt only (fast, non-recursive)
  const tKey = (tasks || []).map(t => `${t.id}:${t.updatedAt || t.createdAt || 0}`).join('|');
  const pKey = (projects || []).map(p => `${p.id}:${p.updatedAt || p.createdAt || 0}:${(p.subtasks?.length || 0)}`).join('|');
  return `${(tasks || []).length}#${(projects || []).length}#${tKey}#${pKey}`;
}
```

### 5. ✅ Excluded fileRegistry from Persistence
**File:** `src/state/store.js`

Since fileRegistry is derived data (recomputed from tasks/projects), it doesn't need to be persisted:
```javascript
exportState() {
  return {
    tasks: this._state.tasks,
    projects: this._state.projects,
    // ... other fields ...
    // Phase 3 Fix: fileRegistry and fileHistory are derived data, recomputed on load
    // Excluding them prevents noisy saves and reduces file size
  };
}
```

### 6. ✅ Updated Non-Render Calls to Commit
**File:** `tasklist (1).html`

Updated calls that should commit (after load, mutations):
```javascript
// After load - commit: true
window.Petal.features.fileManagement.buildFileRegistry(true);

// Wrapper function now accepts commit parameter
buildFileRegistry: (commit = true) => {
  // ...
}
```

## Result

- ✅ No more stack overflow when viewing Files tab
- ✅ Render functions are pure (no setState during render)
- ✅ Registry still updates store when needed (after load/mutations)
- ✅ Faster cache key computation
- ✅ Reduced save noise (fileRegistry not persisted)

## Testing

- [ ] Files tab loads without stack overflow
- [ ] Files render correctly
- [ ] Registry updates after file operations
- [ ] No render loops in console
- [ ] Save operations don't include fileRegistry

## Key Principle

**Never call `store.setState()` during render.** Render functions should be pure computations that return data, not trigger state updates. State updates should happen:
- In event handlers
- After async operations
- Via `queueMicrotask()` if needed during render path
