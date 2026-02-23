# Phase 3: Persisted Files List Fix

## Problem

Files added in the Files tab were disappearing on restart because they were being stored in a **computed registry** (derived from tasks/projects) rather than a **persisted list**. When the app restarted, `buildFileRegistry()` rebuilt the registry from tasks/projects, and standalone files (not linked to any task/project) disappeared.

**Root Cause:** `fileRegistry` is an index, not a database. It's computed from `tasks` and `projects`, so standalone files don't survive restarts.

## Solution

Created a dedicated persisted `files` array in the store, separate from the computed `fileRegistry`.

**Architecture:**
- `files` = authoritative user-added file entries (persisted)
- `fileRegistry` = derived index used for fast lookup (optional, can be computed from files + tasks + projects)

---

## Changes Made

### 1. Added `files` Array to Store Default State

**File:** `src/state/store.js`

```js
this._state = {
  // ... existing fields ...
  fileRegistry: {},  // derived/computed, not persisted
  fileHistory: {},
  files: []          // persisted "Files" tab list
};
```

### 2. Updated `loadState()` to Load `files`

**File:** `src/state/store.js`

```js
loadState(state) {
  this._state = {
    // ... existing fields ...
    files: Array.isArray(state.files) ? state.files : []
  };
}
```

### 3. Updated `exportState()` to Save `files`

**File:** `src/state/store.js`

```js
exportState() {
  return {
    tasks: this._state.tasks,
    projects: this._state.projects,
    // ... other persisted fields ...
    files: Array.isArray(this._state.files) ? this._state.files : []
    // fileRegistry and fileHistory are still excluded (derived data)
  };
}
```

### 4. Updated Files View to Read from `state.files`

**File:** `src/ui/renderFiles.js`

**Before:** Read from computed `fileRegistry`
```js
let files = Object.values(registryToUse);
```

**After:** Read from persisted `files` list
```js
// Phase 3 Fix: Read from persisted files list (authoritative), not computed registry
let files = Array.isArray(persistedFiles) ? persistedFiles : [];

// Fallback: if no persisted files, try registry (for backward compatibility during migration)
if (files.length === 0 && fileRegistry && Object.keys(fileRegistry).length > 0) {
  // Extract standalone files from registry
  const registryFiles = Object.values(result.fileRegistry || {});
  files = registryFiles.filter(f => f.standalone === true);
}
```

### 5. Updated `addFileToRegistry()` to Write to `state.files`

**File:** `tasklist (1).html`

**Before:** Wrote to global `fileRegistry` object
```js
fileRegistry[key] = {
  ...fileLink,
  key,
  standalone: true
};
await save();
```

**After:** Writes to persisted `files` array
```js
const store = window.Petal?.store;
const state = store.getState();
const nextFiles = [...(state.files || [])];

const entry = {
  id: crypto.randomUUID?.() || String(Date.now()),
  name: fileLink.label || fileLink.name || 'File',
  path: filePath,
  fileLink: fileLink, // Store full fileLink for compatibility
  addedAt: new Date().toISOString(),
  status: 'active',
  note: '',
  tags: []
};

const already = nextFiles.some(f => f.path === entry.path);
if (!already) {
  nextFiles.unshift(entry);
  store.setState({ files: nextFiles }); // Triggers persistence save
}
```

### 6. Updated `renderFileCard()` to Handle Both Formats

**File:** `src/ui/renderFiles.js`

Now handles both:
- **Persisted files:** `{ id, name, path, fileLink, addedAt, ... }`
- **Registry files:** `{ key, label, onedrive_rel, abs_path, ... }` (for backward compatibility)

### 7. Added Debug Logs

**File:** `src/storage/persistence.js`

**Before save:**
```js
console.log('🧪 saving snapshot', { 
  files: (stateToSave.files || []).length, 
  first: (stateToSave.files || [])[0]?.name 
});
```

**File:** `tasklist (1).html`

**After load:**
```js
console.log('🧪 loaded snapshot', { 
  files: (loadedData.files || []).length, 
  first: (loadedData.files || [])[0]?.name 
});
```

---

## Expected Behavior

### Before:
1. User clicks "Add file" → file added to `fileRegistry` with `standalone: true`
2. App restarts → `buildFileRegistry()` rebuilds from tasks/projects
3. Standalone files disappear (not in tasks/projects)

### After:
1. User clicks "Add file" → file added to `state.files` array
2. Persistence saves `files` array to disk
3. App restarts → `files` array loaded from disk
4. Files view reads from `state.files` → files persist

---

## Testing Checklist

- [ ] Add a file in Files tab
- [ ] Check console: `🧪 saving snapshot` shows `files: 1`
- [ ] Restart app
- [ ] Check console: `🧪 loaded snapshot` shows `files: 1`
- [ ] Files view shows the added file
- [ ] File persists across restarts

---

## Debug Interpretation

### If `saving snapshot` shows `files: 0` immediately after adding:
→ File never written to persisted state (only updated derived registry)
→ Check `addFileToRegistry()` is calling `store.setState({ files })`

### If `saving snapshot` shows `files: 1` but `loaded snapshot` shows `files: 0`:
→ Persistence/load path is dropping files
→ Check `exportState()` includes `files`
→ Check `loadState()` loads `files`
→ Check storage layer saves/loads `files`

---

## Migration Notes

The code includes backward compatibility:
- If `state.files` is empty, falls back to extracting standalone files from `fileRegistry`
- This allows existing standalone files in registry to be migrated on first load
- Future: Could add migration code to move standalone registry files to `files` array

---

## Related Files

- `src/state/store.js` - Added `files` to state, `loadState()`, `exportState()`
- `src/ui/renderFiles.js` - Reads from `state.files` instead of `fileRegistry`
- `tasklist (1).html` - `addFileToRegistry()` writes to `state.files`
- `src/storage/persistence.js` - Debug logs for save/load
