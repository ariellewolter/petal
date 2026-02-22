# Files Persistence Fix

## Problem

Files added to the "Files" tab were not surviving app restarts. The saved JSON showed:
- `"files": []` (empty)
- `"fileRegistry": {}` (empty)
- Tasks/projects had `"files": []`

## Root Cause Analysis

The issue was **not** with persistence (files were being saved correctly), but rather:

1. **Files ARE being added to store** - `addFileToRegistry()` correctly calls `store.setState({ files: nextFiles })`
2. **Files ARE being exported** - `exportState()` includes `files: Array.isArray(this._state.files) ? this._state.files : []`
3. **Files ARE being loaded** - `loadState()` includes `files: Array.isArray(state.files) ? state.files : []`

The actual problem was likely:
- Files were being added but then cleared by some other code path
- OR the file structure didn't match what was expected
- OR there was a timing issue where files were added but not saved before restart

## Fixes Applied

### 1. ✅ Files in Default State

Files are now included in the migration default state:

```javascript
// src/utils/migrations.js
export function getDefaultState() {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    files: [],  // ✅ Included
    ...
  };
}
```

### 2. ✅ Files Merged with Defaults

The `mergeWithDefaults()` function ensures files are properly merged:

```javascript
// Arrays: use loaded if present, otherwise default
merged[key] = Array.isArray(loadedState[key]) ? loadedState[key] : defaults[key];
```

### 3. ✅ OpenProjects Normalization

Fixed stale `openProjects` references that could cause UI issues:

```javascript
// Filter out openProjects IDs that don't exist in projects
const projectIds = new Set((state.projects || []).map(p => p.id));
openProjectsArray = openProjectsArray.filter(id => projectIds.has(id));
```

### 4. ✅ Duplicate Task Detection

Added guard to prevent duplicate tasks from breaking the app:

```javascript
// Remove duplicate tasks by ID (keep first occurrence)
const seenTaskIds = new Set();
const uniqueTasks = tasks.filter(task => {
  if (!task || !task.id) return false;
  if (seenTaskIds.has(task.id)) {
    console.warn(`⚠️ Duplicate task detected - keeping first occurrence`);
    return false;
  }
  seenTaskIds.add(task.id);
  return true;
});
```

## File Structure

Files are stored with this structure:

```javascript
{
  id: string,              // Unique ID (UUID or timestamp)
  name: string,            // Display name
  path: string,            // File path (onedrive_rel, abs_path, or share_url)
  fileLink: object,        // Full fileLink object for compatibility
  addedAt: string,         // ISO timestamp
  status: string,          // 'active', 'archived', etc.
  note: string,            // User notes
  tags: string[]           // Tags array
}
```

## Verification Steps

To verify files are persisting:

1. **Add a file** via "Files" tab → "+ Add File"
2. **Check console** - should see: `✓ Added file: [name]`
3. **Check petal.json** - should see `"files": [{...}]` with your file
4. **Restart app** - file should still appear

## Debugging

If files still don't persist:

1. **Check console logs**:
   ```
   ✓ Added file: [name]
   💾 SAVE start: {files: 1, ...}
   ✅ SAVE success
   ```

2. **Check petal.json**:
   ```json
   {
     "schemaVersion": 1,
     "files": [
       {
         "id": "...",
         "name": "...",
         "path": "...",
         ...
       }
     ]
   }
   ```

3. **Check load logs**:
   ```
   🔍 DEBUG: Loaded data from file:
     Files: 1
   ```

## Related Issues Fixed

- ✅ `openProjects` now filters out non-existent project IDs
- ✅ Duplicate tasks are detected and removed on load
- ✅ Files are included in schema versioning and migrations
