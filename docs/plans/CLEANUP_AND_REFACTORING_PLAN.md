# Cleanup and Refactoring Plan

## Priority 1: Extract Common Patterns (Do First)

### 1.1 View Re-rendering Helper ✅ Created
**File**: `src/utils/viewHelpers.js`

**Problem**: Repeated pattern throughout codebase:
```javascript
if (window.routerSwitchView && (window.currentView === 'projects' || window.Petal?.store?.getState()?.currentView === 'projects')) {
  window.routerSwitchView('projects').catch(err => console.error('Router error:', err));
}
```

**Solution**: Use helper function:
```javascript
import { rerenderViewIfActive } from '../utils/viewHelpers.js';
await rerenderViewIfActive('projects');
```

**Action Items**:
- [ ] Replace all instances of the pattern with `rerenderViewIfActive()`
- [ ] Search for: `window.routerSwitchView && (window.currentView ===`
- [ ] Replace ~22 occurrences

### 1.2 Standardize State Access ✅ Created
**File**: `src/utils/viewHelpers.js` - `getCurrentView()`

**Problem**: Mixing `window.currentView` and `window.Petal?.store?.getState()?.currentView`

**Solution**: Use `getCurrentView()` helper everywhere

**Action Items**:
- [ ] Replace all `window.currentView` checks with `getCurrentView()`
- [ ] Replace all `window.Petal?.store?.getState()?.currentView` with `getCurrentView()`

---

## Priority 2: Event Delegation (Medium Priority)

### 2.1 Wire Up data-action Handlers
**Problem**: You've added `data-action` attributes but need to wire them up

**New attributes found**:
- `data-action="ui:toggle-add-form"`
- `data-action="ui:add-file"` (with `data-container` and `data-prefix`)
- `data-action="task:add"`
- `data-action="ui:clear-search"`
- `data-action="sort:all"`, `sort:day`, `sort:week`, `sort:month`
- `data-action="filter:all"`, `filter:active`, `filter:done`

**Action Items**:
- [ ] Create event delegation in TasksPage.js for task-related actions
- [ ] Wire up sort/filter handlers
- [ ] Wire up file operations
- [ ] Test all new data-action handlers

### 2.2 Continue onclick → data-action Migration
**Status**: ~190 `onclick=` handlers remaining

**High-priority targets**:
- Modal close buttons (many already have onclick)
- Form submission buttons
- Navigation buttons
- Delete/Edit buttons in dynamic content

**Action Items**:
- [ ] Audit remaining onclick handlers
- [ ] Prioritize handlers in dynamic content (projectHTML, taskHTML, etc.)
- [ ] Migrate incrementally, testing after each batch

---

## Priority 3: Remove Dead Code

### 3.1 Remove Remaining Render Function Calls
**Status**: 29 references found (likely in template strings or comments)

**Action Items**:
- [ ] Search for: `renderTasks(`, `renderProjects(`, `renderFiles(`, `renderWorkflow(`
- [ ] Check if they're in:
  - Template strings (HTML generation) - replace with router calls
  - Comments - remove
  - Dead code paths - remove

### 3.2 Create Event Delegation Utility
**Problem**: Risk of duplicate listeners if delegation is set up multiple times

**Solution**: Create reusable utility with idempotent flag

**Action Items**:
- [ ] Create `src/utils/delegation.js`
- [ ] Implement `installDelegatedClick(container, selector, handler, flagName)`
- [ ] Use in all page modules

---

## Priority 4: Code Quality Improvements

### 4.1 Extract Router Error Handling
**Pattern repeated everywhere**:
```javascript
.catch(err => console.error('Router error:', err))
```

**Action Items**:
- [ ] Add to `viewHelpers.js`: `safeSwitchView()` (already created)
- [ ] Replace all `.catch(err => console.error('Router error:', err))` with `safeSwitchView()`

### 4.2 Consolidate State Access Patterns
**Problem**: Multiple ways to access state:
- `window.Petal?.store?.getState()`
- `window.currentView`
- `state.currentView`

**Action Items**:
- [ ] Use `getCurrentView()` everywhere (already created)
- [ ] Consider creating `getState()` helper if pattern repeats

---

## Implementation Order

1. ✅ **Create helper utilities** (viewHelpers.js) - DONE
2. **Replace view re-rendering pattern** - Use `rerenderViewIfActive()` everywhere
3. **Wire up data-action handlers** - Critical for new buttons to work
4. **Continue onclick migration** - Incremental, test as you go
5. **Remove dead code** - Clean up remaining render function references
6. **Extract delegation utility** - Prevent duplicate listeners

---

## Testing Checklist

After each refactor:
- [ ] Test view switching works correctly
- [ ] Test all buttons/actions still work
- [ ] Check console for errors
- [ ] Verify no duplicate event handlers
- [ ] Test on slow network (module loading)

---

## Notes

- **Don't refactor long functions yet** - Wait until handler consolidation is complete
- **Keep contracts in mind** - Router owns view switching, pages own their containers
- **Test incrementally** - Don't do all refactoring at once
