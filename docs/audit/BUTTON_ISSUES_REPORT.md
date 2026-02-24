# Button Issues Audit Report

## Overview
This report documents button-related issues found across the application. The app uses a mixed approach with both `onclick` handlers and event delegation via `data-action` attributes, which can lead to conflicts and inconsistencies.

## Critical Issues

### 1. Missing `data-action` Attribute on Edit Button (renderTasks.js)
**Location:** `src/ui/renderTasks.js:277`
**Issue:** The edit button has `data-task-id` but is missing `data-action="edit-task"`, so it won't be caught by event delegation.

```html
<button class="btn-del btn-edit" data-task-id="${String(task.id)}" title="Edit">✎</button>
```

**Fix:** Add `data-action="edit-task"` attribute.

---

### 2. Conflicting onclick and data-action Handlers
**Issue:** Multiple buttons have both `onclick` handlers and `data-action` attributes, which can cause:
- Double event handling
- Event propagation issues
- Inconsistent behavior

**Affected Files:**
- `src/ui/renderLanes.js:148` - Edit button has both `onclick="handleEditTaskAction(event, this)"` and `data-action="edit-task"`
- `src/ui/renderWorkflowMatrix.js:80` - Edit button has both `onclick` and `data-action`
- `src/ui/renderProjectUI.js:613` - Edit button has both `onclick="event.stopPropagation();editTask(${t.id})"` and `data-action="edit-task"`
- `src/features/taskDrawer.js:423` - Delete button has both `onclick` and `data-action="delete-task"`

