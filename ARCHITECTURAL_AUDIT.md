# 🔍 Full-System Deterministic Architectural Audit

**Date:** 2026-02-20  
**App:** Electron + HTML Modular Task Manager  
**Purpose:** Identify race conditions, state drift, vault issues, and double-save problems

---

## Executive Summary

This app suffers from **state architecture entropy** - multiple sources of truth, race conditions, and nondeterministic flows that cause:
- Projects not loading
- Tasks disappearing
- Planner not reflecting saved tasks
- Save failures or false success reports
- Vault resolution timing issues
- State inconsistencies between store, globals, and file persistence

**Root Cause:** The app has evolved into a small distributed system with multiple state sources, async boundaries, and cascading save triggers that create nondeterministic behavior.

---

## Phase 1 — State Architecture Map

### Current Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    ELECTRON MAIN PROCESS                        │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ VaultManager (async resolution)                          │  │
│  │   └─> vault:resolved event (timing-dependent)           │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ IPC Handlers                                              │  │
│  │   ├─> storage:load (requires vault resolved)             │  │
│  │   ├─> storage:save (requires vault resolved)             │  │
│  │   └─> writeDataFile (atomic write with temp file)        │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                            ↕ IPC
┌─────────────────────────────────────────────────────────────────┐
│                    RENDERER PROCESS                              │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ SOURCE OF TRUTH #1: AppStore (src/state/store.js)         │  │
│  │   ├─> _state: {tasks, projects, events, ...}             │  │
│  │   ├─> getState() → returns copy                           │  │
│  │   ├─> setState() → merges + _notify()                     │  │
│  │   └─> loadState() → replaces _state                        │  │
│  └──────────────────────────────────────────────────────────┘  │
│                            ↕                                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ SOURCE OF TRUTH #2: Window Globals                       │  │
│  │   ├─> window.tasks                                        │  │
│  │   ├─> window.projects                                     │  │
│  │   ├─> window.events                                       │  │
│  │   └─> window.recurringRules                               │  │
│  │   NOTE: Synced FROM store in render(), but also           │  │
│  │         written to directly in some places                │  │
│  └──────────────────────────────────────────────────────────┘  │
│                            ↕                                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ SOURCE OF TRUTH #3: Local Variables (tasklist.html)      │  │
│  │   ├─> let tasks = []                                      │  │
│  │   ├─> let projects = []                                  │  │
│  │   ├─> let events = []                                    │  │
│  │   └─> let recurringRules = []                            │  │
│  │   NOTE: Synced FROM store in render(), but also           │  │
│  │         mutated directly in many functions                │  │
│  └──────────────────────────────────────────────────────────┘  │
│                            ↕                                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Persistence Layer (src/storage/persistence.js)            │  │
│  │   ├─> Subscribes to store changes                        │  │
│  │   ├─> Debounced save (500ms)                             │  │
│  │   ├─> Calls storage.saveState()                          │  │
│  │   └─> FALLBACK: Uses window.projects if store missing   │  │
│  └──────────────────────────────────────────────────────────┘  │
│                            ↕                                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Storage Adapter (storage.js)                              │  │
│  │   ├─> loadState() → electronAPI.loadState()             │  │
│  │   └─> saveState() → electronAPI.saveState()              │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ File Registry (src/features/fileManagement.js)           │  │
│  │   ├─> Cached registry (lastRegistryBuild)                │  │
│  │   ├─> Rebuilt from tasks/projects                         │  │
│  │   └─> Also stored in store.fileRegistry                    │  │
│  │   NOTE: Can drift from source truth                       │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### State Sources Identified

1. **AppStore (`src/state/store.js`)**
   - **Fields:** tasks, projects, openProjects, settings, events, recurringRules, fileRegistry, fileHistory, UI state
   - **Mutation:** `setState()` merges partial updates
   - **Read:** `getState()` returns copy
   - **Load:** `loadState()` replaces entire state

2. **Window Globals**
   - **Fields:** `window.tasks`, `window.projects`, `window.events`, `window.recurringRules`, `window.fileRegistry`, `window.fileHistory`
   - **Mutation:** Direct assignment in multiple places
   - **Read:** Direct access throughout codebase
   - **Sync:** Synced FROM store in `render()`, but also written to directly

