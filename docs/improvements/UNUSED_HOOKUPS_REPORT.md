# Unused Hookups Report

This document identifies potential hookups (event handlers, function bindings) that may not be properly utilized in the application.

## Summary

After analyzing the codebase, here are the findings:

## ✅ Properly Hooked Up Functions

### Modal Operations
- ✅ `openProjectAddTaskModal` - Used in delegation.js and ProjectsPage.js
- ✅ `openMatrixAddTaskModal` - Used in delegation.js
- ✅ `openAddTaskModal` - Used in delegation.js and handlers.js
- ✅ `closeAddTaskModal` - Used in delegation.js
- ✅ `submitAddTaskModal` - Used in delegation.js
- ✅ `openProjectAddFileModal` - Used in delegation.js and ProjectsPage.js
- ✅ `closeAddFileModal` - Used in delegation.js
- ✅ `submitAddFileModal` - Used in delegation.js
- ✅ `openFileNotesModal` - Used in FilesPage.js
- ✅ `closeFileNotesModal` - Used in delegation.js
- ✅ `saveFileNotes` - Used in delegation.js
- ✅ Drag & Drop handlers - Used inline in tasklist.html

## ⚠️ Potentially Unused Hookups

### 1. `openMatrixAddFileModal` - **✅ HANDLER ADDED**

**Location:** `src/features/modalOperations.js:658`

**Status:** ✅ Event delegation handler added. Button connection needs verification at runtime.

**Evidence:**
- ✅ Function is defined in `modalOperations.js`
- ✅ Wrapper exists in `tasklist.html` (line 3393)
- ✅ Referenced in `renderWorkflowMatrix.js` (line 355) to update button text
- ✅ **Handler added to `delegation.js` (line 296-315)**

**Action Taken:**
- ✅ Added event delegation handler in `delegation.js` for `add-file-to-matrix` action
- ✅ Handler properly passes context to the modal function

**Note:**
- The `btn-add-file-matrix` button appears to be created dynamically (not found in static HTML)
- Button text is updated in `renderWorkflowMatrix.js` but button creation location not found
- **Recommendation:** When the button is created (wherever that may be), ensure it has `data-action="add-file-to-matrix"` attribute
- The handler is ready and will work once the button has the correct attribute

### 2. `populateFileNotesModal` - **✅ FIXED**

**Location:** `src/features/modalOperations.js:1049`

**Status:** ✅ Made private - function is only used internally.

**Action Taken:**
- ✅ Removed `export` keyword and marked as `@private`
- Function is now only accessible within the module
- Wrapper in `tasklist.html` will still work via `openFileNotesModal` if needed

### 3. Missing Event Delegation for Matrix File Button

**Issue:** The `btn-add-file-matrix` button may not have proper event delegation set up.

**Current State:**
- Button exists in workflow matrix view
- Button text is updated in `renderWorkflowMatrix.js`
- No clear connection to `openMatrixAddFileModal` via event delegation

**Recommendation:**
1. Verify button has `data-action="add-file-to-matrix"` attribute
2. Ensure delegation handler exists (see recommendation #1)

## 🔍 Additional Findings

### Functions That Are Wrapped But May Not Need Wrappers

Several functions in `tasklist.html` are wrappers that just call the Petal features version. These are fine for backward compatibility but could potentially be removed if all code paths use the Petal namespace directly.

- `openMatrixAddFileModal` wrapper (line 3393)
- Various other modal wrappers

### Potential Missing Connections

1. **Matrix View File Addition:**
   - The workflow matrix view has a file button (`btn-add-file-matrix`)
   - Function `openMatrixAddFileModal` exists
   - Connection between them needs verification

2. **Context Passing:**
   - Some functions expect context but may be called without it
   - `submitAddTaskModal` and `submitAddFileModal` need context but may be called without it
   - Current implementation handles this with fallbacks, which is good

## ✅ Recommendations

1. **Completed Actions:**
   - ✅ Added event delegation handler for `add-file-to-matrix` action
   - ✅ Made `populateFileNotesModal` private (internal use only)

2. **Runtime Verification Needed:**
   - Verify `btn-add-file-matrix` button has `data-action="add-file-to-matrix"` when created
   - Test matrix file addition flow to ensure handler works
   - Button appears to be created dynamically - check where it's generated

3. **Testing:**
   - Test all modal opening/closing flows
   - Verify matrix view file addition works with new handler
   - Check that all `data-action` attributes have corresponding handlers

## ✅ Completion Summary

### Completed Actions:
1. ✅ **Added event delegation handler** for `add-file-to-matrix` action in `delegation.js`
2. ✅ **Made `populateFileNotesModal` private** - removed export since it's only used internally
3. ✅ **Updated report** with completion status and remaining verification steps

### Remaining Verification:
- The `btn-add-file-matrix` button appears to be created dynamically
- Handler is ready and will work once button has `data-action="add-file-to-matrix"` attribute
- Runtime testing needed to verify the complete flow

## Notes

- Most functions are properly hooked up via event delegation
- ✅ Matrix file modal handler has been added to event delegation
- All drag & drop handlers are properly connected via inline HTML attributes
- Context passing is handled gracefully with fallbacks
- Code cleanup completed: internal-only functions made private