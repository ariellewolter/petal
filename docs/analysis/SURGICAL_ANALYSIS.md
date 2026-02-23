# Surgical Analysis: Split Authority Issues

## Overview
This document identifies exact locations where authority is split between router, page modules, and render functions. These are the bugs waiting to happen.

---

## 1. Duplicate Event Delegation (CRITICAL)

### Issue: Both TasksPage.js AND renderTasks.js Install Delegation

**Location 1**: `src/pages/TasksPage.js` lines 13-214
- Installs click delegation on `container`
- Uses flag: `bound` (module-level variable)
- Handles: `task:add`, `task:edit`, `task:delete`, `ui:toggle-add-form`, etc.

**Location 2**: `src/ui/renderTasks.js` lines 221-273
- Installs click delegation on `c` (task-container)
- Uses flag: `c.__taskActionsInstalled`
- Handles: `delete`, `delete-task` actions

**Problem**: 
- TasksPage delegation runs first (when page renders)
- renderTasks delegation runs second (when tasks list renders)
- **Both handle delete actions** - potential double-firing
- Different flag names (`bound` vs `__taskActionsInstalled`) means no coordination

**Fix**:
```javascript
// Option 1: Remove delegation from renderTasks.js (preferred)
// TasksPage should own ALL event delegation for the tasks view

// Option 2: Make renderTasks delegation more specific
// Only handle actions that renderTasks uniquely needs
// But this creates confusion about who handles what
```

**Recommendation**: **Remove delegation from `renderTasks.js`**. TasksPage should be the single source of truth for all events in the tasks view.

---

## 2. Non-Scoped Selectors (MEDIUM)

### Issue: TasksPage Uses Global ID Selectors

**Location**: `src/pages/TasksPage.js` lines 176, 197
```javascript
const searchInput = container.querySelector('#search-input');
const searchClear = container.querySelector('#search-clear');
```

**Problem**: 
- Uses `#search-input` which is a global ID
- If another view has an element with the same ID, this will find the wrong one
- Violates page contract: "only queries inside containerEl"

**Fix**:
```javascript
// Option 1: Use data attributes (preferred)
const searchInput = container.querySelector('[data-search-input]');
const searchClear = container.querySelector('[data-search-clear]');

// Option 2: Use class selector (if unique within container)
const searchInput = container.querySelector('.search-input');
const searchClear = container.querySelector('.search-clear');

// Option 3: If ID must be used, verify it's inside container
const searchInput = container.querySelector('#search-input');
if (searchInput && !container.contains(searchInput)) {
  console.error('search-input found outside container!');
  return;
}
```

**Recommendation**: Use data attributes or class selectors. IDs should be avoided unless absolutely necessary.

---

## 3. Router Scroll Reset Logic (LOW - Can Use Utility)

### Issue: Multiple setTimeout Calls for Scroll Reset

**Location**: `src/app/router.js` lines 10-25, 30-64, 279-311

**Current Pattern**:
```javascript
// Line 19-24: Reset all views
document.querySelectorAll('[id^="view-"]').forEach(view => {
  view.scrollTop = 0;
  view.style.scrollTop = '0';
});

// Line 56-63: Multiple timeouts
setTimeout(() => { view.scrollTop = 0; }, 0);
setTimeout(() => { view.scrollTop = 0; }, 100);

// Line 279-311: More timeouts
setTimeout(() => { resetActiveViewPosition(viewName); }, 50);
```

**Problem**: 
- Triple timeouts are fragile
- Should use `requestAnimationFrame` for reliable reset
- Logic is duplicated

**Fix**: Use the `resetScroll()` utility from section 6.4 of the analysis:
```javascript
// src/utils/scroll.js
export function resetScroll(el) {
  if (!el) return;
  el.scrollTop = 0;
  el.style.scrollTop = '0';
  
  requestAnimationFrame(() => {
    el.scrollTop = 0;
    el.style.scrollTop = '0';
  });
}

// In router.js:
import { resetScroll } from '../utils/scroll.js';

// Replace all scroll reset code with:
resetScroll(activeView);
```

**Recommendation**: Extract to utility and use consistently. Router should own scroll reset (per contract).

---

## 4. Global DOM Queries in Router (MEDIUM)

### Issue: Router Queries Global DOM Elements

**Location**: `src/app/router.js` lines 99-109, 203-234

**Current Pattern**:
```javascript
// Line 99: Query all views globally
document.querySelectorAll('[id^="view-"]').forEach(el => { ... });

// Line 203-234: Check shell elements (sidebar, header, layout)
const sidebarBefore = document.querySelector('.global-sidebar');
const headerBefore = document.querySelector('.header');
const layoutBefore = document.querySelector('.layout');
```

**Problem**:
- Router is querying elements outside its scope
- The shell element checks are good (dev assertions), but the view queries could be more explicit

**Fix**:
```javascript
// For view queries, be explicit about what you're looking for
const allViews = Array.from(document.querySelectorAll('[id^="view-"]'));
// Or better: maintain a list of known view IDs
const KNOWN_VIEWS = ['today', 'tasks', 'projects', 'planner', 'files', 'workflow', 'cell-log', 'settings', '3d-print'];
const allViews = KNOWN_VIEWS.map(name => document.getElementById(`view-${name}`)).filter(Boolean);

// For shell checks, these are fine (they're dev assertions)
// But consider making them opt-in via a flag
```

