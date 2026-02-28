# Tasks Page Integrations & Hookups

This document explains how the Tasks page connects to and integrates with other parts of the application. It's written for someone who might not know these integrations exist.

## Overview

The Tasks page (`TasksPage.js`) is one of many pages in the app, but tasks themselves appear throughout the application. This document maps out all the connections.

---

## 1. Page Registration & Routing

### How Tasks Page Gets Loaded

**File: `src/app/pages.js`**
- The Tasks page is registered in the `PAGES` registry:
  ```javascript
  tasks: renderTasksPage  // Maps 'tasks' view name to renderTasksPage function
  ```

**File: `src/app/router.js`**
- When you navigate to the tasks page, the router:
  1. Looks up `renderTasksPage` from the `PAGES` registry
  2. Finds the container element `#view-tasks` in the HTML
  3. Calls `renderTasksPage(container, state, features)`
  4. The page renders inside that container

**Navigation Flow:**
```
User clicks "Tasks" in sidebar
  ↓
Sidebar handler (viewManager.js) calls router.switchView('tasks')
  ↓
Router looks up 'tasks' in PAGES registry
  ↓
Router calls renderTasksPage(container, state, features)
  ↓
Tasks page renders
```

---

## 2. Sidebar Integration

### How Tasks Appear in the Sidebar

**File: `src/app/viewManager.js` (renderGlobalSidebar function)**

The sidebar shows:
- A "Tasks" navigation item (line 74-76)
- A badge count of tasks due today (shown on "Today" link, line 66)

**Key Integration Points:**
1. **Task Count Calculation:**
   ```javascript
   const allTasks = getAllTasks(state.tasks || [], state.projects || []);
   const tasksToday = allTasks.filter(t => {
     if (!t || t.done) return false;
     const dueKey = typeof t.due === "string" ? t.due.slice(0, 10) : "";
     return dueKey === todayKey;
   }).length;
   ```
   - Uses `getAllTasks()` to combine standalone tasks + project subtasks
   - Filters for tasks due today
   - Displays count as badge on "Today" link

2. **Navigation:**
   - Clicking "Tasks" in sidebar triggers `router.switchView('tasks')`
   - Sidebar updates active state based on `state.currentView`

---

## 3. Today Page Integration

### How Tasks Appear on the Today Page

**File: `src/pages/TodayPage.js`**

The Today page displays tasks due today in a card:

**Task Aggregation:**
```javascript
const allTasks = getAllTasks(state.tasks || [], state.projects || []);
const tasksToday = allTasks.filter(t => {
  if (!t) return false;
  if (t.done) return false;
  const dueKey = typeof t.due === "string" ? t.due.slice(0, 10) : "";
  return dueKey === todayKey;
});
```

**Rendering:**
- Tasks are rendered in a "Tasks Due Today" card (line 105-116)
- Each task shows: title, project name, lane tag (lab/comp/orange)
- Clicking a task opens the edit modal
- Clicking "All tasks →" navigates to the Tasks page

**Navigation Hook:**
```javascript
<span class="today-card-action" data-nav="tasks">All tasks →</span>
```
- Uses `data-nav="tasks"` attribute
- Click handler calls `handlers?.switchView?.('tasks')`

---

## 4. Projects Page Integration

### How Tasks Connect to Projects

**File: `src/pages/ProjectsPage.js`**

Projects can have:
1. **Subtasks** - stored in `project.subtasks[]` array
2. **Linked Tasks** - standalone tasks with `task.projectId` matching project ID

**Task Display in Projects:**
- Project cards show their subtasks
- Tasks with `projectId` appear in project views
- Clicking a task in a project opens the task edit modal

**Event Handling:**
- Projects page has its own event delegation (similar to Tasks page)
- Handles `task:edit`, `task:delete`, `task:toggle` actions
- Uses same `features.taskOperations` handlers as Tasks page

---

## 5. Shared Data Model

### How Tasks Are Aggregated Across the App

**File: `src/domain/models.js` (getAllTasks function)**

This is the **critical integration point** - it unifies tasks from multiple sources:

