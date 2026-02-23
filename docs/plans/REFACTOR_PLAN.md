# Refactor Plan: Breaking Out of tasklist.html Monolith

## Goal State

- `tasklist.html` becomes a **thin shell**: sidebar + header + empty view containers + one bootstrap script
- Every view is rendered by **one module** in `src/pages/`
- **One** navigation/switchView function in `src/app/router.js`
- No inline `onclick="..."` anywhere (delegation only)
- No page fetches that inject global `<style>` into the DOM

---

## Phase 0: Foundation ✅ COMPLETE

### Created Files

1. **`src/app/pages.js`** - Page registry
   - Single source of truth for all page renderers
   - Maps view names to render functions
   - Currently wraps existing render functions

2. **`src/app/router.js`** - Single switchView function
   - Replaces the monolithic `switchView()` in tasklist.html
   - Handles view hiding/showing
   - Calls appropriate page renderer from registry
   - Available as `window.routerSwitchView()`

3. **`src/pages/TasksPage.js`** - Tasks page with event delegation
   - Wraps `renderTasks()` from `src/ui/renderTasks.js`
   - Adds event delegation for all task actions
   - Removes need for inline `onclick` handlers
   - Binds handlers only once (prevents duplicate listeners)

### Current Status

- ✅ Foundation files created
- ✅ TasksPage module created
- ✅ Router imported into tasklist.html
- ⚠️ Old `switchView()` still active (needs gradual migration)
- ⚠️ Inline handlers still exist in renderTasks.js (will be replaced by delegation)

---

## Phase 1: Extract Pages (Incremental)

### Order (Best ROI / Lowest Coupling First)

1. ✅ **Today** - Already a module
2. ✅ **Settings** - Already a module  
3. ✅ **Tasks** - Created TasksPage.js (needs testing)
4. ⏳ **Projects** - Next priority
5. ⏳ **Files**
6. ⏳ **Planner**
7. ⏳ **Workflow** - Already a module, but needs integration
8. ⏳ **Cell Log** - Already a module
9. ⏳ **3D Print** - Critical: Replace fetch/inject with module

### Pattern for Each Page

```js
// src/pages/XPage.js
let bound = false;

export function renderXPage(container, state, features) {
  if (!bound) {
    bind(container, features);
    bound = true;
  }
  container.innerHTML = /* HTML string */;
}

function bind(container, features) {
  container.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    // Handle actions via features
  });
}
```

---

## Phase 2: Remove Cross-File Duplication

Once pages are modules:
- Only one "Workflow renderer"
- Only one place for helpers like `escapeHtml`
- Shared utilities in `src/utils/`

### Shared Utilities to Create

- `src/utils/html.js` → `escapeHtml(text)`
- `src/utils/fileKey.js` → `getFileKey(file)`
- `src/utils/dom.js` → `qs/qsa/on/closest` helpers (optional)

---

## Phase 3: "No Inline Scripts" Policy

### Hard Rule

- No `onclick="..."` 
- No `<script>...</script>` inside injected HTML
- No multiple definitions of globals

Everything is:
- Event delegation in the module
- Module imports
- Features exposed under `window.Petal.features`

---

## Critical Fix: Kill 3d-print.html Fetch

**Current Problem:**
- `pages/3d-print.html` is fetched and injected
- Styles are injected globally (even with scoping, risky)
- Scripts are executed in global scope
- Causes CSS/DOM leak hazards

**Solution:**
- Create `src/pages/ThreeDPrintPage.js`
- Move HTML markup to template string
- Move styles to scoped CSS (or keep in tasklist.html)
- Move scripts to module functions
- Register in `PAGES` registry

---

## Migration Strategy

### Step 1: Test New Router (Non-Breaking)

1. Keep old `switchView()` in tasklist.html
2. Add new `routerSwitchView()` alongside it
3. Test with one view (e.g., Tasks) using new router
4. Verify no regressions

### Step 2: Gradual Migration

1. Update sidebar navigation to use `routerSwitchView()`
2. Update any programmatic view switches
3. Keep old `switchView()` as fallback initially
4. Remove old `switchView()` once all paths use router

### Step 3: Remove Inline Handlers

1. For each page, ensure TasksPage-style delegation exists
2. Remove `onclick="..."` from HTML templates
3. Remove inline handlers from render functions
4. Test that all actions still work

---

## Invariants (Prevent Regressions)

For each page extraction, require:

- ✅ Rendering only touches its own container (`#view-x`)
- ✅ All events are delegated under that container
- ✅ No globals added except registering page renderer in `PAGES`
- ✅ No inline styles/scripts injected into `<head>` or `<body>`
- ✅ Re-rendering the page does not attach duplicate listeners

If any invariant fails, don't move on.

---

## Next Immediate Steps

1. **Test TasksPage** - Verify event delegation works
2. **Extract ProjectsPage** - Similar pattern to TasksPage
3. **Extract ThreeDPrintPage** - Critical fix for CSS leakage
4. **Update sidebar** - Use `routerSwitchView()` instead of `switchView()`
5. **Remove old switchView()** - Once all paths migrated

---

## Benefits

**Before:**
- Hours per bug (duplicate functions, multiple click paths, state mutation from random places, CSS bleed)
- 17k-line monolith
- Mixed responsibilities

**After:**
- Minutes per bug (only one path can trigger an action, only one renderer controls a view, only one router controls show/hide)
- Thin shell + modular pages
- Clear separation of concerns

---

## Files Created

- `src/app/pages.js` - Page registry
- `src/app/router.js` - Router with single switchView
- `src/pages/TasksPage.js` - Tasks page with delegation
- `REFACTOR_PLAN.md` - This document
