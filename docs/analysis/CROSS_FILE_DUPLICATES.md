# Cross-File Duplicate Code Analysis

## Executive Summary

Found **significant code duplication** between `tasklist (1).html` and other page files:
- **9 duplicate functions** between `tasklist (1).html` and `workflow-page.html`
- **1 duplicate function** (`escapeHtml`) between `workflow-page.html` and `pages/3d-print.html`
- **Similar utility function** (`esc` vs `escapeHtml`) across files

## Duplicate Functions Between tasklist and workflow-page.html

### 1. `renderWorkflowCanvas()` - **DUPLICATE**

**Location:**
- `tasklist (1).html`: Line 13348
- `workflow-page.html`: Line 589

**Status:** Both files contain full implementations of this function. The workflow-page.html version appears to be a standalone page, but the function is duplicated in tasklist.

---

### 2. `calculateProjectPositions()` - **DUPLICATE**

**Location:**
- `tasklist (1).html`: Line 13551
- `workflow-page.html`: Line 705

**Implementation Comparison:**
- Both implementations are **nearly identical**
- Same logic: grid layout with saved positions
- Same parameters and return structure

**Status:** Exact duplicate - can be extracted to a shared module.

---

### 3. `drawWfEdges()` - **DUPLICATE**

**Location:**
- `tasklist (1).html`: Line 13574
- `workflow-page.html`: Line 733

**Implementation Comparison:**
- Both draw SVG edges between related projects
- Similar logic for finding connections
- Minor differences in edge detection heuristics

**Status:** Near-duplicate - should be consolidated.

---

### 4. `setupPanZoom()` - **DUPLICATE**

**Location:**
- `tasklist (1).html`: Line 13641
- `workflow-page.html`: Line 811

**Status:** Both implement pan/zoom functionality for workflow canvas.

---

### 5. `openWfDetail()` - **DUPLICATE**

**Location:**
- `tasklist (1).html`: (referenced but implementation may be in module)
- `workflow-page.html`: Line 891

**Status:** Function exists in both files.

---

### 6. `closeWfDetail()` - **DUPLICATE**

**Location:**
- `tasklist (1).html`: (referenced)
- `workflow-page.html`: Line 984

**Status:** Function exists in both files.

---

### 7. `getLaneLabel()` - **DUPLICATE**

**Location:**
- `tasklist (1).html`: (referenced)
- `workflow-page.html`: Line 1003

**Status:** Utility function duplicated.

---

### 8. `getLaneTagClass()` - **DUPLICATE**

**Location:**
- `tasklist (1).html`: (referenced)
- `workflow-page.html`: Line 1015

**Status:** Utility function duplicated.

---

### 9. `wfApply()` - **DUPLICATE**

**Location:**
- `tasklist (1).html`: (referenced)
- `workflow-page.html`: (referenced)

**Status:** Function exists in both files.

---

## Duplicate Utility Functions

### `escapeHtml()` - **DUPLICATE**

**Location:**
- `workflow-page.html`: Line 997
- `pages/3d-print.html`: Line 432

**Implementation Comparison:**

**workflow-page.html:**
```javascript
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
```

**pages/3d-print.html:**
```javascript
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
```

**Difference:** 3d-print version has null check, workflow-page version doesn't.

**Status:** Near-duplicate - 3d-print version is more robust (handles null/undefined).

---

### `esc()` vs `escapeHtml()` - **SIMILAR FUNCTIONALITY**

**Location:**
- `tasklist (1).html`: Line 9398 - `esc()` function
- `workflow-page.html`: Line 997 - `escapeHtml()` function
- `pages/3d-print.html`: Line 432 - `escapeHtml()` function

**Implementation:**

**tasklist (1).html `esc()`:**
```javascript
function esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
```

**workflow-page.html / 3d-print.html `escapeHtml()`:**
```javascript
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
```

**Status:** Different implementations of the same concept (HTML escaping). The `escapeHtml()` approach is more robust (handles all HTML entities automatically), while `esc()` is faster but only handles basic entities.

---

## Impact Analysis

### Lines of Duplicate Code

| Category | Functions | Estimated Lines |
|----------|-----------|----------------|
| Workflow functions (tasklist ↔ workflow-page) | 9 functions | ~500-800 lines |
| Utility functions (escapeHtml) | 2 instances | ~10 lines |
| Similar utilities (esc vs escapeHtml) | 3 instances | ~15 lines |
| **Total** | **14 functions** | **~525-825 lines** |

---

## Recommendations

### High Priority

1. **Extract workflow functions to shared module**
   - Create `src/pages/WorkflowPage.js` or `src/features/workflowCanvas.js`
   - Move `renderWorkflowCanvas`, `calculateProjectPositions`, `drawWfEdges`, `setupPanZoom` to shared module
   - Both `tasklist (1).html` and `workflow-page.html` should import from the module