```javascript
export function getAllTasks(tasks, projects) {
  // 1. Get standalone tasks (from state.tasks)
  const activeTasks = (tasks || []).filter(t => !t.deletedAt);
  const allTasks = [...activeTasks];
  
  // 2. Add project subtasks (from project.subtasks[])
  (projects || []).forEach(p => {
    (p.subtasks || []).forEach(st => {
      if (!st.deletedAt) {
        allTasks.push({
          ...st,
          projectId: p.id,
          projectName: p.name,
          isSubtask: true
        });
      }
    });
  });
  
  // 3. Deduplicate (prevents double-counting)
  return dedupeTasks(allTasks);
}
```

**Where This Function Is Used:**
- ✅ Tasks page - to show all tasks
- ✅ Today page - to show tasks due today
- ✅ Sidebar - to count tasks due today
- ✅ Projects page - to show project-related tasks
- ✅ Workflow page - to show tasks in workflow columns

---

## 6. Event Handling Architecture

### How Task Actions Work Across Pages

**File: `src/pages/TasksPage.js` (bind function)**

The Tasks page uses **event delegation** - one listener handles all clicks:

```javascript
container.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-action]');
  const action = btn.dataset.action;
  const taskId = btn.dataset.taskId;
  
  // Handle actions like: task:edit, task:delete, task:toggle
  switch (namespace) {
    case 'task':
      switch (actionName) {
        case 'edit':
          features.taskOperations.editTask(taskId);
          break;
        case 'delete':
          features.taskOperations.deleteTask(taskId, ...);
          break;
        // ... etc
      }
  }
});
```

**Shared Handlers:**
- All pages use the same `features.taskOperations` object
- This ensures consistent behavior (edit, delete, toggle work the same everywhere)
- Handlers are passed down from the router to each page

---

## 7. State Management

### How Task Data Flows Through the App

**State Structure:**
```javascript
state = {
  tasks: [...],        // Standalone tasks
  projects: [...],     // Projects (with subtasks inside)
  currentView: 'tasks', // Which page is active
  currentFilter: 'all', // Task filter (all/active/done)
  currentSort: 'id',    // Task sort (due/priority/id)
  searchQuery: '',     // Search filter
  // ... other state
}
```

**Data Flow:**
1. **Initial Load:** Tasks loaded from localStorage into `state.tasks` and `state.projects`
2. **Page Render:** Each page calls `getAllTasks(state.tasks, state.projects)` to get unified list
3. **User Action:** User edits/deletes task → handler updates state → calls `render()` → page re-renders
4. **Persistence:** State saved to localStorage after each change

**Key Point:** Tasks exist in TWO places:
- `state.tasks[]` - standalone tasks
- `state.projects[].subtasks[]` - project subtasks

The `getAllTasks()` function combines them into one list.

---

## 8. Cross-Page Navigation

### How Users Navigate Between Task-Related Pages

**Navigation Patterns:**

1. **Sidebar → Tasks Page:**
   - Click "Tasks" in sidebar
   - `renderGlobalSidebar()` handler → `router.switchView('tasks')`

2. **Today Page → Tasks Page:**
   - Click "All tasks →" link
   - `data-nav="tasks"` → `handlers.switchView('tasks')`

3. **Tasks Page → Project:**
   - Click project tag on a task
   - Could navigate to Projects page (not currently implemented)

