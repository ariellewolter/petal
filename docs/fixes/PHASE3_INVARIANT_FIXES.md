# Phase 3: Invariant Checks & Empty Overwrite Protection

## Summary

Added critical invariant checks and protections to prevent "projects exist but UI blank" failures from being hidden.

---

## ✅ Fixes Applied

### 1. Post-Render Invariant Check (`src/ui/renderProjects.js`)

**Problem:** Projects could exist in state but no cards render, and the failure was silent.

**Fix:** Added `queueMicrotask()` check immediately after DOM update:

```js
queueMicrotask(() => {
  const s = state;
  const cards = document.querySelectorAll('#project-container .project-card').length;
  const projectsCount = (s.projects || []).length;

  if (projectsCount > 0 && cards === 0) {
    console.error('❌ INVARIANT FAIL: projects exist but no cards rendered', {
      projectsCount,
      sampleProjects: (s.projects || []).slice(0, 3).map(p => ({ id: p.id, name: p.name })),
      containerHTMLPreview: (document.getElementById('project-container')?.innerHTML || '').slice(0, 200),
      filteredListLength: list.length
    });
  }
});
```

**Why `queueMicrotask()`:** Runs immediately after DOM update, before any other code (including `forceHideAllForms()`) can overwrite it.

**Result:** If projects exist but cards don't render, you'll see an immediate error with diagnostic info.

---

### 2. `forceHideAllForms()` Sanity Probe (`src/ui/renderProjects.js`)

**Problem:** `forceHideAllForms()` might hide the project container without throwing.

**Fix:** Added visibility check 60ms after `forceHideAllForms()` runs:

```js
setTimeout(() => {
  const el = document.getElementById('project-container');
  if (el) {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0) {
      console.error('🧪 project-container visibility issue detected:', {
        display: cs.display,
        visibility: cs.visibility,
        opacity: cs.opacity,
        parentDisplay: getComputedStyle(el.parentElement)?.display
      });
    }
  }
}, 60);
```

**Result:** If `forceHideAllForms()` accidentally hides the container, you'll see it in the console.

---

### 3. Empty Overwrite Protection (`src/state/store.js`)

**Status:** ✅ **Already implemented** (lines 115-118)

The store already has protection against empty overwrites:

```js
if (incomingProjects.length === 0 && currentProjects.length > 0) {
  console.warn('⚠️ BLOCKED empty project overwrite - preserving existing projects');
  state.projects = currentProjects;
}
```

**Result:** Bad imports or external file changes won't nuke existing projects.

---

### 4. `refreshProjectSelects()` Store-Only (`tasklist (1).html:2657`)

**Problem:** Function was syncing local `projects` variable, creating potential for inconsistency.

**Fix:** Removed local variable sync - function now **only** reads from store:

```js
// Phase 3: Read ONLY from store (single source of truth)
// Never read from globals, never accept params, never sync local vars
const projectsFromStore = state.projects || [];
```

**Removed:**
- `projects = projectsFromStore;` (line 2679)
- Debug logging of local/global variables (kept store-only logging)

**Result:** Function is now deterministic - always uses store, never globals.

---

## What These Fixes Catch

### Invariant Check Catches:
- ✅ Renderer crashes (exception in `renderProjectCard`)
- ✅ DOM overwrites (something clears `innerHTML` after render)
- ✅ Filtering bugs (projects filtered out incorrectly)
- ✅ Container not found (wrong selector)

### Sanity Probe Catches:
- ✅ `forceHideAllForms()` hiding container
- ✅ Parent element hiding container
- ✅ CSS rules hiding container

### Empty Overwrite Protection Catches:
- ✅ Bad imports (empty projects array)
- ✅ External file modifications (JSON file corrupted)
- ✅ Race conditions during load

### Store-Only `refreshProjectSelects()` Prevents:
- ✅ Reading stale local variables
- ✅ Reading from wrong source
- ✅ Inconsistent state between store and globals

---

## Testing Checklist

After these fixes, verify:

- [ ] Projects render correctly on app startup
- [ ] Invariant check logs when projects exist but cards missing
- [ ] Sanity probe logs when container is hidden
- [ ] Empty overwrite protection blocks bad imports
- [ ] Dropdowns populate from store only (no globals)
- [ ] Console shows diagnostic info when issues occur

---

## Next Steps (If Issues Persist)

If you still see "projects blank" after these fixes, check console for:

1. **Invariant Fail:** Projects exist but no cards → DOM overwrite or render crash
2. **Visibility Issue:** Container is hidden → `forceHideAllForms()` or CSS issue
3. **Empty Overwrite Blocked:** Bad import attempted → fix import data
4. **Store Projects Count:** If 0, check load path; if >0, check render path

The diagnostic logging will pinpoint exactly where the failure occurs.