**Recommendation:** Choose one approach:
- **Option A:** Use only `data-action` with event delegation (preferred for consistency)
- **Option B:** Use only `onclick` handlers (if delegation isn't working)

---

### 3. Missing `data-action` on Drawer Buttons
**Issue:** Drawer buttons use `onclick` handlers but no `data-action` attributes, so they won't work with event delegation.

**Affected Locations:**
- `src/ui/renderTasks.js:276` - Drawer button uses `onclick` only
- `src/ui/renderLanes.js:147, 259` - Drawer buttons use `onclick="openTaskDrawer(${t.id})"` only
- `src/ui/renderProjectUI.js:611` - Drawer button uses `onclick` only

**Fix:** Add `data-action="task-drawer:open"` or `data-action="task:open-drawer"` and handle in delegation.

---

### 4. Inconsistent Delete Action Values
**Issue:** Some buttons use `data-action="delete"`, others use `data-action="delete-task"`. The delegation handler supports both, but this inconsistency can cause confusion.

**Current State:**
- Most buttons use: `data-action="delete"`
- Some buttons use: `data-action="delete-task"` (e.g., `taskDrawer.js:423`)

**Recommendation:** Standardize on `data-action="delete"` (shorter, more common).

---

### 5. Buttons with onclick Only (No data-action)
**Issue:** Several buttons rely solely on `onclick` handlers, which may not work if:
- Event delegation is the primary mechanism
- The global function isn't available
- There are event propagation issues

**Affected Locations:**
- `src/ui/renderProjectUI.js:471-472` - Project done/delete buttons use `onclick` only
- `src/ui/renderProjectUI.js:612` - Toggle subtasks button uses `onclick` only
- `src/ui/renderWorkflowMatrix.js:59-60` - Move up/down buttons use `onclick` only
- `src/ui/renderWorkflowMatrix.js:117` - Add task to subtask button uses `onclick` only

**Recommendation:** Add `data-action` attributes and handle in delegation, or ensure global functions are always available.

---

### 6. Missing Required Data Attributes
**Issue:** Some buttons are missing required data attributes for proper handling.

**Examples:**
- Edit buttons missing `data-is-subtask` or `data-project-id` in some locations
- Delete buttons missing `data-parent-task-id` for subtasks
- Buttons missing `data-task-id` when they should have it

---

## Medium Priority Issues

### 7. Inconsistent Button Class Names
**Issue:** Button classes vary:
- `btn-del` (most common)
- `btn-edit` (sometimes added)
- `btn-delete` (sometimes added)
- `btn-secondary` (in some files)

**Recommendation:** Standardize on a consistent class naming scheme.

---

### 8. Event Delegation Handler Gaps
**Issue:** Some button actions may not be handled in the main delegation handler (`src/app/delegation.js`).

**Check Needed:**
- `toggleProjectDone` - handled via onclick only
- `delProject` - handled via onclick only
- `toggleTaskSubtaskSection` - handled via onclick only
- `addTaskToSubtask` - handled via onclick only
- `moveTaskInSubtask` - handled via onclick only

**Recommendation:** Add handlers for these actions in delegation.js or ensure global functions are reliable.

---

### 9. Inline Event Handlers in HTML Strings
**Issue:** Many buttons use inline `onclick` handlers in template strings, which:
- Makes code harder to maintain
- Can cause security issues if not properly escaped
- Makes testing more difficult

**Recommendation:** Move all handlers to event delegation where possible.

---

## Low Priority Issues

### 10. Inconsistent Styling
**Issue:** Button styling is inconsistent across different views:
- Some buttons have inline styles
- Some use CSS classes
- Font sizes, padding, and colors vary

**Recommendation:** Create a button component system or standardize CSS classes.

---

### 11. Missing Accessibility Attributes
**Issue:** Some buttons are missing:
- `aria-label` attributes (relying only on `title`)
- `type="button"` (some have it, some don't)
- Proper keyboard navigation support

**Recommendation:** Add proper ARIA attributes and ensure keyboard accessibility.

---

## Recommendations Summary

### High Priority Fixes
1. ✅ Add `data-action="edit-task"` to edit button in `renderTasks.js:277`
2. ✅ Remove conflicting `onclick` handlers where `data-action` is present (or vice versa)
3. ✅ Add `data-action` attributes to drawer buttons
4. ✅ Standardize delete action to `data-action="delete"`

### Medium Priority Fixes
5. Add `data-action` attributes to buttons that only use `onclick`
6. Ensure all required data attributes are present on buttons
7. Add missing handlers to delegation.js

### Low Priority Improvements
8. Standardize button class names
9. Create button component system
10. Add accessibility attributes
11. Move inline styles to CSS classes

---

## Files Requiring Updates

### Critical
- `src/ui/renderTasks.js` - Add missing `data-action` on edit button
- `src/ui/renderLanes.js` - Remove conflicting onclick handlers
- `src/ui/renderWorkflowMatrix.js` - Remove conflicting onclick handlers
- `src/ui/renderProjectUI.js` - Remove conflicting onclick handlers, add data-action to drawer buttons

### Medium
- `src/app/delegation.js` - Add handlers for missing actions
- `src/features/taskDrawer.js` - Standardize delete action value

### Low
- All render files - Standardize button classes and styling
- CSS files - Add button component styles

---

## Testing Checklist

After fixes, test:
- [ ] Edit buttons work in all views (Tasks, Projects, Workflow, Lanes)
- [ ] Delete buttons work in all views
- [ ] Drawer buttons open task drawer correctly
- [ ] No double event handling occurs
- [ ] Buttons work with keyboard navigation
- [ ] Buttons have proper visual feedback
- [ ] No console errors when clicking buttons

---

## Fixes Applied

### ✅ Fixed Issues (2024-01-XX)

1. **Added missing `data-action="edit-task"` to edit button in `renderTasks.js:277`**
   - Edit button now properly uses event delegation

2. **Removed conflicting `onclick` handlers from buttons with `data-action`**
   - Fixed in `renderLanes.js` (2 instances)
   - Fixed in `renderWorkflowMatrix.js`
   - Fixed in `renderProjectUI.js` (2 instances)
   - Fixed in `renderProjectViews.js`
   - Fixed in `taskDrawer.js` (2 instances)

3. **Added `data-action` attributes to drawer buttons**
   - Changed to `data-action="task:open-drawer"` in:
     - `renderTasks.js`
     - `renderLanes.js` (2 instances)
     - `renderProjectUI.js`
   - Added handler in `delegation.js` for `task:open-drawer`

4. **Standardized delete action to `data-action="delete"`**
   - Changed `delete-task` to `delete` in `taskDrawer.js`

5. **Added handler for `task:toggle-subtasks` action**
   - Added `data-action="task:toggle-subtasks"` to toggle button in `renderProjectUI.js`
   - Added handler in `delegation.js`

### Files Modified
- `src/ui/renderTasks.js`
- `src/ui/renderLanes.js`
- `src/ui/renderWorkflowMatrix.js`
- `src/ui/renderProjectUI.js`
- `src/ui/renderProjectViews.js`
- `src/features/taskDrawer.js`
- `src/app/delegation.js`

---

## Notes

- The app currently uses a hybrid approach with both onclick and delegation
- Event delegation is set up in `src/app/delegation.js` and `src/pages/TasksPage.js`
- Some pages have their own delegation (e.g., TasksPage, ProjectsPage)
- Global functions are exposed on `window` for backward compatibility
- The `buttonHandlers.js` file provides helper functions for edit/delete actions