3. **Local Variables (tasklist.html)**
   - **Fields:** `let tasks`, `let projects`, `let events`, `let recurringRules`, etc.
   - **Mutation:** Direct mutation in many functions
   - **Read:** Used throughout inline functions
   - **Sync:** Synced FROM store in `render()`, but also mutated directly

4. **File Registry Cache**
   - **Fields:** `lastRegistryBuild.registry`
   - **Mutation:** Rebuilt from tasks/projects
   - **Read:** Used by file management functions
   - **Sync:** Can drift from source truth

### Architectural Violations

✅ **VIOLATION #1: Multiple Sources of Truth**
- Store, window globals, and local variables all hold state
- No single source of truth enforced
- Sync happens in one direction (store → globals) but mutations happen in all three

✅ **VIOLATION #2: Direct Mutations Outside Store**
- Many functions mutate `tasks` and `projects` arrays directly
- `window.tasks` and `window.projects` are written to directly
- Store is not always notified of changes

✅ **VIOLATION #3: Store Subscription Triggers Saves**
- `persistence.js` subscribes to store changes
- Every `setState()` triggers debounced save
- But direct mutations to globals don't trigger saves

---

## Phase 2 — Save Flow Integrity

### Save Flow Trace

```
User Action (e.g., addTask())
  ↓
Direct mutation: tasks.push(newTask)  ❌ BYPASSES STORE
  ↓
window.tasks = tasks  ❌ DIRECT ASSIGNMENT
  ↓
[OR] store.setState({tasks})  ✅ PROPER PATH
  ↓
store._notify() → triggers persistence subscription
  ↓
persistence.saveState() (debounced 500ms)
  ↓
storage.saveState(stateToSave)
  ↓
electronAPI.saveState(state)  (IPC)
  ↓
main.js: ipcMain.handle('storage:save')
  ↓
ensureVaultStructure()  ✅ Checks vault exists
  ↓
writeDataFile(state)
  ├─> Create backup
  ├─> Write to temp file
  ├─> fsync temp file
  ├─> Check for conflicts
  └─> Atomic rename: temp → data file
  ↓
Return {ok: true} or {ok: false, error}
```

### Issues Identified

**ISSUE #1: Save Can Report Success Before File Write Completes**
- `writeDataFile()` returns `{success: true}` after `rename()` succeeds
- But `fsync()` happens AFTER rename
- If app crashes between rename and fsync, data may be lost
- **Location:** `main.js:720` - rename happens before final sync

**ISSUE #2: Vault Not Resolved But Save Attempted**
- `storage:save` handler checks vault resolution
- But `persistence.js` doesn't check before calling `storage.saveState()`
- If vault not resolved, save fails silently or returns error
- **Location:** `src/storage/persistence.js:60` - no vault check

**ISSUE #3: Fallback to window.projects in Save**
- If store missing projects, persistence layer uses `window.projects`
- This is a band-aid that masks the real problem
- **Location:** `src/storage/persistence.js:49-51`

**ISSUE #4: Save Can Return True While File Write Failed**
- `writeDataFile()` catches errors and returns `{success: false}`
- But if `ensureVaultStructure()` throws, error may not be caught
- **Location:** `main.js:1154` - try-catch exists but may not cover all paths

**ISSUE #5: ENOENT Can Occur Silently**
- `ensureVaultStructure()` throws if directory creation fails
- But error handling in `writeDataFile()` may not propagate correctly
- **Location:** `main.js:504` - throws error, but caller may not handle

**ISSUE #6: Double-Save Mechanism**
- `persistence.js` subscribes to store changes (auto-save)
- But some code also calls `save()` directly
- This can cause two saves in quick succession
- **Location:** Multiple places call `save()` directly

---

## Phase 3 — Load Flow Integrity

### Load Flow Trace

