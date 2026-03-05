# System Audit: Buttons and Forms

**Date:** 2025-03-04  
**Scope:** All button handlers, form submission, event delegation, and related issues.

---

## Summary

| Category        | Issues Found | Critical |
|----------------|-------------|----------|
| Button handlers| 6           | 2        |
| Form submission| 4           | 1        |
| Consistency    | 3           | 0        |
| **Total**      | **13**      | **3**    |

---

## Progress (follow-up)

- **Fixed:** Inline Add Task form now passes `ctx` (tasklist.html).
- **Fixed:** `window.toggleTaskSubtask` defined in init.js.
- **Mitigated:** `submitEventModal` fallback now tries `Petal.handlers.submitEventModal` and shows an alert if unavailable (init.js).
- **Fixed:** Duplicate project-files tab handler removed from delegation.js.
- **Done:** `file:open` handler added in delegation; all file-open buttons now use `data-action="file:open"` (renderProjectUI, renderWorkflow, projectOperations, renderProjectViews, taskDrawer; renderFiles already had it).
- **Done:** Delegation debug logging guarded with `window.DEV_MODE || window.Petal?.debug`.
- **Verified:** Add-task modal context set by all open paths (updateModalState). Edit/delete handled only by global delegation; documented. submitRecurringModal and Cell Log addCellLogEntry confirmed.

---

## Critical Issues

### 1. Inline "Add Task" form: `addTask()` called without context (CRITICAL)

**Location:** `tasklist.html` (addTask), delegation `task:add` → `window.addTask()`

**Problem:**  
- The Tasks page inline form "Add Task" button uses `data-action="task:add"`. Delegation calls `window.addTask()` with no arguments.  
- `tasklist.html` defines `addTask(titleOverride, statusOverride)` and calls  
  `window.Petal.features.taskOperations.addTask(titleOverride, statusOverride)`  
  so the first argument (context) is never passed.  
- `taskOperations.addTask(ctx, titleOverride, statusOverride)` expects `ctx` and destructures it (`const { tasks, projects, save, render } = ctx`). Passing `undefined` causes a runtime error when submitting from the inline form.

**Fix:** Pass context when calling `taskOperations.addTask`. In `tasklist.html`, change the call to:

```js
await window.Petal.features.taskOperations.addTask(
  window.Petal?.handlers?.createPageContext?.() || {},
  titleOverride,
  statusOverride
);
```

Alternatively, set `window.addTask` in `init.js` to a wrapper that builds context and then calls `taskOperations.addTask(ctx, ...)`.

---

### 2. `window.toggleTaskSubtask` never defined (CRITICAL)

**Location:** `src/app/delegation.js` (subtask:toggle), `src/features/taskOperations.js` (toggleTaskSubtask)

**Problem:**  
- Delegation handles `subtask:toggle` by calling `window.toggleTaskSubtask(taskId, subtaskId)`.  
- `window.toggleTaskSubtask` is never assigned anywhere, so the call is to `undefined` and the subtask toggle does nothing (or throws).  
- `taskOperations.toggleTaskSubtask(ctx, taskId, subtaskId)` requires context as the first argument.

**Fix:** In `init.js`, add a global wrapper (similar to other task handlers):

```js
if (typeof window.toggleTaskSubtask === 'undefined' && window.Petal?.features?.taskOperations?.toggleTaskSubtask) {
  window.toggleTaskSubtask = (taskId, subtaskId) => {
    const ctx = window.Petal?.handlers?.createPageContext?.() || { tasks: [], projects: [] };
    return window.Petal.features.taskOperations.toggleTaskSubtask(ctx, taskId, subtaskId);
  };
}
```

---

### 3. `submitEventModal` fallback was a no-op (CRITICAL) — mitigated

**Location:** `src/app/init.js` (around line 493)

**Problem:**  
If `submitEventModal` is not defined elsewhere, init set it to a function that only logged a warning. Users clicking "Save Event" could see no persistence and no feedback.

