# Refactoring and Cleanup Opportunities Analysis

## Executive Summary

This document identifies refactoring opportunities, code duplication, cleanup targets, and architectural improvements for the task tracker app. The analysis covers function refactoring, code organization, and quality improvements.

**⚠️ CRITICAL: This refactoring must be sequenced carefully to avoid re-introducing bugs (duplicate handlers, stale globals, ID coercion, layout glitches). Follow the contracts and sequencing outlined below.**

---

## 1. Non-Negotiable Contracts (Prevent Refactor Drift)

Before any refactoring, establish these contracts that **must be true** for the entire codebase:

### Page Contract (Every Page Module Must Follow)

* `render(containerEl, state, features)` is the **only entry point**
* It **only queries inside `containerEl`** (`containerEl.querySelector(...)`)
* It **installs event delegation on `containerEl` exactly once** (idempotent flag)
* It **must not depend on global DOM ids** except the container itself

### Operations Contract (Task/Project/etc.)

* `taskOperations.*(ctx, ...)` **never reaches into the DOM** unless it is explicitly "UI operations"
* **IDs are treated as strings everywhere** at the UI boundary. Convert only at storage boundary if you must

### Router Contract

* **One global entrypoint only**: `window.switchView = routerSwitchView` (single source of truth)
* **Router owns hide/show and scroll reset**. Pages do not.

**If you hold these contracts, most cleanup becomes easy and safe.**

---

## 2. Critical Duplicate Functions (HIGH PRIORITY - Do First)

### 2.1 Render Function Duplicates (HIGH PRIORITY - Do First)

**Issue**: Multiple render functions exist in both inline HTML and module files, causing:
- Shadowing depending on load order
- Confusing stack traces
- Accidental re-wiring when someone calls `renderTasks()` directly

#### Duplicates Found:

1. **`renderProjects()`**
   - Inline: `tasklist (1).html` line ~10476
   - Module: `src/ui/renderProjects.js`
   - **Status**: Module version is used, inline should be removed

2. **`renderTasks()`**
   - Inline: `tasklist (1).html` line ~10165
   - Module: `src/ui/renderTasks.js`
   - **Status**: Module version is used, inline should be removed

3. **`renderFiles()`**
   - Inline: `tasklist (1).html` line ~13190
   - Module: `src/ui/renderFiles.js`
   - **Status**: Module version is used, inline should be removed

4. **`renderWorkflow()`**
   - Inline: `tasklist (1).html` line ~13526
   - Module: `src/ui/renderWorkflow.js`
   - **Status**: Module version is used, inline should be removed

**Safe Migration Pattern** (Prevents Silent Breakage):

1. **Rename inline duplicates first** (one test run to catch call sites):
   ```javascript
   // In tasklist.html, rename:
   function legacy_renderTasks_DO_NOT_USE() { ... }
   function legacy_renderProjects_DO_NOT_USE() { ... }
   function legacy_renderFiles_DO_NOT_USE() { ... }
   function legacy_renderWorkflow_DO_NOT_USE() { ... }
   ```

2. **Search for calls to old names**; route them to router/pages instead:
   ```javascript
   // Replace:
   renderTasks();
   // With:
   window.routerSwitchView('tasks');
   ```

3. **Delete the inline versions** once no calls remain.

**Checklist**:
- [ ] Rename inline duplicates to `legacy_*_DO_NOT_USE` for one test run
- [ ] Search for calls to old names; route them to router/pages
- [ ] Delete inline versions once no calls remain

---

## 3. Replace Inline onclick Handlers with data-action Delegation (MEDIUM - Do Early)

**Why This Matters**: Inline handlers are the #1 reason for debugging issues. They create "mystery calls" and make it hard to trace event flow.

### Safe Migration Pattern

1. **Keep HTML structure exactly the same**
2. **Replace `onclick="foo()"` with `data-action="foo"`** (or namespaced: `task:add`, `task:sort`, `router:goto`)
3. **In the relevant page module, implement delegation**:

```javascript
function installDelegation(container, handlers) {
  if (container.__actionsInstalled) return;
  container.__actionsInstalled = true;

  container.addEventListener('click', (e) => {
    const el = e.target.closest('[data-action]');
    if (!el) return;
    const action = el.dataset.action;
    
    // Dispatch based on action
    if (action === 'task:add') {
      handlers.addTask();
    } else if (action === 'task:edit') {
      handlers.editTask(el.dataset.taskId);
    }
    // ... etc
  });
}
```