```
App Start
  ↓
initState() (tasklist.html:2783)
  ↓
waitForVaultResolved() (polling, 15s timeout)
  ↓
[OR] vault:resolved event (event-driven, timing-dependent)
  ↓
storage.loadState()
  ↓
electronAPI.loadState() (IPC)
  ↓
main.js: ipcMain.handle('storage:load')
  ├─> Checks vault resolved ✅
  └─> readDataFile()
      ├─> ensureVaultStructure()
      ├─> Read petal.json
      ├─> Parse JSON (with corruption recovery)
      └─> Return {data, hasConflicts, ...}
  ↓
initState() extracts data
  ↓
store.loadState(stateToLoad)  ✅ LOADS INTO STORE
  ↓
store._notify() → triggers render subscription
  ↓
render() → syncs store to globals
  ├─> tasks = state.tasks
  ├─> window.tasks = tasks
  └─> window.projects = projects
```

### Issues Identified

**ISSUE #1: Race Condition - Load Before Vault Resolved**
- `initState()` has a warning but doesn't block if vault not resolved
- `waitForVaultResolved()` has 15s timeout, but load can proceed if timeout expires
- **Location:** `tasklist.html:2931-2933` - warning only, doesn't block

**ISSUE #2: UI Can Render Before State Load Completes**
- `store.loadState()` triggers `_notify()` immediately
- Render subscription fires before all state is fully loaded
- **Location:** `src/state/store.js:117` - `_notify()` called immediately after load

**ISSUE #3: Defaults Applied Inconsistently**
- `store.loadState()` applies defaults for missing fields
- But `storage.loadState()` also applies defaults
- Double-defaulting can mask missing data
- **Location:** `src/state/store.js:95-116` vs `storage.js:32-41`

**ISSUE #4: Store Can Be Loaded Before Vault Resolved**
- `initState()` checks vault but doesn't block
- If vault not resolved, load returns empty state
- But store is still loaded with empty state
- **Location:** `tasklist.html:2931-2948` - warning but proceeds

**ISSUE #5: Vault Resolution Timing Dependency**
- `vault:resolved` event is sent from main process
- But `initState()` also polls for resolution
- Two mechanisms can race
- **Location:** `tasklist.html:2792-2794` (event) vs `2756-2781` (polling)

---

## Phase 4 — Double Save / State Overwrite Audit

### Save Triggers Identified

1. **Auto-Save (persistence.js)**
   - Subscribes to store changes
   - Debounced 500ms
   - **Location:** `src/storage/persistence.js:93`

2. **Direct save() Calls**
   - Many functions call `save()` directly
   - Examples: `addTask()`, `updateTask()`, `deleteTask()`, etc.
   - **Location:** Throughout `tasklist.html`

3. **Store setState() Triggers**
   - Every `setState()` triggers `_notify()`
   - Which triggers persistence subscription
   - Which triggers debounced save
   - **Location:** `src/state/store.js:63`

4. **File Registry Updates**
   - `buildFileRegistry()` calls `store.setState()`
   - Which triggers save
   - **Location:** `src/features/fileManagement.js:283`

### Double-Save Scenarios

**SCENARIO #1: Add Task**
```
addTask()
  ├─> tasks.push(newTask)  ❌ Direct mutation
  ├─> window.tasks = tasks  ❌ Direct assignment
  ├─> store.setState({tasks})  ✅ Store update
  │   └─> _notify() → persistence.saveState() (debounced)
  └─> save()  ❌ Direct save call
      └─> storage.saveState() (immediate)
```
**Result:** Two saves (one debounced, one immediate)

**SCENARIO #2: Update File Status**
```
updateFileStatus()
  ├─> Mutates tasks/projects directly  ❌
  ├─> store.setState({fileRegistry})  ✅
  │   └─> _notify() → persistence.saveState() (debounced)
  └─> save()  ❌ Direct save call
      └─> storage.saveState() (immediate)
```
**Result:** Two saves

**SCENARIO #3: Build File Registry**
```
buildFileRegistry()
  ├─> Rebuilds registry from tasks/projects
  └─> store.setState({fileRegistry, fileHistory})  ✅
      └─> _notify() → persistence.saveState() (debounced)
```
**Result:** One save (but triggered by registry rebuild, not user action)

### State Overwrite Scenarios

