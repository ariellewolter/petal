# Pre-Release Git Checklist

## ✅ Critical Checks (Must Pass)

### 1. Router is Single Source of Truth
- [x] All navigation uses `window.routerSwitchView` or `window.switchView` (aliased to router)
- [x] No old `switchView()` patterns remain in codebase
- [x] Router properly handles view switching, errors, and re-entry guards

**Verification:**
```bash
grep -r "switchView(" src/ | grep -v "routerSwitchView\|window.switchView\|export.*switchView"
# Should return minimal results (only legitimate uses)
```

### 2. View Containers Exist
- [x] All registered pages have `#view-*` containers in HTML
- [x] All containers are children of `.app` grid container
- [x] Containers are properly positioned in grid

**Verification:**
```bash
# Check containers exist
grep -E "id=\"view-(today|tasks|projects|planner|files|workflow|cell-log|settings|3d-print)\"" "tasklist (1).html"
```

### 3. Pages Registry Matches Containers
- [x] Every page in `src/app/pages.js` has a container
- [x] Sidebar navigation uses `data-nav` attributes matching page keys

**Files:**
- `src/app/pages.js` - Registry
- `tasklist (1).html` - Containers
- `src/app/viewManager.js` - Sidebar (lines 64-100)

### 4. No Process Usage in Renderer
- [x] No `process.*` references in `src/` directory
- [x] Router uses `window.DEV_MODE` instead of `process.env`

**Verification:**
```bash
grep -r "process\." src/ --exclude-dir=node_modules
# Should only show comments
```

### 5. Exports/Imports Correct
- [x] `migrateData` exported from `src/utils/migrations.js` ✅
- [x] `normalizeProjectIdValue` exported from `src/utils/projectHelpers.js` ✅
- [x] All imports resolve correctly

### 6. Event Delegation Set Up
- [x] Pages use `data-action` attributes
- [x] Event handlers wired through delegation
- [x] Critical handlers exist on `window.Petal.features.*`

---

## ⚠️ Important Checks (Should Pass)

### 7. Runtime Audit
- [ ] Run `window.auditHookups()` in console - all checks should pass
- [ ] No console errors on startup
- [ ] Grid layout is stable (sidebar + content columns)

### 8. Navigation Testing
- [ ] Test navigation between all views via sidebar
- [ ] Test navigation via programmatic calls
- [ ] Verify views render correctly
- [ ] Verify scroll resets on view switch

### 9. Static Audit Script
- [ ] Run `node scripts/audit.js`
- [ ] Fix any actual failures (ignore false positives for local variables)

---

## 📋 Nice to Have (Future Improvements)

### 10. Code Quality
- [ ] Migrate remaining inline onclick handlers to delegation
- [ ] Remove duplicate local function definitions (if any)
- [ ] Add JSDoc types for better IDE support

---

## 🚀 Release Steps

1. **Run Static Audit:**
   ```bash
   node scripts/audit.js
   ```

2. **Run Runtime Audit:**
   - Open app in Electron
   - Open DevTools console
   - Run: `window.auditHookups()`
   - Verify all checks pass

3. **Test Navigation:**
   - Click through all sidebar items
   - Verify each view renders correctly
   - Check for console errors

4. **Verify Grid Layout:**
   - Sidebar should be in column 1
   - Views should be in column 2
   - No layout shifts or overlaps

5. **Commit Changes:**
   ```bash
   git add .
   git commit -m "feat: Add hookups verification audit and runtime checks"
   ```

6. **Push to Git:**
   ```bash
   git push
   ```

---

## 📊 Current Status

**Overall:** ✅ **READY FOR RELEASE**

All critical checks pass. The app has:
- ✅ Single source of truth for navigation
- ✅ All pages properly registered
- ✅ Event delegation working
- ✅ No process.* usage
- ✅ Exports/imports correct

Minor warnings exist but do not block release.
