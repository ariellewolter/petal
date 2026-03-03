# Orphaned Code Report

Generated: 2025-01-XX

## Summary

This report identifies orphaned code (unused imports, functions, files) in the codebase.

---

## 1. Unused Imports in `src/app/init.js`

### 1.1 `setLoading` (Line 7)
**Status:** ⚠️ Imported but never used in `init.js`

```javascript
import { initPersistence, setLoading } from '../storage/persistence.js';
```

**Analysis:**
- `setLoading` is imported but never called in `init.js`
- It IS used in `src/app/initState.js` (lines 174, 377)
- **Recommendation:** Remove `setLoading` from `init.js` import since it's only used in `initState.js`

### 1.2 `auditHookups` (Line 70)
**Status:** ⚠️ Imported but never called directly

```javascript
import { auditHookups } from './auditHookups.js';
```

**Analysis:**
- `auditHookups` is imported but never called in `init.js`
- It's exposed to `window.auditHookups` in `auditHookups.js` itself (line 212)
- **Recommendation:** Remove this import if it's not needed for initialization. The function is self-exposing.

---

## 2. Standalone Utility Files (Not Imported)

### 2.1 `check_tasks.js`
**Status:** ✅ Utility script (not imported, intentional)

**Purpose:** Diagnostic script to check if tasks exist in storage
**Usage:** Run manually in browser console or as Node script
**Recommendation:** Keep - useful for debugging

### 2.2 `recover_data.html`
**Status:** ✅ Standalone recovery page (not imported, intentional)

**Purpose:** HTML page for data recovery from backups
**Usage:** Opened separately when needed
**Recommendation:** Keep - used for data recovery

### 2.3 `setup-icon.js`
**Status:** ✅ Build utility script (not imported, intentional)

**Purpose:** Node.js script to set up app icons
**Usage:** Run manually: `node setup-icon.js [path-to-icon.png]`
**Recommendation:** Keep - used during build/setup

### 2.4 `workflows.bak`
**Status:** ⚠️ Backup file

**Purpose:** Appears to be a backup file
**Recommendation:** Review if still needed, consider removing if obsolete

---

## 3. Archive/Legacy Files

### 3.1 `archive/workflow-page.html.legacy`
**Status:** ✅ Legacy file (intentional archive)

**Purpose:** Legacy version of workflow page
**Recommendation:** Keep in archive for reference, or remove if no longer needed

---

## 4. Files That ARE Used (Not Orphans)

### 4.1 `storage.js`
**Status:** ✅ Used

**References:**
- Loaded in `tasklist.html` (line 1578)
- Referenced in `service-worker.js` (line 8)
- Included in `electron-builder.config.cjs` (line 18)

### 4.2 `vault-manager.js`
**Status:** ✅ Used

**References:**
- Required in `main.js` (Electron main process)
- Included in `electron-builder.config.cjs` (line 16)

---

## 5. Potential Code Issues

### 5.1 Duplicate `getAllTasks` Function

**Location:** 
- `src/utils/taskHelpers.js` (exported)
- `src/domain/models.js` (exported)
- `src/app/init.js` (imported from `models.js`, line 36)

**Analysis:**
- Both files export `getAllTasks`
- `init.js` imports from `models.js`
- **Recommendation:** Verify which one is the canonical version and consolidate

### 5.2 Unused Exports

**Files to check:**
- `src/pages/PlannerPage.js` exports `renderPlanner`, `renderWeeklyPlanner`, `renderDailyPlanner` (line 686)
  - Verify if these are used or if only `renderPlannerPage` is needed

---

## 6. Recommendations

### High Priority
1. ✅ **Remove unused `setLoading` import** from `src/app/init.js` (line 7) - **FIXED**
2. ✅ **Remove unused `auditHookups` import** in `src/app/init.js` - **FIXED**

### Medium Priority
3. ⚠️ **Review `workflows.bak`** - remove if obsolete
4. ⚠️ **Consolidate `getAllTasks`** - ensure single source of truth

### Low Priority
5. 📝 **Document utility scripts** - `check_tasks.js`, `setup-icon.js` are intentionally standalone
6. 📝 **Review archive files** - consider removing if no longer needed for reference

---

## 7. Files to Keep (Not Orphans)

These files are intentionally standalone and should NOT be removed:

- ✅ `check_tasks.js` - Diagnostic utility
- ✅ `recover_data.html` - Recovery page
- ✅ `setup-icon.js` - Build utility
- ✅ `storage.js` - Active storage adapter
- ✅ `vault-manager.js` - Active vault manager
- ✅ `main.js` - Electron main process
- ✅ `preload.js` - Electron preload script
- ✅ `service-worker.js` - PWA service worker

---

## Notes

- Most "orphaned" files are actually utility scripts or standalone tools
- The main codebase uses ES modules with proper imports
- Some files in root are build/utility scripts (intentionally not imported)
- Archive folder contains legacy files for reference