**SCENARIO #1: Load During Save**
```
User action → setState() → save() (debounced)
  ↓
External file modification detected
  ↓
Reload state from file
  ↓
store.loadState() → overwrites in-memory changes
```
**Result:** User's changes lost

**SCENARIO #2: Double Mutation**
```
Function A: tasks.push(task1)  ❌ Direct mutation
Function B: store.setState({tasks: [...tasks, task2]})  ✅ Store update
  ↓
render() syncs store to globals
  ↓
window.tasks = state.tasks  (task1 lost, only task2 in store)
```
**Result:** task1 lost

---

## Phase 5 — Planner and Project Loading Failures

### Planner Rendering Path

```
renderPlanner() (tasklist.html:7333)
  ↓
Reads from: window.tasks, window.events, window.recurringRules
  ↓
Filters tasks by date
  ↓
Renders calendar view
```

### Issues Identified

**ISSUE #1: Planner Reads from Globals, Not Store**
- `renderPlanner()` reads from `window.tasks`, `window.events`, `window.recurringRules`
- But these are only synced FROM store in `render()`
- If `renderPlanner()` is called before `render()`, it sees stale data
- **Location:** `tasklist.html` - planner functions read from globals

**ISSUE #2: Planner Doesn't Subscribe to Store**
- Planner doesn't have a store subscription
- Only updates when `render()` is called
- If store changes but `render()` isn't called, planner is stale
- **Location:** No store subscription in planner code

**ISSUE #3: Events/RecurringRules Not Always in Store**
- Store has `events` and `recurringRules` fields
- But they may not be loaded from storage correctly
- **Location:** `storage.js:39-40` - events/recurringRules loaded, but may be missing

**ISSUE #4: Tasks Filtered Differently Between Views**
- Planner filters tasks by date
- Tasks view filters by status/project
- Different filters can show different tasks
- **Location:** Different filter logic in each view

---

## Phase 6 — File Registry & External Sync Integrity

### File Registry Flow

```
buildFileRegistry(ctx)
  ├─> Computes cache key from tasks/projects updatedAt
  ├─> Checks cache (lastRegistryBuild)
  ├─> If cache miss, rebuilds from source
  ├─> Updates store: setState({fileRegistry, fileHistory})
  └─> Updates cache
```

### Issues Identified

**ISSUE #1: Registry Can Drift from Source Truth**
- Registry is cached and rebuilt
- But if tasks/projects are mutated directly, registry may not update
- **Location:** `src/features/fileManagement.js:229-302`

**ISSUE #2: Registry Not Always Initialized**
- `ensureRegistryInitialized()` exists but may not be called
- Registry can be undefined if not initialized
- **Location:** `src/features/fileManagement.js:727-740`

**ISSUE #3: External Modification Can Overwrite In-Memory State**
- File watcher detects external changes
- Sends `vault:externalModification` event
- But reload can overwrite in-memory changes
- **Location:** `main.js:799-806`

**ISSUE #4: Polling + Watcher Can Trigger Reload Loops**
- File watcher AND polling both check for changes
- Both can trigger reload
- Can cause reload loops
- **Location:** `main.js:850-876` (watcher) + `871-873` (polling)

---

## Phase 7 — Build & Production Integrity

### Build Configuration

**package.json build.files:**
- `main.js`, `preload.js`, `tasklist (1).html`, `storage.js`
- `src/**/*` (includes all src files)
- ✅ All source files included

**preload.js path:**
- Uses `path.join(__dirname, 'preload.js')`
- ✅ Should work in production (__dirname is set by Electron)

**__dirname usage:**
- Used in `main.js` for preload path
- ✅ Should work after packaging

**Cloud vault path:**
- Uses `os.homedir()` + platform-specific paths
- ✅ Should be stable

### Issues Identified

**ISSUE #1: No Dev-Only Path Hardcoding Found**
- All paths use environment variables or `os.homedir()`
- ✅ No issues found

---

## Deterministic Failures List

1. **Projects Not Loading**
   - **Cause:** Store missing projects, fallback to window.projects fails
   - **Location:** `src/storage/persistence.js:47-58`
   - **Fix:** Ensure store always has projects, remove fallback