**Recommendation**: The shell element checks are good dev assertions. Keep them but make them opt-in. For view queries, be more explicit.

---

## 5. ID Coercion Issues (HIGH - Use Utility)

### Issue: Inconsistent ID Handling in TasksPage

**Location**: `src/pages/TasksPage.js` lines 23, 47, 48, 61, 62, 69, 70, 78, 80

**Current Pattern**:
```javascript
const taskId = btn.dataset.taskId || btn.dataset.id;
// Later:
features.taskOperations.editTask(String(taskId));
features.taskOperations.deleteTask(String(taskId));
```

**Problem**:
- `String(taskId)` conversion happens inconsistently
- No validation that taskId is not null/undefined/empty
- Could pass invalid IDs to operations

**Fix**: Use ID normalization utility:
```javascript
// src/utils/ids.js
export function asIdString(x) {
  if (x === null || x === undefined) return null;
  const str = String(x);
  return str === '' || str === 'null' || str === 'undefined' ? null : str;
}

// In TasksPage.js:
import { asIdString } from '../utils/ids.js';

const taskId = asIdString(btn.dataset.taskId || btn.dataset.id);
if (!taskId) {
  console.warn('No valid taskId found', btn);
  return;
}

features.taskOperations.editTask(taskId); // Already a string, no conversion needed
```

**Recommendation**: Use `asIdString()` at every UI boundary. This prevents "task not found" bugs.

---

## 6. Fallback Chain Complexity (MEDIUM)

### Issue: TasksPage Has Deep Fallback Chains

**Location**: `src/pages/TasksPage.js` lines 37-172

**Current Pattern**:
```javascript
if (features?.taskOperations?.addTask) {
  features.taskOperations.addTask();
} else if (window.addTask) {
  window.addTask();
}
```

**Problem**:
- Deep fallback chains make it hard to trace what actually runs
- If both exist, which one is used? (First one)
- No logging when fallback is used (makes debugging hard)

**Fix**:
```javascript
// Option 1: Fail fast if expected feature is missing (preferred)
if (!features?.taskOperations?.addTask) {
  console.error('taskOperations.addTask not available');
  return;
}
features.taskOperations.addTask();

// Option 2: Log when fallback is used
if (features?.taskOperations?.addTask) {
  features.taskOperations.addTask();
} else if (window.addTask) {
  console.warn('Using fallback: window.addTask (taskOperations.addTask not available)');
  window.addTask();
} else {
  console.error('No addTask handler available');
}
```

**Recommendation**: Fail fast in production, log fallbacks in development. This makes bugs obvious.

---

## 7. Module-Level State (LOW)

### Issue: TasksPage Uses Module-Level `bound` Flag

**Location**: `src/pages/TasksPage.js` line 7, 13, 213

**Current Pattern**:
```javascript
let bound = false; // Module-level

function bind(container, features) {
  if (bound) return;
  // ... install delegation
  bound = true;
}
```

**Problem**:
- If TasksPage is imported multiple times, `bound` is shared
- If container changes (e.g., DOM is replaced), delegation might not re-install
- Better to use container-level flag

**Fix**:
```javascript
function bind(container, features) {
  if (container.__tasksPageBound) return;
  container.__tasksPageBound = true;
  // ... install delegation
}
```

**Recommendation**: Use container-level flag. This ensures delegation is tied to the specific container instance.

---

## Summary of Issues

### Critical (Fix Immediately)
1. **Duplicate event delegation** - TasksPage and renderTasks both install handlers
   - **Fix**: Remove delegation from renderTasks.js

### High Priority (Fix This Week)
2. **ID coercion** - Inconsistent String() conversions
   - **Fix**: Use `asIdString()` utility at UI boundaries
3. **Non-scoped selectors** - Using global IDs in TasksPage
   - **Fix**: Use data attributes or class selectors

### Medium Priority (Fix When Convenient)
4. **Fallback chain complexity** - Deep fallback chains
   - **Fix**: Fail fast or log fallbacks
5. **Global DOM queries in router** - Could be more explicit
   - **Fix**: Maintain list of known views

### Low Priority (Nice to Have)
6. **Scroll reset logic** - Multiple timeouts
   - **Fix**: Use `resetScroll()` utility
7. **Module-level state** - `bound` flag
   - **Fix**: Use container-level flag

---

## Concrete Patch Plan

### Step 1: Remove Duplicate Delegation (Critical)
1. Remove event delegation from `src/ui/renderTasks.js` lines 221-273
2. Ensure TasksPage handles all task actions
3. Test that delete/edit/toggle still work

### Step 2: Add ID Normalization (High)
1. Create `src/utils/ids.js` with `asIdString()` and `isNilId()`
2. Update TasksPage to use `asIdString()` for all task IDs
3. Update ProjectsPage similarly

### Step 3: Fix Selectors (High)
1. Change `#search-input` to `[data-search-input]` in TasksPage
2. Update HTML to use data attributes
3. Verify no other global ID selectors in page modules

### Step 4: Extract Scroll Utility (Low)
1. Create `src/utils/scroll.js` with `resetScroll()`
2. Update router to use it
3. Remove triple-timeout pattern

This plan won't change styling or behavior - it only fixes split authority issues.
