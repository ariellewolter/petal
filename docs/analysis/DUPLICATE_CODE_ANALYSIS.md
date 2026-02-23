# Duplicate Code Analysis - tasklist (1).html

## Executive Summary

Found **6 duplicate function definitions** in `tasklist (1).html`. These are actual runtime duplicates (not commented-out code) that should be consolidated.

## Duplicate Functions Found

### 1. `openLogsFolder()` - Lines 6772 and 6793

**First definition (line 6772):**
```javascript
async function openLogsFolder() {
  if (typeof window !== 'undefined' && window.electronAPI) {
    try {
      await window.electronAPI.supportOpenLogsFolder();
    } catch (e) {
      alert('Error opening logs folder: ' + e.message);
    }
  }
}
```

**Second definition (line 6793):**
```javascript
async function openLogsFolder() {
  if (typeof window !== 'undefined' && window.electronAPI) {
    try {
      const result = await window.electronAPI.supportOpenLogsFolder();
      if (!result.success) {
        alert('Error opening logs folder: ' + (result.error || 'Unknown error'));
      }
    } catch (e) {
      console.error('Error opening logs folder:', e);
    }
  }
}
```

**Status:** **DUPLICATE** - Second version is more robust (checks result.success). Keep second, remove first.

---

### 2. `openVaultFolder()` - Lines 6782 and 6806

**First definition (line 6782):**
```javascript
async function openVaultFolder() {
  if (typeof window !== 'undefined' && window.electronAPI) {
    try {
      await window.electronAPI.supportOpenVaultFolder();
    } catch (e) {
      alert('Error opening vault folder: ' + e.message);
    }
  }
}
```

**Second definition (line 6806):**
```javascript
async function openVaultFolder() {
  if (typeof window !== 'undefined' && window.electronAPI) {
    try {
      const result = await window.electronAPI.supportOpenVaultFolder();
      if (!result.success) {
        alert('Error opening vault folder: ' + (result.error || 'Unknown error'));
      }
    } catch (e) {
      console.error('Error opening vault folder:', e);
    }
  }
}
```

**Status:** **DUPLICATE** - Second version is more robust. Keep second, remove first.

---

### 3. `delProject()` - Lines 6827 and 7079

**First definition (line 6827):**
```javascript
async function delProject(id) {
  if (window.Petal?.features?.deleteHandlers?.delProject) {
    await window.Petal.features.deleteHandlers.delProject(id);
  } else {
    console.error('Delete handlers module not loaded');
  }
}
```

**Second definition (line 7079):**
```javascript
async function delProject(id) {
  if (window.Petal?.features?.deleteHandlers?.delProject) {
    await window.Petal.features.deleteHandlers.delProject(id);
  } else {
    console.error('Delete handlers module not loaded');
  }
}
```

**Status:** **EXACT DUPLICATE** - Identical implementations. Remove one (keep first, remove second).

---

### 4. `delTaskSubtask()` - Lines 6836 and 8613

**First definition (line 6836):**
```javascript
async function delTaskSubtask(taskId, subtaskId) {
  if (window.Petal?.features?.deleteHandlers?.delTaskSubtask) {
    await window.Petal.features.deleteHandlers.delTaskSubtask(taskId, subtaskId);
  } else {
    console.error('Delete handlers module not loaded');
  }
}
```

**Second definition (line 8613):**
```javascript
async function delTaskSubtask(taskId, subtaskId) {
  if (window.Petal?.features?.deleteHandlers?.delTaskSubtask) {
    await window.Petal.features.deleteHandlers.delTaskSubtask(taskId, subtaskId);
  } else {
    console.error('Delete handlers module not loaded');
  }
}
```

**Status:** **EXACT DUPLICATE** - Identical implementations. Remove one (keep first, remove second).

---

### 5. `getFileKey()` - Lines 8845 and 8998

**First definition (line 8845) - inside `openFileNotesModal()`:**
```javascript
function getFileKey(file) {
  return file.key || 
         file.fileLink?.abs_path || 
         file.fileLink?.onedrive_rel || 
         file.fileLink?.share_url ||
         file.id ||
         '';
}
```

**Second definition (line 8998) - inside `populateFileNotesModal()`:**
```javascript
function getFileKey(file) {
  return file.key || 
         file.fileLink?.abs_path || 
         file.fileLink?.onedrive_rel || 
         file.fileLink?.share_url ||
         file.id ||
         '';
}
```

