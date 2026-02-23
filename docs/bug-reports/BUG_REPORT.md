# Bug Report - Task Tracker App

## Critical Bugs

### 1. Missing Null Checks on DOM Elements
**Location:** Multiple locations in `tasklist (1).html`

**Issues Found:**
- Line 3787-3788: `projectSelect` and `laneSelect` accessed without null checks
- Line 3904-3906: `projectSelect`, `filesSelectContainer`, and `filesSelect` accessed without null checks
- Line 3940-3941: `filesSection` and `filesSelect` accessed without null checks
- Line 3868: `cellLogProjectSelect` accessed without null check
- Line 3796, 3818, 3823: `laneSelect.innerHTML` and `laneSelect.value` accessed without checking if element exists

**Risk:** These will cause `TypeError: Cannot read property 'innerHTML' of null` errors if the elements don't exist in the DOM.

**Example:**
```javascript
const projectSelect = document.getElementById('in-project');
const laneSelect = document.getElementById('in-lane');
// Missing: if (!projectSelect || !laneSelect) return;
laneSelect.innerHTML = `...`; // Will crash if element doesn't exist
```

**Fix:** Add null checks before accessing properties:
```javascript
const projectSelect = document.getElementById('in-project');
const laneSelect = document.getElementById('in-lane');
if (!projectSelect || !laneSelect) {
  console.warn('Required elements not found');
  return;
}
```

---

### 2. Potential Race Condition in Module Loading
**Location:** `tasklist (1).html` - Multiple locations where modules are accessed

**Issues Found:**
- Lines 3258-3267: `window.Petal?.features?.taskOperations?.editTask` accessed but module might not be loaded yet
- Lines 3335-3345: Same issue in project view delegation
- Lines 3296-3310: `window.Petal?.features?.taskOperations?.deleteTask` accessed without ensuring module is loaded

**Risk:** Functions may fail silently or throw errors if modules haven't loaded yet, especially on slow connections or during initial page load.

**Fix:** Add proper module availability checks and loading guards.

---

### 3. Missing Error Handling in Async Functions
**Location:** Multiple locations

**Issues Found:**
- Line 5413: `window.renderCellLogPage().catch(err => console.error(...))` - Error is logged but not handled
- Line 5458: `window.renderSettingsPage(...).catch(err => console.error(...))` - Same issue
- Line 5057: `await renderWorkflowCanvas(...)` - No try-catch block
- Line 5113: `await renderWorkflow()` - No try-catch block

**Risk:** Unhandled promise rejections could crash the app or leave UI in inconsistent state.

**Fix:** Add proper error handling with user-facing error messages.

---

### 4. Incomplete Error Handling in File Operations
**Location:** `tasklist (1).html` - File management functions

**Issues Found:**
- Lines 4634, 4647, 4660: Multiple places where file management module errors are logged but operations continue
- Line 13332: Critical error logged but file might still be added incorrectly
- Line 13354: Error caught but user might not be notified

**Risk:** Files might be added to UI but not to store, or vice versa, causing data inconsistency.

---

### 5. Potential Memory Leak - Event Listeners
**Location:** `tasklist (1).html` - Event delegation setup

**Issues Found:**
- Lines 3240-3398: Event listeners are added but never removed
- Line 3243: `tc.__editDelegationBound` flag prevents re-binding but listeners accumulate
- Line 3318: Document-level listener added without cleanup mechanism

**Risk:** If `setupTaskContainerEventDelegation` is called multiple times, multiple listeners could be attached, causing duplicate event handling.

**Fix:** Remove old listeners before adding new ones, or use a singleton pattern.

---

### 6. Type Coercion Issues
**Location:** Multiple locations

**Issues Found:**
- Line 3292: `projectIdAttr !== 'null'` - String comparison with string 'null', not actual null
- Line 3374: Same issue
- Line 3295: `String(taskId)` - Type coercion might mask issues if taskId is undefined

**Risk:** String 'null' vs actual null could cause logic errors in conditional checks.