**Fix applied:** Fallback now (1) calls `window.Petal?.handlers?.submitEventModal()` if defined, (2) otherwise shows an alert so the user knows the form is unavailable. The real implementation remains in tasklist.html (`submitEventModal`).

---

## High-Priority Issues

### 4. Edit/delete handling: Tasks page vs global delegation — documented

**Location:** `TasksPage.js` (handles `task:*` namespace), `delegation.js` (edit-task, delete-task), `renderTasks.js` (edit-task, delete)

**Finding:**  
- `renderTasks.js` uses `data-action="edit-task"` and `data-action="delete"` (no colon). Tasks page splits on `:` and only handles when `namespace === 'task'`; for `"edit-task"` the split yields `[null, "edit-task"]`, so the Tasks page does **not** handle it. Only global delegation handles edit-task and delete.  
- So there is no double-handling: task card edit/delete are handled solely by global delegation. Convention: use `edit-task` / `delete-task` for task cards; they are handled in `delegation.js` only.

---

### 5. Subtask toggle: project vs task model

**Location:** `renderProjectUI.js` (subtask toggle with `data-task-id`, `data-subtask-id`), `delegation.js` (subtask:toggle → toggleTaskSubtask)

**Problem:**  
- In the project UI, a "subtask" may be a nested item under a project task (`task.subtasks[]`).  
- Delegation calls `toggleTaskSubtask(taskId, subtaskId)`, which in `taskOperations` treats `subtaskId` as a **task** id (finds it in `tasks` and toggles `done`).  
- If project tasks use a different model (e.g. `project.tasks[].subtasks[]`), the wrong entity may be toggled or the handler may not find the subtask.

**Recommendation:** Clarify the data model (project-level subtasks vs task-level subtasks). If project tasks have their own `subtasks` array, add or use a handler that toggles by `projectId` + `taskId` + `subtaskId` and wire it in delegation for the project view.

---

### 6. `file-open-btn`: class-based listener only in tasklist.html — fixed

**Location:** `tasklist.html` (document click handler for `.file-open-btn`), `renderProjectUI.js`, `taskDrawer.js`, etc.

**Fix applied:**  
- Delegation now handles `file:open`: reads `data-path`, parses JSON, calls `window.openFile(fileLink)`.  
- All file-open buttons now include `data-action="file:open"` (renderProjectUI, renderWorkflow, projectOperations, renderProjectViews, taskDrawer; renderFiles already had it).  
- The document listener in tasklist.html remains as a fallback for any legacy `.file-open-btn` without the attribute.

---

### 7. Inline handlers in HTML (maintainability / consistency)

**Locations:**  
- `tasklist.html`: `onchange="toggleProtocolFields()"`, `onkeydown="if(event.key==='Enter')submitAddTaskModal()"`, `onclick="..."` on modals, etc.  
- `renderProjectUI.js`: `onmouseover` / `onmouseout` on buttons.  
- `projectOperations.js`: `onclick="editFileNotes('...')"`.

**Problem:**  
Inline handlers are harder to test, to audit, and to change. They also rely on global names (`toggleProtocolFields`, `submitAddTaskModal`, `editFileNotes`) being defined at runtime.

**Recommendation:** Where possible, replace with `data-action` and handle in delegation or in a single script (e.g. `toggleProtocolFields` and Enter key for add-task modal already have fallbacks; ensure they are wired and document the contract). For `editFileNotes`, expose a single entry point (e.g. `data-action="file:edit-notes"` + `data-file-id`) and handle in delegation.

---

## Form-Specific Issues

### 8. Add Task modal: context when opening — verified

**Location:** `modalOperations.js` (updateModalState, openAddTaskModal, openProjectAddTaskModal, openMatrixAddTaskModal)

**Problem:**  
Submit logic depends on `currentModalContext` and `currentModalProjectId` being set when the modal is opened. If a code path opens the add-task modal without setting these, submit may hit the "No context specified" branch and show an alert.

