# Performance Issue: Pages Loading After Sidebar

## Problem

Projects, Cell Log, Planner, and 3D Print pages are all loading slowly/after the sidebar finishes rendering.

## Root Cause Analysis

### The Culprit: `render()` Function

All these pages call `render()` which does **heavy synchronous work** before rendering the page:

1. **Line 9639-9674**: `render()` function runs for ALL views
2. **Line 9674**: `renderGlobalSidebar(state)` - **BLOCKING CALL**
3. **Line 9641-9671**: Syncs entire store to globals (synchronous)
4. **Line 9846-9849**: `hideAllForms()` and `forceHideAllForms()` after rendering

### What Happens When Switching Views

**Projects View (line 5237):**
```javascript
render(); // BLOCKS - calls renderGlobalSidebar() first
```

**Planner View (line 5284):**
```javascript
renderPlanner(); // Direct call
// But then render() is also called (line 9729)
```

**Cell Log View (line 5330):**
```javascript
// switchView calls render() which then calls:
await window.renderCellLogPage(); // Waits for render() to finish first
```

**3D Print View (line 5126):**
```javascript
fetch('pages/3d-print.html') // Async, but then:
render3DPrints(); // Called after fetch
```

### The Problem Flow

1. User clicks sidebar → `switchView('projects')` called
2. `switchView()` shows the view element (`display = ''`)
3. **BUT THEN** `render()` is called (line 5237)
4. `render()` calls `renderGlobalSidebar()` **FIRST** (line 9674)
5. Sidebar renders completely
6. **THEN** page-specific rendering happens (line 9838: `renderProjects()`)

**Result:** Page appears blank until sidebar finishes rendering!

## Solution

### Option 1: Defer `renderGlobalSidebar()` (Recommended)

Move `renderGlobalSidebar()` to run **after** page-specific rendering, or make it non-blocking:

```javascript
async function render(){
  // ... sync store to globals ...
  
  // DON'T render sidebar first - render page first!
  // renderGlobalSidebar(state); // REMOVE THIS
  
  // Render page-specific content FIRST
  if(currentView==='projects') {
    renderProjects(); // Show page immediately
  }
  // ... other views ...
  
  // Render sidebar AFTER page is visible (non-blocking)
  setTimeout(() => {
    renderGlobalSidebar(state);
  }, 0);
}
```

### Option 2: Make Sidebar Rendering Async

```javascript
async function render(){
  // ... sync store ...
  
  // Render page first
  if(currentView==='projects') {
    renderProjects();
  }
  
  // Render sidebar in parallel (non-blocking)
  requestAnimationFrame(() => {
    renderGlobalSidebar(state);
  });
}
```

### Option 3: Skip Sidebar Rendering for These Views

These pages don't need the sidebar to render first:

```javascript
async function render(){
  // ... sync store ...
  
  // Only render sidebar for views that need it
  if(['tasks', 'today', 'workflow', 'files'].includes(currentView)) {
    renderGlobalSidebar(state);
  }
  
  // Render page content
  if(currentView==='projects') {
    renderProjects();
  }
  // ... other views ...
}
```

## Files to Modify

1. **tasklist (1).html** - Line 9639: `async function render()`
   - Move `renderGlobalSidebar()` call (line 9674) to after page rendering
   - Or make it non-blocking with `setTimeout` or `requestAnimationFrame`

2. **tasklist (1).html** - Line 5237: Projects view
   - Consider calling `renderProjects()` directly instead of calling `render()`

3. **tasklist (1).html** - Line 5284: Planner view
   - Already calls `renderPlanner()` directly, but `render()` is also called later

## Quick Fix (Immediate)

Move `renderGlobalSidebar()` to the end of `render()`:

```javascript
async function render(){
  // ... all the sync code ...
  
  // REMOVE: renderGlobalSidebar(state); // Line 9674
  
  // Render page content FIRST
  if(currentView==='projects') {
    renderProjects();
  }
  // ... all other views ...
  
  // Render sidebar LAST (non-blocking)
  setTimeout(() => {
    renderGlobalSidebar(state);
  }, 0);
}
```

This will make pages appear immediately, with sidebar updating after.

## Testing

After fix:
1. Click Projects → Should appear immediately
2. Click Cell Log → Should appear immediately  
3. Click Planner → Should appear immediately
4. Click 3D Print → Should appear immediately
5. Sidebar should update shortly after (non-blocking)