**Fix:** Use proper null checks:
```javascript
const projectId = projectIdAttr && projectIdAttr !== '' && projectIdAttr !== 'null' ? projectIdAttr : null;
// Better:
const projectId = projectIdAttr && projectIdAttr !== '' && projectIdAttr !== 'null' && projectIdAttr !== 'undefined' ? projectIdAttr : null;
```

---

### 7. Missing Validation in State Updates
**Location:** Store operations

**Issues Found:**
- Lines 3125-3159: Read-only getters throw errors but don't validate input
- Line 3168: `setState` wrapper checks for mutations but doesn't validate data structure
- No validation that tasks/projects have required fields before saving

**Risk:** Invalid data could be saved, causing corruption or crashes on load.

---

### 8. Potential Null Reference in Vault Badge
**Location:** `tasklist (1).html` - Line 3985

**Issue:**
```javascript
const el = document.getElementById("vaultBadge");
// No null check before accessing properties
```

**Risk:** If vaultBadge element doesn't exist, accessing `el.textContent` will throw.

**Fix:** Add null check:
```javascript
const el = document.getElementById("vaultBadge");
if (!el) return;
```

---

### 9. Inconsistent Error Handling in View Switching
**Location:** `tasklist (1).html` - `switchView` function

**Issues Found:**
- Line 5002: `document.getElementById('view-' + v)` - No null check
- Line 5053: `document.getElementById('view-workflow')` - No null check
- Line 5077: `document.getElementById('view-today')` - No null check
- Multiple view elements accessed without existence checks

**Risk:** If view elements are missing, the app could crash when switching views.

---

### 10. Missing Await in Async Operations
**Location:** Multiple locations

**Issues Found:**
- Line 5305: `renderProjects()` called without await (if it's async)
- Line 5310: `render()` called in setTimeout without await
- Line 5359: `renderPlanner()` called without await

**Risk:** If these functions are async and return promises, errors might not be caught, and operations might complete out of order.

---

## Medium Priority Bugs

### 11. Console Error Override in Main Process
**Location:** `main.js` - Lines 218-301

**Issue:** Console methods are overridden with safe versions, but this could mask real errors in development.

**Risk:** Real errors might be silently ignored, making debugging difficult.

**Recommendation:** Only enable in production, or add a debug flag.

---

### 12. Duplicate Event Handling Prevention
**Location:** `tasklist (1).html` - Event delegation

**Issue:** Lines 3275, 3356 use `e.__petalDeleteHandled` flag, but this is a custom property that might not work in all scenarios.

**Risk:** Events might be handled twice, causing duplicate operations.

---

### 13. Missing Cleanup in 3D Print View
**Location:** `tasklist (1).html` - Lines 5148-5232

**Issue:** When 3D print view is loaded, scripts are executed but there's no cleanup when view is hidden.

**Risk:** Event listeners and resources might accumulate.

---

## Low Priority / Code Quality Issues

### 14. Inconsistent Error Messages
**Location:** Throughout codebase

**Issue:** Some errors use emoji (❌, ✓), some don't. Inconsistent formatting makes debugging harder.

### 15. Magic Strings
**Location:** Multiple locations

**Issue:** Hard-coded strings like 'null', 'undefined', 'view-', etc. should be constants.

### 16. Missing JSDoc Comments
**Location:** Most functions

**Issue:** Many functions lack documentation, making maintenance difficult.

---

## Recommendations

1. **Add comprehensive null checks** for all DOM element access
2. **Implement proper error boundaries** for async operations
3. **Add input validation** before state updates
4. **Create a centralized error handler** for consistent error reporting
5. **Add unit tests** for critical functions
6. **Implement proper cleanup** for event listeners and resources
7. **Add TypeScript** or JSDoc types for better type safety
8. **Create a module loading system** that ensures dependencies are loaded before use

---

## Testing Checklist

- [ ] Test with missing DOM elements
- [ ] Test with slow network (module loading delays)
- [ ] Test rapid view switching
- [ ] Test with corrupted data file
- [ ] Test with missing vault path
- [ ] Test error recovery scenarios
- [ ] Test memory leaks (long-running sessions)
- [ ] Test concurrent operations