**Checklist**:
- [ ] Tasks view: replace all inline onclicks listed in progress report
- [ ] Projects view: same
- [ ] Settings link + sidebar nav: route only through router

---

## 4. Delete Old render() Function (Don't Refactor It)

**Location**: `tasklist (1).html` lines 9831-10099

**Issue**: You already built `router.js` and `pages.js`. Keeping an inline dispatcher invites regression and split authority.

**Action**: **Delete it, don't refactor it.**

**Checklist**:
- [ ] Ensure router calls `PAGES[view].render(...)`
- [ ] Remove/disable the old `render()` dispatcher entirely
- [ ] Any code that still calls `render()` should call router instead

This is the cleanest way to prevent split authority.

---

## 5. Long Functions That Need Breaking Down (Do AFTER Call Graph is Stable)

**⚠️ IMPORTANT**: Refactor long functions **only after** handler consolidation is complete. Right now you're still untangling who calls what. If you refactor internals too early, you'll create merge conflicts and hide the real wiring bug.

### 5.1 `editTask()` Function (387-568) - Refactor AFTER Handler Consolidation

**Location**: `src/features/taskOperations.js` lines 387-568  
**Length**: ~181 lines  
**Complexity**: High - handles modal population, form field updates, protocol handling

**When to Refactor**: **After** ensuring all UI actions route through page module delegation → taskOperations wrapper

**Refactoring Strategy** (Do Later):
```javascript
// Split into smaller functions
function findTaskForEditing(tasks, id) { ... }
function populateEditModalFields(modal, task) { ... }
function populateProtocolFields(modal, task) { ... }
function populateFileFields(modal, task) { ... }
function showEditModal(modal) { ... }

export function editTask(ctx, id) {
  const task = findTaskForEditing(ctx.tasks, id);
  if (!task) return;
  
  const modal = getEditModal();
  populateEditModalFields(modal, task);
  populateProtocolFields(modal, task);
  populateFileFields(modal, task);
  showEditModal(modal);
}
```

**Checklist** (Do in Order):
- [ ] First: ensure all UI actions route through page module delegation → taskOperations wrapper
- [ ] Then: split `editTask` into "find/validate" + "populateModal" + "showModal"

### 5.2 `addTask()` Function (129-267) - Refactor AFTER Handler Consolidation

**Location**: `src/features/taskOperations.js` lines 129-267  
**Length**: ~138 lines  
**Complexity**: Medium-High - handles form reading, validation, file linking, task creation

**When to Refactor**: **After** handler consolidation

**Refactoring Strategy** (Do Later):
```javascript
function readTaskFormData() { ... }
function extractFileLinks(projectId) { ... }
function createTaskObject(formData, fileIds) { ... }
function clearTaskForm() { ... }

export async function addTask(ctx, titleOverride, statusOverride) {
  const formData = readTaskFormData(titleOverride, statusOverride);
  if (!formData.title) return;
  
  const fileIds = await extractFileLinks(formData.projectId);
  const newTask = createTaskObject(formData, fileIds);
  
  updateStoreSafely({ tasks: [newTask, ...ctx.tasks] });
  
  if (!titleOverride) clearTaskForm();
}
```

**Checklist** (Do in Order):
- [ ] First: ensure all UI actions route through page module delegation
- [ ] Then: split `addTask` into "read form" + "build task object" + "store update" + "clear form"

### 5.3 Other Long Functions (Refactor After Stability)

**Note**: Other long functions like `renderProjects()`, `renderTaskList()` can be refactored later. Focus on wiring stability first.


---

## 6. Utilities: Only Extract Bug Reducers (Do Now)

**⚠️ Don't create a utils forest.** Extract only the utilities that **reduce bug surface area immediately**:

### 6.1 Event Delegation Helper (HIGH PRIORITY)

**Why**: Prevents duplicate listeners and inconsistent patterns

```javascript
// src/utils/delegation.js
export function installDelegatedClick(container, selector, handler, flagName) {
  if (container[flagName]) return;
  container[flagName] = true;
  
  container.addEventListener('click', (e) => {
    const target = e.target.closest(selector);
    if (target) handler(e, target);
  }, true);
}
```

