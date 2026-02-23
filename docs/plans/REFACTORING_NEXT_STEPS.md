# Refactoring Next Steps - Concrete Actions

## ✅ What We've Done

1. **Removed duplicate render functions** - All inline duplicates are gone
2. **Simplified render() dispatcher** - Now delegates to router only
3. **Added dev assertions** - Router checks if renderers touch shell elements
4. **Created view helpers** - `src/utils/viewHelpers.js` with reusable functions

## 🎯 Immediate Next Steps (Priority Order)

### Step 1: Replace View Re-rendering Pattern (5 minutes)

**Find and replace this pattern**:
```javascript
// OLD (repeated ~22 times):
if (window.routerSwitchView && (window.currentView === 'projects' || window.Petal?.store?.getState()?.currentView === 'projects')) {
  window.routerSwitchView('projects').catch(err => console.error('Router error:', err));
}
```

**With this**:
```javascript
// NEW:
import { rerenderViewIfActive } from '../utils/viewHelpers.js';
await rerenderViewIfActive('projects');
```

**Files to update**:
- `tasklist (1).html` - Search for: `window.routerSwitchView && (window.currentView ===`

**Example locations**:
- Line ~5424: After saving task note
- Line ~5467: After updating file status
- Line ~8023: After toggling project subtasks
- Line ~8120: After updating task lane
- Line ~8371: After bulk lane assignment

### Step 2: Wire Up Missing data-action Handlers (15 minutes)

**Status**: TasksPage already has delegation, but some actions are missing handlers.

**Missing handlers to add** (in `TasksPage.js`):

```javascript
// In the switch statement, add these cases:

case 'ui':
  switch (actionName) {
    case 'toggle-add-form':
      // Toggle the add task form
      const form = container.querySelector('#add-task-form');
      const btn = container.querySelector('#toggle-add-task-btn');
      if (form && btn) {
        const isVisible = form.style.display !== 'none';
        form.style.display = isVisible ? 'none' : '';
        // Update button text/icon
        const icon = btn.querySelector('#toggle-add-task-icon');
        const text = btn.querySelector('#toggle-add-task-text');
        if (icon) icon.textContent = isVisible ? '+' : '−';
        if (text) text.textContent = isVisible ? 'Add Task' : 'Cancel';
      }
      break;
      
    case 'add-file':
      // Add file row
      const containerId = btn.dataset.container || 'files-container';
      const prefix = btn.dataset.prefix || 't';
      if (window.Petal?.features?.fileOperations?.addFileRow) {
        window.Petal.features.fileOperations.addFileRow(containerId, prefix);
      }
      break;
      
    case 'clear-search':
      // Clear search
      const searchInput = container.querySelector('#search-input');
      if (searchInput) {
        searchInput.value = '';
        if (window.handleSearch) window.handleSearch('');
      }
      break;
  }
  break;

case 'sort':
  // Sort action: data-action="sort:all", data-action="sort:day", etc.
  if (window.setSort) {
    window.setSort(actionName, btn);
  }
  break;

case 'filter':
  // Filter action: data-action="filter:all", data-action="filter:active", etc.
  if (window.setFilter) {
    window.setFilter(actionName, btn);
  }
  break;
```

### Step 3: Import viewHelpers in tasklist.html (2 minutes)

**Add at top of script section** (after other imports):
```javascript
import { rerenderViewIfActive, getCurrentView, safeSwitchView } from './src/utils/viewHelpers.js';

// Expose to window for backward compatibility
window.rerenderViewIfActive = rerenderViewIfActive;
window.getCurrentView = getCurrentView;
window.safeSwitchView = safeSwitchView;
```

### Step 4: Replace State Access Pattern (10 minutes)

**Find and replace**:
```javascript
// OLD:
const currentView = window.currentView || window.Petal?.store?.getState()?.currentView;

// NEW:
import { getCurrentView } from './src/utils/viewHelpers.js';
const currentView = getCurrentView();
```

**Or use window.getCurrentView() if exposed globally**

## 📋 Quick Reference

### New Helper Functions Available

```javascript
// Get current view (single source of truth)
const view = getCurrentView(); // Returns 'tasks', 'projects', etc. or null

// Re-render view only if it's currently active
await rerenderViewIfActive('projects'); // Safe - only renders if projects view is active

// Switch to a view (with error handling)
await safeSwitchView('tasks'); // Always switches, handles errors

// Re-render multiple views if any are active
await rerenderViewsIfActive(['tasks', 'projects', 'workflow']);
```

## 🧪 Testing After Changes

1. **Test view switching** - Click sidebar links, verify views switch correctly
2. **Test new buttons** - Click "Add Task", "Clear Search", sort/filter buttons
3. **Test re-rendering** - Make changes (edit task, update file) and verify view updates
4. **Check console** - No errors, no duplicate handlers

## 📝 Remaining Work (Lower Priority)

1. **Continue onclick migration** - ~190 handlers remaining (do incrementally)
2. **Remove dead code** - 29 references to old render functions (likely in templates)
3. **Create delegation utility** - Prevent duplicate listeners (nice-to-have)

## ⚠️ Important Notes

- **Don't refactor long functions yet** - Wait until handler consolidation is complete
- **Test incrementally** - Don't do all changes at once
- **Keep contracts** - Router owns view switching, pages own their containers
