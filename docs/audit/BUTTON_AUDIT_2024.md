# Comprehensive Button Issues Audit
**Date:** 2024-02-24  
**Scope:** All buttons across the application

## Executive Summary

The application uses a **mixed approach** with both `onclick` handlers and event delegation via `data-action` attributes. This creates several categories of issues:

1. **Buttons with `onclick` only** (no `data-action`) - May not work with delegation
2. **Buttons with both `onclick` and `data-action`** - Can cause double handling
3. **Buttons missing required data attributes** - May not work correctly
4. **Missing handlers in delegation.js** - Actions not handled by delegation

---

## Critical Issues (High Priority)

### 1. Buttons with `onclick` Only (No `data-action`)

These buttons rely solely on global functions and won't work with event delegation:

#### `src/ui/renderWorkflowMatrix.js`
- **Line 59-60:** Move up/down buttons in subtasks
  ```html
  <button onclick="moveTaskInSubtask(${task.id}, ${subtaskId}, ${order}, 'up')">↑</button>
  <button onclick="moveTaskInSubtask(${task.id}, ${subtaskId}, ${order}, 'down')">↓</button>
  ```
  **Issue:** No `data-action` attribute  
  **Fix:** Add `data-action="subtask:move-up"` and `data-action="subtask:move-down"`

- **Line 117:** Add task to subtask button
  ```html
  <button onclick="addTaskToSubtask(${selectedProjectIdValue}, ${subtask.id})">+ Task</button>
  ```
  **Issue:** No `data-action` attribute  
  **Fix:** Add `data-action="subtask:add-task"` with `data-project-id` and `data-subtask-id`

#### `src/ui/renderProjectUI.js`
- **Line 71, 82, 92:** Next Up/Blocked/Stale items
  ```html
  <div class="next-up-item" onclick="if(window.Petal?.features?.taskDrawer?.openTaskDrawer){window.Petal.features.taskDrawer.openTaskDrawer(${t.id})}">
  ```
  **Issue:** Using `onclick` on div, not button, no `data-action`  
  **Fix:** Convert to button with `data-action="task:open-drawer"` and `data-task-id`

- **Line 289-292:** Project files tab buttons
  ```html
  <button onclick="if(window.switchProjectFilesTab){window.switchProjectFilesTab('all')}">All</button>
  ```
  **Issue:** No `data-action` attribute  
  **Fix:** Add `data-action="project-files:switch-tab"` with `data-tab="all"`

- **Line 450:** Open project view
  ```html
  <div onclick="openProjectView(${p.id})" ...>
  ```
  **Issue:** Using `onclick` on div, no `data-action`  
  **Fix:** Convert to button with `data-action="open-project"` and `data-project-id`

- **Line 471-472:** Project done/delete buttons
  ```html
  <button onclick="event.stopPropagation();toggleProjectDone(${p.id})">✓</button>
  <button onclick="event.stopPropagation();delProject(${p.id})">✕</button>
  ```
  **Issue:** No `data-action` attributes  
  **Fix:** Add `data-action="project:toggle-done"` and `data-action="project:delete"`

- **Line 475:** Toggle project open
  ```html
  <div onclick="event.stopPropagation();toggleProjectOpen(${p.id})">▶</div>
  ```
  **Issue:** Using `onclick` on div, no `data-action`  
  **Fix:** Convert to button with `data-action="project:toggle-open"`

- **Line 510:** Clear selection button
  ```html
  <button onclick="clearSelection(${p.id})">Clear</button>
  ```
  **Issue:** No `data-action` attribute  
  **Fix:** Add `data-action="project:clear-selection"`

- **Line 544:** Toggle subtask checkbox
  ```html
  <div class="subtask-check" onclick="toggleTaskSubtask(${t.id},${st.id})"></div>
  ```
  **Issue:** Using `onclick` on div, no `data-action`  
  **Fix:** Convert to button with `data-action="subtask:toggle"`

- **Line 583:** Toggle task checkbox
  ```html
  <div class="check-box" onclick="window.Petal?.handlers?.toggleTask(${t.id})"></div>
  ```
  **Issue:** Using `onclick` on div, no `data-action`  
  **Fix:** Convert to button with `data-action="task:toggle"`

- **Line 623, 637:** Add subtask buttons
  ```html
  <button onclick="toggleAddSubtaskToTask(${t.id})">+ Add Subtask</button>
  ```
  **Issue:** No `data-action` attribute  
  **Fix:** Add `data-action="task:toggle-add-subtask"`

- **Line 633, 647:** Add subtask submit buttons
  ```html
  <button onclick="addSubtaskToTaskInline(${t.id})">Add</button>
  ```
  **Issue:** No `data-action` attribute  
  **Fix:** Add `data-action="task:add-subtask-inline"`

- **Line 680, 682:** File note toggle buttons
  ```html
  <button onclick="toggleFileNote('${fileId}', this)">📝 Note</button>
  ```
  **Issue:** No `data-action` attribute  
  **Fix:** Add `data-action="file:toggle-note"` with `data-file-id`

#### `src/ui/renderProjectViews.js`
- **Line 383, 809:** Open artifact detail
  ```html
  <div onclick="openArtifactDetail(${artifact.id})" ...>
  ```
  **Issue:** Using `onclick` on div, no `data-action`  
  **Fix:** Convert to button with `data-action="artifact:open-detail"`