2. **Tasks Disappearing**
   - **Cause:** Direct mutations bypass store, then store overwrites globals
   - **Location:** Multiple places mutate tasks directly
   - **Fix:** All mutations must go through store

3. **Planner Not Reflecting Saved Tasks**
   - **Cause:** Planner reads from globals, not store; globals not synced
   - **Location:** `renderPlanner()` reads from window.tasks
   - **Fix:** Planner should read from store or subscribe to store

4. **Save Failures or False Success**
   - **Cause:** Save reports success before fsync completes
   - **Location:** `main.js:720` - rename before final sync
   - **Fix:** fsync before rename, or verify after rename

5. **Vault Resolution Timing Issues**
   - **Cause:** Load can proceed before vault resolved
   - **Location:** `tasklist.html:2931-2933` - warning only
   - **Fix:** Block load until vault resolved

---

## Race Conditions List

1. **Vault Resolution Race**
   - Event-driven (`vault:resolved`) vs polling (`waitForVaultResolved`)
   - **Location:** `tasklist.html:2792-2794` vs `2756-2781`
   - **Fix:** Use polling only, or ensure event is reliable

2. **Load During Save**
   - External modification triggers reload while save in progress
   - **Location:** `main.js:799-806` (external mod) vs `1142-1207` (save)
   - **Fix:** Lock during save, or merge instead of overwrite

3. **Double Save**
   - Auto-save (debounced) + direct save() call
   - **Location:** `persistence.js:93` (auto) vs direct calls
   - **Fix:** Remove direct save() calls, use store only

4. **Store Update During Render**
   - `setState()` triggers render, but render reads from globals
   - **Location:** `store.js:63` (_notify) vs `render()` (reads globals)
   - **Fix:** Render should read from store, not globals

5. **Registry Rebuild During File Update**
   - `buildFileRegistry()` rebuilds while file status updating
   - **Location:** `fileManagement.js:229` vs `566` (updateFileStatus)
   - **Fix:** Lock registry during updates, or queue updates

---

## Architectural Violations List

1. **Multiple Sources of Truth**
   - Store, window globals, local variables all hold state
   - **Severity:** CRITICAL
   - **Fix:** Single source of truth (store only)

2. **Direct Mutations Outside Store**
   - Many functions mutate arrays directly
   - **Severity:** CRITICAL
   - **Fix:** All mutations through store

3. **Store Subscription Triggers Saves**
   - Every setState() triggers save
   - **Severity:** HIGH
   - **Fix:** Explicit save() calls only, or better debouncing

4. **Globals Synced FROM Store But Also Written To**
   - Globals are both source and destination
   - **Severity:** HIGH
   - **Fix:** Globals read-only, store is source

5. **File Registry Can Drift**
   - Registry cached and rebuilt, can drift from source
   - **Severity:** MEDIUM
   - **Fix:** Registry always rebuilt from source, no cache

---

## Prioritized Fix Order

### Priority 1: CRITICAL - Establish Single Source of Truth

1. **Remove window globals as state source**
   - Make window.tasks, window.projects read-only (getters from store)
   - Remove all direct assignments to window.tasks/projects
   - **Files:** `tasklist.html` (all direct assignments)

2. **Remove local variables as state source**
   - Make `tasks`, `projects` variables read-only (getters from store)
   - Remove all direct mutations to these variables
   - **Files:** `tasklist.html` (all direct mutations)

3. **All mutations through store**
   - Replace all `tasks.push()`, `tasks.splice()`, etc. with `store.setState()`
   - **Files:** `tasklist.html` (all mutation functions)

### Priority 2: HIGH - Fix Save Flow

4. **Fix save success reporting**
   - fsync before rename, or verify after rename
   - **Files:** `main.js:669-759`

5. **Remove fallback to window.projects**
   - Ensure store always has projects
   - **Files:** `src/storage/persistence.js:47-58`

6. **Block load until vault resolved**
   - Make `initState()` block until vault resolved
   - **Files:** `tasklist.html:2931-2948`

### Priority 3: MEDIUM - Fix Race Conditions

7. **Remove double-save**
   - Remove direct `save()` calls, use store only
   - **Files:** All files with direct `save()` calls

