# Code Snippets for Files Persistence Analysis

## 1. `exportState()` - Store Export Function

**Location:** `src/state/store.js` (lines 328-375)

```javascript
exportState() {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION, // Always include current schema version
    tasks: this._state.tasks,
    projects: this._state.projects,
    openProjects: Array.isArray(this._state.openProjects) 
      ? this._state.openProjects 
      : [],
    settings: this._state.settings,
    events: this._state.events,
    recurringRules: this._state.recurringRules,
    habits: Array.isArray(this._state.habits) ? this._state.habits : [],
    habitCheckins: this._state.habitCheckins && typeof this._state.habitCheckins === 'object' ? this._state.habitCheckins : {},
    routines: Array.isArray(this._state.routines) ? this._state.routines : [],
    routineCheckins: this._state.routineCheckins && typeof this._state.routineCheckins === 'object' ? this._state.routineCheckins : {},
    files: Array.isArray(this._state.files) ? this._state.files : [], // ✅ Line 343
    workflow: this._state.workflow || {
      // ... workflow defaults
    }
    // fileRegistry and fileHistory are excluded (derived data)
  };
}
```

**Key Points:**
- ✅ `files` is included on line 343
- ✅ Uses `this._state.files` directly (same snapshot as tasks/projects)
- ✅ Falls back to `[]` if not an array
- ⚠️ No explicit logging of files count here

---

## 2. `addFileToRegistry()` - Add File Function

**Location:** `tasklist (1).html` (lines 11615-11680)

```javascript
async function addFileToRegistry() {
  if (!window.electronAPI || !window.electronAPI.chooseFile) {
    alert('File picker is only available in the desktop app.');
    return;
  }
  
  try {
    const fileLink = await window.electronAPI.chooseFile();
    if (!fileLink) {
      return; // User cancelled
    }
    
    // Get file metadata
    const metadata = await refreshFileMetadata(fileLink);
    
    // Phase 3 Fix: Add to persisted files list (not computed registry)
    const store = window.Petal?.store;
    if (!store) {
      console.error('Store not available');
      return;
    }
    
    const state = store.getState();
    const nextFiles = [...(state.files || [])]; // ✅ Line 11638: Gets current files
    
    // Create file entry
    const filePath = fileLink.onedrive_rel || fileLink.abs_path || fileLink.share_url || '';
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
    
    // Check if file already exists (by path)
    const already = nextFiles.some(f => f.path === entry.path);
    if (!already) {
      nextFiles.unshift(entry); // Add to beginning
      store.setState({ files: nextFiles }); // ✅ Line 11657: Updates store
      
      // Track file open
      await trackFileOpen(fileLink);
      
      // Refresh file view
      if (currentView === 'files') {
        render();
      } else {
        // Switch to files view
        switchView('files');
      }
      
      // Show success message
      console.log(`✓ Added file: ${entry.name}`); // ✅ Line 11678: Logs success
    } else {
      console.log(`File already exists: ${entry.name}`);
    }
  } catch (error) {
    console.error('Error adding file:', error);
    alert('Error adding file: ' + error.message);
  }
}
```

**Key Points:**
- ✅ Gets current files from store: `state.files || []`
- ✅ Creates new entry with proper structure
- ✅ Updates store: `store.setState({ files: nextFiles })`
- ✅ Logs success: `✓ Added file: ${entry.name}`
- ⚠️ No explicit verification that store actually has the file after setState

---

## 3. `renderFiles()` - Files View Renderer

**Location:** `src/ui/renderFiles.js` (lines 14-177)

```javascript
export async function renderFiles(containerEl, state, handlers) {
  const { files: persistedFiles, fileRegistry, fileHistory, currentFileView, currentFileProjectFilter, tasks, projects } = state;
  
  // ... container setup ...
  
  // Phase 3 Fix: Read from persisted files list (authoritative), not computed registry
  // files = authoritative user-added file entries (persisted)
  // fileRegistry = derived index used for fast lookup (optional, can be computed)
  let files = Array.isArray(persistedFiles) ? persistedFiles : []; // ✅ Line 51: Uses persistedFiles
  
  // Always build/refresh registry to ensure we have all files from tasks/projects
  let registryToUse = fileRegistry || {};
  if (window.Petal?.features?.fileManagement?.buildFileRegistry) {
    try {
      const result = window.Petal.features.fileManagement.buildFileRegistry({
        tasks: tasks || [],
        projects: projects || [],
        fileRegistry: fileRegistry || {},
        fileHistory: fileHistory || {},
        files: persistedFiles || []
      }, { commit: false });
      registryToUse = result.fileRegistry || {};
    } catch (e) {
      console.error('Error building file registry:', e);
    }
  }
  
  // ⚠️ FALLBACK: If no persisted files, use all files from registry (not just standalone)
  if (files.length === 0 && registryToUse && Object.keys(registryToUse).length > 0) {
    // Get all files from registry
    files = Object.values(registryToUse); // ⚠️ Line 77: Falls back to registry
    
    // Convert registry format to file format for rendering
    files = files.map(f => {
      const fileLink = f.fileLink || f;
      return {
        ...f,
        fileLink: fileLink,
        key: f.key || fileLink.abs_path || fileLink.onedrive_rel || fileLink.share_url,
        name: f.name || fileLink.label || fileLink.name || 'File',
        tasks: f.tasks || [],
        projects: f.projects || []
      };
    });
  } else if (files.length > 0) {
    // If we have persisted files, enrich them with registry data if available
    files = files.map(f => {
      const fileKey = f.key || f.fileLink?.abs_path || f.fileLink?.onedrive_rel || f.fileLink?.share_url;
      const registryFile = registryToUse[fileKey];
      if (registryFile) {
        // Merge registry data (tasks, projects) with persisted file
        return {
          ...f,
          tasks: registryFile.tasks || f.tasks || [],
          projects: registryFile.projects || f.projects || []
        };
      }
      return f;
    });
  }
  
  // ... filtering and rendering ...
}
```