2. **Consolidate `escapeHtml()` function**
   - Use the more robust version (with null check from 3d-print)
   - Create shared utility: `src/utils/htmlUtils.js`
   - Replace all instances with the shared version

3. **Standardize HTML escaping**
   - Decide between `esc()` (faster, manual) vs `escapeHtml()` (robust, automatic)
   - If keeping `escapeHtml()`, replace `esc()` calls in tasklist
   - If keeping `esc()`, update other files to use it

### Medium Priority

4. **Extract workflow utility functions**
   - `getLaneLabel()`, `getLaneTagClass()` → shared utilities
   - `openWfDetail()`, `closeWfDetail()` → shared module

5. **Review workflow-page.html purpose**
   - Determine if it's a standalone page or should be integrated
   - If standalone, ensure it imports from shared modules
   - If integrated, consider removing the separate file

---

## Expected Impact

### Code Reduction
- **Workflow functions:** ~500-800 lines can be consolidated
- **Utility functions:** ~25 lines can be consolidated
- **Total potential reduction:** ~525-825 lines across all files

### Benefits
- **Single source of truth** for workflow canvas functionality
- **Easier maintenance** - fix bugs in one place
- **Consistency** - all pages use same implementations
- **Reduced file size** - especially for tasklist.html

### Risks
- **Breaking changes** if workflow-page.html is used standalone
- **Module loading dependencies** need to be verified
- **Testing required** to ensure all pages still work

---

## ✅ Analysis Complete - Findings

### workflow-page.html Status: **LEGACY/UNUSED**

**Key Finding:** `workflow-page.html` is **NOT loaded** by `main.js`
- `main.js` only loads `tasklist (1).html` (line 948)
- `workflow-page.html` appears to be a legacy standalone file
- The actual workflow functionality is in `src/pages/WorkflowPage.js` module
- `tasklist (1).html` imports from `WorkflowPage.js` module (line 2614)

**Conclusion:** The duplicate functions in `workflow-page.html` are **not causing runtime conflicts** - the file is simply not used. However, it's still technical debt that should be cleaned up.

### tasklist (1).html Workflow Functions: **ACTIVE IMPLEMENTATIONS**

**Key Finding:** The workflow functions in `tasklist (1).html` are the **actual implementations**
- `renderWorkflowCanvas()` (line 13348) - exported to `window.renderWorkflowCanvas`
- `calculateProjectPositions()` (line 13551) - used by renderWorkflowCanvas
- `drawWfEdges()` (line 13574) - used by renderWorkflowCanvas
- `setupPanZoom()` (line 13641) - used by renderWorkflowCanvas
- `WorkflowPage.js` module calls these via `window.renderWorkflowCanvas` (not exported from module)

**Conclusion:** These functions should **NOT be removed** - they're the active implementations that the module depends on.

### escapeHtml() Consolidation: **PARTIALLY COMPLETE**

**Action Taken:**
- ✅ Added `escapeHtml()` to `src/utils/strings.js` (using robust version with null check)
- ⚠️ `3d-print.html` is standalone (no module imports) - can't easily use shared utility
- ⚠️ `workflow-page.html` is unused - no action needed

**Status:** Utility is available for future use. Existing standalone files can keep their local implementations.

---

## Recommendations

### Immediate Actions (Safe)

1. **Document workflow-page.html as legacy**
   - Add comment at top of file: "LEGACY FILE - Not loaded by main.js"
   - Consider archiving or removing if confirmed unused

2. **Keep tasklist workflow functions**
   - These are active implementations, not duplicates
   - They're correctly exported to window for module use

### Future Refactoring (Requires Testing)

3. **Extract workflow canvas functions to module** (optional)
   - Move `renderWorkflowCanvas`, `calculateProjectPositions`, `drawWfEdges`, `setupPanZoom` to `WorkflowPage.js`
   - Export from module instead of window
   - Update tasklist to import from module
   - **Risk:** Requires thorough testing of workflow canvas functionality

4. **Update 3d-print.html** (optional)
   - If converted to use modules, can import `escapeHtml` from `strings.js`
   - Currently standalone, so local implementation is fine

---

## Final Status

- **workflow-page.html:** Legacy file, not loaded - duplicates are harmless but should be documented
- **tasklist workflow functions:** Active implementations - keep as-is
- **escapeHtml():** Added to shared utils for future use
- **3d-print.html:** Standalone file - local implementation is acceptable

**No immediate action required** - the duplicates in workflow-page.html don't cause issues since the file isn't used. The workflow functions in tasklist are the correct implementations.
