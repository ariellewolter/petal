# Phase 3: Stop Saving During View Switches

## Problem

Saves were happening during view renders because `buildFileRegistry()` was calling `store.setState({ fileRegistry, fileHistory })`, which triggered the persistence layer's subscription and queued a save. Even though `fileRegistry` and `fileHistory` are excluded from `exportState()`, the subscription still fired and logged "SAVE start".

This created "save spam" during view switches, making debugging harder and potentially causing performance issues.

## Solution

### 1. Added `setEphemeralState()` Method to Store

**File:** `src/state/store.js`

Added a new method that updates state without triggering notifications (no persistence saves):

```js
/**
 * Update ephemeral state (computed/cached data that shouldn't trigger saves)
 * Phase 3 Fix: Prevents save spam from fileRegistry/fileHistory updates during render
 * Updates state without triggering notifications (no persistence save)
 */
setEphemeralState(partial) {
  // Merge partial update (same as setState, but no notification)
  Object.keys(partial).forEach(key => {
    // ... same normalization logic as setState ...
  });
  // No _notify() call - this prevents persistence saves
}
```

**Why:** `fileRegistry` and `fileHistory` are computed from `tasks` and `projects`. They don't need to be persisted (they're rebuilt on load), so updating them shouldn't trigger saves.

### 2. Updated `buildFileRegistry()` to Use `setEphemeralState()`

**File:** `src/features/fileManagement.js`

Changed all `setState({ fileRegistry })` calls to use `setEphemeralState()`:

- Line 284: When committing registry after build (with `commit: true`)
- Line 719: When updating registry after file status change
- Line 755: When initializing registry
- Line 909: When updating registry after file deletion

**Result:** Registry updates no longer trigger persistence saves.

### 3. Simplified Vault Logging

**File:** `tasklist (1).html`

Reduced verbose vault information to a single line:

**Before:**
```js
console.log('═══════════════════════════════════════');
console.log('📁 VAULT INFORMATION');
console.log('═══════════════════════════════════════');
console.log('Vault folder:', vaultPath);
console.log('Data file:', dataPath);
console.log('Vault exists:', vaultCheck.vaultExists);
console.log('Data file exists:', vaultCheck.dataFileExists);
// ... more lines ...
```

**After:**
```js
console.log(`✓ Vault ready: ${displayPath} (petal.json: exists, tasks: ${state.tasks?.length || 0}, projects: ${state.projects?.length || 0})`);
```

**Result:** One-line confirmation that vault is ready, with key info (path, file existence, data counts).

### 4. File Open Handlers Already Fixed

**Status:** ✅ Already implemented in user's changes

The apostrophe/SyntaxError bugs are already fixed using:
- `data-path` attributes instead of inline `onclick`
- Delegated click handlers (event delegation)
- `escAttr()` function for safe HTML attribute escaping

No additional changes needed.

---

## Expected Results

### Before:
- View switch → `buildFileRegistry()` → `setState({ fileRegistry })` → persistence subscription fires → "💾 SAVE start" logged
- Multiple saves during view switches
- Noisy console logs

### After:
- View switch → `buildFileRegistry()` → `setEphemeralState({ fileRegistry })` → no notification → no save
- Saves only happen when actual data changes (tasks, projects, settings, etc.)
- Clean console logs

---

## Testing Checklist

- [ ] Switch between views (tasks, files, projects) - no save logs
- [ ] Create/edit/delete task - save should trigger (actual data change)
- [ ] Create/edit/delete project - save should trigger (actual data change)
- [ ] View files tab - registry builds but no save
- [ ] Vault info shows one line after load
- [ ] File open buttons work (no SyntaxError from apostrophes)

---

## Technical Details

### Why `fileRegistry` and `fileHistory` Are Ephemeral

1. **Computed Data:** They're derived from `tasks` and `projects` - rebuilding them is cheap
2. **Not Persisted:** `exportState()` already excludes them (line 178-181 in `store.js`)
3. **Rebuilt on Load:** `buildFileRegistry()` is called after load to rebuild the registry
4. **Cache Only:** They're UI cache, not persisted state

### Why `setEphemeralState()` Works

- Updates internal state (same as `setState`)
- Doesn't call `_notify()` (no listener callbacks)
- Persistence layer subscribes to `_notify()`, so no save is triggered
- State is still available via `getState()` for rendering

---

## Related Files

- `src/state/store.js` - Added `setEphemeralState()` method
- `src/features/fileManagement.js` - Updated to use `setEphemeralState()`
- `tasklist (1).html` - Simplified vault logging
- `src/ui/renderFiles.js` - Already uses `commit: false` (no changes needed)
