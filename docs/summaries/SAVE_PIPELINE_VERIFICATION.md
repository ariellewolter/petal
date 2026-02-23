# Save Pipeline Verification

## Complete Save Pipeline

### 1. Store Export (`src/state/store.js`)

**Function:** `exportState()`

```javascript
exportState() {
  // Truth log - this is the save payload source
  console.log('📦 exportState snapshot', {
    files: Array.isArray(this._state.files) ? this._state.files.length : 'not-array',
    first: this._state.files?.[0]?.name ?? null
  });
  
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    tasks: this._state.tasks,
    projects: this._state.projects,
    // ...
    files: Array.isArray(this._state.files) ? this._state.files : [], // ✅ Line 423
    // ...
  };
}
```

**What to check:** If this logs `files: 0` right after adding a file, the file was cleared before saving.

---

### 2. Persistence Snapshot (`src/storage/persistence.js`)

**Function:** `performSave()`

```javascript
const stateToSave = queuedState ? queuedState : createImmutableSnapshot(appStore.exportState());
```

**Function:** `createImmutableSnapshot()`

```javascript
function createImmutableSnapshot(state) {
  return {
    // ...
    files: state.files ? state.files.map(f => ({ ...f })) : [], // ✅ Line 248
    // ...
  };
}
```

**What to check:** The snapshot includes files and creates a deep copy.

---

### 3. Storage Adapter (`storage.js`)

**Function:** `saveState(state)`

```javascript
async saveState(state) {
  // Logs payload before sending
  console.log('📤 storage.js saveState payload', {
    files: filesCount,
    filesFirst: state.files?.[0]?.name ?? null,
    stateKeys: Object.keys(state),
    hasFiles: 'files' in state
  });
  
  const result = await window.electronAPI.saveState({
    schemaVersion: state.schemaVersion,
    tasks: state.tasks || [],
    projects: state.projects || [],
    // ...
    files: state.files || [], // ✅ Line 127
    // ...
  });
}
```

**What to check:** If this logs `files: 0`, the state object passed to `saveState()` doesn't have files.

---

### 4. Main Process IPC Handler (`main.js`)

**Function:** `ipcMain.handle('storage:save', ...)`

```javascript
ipcMain.handle('storage:save', async (event, state) => {
  // Logs payload received from renderer
  safeLog('📝 main save payload keys:', Object.keys(state));
  safeLog('📝 main save files:', Array.isArray(state.files) ? state.files.length : (state.files !== undefined ? typeof state.files : 'undefined'));
  
  const result = await writeDataFile(state);
  // ...
});
```

**What to check:** If this logs `files: 0` or `files: undefined`, the IPC transmission lost files.

---

### 5. File Writer (`main.js`)

**Function:** `writeDataFile(data)`

```javascript
async function writeDataFile(data) {
  const jsonData = JSON.stringify(data, null, 2);
  // Writes jsonData directly to file
  // No transformation, no key picking
}
```

**What to check:** This just stringifies the data object - if files are in `data`, they'll be in the JSON.

---

## Diagnostic Log Chain

When you add a file and save, you should see this chain:

1. **Store export:**
   ```
   📦 exportState snapshot { files: 1, first: "[filename]" }
   ```

2. **Persistence snapshot:**
   ```
   💾 SAVE start: { files: 1, ... }
   ```

3. **Storage adapter:**
   ```
   📤 storage.js saveState payload { files: 1, filesFirst: "[filename]", hasFiles: true }
   ```

4. **Main process:**
   ```
   📝 main save payload keys: [ 'schemaVersion', 'tasks', 'projects', 'files', ... ]
   📝 main save files: 1
   💾 Saved successfully to vault: ...
     Tasks: X, Projects: Y, Files: 1
   ```

5. **File content:**
   ```json
   {
     "schemaVersion": 1,
     "files": [
       {
         "id": "...",
         "name": "...",
         ...
       }
     ]
   }
   ```

## Failure Modes

### Mode 1: File never enters store
**Symptom:** `📦 exportState snapshot { files: 0 }` immediately after adding
**Cause:** `addFileToRegistry()` didn't actually update store
**Fix:** Check the `🧨 files explicitly patched` trace

### Mode 2: File cleared before save
**Symptom:** `📦 exportState snapshot { files: 1 }` then later `{ files: 0 }`
**Cause:** Something called `setState({ files: [] })` or similar
**Fix:** Check the `🧨 files explicitly patched` trace for the clear call

### Mode 3: File lost in IPC
**Symptom:** `📤 storage.js saveState payload { files: 1 }` but `📝 main save files: 0`
**Cause:** IPC serialization issue or payload transformation
**Fix:** Check IPC handler and serialization

### Mode 4: File lost in file write
**Symptom:** `📝 main save files: 1` but `petal.json` has `"files": []`
**Cause:** `writeDataFile()` is transforming the data
**Fix:** Check `writeDataFile()` implementation

## Test Protocol

1. **Start app**
2. **Add file** → Should see:
   ```
   ✓ Added file: [name]
   🔍 Store verification: 1 files in store
   🧨 files explicitly patched { newLen: 1, ... }
   📦 exportState snapshot { files: 1, first: "[name]" }
   ```

3. **Wait for save** → Should see:
   ```
   💾 SAVE start: { files: 1, ... }
   📤 storage.js saveState payload { files: 1, ... }
   📝 main save payload keys: [..., 'files', ...]
   📝 main save files: 1
   ✅ SAVE success: { files: 1, ... }
   ```

4. **Check petal.json** → Should have:
   ```json
   {
     "schemaVersion": 1,
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

5. **Restart app** → File should still appear

## Summary

The save pipeline is now fully instrumented with truth logs at every step:
- ✅ **Store export** - logs what's being exported
- ✅ **Persistence** - logs what's being saved
- ✅ **Storage adapter** - logs what's being sent to main
- ✅ **Main process** - logs what's received and written

If files disappear, the logs will show exactly where in the chain they're lost.