**Recommendation:** Audit all call sites that open the add-task modal (e.g. `openAddTaskModal`, `openProjectAddTaskModal`, `openMatrixAddTaskModal`) and ensure they set `currentModalContext` and, where applicable, `currentModalProjectId`. Add a defensive check in `submitAddTaskModal` to default to a safe context (e.g. `general`) when possible instead of only alerting.

---

### 9. submitRecurringModal — verified

**Location:** `tasklist.html` (submitRecurringModal), `src/app/init.js` (fallback)

**Finding:**  
The real implementation lives in tasklist.html (`async function submitRecurringModal()` at line ~6894). Init only sets a fallback when `window.submitRecurringModal` is undefined; when the HTML script runs, the global is set. Fallback calls `Petal.handlers.submitRecurringModal` if present. No change required.

---

### 10. Cell Log: add-entry handler — verified

**Location:** `delegation.js` (cell-log:add-entry), `CellLogPage.js`, `init.js` (Petal.pages.cellLog)

**Finding:**  
`CellLogPage` exports `addCellLogEntry`; init registers it as `window.Petal.pages.cellLog = CellLogPage`. Delegation calls `addCellLogEntry` first, then `addEntry` as fallback. API is correct; no change required.

---

## Consistency / Cleanup

### 11. Project files tab action name

**Location:** `delegation.js` handles both `project-files:switch-tab` and `switch-project-files-tab`; `renderProjectUI.js` uses `project-files:switch-tab`.

**Status:** No bug; both names are handled. For consistency, use a single name (e.g. `project-files:switch-tab`) everywhere and remove the alias when safe.

---

### 12. Debug logging in delegation — fixed

**Location:** `delegation.js` (button click log)

**Fix applied:** Logging is now guarded with `if (window.DEV_MODE || window.Petal?.debug)` so it only runs when a dev/debug flag is set.

---

### 13. Duplicate project files tab handler

**Location:** `delegation.js` (early `switch-project-files-tab` around line 302 and later `project-files:switch-tab` / `switch-project-files-tab` around line 827)

**Problem:** The same conceptual action is handled in two places. The first block uses `window.switchProjectFilesTab(tab)`; the second does the same. Redundant and can cause confusion.

**Recommendation:** Keep a single handler block for project files tab switching and remove the duplicate.

---

## Checklist for Follow-Up

- [x] Fix inline Add Task form context (tasklist.html or init.js).
- [x] Define `window.toggleTaskSubtask` in init.js.
- [x] Resolve `submitEventModal` implementation or replace no-op fallback (fallback improved).
- [ ] Confirm subtask toggle model (project vs task) and wire correct handler.
- [x] Unify edit/delete handling (Tasks page vs global) and document.
- [x] Align file-open buttons with `data-action="file:open"` and delegation.
- [ ] Reduce inline handlers in HTML in favor of data-action + delegation.
- [x] Audit add-task modal open call sites for context.
- [x] Implement or clearly disable submitRecurringModal (verified in tasklist.html).
- [x] Confirm Cell Log page API and delegation method name.
- [x] Remove duplicate project-files tab handler and trim debug logging.

---

## Files Touched by This Audit

| File | Role |
|------|------|
| `src/app/delegation.js` | Global click delegation, modal and action handlers |
| `src/app/init.js` | Window function setup, createPageContext, submit/close fallbacks |
| `src/ui/buttonHandlers.js` | Edit/delete task button helpers |
| `src/ui/handlers.js` | Store-backed handlers, createPageContext usage |
| `src/ui/renderProjectUI.js` | Project/task/subtask and file-open buttons |
| `src/ui/renderTasks.js` | Task list edit/delete/toggle/drawer buttons |
| `src/pages/TasksPage.js` | Tasks view click delegation (task:*, ui:*, sort:*, filter:*) |
| `src/pages/ProjectsPage.js` | Projects view click delegation |
| `src/features/taskOperations.js` | addTask, toggleTaskSubtask, edit/delete |
| `src/features/modalOperations.js` | Add task/file modal submit |
| `tasklist.html` | Modals, inline form, addTask, file-open listener, inline handlers |
