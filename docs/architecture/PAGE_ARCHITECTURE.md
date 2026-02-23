# Page Architecture: Standalone vs Integrated Pages

This document explains which pages are standalone files and which are integrated into the main `tasklist (1).html` file.

## Overview

The app uses a **hybrid architecture**:
- **Some pages** are extracted into separate JavaScript modules (`src/pages/*.js`)
- **Other pages** have their rendering logic inline in `tasklist (1).html`
- **One page** (`workflow-page.html`) exists as a separate HTML file but appears to be legacy/unused

---

## ✅ Standalone Page Modules (JavaScript)

These pages are **extracted into separate `.js` files** in `src/pages/` and imported as ES6 modules:

### 1. **Today Page** (`src/pages/TodayPage.js`)
- **Status:** ✅ Extracted to module
- **Import:** `import { renderTodayPage } from './src/pages/TodayPage.js'`
- **Usage:** Rendered via `window.renderTodayPage(containerEl, state, handlers)`
- **View Element:** `<div id="view-today">`
- **Location in HTML:** Line 1263

### 2. **Settings Page** (`src/pages/SettingsPage.js`)
- **Status:** ✅ Extracted to module
- **Import:** `import { renderSettingsPage } from './src/pages/SettingsPage.js'`
- **Usage:** Rendered via `window.renderSettingsPage(containerEl, state, handlers)`
- **View Element:** `<div id="view-settings">` (line 2631)
- **Fallback:** Has inline fallback function `renderSettingsFallback()` if module fails

### 3. **Cell Log Page** (`src/pages/CellLogPage.js`)
- **Status:** ✅ Extracted to module
- **Import:** `import * as CellLogPage from './src/pages/CellLogPage.js'`
- **Usage:** Rendered via `CellLogPage.renderCellLogPage(context)` or `window.renderCellLogPage()`
- **View Element:** `<div id="view-cell-log">` (line 2342)
- **Note:** HTML structure is inline, but rendering logic is in module

### 4. **Workflow Page** (`src/pages/WorkflowPage.js`)
- **Status:** ✅ Extracted to module
- **Import:** `import { renderWorkflowPage, switchWorkflowView, ... } from './src/pages/WorkflowPage.js'`
- **Usage:** Rendered via `window.renderWorkflowPage(containerEl, state, handlers)`
- **View Element:** `<div id="view-workflow">` (line 2004)
- **Note:** Has both list and canvas views

---

## 📦 Integrated Pages (Inline in HTML)

These pages have their **rendering logic inline** in `tasklist (1).html`:

### 1. **Tasks Page**
- **Status:** ✅ Module (with inline fallback)
- **View Element:** `<div id="view-tasks">` (line 1266)
- **Module:** `src/ui/renderTasks.js`
- **Rendering:**
  - **Primary:** Uses `window.Petal.ui.renderTasks()` from module
  - **Fallback:** Uses inline `renderTasks()` function if module unavailable
- **Location:** Module at `src/ui/renderTasks.js`, fallback inline in HTML
- **Note:** Fully modularized but keeps inline fallback for safety

### 2. **Projects Page**
- **Status:** ✅ Module (with inline fallback)
- **View Element:** `<div id="view-projects">` (line 2636)
- **Module:** `src/ui/renderProjects.js`
- **Rendering:**
  - **Primary:** Uses `window.Petal.ui.renderProjects()` from module
  - **Fallback:** Uses inline `renderProjects()` function if module unavailable
- **Location:** Module at `src/ui/renderProjects.js`, fallback inline in HTML
- **Note:** Fully modularized but keeps inline fallback for safety

### 3. **Planner Page**
- **Status:** ⚠️ Partially modularized
- **View Element:** `<div id="view-planner">` (line 2130)
- **Modules:** 
  - `src/ui/renderPlannerHabits.js` (habits component)
  - `src/ui/renderPlannerRoutines.js` (routines component)
- **Rendering:** 
  - **Main:** Uses inline `renderPlanner()` function
  - **Components:** Uses module functions for habits/routines
- **Location:** Main rendering logic inline in HTML
- **Note:** Main planner logic not yet extracted, but components are modular

### 4. **Files Page**
- **Status:** ✅ Module (with inline fallback)
- **View Element:** `<div id="view-files">` (line 1974)
- **Module:** `src/ui/renderFiles.js`
- **Rendering:**
  - **Primary:** Uses `window.Petal.ui.renderFiles()` from module
  - **Fallback:** Uses inline `renderFiles()` function if module unavailable
- **Location:** Module at `src/ui/renderFiles.js`, fallback inline in HTML
- **Note:** Fully modularized but keeps inline fallback for safety