### 6.2 DOM Getters with Warnings (HIGH PRIORITY)

**Why**: Reduces null crash spam; improves debug signal

```javascript
// src/utils/dom.js
export function qs(container, selector) {
  if (!container) {
    console.warn('qs: container is null/undefined', selector);
    return null;
  }
  return container.querySelector(selector);
}

export function byId(id, context = '') {
  const el = document.getElementById(id);
  if (!el) {
    console.warn(`Element not found: ${id}`, context);
  }
  return el;
}
```

### 6.3 ID Normalization (HIGH PRIORITY)

**Why**: Prevents "task not found" class bugs from returning

```javascript
// src/utils/ids.js
export function asIdString(x) {
  if (x === null || x === undefined) return null;
  return String(x);
}

export function isNilId(x) {
  return !x || x === '' || x === 'null' || x === 'undefined';
}
```

### 6.4 Reset Scroll Position (MEDIUM PRIORITY)

**Why**: Replace triple timeouts with one consistent method (prefer `requestAnimationFrame`)

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
```

**Checklist**:
- [ ] `src/utils/dom.js`: `qs(container, sel)`, `byId(id)` with warn
- [ ] `src/utils/delegation.js`: `installDelegatedClick(container, selector, fn, flag)`
- [ ] `src/utils/ids.js`: `asIdString(x)` and `isNilId(x)`
- [ ] `src/utils/scroll.js`: `resetScroll(el)`

**Everything else** (error handler class, module loader, listener manager) can wait until the app is stable.

---

## 7. Repeated Code Patterns

### 7.1 DOM Element Access Without Null Checks (Use Utility)

**Pattern Found**: Throughout `tasklist (1).html` and module files

**Examples**:
```javascript
// Bad pattern (found in multiple places)
const projectSelect = document.getElementById('in-project');
laneSelect.innerHTML = `...`; // No null check

// Good pattern
const projectSelect = document.getElementById('in-project');
if (!projectSelect) {
  console.warn('Element not found: in-project');
  return;
}
laneSelect.innerHTML = `...`;
```

**Recommendation**: Use the `byId()` utility from section 6.2

**Affected Locations**:
- Lines 3787-3788: `projectSelect`, `laneSelect`
- Lines 3904-3906: `projectSelect`, `filesSelectContainer`, `filesSelect`
- Lines 3940-3941: `filesSection`, `filesSelect`
- Lines 3868: `cellLogProjectSelect`
- Lines 5002, 5053, 5077: View element access in `switchView()`
- Line 3985: `vaultBadge` access

### 7.2 Event Delegation Setup Pattern (Use Utility)

**Pattern Found**: Repeated in `renderTasks.js` and `renderProjects.js`

**Current Pattern**:
```javascript
if (!c.__taskActionsInstalled) {
  c.__taskActionsInstalled = true;
  c.addEventListener('click', (e) => {
    // ... handler logic
  });
}
```

**Recommendation**: Use the `installDelegatedClick()` utility from section 6.1

### 3.3 Store Update Pattern

**Pattern Found**: Repeated in `taskOperations.js`

**Current Pattern**:
```javascript
if (window.Petal?.store) {
  const state = window.Petal.store.getState();
  window.Petal.store.setState({ ...state, ...updates });
} else {
  // Fallback
}
```

**Recommendation**: Already has `updateStoreSafely()` but it's not used consistently. Make it the standard:
```javascript
// Use everywhere instead of direct store access
updateStoreSafely({ tasks: updatedTasks }, fallbackFn);
```

### 3.4 Module Availability Checks

**Pattern Found**: Throughout `tasklist (1).html`

**Current Pattern**:
```javascript
if (window.Petal?.features?.taskOperations?.editTask) {
  window.Petal.features.taskOperations.editTask(taskId);
} else if (window.Petal?.handlers?.editTask) {
  window.Petal.handlers.editTask(taskId);
} else {
  console.error('No edit handler available');
}
```

**Recommendation**: Create helper:
```javascript
// utils/modules.js
export function callModuleFunction(path, ...args) {
  const parts = path.split('.');
  let obj = window;
  for (const part of parts) {
    obj = obj?.[part];
    if (!obj) return null;
  }
  if (typeof obj === 'function') {
    return obj(...args);
  }
  return null;
}

