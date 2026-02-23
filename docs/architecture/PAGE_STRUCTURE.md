# Page Structure Analysis

## Overview

Analysis of which pages have separate files vs inline HTML in `tasklist.html`.

---

## Page File Structure

### 1. Separate HTML Files

**`pages/3d-print.html`**
- **Status:** Separate HTML file
- **Loading:** Loaded via `fetch()` when view is activated
- **Container:** `view-3d-print` (empty div in tasklist.html)
- **Rendering:** Content injected into container, scripts executed
- **Size:** 654 lines

---

### 2. JavaScript Modules (src/pages/)

These pages have JavaScript modules but HTML containers are inline in tasklist.html:

**`src/pages/TodayPage.js`**
- **Container:** `view-today` (empty div in tasklist.html)
- **Rendering:** Module renders content into container
- **Function:** `renderTodayPage(containerEl, state, handlers)`

**`src/pages/SettingsPage.js`**
- **Container:** `view-settings` (empty div in tasklist.html)
- **Rendering:** Module renders content into container
- **Function:** `renderSettingsPage(containerEl, state, handlers)`

**`src/pages/CellLogPage.js`**
- **Container:** `view-cell-log` (has some inline HTML structure)
- **Rendering:** Module renders content into container
- **Function:** `renderCellLogPage(ctx)`

**`src/pages/WorkflowPage.js`**
- **Container:** `view-workflow` (has inline HTML structure)
- **Rendering:** Module renders content into container
- **Function:** `renderWorkflowPage(containerEl, state, handlers)`

---

### 3. Inline Only (No Separate Files)

These pages have NO separate files - everything is in tasklist.html:

**Projects (`view-projects`)**
- **Container:** Inline in tasklist.html (has HTML structure)
- **Rendering:** `renderProjects()` function in tasklist.html
- **No separate file**

**Planner (`view-planner`)**
- **Container:** Inline in tasklist.html (has HTML structure)
- **Rendering:** `renderPlanner()` function in tasklist.html
- **No separate file**

**Tasks (`view-tasks`)**
- **Container:** Inline in tasklist.html (empty, rendered by JS)
- **Rendering:** `renderTasks()` or `window.Petal.ui.renderTasks()`
- **No separate file**

**Files (`view-files`)**
- **Container:** Inline in tasklist.html (has HTML structure)
- **Rendering:** `renderFiles()` or `window.Petal.ui.renderFiles()`
- **No separate file**

---

## Summary

| Page | HTML File | JS Module | Inline HTML | Rendering Function |
|------|-----------|-----------|-------------|-------------------|
| **3D Print** | ✅ `pages/3d-print.html` | ❌ | Empty container | `render3DPrints()` |
| **Today** | ❌ | ✅ `TodayPage.js` | Empty container | `renderTodayPage()` |
| **Settings** | ❌ | ✅ `SettingsPage.js` | Empty container | `renderSettingsPage()` |
| **Cell Log** | ❌ | ✅ `CellLogPage.js` | Has structure | `renderCellLogPage()` |
| **Workflow** | ❌ | ✅ `WorkflowPage.js` | Has structure | `renderWorkflowPage()` |
| **Projects** | ❌ | ❌ | Has structure | `renderProjects()` |
| **Planner** | ❌ | ❌ | Has structure | `renderPlanner()` |
| **Tasks** | ❌ | ❌ | Empty container | `renderTasks()` |
| **Files** | ❌ | ❌ | Has structure | `renderFiles()` |

---

## Key Findings

1. **Only 1 separate HTML file:** `pages/3d-print.html`
2. **4 JavaScript modules:** Today, Settings, Cell Log, Workflow
3. **4 inline only:** Projects, Planner, Tasks, Files

**All view containers are inline in tasklist.html** - even pages with modules have their HTML containers defined in tasklist.html.

---

## Performance Implications

Since all containers are inline, the issue is likely:
- **Heavy rendering functions** blocking the main thread
- **Store syncing** happening before rendering
- **Sidebar rendering** blocking page display

The fix applied moves page rendering to happen FIRST, before heavy operations.
