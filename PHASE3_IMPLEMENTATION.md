# Phase 3 Implementation Summary

## ✅ Completed: Single Deterministic Save Pipeline

### Implementation Details

**File:** `src/storage/persistence.js`

### Key Features

1. **Single-Flight Writes**
   - `isSaving` lock prevents overlapping writes
   - Only one save can run at a time

2. **Latest-Wins Queue**
   - `queuedState` stores the most recent state snapshot
   - If a save is in progress, new changes are queued
   - After current save completes, queued state is saved immediately

3. **Immutable Snapshots** (Gotcha Fix #1)
   - `createImmutableSnapshot()` deep clones arrays and objects
   - Prevents "wrong version saved" bugs
   - Ensures queued state cannot be mutated after queuing

4. **Honest Save Status** (Gotcha Fix #2)
   - "Saved" only appears when `result.ok === true` from IPC
   - Never shows "Saved" for scheduled or started saves
   - Failure status persists until next successful save

5. **Loading Gate**
   - `isLoading` prevents saves during init/load/migration
   - Queue is cleared when loading starts

6. **Save Status Indicator**
   - Visual indicator in bottom-right corner
   - Shows: "Saving..." → "Saved" → (fades) or "Save failed: [error]"

### Queue Implementation (Sanity Check)

```javascript
// When store changes:
queuedState = createImmutableSnapshot(appStore.exportState()); // Latest-wins
// ... debounce ...

// When save executes:
if (isSaving) {
  queuedState = createImmutableSnapshot(appStore.exportState()); // Queue latest
  return; // Wait for current save
}

const stateToSave = queuedState || createImmutableSnapshot(appStore.exportState());
queuedState = null; // Clear queue
// ... perform write ...
// If queuedState exists after save, trigger another save
```

**Safety checks:**
- ✅ Snapshots are immutable (no reference capture)
- ✅ Latest state always wins (queue is overwritten, not appended)
- ✅ Save status reflects actual write result (not scheduled/started)
- ✅ Single writer (isSaving lock)

### API

```javascript
// Flush immediately (for critical operations)
await window.Petal.persistence.flush();

// Get save status
const status = window.Petal.persistence.getSaveStatus();
// Returns: { isSaving, lastSaveOk, lastSaveTime, lastSaveError, hasUnsavedChanges }

// Set loading state
window.Petal.persistence.setLoading(true);
```

### Testing Checklist

- [ ] Launch app → wait for vault → add one task → confirm "Saving..." → "Saved"
- [ ] Rapidly edit task title 5-10 times → confirm at most 1 save in flight
- [ ] Restart app → confirm latest title persisted
- [ ] Create task with today's date → switch to planner → confirm it appears
- [ ] Restart app → planner still shows task
- [ ] Point vault to unwritable location → trigger save → confirm "Save failed" (no "Saved")
- [ ] Check console logs: "SAVE start" → "SAVE success" (one per save)

### Notes

- Most `save()` calls are now redundant (persistence handles it automatically)
- `save()` function kept for backward compatibility but does minimal work
- Critical operations (migrations) should use `flush()` for immediate save
- No feature code calls `storage.saveState()` directly (invariant)