8. **Fix planner to read from store**
   - Make planner subscribe to store or read from store
   - **Files:** `tasklist.html` (planner functions)

9. **Fix external modification handling**
   - Lock during save, or merge instead of overwrite
   - **Files:** `main.js:799-806`, `1142-1207`

### Priority 4: LOW - Cleanup

10. **Remove file registry cache**
    - Always rebuild from source
    - **Files:** `src/features/fileManagement.js:229-302`

11. **Consolidate default initialization**
    - Single place for defaults
    - **Files:** `store.js:95-116`, `storage.js:32-41`

---

## Recommended Simplification Plan

### Minimal Deterministic Architecture

```
┌─────────────────────────────────────────────────────────┐
│              SINGLE SOURCE OF TRUTH                      │
│                   AppStore                               │
│  ┌────────────────────────────────────────────────────┐  │
│  │ _state: {tasks, projects, events, ...}            │  │
│  │ getState() → returns copy                          │  │
│  │ setState() → merges + _notify()                    │  │
│  │ loadState() → replaces _state                      │  │
│  └────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                    ↕ (read-only)
┌─────────────────────────────────────────────────────────┐
│              UI RENDERING                                 │
│  ┌────────────────────────────────────────────────────┐  │
│  │ render() → reads from store.getState()             │  │
│  │   └─> Updates DOM                                  │  │
│  └────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                    ↕ (explicit save)
┌─────────────────────────────────────────────────────────┐
│              PERSISTENCE                                  │
│  ┌────────────────────────────────────────────────────┐  │
│  │ save() → explicit call only                        │  │
│  │   ├─> store.exportState()                          │  │
│  │   └─> storage.saveState()                          │  │
│  └────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### Key Principles

1. **Single Source of Truth:** Store only
2. **Read-Only Globals:** window.tasks = store.getState().tasks (getter)
3. **All Mutations Through Store:** No direct array mutations
4. **Single Save Pipeline:** One debounced writer, deterministic scheduling
5. **Blocking Load:** Wait for vault, then load, then render
6. **Smart Caching:** Registry caching OK if invalidation is deterministic (updatedAt/content hash)

### Migration Steps

1. **Phase 1:** Make store the only source of truth
   - Remove all direct mutations
   - Make globals read-only getters

2. **Phase 2:** Normalize mutations
   - Replace all direct mutations with immutable store updates
   - Fix "tasks disappearing" bug

3. **Phase 3:** Fix load flow
   - Block until vault resolved
   - Load into store
   - Then render

4. **Phase 4:** Cleanup
   - Remove registry cache
   - Consolidate defaults
   - Remove fallbacks

---

## Minimal Deterministic Architecture Proposal

### Core Principles

1. **Store is the ONLY source of truth**
   - All state lives in store
   - No window globals, no local variables

2. **All mutations through store**
   - `store.setState({tasks: [...tasks, newTask]})`
   - No direct array mutations

3. **Single save pipeline**
   - One debounced writer (500-1000ms)
   - Drop all direct save() calls from business logic
   - Optional "Save now" button calls the same pipeline (flush)
   - Auto-save is fine if deterministic and single-writer

4. **Blocking initialization**
   - Wait for vault (blocking)
   - Load state (blocking)
   - Then render

5. **Read-only globals (optional)**
   - `window.tasks` = getter from store
   - For backward compatibility only
   - Not used for mutations

### Implementation

```javascript
// Store is source of truth
const state = store.getState();

// All mutations through store (immutable updates)
store.setState({tasks: [...state.tasks, newTask]});

// Single save pipeline (auto-save, debounced)
// No direct save() calls - persistence layer handles it