4. **Projects Page → Task:**
   - Click a task in a project card
   - Opens task edit modal (doesn't navigate to Tasks page)

---

## 9. Shared UI Components

### Components Used Across Multiple Pages

**Task Rendering:**
- `src/ui/renderTasks.js` - Renders task list (used by Tasks page)
- Task items use consistent HTML structure with `data-action` attributes
- All pages that show tasks use similar markup

**Task Cards:**
- Tasks appear as cards with: checkbox, title, project tag, priority, due date
- Same structure whether shown on Tasks page, Today page, or Projects page
- Consistent styling via CSS classes (`.task-card`, `.task-title`, etc.)

---

## 10. Feature Handlers

### Shared Operations Available to All Pages

**File: `src/features/taskOperations.js`**

All pages receive a `features` object with:
```javascript
features = {
  taskOperations: {
    addTask: () => {...},
    editTask: (taskId) => {...},
    deleteTask: (taskId, isSubtask, projectId) => {...},
    toggleTask: (taskId) => {...},
  },
  taskDrawer: {
    openDrawer: (taskId) => {...},
  },
  // ... other features
}
```

**How It Works:**
1. Router passes `features` to each page renderer
2. Page renderer passes `features` to event handlers
3. Event handlers call `features.taskOperations.*` methods
4. Methods update state and trigger re-render

**Benefits:**
- Consistent behavior across all pages
- Single source of truth for task operations
- Easy to add new operations (just add to `features` object)

---

## 11. Workflow Page Integration

### How Tasks Appear in Workflow/Kanban View

**File: `src/pages/WorkflowPage.js`** (referenced, not shown in detail)

The Workflow page:
- Uses `getAllTasks()` to get all tasks
- Filters tasks by workflow status/column
- Displays tasks in kanban board columns
- Uses same `features.taskOperations` handlers

**Connection:**
- Tasks page can switch to "kanban" mode (via `taskMode` state)
- Same tasks, different view (list vs. kanban)
- Same event handlers work in both modes

---

## 12. Search & Filter Integration

### How Search/Filter Works Across Pages

**State Properties:**
- `state.searchQuery` - Current search text
- `state.currentFilter` - Filter (all/active/done)
- `state.currentSort` - Sort order (due/priority/id)
- `state.boardProjectFilter` - Project filter for kanban

**Tasks Page:**
- Has search input and filter buttons
- Updates state when user types/searches
- Filters tasks before rendering

**Other Pages:**
- Today page filters by date (today only)
- Projects page filters by project
- Workflow page filters by status column

**Key Point:** Each page can have its own filter logic, but they all read from the same `state` object.

---

## Summary: Integration Points

| Integration | Location | How It Works |
|------------|----------|--------------|
| **Page Registration** | `src/app/pages.js` | Tasks page registered in PAGES registry |
| **Routing** | `src/app/router.js` | Router calls renderTasksPage when navigating to 'tasks' |
| **Sidebar** | `src/app/viewManager.js` | Shows Tasks link, counts tasks due today |
| **Today Page** | `src/pages/TodayPage.js` | Shows tasks due today, links to Tasks page |
| **Projects Page** | `src/pages/ProjectsPage.js` | Shows project subtasks, handles task actions |
| **Data Model** | `src/domain/models.js` | `getAllTasks()` combines tasks + project subtasks |
| **Event Handling** | `src/pages/TasksPage.js` | Event delegation handles all task actions |
| **Shared Handlers** | `src/features/taskOperations.js` | All pages use same task operation handlers |
| **State Management** | Global state object | Tasks stored in `state.tasks` and `state.projects[].subtasks` |
| **UI Rendering** | `src/ui/renderTasks.js` | Shared rendering logic for task lists |

---

## Key Takeaways

1. **Tasks are unified:** `getAllTasks()` combines standalone tasks + project subtasks into one list
2. **Pages are independent:** Each page renders its own view, but uses shared data and handlers
3. **Event delegation:** Tasks page uses one listener for all actions (prevents duplicate handlers)
4. **Shared features:** All pages receive the same `features` object with task operations
5. **State-driven:** All pages read from the same `state` object, ensuring consistency
6. **Navigation:** Pages can navigate to each other via `router.switchView()` or `handlers.switchView()`

---

## For Developers: Adding New Task Integrations

If you want to add tasks to a new page:

1. **Import getAllTasks:**
   ```javascript
   import { getAllTasks } from '../domain/models.js';
   ```

2. **Get tasks from state:**
   ```javascript
   const allTasks = getAllTasks(state.tasks || [], state.projects || []);
   ```

3. **Filter as needed:**
   ```javascript
   const filteredTasks = allTasks.filter(t => /* your filter */);
   ```

4. **Use shared handlers:**
   ```javascript
   // In your event handler:
   features.taskOperations.editTask(taskId);
   ```

5. **Add navigation if needed:**
   ```html
   <a href="#" data-nav="tasks">View All Tasks</a>
   ```

That's it! The infrastructure is already there - you just need to use it.