// Usage:
callModuleFunction('Petal.features.taskOperations.editTask', taskId) ||
callModuleFunction('Petal.handlers.editTask', taskId) ||
console.error('No edit handler available');
```

### 7.3 Scroll Position Reset Pattern (Use Utility)

**Pattern Found**: Repeated in `render()` function for settings view

**Current Pattern**:
```javascript
containerEl.scrollTop = 0;
containerEl.style.scrollTop = '0';
setTimeout(() => {
  containerEl.scrollTop = 0;
  containerEl.style.scrollTop = '0';
}, 0);
setTimeout(() => {
  containerEl.scrollTop = 0;
  containerEl.style.scrollTop = '0';
}, 50);
```

**Recommendation**: Use the `resetScroll()` utility from section 6.4. **Router should own scroll reset, not pages.**

---

## 4. Code Quality Issues

### 4.1 Missing Error Handling

**Issues**:
- Async functions without try-catch blocks
- Promise rejections not caught
- Error logging without user notification

**Examples**:
- Line 5057: `await renderWorkflowCanvas(...)` - No try-catch
- Line 5113: `await renderWorkflow()` - No try-catch
- Line 5413: Error caught but only logged

**Recommendation**: Create error boundary utility:
```javascript
// utils/errors.js
export async function safeAsync(fn, errorMessage, showAlert = false) {
  try {
    return await fn();
  } catch (error) {
    console.error(errorMessage, error);
    if (showAlert) {
      alert(`${errorMessage}: ${error.message}`);
    }
    return null;
  }
}

// Usage:
await safeAsync(
  () => renderWorkflow(),
  'Failed to render workflow',
  true
);
```

### 4.2 Inconsistent Type Coercion

**Issue**: String 'null' vs actual null comparison

**Examples**:
```javascript
// Line 3292, 3374
projectIdAttr !== 'null' // String comparison

// Better:
const projectId = normalizeProjectIdValue(projectIdAttr);
```

**Recommendation**: Create normalization utility:
```javascript
// utils/values.js
export function normalizeProjectIdValue(value) {
  if (!value || value === '' || value === 'null' || value === 'undefined') {
    return null;
  }
  const num = parseInt(value, 10);
  return isNaN(num) ? null : num;
}
```

### 4.3 Magic Strings

**Issue**: Hard-coded strings throughout codebase

**Examples**:
- `'null'`, `'undefined'` - should be constants
- `'view-'` prefix - should be constant
- Status strings: `'Inbox'`, `'Todo'`, `'Doing'`, `'Done'` - should be enum

**Recommendation**: Create constants file:
```javascript
// utils/constants.js
export const NULL_STRING = 'null';
export const UNDEFINED_STRING = 'undefined';
export const VIEW_PREFIX = 'view-';

export const TASK_STATUS = {
  INBOX: 'Inbox',
  TODO: 'Todo',
  DOING: 'Doing',
  DONE: 'Done',
  BACKLOG: 'Backlog'
};

export const TASK_PRIORITY = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3
};
```

### 4.4 Inconsistent Function Signatures

**Issue**: Some functions take `ctx`, others take individual parameters

**Examples**:
- `addTask(ctx, titleOverride, statusOverride)` - takes context object
- `toggleTask(ctx, id)` - takes context object
- `editTask(ctx, id)` - takes context object
- But some handlers take individual parameters

**Recommendation**: Standardize on context object pattern for all operations.

---

## 5. Unused/Dead Code

### 5.1 Empty/Stub Functions

**Found**:
- `removeTags()` - line 5651 (body removed, handled by module)
- Various wrapper functions that only log errors

**Recommendation**: Remove these functions entirely.

### 5.2 Commented Out Code Blocks

**Found**:
- Kanban mode code (line 3431)
- Working Log code (line 7817)
- Matrix toggle functions (line 12925)
- Subtask lane selector (line 12231)

**Recommendation**: Remove commented code blocks. If needed, they're in git history.

### 5.3 Legacy Wrapper Functions

**Found** (from CLEANUP_PLAN.md):
- Task drawer wrappers (lines 5755-5850)
- File management wrappers (lines 13071-13140)
- Workflow function wrappers (lines 13527-13560)
- Cell Log wrappers (lines 10085-10090)

**Recommendation**: Remove wrapper functions and update call sites to use modules directly.

### 5.4 Unused CSS Classes

**Issue**: CSS classes defined but never used in HTML/JS

**Recommendation**: Use a tool like PurgeCSS or manually audit CSS usage.

---

## 6. Architectural Improvements

### 6.1 Centralized Error Handling

**Current State**: Errors handled inconsistently throughout codebase

**Recommendation**: Create error handling system:
```javascript
// utils/errorHandler.js
class ErrorHandler {
  log(error, context) { ... }
  notifyUser(error, message) { ... }
  report(error, context) { ... }
}

