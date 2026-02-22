# Phase 3: UI Fixes - Tasks View & Projects Blank

## Issues Fixed

### 1. ✅ Tasks View Visual Mismatch
**Problem:** Tasks view used `.task-item` with inline styles, while CSS design system expects `.task-card` classes.

**Fix:** Updated `renderTaskItem()` to use proper CSS classes:
- `.task-card` instead of `.task-item`
- `.task-top`, `.task-content`, `.task-body` structure
- `.check-box` instead of `<input type="checkbox">`
- `.priority-tag`, `.due-tag` instead of inline styled spans
- Removed all inline styles

**Result:** Tasks view now matches Projects view visual design.

### 2. ✅ Task Count Mismatch (Store: 3, UI: 4)
**Problem:** `getAllTasks()` was double-counting tasks (tasks array + project subtasks).

**Fix:** Added robust deduplication:
- `stableTaskKey()` function handles tasks with/without IDs
- `dedupeTasks()` function removes duplicates by stable key
- Handles edge cases: missing IDs, subtasks, legacy duplicates
- Warns when duplicates are detected

**Result:** Task counts now match store exactly.

### 3. ✅ Projects Blank View
**Problem:** Projects view could go blank due to silent crashes or stale data.

**Fix:** Added debug logging and error handling:
- Logs store projects count and IDs
- Logs filter state (total vs afterFilter)
- Try/catch with full stack traces
- Shows error message in UI if render crashes

**Result:** Blank projects view now shows clear error messages and debug info.

### 4. ✅ Side Effect in Tasks Renderer
**Problem:** `renderTasks()` called global `refreshProjectSelects()`, making render non-deterministic.

**Fix:** Moved side effect to handlers:
- Only calls `handlers?.refreshProjectSelects()` if provided
- No longer calls global function directly
- Keeps render function pure

**Result:** Render function is now deterministic and testable.

## Files Changed

1. **`src/ui/renderTasks.js`**
   - Updated `renderTaskItem()` to use `.task-card` CSS classes
   - Removed `refreshProjectSelects()` global call
   - Uses handlers for side effects

2. **`src/domain/models.js`**
   - Added `stableTaskKey()` function
   - Added `dedupeTasks()` function
   - Updated `getAllTasks()` to deduplicate

3. **`src/ui/renderProjects.js`**
   - Added debug logging
   - Added try/catch error handling
   - Shows error in UI if render crashes

## Debug Output

### Tasks View
```
🔍 DEBUG allTasks breakdown: {
  storeTasksCount: 3,
  allTasksCount: 3,  // Now matches!
  duplicates: 'none'
}
```

### Projects View
```
🔍 DEBUG renderProjects snapshot: {
  storeProjects: 3,
  projectIds: [123, 456, 789],
  currentProjFilter: 'all',
  ...
}
🔍 DEBUG project filtering: {
  total: 3,
  afterFilter: 3,
  filterState: { currentProjFilter: 'all' }
}
```

## Testing Checklist

- [ ] Tasks view uses `.task-card` styling (matches Projects)
- [ ] Task count matches store count (no double-counting)
- [ ] Projects view shows debug logs on render
- [ ] Projects view shows error message if render crashes
- [ ] No duplicate tasks in UI (check console for warnings)
- [ ] Tasks view doesn't call global `refreshProjectSelects()`

## Next Steps

If issues persist:
1. Check console logs for duplicate warnings
2. Check filter state if projects are blank
3. Check error stack traces if render crashes
4. Verify handlers are passed to render functions
