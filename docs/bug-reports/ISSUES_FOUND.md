# Issues Found in Petal Task Tracker App

## Critical Issues

### 1. Build Configuration Missing `src/` Directory
**Location**: `package.json` lines 26-34

**Issue**: The Electron build configuration doesn't include the `src/` directory, which contains all the modular code (domain, state, UI, features, etc.). This means when building the Electron app, these modules won't be included, causing the app to fail.

**Impact**: App will not work in built Electron distribution.

**Fix**: Add `src/` directory to the build files:
```json
"files": [
  "main.js",
  "preload.js",
  "tasklist (1).html",
  "storage.js",
  "manifest.json",
  "icon-192.png",
  "icon-512.png",
  "src/**/*"
]
```

### 2. Events and RecurringRules Not in Store
**Location**: 
- `src/state/store.js` - Store definition
- `tasklist (1).html` lines 2149-2150, 3477-3486
- `src/storage/persistence.js` - Persistence layer

**Issue**: The app store doesn't track `events` and `recurringRules`, but they're being saved separately in the `save()` function. The persistence layer only saves what's in the store, so these won't be auto-saved when the store changes.

**Impact**: 
- `events` and `recurringRules` won't be auto-saved when store changes
- Data could be lost if only store changes are made
- Inconsistent state management

**Fix**: 
1. Add `events` and `recurringRules` to the store state
2. Update `exportState()` to include them
3. Update `loadState()` to load them
4. Remove separate saving of events/recurringRules from `save()` function

### 3. Double Saving Mechanism
**Location**: 
- `tasklist (1).html` - Multiple `save()` calls throughout
- `src/storage/persistence.js` - Auto-save on store changes

**Issue**: The app has two saving mechanisms:
1. Direct `save()` function calls (still used in many places)
2. Auto-save via persistence layer subscription to store changes

**Impact**: 
- Potential race conditions
- Unnecessary duplicate saves
- Inconsistent save behavior
- Events/recurringRules only saved via direct `save()` calls

**Fix**: 
1. Remove all direct `save()` calls
2. Ensure all state changes go through `appStore.setState()`
3. Let persistence layer handle all saves
4. Add events/recurringRules to store so they're included in auto-saves

## Medium Priority Issues

### 4. Missing Error Handling for Module Loading
**Location**: `tasklist (1).html` - Multiple places checking for module availability

**Issue**: Many places check if modules are loaded and log errors, but don't handle the case gracefully. Examples:
- Lines 3283, 3296, 3309: "File management module not loaded"
- Lines 3732, 3741, 3751, 3761: "File operations module not loaded"
- Lines 3785-3849: "Task operations module not loaded"
- Lines 3926-4022: "Task drawer module not loaded"

**Impact**: App may fail silently or show console errors without user feedback.

**Fix**: Add proper error handling and user-facing error messages when modules fail to load.

### 5. Store State Sync with Window Globals
**Location**: `tasklist (1).html` - Multiple places syncing store to window globals

**Issue**: The app maintains both store state and window globals, with manual syncing. This creates opportunities for state to get out of sync.

**Impact**: 
- State inconsistencies
- Hard to debug
- Potential bugs from reading stale window globals

**Fix**: 
- Remove window globals where possible
- Use store as single source of truth
- Update code to read from store instead of window globals

### 6. Persistence Layer Missing Events/RecurringRules
**Location**: `src/storage/persistence.js` line 24

**Issue**: The persistence layer only saves what `appStore.exportState()` returns, which doesn't include `events` and `recurringRules`.

**Impact**: These fields won't be saved automatically when store changes.

**Fix**: Add events/recurringRules to store (see issue #2).

## Low Priority Issues

### 7. Console Error/Warn Spam
**Location**: Throughout codebase

**Issue**: Many console.error and console.warn calls that could be handled more gracefully or shown to users.

**Impact**: Cluttered console, but doesn't break functionality.

**Fix**: Replace console errors with user-facing error messages where appropriate.

### 8. TODO Comments for Future Work
**Location**: 
- `tasklist (1).html` line 3469: "TODO: Add events and recurringRules to store in future"

**Issue**: This TODO indicates incomplete refactoring.

**Impact**: See issue #2.

**Fix**: Complete the refactoring (see issue #2).

### 9. Potential Memory Leaks from Store Subscriptions
**Location**: `src/state/store.js` - Subscribe/unsubscribe pattern

**Issue**: While the store has unsubscribe functionality, there's no evidence of cleanup when components/modules are removed.

**Impact**: Potential memory leaks if subscriptions aren't cleaned up.

**Fix**: Ensure all subscriptions are properly unsubscribed when no longer needed.

## Recommendations

1. **Immediate**: Fix build configuration (#1) - app won't work in production without this
2. **High Priority**: Add events/recurringRules to store (#2) - prevents data loss
3. **High Priority**: Remove double saving mechanism (#3) - prevents race conditions
4. **Medium Priority**: Improve error handling (#4) - better user experience
5. **Medium Priority**: Remove window globals (#5) - cleaner architecture
6. **Low Priority**: Address console spam (#7) - better developer experience

## Testing Checklist

After fixing issues, test:
- [ ] App builds successfully with `npm run build`
- [ ] Events are saved when store changes
- [ ] RecurringRules are saved when store changes
- [ ] No duplicate saves occur
- [ ] All modules load correctly
- [ ] State remains consistent between store and window globals (if still using them)
- [ ] No memory leaks from subscriptions