**Key Points:**
- ✅ **Primary source:** `persistedFiles` from state (line 51)
- ⚠️ **Fallback:** If `files.length === 0`, uses registry (line 75-90)
- ⚠️ **This fallback could mask the bug** - if files aren't persisting, registry fallback makes UI look fine
- ✅ Enriches persisted files with registry data (tasks/projects links)

---

## 4. Persistence Logging (Updated)

**Location:** `src/storage/persistence.js` (lines 108-143)

```javascript
// Release-Safe: Explicit files count logging to catch persistence issues
const filesCount = stateToSave.files?.length ?? 0;
const tasksCount = stateToSave.tasks?.length ?? 0;
const projectsCount = stateToSave.projects?.length ?? 0;

console.log('💾 SAVE start:', {
  tasks: tasksCount,
  projects: projectsCount,
  files: filesCount, // ✅ Explicit files count
  filesFirst: filesCount > 0 ? stateToSave.files[0]?.name : null,
  timestamp: new Date().toISOString()
});

// Warn if files should exist but don't
if (filesCount === 0 && typeof window !== 'undefined' && window.Petal?.store) {
  const currentState = window.Petal.store.getState();
  const currentFilesCount = currentState.files?.length ?? 0;
  if (currentFilesCount > 0) {
    console.warn('⚠️ WARNING: files count mismatch! Store has', currentFilesCount, 'files but snapshot has', filesCount);
  }
}

// ... save operation ...

console.log('✅ SAVE success:', {
  timestamp: new Date().toISOString(),
  tasks: tasksCount,
  projects: projectsCount,
  files: filesCount, // ✅ Explicit files count
  filesFirst: filesCount > 0 ? stateToSave.files[0]?.name : null
});
```

**Key Points:**
- ✅ Now explicitly logs files count
- ✅ Warns if store has files but snapshot doesn't
- ✅ Shows first file name if files exist

---

## Analysis Summary

### Potential Issues:

1. **exportState() looks correct** - includes files from `this._state.files`
2. **addFileToRegistry() looks correct** - updates store with `setState({ files: nextFiles })`
3. **renderFiles() has fallback** - could mask the bug by using registry when files are empty
4. **Persistence logging now explicit** - will catch mismatches

### Debugging Steps:

1. **After adding file:** Check `window.Petal.store.getState().files.length` in DevTools
2. **After save:** Check console for `💾 SAVE start:` - should show `files: 1` (or more)
3. **Check petal.json:** Should have `"files": [{...}]` array
4. **After restart:** Check `renderFiles()` - should use persistedFiles, not registry fallback

### 5. `createImmutableSnapshot()` - Snapshot Function

**Location:** `src/storage/persistence.js` (lines 234-256)

```javascript
function createImmutableSnapshot(state) {
  // Clone arrays and top-level objects to prevent mutation
  return {
    tasks: state.tasks ? state.tasks.map(t => ({ ...t })) : [],
    projects: state.projects ? state.projects.map(p => ({ ...p })) : [],
    openProjects: state.openProjects ? Array.from(state.openProjects) : [],
    settings: state.settings ? { ...state.settings } : {},
    events: state.events ? state.events.map(e => ({ ...e })) : [],
    recurringRules: state.recurringRules ? state.recurringRules.map(r => ({ ...r })) : [],
    habits: state.habits ? state.habits.map(h => ({ ...h })) : [],
    habitCheckins: state.habitCheckins ? { ...state.habitCheckins } : {},
    routines: state.routines ? state.routines.map(r => ({ ...r })) : [],
    routineCheckins: state.routineCheckins ? { ...state.routineCheckins } : {},
    files: state.files ? state.files.map(f => ({ ...f })) : [], // ✅ Line 248: Files included
    workflow: state.workflow ? {
      // ... workflow cloning
    } : {},
    // fileRegistry and fileHistory are excluded (derived data)
  };
}
```

**Key Points:**
- ✅ **Files ARE included** on line 248
- ✅ Clones files array: `state.files.map(f => ({ ...f }))`
- ✅ Falls back to `[]` if files is falsy

---

## Analysis Summary

### Code Path Verification:

1. ✅ **addFileToRegistry()** → `store.setState({ files: nextFiles })`
2. ✅ **Store state** → `this._state.files` contains the file
3. ✅ **exportState()** → `files: Array.isArray(this._state.files) ? this._state.files : []`
4. ✅ **createImmutableSnapshot()** → `files: state.files ? state.files.map(f => ({ ...f })) : []`
5. ✅ **Persistence logging** → Now explicitly logs files count

### Most Likely Issue:

**If files are in store but not in JSON:**
- ✅ All code paths look correct
- ⚠️ **Possible timing issue:** Files added but save happens before state propagates?
- ⚠️ **Possible state mutation:** Something clearing files after add but before save?

**If files are in JSON but not in UI:**
- ⚠️ **renderFiles() fallback** - Uses registry when `files.length === 0`, which could mask persisted files
- ⚠️ **loadState()** - Need to verify files are loaded correctly

### Next Steps:

1. **Add explicit verification in addFileToRegistry():**
   ```javascript
   store.setState({ files: nextFiles });
   // Verify immediately
   const verify = store.getState().files;
   console.log('✅ Store verification:', verify.length, 'files', verify[0]?.name);
   ```

2. **Check timing:** Add file, wait 1 second, then check store again

3. **Check petal.json directly:** Open file and search for `"files"`