### 5. **3D Print Page**
- **Status:** ❌ Fully inline
- **View Element:** `<div id="view-3d-print">` (line 2475)
- **Rendering:** Uses inline `render3DPrints()` function
- **Location:** Function defined inline in HTML
- **Note:** Not yet extracted to module

---

## 📄 Standalone HTML Files

### `workflow-page.html`
- **Status:** ⚠️ **Legacy/Unused**
- **Location:** Root directory
- **Purpose:** Contains workflow canvas view styles and structure
- **Usage:** Appears to be a legacy file - workflow is now handled by `src/pages/WorkflowPage.js`
- **Note:** This file may not be actively used by the app

### `icon-generator.html`
- **Status:** ✅ Utility tool
- **Purpose:** Standalone utility to generate PWA icons
- **Usage:** Not part of main app, just a helper tool

---

## Summary Table

| Page | View ID | Status | Module File | Inline Function |
|------|---------|--------|-------------|------------------|
| **Today** | `view-today` | ✅ Module | `src/pages/TodayPage.js` | Fallback only |
| **Settings** | `view-settings` | ✅ Module | `src/pages/SettingsPage.js` | Fallback only |
| **Cell Log** | `view-cell-log` | ✅ Module | `src/pages/CellLogPage.js` | HTML inline |
| **Workflow** | `view-workflow` | ✅ Module | `src/pages/WorkflowPage.js` | Fallback only |
| **Tasks** | `view-tasks` | ✅ Module | `src/ui/renderTasks.js` | Inline fallback |
| **Files** | `view-files` | ✅ Module | `src/ui/renderFiles.js` | Inline fallback |
| **Projects** | `view-projects` | ✅ Module | `src/ui/renderProjects.js` | Inline fallback |
| **Planner** | `view-planner` | ⚠️ Partial | `src/ui/renderPlanner*.js` | `renderPlanner()` |
| **3D Print** | `view-3d-print` | ❌ Inline | None | `render3DPrints()` |

---

## Module Import Location

All page modules are imported at **line 2889-2892** in `tasklist (1).html`:

```javascript
import * as CellLogPage from './src/pages/CellLogPage.js';
import { renderSettingsPage } from './src/pages/SettingsPage.js';
import { renderTodayPage } from './src/pages/TodayPage.js';
import { renderWorkflowPage, ... } from './src/pages/WorkflowPage.js';
```

---

## Rendering Logic Flow

### For Module-Based Pages:
1. `switchView(viewName)` is called
2. View element's `display` is set to show
3. `render()` function checks `currentView`
4. Calls module's render function: `window.renderXxxPage(containerEl, state, handlers)`
5. If module fails, falls back to inline function (if available)

### For Inline Pages:
1. `switchView(viewName)` is called
2. View element's `display` is set to show
3. `render()` function checks `currentView`
4. Calls inline function: `renderXxx()`
5. Function directly manipulates DOM

---

## Recommendations

### High Priority (Extract to Modules)
1. **Planner Page** - Main calendar logic still inline, extract to module
2. **3D Print Page** - Specialized feature, good candidate for module

### Medium Priority (Complete Modularization)
3. **Tasks/Projects/Files Pages** - Already modularized, consider removing inline fallbacks once stable
4. **Planner Page** - Extract main rendering logic to match habits/routines pattern

### Low Priority
6. **Workflow Page** - Consider removing `workflow-page.html` if unused
7. **Cell Log Page** - Consider extracting HTML structure to module

---

## File Structure

```
tasklist (1).html          # Main app file (17,155 lines)
├── Inline pages:
│   ├── Tasks (hybrid)
│   ├── Projects
│   ├── Planner
│   ├── Files (hybrid)
│   └── 3D Print
│
src/pages/                 # Page modules (full page logic)
├── TodayPage.js          ✅ Extracted
├── SettingsPage.js       ✅ Extracted
├── CellLogPage.js        ✅ Extracted
└── WorkflowPage.js     ✅ Extracted

src/ui/                     # UI rendering modules
├── renderTasks.js        ✅ Extracted
├── renderProjects.js     ✅ Extracted
├── renderFiles.js        ✅ Extracted
├── renderWorkflow.js     ✅ Extracted
├── renderPlannerHabits.js ✅ Extracted (component)
└── renderPlannerRoutines.js ✅ Extracted (component)

workflow-page.html         ⚠️ Legacy (may be unused)
icon-generator.html        ✅ Utility tool
```

---

## Notes

- **All view containers** (`<div id="view-xxx">`) are defined inline in `tasklist (1).html`
- **Module-based pages** only extract the **rendering logic**, not the HTML structure
- **Inline pages** have both HTML structure and rendering logic in the main file
- The app uses a **fallback pattern**: try module first, fall back to inline if module fails
- This hybrid approach allows gradual migration from inline to modular code