export const errorHandler = new ErrorHandler();
```

### 6.2 Event Listener Management

**Issue**: Event listeners added but never removed, potential memory leaks

**Recommendation**: Create listener manager:
```javascript
// utils/listenerManager.js
class ListenerManager {
  constructor() {
    this.listeners = new Map();
  }
  
  add(element, event, handler, options) {
    const key = `${element.id || 'unknown'}-${event}`;
    this.remove(key); // Remove existing if any
    element.addEventListener(event, handler, options);
    this.listeners.set(key, { element, event, handler, options });
  }
  
  remove(key) {
    const listener = this.listeners.get(key);
    if (listener) {
      listener.element.removeEventListener(
        listener.event,
        listener.handler,
        listener.options
      );
      this.listeners.delete(key);
    }
  }
  
  clear() {
    for (const key of this.listeners.keys()) {
      this.remove(key);
    }
  }
}

export const listenerManager = new ListenerManager();
```

### 6.3 Module Loading System

**Issue**: Modules accessed without ensuring they're loaded

**Recommendation**: Create module loader:
```javascript
// utils/moduleLoader.js
class ModuleLoader {
  constructor() {
    this.loaded = new Set();
    this.loading = new Map();
  }
  
  async ensureLoaded(modulePath) {
    if (this.loaded.has(modulePath)) return true;
    if (this.loading.has(modulePath)) {
      return this.loading.get(modulePath);
    }
    
    const promise = this.loadModule(modulePath);
    this.loading.set(modulePath, promise);
    
    try {
      await promise;
      this.loaded.add(modulePath);
      return true;
    } catch (error) {
      console.error(`Failed to load module: ${modulePath}`, error);
      return false;
    } finally {
      this.loading.delete(modulePath);
    }
  }
  
  async loadModule(path) {
    // Implementation depends on module system
  }
}

export const moduleLoader = new ModuleLoader();
```

---

## 7. Performance Optimizations

### 7.1 Debounce/Throttle Missing

**Issue**: Some functions called frequently without debouncing

**Examples**:
- Search input handlers
- Scroll handlers
- Resize handlers

**Recommendation**: Add debounce/throttle utilities:
```javascript
// utils/performance.js
export function debounce(fn, delay) {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

export function throttle(fn, delay) {
  let lastCall = 0;
  return (...args) => {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      fn(...args);
    }
  };
}
```

### 7.2 Unnecessary Re-renders

**Issue**: Full re-renders when only small parts changed

**Recommendation**: Implement incremental rendering or virtual DOM for large lists.

---

## 8. Testing Opportunities

### 8.1 Extract Pure Functions

**Functions that can be easily tested**:
- `extractTags()` - already pure
- `removeTags()` - already pure
- `getStageForLaneAndStatus()` - already pure
- `normalizeProjectIdValue()` - should be extracted
- `filterTasks()` - should be extracted
- `sortTasks()` - should be extracted

**Recommendation**: Extract these to separate utility files for easy testing.

---

## 9. Documentation Improvements

### 9.1 Missing JSDoc Comments

**Issue**: Most functions lack documentation

**Recommendation**: Add JSDoc to all exported functions:
```javascript
/**
 * Renders the tasks view
 * @param {HTMLElement} containerEl - Container element to render into
 * @param {Object} state - Current app state
 * @param {Object} handlers - Event handlers
 * @returns {Promise<void>}
 */
export async function renderTasks(containerEl, state, handlers) {
  // ...
}
```

### 9.2 Type Definitions

**Recommendation**: Add JSDoc type definitions or migrate to TypeScript:
```javascript
/**
 * @typedef {Object} Task
 * @property {number} id
 * @property {string} title
 * @property {boolean} done
 * @property {string} status
 * @property {number} priority
 * @property {string} [due]
 * @property {string[]} [tags]
 */
