# Layout Rules: Shell vs Page Responsibilities

## Core Principle

**The shell (tasklist.html) owns the layout structure. Pages render only content.**

This prevents nested grids, layout conflicts, and the "sidebar/layout offset bug."

---

## Shell Responsibilities

The shell in `tasklist.html` owns and manages:

### Layout Structure
- `.app` - Main app container with grid layout
- `.global-sidebar` - Sidebar navigation (always visible)
- `.global-header` - Header bar (if any)
- Grid template: `grid-template-columns: 220px 1fr;` (or similar)

### View Containers
- `#view-tasks`, `#view-projects`, `#view-planner`, etc.
- These are empty containers that pages render into
- Shell controls their visibility (show/hide)

### Global Styles
- CSS variables (`--rose`, `--text`, etc.)
- Base typography and spacing
- Grid layout rules

---

## Page Responsibilities

Each page module (`src/pages/*.js`) should:

### ✅ DO
- Render content **inside** the provided container
- Use `containerEl.querySelector()` for all DOM queries (never `document.querySelector()`)
- Only touch elements within `containerEl`
- Use event delegation scoped to `containerEl`
- Return cleanup function (optional, for future teardown)

### ❌ DON'T
- Create new `.layout`, `.sidebar`, or `.header` elements
- Inject global styles into `<head>`
- Use `document.getElementById()` or `document.querySelector()` (use container-scoped)
- Create timers/intervals that persist after page unmount
- Modify shell structure (sidebar, header, app container)

---

## Page Contract

Every page module must follow this contract:

```javascript
/**
 * Render a page
 * @param {HTMLElement} containerEl - Container element (e.g., #view-tasks)
 * @param {Object} state - Current app state from store
 * @param {Object} features - Features/handlers (window.Petal.features)
 * @returns {Promise<void>|void}
 */
export async function renderXPage(containerEl, state, features) {
  // 1. Validate container (required, no global fallback)
  if (!containerEl) {
    console.error('❌ renderXPage: containerEl is required');
    return;
  }
  
  // 2. All DOM queries scoped to containerEl
  const button = containerEl.querySelector('[data-action]');
  const list = containerEl.querySelector('#some-list');
  
  // 3. Render content into containerEl
  containerEl.innerHTML = `<div>...</div>`;
  
  // 4. Bind events via delegation on containerEl
  containerEl.addEventListener('click', (e) => {
    // Handle actions
  });
  
  // 5. No side effects outside containerEl
  // No global timers, no document.querySelector, etc.
}
```

---

## Common Mistakes

### ❌ Mistake 1: Nested Layout Grids

**Bad:**
```javascript
// In TodayPage.js
containerEl.innerHTML = `
  <div class="layout" style="grid-template-columns: 220px 1fr;">
    <div class="sidebar">...</div>
    <div class="main">...</div>
  </div>
`;
```

**Why it breaks:** Creates nested grid inside shell's grid → layout conflicts, offset bugs

**Good:**
```javascript
// Shell already has layout, page just renders content
containerEl.innerHTML = `
  <div class="today-main">
    <!-- Content only, no layout structure -->
  </div>
`;
```

### ❌ Mistake 2: Global Selectors

**Bad:**
```javascript
const button = document.getElementById('my-button');
const list = document.querySelector('#my-list');
```

**Why it breaks:** Breaks if page is rendered multiple times, or if element doesn't exist

**Good:**
```javascript
const button = containerEl.querySelector('#my-button');
const list = containerEl.querySelector('#my-list');
```

### ❌ Mistake 3: Leaking Timers

**Bad:**
```javascript
// In PlannerPage.js
setInterval(() => {
  updateNowLine(); // Updates DOM
}, 1000);
// Timer never cleared → keeps running after switching views
```

**Good:**
```javascript
let nowLineInterval = null;

export async function renderPlannerPage(containerEl, state, features) {
  // Clear any existing interval
  if (nowLineInterval) {
    clearInterval(nowLineInterval);
    nowLineInterval = null;
  }
  
  // Create new interval
  nowLineInterval = setInterval(() => {
    const nowLine = containerEl.querySelector('.now-line');
    if (nowLine) updateNowLine(nowLine);
  }, 1000);
}

export function cleanupPlannerPage() {
  if (nowLineInterval) {
    clearInterval(nowLineInterval);
    nowLineInterval = null;
  }
}
```

---

## Layout Bug Prevention

### The "Sidebar Offset" Bug

**Symptom:** Content appears pushed to the right, or sidebar overlaps content

**Root Cause:** Page injected its own layout structure, creating nested grids

**Fix:**
1. Check if page HTML includes `.layout`, `.sidebar`, or `.header`
2. Remove those - shell already provides them
3. Ensure page only renders content inside provided container

### The "Page Starts After Sidebar" Bug

**Symptom:** Page content renders, then suddenly shifts position

**Root Cause:** Page renderer modifies shell structure, or uses global selectors that find wrong elements

**Fix:**
1. Ensure all selectors are container-scoped
2. Don't modify `.app`, `.global-sidebar`, or shell structure
3. Only render into the provided `containerEl`

---

## Verification Checklist

For each page module, verify:

- [ ] No `document.getElementById()` or `document.querySelector()` (use `containerEl.querySelector()`)
- [ ] No `.layout`, `.sidebar`, or `.header` in rendered HTML
- [ ] All event listeners bound to `containerEl` (not `document`)
- [ ] No global timers/intervals (or they're cleared on cleanup)
- [ ] No styles injected into `<head>` (use scoped styles or CSS in shell)
- [ ] Page contract: `renderXPage(containerEl, state, features)`
- [ ] Container is required (no global fallback)

---

## Examples

### ✅ Good: TasksPage.js
```javascript
export async function renderTasksPage(containerEl, state, features) {
  if (!containerEl) {
    console.error('❌ renderTasksPage: Container required');
    return;
  }
  
  // All queries scoped to container
  const searchInput = containerEl.querySelector('#search-input');
  const taskList = containerEl.querySelector('#task-container');
  
  // Render content
  containerEl.innerHTML = `<div>...</div>`;
  
  // Events delegated to container
  containerEl.addEventListener('click', handleClick);
}
```

### ❌ Bad: Old Pattern
```javascript
export async function renderTasksPage(containerEl, state, features) {
  // Global fallback - breaks contract
  const container = containerEl || document.getElementById('view-tasks');
  
  // Global selector - breaks if multiple instances
  const button = document.getElementById('add-task-btn');
  
  // Injects layout structure - creates nested grids
  container.innerHTML = `
    <div class="layout">
      <div class="sidebar">...</div>
      <div class="main">...</div>
    </div>
  `;
}
```

---

## Migration Guide

When extracting a page from the monolith:

1. **Identify shell structure** - What does tasklist.html provide?
2. **Identify page content** - What should the page render?
3. **Remove layout wrappers** - Don't duplicate shell's layout
4. **Scope all selectors** - Replace `document.*` with `containerEl.*`
5. **Add event delegation** - Bind to `containerEl`, not global
6. **Test view switching** - Ensure no layout conflicts

---

## Summary

**Shell = Structure, Pages = Content**

- Shell owns: `.app`, `.global-sidebar`, view containers, grid layout
- Pages own: Content inside view containers, event handlers, page-specific logic
- Never mix: Pages should never create layout structure or use global selectors

This separation prevents 80% of layout bugs and makes pages truly modular.