// Render reads from store
function render() {
  const state = store.getState();
  // Render from state
}
```

### Benefits

- **Deterministic:** Single source of truth, no race conditions
- **Simple:** Single save pipeline, no double-saves
- **Reliable:** Blocking initialization, deterministic saves
- **Maintainable:** Clear data flow, easy to debug
- **User-Friendly:** Auto-save preserves work without manual intervention

---

## Conclusion

The app's state architecture has evolved into a complex distributed system with multiple sources of truth, race conditions, and nondeterministic flows. The recommended fix is to simplify to a minimal deterministic architecture with:

1. **Single source of truth (store)**
2. **All mutations through store (immutable updates)**
3. **Single save pipeline (deterministic auto-save)**
4. **Blocking initialization**
5. **Smart caching (with deterministic invalidation)**

This will eliminate race conditions, state drift, and double-save problems, making the app reliable and maintainable while preserving the modern auto-save UX.

---

## Implementation Roadmap

### Correct End State (Deterministic, Still Auto-Saves)

**Invariants (Non-Negotiable):**
1. Store is the only source of truth
2. Renderer never mutates arrays directly
3. All updates go through store actions or `store.setState()`
4. Only one save pipeline exists
5. Vault must be resolved before load/save
6. Planner renders from store (or store getters), not globals

**Save Model (Recommended):**
- Keep auto-save, but make it deterministic:
  - Single debounced writer (500-1000ms)
  - Drop all direct `save()` calls from business logic
  - Optional "Save now" button calls the same pipeline (flush)
- This keeps correctness and removes double-save

---

## Phase-by-Phase Implementation Plan

### Phase 0 — Freeze Architecture Drift

**Goal:** Prevent further spread of globals/locals.

**Actions:**
1. Add a `stateAccess.js` module with:
   ```javascript
   export function getState() {
     return window.Petal?.store?.getState() || {};
   }
   
   export function setState(patch) {
     if (window.Petal?.store) {
       window.Petal.store.setState(patch);
     }
   }
   ```
2. Replace reads in new code to use `getState()`

**Acceptance Criteria:**
- No new code reads `window.tasks` / `let tasks`
- All new mutations use `setState()` helper

---

### Phase 1 — Kill Multiple Sources of Truth Without Breaking Everything

**Goal:** Make globals read-only mirrors of store.

**Actions:**
1. Remove all `window.tasks = ...` and `tasks = ...` assignments except one place: a single "sync/mirror" function after store updates
2. Replace window globals with getters:
   ```javascript
   Object.defineProperty(window, "tasks", {
     get: () => window.Petal?.store?.getState()?.tasks || [],
     set: () => { throw new Error("Cannot assign to window.tasks - use store.setState()") }
   });
   Object.defineProperty(window, "projects", {
     get: () => window.Petal?.store?.getState()?.projects || [],
     set: () => { throw new Error("Cannot assign to window.projects - use store.setState()") }
   });
   Object.defineProperty(window, "events", {
     get: () => window.Petal?.store?.getState()?.events || [],
     set: () => { throw new Error("Cannot assign to window.events - use store.setState()") }
   });
   Object.defineProperty(window, "recurringRules", {
     get: () => window.Petal?.store?.getState()?.recurringRules || [],
     set: () => { throw new Error("Cannot assign to window.recurringRules - use store.setState()") }
   });
   ```
3. Remove all direct assignments to these globals

**Acceptance Criteria:**
- Any attempt to assign `window.tasks = ...` fails loudly (or is removed)
- Planner and tasks view show identical counts after load and after edits
- All reads from globals work (via getters)

---

### Phase 2 — Normalize Mutations (The Actual "Tasks Disappearing" Fix)

**Goal:** Replace all direct mutations with immutable store updates.

**Actions:**
1. Replace direct mutations like:
   ```javascript
   // ❌ OLD: Direct mutation
   tasks.push(newTask);
   tasks.splice(index, 1);
   task.completed = true;
   ```
   
   With immutable updates:
   ```javascript
   // ✅ NEW: Immutable update
   const s = store.getState();
   store.setState({ tasks: [...s.tasks, newTask] });
   
   // For edits:
   store.setState({
     tasks: s.tasks.map(t => 
       t.id === id 
         ? { ...t, ...patch, updatedAt: Date.now() } 
         : t
     )
   });
   
   // For deletes:
   store.setState({
     tasks: s.tasks.filter(t => t.id !== id)
   });
   ```

2. Search for all `.push()`, `.splice()`, `.sort()` on state arrays and replace

**Acceptance Criteria:**
- Add/edit/delete tasks and projects persists after restart
- No function mutates an array in place (search for `.push(`, `.splice(`, `.sort(` on state arrays)
- All mutations go through `store.setState()`

---

### Phase 3 — One Save Pipeline (Remove Double-Save)

**Goal:** Single deterministic save pipeline.

**Actions:**
1. Pick subscription-driven persistence (recommended)
2. Delete all direct `save()` calls in feature functions
3. Keep a single persistence subscriber with:
   ```javascript
   let saveTimeout = null;
   let isLoading = false;
   let isSaving = false; // Write lock
   
   function saveState(state) {
     if (isLoading || isSaving) return; // Prevent saves during load/save
     
     clearTimeout(saveTimeout);
     saveTimeout = setTimeout(async () => {
       isSaving = true;
       try {
         const result = await storage.saveState(store.exportState());
         // Update UI indicator
         if (result.ok) {
           updateSaveIndicator('saved');
         } else {
           updateSaveIndicator('failed', result.error);
         }
       } finally {
         isSaving = false;
       }
     }, 500);
   }
   
   // Flush method for explicit "Save now" button
   export function flushSave() {
     if (saveTimeout) {
       clearTimeout(saveTimeout);
       saveTimeout = null;
     }
     return saveState(store.getState());
   }
   ```

**Acceptance Criteria:**
- One user action causes ≤1 write (verify by logging)
- No more "success but ENOENT" paths
- Save result controls UI "Saved/Failed" indicator
- "Save now" button works (calls flush)

---

### Phase 4 — Planner Correctness (Why Planner "Loses Tasks")

**Goal:** Planner reads from store, not globals.

**Actions:**
1. Update `renderPlanner()` to always read:
   ```javascript
   function renderPlanner() {
     const { tasks, events, recurringRules } = store.getState();
     // Render from store state
   }
   ```
2. Ensure planner is rendered as part of a single `render()` pass or subscribed to store
3. Add store subscription to planner if needed:
   ```javascript
   store.subscribe((state) => {
     if (currentView === 'planner') {
       renderPlanner();
     }
   });
   ```

**Acceptance Criteria:**
- Planner reflects changes immediately after adding a task/date change
- Planner shows same tasks after restart
- Planner and tasks view show identical task counts

---

### Phase 5 — Vault Determinism (No More Timeouts)

**Goal:** Reliable vault resolution without timeouts.

**Actions:**
1. `vaultEnsureResolved()` in main triggers the resolver and returns `{resolved, activeVaultPath, vaultId}`
2. Renderer calls `ensureResolved` before load, then polls status until resolved:
   ```javascript
   async function waitForVaultResolved() {
     // Trigger resolution
     await window.electronAPI.vaultEnsureResolved();
     
     // Poll until resolved (no timeout - keep polling)
     while (true) {
       const status = await window.electronAPI.vaultGetStatus();
       if (status.resolved && status.activeVaultPath) {
         return status;
       }
       await new Promise(r => setTimeout(r, 250));
     }
   }
   ```
3. If it truly fails, show modal with "Choose vault" (not silent failure)

**Acceptance Criteria:**
- No "Vault did not resolve in time" on normal startup
- If it truly fails, user gets a modal with "Choose vault" (not silent failure)
- Load blocks until vault resolved

---

## UI Confirmation Features

**Minimal Vault Status UI:**
1. Footer text: `Vault: PetalVault` (click to open folder)
2. Status dot:
   - Green when last save ok
   - Red if last save failed
   - Yellow while saving

This reduces support burden immediately.

---

## Implementation Pass Instructions

**For Phase 1 + Phase 2 Only:**

Implement Phase 1 and Phase 2 only (globals become getters; all mutations move to `store.setState` immutable updates). Do not touch persistence yet. After changes, add debug assertions that throw if any state array is mutated in place or if any code assigns to `window.tasks/projects/events/recurringRules`.

That sequencing prevents you from changing persistence while the state model is still unstable.

**After Phase 1 + Phase 2:**
- Rerun smoke tests
- Verify "tasks disappearing" bugs are fixed
- Then proceed to Phase 3 (save pipeline)