```

---

## 8. Layout Glitches: Sidebar/Page Collision

**Common Cause**: A page injects its own `.layout` / `.sidebar` / `.header` or global grid CSS inside a container.

**Example**: Today page HTML includes a full shell layout. If you use it, it must be converted into **page-only content** (no sidebar/header) and scoped styles.

### Checklist to Integrate Pages Safely

- [ ] Remove `<html><head><body>` shell; render only inside `#view-{name}`
- [ ] Remove `.layout`, `.sidebar`, `.header` from page templates
- [ ] Prefix all CSS with `#view-{name}` (or wrap CSS with `#view-{name} {}` scoping)
- [ ] Keep current styling variables; do not introduce new root-level CSS

This prevents layout collision.

---

## 9. Priority Recommendations (Sequenced)

### Week 1: Wiring Stability (Do First)

**Goal**: Establish contracts and remove duplicates without breaking anything

- [ ] **Establish contracts** (section 1) - document and enforce
- [ ] **Rename inline duplicate render functions** (section 2.1) - smoke test
- [ ] **Replace any remaining direct calls** to inline renderers with router calls
- [ ] **Delete inline render duplicates** once no calls remain
- [ ] **Convert inline onclicks → `data-action`** for Tasks + Projects (section 3)
- [ ] **Add delegation in TasksPage + ProjectsPage** to handle those actions
- [ ] **Ensure only one view switch function exists** globally (`window.switchView`)
- [ ] **Delete old `render()` function** (section 4) - don't refactor it

### Week 1: Safety Utilities (Do in Parallel)

- [ ] **Add `asIdString()` and use it** at every UI boundary (section 6.3)
- [ ] **Add delegation helper** and use it everywhere (section 6.1)
- [ ] **Add `resetScrollPosition()`** and use it in router only (section 6.4)
- [ ] **Add DOM getters with warnings** (section 6.2)

### Week 2+: After Stability (Do Later)

- [ ] Refactor long functions (`editTask()`, `addTask()`) - section 5
- [ ] Remove dead code (empty functions, commented blocks, wrappers)
- [ ] Add JSDoc comments
- [ ] Other utilities (error handler, module loader, etc.) - only if needed

---

## 10. Minimal Week 1 Checklist

### Wiring Stability
- [ ] Rename inline duplicate render functions (smoke test)
- [ ] Replace any remaining direct calls to inline renderers with router calls
- [ ] Delete inline render duplicates
- [ ] Convert inline onclicks → `data-action` for Tasks + Projects
- [ ] Add delegation in TasksPage + ProjectsPage to handle those actions
- [ ] Ensure **only one** view switch function exists globally (`window.switchView`)
- [ ] Delete old `render()` dispatcher

### Safety Utilities
- [ ] Add `asIdString()` and use it at every UI boundary
- [ ] Add delegation helper and use it everywhere
- [ ] Add `resetScrollPosition()` and use it in router only

---

## 11. Metrics

### Before Refactoring
- **Functions > 100 lines**: ~15
- **Duplicate functions**: 4 major duplicates
- **Missing null checks**: ~20+ locations
- **Repeated patterns**: ~10+ patterns
- **Dead code**: ~500+ lines

### After Refactoring (Target)
- **Functions > 100 lines**: < 5
- **Duplicate functions**: 0
- **Missing null checks**: 0
- **Repeated patterns**: Extracted to utilities
- **Dead code**: Removed

---

## 12. Conclusion

This refactoring will significantly improve:
- **Maintainability**: Easier to understand and modify
- **Reliability**: Fewer bugs from null checks and error handling
- **Performance**: Better code organization and potential optimizations
- **Developer Experience**: Clearer code structure and documentation

**Critical Success Factors**:
1. **Follow contracts** - they prevent refactor drift
2. **Sequence carefully** - wiring stability before internal refactoring
3. **Rename first, delete later** - prevents silent breakage
4. **Extract only bug reducers** - don't create utils forest
5. **Test after each step** - incremental safety

The work should be done incrementally, testing after each step to ensure stability.

---

## 13. Next Steps: Surgical Analysis

If you want the fastest "surgical" next step: provide your current `src/app/router.js` and one page module (TasksPage.js). I can point out exactly where authority is still split (duplicate listeners, non-scoped selectors, leftover global calls), and give you a concrete patch plan that won't change styling or behavior.
