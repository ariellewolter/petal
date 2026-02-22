# Files Patch Trace Implementation

## Problem

Even with the files regression guard, files can still be cleared if code explicitly calls `setState({ files: [] })`. We need to catch **who** is making those calls.

## Solution Implemented

### 1. Explicit Files Patch Trace

**Location:** `src/state/store.js` (lines 105-130)

Added comprehensive tracing for ANY explicit files patch:

```javascript
if (Object.prototype.hasOwnProperty.call(partial, 'files')) {
  if (!Array.isArray(partial.files)) {
    // Block invalid patches (existing guard)
  } else {
    // Release-Safe: Trace ANY explicit files patch to catch who's clearing files
    const newLen = partial.files.length;
    console.log('🧨 files explicitly patched', {
      newLen: newLen,
      prevLen: prevFilesCount,
      willDecrease: newLen < prevFilesCount,
      willClear: newLen === 0 && prevFilesCount > 0,
      patchKeys: Object.keys(partial)
    });
    console.trace('files patch trace');
    
    // Extra protection: Block clearing files without explicit allow flag
    const allow = partial.__allowFilesOverwrite === true;
    if (!allow && newLen === 0 && prevFilesCount > 0) {
      console.warn('⚠️ Blocked files clear without explicit allow flag', {
        prevCount: prevFilesCount,
        patchKeys: Object.keys(partial),
        stackTrace: new Error().stack
      });
      // Remove files from patch to prevent clearing
      const { files, ...rest } = partial;
      partial = rest;
      // Don't update files count - keep previous
    }
  }
}
```

**What it does:**
- **Traces EVERY files patch** - not just when it decreases
- **Shows stack trace** - points to exact file + line
- **Extra protection** - blocks clearing files without `__allowFilesOverwrite: true` flag
- **Logs details** - shows if it will decrease or clear

### 2. Verified Save Pipeline

**Location:** `src/storage/persistence.js` (line 91)

The save pipeline is **correct**:

```javascript
const stateToSave = queuedState ? queuedState : createImmutableSnapshot(appStore.exportState());
```

- ✅ Uses `appStore.exportState()` which includes `files`
- ✅ Creates immutable snapshot which includes `files` (line 248)
- ✅ Logs files count explicitly

### 3. Fixed Import State

**Location:** `storage.js` (lines 209-225)

Fixed `importState()` to include `files`:

```javascript
if (merge) {
  return {
    tasks: [...current.tasks, ...(imported.tasks || [])],
    projects: [...current.projects, ...(imported.projects || [])],
    openProjects: [...new Set([...current.openProjects, ...(imported.openProjects || [])])],
    settings: { ...(current.settings || {}), ...(imported.settings || {}) },
    files: [...(current.files || []), ...(imported.files || [])], // ✅ Fixed
    events: [...(current.events || []), ...(imported.events || [])],
    recurringRules: [...(current.recurringRules || []), ...(imported.recurringRules || [])]
  };
} else {
  return {
    tasks: imported.tasks || [],
    projects: imported.projects || [],
    openProjects: imported.openProjects || [],
    settings: imported.settings || {},
    files: imported.files || [], // ✅ Fixed
    events: imported.events || [],
    recurringRules: imported.recurringRules || []
  };
}
```

**What it does:** Ensures import operations preserve files instead of dropping them.

### 4. Verified Load Path

**Location:** `tasklist (1).html` (line 3576)

The load path is **correct**:

```javascript
const stateToLoad = {
  tasks: loadedData.tasks || [],
  projects: loadedData.projects || [],
  // ...
  files: loadedData.files || [] // ✅ Includes files
};
window.Petal.store.loadState(stateToLoad);
```

## How to Use

### Normal Operation

When you add a file, you'll see:
```
✓ Added file: [name]
🔍 Store verification: 1 files in store (first: [name])
🧨 files explicitly patched { newLen: 1, prevLen: 0, willDecrease: false, willClear: false }
🧪 files count changed { prev: 0, next: 1, ... }
💾 SAVE start: { files: 1, ... }
```

### If Something Tries to Clear Files

You'll see:
```
🧨 files explicitly patched { newLen: 0, prevLen: 1, willDecrease: true, willClear: true }
files patch trace
    at [exact file and line that called setState]
⚠️ Blocked files clear without explicit allow flag
// Files are automatically preserved
```

### To Explicitly Clear Files (If Needed)

If you need a "Clear Files" feature, call:
```javascript
store.setState({ files: [], __allowFilesOverwrite: true });
```

This will:
- ✅ Allow the clear (because of the flag)
- ✅ Still log the trace (so you know it happened)
- ✅ Still show the stack trace (for debugging)

## Expected Behavior

1. **Add file** → Trace shows it was added
2. **Save** → Files included in save
3. **Restart** → Files loaded correctly
4. **If something tries to clear** → Blocked and logged with trace

## Debugging Workflow

1. **Launch app**
2. **Add file**
3. **Wait for save**
4. **Restart**
5. **Watch console for `🧨 files explicitly patched`**

The stack trace will point to the exact file and line that's clearing files (if anything is).

## Summary

- ✅ **Explicit files patch trace** - catches every files modification
- ✅ **Extra protection** - blocks clearing without allow flag
- ✅ **Save pipeline verified** - uses correct source
- ✅ **Import fixed** - includes files
- ✅ **Load path verified** - includes files

The trace will make it **impossible to miss** who's clearing files.