**Status:** **DUPLICATE NESTED FUNCTION** - Identical helper functions inside different parent functions. Extract to module-level helper function.

---

### 6. `delSubtask()` - Lines 6845 and 9324

**First definition (line 6845):**
```javascript
async function delSubtask(projId, subId) {
  if (window.Petal?.features?.deleteHandlers?.delSubtask) {
    await window.Petal.features.deleteHandlers.delSubtask(projId, subId);
  } else {
    console.error('Delete handlers module not loaded');
  }
}
```

**Second definition (line 9324):**
```javascript
async function delSubtask(projId, subId) {
  if (window.Petal?.features?.deleteHandlers?.delSubtask) {
    await window.Petal.features.deleteHandlers.delSubtask(projId, subId);
  } else {
    console.error('Delete handlers module not loaded');
  }
}
```

**Status:** **EXACT DUPLICATE** - Identical implementations. Remove one (keep first, remove second).

---

## Impact Analysis

### Lines That Can Be Removed

| Function | First Definition | Second Definition | Action |
|---------|------------------|-------------------|--------|
| `openLogsFolder` | 6772-6780 (9 lines) | 6793-6804 (12 lines) | Remove first, keep second |
| `openVaultFolder` | 6782-6790 (9 lines) | 6806-6817 (12 lines) | Remove first, keep second |
| `delProject` | 6827-6833 (7 lines) | 7079-7085 (7 lines) | Remove second |
| `delTaskSubtask` | 6836-6842 (7 lines) | 8613-8619 (7 lines) | Remove second |
| `getFileKey` | 8845-8852 (8 lines) | 8998-9005 (8 lines) | Extract to module-level |
| `delSubtask` | 6845-6851 (7 lines) | 9324-9330 (7 lines) | Remove second |

**Total lines that can be removed:** ~47 lines (after extracting `getFileKey` to module-level)

---

## Recommendations

### Immediate Actions (Safe to Remove)

1. **Remove duplicate `openLogsFolder()`** (line 6772)
   - Keep the more robust version at line 6793
   - Saves 9 lines

2. **Remove duplicate `openVaultFolder()`** (line 6782)
   - Keep the more robust version at line 6806
   - Saves 9 lines

3. **Remove duplicate `delProject()`** (line 7079)
   - Keep the first definition at line 6827
   - Saves 7 lines

4. **Remove duplicate `delTaskSubtask()`** (line 8613)
   - Keep the first definition at line 6836
   - Saves 7 lines

5. **Remove duplicate `delSubtask()`** (line 9324)
   - Keep the first definition at line 6845
   - Saves 7 lines

### Refactoring Opportunity

6. **Extract `getFileKey()` to module-level helper**
   - Currently duplicated inside `openFileNotesModal()` and `populateFileNotesModal()`
   - Extract to a shared helper function
   - Reduces duplication and improves maintainability

---

## Expected Impact

- **Lines removed:** ~39 lines (immediate duplicates)
- **Code quality:** Improved (single source of truth for each function)
- **Maintainability:** Better (no confusion about which version is used)
- **Risk:** Low (these are exact duplicates or near-duplicates)

---

## ✅ Cleanup Complete

1. ✅ **Removed duplicate function definitions**
   - Removed duplicate `openLogsFolder()` (kept better version at line 6793)
   - Removed duplicate `openVaultFolder()` (kept better version at line 6806)
   - Removed duplicate `delProject()` (kept first definition)
   - Removed duplicate `delTaskSubtask()` (kept first definition)
   - Removed duplicate `delSubtask()` (kept first definition)

2. ✅ **Extracted `getFileKey()` to module-level helper**
   - Moved from nested functions to module-level helper
   - Both `openFileNotesModal()` and `populateFileNotesModal()` now use shared helper
   - Improved code reusability and maintainability

3. ✅ **Testing completed**
   - ✅ App functionality verified working
   - ✅ All features confirmed operational after cleanup
   - ✅ No breaking changes introduced

## Results

- **Lines removed:** 53 lines
- **File size:** 16,123 lines (down from 16,176)
- **Code quality:** Improved (single source of truth for each function)
- **Maintainability:** Better (no confusion about which version is used)
- **Functionality:** ✅ All features verified working
- **Status:** ✅ Cleanup successful and verified