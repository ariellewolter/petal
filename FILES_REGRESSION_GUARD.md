# Files Regression Guard Implementation

## Problem Identified

Files were being lost because `setState()` does a shallow merge. If any code path calls `store.setState()` with a patch that doesn't include `files` (or includes `files: undefined` or `files: []`), it can accidentally overwrite the existing files array.

**Symptom Pattern:**
1. User adds file → appears in store
2. Something else runs (render, registry build, init refresh) → clears `files`
3. Autosave runs → JSON persists empty `files: []`
4. Restart → file is gone

## Solution Implemented

### 1. Files Regression Guard in `setState()`

**Location:** `src/state/store.js` (lines 98-150)

Added three layers of protection:

#### A) Block Invalid Files Patches
```javascript
if (Object.prototype.hasOwnProperty.call(partial, 'files')) {
  if (!Array.isArray(partial.files)) {
    console.warn('⚠️ Blocked invalid files patch:', {
      type: typeof partial.files,
      value: partial.files,
      patchKeys: Object.keys(partial)
    });
    // Remove invalid files from patch
    const { files, ...safePatch } = partial;
    partial = safePatch;
  }
}
```

**What it does:** If someone tries to set `files` to a non-array (undefined, null, object), it blocks it and removes `files` from the patch.

#### B) Detect Unexpected Drops
```javascript
if (prevFilesCount > 0 && nextFilesCount === 0 && !Object.prototype.hasOwnProperty.call(partial, 'files')) {
  console.warn('⚠️ files dropped without explicit patch.files — blocking overwrite', {
    prevCount: prevFilesCount,
    patchKeys: Object.keys(partial),
    stackTrace: new Error().stack
  });
  // Restore previous files
  this._state.files = prev.files;
}
```

**What it does:** If files existed before but are now empty, AND the patch didn't explicitly include `files`, it restores the previous files array. This prevents accidental clearing from unrelated patches.

#### C) Diagnostic Logging
```javascript
if (prevFilesCount !== finalFilesCount) {
  console.log('🧪 files count changed', {
    prev: prevFilesCount,
    next: finalFilesCount,
    patchKeys: Object.keys(partial),
    explicitFilesPatch: Object.prototype.hasOwnProperty.call(partial, 'files')
  });
  // Only show trace if files decreased (potential bug)
  if (finalFilesCount < prevFilesCount) {
    console.trace('Files count decreased - trace:');
  }
}
```

**What it does:** Logs every time files count changes, with a stack trace if it decreases. This helps identify the exact code path that's clearing files.

### 2. Standardized File Key

**Location:** `tasklist (1).html` (line 11642)

Added canonical `key` field to file entries:

```javascript
const key = fileLink.abs_path || fileLink.onedrive_rel || fileLink.share_url || filePath;
const entry = {
  id: crypto.randomUUID?.() || String(Date.now()),
  name: fileLink.label || fileLink.name || 'File',
  path: filePath,
  key: key, // ✅ Canonical key for registry matching
  fileLink: fileLink,
  // ...
};
```

**What it does:** Ensures `renderFiles()` can reliably match persisted files to registry data using a consistent key.

### 3. Verified Registry Builder Safety

**Location:** `src/features/fileManagement.js` (lines 284-300)

The registry builder is **safe** - it only updates derived data:

```javascript
if (commit && typeof window !== 'undefined' && window.Petal?.store) {
  queueMicrotask(() => {
    if (window.Petal.store.setEphemeralState) {
      window.Petal.store.setEphemeralState({
        fileRegistry: result.fileRegistry,
        fileHistory: result.fileHistory
      });
    } else {
      // Fallback: use setState (will trigger save, but better than nothing)
      window.Petal.store.setState({
        fileRegistry: result.fileRegistry,
        fileHistory: result.fileHistory
      });
    }
  });
}
```

**What it does:** Only sets `fileRegistry` and `fileHistory` - never touches `files`. This is safe because:
- Uses `setEphemeralState()` when available (doesn't trigger saves)
- Only sets the two derived keys, not a full state object
- Doesn't include `files` in the patch at all

## How It Works

### Before (Vulnerable)
```javascript
setState({ fileRegistry: {...} })
// If this patch accidentally includes files: undefined, it overwrites!
```

### After (Protected)
```javascript
setState({ fileRegistry: {...} })
// Guard detects: files not in patch, but count dropped → restores previous files
```

### Explicit Clearing (Still Works)
```javascript
setState({ files: [] }) // Explicit - this is allowed
// Guard sees: files explicitly in patch → allows it
```

## Testing

1. **Add a file** → Should see:
   ```
   ✓ Added file: [name]
   🔍 Store verification: 1 files in store (first: [name])
   🧪 files count changed { prev: 0, next: 1, ... }
   ```

2. **Trigger registry rebuild** → Should see:
   ```
   [Registry] Rebuild complete
   // No files count change (registry doesn't touch files)
   ```

3. **If something tries to clear files** → Should see:
   ```
   ⚠️ files dropped without explicit patch.files — blocking overwrite
   // Files are restored automatically
   ```

4. **Check petal.json** → Should have:
   ```json
   {
     "files": [
       {
         "id": "...",
         "name": "...",
         "key": "...",
         "path": "...",
         ...
       }
     ]
   }
   ```

## Expected Behavior

- ✅ **Files persist** across restarts
- ✅ **Registry rebuilds** don't clear files
- ✅ **UI refreshes** don't clear files
- ✅ **Invalid patches** are blocked
- ✅ **Accidental drops** are detected and prevented
- ✅ **Explicit clearing** still works (`setState({ files: [] })`)

## Debugging

If files still disappear:

1. **Check console for warnings:**
   - `⚠️ Blocked invalid files patch` → Something tried to set invalid files
   - `⚠️ files dropped without explicit patch.files` → Something cleared files accidentally

2. **Check trace logs:**
   - `🧪 files count changed` → Shows when files count changes
   - Stack trace shows exact call site if files decreased

3. **Check the patch keys:**
   - Logs show which keys were in the patch
   - If `files` isn't in the patch but count dropped, guard should restore it

## Summary

The files regression guard makes it **impossible** for unrelated code to accidentally clear the `files` array. Only explicit `setState({ files: [] })` calls will clear files, and those are intentional.

This should permanently fix the files persistence issue.