- **Line 594, 623, 643:** Toggle task checkboxes
  ```html
  <div class="check-box" onclick="toggleTask(${task.id})"></div>
  ```
  **Issue:** Using `onclick` on div, no `data-action`  
  **Fix:** Convert to button with `data-action="task:toggle"`

- **Line 876:** Open protocol run detail
  ```html
  <div onclick="openProtocolRunDetail(${run.id})" ...>
  ```
  **Issue:** Using `onclick` on div, no `data-action`  
  **Fix:** Convert to button with `data-action="protocol:open-run-detail"`

#### `src/ui/renderLanes.js`
- **Line 127, 241:** Toggle task checkboxes
  ```html
  <div class="check-box" onclick="toggleTask(${t.id})"></div>
  ```
  **Issue:** Using `onclick` on div, no `data-action`  
  **Fix:** Convert to button with `data-action="task:toggle"`

#### `src/ui/renderTasks.js`
- **Line 255:** Toggle task checkbox
  ```html
  <div class="check-box" onclick="window.Petal?.handlers?.toggleTask(${task.id})"></div>
  ```
  **Issue:** Using `onclick` on div, no `data-action`  
  **Fix:** Convert to button with `data-action="task:toggle"`

---

### 2. Missing Handlers in `delegation.js`

The following actions are used in buttons but may not have handlers in `delegation.js`:

- `subtask:move-up` / `subtask:move-down` - Not found
- `subtask:add-task` - Not found
- `project-files:switch-tab` - Not found
- `project:toggle-done` - Not found
- `project:delete` - Not found
- `project:toggle-open` - Not found
- `project:clear-selection` - Not found
- `subtask:toggle` - Not found
- `task:toggle` - Not found (checkboxes)
- `task:toggle-add-subtask` - Not found
- `task:add-subtask-inline` - Not found
- `file:toggle-note` - Not found
- `artifact:open-detail` - Not found
- `protocol:open-run-detail` - Not found

---

## Medium Priority Issues

### 3. Inconsistent Patterns

- **Checkboxes:** Some use `onclick` on divs, should be buttons with `data-action="task:toggle"`
- **Divs with onclick:** Many divs have `onclick` instead of being buttons
- **Mixed approaches:** Some buttons use `data-action`, others use `onclick` only

### 4. Missing Data Attributes

Some buttons may be missing required data attributes:
- `data-project-id` - Required for project-specific actions
- `data-task-id` - Required for task-specific actions
- `data-subtask-id` - Required for subtask actions
- `data-file-id` - Required for file actions

---

## Low Priority Issues

### 5. Accessibility

- Many buttons are missing `type="button"` attribute
- Some buttons rely only on `title` attribute, missing `aria-label`
- Divs with `onclick` are not keyboard accessible

### 6. Code Quality

- Inline `onclick` handlers in template strings make code harder to maintain
- Inconsistent button class names (`btn-del`, `btn-edit`, `btn-delete`, etc.)
- Mixed styling approaches (inline styles vs CSS classes)

---

## Recommendations

### Immediate Actions (Critical)

1. **Add `data-action` attributes** to all buttons that currently only have `onclick`
2. **Add handlers in `delegation.js`** for all missing actions
3. **Convert divs with `onclick`** to proper `<button>` elements
4. **Remove `onclick` handlers** from buttons that have `data-action` (or vice versa)

### Short-term (Medium Priority)

5. **Standardize button patterns** - Choose one approach (delegation preferred)
6. **Add missing data attributes** to all buttons
7. **Test all button actions** to ensure they work with delegation

### Long-term (Low Priority)

8. **Improve accessibility** - Add ARIA labels, ensure keyboard navigation
9. **Refactor button rendering** - Create button component system
10. **Standardize styling** - Move inline styles to CSS classes

---

## Files Requiring Updates

### Critical Priority
- `src/ui/renderWorkflowMatrix.js` - 3 buttons
- `src/ui/renderProjectUI.js` - 15+ buttons/divs
- `src/ui/renderProjectViews.js` - 5+ buttons/divs
- `src/ui/renderLanes.js` - 2 checkboxes
- `src/ui/renderTasks.js` - 1 checkbox
- `src/app/delegation.js` - Add 15+ handlers

### Medium Priority
- All render files - Standardize patterns
- `src/ui/buttonHandlers.js` - May need additional helpers

### Low Priority
- CSS files - Button component styles
- All render files - Accessibility improvements

---

## Testing Checklist

After fixes, test:
- [ ] All buttons work in Tasks view
- [ ] All buttons work in Projects view
- [ ] All buttons work in Workflow Matrix view
- [ ] All buttons work in Lanes view
- [ ] All buttons work in Project Views
- [ ] Checkboxes toggle tasks correctly
- [ ] No double event handling occurs
- [ ] No console errors when clicking buttons
- [ ] Keyboard navigation works
- [ ] Buttons have proper visual feedback

---

## Notes

- The app currently uses a **hybrid approach** with both `onclick` and delegation
- Event delegation is set up in `src/app/delegation.js` and page-specific handlers
- Global functions are exposed on `window` for backward compatibility
- The `buttonHandlers.js` file provides helper functions for edit/delete actions
- Some pages have their own delegation (e.g., `TasksPage.js`, `ProjectsPage.js`)

---

## Next Steps

1. Review this audit with the team
2. Prioritize which issues to fix first
3. Create tickets for each category of fixes
4. Begin implementing fixes starting with Critical Priority items
5. Test thoroughly after each batch of fixes
